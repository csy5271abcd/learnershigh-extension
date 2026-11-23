# [계정 A] A14 — 운영계획 관리자 직접 추가 행 및 Assessment 최종 기능 검증 (2026-11-16)

> 상태 표기: **실제 API·DB·Frontend·E2E 완료** / **구현 완료·검증 미완료** / **부분 구현** / **외부 계약 의존** / **사용자 결정에 따라 범위 제외**
> [IT] Backend 통합 시험(Testcontainers MySQL, 빈 DB에 전체 Migration) · [E2E] Playwright(Edge), 일회용 DB의 실제 Backend·Storage, **분석기만 Stub**(합성 0.3 결과: 과목 1개·후보 9행) · [일회용 DB] 시연 DB 백업 복원본

## 1. 시작 상태

- Branch `feature/assessment-student-integration-enhancement`, 시작 HEAD `5c16fd5`(A13 보고서), 원격보다 64 Commit 앞섬, Stage된 파일 없음.
- 다른 담당자·이전 작업의 미Commit 파일(`.claude/rules/*`, 루트 문서, ADR, `docs/architecture/*`, `scripts/*`(새 `scripts/CLAUDE.md` 포함), seed·증거 폴더, `backend/bin/`, `references/**`)은 손대지 않았고 Stage하지 않았다.
- 계정 B 분석기 저장소·실행 서비스, Wangyu Student Care 코드, 기존 LearnersHigh 수행평가 기능은 변경하지 않았다. 시연 DB 컨테이너(`learnershigh-mysql`)는 이번 작업 내내 꺼져 있었다(켜지 않음).

## 2. 변경 파일

| 구분 | 파일 |
|---|---|
| Migration | `database/migrations/V202611160200__assessment_teaching_plan_manual_rows.sql` (신규) |
| Backend | `TeachingPlanManualRowRequest`(신규), `TeachingPlanManualRows`(신규, 규칙), `PlanReviewDraftService`, `TeachingPlanReviewService`, `TeachingPlanQueryService`, `TeachingPlanReview`, `TeachingPlanReviewRow`, `PlanReviewDraftResponse`, `TeachingPlanReviewRequest`, `TeachingPlanReviewResponse`, `AdminEvaluationPlanController` · 회귀 수정 `EvaluationPlanService` |
| Backend 시험 | `TeachingPlanReviewApiTest` (+2) |
| Frontend(관리자) | `TeachingPlanManualRowForm.tsx`(신규), `manualRowErrors.ts`(신규), `TeachingPlanStep.tsx`, `useServerDraft.ts`, `TeachingPlanHistoryPanel.tsx`, `api/types.ts`, `api/http/assessmentAdminHttp.ts`, `api/assessmentAdminApi.ts` |
| E2E | `e2e/assessment/tests/a14-flows.spec.ts` (신규, 2건) |
| 계약 | `docs/api/api-contract.md` §39-11(신규), §39-10 문구 |

학생 Frontend는 바꾸지 않았다(학생 응답 모양이 그대로라 필요 없음).

## 3. 신규 행 데이터 구조

- **초안(학생 비공개)**: 운영계획 초안의 `payload_json`에 `manualRows[]`를 추가했다(기존 초안 JSON에는 없음 → 빈 목록, Migration 불필요). 행 = `{ rowKey, origin:"MANUAL", subjectIndex, status: INCLUDED|EXCLUDED, unit, content, note, specialSchedule, achievementStandards[], teachingMethods[], assessmentMethods[], schedule, pdfPageNumber, createdBy/At, updatedBy/At }`.
- **확정 행**: 기존 `assessment_plan_teaching_plan_row`에 `row_origin`(ANALYSIS|MANUAL)을 추가했다. 관리자 추가 행은 `candidate_json = NULL`이고 결정은 `CONFIRMED`·`EXCLUDED`만 가진다(DB CHECK). 행 JSON은 §39-3 행 모양에 `origin:"MANUAL"`·`manualPdfPageNumber`를 더하고 `sources: []`로 둔다.
- **식별자**: 서버가 `manual_` + 16자리를 발급한다. 같은 과목의 분석 후보 `rowKey`나 기존 추가 행 키와 겹치면 다시 뽑는다. 재검토·재확정에서도 같은 키를 유지한다. 요청으로 키를 정할 수 없고, 확정 행 UNIQUE(review, 과목 슬롯, rowKey)는 그대로다.
- **월·주차**: 관리자가 고른 `schedule`(§39-3 정밀도 8종)만 저장하고, 행의 `month`·`weekFrom` 등은 그 값을 그대로 옮긴다. 서버는 월·주차를 추정하지 않고, 계정 B 주차 해석 규칙과도 무관하다.

## 4. 기존 분석 후보 행과의 구분 — **실제 API·DB·Frontend·E2E 완료**

| | 분석 후보 행 | 관리자 직접 추가 행 |
|---|---|---|
| 원천 | 분석 결과(Run, 불변) | 운영계획 초안(관리자 입력) |
| 키 | 분석기 `rowKey` | 서버 발급 `manual_…` |
| 확정 행 | `row_origin=ANALYSIS`, `candidate_json` 필수 | `row_origin=MANUAL`, `candidate_json` NULL |
| 원문 근거 | `sources`(분석 Locator) · 근거 버튼 | `sources: []`. 관리자가 확인한 PDF 쪽만 `manualPdfPageNumber`에 두고, 화면에는 '관리자 확인 N쪽' 또는 '원문 근거 없음'으로 표시 |
| 결정 | 확인·수정·제외 | 공개(INCLUDED)·제외(EXCLUDED), 수정은 새 내용 |

[IT]에서 분석 결과(Run) `result_json`에 추가 행이 들어가지 않았는지 확인했고, DB 제약도 확인했다(후보를 가진 MANUAL 행·EDITED MANUAL 행·후보 없는 ANALYSIS 행·알 수 없는 출처는 모두 거절).

## 5. Backend API 변경 (§39-11)

| API | 내용 |
|---|---|
| `POST …/teaching-plan-draft/manual-rows` | 새 행. `{analysisId, baseVersion, row}` → 초안 응답(`draft.manualRows`) |
| `PUT …/teaching-plan-draft/manual-rows/{rowKey}` | 수정·제외·복원(`status`). 이 초안에 없는 키는 404, 과목 슬롯 변경은 400 |
| `PUT …/teaching-plan-draft` | 요청 모양은 그대로. 추가 행은 **보존**(자동 저장이 지우지 않음) |
| `PUT …/teaching-plan-review` | 선택 `manualRows[{rowKey, subjectIndex, subjectId, decision}]`. 내용은 열린 초안에서 가져온다. 이제 `rows` 0행도 허용(후보 행 + 추가 행 합 ≥ 1) |
| `GET …/teaching-plan-review` · `…/teaching-plan-reviews` | 확정 행에 `origin` 추가(추가 행의 `candidate`는 null) |
| 학생 `GET …/{planId}/teaching-plan` | 모양 변경 없음 |

- **보호 규칙**
  - 최신 분석 결과만 받는다.
  - 확정된 운영계획은 재검토 중에만 고칠 수 있다.
  - `baseVersion` 낙관적 잠금(기존 초안 체계 재사용)을 쓴다. 같은 생성 요청을 다시 보내면 409라서 중복 행이 생기지 않는다.
  - 다른 과목·다른 Revision·위조 키는 거절한다.
  - 확정 버전은 INSERT만 한다(UPDATE 없음).
- **범위 밖**: 분석 실패나 운영계획 후보가 0행인 문서는 `no_teaching_plan`으로 거절한다. 수동으로 운영계획 전체를 작성하는 기능은 이번 범위가 아니다.
- **평가정보 API·Student Care API**: 변경 없음.

## 6. Frontend UI 변경 — **실제 API·DB·Frontend·E2E 완료**

- **위치**: 운영계획 단계의 과목별 후보 표 아래에 **'+ 새 행 추가'** 버튼과 입력 양식이 있다. 최초 검토 중과 재검토 중 모두 쓸 수 있다.
- **입력 양식**
  - 항목: 시기 단위(월·주차 / 월 / 여러 달 / 학기 주차 / 시기 없음), 월, 주차, 원문 표기, 단원, 학습 내용, 성취기준, 교수·학습 방법, 평가 방법, 특별 일정, 비고, 원문 쪽.
  - 원문 쪽은 PDF일 때만 받고, 쪽 수 안이어야 한다.
  - 화면 검증은 서버 규칙과 같고, 서버 오류는 필드별 한국어 문구로 보여 준다. 충돌(409)이 나면 새로 고침을 안내한다.
  - 저장 중에는 버튼이 '저장하는 중…'으로 바뀌고 다시 누를 수 없다. 저장에 실패해도 입력값은 남는다.
- **관리자 추가 행 표**
  - 분석 후보 표와 따로 보여 주고, '관리자 추가' 표시를 붙인다.
  - 수정·제외·복원 버튼이 있고, 제외한 행은 흐리게 보인다.
  - 행 결정 저장이 끝나기 전에는 추가 행 저장을 막고 이유를 표시한다(같은 초안 version을 두 저장이 다투지 않게).
- **달력 미리보기와 확정 버튼**: 공개 예정인 추가 행이 달력 미리보기에 들어가고, 확정 버튼의 공개 행 수에도 더해진다.
- **확정 이력**: 버전별 행 보기에서 추가 행을 '관리자 추가'로 표시한다.

## 7. 초안 저장·수정·제외·복원 — **완료**

- [IT]
  - 생성(키 발급), 같은 요청 재시도 409(행 1개 유지), 행 결정 자동 저장 뒤에도 보존, 다른 관리자 GET에서 복구.
  - 수정 뒤에도 작성자 유지, 제외·복원.
- [E2E A·D]
  - 화면 생성, 새로고침 뒤 후보 결정 2행과 추가 행 1행 유지.
  - 빈 필수값·범위 밖 쪽·거꾸로 된 주차는 화면에서 막히고 입력값이 남은 상태에서 고쳐 저장.

## 8. 최초 확정 — **완료**

- [IT] 후보 T01 + 추가 행 M1로 1차 확정 → 학생에게 2행(M1의 월 3·주차 3·WEEK_IN_MONTH·관리자 확인 1쪽).
- [E2E A] 후보 2행 + 추가 1행 → 새로고침 → 확정 → 학생 3행(추가 행: 10월 3주·1쪽·`manual_` 키).

## 9. 재검토·재확정 — **완료**

[IT] 다음 순서로 확정 버전을 쌓았다(A·B·C 시나리오).

| 단계 | 조작 | 학생에게 보이는 행 |
|---|---|---|
| 재검토 시작 | 같은 키로 M1이 초안에 다시 들어옴 | 1차 그대로 |
| 2차 | M1 수정 + M2 추가 | T01·M1(수정본)·M2 |
| 3차 | M1 제외 | T01·M2 |
| 4차 | M1 복원 | T01·M1·M2 |

- 확정 버튼이 보낸 결정이 초안 상태와 다르면(화면이 오래된 경우) 400 `decision: conflict`로 거절한다.
- [E2E A·B·C] 화면에서 같은 흐름을 확인했다(재검토 → 수정·추가 → 2차 → 제외 → 3차 → 복원 → 4차). 수정본도 같은 키를 유지했다.

## 10. 과거 Version 보존 — **완료**

- [IT] 4·3·2·1차 이력에서 버전마다 그 시점의 추가 행이 그대로 남았다.
  - 1차: M1 '세포 분열'
  - 2차: M1 '세포 분열과 염색체'
  - 3차: M1 제외(제외 1)
  - 4차: M1 공개
- 확정 행 7개는 `MANUAL`·후보 없음, 4개는 `ANALYSIS`·후보 있음이었다.
- [E2E] 1차 이력의 행 보기에서 '관리자 추가'와 원래 단원을 확인했고, 수정본은 나오지 않았다. 이력 API에서 M2의 결정은 4차 확정, 3차 제외, 2차 확정, 1차 없음이었다.

## 11. 학생 Monthly Planner — **완료**

- 추가 행은 초안 단계에서 학생에게 보이지 않고(404 또는 `NOT_CONFIRMED`), 최초 확정 뒤에 보인다.
- 재검토 중에는 이전 확정본이 그대로 보이고, 재확정하면 최신본이 보인다. 제외한 행은 보이지 않고, 복원한 행은 다시 보인다.
- 학생 응답에는 버전·출처(`MANUAL`)·제외 행이 없다. 다른 학교·과목의 행은 섞이지 않는다(과목 슬롯·과목 ID 검증).
- 운영계획 행으로 수행평가 과제를 만들지 않는다.
- Planner 화면이 열리는 것은 [E2E]에서 확인했다. 학기 밖 월·정밀도 표시 규칙은 기존 Planner 그대로다.

## 12. 신규 Migration 필요 여부 — **필요함(작성)**

- **필요한 이유**
  - 기존 확정 행은 `candidate_json NOT NULL`이고 출처 컬럼이 없다. 그래서 Migration 없이는 관리자 추가 행에 가짜 후보 JSON을 넣거나 행 JSON 안에만 출처를 둬야 한다.
  - 그렇게 하면 DB가 두 행의 구분을 보장하지 못해 무결성이 약해진다. 초안 쪽은 JSON 필드만 늘리면 되어 Migration이 필요 없다.
- **`V202611160200` 내용**
  - `row_origin VARCHAR(20) NOT NULL DEFAULT 'ANALYSIS'`를 추가한다(기존 행은 모두 ANALYSIS).
  - `candidate_json`을 NULL 허용으로 바꾼다.
  - CHECK 2개를 추가한다(출처 값, 출처별 후보·결정 규칙).
- 기존 Migration은 수정하지 않았다. 데이터 삭제·변경은 없다(컬럼 추가와 제약 완화·추가만 한다).

## 13. 일회용 DB 검증 — **완료**

| 검증 | 결과 |
|---|---|
| 빈 DB 전체 적용(Testcontainers) | Integration 전체 197/0 |
| 시연 DB 백업(A13, sha256 `09ae099b…` 일치) → 일회용 MySQL(tmpfs) 복원 | 26개 테이블 건수가 A13 복원 기록과 일치 |
| 1단계: 시연 DB 현재 버전까지(`V202611160100`, target 지정) | 적용 1건 |
| 복원본에만 기존 운영계획 확정 이력 Seed(1차 2행·2차 1행: CONFIRMED·EXCLUDED·EDITED) | — |
| 2단계: `V202611160200` | validate 15 → 적용 1건. 기존 확정 2버전·행 3개는 id·결정·`row_json`·`candidate_json` md5까지 **동일**, 출처는 모두 ANALYSIS. 건수 변화는 `flyway_schema_history` +1뿐 |
| 1·2·3차 회귀 | 3차 버전에 ANALYSIS 행 + MANUAL 행 저장 성공. 잘못된 행 4종은 CHECK 3819로 거절 |
| 재기동 | Flyway validate 15 통과, "up to date" |
| 정리 | 일회용 컨테이너 삭제. 시연 DB·원문 Storage는 건드리지 않음 |

## 14. 시연 DB 적용 여부 — **적용하지 않음(승인 필요)**

- **이유**: A13 승인은 `V202611160100`에만 해당한다. A14 지시에 따라 새 Migration은 별도 승인 없이 적용하지 않았다.
- **적용하면 바뀌는 것**
  - 대상은 `lh_demo_manual_20261111`(현재 v202611160100, 운영계획 확정 0건)이다.
  - 확정 행 테이블에 컬럼 1개가 생기고, `candidate_json`이 NULL 허용으로 바뀌고, CHECK 2개가 추가된다. Flyway 이력은 +1건이다.
  - 데이터 변경은 없다(확정 행 0건).
  - 절차는 A13과 같다(백업 → 복원 검증 → 적용 → 건수 비교).
- **주의**: 이 Backend는 기동할 때 Flyway가 자동으로 migrate한다(Spring Boot 기본값, 일회용 DB 검증에서 확인). 그래서 A14 코드로 시연 DB에 Backend를 띄우면 그 순간 `V202611160200`이 적용된다. 승인 전에는 A14 코드로 시연 DB에 Backend를 띄우지 않아야 한다.

## 15. API 계약 변경 사항

- `api-contract.md`에 §39-11을 새로 썼고, §39-10의 '이번 범위 밖' 문구를 §39-11 안내로 바꿨다. 기존 요청·응답은 그대로 동작하고, 필드는 추가만 했다(선택 `manualRows`, 응답 `draft.manualRows`, `RowView.origin`). `rows` 최소 1행 조건은 '후보 행 + 추가 행 합 ≥ 1'로 완화했다.
- 공유 문서(OWNERSHIP §6 Shared) 변경의 영향 범위는 Assessment 운영계획 구간(§39)과 Assessment 테이블 1개뿐이다. Student Care·상담 API와 테이블에는 영향이 없다.

## 16. 전체 Unit·Integration

| 범위 | 결과 |
|---|---|
| Backend Unit | **305건, 실패 0** (생략 1 = 기본 꺼진 코퍼스 덤프 도구) |
| Backend Integration 전체(`--rerun-tasks`) | **197건, 실패 0** (신규 2: 추가 행 전체 흐름, 잘못된 입력) |

- **회귀 수정**: 첫 전체 실행에서 `AnalyzerV211ImportAndItemKeyApiTest` 1건이 409로 실패했다.
- **원인**: 고정 시계라 같은 Revision의 분석 Run 3개가 같은 수신 시각을 가졌다. 그래서 최신 Run이 무작위 ID 순서로 정해졌다(4회 중 1회 실패로 재현). A14 변경과는 무관하지만, A12에서 넣은 재검토 단계가 드러낸 실제 모호성이다.
- **수정과 확인**: 같은 Revision의 새 Run은 이전 Run보다 항상 뒤 시각(+1µs)으로 받게 했다(A12·A13 확정 시각과 같은 규칙). 수정 뒤 6회 연속 통과했다. 시험 조건은 약화하지 않았다.

## 17. Frontend 검사

student·admin·shared 3개 Workspace 모두 typecheck(오류 0)·oxlint `--deny-warnings`·build를 통과했다.

## 18. Assessment E2E

| 실행 | 결과 |
|---|---|
| 신규 `a14-flows` 단독 | 2/2 |
| 전체 Assessment E2E | **21/21** (기존 19 + 신규 2) |
| 운영계획 관련(a13·a14·teaching-plan) 3회 반복 | 21/21 |

- **이 E2E의 범위**: 분석기는 Stub(합성 0.3)이고, Backend·DB·Storage·화면은 실제다. 실제 분석기 E2E는 이번에 실행하지 않았다(계정 B B13 진행 중이라 분석기 서비스를 쓰거나 바꾸지 않음).
- **중간 실패 1건과 수정**
  - 첫 전체 실행에서 A14 A·B·C가 시간 초과로 1건 실패했다. Backend 전체 시험과 동시에 실행한 상태였다.
  - Trace를 보니 개발 모드(StrictMode)에서 운영계획 초안을 처음 조회하는 요청이 두 번 나갔다. 늦게 온 응답이 그 사이 고른 과목(브라우저 백업)을 '저장되지 않은 내용'으로 잘못 보고 편집을 잠갔다. A5부터 있던 Hook의 경쟁 조건이다.
  - '마지막으로 시작한 조회만 반영'하도록 고친 뒤 위 전체 실행과 3회 반복이 모두 통과했다.

## 19. Student Care 회귀

- Backend Unit 145건·Integration 72건(결과 파일 기준) 모두 실패 0이다.
- Student Care 코드·화면·Migration·Admin Shell·공통 CSS는 변경하지 않았다. 그래서 규칙상 Student Care E2E 재실행 의무 대상이 아니며, 이번에 실행하지 않았다.

## 20. 계정 B13과 남은 연동 의존성 — **외부 계약 의존**

- 분석기 프로필·0.3 Schema·실행 서버는 변경하지 않았다.
- 다음은 B13 최종 결과를 본 뒤 별도 통합 단계에서 다룬다.
  - `rubric[].maxScore?`, `rubric[].linkReview?`, `subjects[].grades?`
  - 과목 수 40개 상한
  - 주차 범위 검증
- 관리자 추가 행은 분석 결과와 독립이다. 그래서 B13이 주차 해석을 바꾸더라도 이미 확정된 추가 행에는 영향이 없다. 다만 새 분석 결과(새 Run)가 들어오면 초안이 그 결과에 묶이므로, 이전 초안의 추가 행은 자동으로 옮겨지지 않는다(기존 초안 규칙과 같음, 아래 24 참고).

## 21·22·23. Git·백업·Push

| Commit | 내용 |
|---|---|
| `a1f7c2e` | Backend: Migration·추가 행 API·확정·이력·학생 조회·통합 시험 |
| `4e70cb0` | 회귀 수정: 분석 Run 수신 시각 단조 증가 |
| `5598517` | Frontend: 새 행 추가 양식·표·이력 표시, 초안 Hook(추가 행·최신 조회만 반영) |
| `52b75ba` | E2E `a14-flows` 2건 |
| `0247b51` | `api-contract.md` §39-11 |
| (이 보고서) | docs: A14 보고서 |

- Git Bundle은 보고서 Commit 뒤 사용자 홈 `.learnershigh-extension/backups/a14-feature-assessment-20261116.bundle`에 만들고 `git bundle verify`로 확인한다(결과는 최종 보고).
- **GitHub Push·Fetch·Merge·Rebase·PR은 실행하지 않았다.** `main`은 변경하지 않았다.

## 24. 남은 기능·차단 사유

| 항목 | 상태 |
|---|---|
| 시연 DB에 `V202611160200` 적용 | 사용자 승인 대기(§14). 승인 전에는 A14 코드로 시연 DB에 Backend를 띄우지 말 것 |
| 분석 결과가 바뀌었을 때(새 Run) 이전 초안의 추가 행을 새 결과로 옮기기 | 미구현(기존 초안 규칙: 결과가 바뀌면 이전 초안을 새 결과에 적용하지 않음). 필요하면 정책 결정 |
| 초안 단계 추가 행 **삭제** | 미구현(제외로 대신). 이력 추적을 위해 의도적으로 두지 않음 |
| 날짜 정밀도(정확한 날짜·기간)를 화면에서 입력 | API·검증은 지원, 화면 선택지에는 없음 → **부분 구현** |
| 운영계획 후보 0행 문서의 수동 전체 작성 | 지시상 범위 밖 |
| 평가계획서 운영 권한(OD-A08: 모든 학교) | 변경하지 않음. 축소하려면 별도 결정 |
| 권한 없는 관리자 역할 | 현재 Mock 인증에서는 모든 관리자가 평가계획서 운영자(OD-A08)라 '운영자 아닌 관리자'를 만들 수 없다. 인증 없음·학생 Actor 401만 검증. 실제 역할은 1팀 인증 연동 뒤 |
| 계정 B 0.3 계약 변경 | B13 결과 뒤 통합(§20) |
| 기존 LearnersHigh 수행평가 연결 | 사용자 결정에 따라 범위 제외(미완료로 추적하지 않음) |
