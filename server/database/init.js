import { getDb, saveDb, DB_FILE } from './connection.js'
import fs from 'fs'

/* ============================================================
 *  数据库初始化脚本
 *  ----------------------------------------------------------
 *  功能：
 *    1. 创建所有表结构（如不存在）
 *    2. 导入种子数据（仅当表为空时）
 *    3. 将数据库持久化到 campus.db 文件
 *
 *  使用方式：
 *    直接运行：  node server/database/init.js
 *    或在代码中引入 initDatabase() 函数
 * ============================================================ */

// 建表 SQL —— 使用 IF NOT EXISTS，可安全重复执行
const CREATE_TABLES_SQL = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    NOT NULL UNIQUE,
  password   TEXT    NOT NULL,
  nickname   TEXT,
  avatar     TEXT    DEFAULT '',
  created_at TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- 课表表
CREATE TABLE IF NOT EXISTS courses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  name       TEXT    NOT NULL,
  teacher    TEXT,
  location   TEXT,
  weekday    INTEGER NOT NULL,   -- 1=周一 ... 7=周日
  start_time TEXT    NOT NULL,   -- 如 "08:00"
  end_time   TEXT    NOT NULL,   -- 如 "09:40"
  weeks      TEXT,               -- 如 "1-16"
  created_at TEXT    DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 食堂表
CREATE TABLE IF NOT EXISTS canteens (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT    NOT NULL,
  location TEXT    NOT NULL,
  rating   REAL    DEFAULT 0,
  tags     TEXT    DEFAULT '[]',   -- JSON 数组字符串
  image    TEXT    DEFAULT ''
);

-- 评价表
CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  canteen_id INTEGER NOT NULL,
  user_id    INTEGER DEFAULT 1,       -- 提交评价的用户ID（暂时默认1）
  username   TEXT    NOT NULL,
  rating     INTEGER NOT NULL,     -- 1-5
  content    TEXT    NOT NULL,
  time       TEXT    DEFAULT (datetime('now', 'localtime')),
  created_at TEXT    DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (canteen_id) REFERENCES canteens(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 二手物品表
CREATE TABLE IF NOT EXISTS items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER DEFAULT 1,       -- 发布者用户ID（暂时默认1）
  title       TEXT    NOT NULL,
  description TEXT    DEFAULT '',       -- 商品描述
  price       REAL    NOT NULL,
  category    TEXT    NOT NULL,         -- 教材/电子/生活/其他
  images      TEXT    DEFAULT '[]',     -- 图片URL数组（JSON字符串）
  contact     TEXT    DEFAULT '',       -- 联系方式
  seller      TEXT    NOT NULL,         -- 发布者用户名（冗余字段，方便查询）
  image       TEXT    DEFAULT '',       -- 旧字段：单张图片（兼容前端）
  status      TEXT    DEFAULT '在售',    -- 在售 / 已售出
  created_at  TEXT    DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 失物招领表
CREATE TABLE IF NOT EXISTS lost_found (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER DEFAULT 1,       -- 发布者用户ID（暂时默认1）
  type        TEXT    NOT NULL,         -- 丢失 / 捡到
  title       TEXT    NOT NULL,
  location    TEXT    DEFAULT '',
  date        TEXT    NOT NULL,         -- 丢失/捡到的日期
  description TEXT    DEFAULT '',
  contact     TEXT    DEFAULT '',
  created_at  TEXT    DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`

// 种子数据 —— 与 public/api/*.json 保持一致
const SEED_DATA = {
  canteens: [
    { name: '第一食堂', location: '东校区', rating: 4.2, tags: '["自选","快餐"]', image: '' },
    { name: '第二食堂', location: '西校区', rating: 4.0, tags: '["面食","小炒"]', image: '' },
    { name: '第三食堂', location: '北校区', rating: 3.8, tags: '["麻辣烫","盖饭"]', image: '' },
    { name: '教工食堂', location: '中心区', rating: 4.5, tags: '["自助","点菜"]', image: '' },
  ],
  reviews: [
    { canteen_id: 1, user_id: 1, username: '同学甲', rating: 5, content: '红烧肉很好吃，分量足！' },
    { canteen_id: 1, user_id: 2, username: '同学乙', rating: 4, content: '菜品丰富，但高峰期排队久。' },
    { canteen_id: 2, user_id: 3, username: '同学丙', rating: 4, content: '兰州拉面很正宗。' },
    { canteen_id: 4, user_id: 4, username: '同学丁', rating: 5, content: '自助餐性价比超高。' },
  ],
  items: [
    { user_id: 1, title: '高等数学（第七版）', description: '九成新，无笔记，包邮', price: 25, category: '教材', images: '[]', contact: '微信：xxx', seller: '学长A', image: '' },
    { user_id: 2, title: '机械键盘 Cherry MX', description: '红轴，使用半年，手感极佳', price: 150, category: '电子', images: '[]', contact: 'QQ：xxx', seller: '同学B', image: '' },
    { user_id: 3, title: '台灯 LED 护眼', description: '可调亮度，几乎全新', price: 45, category: '生活', images: '[]', contact: '微信：xxx', seller: '学姐C', image: '' },
    { user_id: 1, title: 'Python编程从入门到实践', description: '配套源码，轻微使用痕迹', price: 30, category: '教材', images: '[]', contact: '微信：xxx', seller: '学长D', image: '' },
    { user_id: 2, title: '蓝牙耳机 AirPods', description: '二代，有充电盒，功能正常', price: 200, category: '电子', images: '[]', contact: 'QQ：xxx', seller: '同学E', image: '' },
    { user_id: 3, title: '床上小桌板', description: '可折叠，带杯架，宿舍必备', price: 35, category: '生活', images: '[]', contact: '微信：xxx', seller: '学姐F', image: '' },
  ],
  lost_found: [
    { user_id: 1, type: '丢失', title: '黑色钱包', location: '图书馆', date: '2025-01-10', description: '内有学生证和现金' },
    { user_id: 2, type: '捡到', title: 'U盘 金士顿32G', location: '教学楼A301', date: '2025-01-11', description: '蓝色外壳' },
    { user_id: 1, type: '丢失', title: '校园卡', location: '食堂二楼', date: '2025-01-12', description: '学号2024开头' },
    { user_id: 3, type: '捡到', title: '雨伞 黑色折叠', location: '图书馆门口', date: '2025-01-12', description: '' },
  ],
}

/**
 * 判断表中是否有数据
 * @param {import('sql.js').Database} db
 * @param {string} tableName
 * @returns {boolean}
 */
function isTableEmpty(db, tableName) {
  const result = db.exec(`SELECT COUNT(*) as count FROM ${tableName}`)
  if (result.length === 0) return true
  return result[0].values[0][0] === 0
}

/**
 * 初始化数据库
 * 1. 建表  2. 插入种子数据  3. 持久化
 * @param {boolean} force 是否强制重置（删除现有 db 文件后重建）
 */
export async function initDatabase(force = false) {
  // 强制模式：先删除旧文件
  if (force && fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE)
    console.log('🗑️  已删除旧数据库文件，将重新创建')
  }

  const db = await getDb()

  // 1. 执行建表语句（sql.js 支持用分号分隔的多条语句）
  db.exec(CREATE_TABLES_SQL)
  console.log('✅ 表结构创建完成')

  // 2. 插入种子数据（仅当表为空时）
  let insertedCount = 0

  if (isTableEmpty(db, 'canteens')) {
    const stmt = db.prepare(
      'INSERT INTO canteens (name, location, rating, tags, image) VALUES (?, ?, ?, ?, ?)',
    )
    for (const c of SEED_DATA.canteens) {
      stmt.run([c.name, c.location, c.rating, c.tags, c.image])
    }
    stmt.free()
    insertedCount += SEED_DATA.canteens.length
  }

  if (isTableEmpty(db, 'items')) {
    const stmt = db.prepare(
      'INSERT INTO items (user_id, title, description, price, category, images, contact, seller, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    for (const i of SEED_DATA.items) {
      stmt.run([i.user_id, i.title, i.description, i.price, i.category, i.images, i.contact, i.seller, i.image])
    }
    stmt.free()
    insertedCount += SEED_DATA.items.length
  }

  if (isTableEmpty(db, 'lost_found')) {
    const stmt = db.prepare(
      'INSERT INTO lost_found (user_id, type, title, location, date, description) VALUES (?, ?, ?, ?, ?, ?)',
    )
    for (const l of SEED_DATA.lost_found) {
      stmt.run([l.user_id, l.type, l.title, l.location, l.date, l.description])
    }
    stmt.free()
    insertedCount += SEED_DATA.lost_found.length
  }

  if (isTableEmpty(db, 'reviews')) {
    const stmt = db.prepare(
      'INSERT INTO reviews (canteen_id, user_id, username, rating, content) VALUES (?, ?, ?, ?, ?)',
    )
    for (const r of SEED_DATA.reviews) {
      stmt.run([r.canteen_id, r.user_id, r.username, r.rating, r.content])
    }
    stmt.free()
    insertedCount += SEED_DATA.reviews.length
  }

  if (insertedCount > 0) {
    console.log(`🌱 已插入 ${insertedCount} 条种子数据`)
  } else {
    console.log('ℹ️  各表已有数据，跳过种子数据插入')
  }

  // 3. 持久化到磁盘
  saveDb()
  console.log('💾 数据库已保存到:', DB_FILE)

  // 4. 打印表信息供确认
  const tables = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  )
  if (tables.length > 0) {
    const tableNames = tables[0].values.map((row) => row[0])
    console.log('📋 当前数据库表:', tableNames.join(', '))
  }
}

// ====== 直接运行时自动执行初始化 ======
// 通过 node server/database/init.js 调用
const isDirectRun =
  process.argv[1] && process.argv[1].endsWith('init.js')

if (isDirectRun) {
  const force = process.argv.includes('--force')
  initDatabase(force)
    .then(() => {
      console.log('\n🎉 数据库初始化完成！')
      process.exit(0)
    })
    .catch((err) => {
      console.error('\n❌ 数据库初始化失败:', err)
      process.exit(1)
    })
}
