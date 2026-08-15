import express from 'express'
import { getDb, saveDb } from '../database/connection.js'
import auth from '../middleware/auth.js'

/* ============================================================
 *  二手商品模块路由（CRUD）
 *  ----------------------------------------------------------
 *  数据库：sql.js（内存中运行，写操作后需调用 saveDb 持久化）
 *  认证：POST/PUT/DELETE 需要 auth 中间件，GET 公开
 * ============================================================ */

const router = express.Router()

// 允许的商品分类
const VALID_CATEGORIES = ['教材', '电子', '生活', '其他']

/* ------------------------------------------------------------
 *  辅助函数
 *  ---------------------------------------------------------- */

/**
 * 将 sql.js 的 exec() 结果转换为对象数组
 * 并将 images 字段从 JSON 字符串还原为数组
 */
function rowsToObjects(result) {
  if (!result || result.length === 0) return []
  const { columns, values } = result[0]
  return values.map((row) => {
    const obj = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    // images 在数据库中存储为 JSON 字符串，还原为数组
    if (obj.images) {
      try {
        obj.images = JSON.parse(obj.images)
      } catch {
        obj.images = []
      }
    }
    return obj
  })
}

function rowToObject(result) {
  const rows = rowsToObjects(result)
  return rows.length > 0 ? rows[0] : null
}

/**
 * 根据ID查询单条商品
 */
function findItemById(db, id) {
  const result = db.exec(`SELECT * FROM items WHERE id = ${id}`)
  return rowToObject(result)
}

/* ------------------------------------------------------------
 *  1. GET / —— 获取商品列表（支持搜索、筛选、分页）
 *  ---------------------------------------------------------- */

router.get('/', async (req, res) => {
  try {
    const db = await getDb()

    // 解析查询参数
    const { keyword, category, status } = req.query
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.max(1, parseInt(req.query.limit) || 10)
    const offset = (page - 1) * limit

    // 构建动态 WHERE 子句
    const conditions = []
    const params = []

    // 关键词搜索（模糊匹配标题和描述）
    if (keyword) {
      conditions.push('(title LIKE ? OR description LIKE ?)')
      const kw = `%${keyword}%`
      params.push(kw, kw)
    }

    // 分类筛选
    if (category) {
      conditions.push('category = ?')
      params.push(category)
    }

    // 状态筛选（默认"在售"）
    const statusFilter = status || '在售'
    if (statusFilter !== 'all') {
      conditions.push('status = ?')
      params.push(statusFilter)
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : ''

    // 查询总数
    const countResult = db.exec(
      `SELECT COUNT(*) as total FROM items ${whereClause}`,
      params,
    )
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0

    // 查询分页数据（按 created_at 倒序）
    const queryParams = [...params, limit, offset]
    const result = db.exec(
      `SELECT * FROM items ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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
    console.error('查询商品列表失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  2. GET /:id —— 获取商品详情（关联 users 表查发布者用户名）
 *  ---------------------------------------------------------- */

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)

    // 关联 users 表查询，获取发布者的用户名和昵称
    const result = db.exec(
      `SELECT i.*, u.username, u.nickname
       FROM items i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ${id}`,
    )
    const item = rowToObject(result)

    if (!item) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '商品不存在',
      })
    }

    // 整理发布者信息
    const publisher = item.nickname || item.username || item.seller || '匿名用户'
    delete item.username
    delete item.nickname
    item.publisher = publisher

    res.json({
      code: 200,
      data: item,
      message: 'success',
    })
  } catch (err) {
    console.error('查询商品详情失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  3. POST / —— 发布新商品
 *  ---------------------------------------------------------- */

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, price, category, images, contact } = req.body
    const CURRENT_USER_ID = req.user.userId

    // ====== 参数验证 ======

    if (!title || title.trim().length < 2 || title.trim().length > 30) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '标题必填，且长度为2-30字',
      })
    }

    const priceNum = parseFloat(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '价格必填，且必须大于0',
      })
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: `分类必填，必须是以下之一：${VALID_CATEGORIES.join('/')}`,
      })
    }

    const db = await getDb()

    // 查询当前用户信息作为 seller
    const userResult = db.exec(`SELECT username, nickname FROM users WHERE id = ${CURRENT_USER_ID}`)
    let seller = '匿名用户'
    if (userResult.length > 0) {
      const userRow = rowsToObjects(userResult)[0]
      seller = userRow.nickname || userRow.username || '匿名用户'
    }

    // 处理 images：数组转 JSON 字符串
    const imagesJson = images ? JSON.stringify(images) : '[]'
    const desc = description ? description.trim() : ''
    const contactStr = contact ? contact.trim() : ''

    // ====== 插入商品 ======
    db.run(
      `INSERT INTO items (user_id, title, description, price, category, images, contact, seller, image, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '在售')`,
      [CURRENT_USER_ID, title.trim(), desc, priceNum, category, imagesJson, contactStr, seller, ''],
    )

    // 查询刚插入的商品
    const lastIdResult = db.exec('SELECT last_insert_rowid() as id')
    const newId = lastIdResult[0].values[0][0]
    const newItem = findItemById(db, newId)

    // 持久化
    saveDb()

    res.status(201).json({
      code: 201,
      data: newItem,
      message: '发布成功',
    })
  } catch (err) {
    console.error('发布商品失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  4. PUT /:id —— 修改商品
 *  ---------------------------------------------------------- */

router.put('/:id', auth, async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)
    const { title, description, price, category, status } = req.body

    // 验证商品是否存在
    const item = findItemById(db, id)
    if (!item) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '商品不存在',
      })
    }

    // 验证权限
    if (item.user_id !== req.user.userId) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权修改此商品',
      })
    }

    // 验证传入的字段
    if (title !== undefined) {
      if (title.trim().length < 2 || title.trim().length > 30) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '标题长度必须为2-30字',
        })
      }
    }

    if (price !== undefined) {
      const priceNum = parseFloat(price)
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '价格必须大于0',
        })
      }
    }

    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: `分类必须是以下之一：${VALID_CATEGORIES.join('/')}`,
      })
    }

    if (status !== undefined && !['在售', '已售出'].includes(status)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '状态必须是"在售"或"已售出"',
      })
    }

    // 构建动态 UPDATE 语句
    const updates = []
    const params = []

    if (title !== undefined) {
      updates.push('title = ?')
      params.push(title.trim())
    }
    if (description !== undefined) {
      updates.push('description = ?')
      params.push(description.trim())
    }
    if (price !== undefined) {
      updates.push('price = ?')
      params.push(parseFloat(price))
    }
    if (category !== undefined) {
      updates.push('category = ?')
      params.push(category)
    }
    if (status !== undefined) {
      updates.push('status = ?')
      params.push(status)
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
      `UPDATE items SET ${updates.join(', ')} WHERE id = ?`,
      params,
    )

    // 查询更新后的商品（在 saveDb 之前）
    const updatedItem = findItemById(db, id)

    // 持久化
    saveDb()

    res.json({
      code: 200,
      data: updatedItem,
      message: '修改成功',
    })
  } catch (err) {
    console.error('修改商品失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  5. DELETE /:id —— 下架商品（软删除：status 改为"已售出"）
 *  ---------------------------------------------------------- */

router.delete('/:id', auth, async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)

    // 验证商品是否存在
    const item = findItemById(db, id)
    if (!item) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '商品不存在',
      })
    }

    // 验证权限
    if (item.user_id !== req.user.userId) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权下架此商品',
      })
    }

    // 软删除：将 status 改为"已售出"
    db.run(`UPDATE items SET status = '已售出' WHERE id = ${id}`)

    // 持久化
    saveDb()

    res.json({
      code: 200,
      data: null,
      message: '下架成功',
    })
  } catch (err) {
    console.error('下架商品失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

export default router
