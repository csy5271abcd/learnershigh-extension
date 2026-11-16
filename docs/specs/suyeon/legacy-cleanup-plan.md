# 구형 Suyeon Frontend 코드 정리 계획

> 위치: `docs/specs/suyeon/legacy-cleanup-plan.md`
> 상태: **DRAFT — 조사 결과와 제안 순서.** 이 문서는 삭제를 승인하거나 실행하지 않는다.
> 조사 기준: 2026-10-26 로컬 작업 트리 (`git ls-files` 및 import 검색). Backend에는 구형 Suyeon 패키지(`mentor/`, `school/`, `studentmanagement/`, `parentprogress/`)가 없다 (`studentcare`, `common`만 존재).
> 근거: ADR-0008 (문서상 Accepted, 팀 승인 확인 필요), `CLAUDE.md` §5·§22.

## 1. 정리 대상 현황

| 대상 | 추적 파일 수 | 현재 연결 | 신규 Assessment와 중복 |
|---|---|---|---|
| Student `features/mentor-hub/` | 135 | Router의 index(`/`)가 Mentor Hub로 redirect. Mentor 관련 Route 18개. `StudentAppShell`이 학생 표시명을 Mentor Fixture에서 가져옴. `NotFoundPage`가 Mentor Hub CSS·경로 사용 | 없음 (폐기 기능) |
| Student `features/school-admissions/` | 96 | School Route 9개. **mentor-hub Fixture·Route를 import** (`schoolTaskDetail.fixture.ts`, `schoolTasks.fixture.ts`, `SchoolTaskDetailRoute.tsx`) | **부분 중복**: 수행평가 목록·상세·Evidence·Archive가 신규 S3·S7·S23과 같은 업무 영역. 8단계·면접은 폐기 |
| Student `assets/mentor-man`, `mentor-woman`, `activity-case/` | — | mentor-hub Fixture에서 사용 | 없음 |
| Student `components/student-navigation/` | 4 | Extension 항목 `mentor`, `schoolActivity`. 기존 `performanceTask`도 School로 연결 | 기존 Nav는 **보존**. Extension 항목만 Assessment로 교체 대상 |
| Admin `features/feedback/` | 11 | `/`와 Feedback Dashboard·Review Route. 구형 Queue (ADR-0003, Superseded) | 신규 AM-05·06과 같은 이름이지만 **모델이 다름** (구형 Queue vs ADR-0009 Snapshot) |
| Admin `features/student-management/` | 21 | Today Board · Student 360 · Mentor 추천 · Connection · Interview · Operations Route | 없음 (폐기). Student 360은 신규 A2와 역할이 일부 겹치나 재사용하지 않음 (admin §1 범위 제외) |
| Admin `fixtures/`, `read-model/`, `store/` | 13 / 11 / 2 | 구형 feedback·student-management 전용. `fixtures/`가 `assets/fixture-files`, `assets/activity-case` 사용 | 없음 (domain §25-7: 구형 Fixture 유입 금지) |
| Admin `components/TaskInspector`, `ActivityInspector`, `AdminFilePreview`, `filePreview.ts`, `Inspector.module.css` | 5 | 구형 Feature와 `App.tsx` Route에서만 사용 | Preview 개념은 신규 AD-12와 겹치나 구형 Fixture 의존이 있어 재사용하지 않음 |
| Admin `components/AdminVisual`, `AdminIcons`, `app/useScreenLoad.ts` | 3 | 구형 Feature에서만 사용 (조사 시점) | 재사용 여부 미정 |
| `frontend/mentor/` workspace | 115 | `frontend/package.json` workspaces와 `dev:mentor` script, lockfile. 다른 workspace·e2e·CI에서 import 없음 | 없음 |

## 2. 보호 대상 (삭제·변경 금지, 변경 시 Wangyu 협의)

| 파일 | 이유 |
|---|---|
| `frontend/admin/src/features/student-care/**` | Wangyu 소유 |
| `frontend/admin/src/app/StudentCareRoute.tsx`, `StudentCareRoute.module.css` | Student Care를 Shell에 연결하는 Wrapper |
| `frontend/admin/src/components/AdminUi.module.css` | `StudentCareRoute`가 사용 (`ui.page`). `AdminUi.tsx` 자체는 `App.tsx`의 `NoticeState`와 구형 코드만 사용 |
| `frontend/admin/src/app/theme.css` | Wangyu Student Care Token (`main.tsx`에서 먼저 import) |
| `frontend/admin/src/index.css` | Admin 전역 Style. Student Care 화면에도 적용 |
| `frontend/admin/src/app/AdminShell.tsx`, `App.tsx`, `adminLocation.ts`, `main.tsx` | Student Care Entry·Route가 함께 들어 있는 Shared Shell |
| `e2e/**` | Student Care E2E (Admin preview `/student-care` 대상) |

## 3. 판단 기준별 결과

| 기준 | 결과 |
|---|---|
| 1. 신규와 중복 | school-admissions·admin feedback은 업무 영역이 겹치지만 Domain 모델이 달라 재사용하지 않고 교체한다 |
| 2. 실제 호출 관계 | Student: router → mentor-hub · school-admissions, school-admissions → mentor-hub, Shell·NotFound → mentor-hub. Admin: App.tsx → feedback · student-management Route, components/* → fixtures |
| 3. Shared Component 의존 | `AdminUi.module.css`만 Student Care와 공유. 나머지 components는 구형 전용 |
| 4. Wangyu 영향 | `AdminShell` Entry 배열과 `App.tsx` 분기에 Student Care가 함께 있음 → **Shell을 수정하는 단계는 Wangyu 리뷰 필수** |
| 5. 빌드·테스트 영향 | mentor workspace 제거 시 `frontend/package.json`·lockfile 변경 (Shared). Student Care E2E는 `/student-care`만 사용하므로 구형 Route 제거 영향은 없을 것으로 **추정**. 제거 PR에서 실행으로 확인 |
| 6. 대체 Route 준비 | 현재 없음 (Assessment 미구현) |

## 4. 제안 순서

각 단계는 별도 PR이며 L1(typecheck · lint · build)을 통과해야 한다. Admin 단계는 Student Care E2E(L6)도 통과해야 한다.

| 단계 | 내용 | 선행 조건 | 승인 |
|---|---|---|---|
| 0 | (현재) 공존. 신규 Assessment는 `features/assessment/`에 독립 추가. 구형 코드 수정 금지 | — | — |
| 1 | Student: Assessment Route와 Nav 항목 추가, index redirect를 Assessment로 변경. 구형 Route는 아직 유지 | Assessment Shell(S1) 구현 | Suyeon (Student Router는 OWNERSHIP §10-1상 Shared 영향 → 리뷰 요청) |
| 2 | Student: `NotFoundPage`·`StudentAppShell`의 mentor-hub 의존 제거 → `school-admissions` 제거 → `mentor-hub`·관련 assets 제거, Nav의 `mentor`·`schoolActivity` 항목 제거 | 1단계 + Assessment 핵심 화면(S3·S7) | Suyeon + 리뷰 |
| 3 | Admin: Assessment Entry 추가 (Shell 최소 변경) | Admin Shell 변경 범위 Wangyu 합의 (`harness-change-proposals.md` P-06) | **Wangyu 동의** |
| 4 | Admin: 구형 Entry 6개와 Route 제거 → `features/feedback`, `features/student-management`, `fixtures`, `read-model`, `store`, 구형 전용 components, 관련 assets 제거. `/` 기본 화면 결정 | 3단계 | **Wangyu 리뷰** (Shell·App.tsx 변경) |
| 5 | `frontend/mentor/` workspace 제거 (`package.json` workspaces, `dev:mentor`, lockfile 재생성), `README.md` §22, `.claude/rules/frontend-mentor.md`, `scripts/verify.ps1` 필수 목록 정리 | 팀 합의 (OD-A10) | Shared 승인 |

각 단계에서 삭제 전 `git grep`으로 남은 참조가 없음을 확인하고 PR 설명에 결과를 붙인다. 이전 구현 이력은 Git History로만 보존한다.
