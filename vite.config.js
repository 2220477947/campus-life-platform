import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5181,
    proxy: {
      // 将 /api 开头的请求代理到后端服务器
      // 优先使用本地后端，如果本地未启动则回退到 Railway 后端
      '/api': {
        target: process.env.RAILWAY_BACKEND || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
