import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { universityExamPdfDevServer } from './tools/universityExamPdfDevServer.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), universityExamPdfDevServer()],
  // 세 Surface를 동시에 실행할 수 있도록 Surface마다 고정 Port를 쓴다.
  server: {
    port: 5173,
    strictPort: true,
  },
})
