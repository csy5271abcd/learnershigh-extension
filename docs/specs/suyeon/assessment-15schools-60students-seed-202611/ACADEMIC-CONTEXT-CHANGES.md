# 학업 Context · 시연 명단 변경 내역

> 2026-11-12. 사용자 결정(권장안 4종 + "강남 지점 말고 다른 지점", 시연 지점 3개·관리자 4명). DB·Migration 변경 없음. Git Commit 없음.

## 1. 승인 대기 표시

| 변경 | 영역 | 상태 |
|---|---|---|
| `api-contract.md` §9-1 DRAFT 필드(`schoolClassNumber`, `schoolStudentNumber`, `catalogSubjects[]`) | **Shared** | **팀 승인 대기** (아래 [SHARED CHANGE]) |
| `api-contract.md` §62-1-3 개발용 다지점 시연 명단 설명 | **Shared** | **팀 승인 대기** |
| Backend `assessment/**` 시연 명단·카탈로그·Context 응답 | Suyeon | 구현·단위 검증 완료(DRAFT 계약 기준) |
| Frontend Student 모달·타입, Admin 학생 상세 | Suyeon | 구현·화면 검증 완료(DRAFT 계약 기준) |
| `backend/.../common/**`, Student Care, `database/**` | Shared / Wangyu | **변경 없음** |

```text
[SHARED CHANGE]
현재 작업: Assessment 15개교·60명 시연 데이터 / 수행평가 추가 모달 과목 카탈로그
변경 대상: API Contract §9-1 (GET academic-context 응답), §62-1-3 (개발용 Mock 관리자 설명)
현재 구조: §9-1 = school·academicYear·grade·semester·subjects·source. 학교 반·번호, 학년·학기 후보 목록 없음.
필요한 변경: 응답 필드 추가만(기존 필드 의미 불변) — schoolClassNumber/schoolStudentNumber(nullable 정수), catalogSubjects[]{subjectId,name,subjectGroup,curriculumVersion,enrolled}
영향받는 Feature: Assessment Student(수행평가 추가 모달·학업 정보), Assessment Admin(학생 상세 academicContexts)
영향받는 Surface: Student, Admin  (Student Care 영향 없음: 다른 API)
API 영향: YES (추가 필드, Breaking 아님)
DB 영향: NO
ADR 필요: NO (OD-A04 원천 결정은 여전히 미결로 둔다)
제안: DRAFT로 두고, 실제 LearnersHigh 학적 원천 확정 시 필드명·원천을 재검토한다.
```

## 2. Backend

| 파일 | 변경 |
|---|---|
| `assessment/integration/context/SubjectCatalog.java` (신규) | `subject-catalog-2026.json` 로드. 학년도·학년·학기 → 후보. ID·과목명 중복 시 시작 중단. |
| `assessment/integration/roster/DemoRoster.java` (신규) | `demo-roster-2026.json` 로드. **`learnershigh.integration.mode=mock` 그리고 `assessment.demo-roster.enabled=true`일 때만 Bean 등록.** ID 접두사(`br_demo_`/`adm_demo_`/`stu_demo_`), 학교·학년·반·번호 중복, 카탈로그에 없는 수강 과목, 없는 지점을 가진 관리자 → 시작 중단. |
| `assessment/integration/roster/AssessmentStudentDirectory.java` (신규) | Assessment의 학생·지점 조회 단일 진입점. 기존 `ExistingStudentClient` + (ON일 때) 시연 지점 학생. 시연 지점이 아니면 기존 Client 그대로. |
| `assessment/integration/auth/MockHeaderAssessmentActorProvider.java` | 학생 조회를 Directory로. ON일 때 시연 관리자 4명 추가(학생 기록 지점만, 평가계획서 운영 권한 없음). 기존 Mock 관리자와 ID가 겹치면 시작 중단. |
| `assessment/integration/context/MockAcademicContextProvider.java` | 기존 학생: 수강 과목 그대로 + 카탈로그 후보. 시연 학생: 명단의 학교·학년·반·번호·학기별 수강 과목 + 후보. `findSlot`(평가계획서 운영)은 기존 `school_001`만. |
| `assessment/integration/context/AcademicContextRecord.java` | `catalogSubjects`, `schoolClassNumber`, `schoolStudentNumber` 추가(기존 7인자 생성자 유지). |
| `assessment/dto/context/AcademicContextResponse.java` | §9-1 DRAFT 필드 추가. `catalogSubjects[].enrolled` = 수강 과목 포함 여부. |
| `assessment/service/school/AcademicContextQueryService.java` | 응답 변환을 `toResponse()` 하나로(Student·Admin 공용). |
| `assessment/service/record/AdminStudentQueryService.java` | 학생 상세 `academicContexts`가 같은 변환을 쓰도록(중복 변환 제거). |
| `assessment/service/AdminStudentScope.java`, `service/record/AdminStudents.java` | 학생 조회를 Directory로(범위 검사 로직 동일: 관리자 branchIds 안에서만). |
| `src/main/resources/application.yml` | `assessment.demo-roster.enabled: ${ASSESSMENT_DEMO_ROSTER_ENABLED:false}` |
| `src/main/resources/assessment/subject-catalog/subject-catalog-2026.json` (신규) | 카탈로그 6슬롯 162과목 (`scripts/build-grade-semester-subject-catalog.mjs` 생성) |
| `src/main/resources/assessment/demo-roster/demo-roster-2026.json` (신규) | 지점 3·관리자 4·학생 60 (`scripts/build-demo-roster.mjs` 생성) |
| `src/test/.../roster/DemoRosterTest.java` (신규, 8) | 카탈로그 슬롯·기존 ID, 명단 분포·중복, 관리자 범위, 지점 격리(`AdminStudentScope`), 플래그 OFF, 시연·기존 Context, 잘못된 명단 거절 |
| `src/test/.../roster/DemoRosterWiringTest.java` (신규, 3) | 실제 Spring Context: 기본 OFF → Bean 없음, mock+ON → 등록, mock 아님+ON → 없음 |
| `src/test/resources/assessment/demo-roster/invalid-duplicate-seat.json` (신규) | 중복 좌석 명단 |

`DemoRosterWiringTest`가 실제 결함 1건을 잡았다: `DemoRoster` 생성자가 2개라 Spring이 고르지 못해 **플래그 ON 시 Backend 시작 실패** → 공개 생성자에 `@Autowired` 지정으로 수정.

## 3. Frontend

| 파일 | 변경 |
|---|---|
| `student/.../api/types.ts` | `AcademicContext`에 DRAFT 선택 필드 3개 + `CatalogSubjectRef` |
| `student/.../components/AddSchoolAssessmentModal.tsx` · `.module.css` | 수강 과목만 라디오. "N학년 M학기 공통 과목 X개 중 내 수강 과목 Y개" 안내. "수강하지 않는 이 학기 공통 과목 K개 보기"(교과군별, 비활성·선택 불가 표시). 학교 선택 UI 없음. 상세: `ADD-ASSESSMENT-MODAL.md` |
| `admin/.../routes/StudentDetailRoute.tsx` | 프로필에 학교 반·번호(값 있을 때만). 과목명을 서버 학업 Context에서 먼저 찾도록 수정(아래 결함). |

결함 수정: Admin 학생 상세가 과목명을 Frontend Mock 저장소에서만 찾아, 기존 ID가 아닌 과목(예: 한국사2·대수)이 `과목 없음`으로 보였다 → 이 학생의 서버 `academicContexts`(subjects·catalogSubjects)에서 먼저 찾는다.

Student Mock Adapter(Stage 1)는 바꾸지 않았다: 원천이 없는 학교 반·번호·카탈로그를 지어내지 않고 생략(모달은 생략 시 기존처럼 수강 과목만).

## 4. 변경하지 않은 것

- `backend/.../common/**`(Shared 학생 Client·Mock 13명·지점 2개), Student Care 코드·API·DB, `database/migrations/**`, 기존 Mock 관리자 4명의 범위, 등록 검증(수강 과목만), 기존 `subj_01~04`·`subj_11~14`.
- 실제 로그인·로그아웃·Session(API-OD-A01) — 구현하지 않음.

## 5. 백업

`backend/.../assessment/**`와 Admin `StudentDetailRoute.tsx`는 **Git 미추적** 상태였다. 수정 전 원본을 저장소 밖 작업 폴더에 복사해 두었다. 단 `AcademicContextRecord`·`AcademicContextResponse`·`AcademicContextQueryService`·`AdminStudentQueryService`는 백업 전에 수정됐다(변경 내용은 위 표와 같고 되돌릴 수 있는 범위).
