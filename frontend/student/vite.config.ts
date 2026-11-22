import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { mockExamPassagesPlugin } from './tools/mockExamPassagesPlugin.ts'
import { universityExamPdfDevServer } from './tools/universityExamPdfDevServer.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  // 대학별 자료 원본 PDF 폴더(Git 밖, 개발 PC 전용). 없으면 저장소 안 references/previous-exam-questions
  const examRoot = process.env.ASSESSMENT_UNIVERSITY_EXAM_ROOT ?? env.ASSESSMENT_UNIVERSITY_EXAM_ROOT
  return {
    plugins: [
      react(),
      universityExamPdfDevServer({ sourceRoot: examRoot }),
      // 심화 탐구 모의고사 원문 지문(텍스트, Git 밖). PDF 아님
      mockExamPassagesPlugin({ file: process.env.ASSESSMENT_MOCK_EXAM_PASSAGES_FILE ?? env.ASSESSMENT_MOCK_EXAM_PASSAGES_FILE }),
    ],
    // 세 Surface를 동시에 실행할 수 있도록 Surface마다 고정 Port를 쓴다.
    server: {
      port: 5173,
      strictPort: true,
      // 2026-11-21: http 데이터 모드(VITE_ASSESSMENT_DATA_SOURCE=http)에서 /api 를 Backend 로 보낸다(관리자 vite.config 와 같은 기본값).
      // 개발 서버 전용 — Build 결과물에는 영향 없음. Mock 모드에서는 /api 요청 자체가 없다.
      proxy: { '/api': process.env.VITE_API_TARGET ?? env.VITE_API_TARGET ?? 'http://localhost:8080' },
    },
  }
})
