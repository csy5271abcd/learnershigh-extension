import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import { parentReportPreview } from './parentReportPreview.ts'
import { visionDevProxy } from './visionDevAuth.ts'

// Backend API (Spring Boot). E2E / 로컬 모두 /api 를 Backend로 넘긴다.
// https://vite.dev/config/
export default defineConfig(({mode}) => {
 const env=loadEnv(mode,fileURLToPath(new URL('.',import.meta.url)),'')
 const apiTarget = process.env.VITE_API_TARGET ?? env.VITE_API_TARGET ?? 'http://localhost:8080'
 const careApiTarget = process.env.VITE_CARE_API_TARGET ?? env.VITE_CARE_API_TARGET ?? apiTarget
 // 사진 관찰 서비스(runners_hi_vision_ai). /vision-api → 사진 관찰 서버 /api, 서비스 계정 인증은 visionDevAuth.ts. 두 서비스가 합쳐지면 지운다
 const visionTarget = process.env.VITE_VISION_API_TARGET ?? env.VITE_VISION_API_TARGET ?? 'http://127.0.0.1:39731'
 const visionProxy = visionDevProxy(visionTarget, env.VISION_SERVICE_LOGIN_ID, env.VISION_SERVICE_PASSWORD)
 // 이미지 인식 감독관 API(runners_hi_vision_ai supervisor-api). /supervisor-api → /api/supervisor, 감독관 토큰은 개발용(.env.local)이라 화면에 로그인을 두지 않는다
 const supervisorTarget = process.env.VITE_SUPERVISOR_API_TARGET ?? env.VITE_SUPERVISOR_API_TARGET ?? 'http://127.0.0.1:39741'
 const supervisorProxy = {
  target: supervisorTarget, changeOrigin: true,
  rewrite: (p: string) => p.replace(/^\/supervisor-api/, '/api/supervisor'),
  headers: env.SUPERVISOR_DEV_TOKEN ? { Authorization: `Bearer ${env.SUPERVISOR_DEV_TOKEN}` } : {},
 }
 return {
  plugins: [
    parentReportPreview(process.env.PARENT_REPORT_PREVIEW_URL ?? env.PARENT_REPORT_PREVIEW_URL),
    {
      name: 'student-care-original-preview-data',
      enforce: 'pre',
      // 원본 22개 파일과 당시 예시 정책을 고정하고 신규 2~4의 FE 검토와 분리한다.
      // 이 한정된 매핑은 다른 Feature의 API나 실제 Backend에 영향을 주지 않는다.
      resolveId(source, importer) {
        const apiFile = /(?:^|\/)api\/(studentCareApi|apiClient)\.ts$/.exec(source)?.[1]
        if (importer?.replaceAll('\\', '/').includes('/features/student-care-v1/') && apiFile) {
          return fileURLToPath(new URL(`./src/features/student-care/api/${apiFile === 'studentCareApi' ? 'originalPreviewApi' : apiFile}.ts`, import.meta.url))
        }
      },
    },
    react(),
  ],
  // 세 Surface를 동시에 실행할 수 있도록 Surface마다 고정 Port를 쓴다.
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/supervisor-api': supervisorProxy, '/vision-api': visionProxy, '/api/admin/student-care': careApiTarget, '/api': apiTarget },
  },
  preview: {
    port: 4174,
    strictPort: true,
    proxy: { '/supervisor-api': supervisorProxy, '/vision-api': visionProxy, '/api/admin/student-care': careApiTarget, '/api': apiTarget },
  },
 }})
