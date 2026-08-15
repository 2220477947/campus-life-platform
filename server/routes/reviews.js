import express from 'express'
import { getDb, saveDb } from '../database/connection.js'
import auth from '../middleware/auth.js'

/* ============================================================
 *  评价模块路由（CRUD）
 *  ----------------------------------------------------------
 *  数据库：sql.js（内存中运行，写操作后需调用 saveDb 持久化）
 *  认证：POST/PUT/DELETE 需要 auth 中间件，GET 公开
 * ============================================================ */

const router = express.Router()

/* ------------------------------------------------------------
 *  辅助函数
 *  ---------------------------------------------------------- */

/**
 * 将 sql.js 的 exec() 结果转换为对象数组
 * @param {import('sql.js').QueryExecResult[]} result
 * @returns {object[]}
 */
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

/**
 * 将 sql.js 的 exec() 结果转换为单个对象（取第一行）
 * @param {import('sql.js').QueryExecResult[]} result
 * @returns {object|null}
 */
function rowToObject(result) {
  const rows = rowsToObjects(result)
  return rows.length > 0 ? rows[0] : null
}

/**
 * 根据ID查询单条评价
 * @param {import('sql.js').Database} db
 * @param {number} id
 * @returns {object|null}
 */
function findReviewById(db, id) {
  const result = db.exec(`SELECT * FROM reviews WHERE id = ${id}`)
  return rowToObject(result)
}

/* ------------------------------------------------------------
 *  1. GET / —— 获取评价列表（支持分页和按食堂筛选）
 *  ---------------------------------------------------------- */

router.get('/', async (req, res) => {
  try {
    const db = await getDb()

    // 解析查询参数
    const canteenId = req.query.canteen_id
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.max(1, parseInt(req.query.limit) || 10)
    const offset = (page - 1) * limit

    // 构建 SQL（用参数绑定防止注入）
    let whereClause = ''
    let countParams = []
    let queryParams = []

    if (canteenId) {
      whereClause = 'WHERE canteen_id = ?'
      countParams = [canteenId]
      queryParams = [canteenId, limit, offset]
    } else {
      queryParams = [limit, offset]
    }

    // 查询总数
    const countResult = db.exec(
      `SELECT COUNT(*) as total FROM reviews ${whereClause}`,
      countParams,
    )
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0

    // 查询分页数据（按 created_at 倒序）
    const result = db.exec(
      `SELECT * FROM reviews ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      queryParams,
    )
    const reviews = rowsToObjects(result)

    res.json({
      code: 200,
      data: {
        reviews,
        total,
        page,
        limit,
      },
      message: 'success',
    })
  } catch (err) {
    console.error('查询评价列表失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  2. GET /:id —— 获取单条评价详情
 *  ---------------------------------------------------------- */

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)

    const review = findReviewById(db, id)

    if (!review) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '评价不存在',
      })
    }

    res.json({
      code: 200,
      data: review,
      message: 'success',
    })
  } catch (err) {
    console.error('查询评价详情失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  3. POST / —— 提交新评价
 *  ---------------------------------------------------------- */

router.post('/', auth, async (req, res) => {
  try {
    const { canteen_id, content, rating } = req.body
    const CURRENT_USER_ID = req.user.userId

    // ====== 参数验证 ======

    if (!canteen_id) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '食堂ID不能为空',
      })
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '评价内容不能为空',
      })
    }

    if (content.length > 500) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '评价内容不能超过500字',
      })
    }

    const ratingNum = parseInt(rating)
    if (!rating || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '评分必须是1-5的整数',
      })
    }

    const db = await getDb()

    // 验证食堂是否存在
    const canteenResult = db.exec(
      `SELECT id FROM canteens WHERE id = ${canteen_id}`,
    )
    if (canteenResult.length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '食堂不存在',
      })
    }

    // ====== 插入评价 ======

    // 暂时用 user_id=1，username 从 users 表查（查不到就用默认名）
    const userResult = db.exec(`SELECT username, nickname FROM users WHERE id = ${CURRENT_USER_ID}`)
    let username = '匿名用户'
    if (userResult.length > 0) {
      const userRow = rowsToObjects(userResult)[0]
      username = userRow.nickname || userRow.username || '匿名用户'
    }

    db.run(
      'INSERT INTO reviews (canteen_id, user_id, username, rating, content) VALUES (?, ?, ?, ?, ?)',
      [canteen_id, CURRENT_USER_ID, username, ratingNum, content.trim()],
    )

    // 查询刚插入的评价（获取自增ID和默认字段）
    // 注意：必须在 saveDb() 之前查询，因为 export() 可能影响内部状态
    const lastIdResult = db.exec('SELECT last_insert_rowid() as id')
    const newId = lastIdResult[0].values[0][0]
    const newReview = findReviewById(db, newId)

    // 持久化到磁盘（查询完成后再保存）
    saveDb()

    res.status(201).json({
      code: 201,
      data: newReview,
      message: '评价成功',
    })
  } catch (err) {
    console.error('创建评价失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  4. PUT /:id —— 修改评价
 *  ---------------------------------------------------------- */

router.put('/:id', auth, async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)
    const { content, rating } = req.body

    // 验证评价是否存在
    const review = findReviewById(db, id)
    if (!review) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '评价不存在',
      })
    }

    // 验证权限：只有评价作者才能修改
    if (review.user_id !== req.user.userId) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权修改此评价',
      })
    }

    // 验证传入的字段
    if (content !== undefined) {
      if (content.trim().length === 0) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '评价内容不能为空',
        })
      }
      if (content.length > 500) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '评价内容不能超过500字',
        })
      }
    }

    if (rating !== undefined) {
      const ratingNum = parseInt(rating)
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '评分必须是1-5的整数',
        })
      }
    }

    // 构建动态 UPDATE 语句（只更新传了的字段）
    const updates = []
    const params = []

    if (content !== undefined) {
      updates.push('content = ?')
      params.push(content.trim())
    }
    if (rating !== undefined) {
      updates.push('rating = ?')
      params.push(parseInt(rating))
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
      `UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`,
      params,
    )

    // 查询更新后的评价（在 saveDb 之前查询）
    const updatedReview = findReviewById(db, id)

    // 持久化
    saveDb()

    res.json({
      code: 200,
      data: updatedReview,
      message: '修改成功',
    })
  } catch (err) {
    console.error('修改评价失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

/* ------------------------------------------------------------
 *  5. DELETE /:id —— 删除评价
 *  ---------------------------------------------------------- */

router.delete('/:id', auth, async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)

    // 验证评价是否存在
    const review = findReviewById(db, id)
    if (!review) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '评价不存在',
      })
    }

    // 验证权限：只有评价作者才能删除
    if (review.user_id !== req.user.userId) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权删除此评价',
      })
    }

    // 删除评价
    db.run(`DELETE FROM reviews WHERE id = ${id}`)

    // 持久化
    saveDb()

    res.json({
      code: 200,
      data: null,
      message: '删除成功',
    })
  } catch (err) {
    console.error('删除评价失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

export default router
