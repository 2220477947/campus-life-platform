import { useRef, useState } from 'react'
import { apiPost } from '../config/api'

/* ============================================================
 *  类型定义
 * ============================================================ */

/** 新发布的商品数据（传回给父组件） */
export interface NewItem {
  title: string
  description: string
  price: number
  category: string
  contact: string
  images: string[]
}

interface PostItemFormProps {
  /** 提交成功后的回调函数，接收新商品数据（可选） */
  onSuccess?: (item: NewItem) => void
  /** 取消按钮的回调函数（可选） */
  onCancel?: () => void
}

interface FormValues {
  title: string
  description: string
  price: string
  category: string
  contact: string
  images: string[]
}

interface FormErrors {
  title?: string
  description?: string
  price?: string
  category?: string
  contact?: string
}

type ToastType = 'success' | 'error' | null

/* ============================================================
 *  分类选项
 * ============================================================ */

const categoryOptions = ['教材', '电子', '生活', '其他'] as const

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

export default function PostItemForm({ onSuccess, onCancel }: PostItemFormProps) {
  // 表单数据
  const [values, setValues] = useState<FormValues>({
    title: '',
    description: '',
    price: '',
    category: '',
    contact: '',
    images: [],
  })

  // 错误信息
  const [errors, setErrors] = useState<FormErrors>({})

  // 提交状态
  const [submitting, setSubmitting] = useState(false)

  // AI 描述生成状态
  const [aiLoading, setAiLoading] = useState(false)

  // Toast 提示
  const [toast, setToast] = useState<ToastType>(null)
  const [toastMsg, setToastMsg] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    // 输入时清除该字段错误
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  /* ---------- 单字段失焦验证 ---------- */

  const validateField = (key: keyof FormValues) => {
    let err: string | undefined
    switch (key) {
      case 'title':
        if (!values.title.trim()) err = '请填写商品名称'
        else if (values.title.trim().length < 2) err = '商品名称至少2个字'
        else if (values.title.trim().length > 30) err = '商品名称不超过30个字'
        break
      case 'description':
        if (!values.description.trim()) err = '请填写商品描述'
        else if (values.description.trim().length < 10) err = '描述至少10个字'
        break
      case 'price':
        if (!values.price) err = '请填写价格'
        else if (isNaN(Number(values.price)) || Number(values.price) <= 0)
          err = '请输入有效的价格'
        break
      case 'category':
        if (!values.category) err = '请选择分类'
        break
      case 'contact':
        if (!values.contact.trim()) err = '请填写联系方式'
        break
    }
    setErrors((prev) => ({ ...prev, [key]: err }))
  }

  /* ---------- 提交时统一验证 ---------- */

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {}

    // 商品名称
    if (!values.title.trim()) newErrors.title = '请填写商品名称'
    else if (values.title.trim().length < 2)
      newErrors.title = '商品名称至少2个字'
    else if (values.title.trim().length > 30)
      newErrors.title = '商品名称不超过30个字'

    // 商品描述
    if (!values.description.trim()) newErrors.description = '请填写商品描述'
    else if (values.description.trim().length < 10)
      newErrors.description = '描述至少10个字'

    // 价格
    if (!values.price) newErrors.price = '请填写价格'
    else if (isNaN(Number(values.price)) || Number(values.price) <= 0)
      newErrors.price = '请输入有效的价格'

    // 分类
    if (!values.category) newErrors.category = '请选择分类'

    // 联系方式
    if (!values.contact.trim()) newErrors.contact = '请填写联系方式'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /* ---------- 图片处理 ---------- */

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = 3 - values.images.length
    if (remaining <= 0) {
      showToast('error', '最多只能上传3张图片')
      return
    }
    const fileArray = Array.from(files).slice(0, remaining)
    fileArray.forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) {
          setValues((prev) => ({
            ...prev,
            images: [...prev.images, result],
          }))
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setValues((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
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

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      price: Number(values.price),
      category: values.category,
      contact: values.contact.trim(),
      images: values.images,
    }

    apiPost('/api/items', payload)
      .then((res) => {
        if (res.code === 201) {
          showToast('success', '发布成功！')
          // 构造新商品数据回传给父组件
          const newItem: NewItem = {
            title: values.title.trim(),
            description: values.description.trim(),
            price: Number(values.price),
            category: values.category,
            contact: values.contact.trim(),
            images: values.images,
          }
          // 清空表单
          setValues({
            title: '',
            description: '',
            price: '',
            category: '',
            contact: '',
            images: [],
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
        showToast('error', '发布失败，请稍后重试')
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  /* ---------- AI 生成描述 ---------- */

  const handleAIDescription = async () => {
    if (aiLoading) return

    // 验证商品名称
    if (!values.title.trim()) {
      showToast('error', '请先填写商品名称')
      return
    }

    // 验证价格
    if (!values.price) {
      showToast('error', '请先填写价格')
      return
    }

    setAiLoading(true)
    try {
      const res = await apiPost<{ description: string }>(
        '/api/ai/generate-description',
        {
          title: values.title.trim(),
          price: Number(values.price),
          condition: values.category || undefined,
          usage: values.description.trim() || undefined,
        }
      )

      if (res.code === 200 && res.data?.description) {
        updateField('description', res.data.description.trim())
        showToast('success', 'AI描述已生成，你可以修改后发布')
      } else {
        showToast('error', 'AI生成失败，请手动填写描述')
      }
    } catch {
      showToast('error', 'AI生成失败，请手动填写描述')
    } finally {
      setAiLoading(false)
    }
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

      <h2 className="text-xl font-bold text-gray-800">📝 发布二手商品</h2>
      <p className="mt-1 text-sm text-gray-500">
        填写以下信息，让闲置物品找到新主人
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {/* ====== 商品名称 ====== */}
        <div>
          <label htmlFor="title" className={labelClass}>
            商品名称 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={values.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => validateField('title')}
            maxLength={30}
            placeholder="请输入商品名称（2-30字）"
            className={getInputClass(errors.title)}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-500">{errors.title}</p>
          )}
        </div>

        {/* ====== 商品描述 ====== */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              商品描述 <span className="text-red-500">*</span>
            </label>
            {/* AI 生成描述按钮 */}
            <button
              type="button"
              onClick={handleAIDescription}
              disabled={aiLoading}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition ${
                aiLoading
                  ? 'cursor-not-allowed border-purple-200 bg-purple-50 text-purple-300'
                  : 'border-purple-300 bg-white text-purple-600 hover:bg-purple-50 hover:border-purple-400'
              }`}
            >
              {aiLoading ? (
                <>
                  <svg
                    className="h-3 w-3 animate-spin"
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
                  <span>生成中...</span>
                </>
              ) : (
                <span>🤖 AI帮我写描述</span>
              )}
            </button>
          </div>
          <div className="relative">
            <textarea
              id="description"
              value={values.description}
              onChange={(e) => updateField('description', e.target.value)}
              onBlur={() => validateField('description')}
              maxLength={500}
              rows={4}
              placeholder="详细描述商品的品牌、成色、使用情况等（10-500字）"
              className={`${getInputClass(errors.description)} resize-none pr-16 pb-8`}
            />
            {/* 字数统计 */}
            <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-gray-400">
              {values.description.length}/500
            </span>
          </div>
          {errors.description && (
            <p className="mt-1 text-xs text-red-500">{errors.description}</p>
          )}
        </div>

        {/* ====== 价格 + 分类（两列布局）====== */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* 价格 */}
          <div>
            <label htmlFor="price" className={labelClass}>
              价格 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                ¥
              </span>
              <input
                id="price"
                type="number"
                inputMode="decimal"
                value={values.price}
                onChange={(e) => updateField('price', e.target.value)}
                onBlur={() => validateField('price')}
                min="0"
                step="0.01"
                placeholder="0.00"
                className={`${getInputClass(errors.price)} pl-7`}
              />
            </div>
            {errors.price && (
              <p className="mt-1 text-xs text-red-500">{errors.price}</p>
            )}
          </div>

          {/* 分类 */}
          <div>
            <label htmlFor="category" className={labelClass}>
              分类 <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={values.category}
              onChange={(e) => updateField('category', e.target.value)}
              onBlur={() => validateField('category')}
              className={`${getInputClass(errors.category)} cursor-pointer`}
            >
              <option value="" disabled>
                请选择分类
              </option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-red-500">{errors.category}</p>
            )}
          </div>
        </div>

        {/* ====== 图片上传 ====== */}
        <div>
          <label className={labelClass}>
            图片 <span className="text-sm font-normal text-gray-400">（可选，最多3张）</span>
          </label>

          {/* 缩略图预览区 */}
          {values.images.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {values.images.map((img, index) => (
                <div
                  key={index}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                >
                  <img
                    src={img}
                    alt={`预览 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {/* 删除按钮 */}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-sm transition hover:bg-red-600"
                    aria-label={`删除图片 ${index + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 上传区域 */}
          {values.images.length < 3 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <span className="text-3xl text-gray-300">📷</span>
              <p className="mt-2 text-sm text-gray-500">
                {isDragging ? '松开鼠标即可上传' : '点击或拖拽图片到此处'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                支持 JPG / PNG，最多 3 张
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = '' // 允许重复选择同一文件
            }}
            className="hidden"
          />
        </div>

        {/* ====== 联系方式 ====== */}
        <div>
          <label htmlFor="contact" className={labelClass}>
            联系方式 <span className="text-red-500">*</span>
          </label>
          <input
            id="contact"
            type="text"
            value={values.contact}
            onChange={(e) => updateField('contact', e.target.value)}
            onBlur={() => validateField('contact')}
            placeholder="手机号或微信号"
            className={getInputClass(errors.contact)}
          />
          {errors.contact && (
            <p className="mt-1 text-xs text-red-500">{errors.contact}</p>
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
            {submitting ? '发布中...' : '发布商品'}
          </button>
        </div>
      </form>
    </div>
  )
}
