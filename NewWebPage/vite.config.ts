import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // three.js 가 포함된 단일 번들(약 235KB gzip)이라 기본 경고 기준을 올려 둡니다
  build: { chunkSizeWarningLimit: 1000 },
})
