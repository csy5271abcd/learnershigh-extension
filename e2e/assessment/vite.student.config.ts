// Assessment E2E 전용 Student Vite 설정: frontend/student/vite.config.ts를 그대로 쓰고 개발 서버 '/api' Proxy만 덧붙인다.
// (Shared 설정 파일은 바꾸지 않는다. Build 결과물에는 영향 없음.)
import { fileURLToPath } from 'node:url'
import base from '../../frontend/student/vite.config.ts'

export default {
  ...base,
  root: fileURLToPath(new URL('../../frontend/student', import.meta.url)),
  server: { ...base.server, port: Number(process.env.E2E_STUDENT_PORT ?? 5191), proxy: { '/api': process.env.VITE_API_TARGET ?? 'http://localhost:18090' } },
}
