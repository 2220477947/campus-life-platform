import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../config/api'

/* ============================================================
 *  类型定义
 * ============================================================ */

type TabType = 'login' | 'register'

interface ToastState {
  type: 'success' | 'error'
  text: string
}

interface GlobalMessage {
  type: 'success' | 'error'
  text: string
}

/* ============================================================
 *  主组件
 * ============================================================ */

export default function AuthPage() {
  const navigate = useNavigate()

  // 当前切换的标签
  const [activeTab, setActiveTab] = useState<TabType>('login')

  // ====== 登录表单状态 ======
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginUsernameError, setLoginUsernameError] = useState('')
  const [loginPasswordError, setLoginPasswordError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginMessage, setLoginMessage] = useState<GlobalMessage | null>(null)

  // ====== 注册表单状态 ======
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regErrors, setRegErrors] = useState<{
    username?: string
    password?: string
    confirmPassword?: string
  }>({})
  const [regLoading, setRegLoading] = useState(false)

  // ====== Toast 提示 ======
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  // ====== 切换标签时清除状态 ======
  const switchTab = (tab: TabType) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    // 清除两个表单的错误和提示
    setLoginMessage(null)
    setRegErrors({})
  }

  /* ---------- 登录逻辑（对接真实 API） ---------- */

  const handleLoginFocus = {
    username: () => setLoginUsernameError(''),
    password: () => setLoginPasswordError(''),
  }

  const handleLogin = async () => {
    setLoginMessage(null)

    let hasError = false
    if (loginUsername.trim() === '') {
      setLoginUsernameError('请输入用户名')
      hasError = true
    }
    if (loginPassword.trim() === '') {
      setLoginPasswordError('请输入密码')
      hasError = true
    }
    if (hasError) return

    setLoginLoading(true)

    try {
      const res = await apiPost('/api/auth/login', {
        username: loginUsername.trim(),
        password: loginPassword,
      })

      if (res.code === 200 && res.data?.token) {
        // 存储 token 和用户信息到 localStorage
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        // 通知导航栏更新登录状态
        window.dispatchEvent(new Event('auth-change'))

        showToast('success', '登录成功！')
        setLoginLoading(false)

        // 1秒后跳转到首页
        setTimeout(() => navigate('/'), 1000)
      } else {
        setLoginLoading(false)
        showToast('error', res.message || '登录失败')
      }
    } catch {
      setLoginLoading(false)
      showToast('error', '网络错误，请稍后重试')
    }
  }

  /* ---------- 注册逻辑 ---------- */

  // 用户名格式：3-16位字母和数字
  const USERNAME_REGEX = /^[a-zA-Z0-9]{3,16}$/

  const validateRegField = (field: 'username' | 'password' | 'confirmPassword') => {
    let err: string | undefined
    switch (field) {
      case 'username':
        if (!regUsername.trim()) err = '请输入用户名'
        else if (!USERNAME_REGEX.test(regUsername.trim()))
          err = '用户名只能包含字母和数字，3-16字'
        break
      case 'password':
        if (!regPassword) err = '请输入密码'
        else if (regPassword.length < 6) err = '密码至少6位'
        break
      case 'confirmPassword':
        if (!regConfirmPassword) err = '请确认密码'
        else if (regConfirmPassword !== regPassword) err = '两次输入的密码不一致'
        break
    }
    setRegErrors((prev) => ({ ...prev, [field]: err }))
  }

  const validateRegAll = (): boolean => {
    const newErrors: {
      username?: string
      password?: string
      confirmPassword?: string
    } = {}

    if (!regUsername.trim()) newErrors.username = '请输入用户名'
    else if (!USERNAME_REGEX.test(regUsername.trim()))
      newErrors.username = '用户名只能包含字母和数字，3-16字'

    if (!regPassword) newErrors.password = '请输入密码'
    else if (regPassword.length < 6) newErrors.password = '密码至少6位'

    if (!regConfirmPassword) newErrors.confirmPassword = '请确认密码'
    else if (regConfirmPassword !== regPassword)
      newErrors.confirmPassword = '两次输入的密码不一致'

    setRegErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const updateRegField = (
    field: 'username' | 'password' | 'confirmPassword',
    val: string
  ) => {
    if (field === 'username') setRegUsername(val)
    else if (field === 'password') setRegPassword(val)
    else setRegConfirmPassword(val)
    setRegErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleRegister = async () => {
    if (regLoading) return
    if (!validateRegAll()) return

    setRegLoading(true)

    try {
      const res = await apiPost('/api/auth/register', {
        username: regUsername.trim(),
        password: regPassword,
      })

      if (res.code === 201 || res.code === 200) {
        showToast('success', '注册成功！')
        // 清空注册表单
        setRegUsername('')
        setRegPassword('')
        setRegConfirmPassword('')
        setRegErrors({})
        // 1.5 秒后自动切换到登录表单
        setTimeout(() => {
          setActiveTab('login')
        }, 1500)
      } else {
        showToast('error', res.message || '注册失败')
      }
    } catch {
      showToast('error', '网络错误，请稍后重试')
    } finally {
      setRegLoading(false)
    }
  }

  /* ---------- 样式常量 ---------- */

  const inputBase =
    'mt-1 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors disabled:bg-gray-50'

  const getInputClass = (hasError?: string) =>
    hasError
      ? `${inputBase} border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20`
      : `${inputBase} border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`

  const labelClass = 'block text-sm font-medium text-gray-700'

  /* ---------- 渲染 ---------- */

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
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

      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        {/* ====== 切换标签 ====== */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              activeTab === 'login'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              activeTab === 'register'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            注册
          </button>
        </div>

        {/* ====== 登录表单 ====== */}
        {activeTab === 'login' && (
          <>
            <h2 className="mt-6 text-center text-2xl font-bold text-gray-800">
              登录
            </h2>
            <p className="mt-1 text-center text-sm text-gray-500">
              欢迎回到校园生活服务平台
            </p>

            <form
              className="mt-8 space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (!loginLoading) handleLogin()
              }}
            >
              {/* 用户名 */}
              <div>
                <label htmlFor="login-username" className={labelClass}>
                  学号 / 用户名
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  onFocus={handleLoginFocus.username}
                  disabled={loginLoading}
                  placeholder="请输入学号"
                  className={getInputClass(loginUsernameError)}
                />
                {loginUsernameError && (
                  <p className="mt-1 text-xs text-red-500">{loginUsernameError}</p>
                )}
              </div>

              {/* 密码 */}
              <div>
                <label htmlFor="login-password" className={labelClass}>
                  密码
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onFocus={handleLoginFocus.password}
                  disabled={loginLoading}
                  placeholder="请输入密码"
                  className={getInputClass(loginPasswordError)}
                />
                {loginPasswordError && (
                  <p className="mt-1 text-xs text-red-500">{loginPasswordError}</p>
                )}
              </div>

              {/* 全局提示 */}
              {loginMessage && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm font-medium ${
                    loginMessage.type === 'success'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {loginMessage.text}
                </div>
              )}

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={loginLoading}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all ${
                  loginLoading
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:-translate-y-0.5 hover:shadow-xl'
                }`}
              >
                {loginLoading ? (
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
                    <span>登录中...</span>
                  </>
                ) : (
                  <span>登 录</span>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              还没有账号？
              <button
                type="button"
                onClick={() => switchTab('register')}
                className="ml-1 font-medium text-blue-600 hover:text-blue-700"
              >
                立即注册
              </button>
            </p>

          </>
        )}

        {/* ====== 注册表单 ====== */}
        {activeTab === 'register' && (
          <>
            <h2 className="mt-6 text-center text-2xl font-bold text-gray-800">
              注册
            </h2>
            <p className="mt-1 text-center text-sm text-gray-500">
              创建账号，开启校园生活之旅
            </p>

            <form
              className="mt-8 space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                handleRegister()
              }}
              noValidate
            >
              {/* 用户名 */}
              <div>
                <label htmlFor="reg-username" className={labelClass}>
                  用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-username"
                  type="text"
                  value={regUsername}
                  onChange={(e) => updateRegField('username', e.target.value)}
                  onBlur={() => validateRegField('username')}
                  disabled={regLoading}
                  maxLength={16}
                  placeholder="3-16位字母和数字"
                  className={getInputClass(regErrors.username)}
                />
                {regErrors.username && (
                  <p className="mt-1 text-xs text-red-500">{regErrors.username}</p>
                )}
              </div>

              {/* 密码 */}
              <div>
                <label htmlFor="reg-password" className={labelClass}>
                  密码 <span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => updateRegField('password', e.target.value)}
                  onBlur={() => validateRegField('password')}
                  disabled={regLoading}
                  maxLength={20}
                  placeholder="6-20位密码"
                  className={getInputClass(regErrors.password)}
                />
                {regErrors.password && (
                  <p className="mt-1 text-xs text-red-500">{regErrors.password}</p>
                )}
              </div>

              {/* 确认密码 */}
              <div>
                <label htmlFor="reg-confirm" className={labelClass}>
                  确认密码 <span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => updateRegField('confirmPassword', e.target.value)}
                  onBlur={() => validateRegField('confirmPassword')}
                  disabled={regLoading}
                  maxLength={20}
                  placeholder="请再次输入密码"
                  className={getInputClass(regErrors.confirmPassword)}
                />
                {regErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    {regErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* 注册按钮 */}
              <button
                type="submit"
                disabled={regLoading}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all ${
                  regLoading
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:-translate-y-0.5 hover:shadow-xl'
                }`}
              >
                {regLoading ? (
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
                    <span>注册中...</span>
                  </>
                ) : (
                  <span>注 册</span>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              已有账号？
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="ml-1 font-medium text-blue-600 hover:text-blue-700"
              >
                返回登录
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
