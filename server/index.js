import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import canteensRouter from './routes/canteens.js'
import itemsRouter from './routes/items.js'
import lostFoundRouter from './routes/lost-found.js'
import reviewsRouter from './routes/reviews.js'
import authRouter from './routes/auth.js'
import aiRouter from './routes/ai.js'
import { getDb, saveDb } from './database/connection.js'
import { initDatabase } from './database/init.js'

const app = express()
const PORT = process.env.PORT || 3001

// ====== 中间件 ======

// 允许跨域访问
app.use(cors())

// 解析 JSON 请求体
app.use(express.json())

// 日志中间件：打印每次请求的方法和 URL
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString('zh-CN')}] ${req.method} ${req.url}`)
  next()
})

// ====== 路由挂载 ======

// 食堂相关路由
app.use('/api/canteens', canteensRouter)

// 二手商品相关路由
app.use('/api/items', itemsRouter)

// 失物招领相关路由
app.use('/api/lost-found', lostFoundRouter)

// 评价相关路由
app.use('/api/reviews', reviewsRouter)

// 用户认证路由
app.use('/api/auth', authRouter)

// AI 相关路由
app.use('/api/ai', aiRouter)

// ====== 启动服务器 ======

// 先初始化数据库，再启动服务器
initDatabase()
  .then(() => {
    console.log('✅ 数据库初始化成功')

    // 将数据库操作函数挂载到 app 上，方便路由文件使用
    // 路由中可通过 req.app.get('db') 获取数据库实例
    app.set('db', getDb)
    app.set('saveDb', saveDb)

    app.listen(PORT, () => {
      console.log(`后端服务器运行在 http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ 数据库初始化失败:', err.message)
    console.error(err.stack)
    process.exit(1)
  })
