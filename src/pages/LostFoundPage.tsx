import { useEffect, useMemo, useState } from 'react'
import LostFoundForm, { type NewLostFound } from '../components/LostFoundForm'
import { apiGet } from '../config/api'

/* ============================================================
 *  类型定义
 * ============================================================ */

interface LostFoundItem {
  id: number
  /** 类型：丢失 / 捡到 */
  type: '丢失' | '捡到'
  /** 物品标题 */
  title: string
  /** 地点 */
  location: string
  /** 时间，格式 YYYY-MM-DD */
  time: string
  /** 详细描述 */
  description: string
  /** 是否为用户刚发布的新信息（用于高亮提示） */
  isNew?: boolean
}

type LoadStatus = 'loading' | 'success' | 'error'

/* ============================================================
 *  分类标签
 * ============================================================ */

const categoryTabs = ['全部', '丢失', '捡到'] as const

/* ============================================================
 *  主组件
 * ============================================================ */

export default function LostFoundPage() {
  // 数据状态
  const [items, setItems] = useState<LostFoundItem[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')

  // 筛选状态
  const [activeTab, setActiveTab] = useState<string>('全部')

  // 发布信息弹窗状态
  const [showPostForm, setShowPostForm] = useState(false)

  // 页面顶部成功提示
  const [successMsg, setSuccessMsg] = useState('')

  // ====== 数据获取 ======
  const fetchItems = () => {
    setStatus('loading')
    // 模拟网络延迟 1.5 秒，让 loading 骨架屏可见
    setTimeout(() => {
      apiGet('/api/lost-found')
        .then((res) => {
          if (res.code === 200) {
            // 后端返回 { data: { items: [...], total, page, limit } }
            // API 返回 date 字段，前端使用 time 字段，需要映射
            const mapped = (res.data.items || []).map((item: any) => ({
              ...item,
              time: item.date,
            }))
            // 按时间倒序排列（最新的在上面）
            const sorted = [...mapped].sort((a, b) =>
              (b.time || '').localeCompare(a.time || '')
            )
            setItems(sorted)
            setStatus('success')
          } else {
            throw new Error(res.message || '获取数据失败')
          }
        })
        .catch(() => {
          setStatus('error')
        })
    }, 1500)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  // ====== 类型筛选 ======
  const filtered = useMemo(() => {
    if (activeTab === '全部') return items
    return items.filter((item) => item.type === activeTab)
  }, [items, activeTab])

  // ====== 发布成功处理 ======
  const handlePostSuccess = (newItem: NewLostFound) => {
    // 关闭弹窗
    setShowPostForm(false)
    // 构造 LostFoundItem 对象，插入列表顶部
    const item: LostFoundItem = {
      id: Date.now(),
      type: newItem.type,
      title: newItem.title,
      location: newItem.location,
      time: newItem.time,
      description: newItem.description,
      isNew: true,
    }
    setItems((prev) => [item, ...prev])
    // 显示成功提示，3 秒后消失
    setSuccessMsg('🎉 发布成功！已添加到列表顶部')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* 标题 + 发布按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">🔍 失物招领</h1>
        <button
          type="button"
          onClick={() => setShowPostForm(true)}
          className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600"
        >
          ＋ 发布信息
        </button>
      </div>

      {/* 成功提示条 */}
      {successMsg && (
        <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700 shadow-sm">
          {successMsg}
        </div>
      )}

      {/* 分类标签（仅在非 loading 时显示） */}
      {status === 'success' && (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {categoryTabs.map((tab) => {
              const active = tab === activeTab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={
                    active
                      ? 'rounded-full bg-purple-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition'
                      : 'rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 transition hover:border-purple-300 hover:text-purple-600'
                  }
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {/* 结果计数 */}
          <p className="mt-4 text-sm text-gray-500">
            共找到 <span className="font-semibold text-gray-700">{filtered.length}</span> 条记录
          </p>
        </>
      )}

      {/* ====== 三种状态 ====== */}

      {/* ⏳ Loading —— 骨架屏 */}
      {status === 'loading' && (
        <div className="mt-8 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-white p-5 shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* 类型标签占位 */}
                <div className="h-6 w-14 animate-pulse rounded-full bg-gray-200" />
                {/* 标题占位 */}
                <div className="flex-1">
                  <div className="h-5 w-1/3 animate-pulse rounded bg-gray-200" />
                  {/* 描述占位 */}
                  <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                  <div className="mt-1.5 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
                  {/* 地点 + 时间占位 */}
                  <div className="mt-3 flex gap-4">
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ Success —— 失物招领列表 */}
      {status === 'success' && (
        <>
          {filtered.length > 0 ? (
            <div className="mt-4 space-y-4">
              {filtered.map((item) => {
                const isLost = item.type === '丢失'
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl bg-white p-5 shadow-md transition-all duration-300 hover:shadow-lg ${
                      item.isNew ? 'ring-2 ring-blue-400' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* 类型标签：丢失=红色，捡到=绿色 */}
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ${
                          isLost ? 'bg-red-500' : 'bg-green-500'
                        }`}
                      >
                        {isLost ? '🔴 丢失' : '🟢 捡到'}
                      </span>

                      {/* 新发布标识 */}
                      {item.isNew && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                          ✨ 新发布
                        </span>
                      )}

                      {/* 内容区 */}
                      <div className="flex-1">
                        {/* 标题 */}
                        <h3 className="text-base font-semibold text-gray-800">
                          {item.title}
                        </h3>

                        {/* 描述 */}
                        {item.description && (
                          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                            {item.description}
                          </p>
                        )}

                        {/* 地点 + 时间 */}
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            📍 {item.location}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            🕒 {item.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <p className="text-lg text-gray-400">没有找到匹配的记录 🤔</p>
              <p className="mt-2 text-sm text-gray-400">试试选择"全部"</p>
            </div>
          )}
        </>
      )}

      {/* ❌ Error —— 错误提示 */}
      {status === 'error' && (
        <div className="mt-8 rounded-2xl border border-red-100 bg-white p-12 text-center shadow-sm">
          <p className="text-4xl">😢</p>
          <p className="mt-4 text-lg text-gray-600">加载失败，请检查网络连接</p>
          <button
            type="button"
            onClick={fetchItems}
            className="mt-6 rounded-lg bg-purple-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-purple-600"
          >
            🔄 重新加载
          </button>
        </div>
      )}

      {/* ====== 发布信息 Modal 弹窗 ====== */}
      {showPostForm && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 backdrop-blur-sm"
          onClick={() => setShowPostForm(false)}
        >
          <div
            className="relative w-full max-w-[640px] rounded-2xl bg-gray-50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={() => setShowPostForm(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="关闭"
            >
              ✕
            </button>

            {/* 表单内容 */}
            <div className="max-h-[85vh] overflow-y-auto">
              <LostFoundForm
                onSuccess={handlePostSuccess}
                onCancel={() => setShowPostForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
