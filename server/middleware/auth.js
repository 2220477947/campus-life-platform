import jwt from 'jsonwebtoken'

const JWT_SECRET = 'campus-life-secret-key'

/**
 * 认证中间件
 * - 从请求头 Authorization: Bearer <token> 中提取 Token
 * - 验证 Token 是否有效
 * - 有效时：解析 userId 和 username，挂载到 req.user
 * - 无效时：返回 401 未授权
 */
export default function authMiddleware(req, res, next) {
  // 从请求头中提取 token
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '请先登录',
    })
  }

  const token = authHeader.slice(7) // 去掉 "Bearer " 前缀

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    // 将用户信息挂载到 req 上，供后续路由使用
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
    }
    next()
  } catch (err) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '登录已过期，请重新登录',
    })
  }
}

/**
 * JWT Token 生成工具函数
 * @param {object} payload —— { userId, username }
 * @returns {string} JWT Token
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}
