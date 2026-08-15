import express from 'express'
import { getDb } from '../database/connection.js'

const router = express.Router()

/**
 * 将 sql.js 查询结果转换为对象数组
 * sql.js 的 exec() 返回 [{ columns: [...], values: [[...], ...] }]
 * 需要手动映射成对象，并将 tags 字段从 JSON 字符串还原为数组
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
    // tags 在数据库中存储为 JSON 字符串，还原为数组
    if (obj.tags) {
      try {
        obj.tags = JSON.parse(obj.tags)
      } catch {
        obj.tags = []
      }
    }
    return obj
  })
}

// GET / —— 从数据库查询所有食堂
router.get('/', async (req, res) => {
  try {
    const db = await getDb()
    const result = db.exec('SELECT * FROM canteens')
    const canteens = rowsToObjects(result)

    res.json({
      code: 200,
      data: canteens,
      message: 'success',
    })
  } catch (err) {
    console.error('查询食堂列表失败:', err.message)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

export default router
