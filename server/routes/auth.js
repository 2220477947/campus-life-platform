import express from 'express'
import bcrypt from 'bcryptjs'
import { getDb } from '../database/connection.js'
import { generateToken } from '../middleware/auth.js'

/* ============================================================
 *  用户认证路由（注册 / 登录 / 用户信息）
 * ============================================================ */

const router = express.Router()

/* ------------------------------------------------------------
 *  辅助函数
 *  ---------------------------------------------------------- */

function rowsToObjects(result) {
  if (!result || result.length === 0) return []
  const { columns, values } = result[0]
  return values.map((row) => {
    const obj = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  })
}

function rowToObject(result) {
  const rows = rowsToObjects(result)
  return rows.length > 0 ? rows[0] : null
}

/* ------------------------------------------------------------
 *  1. POST /api/auth/register —— 用户注册
 *  ---------------------------------------------------------- */

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body

    // ====== 参数验证 ======

    if (!username || !username.trim()) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '用户名不能为空',
      })
    }

    const trimmedUsername = username.trim()

    if (trimmedUsername.length < 3 || trimmedUsername.length > 16) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '用户名长度必须为3-16位',
      })
    }

    if (!/^[a-zA-Z0-9]+$/.test(trimmedUsername)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '用户名只能包含字母和数字',
      })
    }

    if (!password) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '密码不能为空',
      })
    }

    if (password.length < 6 || password.length > 20) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '密码长度必须为6-20位',
      })
    }

    const db = await getDb()

    // 检查用户名是否已存在
    const existingResult = db.exec(
      'SELECT id FROM users WHERE username = ?',
      [trimmedUsername]
    )
    if (existingResult.length > 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '用户名已存在',
      })
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10)

    // 插入用户
    db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [trimmedUsername, hashedPassword]
    )

    // 获取刚插入的用户 ID
    const lastIdResult = db.exec('SELECT last_insert_rowid() as id')
    const newId = lastIdResult[0].values[0][0]

    const newUser = rowToObject(db.exec('SELECT id, username FROM users WHERE id = ?', [newId]))

    res.status(201).json({
      code: 201,
      data: newUser,
      message: '注册成功',
    })
  } catch (err) {
    console.error('注册失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '服务器错误',
    })
  }
})

/* ------------------------------------------------------------
 *  2. POST /api/auth/login —— 用户登录
 *  ---------------------------------------------------------- */

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    // ====== 参数验证 ======

    if (!username || !username.trim()) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '用户名不能为空',
      })
    }

    if (!password) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '密码不能为空',
      })
    }

    const db = await getDb()

    // 查询用户
    const result = db.exec(
      'SELECT id, username, password FROM users WHERE username = ?',
      [username.trim()]
    )
    const user = rowToObject(result)

    if (!user) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '用户名或密码错误',
      })
    }

    // 密码验证
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '用户名或密码错误',
      })
    }

    // 生成 JWT Token
    const token = generateToken({
      userId: user.id,
      username: user.username,
    })

    res.status(200).json({
      code: 200,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
        },
      },
      message: '登录成功',
    })
  } catch (err) {
    console.error('登录失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '服务器错误',
    })
  }
})

/* ------------------------------------------------------------
 *  3. GET /api/auth/me —— 获取当前用户信息（需要认证）
 *  ---------------------------------------------------------- */

// 这里用不到 authMiddleware，因为 auth.js 路由本身没有挂载中间件
// 但用户要求 GET /api/auth/me 需要认证，我们通过 req.app 方式或者直接检查 token
// 其实应该在 index.js 中挂载时搭配中间件，或者在这里手动验证
// 按照用户要求：GET /api/auth/me 需要认证

// 先手动导入验证逻辑
import jwt from 'jsonwebtoken'
const JWT_SECRET = 'campus-life-secret-key'

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '请先登录',
      })
    }

    const token = authHeader.slice(7)

    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '登录已过期，请重新登录',
      })
    }

    const db = await getDb()

    const result = db.exec(
      'SELECT id, username, nickname, avatar, created_at FROM users WHERE id = ?',
      [decoded.userId]
    )
    const user = rowToObject(result)

    if (!user) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '用户不存在',
      })
    }

    res.status(200).json({
      code: 200,
      data: user,
      message: 'success',
    })
  } catch (err) {
    console.error('获取用户信息失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '服务器错误',
    })
  }
})

export default router
