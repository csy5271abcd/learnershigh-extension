# [계정 A] A6 통합 개발 — 학생 확정 정보 · 실분석기 재검증 · 0.3 DRAFT · 운영계획 · Monthly Planner (2026-11-15)

> 기준 HEAD 시작 `cadacb2` → 끝 `60d3805`(+ 이 보고서 Commit). Push 없음 · 이력 재작성 없음 · 기존 Migration 수정 없음 · 시연 DB/Volume/Storage 접근 없음 · Student Care·AdminShell 변경 없음 · 계정 B 분석기 코드 변경 없음.
> 표기: [직접] 이번 세션에서 실행 확인. 증거 화면 `account-a-a6-20261115/`(Commit 안 함).

## 1. 실제 완료한 기능

| TASK | 결과 | 검증 |
|---|---|---|
| A1 학생 확정 평가정보 | 새 화면 `/assessment/evaluation-plans`("학교 평가 정보"): 과목별 지필·수행 반영비율, 수행평가 항목(이름·반영·만점·시기), 값마다 원문 쪽 이동. 확정 목록에 없음 = "미확정", null = "원문에 없음" | [직접] 확정 전 빈 상태 → 부분 확정 → 개정본 초안(88) 비노출 → 개정본 확정 시 새 값만 · 390/820px 넘침 0 · Backend IT(개정본 경계) |
| A2 실분석기 E2E | 로컬 v21.1 + 0.2로 업로드→원문 저장→분석→저장→확정→학생 화면 | [직접] 합성 1건 + 공개 학교 문서 2건 + 비평가계획서 1건(§5) |
| A3 0.3 DRAFT | 계정 B 제안 기준 DTO·Validator·버전별 Parser·Envelope 판정, **기본 꺼짐** | Unit 10 · 호환 4 |
| A4 운영계획 Backend | Run에 0.3 후보 저장, 운영계획 확정(행별 확인·수정·제외, 이력), 학생 조회 API | Integration 6 |
| A5 관리자 운영계획 검토 | 4단계에 과목별 후보 행·issue·결정·수정·확정, 공유 초안 저장/복원, Planner 미리보기 | [직접] 브라우저(0.3 Stub) |
| A6 학생 Monthly Planner | `/assessment/monthly-plan`("월별 운영계획"), 확정 행만, 정밀도 8종 배치 | [직접] 브라우저 |
| A8 일부 | 과목 ID 직접 입력 → 문서 슬롯 학업 과목 선택(§38-4) | IT 1 · [직접] 브라우저 |

## 2. 변경 파일 (Commit 기준)

| Commit | 내용 |
|---|---|
| `e02ea14` | Student `routes/EvaluationPlansRoute.tsx`·`.module.css`, `model/confirmedPlanView.ts`, `api/types.ts`, `routes/paths.ts`·`assessmentRoutes.tsx`·`AssessmentLayout.tsx`; Backend 시험 `PlanServerAnalysisApiTest`(개정본 경계 1건) |
| `d0bf557` | 위 시험 파일 줄바꿈 원복(LF) — Python 저장 시 CRLF로 바뀐 것을 이력 재작성 없이 되돌림 |
| `75a27bf` | Backend: `AnalysisImportRequest`(0.3 선택 필드), `AnalysisImportParser`(버전 Gate), `AnalysisImportValidator`+`Contract03Rules`, `PlanAnalysisService.runStatus03`, `PlanAnalysisRun`(contract 컬럼), `TeachingPlanReview(Row)`·Repository, `TeachingPlanReviewService`·`TeachingPlanQueryService`, DTO 3개, Controller 2개, `EvaluationPlanQueryService.studentPublic`, `PlanViews`·`PlanAnalysisResponse`; Migration `V202611150100__assessment_teaching_plan.sql`; 시험 `AnalysisImportContract03Test`·`TeachingPlanReviewApiTest`, Fixture `contract03/` |
| `a5ef3b4` | 공용 `teachingPlanPlacement.ts`·`MonthlyPlanner.tsx`(8종), Student `MonthlyPlanRoute.tsx`·API(http/mock), Admin `review/TeachingPlanStep.tsx`·`ReviewWorkspace.tsx`·API·types·`canonicalUi.ts`·개발 샘플 |
| `60d3805` | Backend `PlanSubjectsResponse`·`GET .../subjects`, Admin `SubjectStep.tsx` 선택 상자 |
| 미커밋 | `docs/api/api-contract.md`(C8 작업 트리: §10-1-2·§38-4·§39-3 개정·§39-6 추가), 증거 화면 |

## 3. Frontend 결과

- Student: "학교 평가 정보"·"월별 운영계획" 메뉴(학교 수행평가 아래). 기존 메뉴·Route 유지. Mock 모드에서도 계약 모양 그대로(확정 정보 없음 / 운영계획 확정 전) — 가짜 값 없음.
- Admin: 검토 Workspace 2단계 과목 선택 상자, 4단계 운영계획 실데이터. 다른 단계·AdminShell 변경 없음.
- 공용 Planner 규칙: 날짜는 원문만, 연도는 학년도(3~12월) 또는 원문 명시 연도(예: 2027.2.10.)만, 학기 주차는 날짜로 바꾸지 않음, 여러 달은 각 달 월 줄, 달을 정할 수 없는 행은 별도 목록.
- typecheck · lint · build: 0 / 0 / 0 [직접].

## 4. Backend · DB · API 결과

- 새 API(모두 DRAFT, 작업 트리 계약 반영): `GET/PUT .../revisions/{id}/teaching-plan-review`(§39-6), `GET /api/student/assessment/evaluation-plans/{planId}/teaching-plan`(§10-1-2), `GET .../evaluation-plans/{planId}/subjects`(§38-4). 0.3 수신은 §39-3(설정 기본 false).
- Migration `V202611150100`: Run에 `contract_version`·`analyzer_profile`(NULL 허용) + `assessment_plan_teaching_plan_review`(Revision당 1건) + `assessment_plan_teaching_plan_row`(결정·최종 행·원래 후보). 적용 [직접]: Testcontainers, 일회용 MySQL. **시연 DB 미적용**(다음 시연 Backend 기동 시 자동 적용 — 사용자 결정 필요).
- 분리 유지: 분석 후보(Run) · 검토 초안 · 평가 확정값 · 운영계획 확정 · 학생 공개값. 운영계획 확정해도 Run은 그대로[IT].

## 5. 실제 분석기 연동 결과 (v21.1, 0.2, 로컬 127.0.0.1:8765, 외부 전송 없음)

| 입력 | 결과 |
|---|---|
| 합성 PDF | 201 REVIEW_REQUIRED, 1.8초, 원문 SHA 일치(서버 재검증 통과) |
| 공개 학교 문서 A | 201 REVIEW_REQUIRED, 7.6초, 과목 11·수행 27, 항목 근거 27/27 |
| 공개 학교 문서 B | 201 **PARTIAL**, 5.8초, 과목 10·수행 26 — PARTIAL 저장 정상(A3 시점 422는 더 이상 없음) |
| 평가계획서 아닌 PDF | **502 `unknown_status`** — 분석기가 `NO_ASSESSMENTS_EXTRACTED`+payload FAILED를 보냄. 0.2 계약 표대로 동작했지만 실사용 오류 문구가 부적절 → 결정 D-A6-3 |
| 개정본 2건 | 실분석기 재분석·초안·확정, 학생 공개 Revision 전환 확인 |

재시도·Timeout·BUSY는 기존 IT(Stub)로 검증(이번에 변경 없음). 운영계획(0.3)은 실분석기가 내지 않아 **Stub(합성 0.3)으로만** 검증했다.

## 6. 0.3 계약 — 합의/미합의

- 계정 B 제안을 그대로 수용해 구현(DRAFT): payload PARTIAL, failureReason 코드, severity, 필드 상태 issue 3종, teachingPlan + 상태 issue, Planner 확장(정밀도 8종), schedule 불변 규칙, 0.3 Envelope 판정.
- 계정 A가 철회한 이전 제안: "PARTIAL은 Envelope로만", `fieldPresence` 맵, 정밀도 5종.
- 미합의(인계 `ACCOUNT-B-HANDOFF-CONTRACT-03-A6-20261115.md` §2): 활성화 매개변수, `document{}`·`sectionCount`, issue 코드 목록·문구, 0.2 `NO_ASSESSMENTS_EXTRACTED`, 실제 0.3 샘플, 학사력 원천.

## 7. Monthly Planner 연동 상태

관리자 확정(§39-6) → 학생 API → 학생 Planner까지 동작 [직접, Stub 0.3]. 9월 날짜·기간 칸, 10월 2주(관리자 수정 단원), 11월 MONTH·MONTH_RANGE, 12월 MONTH_RANGE, 2027년 2월(원문 명시 연도), 달을 정할 수 없는 2개 별도 목록, 제외 행·후보·초안 미노출, 확정 전 "아직 확정되지 않았어요". 실제 학교 문서의 운영계획은 계정 B 0.3 연결 전이라 미검증.

## 8. HWP/HWPX 지원 상태 (변경 없음)

원문 저장·내려받기 가능, 미리보기 415(변환 엔진 미승인), 분석은 실험 Flag, 확정은 운영 기본 거절(`structured-confirm-dev=false`). 0.3 Locator는 기존 HWP 규칙 재사용. **운영 지원으로 표시하지 않음.** 변환 엔진 설치·라이선스는 사용자 승인 필요.

## 9. 테스트 결과 [직접]

| 범위 | 결과 |
|---|---|
| Backend Unit (`gradlew test`, ArchUnit 포함) | **296 / 실패 0** (Student Care 145) — 마지막 Commit 뒤 재실행 |
| Backend Integration (`gradlew integrationTest`) | **175 / 실패 0** (Student Care 77) — 과목 목록 시험 추가 전 전체 실행. 추가 뒤 `TeachingPlanReviewApiTest` 6/6만 재실행 |
| Frontend typecheck·lint·build | 0 / 0 / 0 |
| 실행 안 함 | Student Care Playwright E2E(해당 코드·AdminShell·공통 CSS 변경 없음), Assessment 자동 E2E(저장소에 없음 — 임시 스크립트로 브라우저 확인), 다크 모드 |

## 10. 브라우저 E2E (Edge headless, 일회용 MySQL, 실분석기/Stub 구분)

- 실분석기: 학생 확정 정보 화면 전 과정(확정 전 → 부분 확정 → 개정본 초안 비노출 → 개정본 확정), PDF 근거 쪽 이동(원문 Viewer 1쪽 Canvas), 모바일·태블릿.
- 0.3 Stub: 관리자 운영계획 9행(정밀도 8종) 표시·결정·수정·초안 자동 저장·새로고침 복원·확정(공개 8·제외 1), 학생 Planner(확정 전/후·월 이동·상세·모바일), 과목 선택 상자, 개발 Preview.
- 콘솔 오류: 개발 서버 `favicon.ico` 404 외 0.

## 11. 남은 Mock · Stub

인증 Mock Header, 학업 Context·과목 Mock Provider, 관리자 Overview Mock, 심화·대학·모의고사 Mock, 학생 PDF 업로드·분석(개발 전용), AI Provider 미설정, **운영계획 데이터는 실분석기 미연결(0.3 Stub만)**.

## 12. 11월 16일 목표(A1~A7) 대비

| TASK | 상태 |
|---|---|
| A1 | 구현·검증 완료(개발 인증 기준) |
| A2 | 0.2 실분석기 E2E 완료. 발견 결함 1건(D-A6-3) 결정 대기 |
| A3 | 0.3 DRAFT 구현·시험 완료, 계정 B 합의·실출력 대기(기본 꺼짐) |
| A4 | 구현·시험 완료(합성 0.3) |
| A5 | 구현·브라우저 확인(합성 0.3). 평가 확정 뒤 운영계획 초안 미저장 제약(D-A6-5) |
| A6 | 구현·브라우저 확인(합성 0.3) |
| A7 | 학생 확정 정보·0.2 회귀(Unit·IT 전체)·0.3 Fixture·운영계획 저장/검토/확정/학생 반영·미확정 비공개·Revision 경계 확인. 동시 수정은 기존 초안 409 경로(A5)로만, 운영계획 확정 동시 요청은 Unique+409 구현·단일 재확정 409만 시험 |

## 13. 11월 22일 목표(A8~A11) 대비

| TASK | 상태 |
|---|---|
| A8 | 과목 선택 완료. 재검토·재확정 정책·확정 이력 공개 전환은 **결정 대기**(Open Decision) |
| A9 HWP/HWPX | 미착수 — 변환 엔진 승인 필요 |
| A10 | 미착수(Overview 실데이터·심화 http 등) |
| A11 | 미착수 — 저장소 Assessment 자동 E2E 없음 |

## 14. 차단 사항 · 의존

- 계정 B: 0.3 활성화 방식·실제 0.3 출력·issue 목록, `NO_ASSESSMENTS_EXTRACTED`(0.2) 처리 합의.
- 1팀: 실제 인증, 학교 Master, 학업·과목 원천, 학사력(개학일 → TERM_WEEK 날짜화).
- 사용자 결정: D-A6-1 시연 DB에 Migration 3건(`V202611140100`·`0300`·`V202611150100`) 적용 시점 / D-A6-2 `api-contract.md` Commit 방식 / D-A6-3 0.2 `NO_ASSESSMENTS_EXTRACTED`→FAILED 저장 여부 / D-A6-4 재검토·재확정 정책(평가·운영계획 공통) / D-A6-5 평가 확정 뒤 운영계획 초안 저장 허용 여부 / D-A6-6 HWP/HWPX 변환 엔진 / D-A6-7 0.3 운영 활성화 시점.

## 15. Git

Branch `feature/assessment-student-integration-enhancement`. 이번 Commit: `e02ea14`, `d0bf557`, `75a27bf`, `a5ef3b4`, `60d3805` + 이 보고서. 원격 대비 약 31 Commit 앞섬, **Push 없음**. 미커밋: C8 문서(`api-contract.md` 포함), `backend/bin/`, `references/**`, 증거 화면 폴더들.

## 16. 다음 우선순위

1. D-A6-3·D-A6-5 결정 반영(작은 변경, 실사용 오류 문구·운영계획 검토 흐름).
2. 계정 B 0.3 활성화 합의 → Client 매개변수 추가 → 실제 학교 문서 운영계획 E2E.
3. D-A6-4 재검토·재확정 정책 결정 → 확정 이력 보존·공개 전환 구현.
4. Assessment 핵심 흐름 자동 E2E(Playwright, 시연 DB 비접촉 설정)를 저장소에 추가.
5. Overview 실데이터·학생 심화 http, HWP/HWPX(승인 시).
