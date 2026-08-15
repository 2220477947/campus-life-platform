/* ============================================================
 *  统一 API 配置 & 请求工具
 *  ----------------------------------------------------------
 *  通过 Vite 代理转发 /api → http://localhost:3001
 *  所以前端请求地址只需写 '/api/xxx'，无需写完整域名
 * ============================================================ */

/**
 * API 基础地址
 * - 开发环境：通过 Vite 代理转发，值为空字符串 ''
 * - 生产环境：通过环境变量 VITE_API_BASE 指向后端地址（如 Railway URL）
 */
export const API_BASE = import.meta.env.VITE_API_BASE || ''

/**
 * 拼接完整的 API 地址
 * @param path - API 路径，如 '/api/canteens'
 * @returns 完整地址，如 'http://localhost:3001/api/canteens' 或 '/api/canteens'
 *
 * @example
 * getApiUrl('/api/canteens')        // → '/api/canteens'（代理模式）
 * getApiUrl('/api/reviews/1')       // → '/api/reviews/1'
 */
export function getApiUrl(path: string): string {
  return `${API_BASE}${path}`
}

/* ------------------------------------------------------------
 *  响应类型定义
 *  ---------------------------------------------------------- */

export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/* ------------------------------------------------------------
 *  统一请求工具函数 apiRequest
 *  ----------------------------------------------------------
 *  - 自动从 localStorage 获取 token
 *  - 有 token 时自动添加 Authorization 请求头
 *  - 自动处理 JSON 序列化/反序列化
 *  - 返回 { code, data, message } 格式
 *  ---------------------------------------------------------- */

/**
 * 发送 API 请求
 * @param url    - 请求路径，如 '/api/reviews'（会自动拼接 API_BASE）
 * @param method - HTTP 方法，默认 'GET'
 * @param body   - 请求体数据（可选），会自动 JSON.stringify
 * @returns Promise<ApiResponse> - { code, data, message }
 *
 * @example
 * // GET 请求
 * const res = await apiRequest('/api/canteens')
 * if (res.code === 200) { console.log(res.data) }
 *
 * // POST 请求
 * const res = await apiRequest('/api/reviews', 'POST', {
 *   canteen_id: 1, content: '好吃', rating: 5
 * })
 *
 * // PUT 请求
 * const res = await apiRequest('/api/reviews/1', 'PUT', { rating: 4 })
 *
 * // DELETE 请求
 * const res = await apiRequest('/api/reviews/1', 'DELETE')
 */
export async function apiRequest<T = any>(
  url: string,
  method: HttpMethod = 'GET',
  body?: any,
): Promise<ApiResponse<T>> {
  const fullUrl = getApiUrl(url)

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // 自动从 localStorage 获取 token，添加认证头
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // 构建请求配置
  const config: RequestInit = {
    method,
    headers,
  }

  // 有请求体时自动 JSON 序列化（GET/DELETE 通常不需要）
  if (body !== undefined && body !== null) {
    config.body = JSON.stringify(body)
  }

  // 发送请求
  const response = await fetch(fullUrl, config)

  // 尝试解析 JSON 响应
  let result: ApiResponse<T>
  try {
    result = await response.json()
  } catch {
    // 响应不是 JSON 格式
    return {
      code: response.status,
      data: null as T,
      message: `响应解析失败（HTTP ${response.status}）`,
    }
  }

  return result
}

/* ------------------------------------------------------------
 *  便捷方法（可选使用）
 *  ---------------------------------------------------------- */

/** GET 请求快捷方式 */
export function apiGet<T = any>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, 'GET')
}

/** POST 请求快捷方式 */
export function apiPost<T = any>(url: string, body?: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, 'POST', body)
}

/** PUT 请求快捷方式 */
export function apiPut<T = any>(url: string, body?: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, 'PUT', body)
}

/** DELETE 请求快捷方式 */
export function apiDelete<T = any>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, 'DELETE')
}
