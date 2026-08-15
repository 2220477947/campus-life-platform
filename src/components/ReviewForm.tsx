import { useRef, useState } from 'react'
import RatingStars from './RatingStars'
import { apiPost } from '../config/api'

/* ============================================================
 *  类型定义
 * ============================================================ */

/** 新提交的评价数据（传回给父组件） */
export interface NewReview {
  id: number
  canteenId: number
  username: string
  content: string
  rating: number
  time: string
}

interface ReviewFormProps {
  /** 要评价的食堂 ID（必传） */
  canteenId: number
  /** 提交成功后的回调，接收新评价数据 */
  onSubmitSuccess?: (review: NewReview) => void
}

interface FormErrors {
  rating?: string
  content?: string
}

type ToastType = 'success' | 'error' | null

/* ============================================================
 *  Toast 提示组件
 * ============================================================ */

interface ToastProps {
  type: Exclude<ToastType, null>
  message: string
}

function Toast({ type, message }: ToastProps) {
  const isSuccess = type === 'success'
  return (
    <div
      className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg px-6 py-3 text-sm font-medium text-white shadow-lg ${
        isSuccess ? 'bg-green-500' : 'bg-red-500'
      }`}
      role="alert"
    >
      {isSuccess ? '✅ ' : '❌ '}
      {message}
    </div>
  )
}

/* ============================================================
 *  主组件
 * ============================================================ */

export default function ReviewForm({ canteenId, onSubmitSuccess }: ReviewFormProps) {
  // 表单数据
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')

  // 错误信息
  const [errors, setErrors] = useState<FormErrors>({})

  // 提交状态
  const [submitting, setSubmitting] = useState(false)

  // Toast 提示
  const [toast, setToast] = useState<ToastType>(null)
  const [toastMsg, setToastMsg] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ---------- 工具函数 ---------- */

  const showToast = (type: Exclude<ToastType, null>, message: string) => {
    setToast(type)
    setToastMsg(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  /* ---------- 单字段失焦验证 ---------- */

  const validateContent = () => {
    let err: string | undefined
    if (!content.trim()) err = '请输入评价内容'
    else if (content.trim().length < 5) err = '评价至少5个字'
    setErrors((prev) => ({ ...prev, content: err }))
  }

  /* ---------- 提交时统一验证 ---------- */

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {}

    if (rating === 0) newErrors.rating = '请给食堂打分'

    if (!content.trim()) newErrors.content = '请输入评价内容'
    else if (content.trim().length < 5) newErrors.content = '评价至少5个字'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /* ---------- 提交 ---------- */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (!validateAll()) {
      showToast('error', '请检查表单填写')
      return
    }

    setSubmitting(true)

    // 后端期望 snake_case 字段名
    const payload = {
      canteen_id: canteenId,
      rating,
      content: content.trim(),
    }

    apiPost('/api/reviews', payload)
      .then((res) => {
        if (res.code === 201) {
          showToast('success', '评价提交成功！')
          // 使用后端返回的数据构造 NewReview（包含真实 id、username、time）
          const newReview: NewReview = {
            id: res.data.id,
            canteenId: res.data.canteen_id,
            username: res.data.username,
            content: res.data.content,
            rating: res.data.rating,
            time: res.data.time || res.data.created_at || '',
          }
          // 清空表单
          setRating(0)
          setContent('')
          setErrors({})
          setTimeout(() => {
            onSubmitSuccess?.(newReview)
          }, 1500)
        } else {
          showToast('error', res.message || '提交失败')
        }
      })
      .catch(() => {
        showToast('error', '提交失败，请稍后重试')
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  /* ---------- 样式常量 ---------- */

  const inputBase =
    'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-700 shadow-sm transition focus:outline-none focus:ring-2'

  const getInputClass = (hasError?: string) =>
    hasError
      ? `${inputBase} border-red-300 focus:border-red-400 focus:ring-red-100`
      : `${inputBase} border-gray-200 focus:border-orange-400 focus:ring-orange-100`

  /* ---------- 渲染 ---------- */

  return (
    <div className="relative">
      {/* Toast */}
      {toast && <Toast type={toast} message={toastMsg} />}

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700">✍️ 写评价</h4>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5" noValidate>
          {/* ====== 评分区域（突出显示）====== */}
          <div className="rounded-lg bg-orange-50/60 p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                我的评分 <span className="text-red-500">*</span>
              </span>
              <RatingStars
                rating={rating}
                onChange={(val) => {
                  setRating(val)
                  setErrors((prev) => ({ ...prev, rating: undefined }))
                }}
              />
              <span className="text-sm font-semibold text-orange-600">
                {rating > 0 ? `${rating}.0 分` : '未评分'}
              </span>
            </div>
            {errors.rating && (
              <p className="mt-2 text-xs text-red-500">{errors.rating}</p>
            )}
          </div>

          {/* ====== 评价内容 ====== */}
          <div>
            <label htmlFor="review-content" className="mb-1.5 block text-sm font-medium text-gray-700">
              评价内容 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                id="review-content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  setErrors((prev) => ({ ...prev, content: undefined }))
                }}
                onBlur={validateContent}
                maxLength={200}
                rows={4}
                placeholder="说说你的用餐体验..."
                className={`${getInputClass(errors.content)} resize-none pr-16 pb-8`}
              />
              {/* 字数统计 */}
              <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-gray-400">
                {content.length}/200
              </span>
            </div>
            {errors.content && (
              <p className="mt-1 text-xs text-red-500">{errors.content}</p>
            )}
          </div>

          {/* ====== 提交按钮 ====== */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className={`rounded-lg px-6 py-2.5 text-sm font-medium text-white shadow-sm transition ${
                submitting
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {submitting ? '提交中...' : '提交评价'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
