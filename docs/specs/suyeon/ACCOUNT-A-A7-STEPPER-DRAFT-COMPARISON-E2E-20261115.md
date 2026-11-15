# [계정 A] A7 — 무채색 Stepper · 운영계획 초안 분리 · 학년도별 비교 · 분석 실패 안내 · Assessment E2E (2026-11-15)

> 시작 HEAD `cce917f` → `aa90b40`(+ 이 보고서). Push 없음 · 이력 재작성 없음 · 기존 Migration 수정 없음 · 시연 DB/Volume/Storage 접근 없음 · AdminShell·Student Care·자동 수집기·계정 B 분석기 변경 없음.
> 증거 화면: `account-a-a7-20261115/`(Commit 안 함). 표기: [직접] 이번에 실행 확인.

## A. Stepper 디자인 — 구현 완료 · 테스트 완료

| 전 | 후 |
|---|---|
| 테두리 둥근 버튼 5개, 현재 = 검정 배경·흰 글자, 완료 = 파란 ✓ 배지 | 테두리 없는 가로형. 현재 = 넓은 연회색(#F1F2F4) 둥근 사각형 + 번호 상자(#E5E7EB) + 진한 글씨(#171717, Bold). 완료 = 진회색(#404040) 원 + 흰 체크(SVG), 글씨 진회색. 미진행 = 연회색 번호(#F3F4F6) + 회색 글씨(#737373), Hover 밝은 회색. Stepper 안에는 파랑·초록 없음 |

- 파일: `frontend/admin/src/features/assessment/review/review.module.css`(Stepper 구간), `ReviewWorkspace.tsx`(체크 아이콘, 화면 낭독기용 '완료' 문구, 현재 단계 자동 스크롤). Backend·DB 변경 없음.
- 기존 동작 유지: 단계 이동·완료 판정(기존 `stepDone` 그대로)·`aria-current="step"`·Focus 테두리·이전/다음/최종 확정.
- 좁은 패널은 Stepper 줄 안에서만 가로 스크롤하고 현재 단계를 보이게 이동. [직접 E2E] 1920·1536·820·390px 페이지 가로 넘침 0, 현재 단계 화면 안, Stepper 모든 요소의 색이 무채색(R·G·B 차 ≤ 12)인지 계산 검사, 완료 단계 체크·진회색 확인. 화면: `assessment-stepper-*.png`, `assessment-stepper-done-1536.png`.

## B. 평가 확정 뒤 운영계획 초안 — 구현 완료 · 테스트 완료

1. 원인: 공유 초안이 분석 결과당 1개였고 평가 정보 확정(PUT review)이 그 초안을 닫았다 → 이후 운영계획 결정이 서버에 저장되지 않음.
2. 해결: 초안에 범위(scope) 추가 — `EVALUATION` / `TEACHING_PLAN`, Unique(분석 결과, 범위). 평가 확정은 평가 초안만, 운영계획 확정은 운영계획 초안만 닫는다. 기존 초안은 모두 EVALUATION.
3. 변경: Migration `V202611150200__assessment_review_draft_scope.sql`(새 파일) · `PlanReviewDraft`·Repository·`PlanReviewDraftService`(범위별 경로 검사: 운영계획 초안은 `teachingPlan[n]`만, 평가 초안은 `teachingPlan` 거절) · `TeachingPlanReviewService`(확정 시 운영계획 초안 닫기) · 새 API `GET/PUT .../teaching-plan-draft`(계약 §39-6 작업 트리) · Frontend `useServerDraft`(범위 옵션)·`TeachingPlanStep`(자기 초안·저장 상태·충돌 안내·과목 선택).
4. 확정 데이터 보호: 평가 확정값·분석 후보(Run)는 바뀌지 않음(IT로 비교), 평가 확정 Revision을 초안으로 되돌리지 않음.
5. 테스트 [직접]: IT `TeachingPlanReviewApiTest` 6/6(확정 전 저장 → 평가 확정 → 확정 뒤 다른 관리자 저장 → 재조회 복원 → 오래된 version 409 → 학생 비노출 → 운영계획 확정 → 초안 닫힘·이후 409 → 학생 Planner 반영 → 확정값·후보 불변), `PlanReviewDraftApiTest` 7/7(간헐 실패하던 "77" 검사 수정), E2E 운영계획 시나리오.

## C. 학년도별 평가계획서 비교 — 구현 완료 · 테스트 완료 (실제 학교 3개년 문서 검증은 미실행)

1. 등록: 기존 등록 API 그대로 학년도만 다르게(학년도 = 서로 다른 Plan). Revision 개념 변경 없음. 학교는 코드로 식별. 개발용 학업 Context Mock에 과거 학년도 슬롯 추가(2025 = 같은 과목 ID, 2024 = 이름이 비슷한 다른 ID) — 실제 과목 원천은 1팀.
2. DB: 새 테이블 없음(확정값·확정 Revision·운영계획 확정 재사용).
3. API: `GET /api/admin/assessment/evaluation-plans/comparison`(계약 §38-5 DRAFT). 관리자 전용, 학생 응답 아님.
4. 비교 로직: 학년도별 최신 **확정** Revision의 확정값만(`basis=CONFIRMED_ONLY`, 후보 비교 없음). 과목은 학년도마다 관리자가 고른 ID만. 행: 지필·수행 반영비율, 확정 수행평가 항목 수, 채점기준(항상 비교 불가), 확정 운영계획 행 수. 항목: 확정 이름(공백 정리)이 같을 때만 같은 항목, 1:1로 빠지고 생기면 `POSSIBLE_RENAME`(확정 안 함), 이름 미확정은 `NEEDS_REVIEW`. 상태 7종 + 학년도 열 상태 7종(문서 없음·확정 전·문서 여럿·과목 미선택·슬롯 밖 과목·과목 확정값 없음·확정). 같은 원문이 여러 학년도에 있으면 경고.
5. 화면: `/assessment/evaluation-plans/comparison`(목록의 '학년도 비교' 버튼, AdminShell 변경 없음). 학교·학년·학기·학년도 입력, 학년도별 과목 선택, 표 + 변경사항 요약. 첫 화면에서 열 폭이 무너지는 결함을 브라우저로 발견해 고정 폭으로 수정(`688bf60`). 화면: `assessment-comparison-1536.png`.
6. 원문 근거: 값 옆 'n쪽' → 그 학년도 문서의 검토 Workspace PDF Viewer를 그 쪽으로 엶(`?page=N`). HWP·HWPX는 "내려받아 확인" 안내.
7. 공개 경계: 관리자 전용, 확정값만. 미확정 문서는 열 상태로만 표시(값 없음).
8. 자동 수집 연동 준비: `HANDOFF-WANGYU-PLAN-COLLECTION-INTAKE-20261115.md`(입력 항목·중복 규칙·결정 사항, 제안). 수집기 코드·API는 만들지 않음.
- 테스트 [직접]: IT `PlanComparisonApiTest` 5/5, E2E 비교 시나리오.

## D. 분석 실패 안내 — 구현 완료 · 테스트 완료 · 실제 분석기 확인

1. 처리: 0.2에서 Envelope `NO_ASSESSMENTS_EXTRACTED`·`NO_SEGMENTS`·`NEEDS_OCR`·`UNSUPPORTED_FORMAT` + payload FAILED → `422 PLAN_ANALYSIS_NO_RESULT`(사유 = 상태 소문자), 저장 안 함(FAILED 저장은 합의 대기). payload가 FAILED가 아니면 502 `status_conflict`, 모르는 상태는 그대로 502 `unknown_status`.
2. 관리자 문구(`model/analysisFailure.ts`): 문서 쪽 사유("문서에서 평가항목을 찾지 못했어요 … 평가표가 이미지이거나 양식이 특이하면 평가계획서여도 찾지 못할 수 있어요"), 스캔 문서, 일시 장애(BUSY·Timeout·연결 실패), 설정 문제, 계약 불일치(SHA 불일치·형식 위반)를 구분하고 진단 코드를 함께 표시.
3. 0.2 호환: 정상 상태 3종 처리 그대로. 0.3은 별도 판정(A6).
4. 테스트 [직접]: Unit(0.3 계약 시험 갱신), IT 서버 분석 11/11(새 1건), E2E. **실제 분석기 v21.1** 로컬: 합성 평가계획서 201 REVIEW_REQUIRED(1.1초), 평가계획서 아닌 PDF 422 `PLAN_ANALYSIS_NO_RESULT`·`no_assessments_extracted`(1.3초), 결과 미저장.

## E. 통합 검증

1. Backend [직접]: Unit **296 / 실패 0**, Integration **182 / 실패 0** (Student Care 145·77 포함).
2. Frontend [직접]: typecheck·lint·build 통과.
3. Playwright Assessment E2E [직접]: `cd e2e && npm run test:assessment` — **7 / 실패 0**, 3회 반복 실행 모두 통과(데이터가 쌓인 상태 포함). 일회용 tmpfs MySQL, `lh_e2e_assessment*`가 아닌 DB는 거부, `/api/test/reset` 미사용.
4. 실제 분석기와 Stub 구분: E2E·IT는 Stub(합성 0.2·0.3). 실제 분석기는 0.2 경로 2건만 이번에 확인.
5. 0.3 연동: 실제 분석기 미연결(계정 B 활성화 방식 미합의) — **미완료**. 합성 Fixture로만 검증.
6. Git: `9ff20ed`, `72bf308`, `1161e3a`, `2974a78`, `688bf60`, `aa90b40` + 이 보고서. 미커밋: `api-contract.md`(§38-5·§39-1·§39-2·§39-6 갱신), 증거 화면.
7. 미완료: Student Care Playwright E2E 미실행(해당 코드·AdminShell·공통 CSS 변경 없음), 실제 학교 3개년 문서 비교, 실제 0.3, 재확정 정책, HWP/HWPX Viewer, Overview 실데이터, 학생 심화 탐구 http.
8. 11/16 목표 대비: P0-1~P0-5 구현·테스트 완료. 외부 의존(계정 B 0.3, 1팀 원천, 사용자 결정)만 남음.
9. 인계: 계정 B — 0.3 활성화 매개변수, 의미 기반 평가 항목 매칭 계약(학년도 비교의 POSSIBLE_RENAME 확인용), `NO_ASSESSMENTS_EXTRACTED` FAILED 저장 여부. Wangyu — 수집 결과 입력 계약(§ 인계 문서 5). 1팀 — 학교 코드 체계·학년도별 과목 원천.

## 결정 대기

D-A7-1 시연 DB에 Migration 4건(`V202611140100`·`0300`·`V202611150100`·`0200`) 적용 시점 / D-A7-2 `api-contract.md` Commit 방식 / D-A7-3 '결과 없음' FAILED Run 저장 / D-A7-4 재검토·재확정 정책 / D-A7-5 수집 메타데이터 컬럼(완규님 합의 후) / D-A7-6 HWP/HWPX 변환 엔진 / D-A7-7 0.3 운영 활성화.
