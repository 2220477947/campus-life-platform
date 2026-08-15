import { useEffect, useMemo, useState } from 'react'
import PostItemForm, { type NewItem } from '../components/PostItemForm'
import { apiGet } from '../config/api'

/* ============================================================
 *  类型定义
 * ============================================================ */

interface Item {
  id: number
  title: string
  price: number
  category: string
  seller: string
  image: string
  /** 是否为用户刚发布的新商品（用于高亮提示） */
  isNew?: boolean
}

type LoadStatus = 'loading' | 'success' | 'error'

/* ============================================================
 *  分类标签
 * ============================================================ */

const categoryTabs = ['全部', '教材', '电子', '生活', '其他'] as const

/* ============================================================
 *  主组件
 * ============================================================ */

export default function TradePage() {
  // 数据状态
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')

  // 筛选状态
  const [keyword, setKeyword] = useState('')
  const [activeTab, setActiveTab] = useState<string>('全部')

  // 收藏状态
  const [favorites, setFavorites] = useState<Record<number, boolean>>({})

  // 发布商品弹窗状态
  const [showPostForm, setShowPostForm] = useState(false)

  // 页面顶部成功提示
  const [successMsg, setSuccessMsg] = useState('')
  // ====== 数据获取 ======
  const fetchItems = () => {
    setStatus('loading')
    // 模拟网络延迟 1.5 秒，让 loading 骨架屏可见
    setTimeout(() => {
      apiGet('/api/items')
        .then((res) => {
          if (res.code === 200) {
            // 后端返回 { data: { items: [...], total, page, limit } }
            setItems(res.data.items)
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

  // ====== 搜索 + 分类叠加筛选 ======
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return items.filter((item) => {
      const matchKeyword =
        kw === '' ||
        item.title.toLowerCase().includes(kw) ||
        item.seller.toLowerCase().includes(kw)
      const matchTab = activeTab === '全部' || item.category === activeTab
      return matchKeyword && matchTab
    })
  }, [items, keyword, activeTab])

  // ====== 收藏切换 ======
  const toggleFavorite = (id: number) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // ====== 发布成功处理 ======
  const handlePostSuccess = (newItem: NewItem) => {
    // 关闭弹窗
    setShowPostForm(false)
    // 构造 Item 对象，插入列表顶部
    const item: Item = {
      id: Date.now(),
      title: newItem.title,
      price: newItem.price,
      category: newItem.category,
      seller: '我',
      image: newItem.images[0] || '',
      isNew: true,
    }
    setItems((prev) => [item, ...prev])
    // 显示成功提示，3 秒后消失
    setSuccessMsg('🎉 商品发布成功！已添加到列表顶部')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* 标题 + 发布按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">🔄 二手交易</h1>
        <button
          type="button"
          onClick={() => setShowPostForm(true)}
          className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600"
        >
          ＋ 发布商品
        </button>
      </div>

      {/* 成功提示条 */}
      {successMsg && (
        <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700 shadow-sm">
          {successMsg}
        </div>
      )}

      {/* 搜索框 + 分类标签（仅在非 loading 时显示） */}
      {status === 'success' && (
        <>
          {/* 搜索框 */}
          <div className="mt-6">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索商品名称或卖家"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 shadow-sm transition focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          {/* 分类标签 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {categoryTabs.map((tab) => {
              const active = tab === activeTab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={
                    active
                      ? 'rounded-full bg-green-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition'
                      : 'rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 transition hover:border-green-300 hover:text-green-600'
                  }
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {/* 结果计数 */}
          <p className="mt-4 text-sm text-gray-500">
            共找到 <span className="font-semibold text-gray-700">{filtered.length}</span> 件商品
          </p>
        </>
      )}

      {/* ====== 三种状态 ====== */}

      {/* ⏳ Loading —— 骨架屏 */}
      {status === 'loading' && (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl bg-white shadow-md"
            >
              {/* 图片占位 */}
              <div className="aspect-square animate-pulse bg-gray-200" />
              {/* 信息区占位 */}
              <div className="p-4">
                {/* 分类标签占位 */}
                <div className="h-5 w-14 animate-pulse rounded-full bg-gray-200" />
                {/* 标题占位 */}
                <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="mt-1.5 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
                {/* 价格 + 卖家占位 */}
                <div className="mt-3 flex items-end justify-between">
                  <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ Success —— 商品列表 */}
      {status === 'success' && (
        <>
          {filtered.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => {
                const isFav = !!favorites[item.id]
                return (
                  <div
                    key={item.id}
                    className={`group relative overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                      item.isNew ? 'ring-2 ring-blue-400' : ''
                    }`}
                  >
                    {/* 新发布标识 */}
                    {item.isNew && (
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                        ✨ 新发布
                      </span>
                    )}

                    {/* 商品图片 */}
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <img
                        src={item.image || `https://picsum.photos/seed/item${item.id}/400/400`}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* 收藏按钮 */}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(item.id)}
                        className="fav-btn absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition-transform duration-200 hover:bg-white"
                        aria-label={isFav ? '取消收藏' : '收藏商品'}
                      >
                        <span
                          className={`text-xl ${
                            isFav ? 'text-red-500' : 'text-gray-400'
                          }`}
                        >
                          {isFav ? '❤' : '♡'}
                        </span>
                      </button>
                    </div>

                    {/* 商品信息 */}
                    <div className="p-4">
                      {/* 分类标签 */}
                      <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">
                        {item.category}
                      </span>

                      {/* 标题 */}
                      <h3 className="mt-2 line-clamp-2 text-sm font-medium text-gray-800">
                        {item.title}
                      </h3>

                      {/* 价格 + 卖家 */}
                      <div className="mt-3 flex items-end justify-between">
                        <span className="text-lg font-bold text-red-500">
                          ¥{item.price}
                        </span>
                        <span className="text-xs text-gray-400">{item.seller}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <p className="text-lg text-gray-400">没有找到匹配的商品 🤔</p>
              <p className="mt-2 text-sm text-gray-400">试试换个关键词或选择"全部"</p>
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
            className="mt-6 rounded-lg bg-green-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-600"
          >
            🔄 重新加载
          </button>
        </div>
      )}

      {/* ====== 发布商品 Modal 弹窗 ====== */}
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

            {/* 表单内容（PostItemForm 自带 max-width，这里移除其外层 padding 对齐） */}
            <div className="max-h-[85vh] overflow-y-auto">
              <PostItemForm
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
