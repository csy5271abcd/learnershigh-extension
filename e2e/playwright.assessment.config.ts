import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Assessment E2E (A7, 2026-11-15). Student Care E2E(playwright.config.ts)와 분리된 설정이다.
// 실행: `npm run test:assessment` (assessment/run.mjs가 일회용 MySQL을 띄우고 이 설정으로 실행한 뒤 지운다).
// - 시연 DB 보호: DB 이름이 lh_e2e_assessment로 시작하지 않으면 실행하지 않는다. /api/test/reset을 부르지 않는다.
// - 분석기는 Stub(합성 결과)이다. 실제 분석기 검증을 대신하지 않는다.
const dbUrl = process.env.E2E_ASSESSMENT_DB_URL ?? ''
if (!/\/lh_e2e_assessment[a-z0-9_]*(\?|$)/.test(dbUrl)) {
  throw new Error('Assessment E2E는 일회용 DB(lh_e2e_assessment*)에서만 실행합니다. `npm run test:assessment`로 실행해 주세요.')
}

const ports = { backend: 18090, analyzer: 18768, student: 5191, admin: 5192 }
// A24: Backend는 분석기 토큰을 application.yml 값만 쓴다(ASSESSMENT_ANALYZER_TOKEN 무시). 그래서 로컬 Stub이 그 값을 받아들이게 한다.
// 값은 출력하지 않는다. Stub은 127.0.0.1에만 뜬다(원격 전송 없음).
function yamlAnalyzerToken(): string {
  const lines = readFileSync(new URL('../backend/src/main/resources/application.yml', import.meta.url), 'utf8').split('\n').map((line) => line.trimEnd())
  // 첫 YAML 문서(기본 Profile)의 assessment.analyzer 블록 안에서만 찾는다
  const docEnd = lines.indexOf('---')
  const head = docEnd < 0 ? lines : lines.slice(0, docEnd)
  const analyzerAt = head.indexOf('  analyzer:')
  const tokenLine = analyzerAt < 0 ? undefined : head.slice(analyzerAt + 1).find((line) => line.startsWith('    token:'))
  const value = tokenLine?.slice('    token:'.length).trim()
  if (!value) throw new Error('application.yml에 assessment.analyzer.token이 없습니다')
  return value
}
const token = yamlAnalyzerToken()
const windows = process.platform === 'win32'
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH

export default defineConfig({
  testDir: './assessment/tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  projects: [
    {
      name: 'assessment',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1536, height: 960 }, ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}) },
    },
  ],
  webServer: [
    {
      command: `node assessment/stub-analyzer.mjs ${ports.analyzer}`,
      url: `http://127.0.0.1:${ports.analyzer}/health`,
      env: { E2E_ANALYZER_TOKEN: token },
      reuseExistingServer: false,
    },
    {
      command: windows ? 'gradlew.bat bootRun --console=plain' : './gradlew bootRun --console=plain',
      cwd: '../backend',
      // 인증 없는 요청은 401 → Playwright는 401도 '떠 있음'으로 본다(actuator 없음)
      url: `http://127.0.0.1:${ports.backend}/api/admin/assessment/schools`,
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        DB_URL: dbUrl,
        DB_USERNAME: process.env.E2E_ASSESSMENT_DB_USER ?? 'lhe2e',
        DB_PASSWORD: process.env.E2E_ASSESSMENT_DB_PASSWORD ?? '',
        SERVER_PORT: String(ports.backend),
        ASSESSMENT_STORAGE_ROOT: join(tmpdir(), 'lh-e2e-assessment-storage'),
        ASSESSMENT_ANALYZER_BASE_URL: `http://127.0.0.1:${ports.analyzer}`,
        ASSESSMENT_ANALYSIS_IMPORT_CONTRACT03_ENABLED: 'true',
        // A10: 합성 수신 JSON(HWPX Locator·다과목 PDF)을 넣으려고 이 일회용 E2E Backend에서만 켠다. 애플리케이션 기본값은 계속 false다.
        ASSESSMENT_ANALYSIS_IMPORT_ENABLED: 'true',
        ASSESSMENT_MULTIFORMAT_EXPERIMENTAL: 'true',
        // A26: 변환기 기본값이 docker(자동 이미지 준비)라, 시험에서는 끄고 '변환기 미설정(415)' 경로를 확인한다
        ASSESSMENT_PREVIEW_CONVERTER: 'none',
        ASSESSMENT_PREVIEW_CONVERTER_AUTO_PROVISION: 'false',
      },
    },
    {
      command: `npx vite --config ../../e2e/assessment/vite.student.config.ts --port ${ports.student} --strictPort`,
      cwd: '../frontend/student',
      url: `http://localhost:${ports.student}/assessment`,
      reuseExistingServer: false,
      env: {
        VITE_ASSESSMENT_DATA_SOURCE: 'http',
        VITE_API_TARGET: `http://localhost:${ports.backend}`,
        VITE_ASSESSMENT_DEV_STUDENT_ID: 'stu_001',
        VITE_ASSESSMENT_DEV_CURRENT_TERM: '2026-2',
        E2E_STUDENT_PORT: String(ports.student),
      },
    },
    {
      command: `npx vite --port ${ports.admin} --strictPort`,
      cwd: '../frontend/admin',
      url: `http://localhost:${ports.admin}/`,
      reuseExistingServer: false,
      env: {
        VITE_ASSESSMENT_DATA_SOURCE: 'http',
        VITE_API_TARGET: `http://localhost:${ports.backend}`,
        VITE_ASSESSMENT_DEV_ADMIN_ID: 'adm_plan_operator',
        VITE_ASSESSMENT_DEV_CURRENT_TERM: '2026-2',
      },
    },
  ],
})
