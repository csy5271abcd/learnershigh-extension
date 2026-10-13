import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Backend API (Spring Boot). E2E / 로컬 모두 /api 를 Backend로 넘긴다.
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 세 Surface를 동시에 실행할 수 있도록 Surface마다 고정 Port를 쓴다.
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/api': apiTarget },
  },
  preview: {
    port: 4174,
    strictPort: true,
    proxy: { '/api': apiTarget },
  },
})
