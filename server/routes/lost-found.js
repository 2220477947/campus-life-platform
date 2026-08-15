import express from 'express'
import { getDb, saveDb } from '../database/connection.js'
import auth from '../middleware/auth.js'

/* ============================================================
 *  失物招领模块路由（CRUD）
 *  ----------------------------------------------------------
 *  数据库：sql.js（内存中运行，写操作后需调用 saveDb 持久化）
 *  认证：POST/PUT/DELETE 需要 auth 中间件，GET 公开
 * ============================================================ */

const router = express.Router()

// 允许的类型
const VALID_TYPES = ['丢失', '捡到']

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

function findLostFoundById(db, id) {
  const result = db.exec(`SELECT * FROM lost_found WHERE id = ${id}`)
  return rowToObject(result)
}

/* ------------------------------------------------------------
 *  1. GET / —— 获取失物招领列表（支持类型筛选、搜索、分页）
 *  ---------------------------------------------------------- */

router.get('/', async (req, res) => {
  try {
    const db = await getDb()

    const { type, keyword } = req.query
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.max(1, parseInt(req.query.limit) || 10)
    const offset = (page - 1) * limit

    // 构建动态 WHERE 子句
    const conditions = []
    const params = []

    // 类型筛选
    if (type) {
      conditions.push('type = ?')
      params.push(type)
    }

    // 关键词搜索（模糊匹配标题和描述）
    if (keyword) {
      conditions.push('(title LIKE ? OR description LIKE ?)')
      const kw = `%${keyword}%`
      params.push(kw, kw)
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : ''

    // 查询总数
    const countResult = db.exec(
      `SELECT COUNT(*) as total FROM lost_found ${whereClause}`,
      params,
    )
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0

    // 查询分页数据（按 created_at 倒序）
    const queryParams = [...params, limit, offset]
    const result = db.exec(
      `SELECT * FROM lost_found ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      queryParams,
    )
    const items = rowsToObjects(result)

    res.json({
      code: 200,
      data: {
        items,
        total,
        page,
        limit,
      },
      message: 'success',
    })
  } catch (err) {
    console.error('查询失物招领列表失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  2. GET /:id —— 获取单条详情
 *  ---------------------------------------------------------- */

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)

    const item = findLostFoundById(db, id)

    if (!item) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '信息不存在',
      })
    }

    res.json({
      code: 200,
      data: item,
      message: 'success',
    })
  } catch (err) {
    console.error('查询失物招领详情失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  3. POST / —— 发布失物招领信息
 *  ---------------------------------------------------------- */

router.post('/', auth, async (req, res) => {
  try {
    const { type, title, location, date, description } = req.body
    const CURRENT_USER_ID = req.user.userId

    // ====== 参数验证 ======

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: `类型必填，必须是"丢失"或"捡到"`,
      })
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '标题不能为空',
      })
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '描述不能为空',
      })
    }

    const db = await getDb()

    // 处理可选字段
    const loc = location ? location.trim() : ''
    const dateStr = date || new Date().toISOString().split('T')[0]
    const desc = description.trim()

    // ====== 插入记录 ======
    db.run(
      `INSERT INTO lost_found (user_id, type, title, location, date, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [CURRENT_USER_ID, type, title.trim(), loc, dateStr, desc],
    )

    // 查询刚插入的记录
    const lastIdResult = db.exec('SELECT last_insert_rowid() as id')
    const newId = lastIdResult[0].values[0][0]
    const newItem = findLostFoundById(db, newId)

    // 持久化
    saveDb()

    res.status(201).json({
      code: 201,
      data: newItem,
      message: '发布成功',
    })
  } catch (err) {
    console.error('发布失物招领失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  4. PUT /:id —— 修改失物招领信息
 *  ---------------------------------------------------------- */

router.put('/:id', auth, async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)
    const { type, title, location, date, description } = req.body

    // 验证记录是否存在
    const item = findLostFoundById(db, id)
    if (!item) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '信息不存在',
      })
    }

    // 验证权限
    if (item.user_id !== req.user.userId) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权修改此信息',
      })
    }

    // 验证传入的字段
    if (type !== undefined && !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '类型必须是"丢失"或"捡到"',
      })
    }

    if (title !== undefined && title.trim().length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '标题不能为空',
      })
    }

    if (description !== undefined && description.trim().length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '描述不能为空',
      })
    }

    // 构建动态 UPDATE 语句
    const updates = []
    const params = []

    if (type !== undefined) {
      updates.push('type = ?')
      params.push(type)
    }
    if (title !== undefined) {
      updates.push('title = ?')
      params.push(title.trim())
    }
    if (location !== undefined) {
      updates.push('location = ?')
      params.push(location.trim())
    }
    if (date !== undefined) {
      updates.push('date = ?')
      params.push(date)
    }
    if (description !== undefined) {
      updates.push('description = ?')
      params.push(description.trim())
    }

    if (updates.length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '没有需要更新的字段',
      })
    }

    params.push(id)
    db.run(
      `UPDATE lost_found SET ${updates.join(', ')} WHERE id = ?`,
      params,
    )

    // 查询更新后的记录（在 saveDb 之前）
    const updatedItem = findLostFoundById(db, id)

    // 持久化
    saveDb()

    res.json({
      code: 200,
      data: updatedItem,
      message: '修改成功',
    })
  } catch (err) {
    console.error('修改失物招领失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  5. DELETE /:id —— 删除失物招领信息（真删除）
 *  ---------------------------------------------------------- */

router.delete('/:id', auth, async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)

    // 验证记录是否存在
    const item = findLostFoundById(db, id)
    if (!item) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '信息不存在',
      })
    }

    // 验证权限
    if (item.user_id !== req.user.userId) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权删除此信息',
      })
    }

    // 真删除：从数据库中删除记录
    db.run(`DELETE FROM lost_found WHERE id = ${id}`)

    // 持久化
    saveDb()

    res.json({
      code: 200,
      data: null,
      message: '删除成功',
    })
  } catch (err) {
    console.error('删除失物招领失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

export default router
