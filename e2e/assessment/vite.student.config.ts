// Assessment E2E 전용 Student Vite 설정: frontend/student/vite.config.ts를 그대로 쓰고 개발 서버 '/api' Proxy만 덧붙인다.
// (Shared 설정 파일은 바꾸지 않는다. Build 결과물에는 영향 없음.)
import { fileURLToPath } from 'node:url'
import studentConfig from '../../frontend/student/vite.config.ts'

// A25: 학생 기본 설정이 함수(.env.local의 ASSESSMENT_UNIVERSITY_EXAM_ROOT를 읽음)가 됐다 — 개발 서버 모드로 풀어서 쓴다
const base = (typeof studentConfig === 'function' ? studentConfig({ command: 'serve', mode: 'development' }) : studentConfig) as Record<string, unknown> & { server?: Record<string, unknown> }

export default {
  ...base,
  root: fileURLToPath(new URL('../../frontend/student', import.meta.url)),
  server: { ...base.server, port: Number(process.env.E2E_STUDENT_PORT ?? 5191), proxy: { '/api': process.env.VITE_API_TARGET ?? 'http://localhost:18090' } },
}
