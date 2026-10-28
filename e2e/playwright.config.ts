import { defineConfig, devices } from '@playwright/test'

// ADR-0007: Backend(e2e Profile) + Admin preview가 떠 있는 상태에서 실행한다.
// 실행 방법은 README.md §22 E2E를 따른다.
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH

export default defineConfig({
  testDir: './tests',
  // Current acceptance suite: requires the explicit 100-student care-demo DB.
  // Historical prototype specs remain as evidence, not current acceptance tests.
  testMatch: ['student-care-branch-overview.spec.ts','student-care-branch-patterns.spec.ts',
    'student-care-final.spec.ts','student-care-history-details.spec.ts','student-care-metric-extremes.spec.ts'],
  // 학생 케어 상태와 기준일은 Backend 하나를 공유하므로 순서대로 실행한다.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
        launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
      },
    },
  ],
})
