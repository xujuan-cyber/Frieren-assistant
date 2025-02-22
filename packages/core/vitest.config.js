import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  // 加载环境变量
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }
  
  return {
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./tests/setup.js'],
      // 环境变量配置
      env: {
        ...process.env
      }
    }
  }
}) 