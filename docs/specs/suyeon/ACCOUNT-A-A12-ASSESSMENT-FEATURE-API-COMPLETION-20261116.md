# [계정 A] A12 — 관리자·학생 Assessment 기능 마무리와 실제 API 연동 (2026-11-16)

> 시작 HEAD `dcfc3e6`(A11). Push·Fetch·Merge·PR 없음 · 이력 재작성 없음 · 기존 Migration 수정 없음 · **새 Migration 없음** · Student Care·Counseling·AdminShell·계정 B 코드 변경 없음 · 0.3 Gate·다중 형식 실험 Flag·분석 수신 Flag 기본 OFF 유지 · 시연 DB 접근 없음.
> 표기: **[IT]** Backend 통합 시험(Testcontainers MySQL) · **[E2E]** Playwright, 일회용 DB의 실제 Backend·Storage, 분석기만 Stub(합성) · **[실제]** 실제 B6 분석기(`analysis-import-0.3`, `v21.4-dev`, 로컬·일회용 DB).

## 판정 기준

**완료** = Frontend·Backend·API·DB 연결 + 필요한 E2E 통과 · **Frontend 전용 완료** = 자율 심화탐구 정적 콘텐츠 · **부분 완료** · **미완료** · **외부 의존**.

## ① 관리자 기능

| 기능 | 결과 | 내용 |
|---|---|---|
| 재검토·재확정(평가 정보) | **완료** | `POST …/review-draft/reopen`(재검토 시작), `GET …/reviews`(확정 이력). 이전 확정 기록 불변, 재확정 = 새 확정 기록, 학생은 최신 기록만, 재검토 중 학생 공개값 불변. 확정 문서의 초안 저장·재확정은 재검토를 시작해야만 허용(`already_confirmed`·`re_review_not_started`). Wizard: 확정 결과 화면의 '재검토 시작'(확인 창) → 초안 편집 → '다시 확정하고 학생에게 공개', 확정 이력(n차 · 학생 공개 중 / 이전 기록(보존)). [IT·E2E·실제] |
| 재검토·재확정(운영계획) | **미완료** | `assessment_plan_teaching_plan_review`가 Revision당 1건(UNIQUE) — 새 Migration과 시연 DB 적용 승인이 필요해 이번에 하지 않았다. 지금은 운영계획 확정 뒤 수정 불가(기존 동작). |
| 채점기준 수동 보완 | **완료** | 수행평가 항목마다 '채점기준 직접 입력/수정·보완' → 채점 요소·수준별 기준·점수 추가·삭제, 근거 쪽 → 서버 공유 초안 저장(새로고침 유지) → 확정 → 학생 '세부 채점기준' 표. 확정값 경로 `performanceEvaluation.items[n].rubric`, 서버 모양 검사(`rubric_shape`). 분석 후보 채점기준은 바뀌지 않는다. [IT·E2E·실제] |
| Overview 실데이터 | **완료** | `GET /api/admin/assessment/overview` 구현(이전에는 Mock 전용). 평가계획서: 학교·문서·Revision 수, 분석 상태별(분석 전·검토 필요·일부·완료·실패), 검토 대기, 평가정보 확정, 운영계획 확정, 재검토 중. 학생·피드백: 담당 범위 학생 수, 이번 학기 수행평가 수, 피드백 대기·전달, 가장 오래된 대기. 최근 활동 10건(등록·분석·확정·운영계획 확정·피드백 요청·전달, 실제 기록 시각). 화면 KPI = API 값. 개인 심화 Task 수는 0, 모의고사 소재 수는 정적 콘텐츠라 `null`(화면은 스크랩 수만). [IT·E2E·실제] |
| 학생 기록 조회 | **완료(기존)** | 담당 범위 학생 목록·상세·학교 수행평가·노트 Revision·결과 파일·버전 열람은 A6 이전부터 http(§34·§35). 이번 E2E에서 관리자 피드백 상세(요청 당시 Snapshot)로 다시 확인. |
| 피드백 관리 | **완료(기존 API, 이번 E2E)** | 관리자 요청 목록·Snapshot 상세·답변 전달(§36). [E2E] 요청 당시 노트 r1·파일 v1만 Snapshot, 이후 수정·v2 미포함, 전달 뒤 학생 확인, 수행평가 상태 불변. 관리자 답변 **화면 조작**은 이번 E2E에 없음(API로 전달 후 학생 화면 확인). |

## ② 학생 기능

| 기능 | 결과 | 내용 |
|---|---|---|
| 학교 수행평가 | **완료** | 목록·과목·상세·등록·상태(http, 기존). [E2E] 홈 '수행평가 추가' → 저장 → 진행 상태 변경 → 새로고침 뒤 유지, API로 DB 값 확인. 기존 LearnersHigh 수행평가 Mapping은 **외부 의존**(1팀). |
| 학교 평가정보 | **완료** | 관리자 확정값만(기존) + A12 확정 채점기준 표(채점 요소 × 수준별 기준 × 점수, 원문 쪽). 다과목 문서는 과목 ID별(A10~A11). [E2E·실제] 재확정 뒤 최신값만 보임. |
| Monthly Planner | **완료(기존, 재확인)** | 확정 운영계획만·제외 행 비공개·학기 달 밖·시기 불명(A8~A11). [E2E `teaching-plan`] 재확정 후 반영은 운영계획 재확정 미구현이라 해당 없음. |
| 학교 수행평가 과정 노트 | **완료(기존 API, 이번 E2E)** | 생성·수정(낙관적 잠금 `expectedRevisionId`)·Revision 목록·과거 Revision 조회(§20·21). [E2E] 2개 Revision, 1차 본문 보존. 블록 편집기 **화면 조작**은 E2E에 없음. 템플릿은 기존 범위 그대로(이번 변경 없음). |
| 자료함·결과 파일 버전 | **완료(기존 API, 이번 E2E)** | 결과물마다 독립 v1·v2(다른 결과물은 자기 v1), 원본 바이트 그대로 내려받기, 관리자 읽기 전용. [E2E] |
| 선택형 피드백 | **완료(기존 API, 이번 E2E)** | 질문 없이 요청, Snapshot 불변, 답변 전달 → 학생 피드백 화면에서 확인. [E2E] |
| 성장 기록·보관함 | **부분 완료** | http 연결은 기존(§29·§30). 이번에는 심화 Task 선택지 제거만 했고 성장 기록 E2E는 실행하지 않았다. 삭제·복원 정책은 그대로(임의 활성화 없음). |
| 자율 심화탐구 콘텐츠 열람 | **Frontend 전용 완료** | 목록·교과 분류·검색·상세(목표·방법 예시·출처). [E2E] 서버 호출 0건, '탐구 만들기·시작' 버튼 없음, 예전 Task 주소는 목록으로 이동. |

## ③ 자율 심화탐구 기능 축소

- 사용자 결정(2026-11-16): 학생 개인 탐구 생성·진행·관리 제거, 준비된 콘텐츠 열람만.
- 이미 2026-11-03·11-11에 Route와 목록이 정적 콘텐츠로 바뀌어 있었고(`assessment-enrichment-content.md`), 이번에 **화면에 연결되지 않은 생성·진행 코드를 지웠다**: `EnrichmentTaskDetailRoute`·`MyEnrichmentTasksRoute`·`EnrichmentPanel`·`TaskExamSource`·`CreateEnrichmentModal`·`examTaskPrefill`·`NoteTargetModal`·`PersonalMaterialModal`(참조 조사: 서로만 참조), `enrichmentApi`의 Task 생성·수정·상태 변경·개인 모의고사 자료 함수, 피드백 카드의 비활성 '심화 탐구로 시작' 버튼, 성장 기록 폼의 '심화 탐구' 선택지(예전 연결은 '이전 자율 심화탐구 기록(종료된 기능)'으로만 표시, 데이터 유지).
- 유지: 정적 콘텐츠(`content/enrichmentContent.ts`)·모의고사·대학 자료 열람, 학교 수행평가 노트·자료함·파일 버전·피드백·성장 기록, 관리자 심화 콘텐츠 읽기 전용 열람, Mock Fixture(정적 원천과 관리자 열람이 공유).
- Backend: 개인 Task Entity·Table·API가 원래 없어 지운 서버 코드·데이터·Migration 없음. 기존 `ENRICHMENT_TASK` 출처 값(노트·피드백 등)은 지우지 않았다.
- 문서: `api-contract.md` §18 '사용하지 않음' 표기, `assessment-enrichment-content.md`에 A12 코드 정리 기록.

## ④ 실제 API 연동 현황

| 화면 | Frontend | Backend | API | DB/Storage | Mock 잔존 | E2E | 상태 |
|---|---|---|---|---|---|---|---|
| 관리자 평가계획서 등록·분석·검토·확정 | ○ | ○ | §38·§39 | ○ | 없음(http) | ○ | 완료 |
| 재검토·확정 이력(평가 정보) | ○ | ○ | §39-8 | ○ | 없음 | ○ | 완료 |
| 운영계획 재확정 | — | — | — | — | — | — | 미완료 |
| 채점기준 수동 보완 | ○ | ○ | §39-9 | ○ | 없음 | ○ | 완료 |
| 학년도별 열람·HWP/HWPX 미리보기 | ○ | ○ | §38-5·6 | ○ | 없음 | ○ | 완료(A9~A11) |
| 관리자 Overview | ○ | ○ | §33 | ○(집계) | http에서 없음 | ○ | 완료 |
| 관리자 학생 기록·피드백 | ○ | ○ | §34~36 | ○ | 없음 | ○(API+학생 화면) | 완료 |
| 관리자 심화 콘텐츠·모의고사·대학 자료 | ○(읽기) | — | 정적 | — | 정적 콘텐츠 | — | Frontend 전용 |
| 학생 학교 수행평가 | ○ | ○ | §9·§34 | ○ | 없음 | ○(화면) | 완료 |
| 학생 평가정보·채점기준 | ○ | ○ | §10-1 | ○ | 없음 | ○(화면) | 완료 |
| 학생 Monthly Planner | ○ | ○ | §10-2 | ○ | 없음 | ○ | 완료 |
| 학생 노트·Revision | ○ | ○ | §20·21 | ○ | 없음 | ○(API) | 완료(화면 편집 E2E 없음) |
| 학생 결과 파일·버전 | ○ | ○ | §24~26 | ○ Storage | 없음 | ○(API) | 완료 |
| 학생 피드백 | ○ | ○ | §31·32 | ○ | 없음 | ○(API+화면) | 완료 |
| 학생 성장 기록·보관함 | ○ | ○ | §29·30 | ○ | 없음 | — | 부분 완료 |
| 학생 자율 심화탐구 | ○ | — | — | — | 정적 콘텐츠 | ○ | Frontend 전용 완료 |
| 학생 학업 정보 수정·과목 추가 | ○ | 조회만 | §7 | 조회만 | 쓰기는 http 미연결(`httpNotConnected`) | — | 외부 의존(1팀 학업 원천) |

Production Build: 데이터 원천 미지정이면 http(`dataSource.ts`), http에서 연결 안 된 쓰기는 오류로 끝나고 Mock 값을 돌려주지 않는다(기존 규칙 유지).

## ⑤ 테스트

| 범위 | 결과 |
|---|---|
| Backend Unit | **305건, 실패 0**(생략 1 = 기본 꺼진 코퍼스 덤프 도구) |
| Backend Integration 전체 | **192건, 실패 0**(신규 `PlanReReviewApiTest` 2 포함). 첫 전체 실행에서 기존 시험 1건이 새 재확정 규칙에 걸려 실패 → 재검토 시작 후 재확정하도록 고치고, 초안 정리 순서를 바로잡은 뒤 전체 재실행 통과 |
| Frontend typecheck·lint·build(student·admin·shared) | 통과 |
| Assessment E2E (Edge, 일회용 DB) | **15/15**(신규 `a12-flows` 5: A·B 채점기준·재확정, C 수행평가, D·E 노트·파일·피드백, F 심화탐구, G 현황) |
| 실제 0.3 분석기 | [실제] B6 합성 문서 → PARTIAL, 수행 2·**채점기준 0** → 근거 쪽 버튼 확인 → 관리자 채점기준 입력(20점) → 화면 확정 → 학생 '실험 설계(관리자 보완) · 20점' → 재검토 → 25점 → 재확정 → 학생 25점, 확정 이력 2건(최신만 공개 중) → 현황(일부 분석 1·확정 1·재검토 0)이 화면과 일치. 계정 B 서비스 포트(8765·8766)는 비어 있었고 건드리지 않았다. 끝나고 정리 |
| Cross-Surface | 관리자 확정·재확정 → 학생 평가정보, 관리자 답변 → 학생 피드백, 학생 수행평가 → 관리자 현황 |
| Student Care 회귀 | Unit 145·Integration 72(결과 파일 기준) 실패 0. Student Care 코드·화면·Migration 변경 없음 |

추가로 고친 것: 재확정 기록 순서(고정 시계에서 같은 시각이면 '최신'이 무작위로 정해질 수 있었음 → 새 확정 기록은 항상 이전보다 1µs 이상 뒤), 재검토 중 Wizard 하단이 '확정 결과 보기'로 고정되던 문제, 기존 시험 1건(확정된 Revision을 바로 재확정하던 시험 → 새 정책대로 재검토 시작 후 재확정)과 초안 정리 순서.

## ⑥ Git 및 남은 작업

| Commit | 내용 |
|---|---|
| `3adbbd1` | refactor: 학생 자율 심화탐구 생성·진행 코드 제거(열람 전용) + 심화탐구 Spec 기록 |
| `3cc973c` | feat(Backend): 재검토·재확정·확정 이력, 채점기준 검사, 관리자 현황 API, 시험 |
| `679a9c9` | feat(Frontend): Wizard 재검토·이력·채점기준 편집, 현황 실데이터, 학생 확정 채점기준 |
| `8c985ca` | test: A12 E2E 5 시나리오 |
| `faf3ebf` | docs(api): §33·§39-8·§39-9·§18 |
| (이 보고서) | docs: A12 보고서 |

- Branch `feature/assessment-student-integration-enhancement`, 로컬 Commit만. **Push·Fetch·Merge·Rebase·PR 실행하지 않음.**
- 백업: 이 보고서 Commit 뒤 Git Bundle을 사용자 홈 `.learnershigh-extension/backups/`에 만들고 `git bundle verify`로 확인(§ 아래).
- 미커밋으로 둔 공유·다른 작업 파일: `.claude/rules/*`, `AGENTS.md`·`ARCHITECTURE.md`·`CLAUDE.md`·`README.md`, `docs/OWNERSHIP.md`·`docs/SOURCE_OF_TRUTH.md`, ADR(0001~0005 수정, 0008·0009 신규), `docs/architecture/*`, `scripts/verify*.ps1`, seed·증거 폴더, `backend/bin/`, `references/**`, `e2e/test-results`.
- 새 Migration 없음 → 시연 DB 변경 없음.

### 남은 작업·외부 의존

- 운영계획 재검토·재확정(새 Migration + 시연 DB 적용 승인 필요).
- 노트 블록 편집기·관리자 답변 작성의 **화면 조작** E2E, 성장 기록·보관함 E2E.
- HWP·HWPX 공식 확정은 실제 관리자 인증 뒤(1팀). 인쇄 모양(쪽·글꼴·그림) 미리보기는 보류(A11).
- 1팀: 학교 Master·인증·학업 과목 원천·기존 LearnersHigh 수행평가 Mapping. 완규: Student Care main 통합(별도 지시), 학교알리미 수집기(후속).
- 11월 17일 이후 권장: 운영계획 재확정, 화면 조작 E2E 보강, 시연 DB에서 재검토 흐름 리허설, 계정 B 분석 품질(다과목 분리·채점기준 추출) 재검증.
