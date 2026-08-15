import { useRef, useState } from 'react'
import { apiPost } from '../config/api'

/* ============================================================
 *  类型定义
 * ============================================================ */

/** 新发布的失物招领数据（传回给父组件） */
export interface NewLostFound {
  type: '丢失' | '捡到'
  title: string
  location: string
  time: string
  description: string
}

interface LostFoundFormProps {
  /** 提交成功后的回调，接收新数据 */
  onSuccess?: (item: NewLostFound) => void
  /** 取消按钮的回调函数（可选） */
  onCancel?: () => void
}

interface FormValues {
  type: '' | '丢失' | '捡到'
  title: string
  location: string
  date: string
  description: string
}

interface FormErrors {
  type?: string
  title?: string
  location?: string
  date?: string
  description?: string
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

export default function LostFoundForm({ onSuccess, onCancel }: LostFoundFormProps) {
  // 表单数据
  const [values, setValues] = useState<FormValues>({
    type: '',
    title: '',
    location: '',
    date: '',
    description: '',
  })

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

  const updateField = <K extends keyof FormValues>(key: K, val: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  /* ---------- 单字段失焦验证 ---------- */

  const validateField = (key: keyof FormValues) => {
    let err: string | undefined
    switch (key) {
      case 'type':
        if (!values.type) err = '请选择类型'
        break
      case 'title':
        if (!values.title.trim()) err = '请填写物品名称'
        else if (values.title.trim().length < 2) err = '物品名称至少2个字'
        else if (values.title.trim().length > 20) err = '物品名称不超过20个字'
        break
      case 'location':
        if (!values.location.trim()) err = '请填写地点'
        break
      case 'date':
        if (!values.date) err = '请选择日期'
        break
      case 'description':
        if (!values.description.trim()) err = '请填写描述'
        else if (values.description.trim().length < 5) err = '描述至少5个字'
        break
    }
    setErrors((prev) => ({ ...prev, [key]: err }))
  }

  /* ---------- 提交时统一验证 ---------- */

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {}

    if (!values.type) newErrors.type = '请选择类型'

    if (!values.title.trim()) newErrors.title = '请填写物品名称'
    else if (values.title.trim().length < 2) newErrors.title = '物品名称至少2个字'
    else if (values.title.trim().length > 20) newErrors.title = '物品名称不超过20个字'

    if (!values.location.trim()) newErrors.location = '请填写地点'

    if (!values.date) newErrors.date = '请选择日期'

    if (!values.description.trim()) newErrors.description = '请填写描述'
    else if (values.description.trim().length < 5) newErrors.description = '描述至少5个字'

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

    // 后端期望 date 字段（而非 time）
    const payload = {
      type: values.type,
      title: values.title.trim(),
      location: values.location.trim(),
      date: values.date,
      description: values.description.trim(),
    }

    apiPost('/api/lost-found', payload)
      .then((res) => {
        if (res.code === 201) {
          showToast('success', '发布成功！')
          // 使用后端返回的数据构造 NewLostFound（date → time 映射）
          const newItem: NewLostFound = {
            type: res.data.type,
            title: res.data.title,
            location: res.data.location,
            time: res.data.date,
            description: res.data.description,
          }
          // 清空表单
          setValues({
            type: '',
            title: '',
            location: '',
            date: '',
            description: '',
          })
          setErrors({})
          setTimeout(() => {
            onSuccess?.(newItem)
          }, 1500)
        } else {
          showToast('error', res.message || '发布失败')
        }
      })
      .catch(() => {
        showToast('error', '发布失败')
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
      : `${inputBase} border-gray-200 focus:border-blue-400 focus:ring-blue-100`

  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700'

  /* ---------- 渲染 ---------- */

  return (
    <div className="mx-auto max-w-[640px] px-4 py-8 sm:px-6">
      {/* Toast */}
      {toast && <Toast type={toast} message={toastMsg} />}

      <h2 className="text-xl font-bold text-gray-800">📝 发布失物招领</h2>
      <p className="mt-1 text-sm text-gray-500">
        发布丢失或捡到的物品信息，帮助失主找回
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {/* ====== 类型切换按钮组 ====== */}
        <div>
          <label className={labelClass}>
            类型 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {(['丢失', '捡到'] as const).map((t) => {
              const active = values.type === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateField('type', t)}
                  className={`flex-1 rounded-lg border px-5 py-2.5 text-sm font-medium transition ${
                    active
                      ? t === '丢失'
                        ? 'border-red-500 bg-red-500 text-white shadow-sm'
                        : 'border-green-500 bg-green-500 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {t === '丢失' ? '🔴 丢失' : '🟢 捡到'}
                </button>
              )
            })}
          </div>
          {errors.type && (
            <p className="mt-1 text-xs text-red-500">{errors.type}</p>
          )}
        </div>

        {/* ====== 物品名称 ====== */}
        <div>
          <label htmlFor="lf-title" className={labelClass}>
            物品名称 <span className="text-red-500">*</span>
          </label>
          <input
            id="lf-title"
            type="text"
            value={values.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => validateField('title')}
            maxLength={20}
            placeholder="请输入物品名称（2-20字）"
            className={getInputClass(errors.title)}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-500">{errors.title}</p>
          )}
        </div>

        {/* ====== 地点 + 日期（两列布局）====== */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* 地点 */}
          <div>
            <label htmlFor="lf-location" className={labelClass}>
              地点 <span className="text-red-500">*</span>
            </label>
            <input
              id="lf-location"
              type="text"
              value={values.location}
              onChange={(e) => updateField('location', e.target.value)}
              onBlur={() => validateField('location')}
              placeholder="如：图书馆二楼"
              className={getInputClass(errors.location)}
            />
            {errors.location && (
              <p className="mt-1 text-xs text-red-500">{errors.location}</p>
            )}
          </div>

          {/* 日期 */}
          <div>
            <label htmlFor="lf-date" className={labelClass}>
              时间 <span className="text-red-500">*</span>
            </label>
            <input
              id="lf-date"
              type="date"
              value={values.date}
              onChange={(e) => updateField('date', e.target.value)}
              onBlur={() => validateField('date')}
              className={`${getInputClass(errors.date)} cursor-pointer`}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-red-500">{errors.date}</p>
            )}
          </div>
        </div>

        {/* ====== 描述 ====== */}
        <div>
          <label htmlFor="lf-description" className={labelClass}>
            描述 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              id="lf-description"
              value={values.description}
              onChange={(e) => updateField('description', e.target.value)}
              onBlur={() => validateField('description')}
              maxLength={200}
              rows={4}
              placeholder="详细描述物品的特征、颜色、品牌等（5-200字）"
              className={`${getInputClass(errors.description)} resize-none pr-16 pb-8`}
            />
            {/* 字数统计 */}
            <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-gray-400">
              {values.description.length}/200
            </span>
          </div>
          {errors.description && (
            <p className="mt-1 text-xs text-red-500">{errors.description}</p>
          )}
        </div>

        {/* ====== 按钮区 ====== */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm transition ${
              submitting
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {submitting ? '提交中...' : '发布'}
          </button>
        </div>
      </form>
    </div>
  )
}
