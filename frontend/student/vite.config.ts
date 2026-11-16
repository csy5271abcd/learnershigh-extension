import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { universityExamPdfDevServer } from './tools/universityExamPdfDevServer.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  // 대학별 자료 원본 PDF 폴더(Git 밖, 개발 PC 전용). 없으면 저장소 안 references/previous-exam-questions
  const examRoot = process.env.ASSESSMENT_UNIVERSITY_EXAM_ROOT ?? env.ASSESSMENT_UNIVERSITY_EXAM_ROOT
  return {
    plugins: [react(), universityExamPdfDevServer({ sourceRoot: examRoot })],
    // 세 Surface를 동시에 실행할 수 있도록 Surface마다 고정 Port를 쓴다.
    server: {
      port: 5173,
      strictPort: true,
    },
  }
})
