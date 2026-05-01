import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { DEFAULT_VITE_ENV } from '../core/src/utils/default-env'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const monorepoRoot = resolve(__dirname, '../..')
  const env = loadEnv(mode, monorepoRoot)
  const processEnv = {
    ...DEFAULT_VITE_ENV,
    ...env,
  }

  return {
    envDir: monorepoRoot,
    plugins: [vue(), basicSsl()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@prompt-optimizer/ui': resolve(__dirname, '../ui')
      },
    },
    base: './',  // 使用相对路径
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'index.html')
        },
        output: {
          entryFileNames: `assets/[name].js`,
          chunkFileNames: `assets/[name].js`,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'background.js') {
              return 'background.js';
            }
            return `assets/[name].[ext]`;
          }
        }
      },
      copyPublicDir: true
    },
    server: {
      port: 5174,
      https: {}
    },
    define: {
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
        ...Object.keys(processEnv).reduce((acc, key) => {
          acc[key] = processEnv[key as keyof typeof processEnv];
          return acc;
        }, {} as Record<string, string>)
      }
    }
  }
})
