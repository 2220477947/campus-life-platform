import RatingStars from './RatingStars'

interface CanteenCardProps {
  /** 食堂名称 */
  name: string
  /** 综合评分（0-5） */
  rating: number
  /** 位置描述 */
  location: string
  /** 标签列表 */
  tags?: string[]
  /** 是否展开评价区域 */
  expanded?: boolean
  /** 点击卡片头部时的回调 */
  onToggle?: () => void
}

export default function CanteenCard({
  name,
  rating,
  location,
  tags = [],
  expanded = false,
  onToggle,
}: CanteenCardProps) {
  return (
    <div className="rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-xl">
      {/* 卡片头部 —— 可点击展开 */}
      <button
        type="button"
        onClick={onToggle}
        className="block w-full p-6 text-left"
      >
        {/* 图标区域 —— 食堂主题橙色背景 */}
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 text-3xl leading-none">
          🍽️
        </div>

        {/* 食堂名称 + 展开指示 */}
        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{name}</h3>
          <span
            className={`text-gray-400 transition-transform duration-300 ${
              expanded ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </div>

        {/* 评分 —— 使用 RatingStars 只读模式 */}
        <div className="mt-2 flex items-center gap-2">
          <RatingStars rating={rating} readonly />
          <span className="text-sm font-semibold text-orange-600">
            {rating.toFixed(1)}
          </span>
        </div>

        {/* 位置 */}
        <p className="mt-2 flex items-center gap-1 text-sm leading-relaxed text-gray-500">
          <span aria-hidden>📍</span>
          <span>{location}</span>
        </p>

        {/* 标签 */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 主题色装饰条 */}
        <div className="mt-4 h-1 w-12 rounded-full bg-gradient-to-r from-orange-500 to-orange-600" />
      </button>
    </div>
  )
}
