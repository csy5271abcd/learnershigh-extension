// Student Assessment http 개발 실행 전용 Vite 설정 (방법 B: Shared 변경 승인 전).
// frontend/student/vite.config.ts(Shared 영향 영역)를 수정하지 않고, 같은 설정을 그대로 불러와 개발 서버 '/api' Proxy만 덧붙인다.
// Admin vite.config의 기존 Proxy(VITE_API_TARGET)와 같은 방식이며 Build 결과물에는 영향이 없다(이 파일은 dev 서버에서만 쓴다).
import { fileURLToPath } from 'node:url'
import base from '../../../../../frontend/student/vite.config.ts'

export default {
  ...base,
  root: fileURLToPath(new URL('../../../../../frontend/student', import.meta.url)),
  server: { ...base.server, proxy: { '/api': process.env.VITE_API_TARGET ?? 'http://localhost:8080' } },
}
