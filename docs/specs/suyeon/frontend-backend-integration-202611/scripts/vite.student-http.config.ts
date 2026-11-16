// 로컬 검증 전용 (저장소 밖 scratchpad). frontend/student/vite.config.ts(Shared 영향 영역)를 수정하지 않고
// 같은 설정에 '/api' 개발 Proxy만 덧붙인다(Admin vite.config의 기존 Proxy와 같은 방식).
import base from 'C:/learnershigh-extension/frontend/student/vite.config.ts'

export default {
  ...base,
  root: 'C:/learnershigh-extension/frontend/student',
  server: { ...base.server, proxy: { '/api': process.env.VITE_API_TARGET ?? 'http://localhost:18080' } },
}
