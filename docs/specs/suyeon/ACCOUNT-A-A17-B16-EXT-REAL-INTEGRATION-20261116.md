# [계정 A] A17 — B16 확장 분석기 실제 HTTP·DB·React 최종 로컬 통합 (2026-11-16)

> 상태 표기: **완료(실제 B16 HTTP)** / **완료(실제 B16 HTTP + React 화면)** / **완료(시험)** / **미실행** / **후속**
> [실제] 계정 B B16 확정 Commit `aa58cb0`을 `git archive`로 스크래치 폴더에 꺼내 A17 전용 포트에서 실행 → 실제 HTTP → 계정 A Backend(일회용 DB) · [화면] 같은 Backend에 붙인 Admin·Student Vite + Playwright(Edge) · [IT] Testcontainers · [E2E] Playwright(분석기 Stub)

## 1. 시작 상태

- 계정 A: Branch `feature/assessment-student-integration-enhancement`, HEAD `49da3b2`(A16 보고서), Stage 없음, 다른 담당자 미Commit 68건 그대로(변경·Stage 안 함).
- 계정 B: HEAD `aa58cb0`(B16 보고서·인수인계), 시작 시 작업 트리 깨끗. 작업 중 B17 미Commit 변경이 새로 생겼다(계정 B 작업 — 이번 실행과 무관, 아래 §13).
- Docker 데몬 실행 중, 실행 중인 컨테이너 없음. 여유 메모리 약 3.2GB → 무거운 작업은 하나씩 순서대로 실행했다.
- 읽은 문서: A16 보고서, B16 인수인계서 `B16-ACCOUNT-A-EXT-HANDOFF-20261116.md`(Commit 판).

## 2. B16 확정 코드 실행 방식

| 항목 | 값 |
|---|---|
| 코드 | `git -C <계정 B> archive aa58cb0` → 스크래치 폴더(계정 B 저장소·작업 트리에 쓰지 않음, `-B`로 바이트코드 미생성) |
| 실행기 | 계정 B의 기존 가상환경 Python(읽기 전용 사용), `-I -B -X utf8 tools/service/analysis_service.py` |
| 포트·Flag | `127.0.0.1:18869`, `--enable-contract03 --enable-contract03-b13 --enable-contract03-ext --timeout 280` |
| 토큰 | 실행마다 무작위, 환경 변수 `CURRICULUM_ANALYSIS_TOKEN`만. 시작 로그 `tokenSource: env`, `tokenFile: null`, `contract03Ext: true` |
| Backend | `127.0.0.1:18193`, 일회용 MySQL `lh_a17_real`(tmpfs, `127.0.0.1:33362`, 무작위 비밀번호, 실행 스크립트가 DB 이름·포트가 다르면 기동 거부), `contract03-version=v21.10-b16-dev` |
| 원문 | 로컬 공개 코퍼스에서 계정 B 목록 SHA-256으로 찾은 9문서. 외부 서버(Railway 포함)로 보내지 않았다 |

## 3. 실제 확장 HTTP 응답 — **완료(실제 B16 HTTP)**

9문서 모두 `201`, 프로필 `v21.10-b16-dev`. 과목·수행·채점 요소·운영계획 행 수는 A16(B13)과 같다.

| 문서 | 상태 | 과목 | 수행 | 채점 요소 | 운영계획 | `maxScore` | `linkReview` | `grades` 과목(분포) |
|---|---|---|---|---|---|---|---|---|
| F02455 PDF | PARTIAL | 13 | 18 | 35 | 106 | **35** | **17** | 13 (1학년 13) |
| F01664 PDF | PARTIAL | 40 | 118 | 0 | 0 | 0 | 0 | **40** (1학년 12·2학년 17·3학년 11) |
| F04902 PDF | PARTIAL | 10 | 18 | 0 | 0 | 0 | 0 | 10 (1학년) |
| F01657 HWP | PARTIAL | 13 | 45 | 0 | 266 | 0 | 0 | 12 (1학년 11·1·2·3학년 1, 근거 없음 1) |
| F01673 HWP | PARTIAL | 28 | 0 | 0 | 549 | 0 | 0 | 28 (3학년) |
| F01781 HWP | PARTIAL | 11 | 6 | 26 | 158 | 0 | 0 | 0 (근거 없음 11) |
| F01912 PDF | PARTIAL | 12 | 39 | 70 | 122 | 0 | **18** | 12 (1학년) |
| F02099 HWPX | PARTIAL | 1 | 0 | 0 | 24 | 0 | 0 | 1 (3학년) |
| F00554 스캔 PDF | FAILED | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

- B16 인수인계서 표(다과목 PDF 35·17·13, 과목 열 PDF 학년 40, HWP 요약표 12·근거 없음 1, 끝 달 생략 PDF 연결 확인 18, 달을 넘는 주차 문서 근거 없음 11)와 같다.
- `maxScore` 35개 모두 0~1000(Backend DTO 검증 통과), `linkReview`는 모두 `REVIEW_REQUIRED`(다른 값 0), `linkReview` 35개 모두 원문 Locator가 있다.

**B13 하위 호환 (같은 B16 분석기, 계정 A만 `v21.9-b13-dev`로 요청)**: 9문서 모두 201, 확장 필드 0. 응답에서 `rubric[].maxScore`·`rubric[].linkReview`·`subjects[].grades`만 빼면 **B16 응답과 9/9 같다**(정렬 JSON SHA-256 비교, 항목 단위 `items[].maxScore`(만점)는 기존 필드라 그대로 둠). 즉 확장 필드 외 원문 분석 내용은 보존됐다.

**확장 Flag OFF**: 같은 B16 코드를 `--enable-contract03-ext` 없이 실행하고 계정 A가 B16을 요청 → `422 PLAN_ANALYSIS_UNSUPPORTED (analyzer_rejected:contract03_experimental_disabled)`, 그 Revision의 Run 0건(DB 확인). B13 결과로 대체되지 않는다.

## 4. `maxScore` — **완료(실제 B16 HTTP + React 화면)**

`e2e/assessment-real/b16-ext.spec.ts` 첫 시험(실제 F02455, 매번 새 문서 등록 → 실제 분석):

1. 실제 응답에서 요소 배점이 있는 채점표(요소 2개 이상)를 고른다.
2. Wizard 수행평가 검토: 후보 '요소 배점 N점'(N = 실제 응답 값) 표시.
3. 채점기준 보완 편집기: 후보 배점이 미리 채워짐 → 첫 배점을 N+1로 수정, 다른 요소 배점은 **비움**(0과 다름) → '요소 배점 N+1점', 서버 임시 저장.
4. 원문 대조 첨부·확인 → 최종 확정.
5. 저장값(관리자 상세 확정값): 수정 배점 = N+1, 비운 요소 = `null`, 확정 채점표에 `linkReview` 없음.
6. 학생 화면 '배점 N+1점', 학생 API에 `linkReview`·`grades` 없음.

수준 점수(`levels[].score`)와 섞이지 않는다: F02455 요소 배점 35개는 수준 점수가 없는 '요소 | 배점' 가로형이고(`levelScoreCriteria` 0), F01912는 수준 점수 70개·요소 배점 0개로 따로 온다.

## 5. `linkReview` — **완료(실제 B16 HTTP + React 화면)**

- 실제 F02455 17개·F01912 18개, 모두 `"REVIEW_REQUIRED"`, 모두 원문 Locator 있음.
- Wizard 수행평가 검토에서 '연결 확인 필요' 배지 표시(실제 F02455, 화면 캡처).
- 확정 채점표·학생 응답에 `linkReview` 없음(API 문자열 검사).

## 6. `grades` — **완료(실제 B16 HTTP + React 화면)**

- **원문 학년 표시**: 실제 F02455 과목 카드에 '원문 1학년', 충돌 안내 0. 실제 F01664 과목 카드 40개 모두 원문 학년 표시.
- **문서 학년 충돌(실제 데이터에서 발생)**: 시험 슬롯은 1학년인데,
  - F01664: 2·3학년 과목 28개에 Wizard '확정할 수 없어요' 안내 28개, 서버 평가정보 확정 `400 reviewedSubjects[0].analysisSubjectIndex: grade_conflict`.
  - F02099 HWPX(원문 3학년): 운영계획 24행 확정 `400 rows[n].subjectIndex: grade_conflict`(24/24), 학생 404.
  - 1학년 과목(F01664 #6)은 정상 확정·학생 공개.
- **학년 근거 없음**: F01781(11과목 모두 근거 없음)은 기존처럼 판단하지 않고 운영계획 확정·학생 공개(§10).
- **동명 과목 다른 학년 정책**: B16도 과목 반복 구간은 B13처럼 보내지 않아 실제 응답에는 해당 사례가 없다. A15 규칙(합성 Fixture 시험)은 그대로이고, 계정 A는 보내지 않은 과목을 만들지 않았다.
- **3학년 슬롯 확정 불가(시연 고려)**: 같은 F02099를 `school_001/2026/3학년/2학기`에 올리면 개발용 Mock 학업 원천에 그 슬롯 과목이 없어(`available=false`) 확정할 수 없다. Mock은 `school_001` 1학년 슬롯만 둔다(2024~2026). Mock을 늘리지 않았다 — 실제 학교·학년 원천은 1팀 연결 사항(API-OD-A01).

## 7. F01664 회귀 — **완료(실제 B16 HTTP)**

- B16·B13 모두 201, 40과목·수행 118, 문서 11쪽, PDF 근거 437개 모두 문서 안.
- 본문 범위 밖 과목 근거 22과목·22개 보존(B16 보고와 같음 — 실제 쪽은 1·3·7쪽 머리글로, A15 보고서의 '1쪽' 표현을 정정한다).
- 평가정보 확정(머리글 근거가 있는 1학년 과목) → 학생 공개, 분석 과목 번호 미노출, 인증 없음 401.

## 8. Source SHA·Locator·DB 저장

| 항목 | 결과 |
|---|---|
| 원문 SHA | 9/9 등록 SHA = 계정 B 목록, 원문 내려받기 SHA 9/9 일치(B16·B13 각각) |
| PDF Locator | F02455 828·F01664 437·F04902 54·F01912 1,502개 모두 문서 쪽 수 안 |
| HWP·HWPX Locator | 2,300 + 4,089 + 1,542 + 122 = 8,053/8,053 원문 구조 위치와 일치 |
| GET 재조회 | POST 응답과 분석 ID·과목 수 9/9 같음 |
| DB(정리 직전) | Run: B16 PARTIAL 12·FAILED 1, B13 PARTIAL 8·FAILED 1 / 운영계획 확정 행 `ANALYSIS·CONFIRMED` 284 / 평가정보 확정 3 |

## 9. 관리자 React Wizard — **완료(실제 B16 HTTP + React 화면)**

- 설정: `e2e/playwright.assessment-real.config.ts`(신규, opt-in). 서버를 띄우지 않고 실행자가 넘긴 주소(`ASSESSMENT_REAL_*`)와 저장소 밖 원문 목록 JSON만 쓴다. 기본 Stub E2E 설정과 분리했다.
- 결과: **2/2 통과**(19.7초, Edge).
  1. F02455: 원문 학년 → 연결 확인 필요 배지 → 요소 배점 후보 → 수정·비우기 → 확정 → 학생 배점(§4)
  2. F01664: 40과목 원문 학년·충돌 안내 28 → 서버 `grade_conflict`
- 화면 캡처(`e2e/test-results/a17-real-*.png`, 커밋 안 함)에서 기존 Admin 사이드바(학생 케어 포함)가 그대로이고, 과목 머리에 '원문 1학년'이 보인다.

## 10. 학생 확정 조회 — **완료(실제 B16 HTTP)**

| 시나리오 | 결과 |
|---|---|
| F01664 평가정보(1학년 과목) | 학생 200, 값 일치, 근거 2쪽, 확장 필드·분석 후보 없음 |
| F02455 채점표 | 학생 '배점 N+1점'(§4) |
| F01912 운영계획 4과목 64행 | 학생 64행, `WEEK_UNRESOLVED` 1·`MONTH_RANGE` 21·`WEEK_IN_MONTH` 34·`UNKNOWN` 8 그대로, 원문 주 표기 64/64, 범위 행에 만든 날짜·주 번호 0, 확장 필드 없음 |
| F01781 HWP 운영계획 4과목 66행(`MONTH_RANGE` 24) | 학생 66행, PDF 쪽 0(위치를 쪽으로 바꾸지 않음), 확장 필드 없음 |
| F00554 FAILED | 평가정보·운영계획 확정 `400 analysis_failed`, 학생 404 |
| F01781 HWP 평가정보 | (A16 확인) `verified_auth_required` 보호 유지 — 이번에도 켜지 않았다 |

## 11. 기존 기능 회귀

A17은 Backend·Frontend 앱 코드를 바꾸지 않았다(시험 설정·시험·계약 문구만). 아래는 전체 재실행 결과다.

| 범위 | 결과 |
|---|---|
| A14 관리자 운영계획 추가 행·수정·제외·복원·재확정, A13 재검토·재확정·이력 불변, A12 채점기준 수동 보완 | E2E `a12`·`a13`·`a14` 통과, IT `TeachingPlanReviewApiTest` 등 통과 |
| 학생 수행평가·Monthly Planner·노트·파일·피드백·성장 기록 | E2E `a12`·`a13`·`teaching-plan` 통과 |
| 인증·권한 | 기존 IT 권한 시험 포함 전체 통과(이번에 새 권한 시험은 추가하지 않음), 실제 실행에서 학생 인증 없음 401 |
| HWP·HWPX 평가정보 `verified_auth_required` | 설정 그대로(기본 false), IT 통과 |
| Student Care | Unit 145·Integration 77 실패 0, 코드·화면·Migration 변경 없음. Playwright Student Care E2E는 **미실행**(Wangyu 절차·`/api/test/reset` 사용, 이번 변경과 무관) |

참고: 첫 Backend 회귀 명령은 Gradle이 '변경 없음(up-to-date)'으로 판단해 시험을 다시 돌리지 않았다(2초). 그 수치는 쓰지 않고 `cleanTest cleanIntegrationTest`로 결과를 지운 뒤 다시 실행한 결과(9분 22초)만 기록한다.

## 12. 전체 시험 수

| 범위 | 결과 | 분석기 |
|---|---|---|
| Backend Unit | **317건, 실패 0**(생략 1 = 기본 꺼진 코퍼스 도구) | — |
| Backend Integration | **201건, 실패 0** | Stub·합성 |
| Assessment E2E | **22/22**(2.3분, Edge) | **Stub** |
| **실제 B16 화면 시험(신규)** | **2/2**(19.7초, Edge) | **실제 B16** |
| 실제 B16 HTTP 드라이버 | 9문서 201, 확정·학생 시나리오 5종 + 학년 충돌 | 실제 B16 |
| 실제 B13 하위 호환 | 9문서 201, 확장 필드 제외 9/9 동일 | 실제 B16 코드의 B13 프로필 |
| 확장 Flag OFF | 422 대체 없음, 저장 0 | 실제 B16(ext OFF) |
| F02099 학년 충돌 | 1학년 슬롯 24/24 `grade_conflict`, 3학년 슬롯은 Mock 원천 없음 | 실제 B16 |
| Frontend typecheck·lint·build | 통과(student·admin·shared), e2e typecheck 통과 | — |

A16 대비 Backend 시험 수는 같다(앱 코드 변경 없음). 새 시험은 실제 분석기 opt-in 화면 시험 2건이다.

## 13. 시연 DB 미변경

- `learnershigh-mysql`: 작업 전후 `Exited (0)`, 마지막 실행 2026-11-15 21:42~21:44(UTC) 그대로.
- Flyway는 일회용 `lh_a17_real`·Testcontainers·E2E 일회용 DB에만 적용. **A14 `V202611160200`은 시연 DB에 적용되지 않았다**(승인 대기). 새 Migration 없음.
- 정리: A17 Backend(3회 기동)·분석기(3회)·Vite 2개 종료(남은 Java·Node 하위 프로세스는 로그의 PID·명령줄을 확인한 뒤 종료), `lh-a17-real-mysql` 삭제, 포트 18869·18193·33362·5393·5394 닫힘 확인.
- 계정 B 저장소에 쓰지 않았다. 작업 중 생긴 미Commit 항목(`b17-*`, `tools/*` 수정)은 계정 B의 B17 작업이다. 다른 컨테이너는 만지지 않았다.

## 14. Commit·Bundle

| Commit | 내용 |
|---|---|
| `3ab3257` | 실제 분석기 opt-in Playwright 설정·시험, `e2e/tsconfig.json` 포함 경로 |
| `6d487d3` | `api-contract.md` §39-12 상태(B16 실제 수신 확인, 확장 Flag OFF 거절) — 계약 모양 변경 없음 |
| (이 보고서) | docs: A17 보고서 |

- 위 파일만 골라 Stage했다(다른 미Commit 파일 그대로).
- Bundle: `~/.learnershigh-extension/backups/a17-feature-assessment-20261116.bundle`(보고서 Commit 뒤 생성·`git bundle verify`).
- 실측 수치(원문 글자 없음)는 저장소 밖 스크래치 폴더 `a17/result-b16.json`·`result-b13.json`·`compare-b16-b13.json`·`f02099-grade.json`에 두었다.

GitHub Push·Merge·Rebase·PR 없음. `main` 변경 없음.

## 15. Railway HTTPS 통합을 위해 남은 사항

| 항목 | 내용 |
|---|---|
| 분석기 주소 | `ASSESSMENT_ANALYZER_BASE_URL`을 Railway HTTPS 주소로, 토큰은 환경 변수로만(이번과 같은 방식). 요청 모양은 같다 |
| 프로필 선택 | 시연에 `v21.10-b16-dev`를 쓸지 `v21.9-b13-dev`를 쓸지 결정. B16이면 Railway 컨테이너에 세 Flag(`ANALYZER_ENABLE_CONTRACT03`·`ANALYZER_ENABLE_B13`·`ANALYZER_ENABLE_CONTRACT03_EXT`)가 필요 — 빠지면 계정 A는 422(대체 없음) |
| Timeout | 이번 B16 로컬 최장 분석 약 17초(F01781, A16 B13 실행은 약 22초). 원격 지연 포함 `assessment.analyzer.timeout-millis`·분석기 `--timeout` 재확인 |
| 원문 전송 | Railway에는 공개 코퍼스 문서만 보낸다는 운영 원칙 확인(이번 로컬 검증은 외부 전송 0) |
| 학년 슬롯 | B16 학년 때문에 2·3학년 과목·문서는 1학년 Mock 슬롯에서 확정되지 않는다 — 시연 문서·슬롯 선택 필요(실제 원천은 1팀) |
| 실제 분석기 화면 시험 | `playwright.assessment-real.config.ts`를 Railway 주소에 연결한 Backend로 다시 실행 |
| 그 밖의 대기 | 40과목 상한(사용자 결정), 시연 DB A14 Migration(사용자 승인), HWP·HWPX 평가정보 공식 확정(실제 인증 연동), 동명 과목 반복 구간(계정 B 후속), Student Care Playwright E2E(미실행) |
