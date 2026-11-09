// 개발 서버 전용: 학생 케어와 사진 관찰 서비스가 아직 두 서버로 나뉘어 있는 동안, /vision-api 프록시가 서비스 계정으로 대신 로그인한다.
// 화면에는 별도 로그인이 없다. 두 서비스가 하나로 합쳐지면 같은 세션을 쓰므로 이 파일과 vite.config.ts의 /vision-api 설정을 지운다.
// 계정은 커밋하지 않는 frontend/admin/.env.local의 VISION_SERVICE_LOGIN_ID / VISION_SERVICE_PASSWORD로만 받는다(VITE_ 접두사가 아니라 브라우저에 노출되지 않음).
import type { ProxyOptions } from 'vite'

const cookieOf = (res: Response, name: string) => res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith(`${name}=`)) ?? null

export function visionDevProxy(target: string, loginId: string | undefined, password: string | undefined): ProxyOptions {
  let session: string | null = null
  let pending: Promise<void> | null = null
  const login = () => pending ??= (async () => {
    try {
      if (!loginId || !password) return
      const csrfRes = await fetch(`${target}/api/auth/csrf`)
      const pre = cookieOf(csrfRes, 'RHV_SESSION'), csrf = await csrfRes.json() as { headerName: string; token: string }
      const res = await fetch(`${target}/api/auth/login`, {
        method: 'POST', redirect: 'manual',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', [csrf.headerName]: csrf.token, ...(pre ? { Cookie: pre } : {}) },
        body: new URLSearchParams({ username: loginId, password }),
      })
      session = res.status === 204 ? cookieOf(res, 'RHV_SESSION') : null
    } catch {
      session = null
    } finally {
      pending = null
    }
  })()
  void login()
  return {
    target, changeOrigin: false,
    rewrite: (path) => path.replace(/^\/vision-api/, '/api'),
    configure: (proxy) => {
      proxy.on('proxyReq', (req) => { if (session) req.setHeader('cookie', session); else req.removeHeader('cookie') })
      // 세션이 끝났으면 다음 요청을 위해 다시 로그인한다(이번 응답은 401 그대로 화면에 전달)
      proxy.on('proxyRes', (res) => { if (res.statusCode === 401) { session = null; void login() } })
    },
  }
}
