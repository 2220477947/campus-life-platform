import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

const navLinks = [
  { name: '首页', path: '/' },
  { name: '课表', path: '/schedule' },
  { name: '食堂', path: '/canteen' },
  { name: '二手', path: '/trade' },
  { name: '失物招领', path: '/lost-found' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // 登录状态
  const [username, setUsername] = useState<string | null>(null)

  // 监听 localStorage 变化，保持导航栏状态同步
  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr)
          setUsername(user.username || null)
        } catch {
          setUsername(null)
        }
      } else {
        setUsername(null)
      }
    }

    syncAuth()

    // 监听其他标签页的 storage 变化
    window.addEventListener('storage', syncAuth)
    // 监听自定义事件（同一页面内登录/退出时触发）
    window.addEventListener('auth-change', syncAuth)

    return () => {
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('auth-change', syncAuth)
    }
  }, [])

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUsername(null)
    // 通知其他组件
    window.dispatchEvent(new Event('auth-change'))
    setOpen(false)
    navigate('/')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a5f] h-16">
      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* 左侧：平台名称 */}
        <Link to="/" className="text-lg font-bold text-white">
          校园生活服务平台
        </Link>

        {/* 右侧：导航链接 + 登录/用户按钮 */}
        <div className="flex items-center gap-1">
          {/* 桌面端导航链接 */}
          <ul className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white hover:text-blue-200'
                    }`}
                  >
                    {link.name}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* 已登录状态（桌面端） */}
          {username ? (
            <div className="hidden md:flex items-center gap-2 ml-3">
              <span className="text-sm text-white/80">
                你好，{username}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg border-2 border-white/60 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white hover:text-blue-900"
              >
                退出登录
              </button>
            </div>
          ) : (
            /* 未登录状态（桌面端） */
            <Link
              to="/auth"
              className="hidden md:block ml-3 rounded-lg border-2 border-white px-5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white hover:text-blue-900"
            >
              登录
            </Link>
          )}

          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setOpen(!open)}
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10"
            aria-label="菜单"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {open ? (
                <path d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* 移动端下拉菜单 */}
      {open && (
        <div className="bg-[#1e3a5f] md:hidden border-t border-blue-800">
          <ul className="space-y-1 px-4 py-3">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-4 py-2.5 text-sm font-medium ${
                      isActive ? 'bg-white/20 text-white' : 'text-white hover:text-blue-200'
                    }`}
                  >
                    {link.name}
                  </Link>
                </li>
              )
            })}
            <li>
              {username ? (
                <div className="mt-2 space-y-2">
                  <p className="px-4 text-sm text-white/80">你好，{username}</p>
                  <button
                    onClick={handleLogout}
                    className="block w-full rounded-lg border-2 border-white/60 px-4 py-2.5 text-center text-sm font-medium text-white"
                  >
                    退出登录
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="mt-2 block rounded-lg border-2 border-white px-4 py-2.5 text-center text-sm font-medium text-white"
                >
                  登录
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
