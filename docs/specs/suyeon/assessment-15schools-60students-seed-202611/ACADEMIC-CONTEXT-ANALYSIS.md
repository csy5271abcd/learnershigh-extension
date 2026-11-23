# 학생·학교·학업 Context 기존 구조 분석

> 조사일 2026-11-12. 코드 기준(문서가 아닌 실제 구현). 변경 전 상태를 적는다. 변경 내용은 `ACADEMIC-CONTEXT-CHANGES.md`.

## 1. 질문별 답

| # | 질문 | 확인 결과 (변경 전) | 근거 |
|---|---|---|---|
| 1 | 학생 정보를 실제 DB에서 관리하는가? | **아니다.** 학생 Table·생성 API가 없다. 기존 LearnersHigh 학생 원천은 `ExistingStudentClient` 경계 뒤에 있고 현재 구현은 하드코딩 Mock 13명이다. | `backend/.../common/integration/learnershigh/MockExistingStudentClient.java` |
| 2 | 학생 목록은 Mock인가 Backend 기반인가? | Backend API(`GET /api/admin/assessment/students`)지만 원천은 위 Mock Client다. Assessment 기록(수행평가·노트·파일·피드백·성장 기록)은 실제 MySQL. | `AdminStudents.java`, `AdminStudentQueryService.java` |
| 3 | 학교 정보는 어디서? | 학업 Context Provider(`AcademicContextProvider`, OD-A04 미결). Mock은 모든 학생을 `school_001 예시고등학교 1학년`으로 고정. | `MockAcademicContextProvider.java` |
| 4 | 반·번호를 저장할 수 있는가? | **학교 반·번호 필드 없음.** `ExistingStudent.className`은 학원 반 이름(예: `고3 A반`). | `ExistingStudent.java`, api-contract §9-1 |
| 5 | 학생 학년은 어디서? | 학업 Context(학기별 Record의 `grade`). Mock은 항상 1학년. | `AcademicContextRecord.java` |
| 6 | 학기별 수강 과목을 가질 수 있는가? | Context Record가 학기마다 `subjects`를 가진다. Mock은 학기당 4과목(공통국어·통합과학·통합사회·과학탐구실험). **모달에 4과목만 보이던 원인.** | `MockAcademicContextProvider.java` |
| 7 | 개발용 학생 생성 기능이 있는가? | 없다. | — |
| 8 | 다른 학교 학생을 관리자 화면에서 조회할 수 있는가? | 관리자 범위는 **학교가 아니라 학원 지점(branchIds)** 기준. 같은 지점이면 학교와 무관하게 조회된다. | `AdminActor`, `AdminStudentScope` |
| 9 | 학교별 관리자 권한은 어떻게 검사하나? | 학교별 권한 모델 없음. 학생 기록 = 지점, 평가계획서 운영 = `planOperationSchoolIds`(OD-A08 미결, 시연용 `school_001`만). | `AdminActor.java` |
| 10 | 시연 학생으로 로그인/전환할 수 있는가? | 실제 로그인 없음(API-OD-A01). Backend는 개발용 Mock Header(`X-Assessment-Student-Id` / `X-Assessment-Admin-Id`)만 인정. Frontend는 **Vite 실행 시** `VITE_ASSESSMENT_DEV_STUDENT_ID` / `VITE_ASSESSMENT_DEV_ADMIN_ID`로 한 계정을 고정. 로그아웃·계정 전환 UI 없음. | `MockHeaderAssessmentActorProvider.java`, `assessmentHttpClient.ts`, `adminHttpClient.ts` |

## 2. 수행평가 등록 검증 (변경 없음)

`POST /api/student/assessment/school-assessments`는 `subjectId`가 **그 학기 학생 수강 과목(Context `subjects`)**에 있어야 한다. 없으면 `400 VALIDATION_ERROR (subjectId: unknown)`. Backend 검증을 Frontend가 대신하지 않는다.

## 3. 소유권·영향 범위

| 대상 | 소유 | 영향 |
|---|---|---|
| `common/integration/learnershigh/*` (학생 Client) | **Shared** | Wangyu Student Care(`StudentCareReader`)가 같은 Client로 지점·학생 목록을 읽는다. 여기에 학생을 넣으면 Student Care 목록·신호·E2E 기대값이 바뀐다. |
| `assessment/integration/*`, `assessment/service/*` | Suyeon(Assessment) | Assessment만 영향 |
| `docs/api/api-contract.md` | Shared | 계약 개정은 승인 대상 |

## 4. 결론 → 결정 (2026-11-12 사용자 결정)

1. 학생 원천: Shared Client는 **수정하지 않는다.** Assessment 도메인 안에 개발용 시연 명단(기본 OFF 플래그)을 두고 Assessment의 학생 조회 진입점만 그 명단을 함께 본다.
2. 관리자: 시연 지점 3개(각 20명·5개교) + 지점 관리자 Mock 계정 4개(A01·A02 → A, B01 → B, C01 → C). 전 지점 계정 없음.
3. 카탈로그: §9-1에 `catalogSubjects` DRAFT 추가. 등록 검증(수강 과목만)은 유지.
4. 학교 반·번호: §9-1에 DRAFT 필드 추가. 학원 반(`className`)은 그대로.
