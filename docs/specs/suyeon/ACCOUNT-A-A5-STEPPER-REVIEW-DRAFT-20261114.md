# [계정 A] Phase A5 — 버튼형 Stepper · 서버 공유 검토 초안 · 학교 검색 · 0.3 연동 준비 (2026-11-14)

> 기준 HEAD `2f6f140`(V2 UI `4107e0c`) — 보고 내용과 실제 코드 일치 확인. **Push 없음 · 이력 재작성 없음 · 기존 Migration 수정 없음 · 시연 DB/Volume/Storage 접근 없음 · AdminShell·Student Care 변경 없음.**
> 표기: [직접] 이번에 실행 확인. 증거 화면: `account-a-a5-20261114/`(Commit 안 함).

## 1. 버튼형 Stepper (적용 전후)

| V2 (전) | A5 (후) |
|---|---|
| 글자 탭 + 현재 단계 검정 밑줄, 완료는 파란 숫자 | 각 단계가 **독립 둥근 버튼**(테두리, Radius 10, 높이 38): 번호 배지 + 단계명. 현재 = 검정 배경·흰 글자, 미선택 = 흰 바탕·회색 글자, 완료 = 파란 소형 ✓ 배지. 클릭 이동, Focus 표시, 좁은 화면은 가로 스크롤 |

1차 UI(`9136ca0`)의 버튼 단계 모양을 V2 색 규칙(흰·회·검정 + 파랑 포인트, 노랑·초록 없음)으로 복원. 다른 V2 화면(PDF Viewer·수행평가 상세·Planner·AdminShell)은 바꾸지 않음. [직접] `a5-01`·`a5-02`·`a5-06`(390px).

## 2. 변경 파일

| 영역 | 파일 |
|---|---|
| DB | `database/migrations/V202611140300__assessment_plan_review_draft.sql` (신규) |
| Backend 신규 | `entity/PlanReviewDraft.java`·`PlanReviewDraftEvent.java`, `repository/PlanReviewDraftRepository.java`·`PlanReviewDraftEventRepository.java`, `dto/plan/PlanReviewDraftRequest.java`·`PlanReviewDraftResponse.java`·`SchoolSearchResponse.java`, `service/plan/PlanReviewDraftService.java`·`SchoolSearchQueryService.java`, `controller/AdminAssessmentSchoolController.java` |
| Backend 수정 | `AdminEvaluationPlanController`(GET/PUT review-draft), `EvaluationPlanService`(확정 시 초안 닫기 1줄), `AssessmentErrorCode`(2개), `EvaluationPlanRepository`(학교별 집계) |
| Backend 시험 | `PlanReviewDraftApiTest`(7), `AdminSchoolSearchApiTest`(3), `AnalysisImportContractCompatibilityTest`(4) |
| Frontend | `review/useServerDraft.ts`(신규), `review/ReviewWorkspace.tsx`·`OverviewStep.tsx`·`review.module.css`, `api/types.ts`·`http/assessmentAdminHttp.ts`·`assessmentAdminApi.ts`, `routes/EvaluationPlansRoute.tsx` |
| 문서 | 이 보고서, `ACCOUNT-B-HANDOFF-ANALYSIS-IMPORT-03-20261114.md`, 작업 트리 `api-contract.md` §38-3·§39-4(미커밋 C8 파일) |

## 3. 서버 Review Draft 데이터 모델

기존 `assessment_plan_review`·`confirmed_value`는 **확정 전용**(사람이 CONFIRM할 때만 생기고 불변)이라 초안을 넣으면 학생 공개값과 섞인다 → 별도 테이블 2개를 새 Migration으로 추가(기존 테이블 무변경).

- `assessment_plan_review_draft`: `id`, `revision_id`(FK), `analysis_id`(FK, **UNIQUE** — 분석 결과당 공유 초안 1개), `source_sha256`·`analyzer_version`(만들 때 원문·분석기 식별), `status` ACTIVE|CLOSED, `closed_reason` CONFIRMED, `payload_json`(필드별 결정·관리자 값·근거 쪽·**서버가 읽은 후보값**·과목 연결), `decision_count`, `version`(@Version), `created_by/at`, `updated_by/at`.
- `assessment_plan_review_draft_event`: 저장마다 `draft_version`·`saved_by`·`saved_at`·`changed_count`·`changed_paths_json`(불변 기록).
- 분리: 분석 후보(Run) · 검토 초안(draft) · 확정값(review/confirmed_value) · 학생 공개값(§10-1 상세 confirmedFields).

## 4. API · Migration

- `GET/PUT /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/review-draft` — 계약 §39-4(DRAFT, 작업 트리). 요청·응답·오류표는 그 절 참고.
- 재분석·Revision 변경: 초안은 `analysis_id`에 묶여 있어 새 Run에는 적용되지 않는다. GET은 최신 결과의 `draft`와 예전 결과의 `previousDrafts`를 나눠 주고, 예전 결과로 PUT하면 `409 PLAN_REVIEW_DRAFT_STALE`. 화면은 "이전 초안 보존 · 새 결과 재검토" 안내.
- 확정(PUT review) 성공 → 같은 Transaction에서 초안 CLOSED(CONFIRMED). 확정된 Revision에는 초안 저장 `409`(재검토 정책 미결 — 기존 동작 유지).
- Migration 적용 [직접]: Testcontainers(Integration 전체) + 일회용 MySQL에서 Flyway `v202611140300`까지 10개. **시연 DB에는 적용하지 않음**(다음 시연 Backend 기동 시 자동 적용 — 시점은 사용자 결정).

## 5. 관리자별 수정 기록

저장마다 event 1행(누가·언제·바뀐 필드 키·개수). 응답 `history`(최근 20), 초안 `createdBy`/`updatedBy`. 화면: 분석 요약 단계 "공유 검토 초안" 아래 최근 5건, 하단 막대 "서버에 임시 저장됨 시각 · 저장자 · 버전". [직접] B 화면 history `adm_plan_operator · 2개 변경 · 버전 0`(`a5-03`).

## 6. 동시 수정 충돌

- 서버: 요청 `baseVersion` ≠ 현재 → `409 PLAN_REVIEW_DRAFT_CONFLICT`(`currentVersion·updatedBy·updatedAt`). 같은 version 동시 저장은 @Version으로 하나만 반영(나머지 409). 처음 만들기 경합은 UNIQUE → 409. [직접 시험] 동시 2건 → `[200, 409]`, version 1, 기록 2건.
- 화면: 자동 저장을 멈추고 회색 안내 한 줄 — "○○님이 먼저 저장(버전 n). 내 변경은 아직 서버에 저장되지 않았어요" + `최신 초안 불러오기`(내 미저장 변경 버림) / `최신 초안에 내 변경 다시 적용`(**3-way**: 서버 최신 위에 내가 바꾼 항목만 덮음, 다른 관리자가 바꾼 다른 항목 유지). [직접] A 35%·평가 시기 + B 만점 → 다시 적용 후 B 새로고침에서 셋 다 유지(`a5-04`).
- 검증 중 발견·수정: 처음 구현한 "내 변경으로 다시 저장"은 내 화면 전체로 저장해 B의 만점 확인을 지웠다 → 3-way 재적용으로 바꿈.

## 7. 브라우저 저장 → 서버 저장 전환

- 결정이 바뀌면 1초 뒤 PUT(자동). **'서버에 임시 저장됨'은 서버 200 응답 뒤에만** 표시. 저장 전·실패·충돌 동안은 이 브라우저에 백업만 하고 "서버 저장 전 · 이 브라우저에만 백업" / "서버 저장 실패 · 다시 시도" / "충돌"로 구분.
- 진입 시 브라우저 백업이 서버 초안과 다르면 선택 안내: `서버 초안 사용` / `이 브라우저 내용으로 서버 저장`(덮어쓰지 않고 사용자 선택). 서버에 초안이 없고 백업만 있으면 `버리기` / `서버 저장`.
- 서버 저장 전 변경이 있으면 페이지 이탈 경고(beforeunload).
- [직접] 수정 → "서버에 임시 저장됨 · adm_plan_operator · 버전 0", 새로고침 후 서버에서 35% 복원, 다른 브라우저(B)에서 같은 초안.

## 8. 초안과 확정값 분리 확인 [직접]

- 시험: 초안 77 저장 → 학생 상세 404 → 확정(55) → 초안 CLOSED → 학생 상세 확정값 1개, 응답에 `77`·`draft`·`candidate` 없음 → 확정 후 초안 저장 409.
- 브라우저: 확정 후 머리글 "확정값 3개 학생 공개 · 미확인 10개 비공개", 학생 API 확정값 3개만·초안 문자열 없음, DB 초안 `CLOSED/CONFIRMED`.

## 9. 전체 학교 검색 API

- 확인 결과: 프로젝트 안에 검증된 학교 Master 원천 **없음**(학업 Context Provider는 학생·슬롯 조회만, 개발용 Mock).
- 구현(DRAFT §38-3): `GET /api/admin/assessment/schools?query&limit` — **평가계획서가 등록된 학교만**, `coverage: REGISTERED_PLANS_ONLY`, `masterConnected: false`, 이름은 학업 Context로 확인될 때만(`nameSource`), 없으면 `null`(지어내지 않음). 학교 코드·이름 검색, limit·`truncated`. 권한 OD-A08 동일.
- 화면: 학교 선택을 `평가계획서가 등록된 학교 · n건` / `담당 학생 학교(개발 정보)` 두 묶음으로, 아래 "전체 학교 목록(학교 Master)은 아직 연결되지 않았어요", 학교 코드 열기 유지(`a5-07`).
- 1팀 요구사항: 학교 Master 원천(학교 코드 체계, 이름·지역·학교급), 조회 API 또는 동기화 방식, 폐교·통폐합 처리. 연결되면 `coverage: MASTER`로 바꾸고 `region`·`schoolKind` 추가(하위 호환).

## 10. 계정 B 0.3 계약

`ACCOUNT-B-HANDOFF-ANALYSIS-IMPORT-03-20261114.md`: 현재 0.2 수신 범위, 합의 제안(`contractVersion`, payload status는 0.2 유지·부분 결과는 Envelope PARTIAL로만, `extraction{status, issues[{code, severity, fieldPath}]}`, `fieldPresence` 4상태, Locator, 분석기 버전), `teachingPlan[]` 행(정밀도 5종·`asWritten`·학교 주차·연도 추측 금지), 손실 금지 항목. 호환 기준선: `AnalysisImportContractCompatibilityTest` — 0.2 수신 OK, `contractVersion`·`teachingPlan`·`extraction`·payload `PARTIAL`은 조용히 버리지 않고 거절.

## 11. Monthly Planner 연동 준비

- 0.3 행 → `TeachingPlanEntry` 변환표(인계 문서 §4). 공용 `MonthlyPlanner`는 그대로, 실제 경로는 서버 행 0개 → 정직한 빈 상태(가짜 데이터 저장 없음).
- 개발 Preview 유지 [직접]: 9월 일정 블록 2개 표시.
- 남은 결정: 운영 계획 확정 저장 방식(확정값 테이블 재사용 vs 행 테이블), 학생 Planner 조회 API.

## 12. 실행 테스트

| 범위 | 결과 |
|---|---|
| Backend Unit (`gradlew test`, ArchUnit 포함) | **282 / 실패 0** (Student Care 145) + 호환 시험 4/4 (별도 실행) |
| Backend Integration (`gradlew integrationTest`) | **169 / 실패 0** (159 + 초안 7 + 학교 3, Student Care 77) |
| Frontend `typecheck`·`lint`·`build` (전체) | exit 0 / 0 / 0 |
| 브라우저 (Edge headless, 격리 MySQL + Backend + Stub 분석기) | §1·5~9 PASS, 콘솔 오류 0 (의도한 409 제외), 390px 가로 넘침 0 |
| 미실행 | Student Care E2E(AdminShell·공통 CSS·Student Care 변경 없음 — 기준선 7/7), 실제 분석기·실제 학교 문서, 다크 모드 |

## 13. Student Care 보호

변경 경로는 `assessment/**`(Backend), `frontend/admin/src/features/assessment/**`, `database/migrations/V202611140300…`(Assessment 신규 테이블만). `studentcare/`·`features/student-care/`·`app/`(AdminShell)·`frontend/shared/`·`e2e/`·Student Care Migration 변경 0건 [직접 `git diff --name-only`].

## 14. Git

Commit Hash는 최종 응답에 기록. Push 없음. 미커밋 유지: C8 문서 전체(`api-contract.md` — §38-3·§39-4 포함), `backend/bin/`, `references/**`, 증거 화면.

## 15. 미완료 · 다음 Phase

1. 시연 DB에 `V202611140300` 적용 시점 결정(자동 적용됨).
2. 확정 후 재검토·재확정 정책(현재 초안·확정 모두 막힘).
3. 계정 B 0.3 합의 → 버전별 Parser·Adapter·운영 계획 후보 저장 → 관리자 운영 계획 검토 → 학생 Planner 실데이터.
4. 학교 Master(1팀) 연결.
5. 초안 자동 저장의 필드 단위 병합(현재 화면 3-way, 서버는 전체 교체 + version 검사).
6. HWP/HWPX Viewer, Admin 레거시 정리, `api-contract.md` Commit 방식 결정(이전 보고 §4-2).
