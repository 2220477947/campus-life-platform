import express from 'express'
import { getDb } from '../database/connection.js'

/* ============================================================
 *  AI 路由模块
 *  ----------------------------------------------------------
 *  调用 DeepSeek API 实现智能总结等功能
 *  API Key 从环境变量 process.env.DEEPSEEK_API_KEY 获取
 * ============================================================ */

const router = express.Router()

// DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_BASE =
  process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com'

/* ------------------------------------------------------------
 *  辅助函数
 *  ---------------------------------------------------------- */

/**
 * 将 sql.js 的 exec() 结果转换为对象数组
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
 * 调用 DeepSeek Chat API
 * @param {string} systemContent - 系统提示词
 * @param {string} userContent - 用户输入内容
 * @param {number} timeoutMs - 超时时间（毫秒）
 * @returns {Promise<string>} AI 生成的文本
 */
async function callDeepSeekAPI(systemContent, userContent, timeoutMs = 15000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API 返回 HTTP ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('DeepSeek API 返回内容为空')
    }

    return content
  } finally {
    clearTimeout(timeoutId)
  }
}

/* ------------------------------------------------------------
 *  POST /summarize-reviews —— 生成食堂评价的 AI 总结
 *  ----------------------------------------------------------
 *  请求体：{ canteen_id: 1 }
 *  返回：{ code, data: { summary }, message }
 * ============================================================ */

router.post('/summarize-reviews', async (req, res) => {
  try {
    const { canteen_id } = req.body

    // ====== 参数验证 ======
    if (!canteen_id) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '食堂ID不能为空',
      })
    }

    // ====== 查询该食堂最近 20 条评价 ======
    const db = await getDb()

    const result = db.exec(
      `SELECT content, rating FROM reviews WHERE canteen_id = ? ORDER BY created_at DESC LIMIT 20`,
      [canteen_id],
    )
    const reviews = rowsToObjects(result)

    // 没有评价时返回默认提示
    if (reviews.length === 0) {
      return res.json({
        code: 200,
        data: { summary: '该食堂暂无评价' },
        message: 'success',
      })
    }

    // ====== 拼接评价文本 ======
    const reviewsText = reviews
      .map((r) => `评分${r.rating}星：${r.content}`)
      .join('\n')

    // ====== 构造 DeepSeek API 请求 ======
    const systemContent =
      '你是一个校园生活助手。请根据以下食堂评价，用3句话总结：\n' +
      '第1句：整体口碑如何（学生们普遍满意还是有怨言）\n' +
      '第2句：最受欢迎或最常被提到的菜品是什么\n' +
      '第3句：价格水平如何\n\n' +
      '请直接输出3句话总结，不要加标题和编号。每句话不超过40字。'

    const userContent = `以下是食堂评价：\n${reviewsText}`

    // ====== 调用 API 并返回结果 ======
    const summary = await callDeepSeekAPI(systemContent, userContent, 15000)

    res.json({
      code: 200,
      data: { summary: summary.trim() },
      message: 'success',
    })
  } catch (err) {
    console.error('AI 总结失败:', err.message)

    // 超时或 API 调用失败
    res.status(500).json({
      code: 500,
      data: null,
      message: 'AI服务暂时不可用，请稍后重试',
    })
  }
})

/* ------------------------------------------------------------
 *  POST /generate-description —— AI 生成二手商品描述
 *  ----------------------------------------------------------
 *  请求体：{ title, condition, price, usage }
 *  返回：{ code, data: { description }, message }
 * ============================================================ */

router.post('/generate-description', async (req, res) => {
  try {
    const { title, condition, price, usage } = req.body

    // ====== 参数验证：title 和 price 必填 ======
    if (!title || !title.trim()) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '商品名称不能为空',
      })
    }

    if (price === undefined || price === null || price === '') {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '价格不能为空',
      })
    }

    // ====== 构造 DeepSeek API 请求 ======
    const systemContent =
      '你是一个校园二手交易平台的助手。请根据用户提供的商品信息，生成一段吸引人的商品描述。\n\n' +
      '要求：\n' +
      '- 语气活泼、亲切，符合大学生风格\n' +
      '- 突出商品的核心卖点\n' +
      '- 提到原价和现价的对比（如果价格合理的话）\n' +
      '- 适当使用emoji\n' +
      '- 长度控制在50-100字\n' +
      '- 直接输出描述文案，不要加标题'

    const userContent =
      `商品名称：${title}\n` +
      `成色：${condition || '未提供'}\n` +
      `售价：${price}元\n` +
      `使用情况：${usage || '未提供'}`

    // ====== 调用 API（temperature=0.8 增加创意性）=====
    const description = await callDeepSeekAPI(
      systemContent,
      userContent,
      15000,
    )

    res.json({
      code: 200,
      data: { description: description.trim() },
      message: 'success',
    })
  } catch (err) {
    console.error('AI 生成商品描述失败:', err.message)

    res.status(500).json({
      code: 500,
      data: null,
      message: 'AI服务暂时不可用，请稍后重试',
    })
  }
})

export default router
