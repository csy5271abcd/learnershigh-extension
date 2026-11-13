# 학교 정보 데이터 흐름

## Student

```text
SYNTHETIC-STUDENTS.json (build-demo-roster.mjs 생성)
 → backend/src/main/resources/assessment/demo-roster/demo-roster-2026.json   (studentId, branchId, school{schoolId,name}, grade, 반·번호, 학기별 subjectIds)
 → DemoRoster (assessment/integration/roster, 플래그 ON일 때만)
 → MockAcademicContextProvider.find(studentId, year, semester)              (시연 학생 → 명단, 기존 stu_* → 예시고등학교 Fixture)
 → AcademicContextQueryService.toResponse()
 → GET /api/student/assessment/academic-context  { school{schoolId,name}, grade, schoolClassNumber, schoolStudentNumber, subjects, catalogSubjects }
 → Student http Adapter(academicContextHttp.ts) → AssessmentLayout → TermSelector / 목록 헤더 "충무고등학교 2026학년도 2학년 1학기"
```

학생 신원: 화면 선택(`dev/devContext.ts`, 저장소) → 없으면 `VITE_ASSESSMENT_DEV_STUDENT_ID` → Header `X-Assessment-Student-Id` → `MockHeaderAssessmentActorProvider`가 `AssessmentStudentDirectory`(기존 Client + 시연 명단)에 있는 ID만 인정.

## Admin

```text
관리자 ID (화면 선택 → 없으면 VITE_ASSESSMENT_DEV_ADMIN_ID) → Header X-Assessment-Admin-Id
 → MockHeaderAssessmentActorProvider: adm_demo_a01/a02 → {br_demo_a}, b01 → {br_demo_b}, c01 → {br_demo_c}
 → AdminStudents.inScope(branchIds) → AssessmentStudentDirectory.findStudents(branchId)  (지점 = 권한 단위)
 → AdminStudents.ref() → 학교명은 같은 학업 Context Provider에서
 → GET /api/admin/assessment/students  { student{studentId, displayName, school{schoolId,name}, grade}, activity… }
 → StudentsRoute: 목록·학교 필터(이번 수정: 서버 목록에서 학교 선택지 계산)
 → GET /api/admin/assessment/students/{id}  { academicContexts[§9-1] } → 학생 상세 "운정고등학교 · 1학년 2학기 · 2반 1번"
```

| 값 | 결정 위치 |
|---|---|
| Student ID | 명단 `studentId` (`stu_demo_001`~`060`, 바꾸지 않음) |
| School ID / Name | 명단 `school` (`sch_demo_unjeong` / 운정고등학교 …) |
| Branch ID | 명단 `branchId` — **권한**에만 쓰고 학교와 별개 |
| 학년·반·번호 | 명단 `grade`, `schoolClassNumber`, `schoolStudentNumber` (§9-1 DRAFT) |
| 학기 수강 과목 | 명단 `subjectIds["1"|"2"]` → 카탈로그 이름 |
| 모달 후보 과목 | `SubjectCatalog` 학년·학기 공통(학교 무관) |

## 평가계획서 학교(별개)

`VITE_ASSESSMENT_DEV_PLAN_SCHOOLS` → Admin 평가계획서 운영 화면의 학교 목록만. 운영 권한은 `AdminActor.planOperationSchoolIds`(현재 `adm_demo_gangnam`·`adm_plan_operator` = school_001). 학생 학교 표시와 무관.
