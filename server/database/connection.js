import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

/* ============================================================
 *  数据库连接管理（基于 sql.js）
 *  ----------------------------------------------------------
 *  sql.js 是 SQLite 的 WebAssembly 端口，数据库在内存中运行，
 *  通过 export() 导出二进制数据写入 .db 文件实现持久化。
 *  本模块提供单例连接，供路由文件统一调用。
 * ============================================================ */

// 当前模块目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件路径：server/database/campus.db
const DB_FILE = path.join(__dirname, 'campus.db')

// SQL.js 的 wasm 文件路径（从 node_modules 中读取）
const WASM_FILE = path.join(
  process.cwd(),
  'node_modules',
  'sql.js',
  'dist',
  'sql-wasm.wasm',
)

// 单例数据库实例
let dbInstance = null

/**
 * 获取数据库连接（单例模式）
 * 如果数据库文件存在，则从文件加载；否则创建一个空数据库。
 * @returns {Promise<import('sql.js').Database>} 数据库实例
 */
export async function getDb() {
  // 已有实例则直接复用
  if (dbInstance) return dbInstance

  // 初始化 SQL.js
  const SQL = await initSqlJs({
    // 指定 wasm 文件位置
    locateFile: () => WASM_FILE,
  })

  // 如果已有数据库文件，从文件加载；否则新建空数据库
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE)
    dbInstance = new SQL.Database(new Uint8Array(buffer))
    console.log('📦 已从文件加载数据库:', DB_FILE)
  } else {
    dbInstance = new SQL.Database()
    console.log('🆕 创建新的空数据库（稍后由 init.js 初始化表结构）')
  }

  return dbInstance
}

/**
 * 将当前内存中的数据库持久化到磁盘文件
 * 在执行写操作（INSERT/UPDATE/DELETE）后调用
 */
export function saveDb() {
  if (!dbInstance) {
    console.warn('⚠️ saveDb 被调用，但数据库尚未初始化')
    return
  }
  const data = dbInstance.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_FILE, buffer)
}

/**
 * 关闭数据库连接并释放资源
 * 通常在应用退出时调用
 */
export function closeDb() {
  if (dbInstance) {
    saveDb()
    dbInstance.close()
    dbInstance = null
    console.log('🔒 数据库已关闭并保存')
  }
}

export { DB_FILE }
