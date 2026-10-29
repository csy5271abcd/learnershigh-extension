import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import { parentReportPreview } from './parentReportPreview.ts'

// Backend API (Spring Boot). E2E / 로컬 모두 /api 를 Backend로 넘긴다.
// https://vite.dev/config/
export default defineConfig(({mode}) => {
 const env=loadEnv(mode,fileURLToPath(new URL('.',import.meta.url)),'')
 const apiTarget = process.env.VITE_API_TARGET ?? env.VITE_API_TARGET ?? 'http://localhost:8080'
 const careApiTarget = process.env.VITE_CARE_API_TARGET ?? env.VITE_CARE_API_TARGET ?? apiTarget
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
    proxy: { '/api/admin/student-care': careApiTarget, '/api': apiTarget },
  },
  preview: {
    port: 4174,
    strictPort: true,
    proxy: { '/api/admin/student-care': careApiTarget, '/api': apiTarget },
  },
 }})
