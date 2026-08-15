import { useEffect, useMemo, useState } from 'react'
import CanteenCard from '../components/CanteenCard'
import RatingStars from '../components/RatingStars'
import ReviewForm, { type NewReview } from '../components/ReviewForm'
import { apiGet, apiPost } from '../config/api'

/* ============================================================
 *  类型定义
 * ============================================================ */

interface Canteen {
  id: number
  name: string
  location: string
  rating: number
  tags: string[]
  image: string
}

type LoadStatus = 'loading' | 'success' | 'error'

/* ============================================================
 *  分类标签
 * ============================================================ */

const categoryTabs = ['全部', '第一食堂', '第二食堂', '第三食堂', '教工食堂'] as const

/* ============================================================
 *  主组件
 * ============================================================ */

export default function CanteenPage() {
  // 数据状态
  const [canteens, setCanteens] = useState<Canteen[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')

  // 筛选状态
  const [keyword, setKeyword] = useState('')
  const [activeTab, setActiveTab] = useState<string>('全部')
  const [expandedId, setExpandedId] = useState<number>(0)

  // ====== 数据获取 ======
  const fetchCanteens = () => {
    setStatus('loading')
    apiGet<Canteen[]>('/api/canteens')
      .then((res) => {
        if (res.code === 200) {
          setCanteens(res.data)
          setStatus('success')
        } else {
          throw new Error(res.message || '获取数据失败')
        }
      })
      .catch(() => {
        setStatus('error')
      })
  }

  useEffect(() => {
    fetchCanteens()
  }, [])

  // ====== 搜索 + 标签叠加筛选 ======
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return canteens.filter((c) => {
      const matchKeyword =
        kw === '' ||
        c.name.toLowerCase().includes(kw) ||
        c.location.toLowerCase().includes(kw)
      const matchTab = activeTab === '全部' || c.name === activeTab
      return matchKeyword && matchTab
    })
  }, [canteens, keyword, activeTab])

  const handleToggle = (id: number) => {
    setExpandedId((prev) => (prev === id ? 0 : id))
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-800">🍽️ 食堂点评</h1>

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
                placeholder="搜索食堂名称或位置"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
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
                      ? 'rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition'
                      : 'rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 transition hover:border-orange-300 hover:text-orange-600'
                  }
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {/* 结果计数 */}
          <p className="mt-4 text-sm text-gray-500">
            共找到 <span className="font-semibold text-gray-700">{filtered.length}</span> 个食堂
          </p>
        </>
      )}

      {/* ====== 三种状态 ====== */}

      {/* ⏳ Loading —— 骨架屏 */}
      {status === 'loading' && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-white p-6 shadow-md"
            >
              {/* 图标占位 */}
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-gray-200" />
              {/* 标题占位 */}
              <div className="mt-4 h-5 w-32 animate-pulse rounded bg-gray-200" />
              {/* 评分占位 */}
              <div className="mt-3 h-4 w-48 animate-pulse rounded bg-gray-200" />
              {/* 位置占位 */}
              <div className="mt-3 h-4 w-40 animate-pulse rounded bg-gray-200" />
              {/* 标签占位 */}
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
              </div>
              {/* 装饰条占位 */}
              <div className="mt-4 h-1 w-12 animate-pulse rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      )}

      {/* ✅ Success —— 食堂卡片列表 */}
      {status === 'success' && (
        <>
          {filtered.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {filtered.map((c) => (
                <div key={c.id}>
                  <CanteenCard
                    name={c.name}
                    rating={c.rating}
                    location={c.location}
                    tags={c.tags}
                    expanded={expandedId === c.id}
                    onToggle={() => handleToggle(c.id)}
                  />

                  {/* 展开评价区域 */}
                  {expandedId === c.id && (
                    <ReviewSection canteenId={c.id} canteenName={c.name} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <p className="text-lg text-gray-400">没有找到匹配的食堂 🤔</p>
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
            onClick={fetchCanteens}
            className="mt-6 rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600"
          >
            🔄 重新加载
          </button>
        </div>
      )}
    </div>
  )
}

/* ============================================================
 *  评价区域子组件
 * ============================================================ */

interface ReviewSectionProps {
  canteenId: number
  canteenName: string
}

function ReviewSection({ canteenId, canteenName }: ReviewSectionProps) {
  // 从后端获取的历史评价
  const [canteenReviews, setCanteenReviews] = useState<any[]>([])
  // 用户已提交的评价（新评价在列表顶部）
  const [submittedReviews, setSubmittedReviews] = useState<NewReview[]>([])

  // ====== AI 总结状态 ======
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  // Toast 提示
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Toast 自动消失
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // 获取该食堂的评价列表
  useEffect(() => {
    apiGet(`/api/reviews?canteen_id=${canteenId}`)
      .then((res) => {
        if (res.code === 200) {
          setCanteenReviews(res.data.reviews || [])
        }
      })
      .catch(() => {
        // 静默失败，不影响展开区域显示
      })
  }, [canteenId])

  // 提交成功回调：将新评价插入列表顶部
  const handleSubmitSuccess = (newReview: NewReview) => {
    setSubmittedReviews((prev) => [newReview, ...prev])
  }

  // ====== AI 总结处理 ======
  const handleAISummary = async () => {
    // 已有缓存，不重复调用
    if (aiSummary) return

    // 检查登录状态
    const token = localStorage.getItem('token')
    if (!token) {
      setToast({ type: 'error', text: '请先登录' })
      return
    }

    setAiLoading(true)
    try {
      const res = await apiPost<{ summary: string }>('/api/ai/summarize-reviews', {
        canteen_id: canteenId,
      })

      if (res.code === 200 && res.data?.summary) {
        setAiSummary(res.data.summary)
      } else {
        setToast({ type: 'error', text: res.message || 'AI总结失败，请稍后重试' })
      }
    } catch {
      setToast({ type: 'error', text: 'AI总结失败，请稍后重试' })
    } finally {
      setAiLoading(false)
    }
  }

  // 将 AI 总结按句号分割为三行
  const summaryLines = aiSummary
    ? aiSummary.split(/[。！？\n]+/).filter((s) => s.trim()).slice(0, 3)
    : []

  const allDisplayedReviews = [...submittedReviews, ...canteenReviews]

  return (
    <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-5">
      {/* Toast 提示 */}
      {toast && (
        <div
          className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg px-6 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
          role="alert"
        >
          {toast.type === 'success' ? '✅ ' : '❌ '}
          {toast.text}
        </div>
      )}

      {/* ====== AI 总结按钮 ====== */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleAISummary}
          disabled={aiLoading || !!aiSummary}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all ${
            aiSummary
              ? 'cursor-default bg-purple-300'
              : aiLoading
                ? 'cursor-not-allowed bg-purple-400'
                : 'bg-purple-500 hover:-translate-y-0.5 hover:bg-purple-600 hover:shadow-md'
          }`}
        >
          {aiLoading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>分析中...</span>
            </>
          ) : aiSummary ? (
            <span>✅ AI总结已生成</span>
          ) : (
            <span>🤖 AI总结</span>
          )}
        </button>
        {!aiSummary && !aiLoading && (
          <span className="text-xs text-gray-400">让AI帮你分析评价</span>
        )}
      </div>

      {/* ====== AI 总结结果卡片 ====== */}
      {aiSummary && (
        <div className="mb-5 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-purple-700">
            📊 AI评价总结
          </h4>
          <div className="mt-3 space-y-2">
            {summaryLines.length > 0 ? (
              summaryLines.map((line, i) => (
                <div key={i} className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                  <span className="mt-0.5 text-purple-400">•</span>
                  <span>{line.trim()}。</span>
                </div>
              ))
            ) : (
              <p className="text-sm leading-relaxed text-gray-700">{aiSummary}</p>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-400">由AI生成，仅供参考</p>
        </div>
      )}

      {/* 写评价表单（放在评价列表上方） */}
      <ReviewForm canteenId={canteenId} onSubmitSuccess={handleSubmitSuccess} />

      {/* 评价列表 */}
      <div className="mt-5">
        <h4 className="text-sm font-semibold text-gray-700">
          📋 {canteenName} 的评价（{allDisplayedReviews.length} 条）
        </h4>

        <div className="mt-3 space-y-3">
          {allDisplayedReviews.length > 0 ? (
            allDisplayedReviews.map((r) => (
              <div
                key={r.id}
                className="rounded-lg bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {r.username}
                  </span>
                  <span className="text-xs text-gray-400">{r.time}</span>
                </div>
                <div className="mt-1">
                  <RatingStars rating={r.rating} readonly />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {r.content}
                </p>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-gray-400">
              暂无评价，快来抢沙发吧 👇
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
