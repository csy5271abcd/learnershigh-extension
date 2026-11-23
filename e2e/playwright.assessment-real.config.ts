import { defineConfig, devices } from '@playwright/test'

// 실제 분석기 통합 화면 시험 (A17, 2026-11-16). 기본 Assessment E2E(Stub, playwright.assessment.config.ts)와 분리한 opt-in 설정이다.
// 서버를 띄우지 않는다 — 실행자가 일회용 DB에 연결한 Backend·실제 분석기·Admin/Student Vite를 먼저 띄우고 주소를 환경 변수로 넘긴다.
//   ASSESSMENT_REAL_API / ASSESSMENT_REAL_ADMIN / ASSESSMENT_REAL_STUDENT : 주소
//   ASSESSMENT_REAL_DOCS : { "F02455": "<로컬 원문 경로>", ... } JSON 파일(저장소 밖, 원문은 커밋하지 않는다)
//   ASSESSMENT_REAL_EXPECT_PROFILE : 기대 분석기 프로필(예: v21.10-b16-dev)
// 시연 DB 보호: Backend가 어느 DB에 붙었는지는 실행자가 확인한다. 이 시험은 데이터 초기화 API를 부르지 않고 매번 새 문서를 등록한다.
for (const name of ['ASSESSMENT_REAL_API', 'ASSESSMENT_REAL_ADMIN', 'ASSESSMENT_REAL_STUDENT', 'ASSESSMENT_REAL_DOCS', 'ASSESSMENT_REAL_EXPECT_PROFILE']) {
  if (!process.env[name]) throw new Error(`${name}가 필요합니다 — 실제 분석기 통합 시험은 opt-in입니다.`)
}

export default defineConfig({
  testDir: './assessment-real',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'ko-KR', timezoneId: 'Asia/Seoul' },
  projects: [
    {
      name: 'assessment-real',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1536, height: 960 }, ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}) },
    },
  ],
})
