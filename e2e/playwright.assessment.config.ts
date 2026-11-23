import { defineConfig, devices } from '@playwright/test'
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

const ports = { backend: 18090, analyzer: 18768, schoolinfo: 18769, student: 5191, admin: 5192 }
// 2026-11-19 PR #18 통합(A27-UX 부록 D): 실제 분석은 서버 안(local)이고 원격 분석기(Railway) 연결은 퇴역했다.
// E2E는 화면 흐름을 고정된 합성 결과로 시험하려고 Backend를 loopback-stub 모드로 띄워 같은 컴퓨터(127.0.0.1)의 Stub에만 연결한다.
// 토큰은 시험용 고정 값이다(비밀값 아님, 설정 파일의 실제 토큰을 읽지 않는다).
const token = 'e2e-stub-token-not-a-secret-0123456789'
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
      // A27-UX 부록 E: 가상 학교알리미(127.0.0.1). 기본은 연결 실패(503)라 다른 시험에서는 아무것도 등록되지 않는다
      command: `node assessment/stub-schoolinfo.mjs ${ports.schoolinfo}`,
      url: `http://127.0.0.1:${ports.schoolinfo}/health`,
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
        ASSESSMENT_ANALYZER_MODE: 'loopback-stub',
        ASSESSMENT_ANALYZER_STUB_BASE_URL: `http://127.0.0.1:${ports.analyzer}`,
        ASSESSMENT_ANALYZER_STUB_TOKEN: token,
        ASSESSMENT_ANALYSIS_IMPORT_CONTRACT03_ENABLED: 'true',
        // A10: 합성 수신 JSON(HWPX Locator·다과목 PDF)을 넣으려고 이 일회용 E2E Backend에서만 켠다. 애플리케이션 기본값은 계속 false다.
        ASSESSMENT_ANALYSIS_IMPORT_ENABLED: 'true',
        ASSESSMENT_MULTIFORMAT_EXPERIMENTAL: 'true',
        // A26: 변환기 기본값이 docker(자동 이미지 준비)라, 시험에서는 끄고 '변환기 미설정(415)' 경로를 확인한다
        ASSESSMENT_PREVIEW_CONVERTER: 'none',
        ASSESSMENT_PREVIEW_CONVERTER_AUTO_PROVISION: 'false',
        // A27-UX 부록 E: 학교알리미는 같은 컴퓨터의 가상 서버만. 연도 지정 조회 신뢰는 이 가상 서버에서만 켠다(애플리케이션 기본값 false)
        ASSESSMENT_SCHOOLINFO_BASE_URL: `http://127.0.0.1:${ports.schoolinfo}`,
        ASSESSMENT_SCHOOLINFO_ALLOW_LOOPBACK: 'true',
        ASSESSMENT_SCHOOLINFO_YEAR_QUERY_VERIFIED: 'true',
        ASSESSMENT_SCHOOLINFO_POLITE_DELAY_MILLIS: '0',
        ASSESSMENT_SCHOOLINFO_RETRY_BASE_MILLIS: '1',
      },
    },
    {
      command: `npx vite --config ../../e2e/assessment/vite.student.config.ts --port ${ports.student} --strictPort`,
      cwd: '../frontend/student',
      url: `http://localhost:${ports.student}/assessment`,
      reuseExistingServer: false,
      // 부록 O: 데이터 출처(http)·현재 학기(서버 KST)는 기본값 — 설정하지 않는다. 남은 값 = 시험 Backend 주소·개발 인증 ID
      env: {
        VITE_API_TARGET: `http://localhost:${ports.backend}`,
        VITE_ASSESSMENT_DEV_STUDENT_ID: 'stu_001',
        E2E_STUDENT_PORT: String(ports.student),
      },
    },
    {
      command: `npx vite --port ${ports.admin} --strictPort`,
      cwd: '../frontend/admin',
      url: `http://localhost:${ports.admin}/`,
      reuseExistingServer: false,
      env: {
        VITE_API_TARGET: `http://localhost:${ports.backend}`,
        VITE_ASSESSMENT_DEV_ADMIN_ID: 'adm_plan_operator',
      },
    },
  ],
})
