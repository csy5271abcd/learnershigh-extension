import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { universityExamPdfDevServer } from '../student/tools/universityExamPdfDevServer.ts'

// Backend API (Spring Boot). E2E / 로컬 모두 /api 를 Backend로 넘긴다.
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  // 대학별 기출 PDF: Student와 같은 Plugin·같은 Manifest·같은 원본 폴더를 직접 읽는다 (Student 서버 없이도 열림, dev 전용)
  plugins: [react(), universityExamPdfDevServer()],
  // student-preview.html: 학생 Desktop 화면 미리보기 iframe 전용 페이지 (Assessment 관리 학생 화면 보기·수행평가 상세)
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        studentPreview: fileURLToPath(new URL('./student-preview.html', import.meta.url)),
      },
    },
  },
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
