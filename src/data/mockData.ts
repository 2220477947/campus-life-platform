/**
 * 校园生活服务平台 — 模拟数据
 *
 * 包含食堂列表、二手商品列表、评价列表三组数据，
 * 供 CanteenPage / TradePage 等页面在未接入后端时使用。
 */

/* ============================================================
 *  类型定义
 * ============================================================ */

/** 食堂 */
export interface Canteen {
  id: number
  /** 食堂名称 */
  name: string
  /** 位置描述 */
  location: string
  /** 综合评分（0-5） */
  rating: number
  /** 标签，如"人气推荐"、"清真" */
  tags: string[]
  /** 占位图 URL */
  image: string
}

/** 二手商品 */
export interface Item {
  id: number
  /** 标题 */
  title: string
  /** 价格（元） */
  price: number
  /** 分类：教材 / 电子 / 生活 / 其他 */
  category: '教材' | '电子' | '生活' | '其他'
  /** 占位图 URL */
  image: string
  /** 卖家昵称 */
  seller: string
}

/** 评价 */
export interface Review {
  id: number
  /** 关联的食堂 ID */
  canteenId: number
  /** 评价者昵称 */
  username: string
  /** 评价文字内容 */
  content: string
  /** 评分（1-5） */
  rating: number
  /** 发布时间 */
  time: string
}

/* ============================================================
 *  食堂列表
 * ============================================================ */

export const canteens: Canteen[] = [
  {
    id: 1,
    name: '第一食堂',
    location: '生活区3号楼南侧',
    rating: 4.2,
    tags: ['人气推荐', '菜式丰富'],
    image: 'https://picsum.photos/seed/canteen1/600/400',
  },
  {
    id: 2,
    name: '第二食堂',
    location: '生活区1号楼北侧',
    rating: 4.5,
    tags: ['环境整洁', '性价比高'],
    image: 'https://picsum.photos/seed/canteen2/600/400',
  },
  {
    id: 3,
    name: '第三食堂',
    location: '体育场西侧',
    rating: 3.8,
    tags: ['分量足'],
    image: 'https://picsum.photos/seed/canteen3/600/400',
  },
  {
    id: 4,
    name: '教工食堂',
    location: '行政楼一层',
    rating: 4.7,
    tags: ['清真', '精致小炒'],
    image: 'https://picsum.photos/seed/canteen4/600/400',
  },
]

/* ============================================================
 *  二手商品列表
 * ============================================================ */

export const items: Item[] = [
  {
    id: 101,
    title: '《数据结构（C语言版）》严蔚敏',
    price: 18,
    category: '教材',
    image: 'https://picsum.photos/seed/item101/400/400',
    seller: '书虫小李',
  },
  {
    id: 102,
    title: '罗技 G304 无线鼠标 九成新',
    price: 120,
    category: '电子',
    image: 'https://picsum.photos/seed/item102/400/400',
    seller: '数码控',
  },
  {
    id: 103,
    title: '小米台灯 Pro 护眼版',
    price: 89,
    category: '生活',
    image: 'https://picsum.photos/seed/item103/400/400',
    seller: '寝室长阿杰',
  },
  {
    id: 104,
    title: '《高等数学（第七版）》上下册',
    price: 25,
    category: '教材',
    image: 'https://picsum.photos/seed/item104/400/400',
    seller: '考研学姐',
  },
  {
    id: 105,
    title: 'iPad Air 第四代 64G WiFi',
    price: 2800,
    category: '电子',
    image: 'https://picsum.photos/seed/item105/400/400',
    seller: '果粉小王',
  },
  {
    id: 106,
    title: '宿舍收纳架 三层落地款',
    price: 35,
    category: '生活',
    image: 'https://picsum.photos/seed/item106/400/400',
    seller: '搬家老张',
  },
  {
    id: 107,
    title: '吉他 初学者练习琴 41寸',
    price: 150,
    category: '其他',
    image: 'https://picsum.photos/seed/item107/400/400',
    seller: '音乐少年',
  },
  {
    id: 108,
    title: '《线性代数》同济版 几乎全新',
    price: 12,
    category: '教材',
    image: 'https://picsum.photos/seed/item108/400/400',
    seller: '数学系小陈',
  },
]

/* ============================================================
 *  评价列表
 * ============================================================ */

export const reviews: Review[] = [
  {
    id: 1,
    canteenId: 1,
    username: ' hungry同学',
    content: '红烧肉盖饭分量很足，肉质软烂入味，午饭排队也不算太久。',
    rating: 4,
    time: '2025-07-25 12:30',
  },
  {
    id: 2,
    canteenId: 1,
    username: '吃货小王',
    content: '早上豆浆油条性价比很高，就是高峰期座位有点紧张。',
    rating: 4,
    time: '2025-07-25 08:15',
  },
  {
    id: 3,
    canteenId: 2,
    username: '佛系青年',
    content: '二食堂的黄焖鸡米饭一绝，鸡肉嫩滑汤汁拌饭超香，强烈推荐！',
    rating: 5,
    time: '2025-07-24 18:42',
  },
  {
    id: 4,
    canteenId: 2,
    username: '减肥失败者',
    content: '麻辣香锅可以自选食材，辣度可选，环境也比以前干净多了。',
    rating: 5,
    time: '2025-07-24 12:05',
  },
  {
    id: 5,
    canteenId: 3,
    username: '运动达人',
    content: '运动完来一碗牛肉面，汤底浓郁面条筋道，就是肉给得有点少。',
    rating: 3,
    time: '2025-07-23 19:20',
  },
  {
    id: 6,
    canteenId: 3,
    username: '匆匆过客',
    content: '菜品种类偏少，希望能多增加一些素食选项。',
    rating: 3,
    time: '2025-07-23 12:48',
  },
  {
    id: 7,
    canteenId: 4,
    username: '精致男孩',
    content: '教工食堂的小炒火候到位，鱼香肉丝酸甜适中，比学生食堂精致不少。',
    rating: 5,
    time: '2025-07-22 11:55',
  },
  {
    id: 8,
    canteenId: 4,
    username: '清真同学',
    content: '清真窗口的牛肉拉面很正宗，面条现拉现煮，汤头清爽不油腻。',
    rating: 5,
    time: '2025-07-22 12:30',
  },
]
