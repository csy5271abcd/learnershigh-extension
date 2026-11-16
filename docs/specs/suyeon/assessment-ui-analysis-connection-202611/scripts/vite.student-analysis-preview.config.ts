// Student 평가계획서 "분석 미리보기" 개발 전용 Vite 설정 (2026-11-11).
// - Shared `frontend/student/vite.config.ts`는 수정하지 않는다. 그 설정을 그대로 불러와 개발 서버 Proxy 두 개만 덧붙인다.
//   ① `/api` → Backend (기존 run-student-http-dev와 같음)
//   ② `/dev-analysis` → 계정 B 로컬 분석기(127.0.0.1만). 토큰은 **Node 쪽에서만** 붙인다(`VITE_` 접두어 금지, 번들 미포함).
// - 토큰 출처: 환경 변수 CURRICULUM_ANALYSIS_TOKEN, 없으면 CURRICULUM_ANALYSIS_TOKEN_FILE 경로의 파일(읽기만). 값은 로그에 쓰지 않는다.
// - Build에는 쓰이지 않는다(dev 서버 전용).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import base from '../../../../../frontend/student/vite.config.ts'

function analyzerToken(): string {
  const direct = process.env.CURRICULUM_ANALYSIS_TOKEN?.trim()
  if (direct) return direct
  const file = process.env.CURRICULUM_ANALYSIS_TOKEN_FILE
  if (!file) return ''
  try {
    return readFileSync(file, 'utf8').trim()
  } catch {
    return ''
  }
}

const analyzerTarget = process.env.ANALYSIS_SERVICE_URL ?? 'http://127.0.0.1:8765'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(analyzerTarget)) {
  throw new Error('ANALYSIS_SERVICE_URL은 로컬 주소(127.0.0.1/localhost)만 허용해요.')
}
const token = analyzerToken()
console.log(`[analysis-preview] analyzer=${analyzerTarget} token=${token ? 'set' : 'missing'}`)

export default {
  ...base,
  root: fileURLToPath(new URL('../../../../../frontend/student', import.meta.url)),
  server: {
    ...base.server,
    port: Number(process.env.STUDENT_PREVIEW_PORT ?? 5176),
    host: 'localhost',
    proxy: {
      '/api': process.env.VITE_API_TARGET ?? 'http://localhost:18080',
      '/dev-analysis': {
        target: analyzerTarget,
        changeOrigin: true, // 분석기 Host 검사(127.0.0.1:<port>) 통과
        rewrite: (path: string) => path.replace(/^\/dev-analysis/, ''),
        configure: (proxy: { on: (event: string, handler: (request: { setHeader: (name: string, value: string) => void; removeHeader: (name: string) => void }) => void) => void }) => {
          proxy.on('proxyReq', (request) => {
            // 브라우저 쿠키·Origin은 분석기로 넘기지 않는다. 토큰은 여기서만 붙인다.
            request.removeHeader('cookie')
            request.removeHeader('origin')
            request.removeHeader('referer')
            if (token) request.setHeader('X-Analysis-Token', token)
          })
        },
      },
    },
  },
}
