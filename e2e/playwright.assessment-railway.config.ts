import { readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// 원격(Railway HTTPS) 분석기 통합 화면 시험 (A19, 2026-11-16). 합성 문서 전용 opt-in 설정이다.
// 기존 실제 분석기 시험(playwright.assessment-real.config.ts — 실제 코퍼스 F0xxxx 사용)은 로컬 분석기에서만 실행하고 원격에 연결하지 않는다.
// 서버를 띄우지 않는다 — 실행자가 일회용 DB에 연결한 Backend(ASSESSMENT_ANALYZER_BASE_URL=Railway, 시연 명단 ON)·Admin/Student Vite(1학기 문맥)를 먼저 띄운다.
//   ASSESSMENT_RAILWAY_API / _ADMIN / _STUDENT : 주소
//   ASSESSMENT_RAILWAY_FIXTURES : assessment-railway/fixtures 생성기가 만든 manifest.json(저장소 밖). synthetic=true + SHA-256이 맞는 파일만 올린다
//   ASSESSMENT_RAILWAY_EXPECT_PROFILE : 기대 분석기 프로필(v21.10-b16-dev)
for (const name of ['ASSESSMENT_RAILWAY_API', 'ASSESSMENT_RAILWAY_ADMIN', 'ASSESSMENT_RAILWAY_STUDENT', 'ASSESSMENT_RAILWAY_FIXTURES', 'ASSESSMENT_RAILWAY_EXPECT_PROFILE']) {
  if (!process.env[name]) throw new Error(`${name}가 필요합니다 — 원격 분석기 화면 시험은 opt-in입니다.`)
}
if (JSON.parse(readFileSync(process.env.ASSESSMENT_RAILWAY_FIXTURES!, 'utf8')).synthetic !== true) {
  throw new Error('ASSESSMENT_RAILWAY_FIXTURES는 합성 문서 manifest(synthetic=true)여야 합니다 — 실제 학교 문서는 원격으로 보내지 않습니다.')
}

export default defineConfig({
  testDir: './assessment-railway',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'ko-KR', timezoneId: 'Asia/Seoul' },
  projects: [
    {
      name: 'assessment-railway',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1536, height: 960 }, ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}) },
    },
  ],
})
