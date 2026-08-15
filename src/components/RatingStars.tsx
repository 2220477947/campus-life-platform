import { useState } from 'react'

interface RatingStarsProps {
  /** 当前评分（0-5） */
  rating: number
  /** 评分变化时的回调函数 */
  onChange?: (rating: number) => void
  /** 是否只读模式，默认 false */
  readonly?: boolean
}

export default function RatingStars({
  rating,
  onChange,
  readonly = false,
}: RatingStarsProps) {
  // 悬停预览的评分（0 表示未悬停）
  const [hoverRating, setHoverRating] = useState(0)

  // 实际显示的评分：有悬停时用悬停值，否则用实际值
  const displayRating = hoverRating > 0 ? hoverRating : rating

  const stars = [1, 2, 3, 4, 5]

  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="评分">
      {stars.map((star) => {
        const isActive = star <= displayRating

        if (readonly) {
          return (
            <span
              key={star}
              className={
                isActive
                  ? 'text-2xl text-yellow-400'
                  : 'text-2xl text-gray-300'
              }
              aria-label={`${star} 星`}
            >
              {isActive ? '★' : '☆'}
            </span>
          )
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="cursor-pointer text-2xl transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-200 rounded"
            aria-label={`评 ${star} 星`}
            role="radio"
            aria-checked={star === rating}
          >
            <span className={isActive ? 'text-yellow-400' : 'text-gray-300'}>
              {isActive ? '★' : '☆'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
