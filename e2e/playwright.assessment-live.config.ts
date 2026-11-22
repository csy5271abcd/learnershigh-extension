import { fileURLToPath } from 'node:url'
import base from './playwright.assessment.config.ts'

// A27-UX 부록 J (2026-11-20): 실측 원본 재현(REPLAY) E2E 전용 설정. 기본 Assessment E2E(`npm run test:assessment`)에는 포함되지 않는다.
// 실행: ASSESSMENT_PW_CONFIG=playwright.assessment-live.config.ts A27_LIVE_MANIFEST=<저장소 밖 manifest> node assessment/run.mjs
// 기본 설정과 같은 일회용 MySQL·Backend·Stub 을 쓰고, 다른 점은 둘뿐이다:
//  1) 시험 폴더 assessment/live-replay
//  2) Backend 에 시연 명단(합성 학교 sch_demo_*)을 켠다 — 학교 2곳을 서로 다른 학교 ID 로 격리하려고(애플리케이션 기본값은 계속 false)
//     + 부록 L: E2E 전용 추가 명단(assessment/fixtures/e2e-roster-hanbit-paju.json — '한빛고등학교' 합성 학생 1명)
const manifest = process.env.A27_LIVE_MANIFEST ?? ''
if (!manifest) {
  throw new Error('실측 재현 E2E는 A27_LIVE_MANIFEST(저장소 밖 실측 manifest 경로)가 필요합니다.')
}
const servers = Array.isArray(base.webServer) ? base.webServer : [base.webServer!]

export default {
  ...base,
  testDir: './assessment/live-replay',
  webServer: servers.map((server) =>
    server.command.includes('gradlew')
      ? {
          ...server,
          env: {
            ...server.env,
            ASSESSMENT_DEMO_ROSTER_ENABLED: 'true',
            // 부록 L: 일회용 E2E 전용 합성 학생(학교 이름 '한빛고등학교' — 파주 한빛고 실측 원본을 이름 치환 없이 연결). 실존 학생 아님
            ASSESSMENT_DEMO_ROSTER_E2E_EXTRA_FILE: fileURLToPath(new URL('./assessment/fixtures/e2e-roster-hanbit-paju.json', import.meta.url)),
          },
        }
      : server),
}
