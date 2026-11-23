// Admin 평가계획서 "로컬 분석기 자동 분석" 개발 전용 Vite 설정 (2026-11-11).
// - Shared 영향 영역인 `frontend/admin/vite.config.ts`는 수정하지 않는다. 그 설정(포트 5174·strictPort·`/api` Proxy·대학 PDF Plugin)을
//   그대로 불러와 `/dev-analysis` Proxy만 덧붙인다. Build에는 쓰이지 않는다.
// - 토큰은 Node 쪽에서만 붙인다(`VITE_` 접두어 금지, 번들 미포함). 출처: CURRICULUM_ANALYSIS_TOKEN 또는 CURRICULUM_ANALYSIS_TOKEN_FILE(읽기만).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import base from '../../../../../frontend/admin/vite.config.ts'

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
console.log(`[admin-analyzer] analyzer=${analyzerTarget} token=${token ? 'set' : 'missing'}`)

type ProxyRequest = { setHeader: (name: string, value: string) => void; removeHeader: (name: string) => void }

export default {
  ...base,
  root: fileURLToPath(new URL('../../../../../frontend/admin', import.meta.url)),
  server: {
    ...base.server,
    port: Number(process.env.ADMIN_PORT ?? 5174),
    strictPort: true,
    proxy: {
      ...(base.server?.proxy ?? {}),
      '/dev-analysis': {
        target: analyzerTarget,
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/dev-analysis/, ''),
        configure: (proxy: { on: (event: string, handler: (request: ProxyRequest) => void) => void }) => {
          proxy.on('proxyReq', (request) => {
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
