import { Link } from 'react-router-dom'

// 颜色主题映射
export type CardTheme = 'blue' | 'orange' | 'green' | 'purple'

const themeMap: Record<
  CardTheme,
  { iconBg: string; iconText: string; accent: string }
> = {
  blue: {
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    accent: 'from-blue-500 to-blue-600',
  },
  orange: {
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
    accent: 'from-orange-500 to-orange-600',
  },
  green: {
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
    accent: 'from-green-500 to-green-600',
  },
  purple: {
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    accent: 'from-purple-500 to-purple-600',
  },
}

interface FeatureCardProps {
  title: string
  description: string
  icon: string
  link: string
  theme?: CardTheme
  /** 延迟动画时间（ms），用于实现依次淡入效果 */
  delay?: number
}

export default function FeatureCard({
  title,
  description,
  icon,
  link,
  theme = 'blue',
  delay = 0,
}: FeatureCardProps) {
  const t = themeMap[theme]

  return (
    <Link
      to={link}
      className="feature-card-fade block rounded-xl bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* 图标区域 —— 带主题背景色 */}
      <div
        className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl ${t.iconBg} ${t.iconText} text-3xl leading-none`}
      >
        {icon}
      </div>

      <h3 className="mt-4 text-lg font-bold text-gray-800">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>

      {/* 主题色底部装饰条 */}
      <div
        className={`mt-4 h-1 w-12 rounded-full bg-gradient-to-r ${t.accent}`}
      />
    </Link>
  )
}
