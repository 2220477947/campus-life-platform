import FeatureCard, { type CardTheme } from '../components/FeatureCard'

const features: Array<{
  title: string
  description: string
  icon: string
  link: string
  theme: CardTheme
}> = [
  { title: '课表管理', description: '查看和管理你的课程表', icon: '📅', link: '/schedule', theme: 'blue' },
  { title: '食堂点评', description: '查看食堂菜单和评价', icon: '🍽️', link: '/canteen', theme: 'orange' },
  { title: '二手交易', description: '买卖闲置物品', icon: '🔄', link: '/trade', theme: 'green' },
  { title: '失物招领', description: '发布和查找失物', icon: '🔍', link: '/lost-found', theme: 'purple' },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-800">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            校园生活服务平台
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-blue-200">
            让校园生活更便捷
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-base text-blue-200/70">
            课表查询、食堂点评、二手交易、失物招领——一站式解决你的校园生活需求
          </p>
        </div>
      </section>

      {/* Cards */}
      <section className="mx-auto max-w-6xl px-4 -mt-10 pb-16 sm:px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {features.map((card, index) => (
            <FeatureCard
              key={card.link}
              title={card.title}
              description={card.description}
              icon={card.icon}
              link={card.link}
              theme={card.theme}
              delay={index * 150}
            />
          ))}
        </div>
      </section>
    </>
  )
}
