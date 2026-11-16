# Assessment Backend 구현 보고서 (2026-11-09)

> 범위: Suyeon 소유 Assessment Backend P0 · 작성: 계정 A  
> 관련: [API-STATUS](API-STATUS.md) · [DB-STATUS](DB-STATUS.md) · [TEST-RESULT](TEST-RESULT.md) · [NEXT-STEPS](NEXT-STEPS.md) · [AI 연동 인계서](../assessment-ai-integration-handoff.md)

## 1. 요약

작업 전 Assessment Backend에는 AI 분석 Endpoint(§47-A, PROPOSED)만 있었다. 이번 작업에서 **학교 수행평가(SchoolAssessment)와 학교 평가계획서(SchoolEvaluationPlan)의 실제 저장·조회·수정·상태 관리, 관리자 Scope 조회, 외부 AI 분석 결과 수신 경계**를 MySQL 영속 계층까지 구현했다. Testcontainers MySQL 통합 테스트와 실제 서버(`bootRun`) HTTP 호출로 저장 후 재조회까지 확인했다.

사용자 승인 사항(2026-11-09):

1. `database/migrations/`에 Assessment 전용 **신규** Migration 2개 추가(기존 파일 수정 없음)
2. 기존 인증 확정 전까지 **Mock 인증 Adapter**(개발용 Header) 사용

## 2. 기능별 완료 여부

| 기능 | 계약 | 상태 | 근거 |
|---|---|---|---|
| 학업 Context 조회 | §9-1 | 완료 (원천은 Mock, OD-A04) | 통합 테스트, 서버 확인 |
| 학업 Context 변경 | §9-2 | **미구현** — Write Owner 미확정 | |
| 수행평가 목록(학기·과목·상태·제목/과목명 검색·정렬·페이지) | §12 | 완료 | 통합 테스트 |
| 수행평가 직접 등록(제목·과목만 필수, 모르는 값 null) | §12 | 완료 | 통합 테스트, 서버 확인 |
| 평가계획서 항목 참조 등록(`evaluationItemRef`) | §12 | 완료 (확정 Revision만, 같은 과목만) | 통합 테스트 |
| 수행평가 상세 | §12 | 완료 | |
| 수행평가 개인정보 수정(title/description/deadlineDate) | §12 PATCH | 완료 | |
| 수행평가 삭제 | §12 DELETE | **미구현** — 휴지통 정책 OD-A11 | |
| 상태 변경(BEFORE_START → IN_PROGRESS → COMPLETED, 역전이 409) | §13 | 완료 | 단위·통합 테스트 |
| 중요 표시(즐겨찾기) | §30 | **미구현** (P0 범위 밖) | |
| 관리자: 학생별 수행평가 조회(지점 Scope) | §34 | 완료 | 통합 테스트 |
| 관리자: 학생 목록·학생 상세 | §34 | **미구현** — 응답 Shape이 계약에 없음 | |
| 관리자: 평가계획서 등록·개정·목록·상세 | §38 | 완료 (원본 바이트 미보관) | 통합 테스트, 서버 확인 |
| 관리자: 분석 결과 조회 | §39 GET | 완료 | |
| 관리자: 검토 확정 | §39 PUT | 완료 | |
| 관리자: 서버 분석 실행 | §39 POST | **미구현** — 원본 파일 보관 없음 | |
| 외부 분석 결과 수신 | PROPOSED | 완료 (기본 off) | 통합 테스트, 서버 확인 |
| 학생: 공통 평가계획서 목록·상세 | §10-1 | 완료 | |
| 학생: 개인 PDF 업로드·분석·개인 정정 | §10-2·§11 | **미구현** — File Storage·OD-A13 | |
| P1 노트·파일 버전·피드백 | §19~32 | **미착수** | NEXT-STEPS 참고 |

## 3. 핵심 설계 판단

1. **같은 Entity, 다른 View**: Student와 Admin은 같은 `SchoolAssessment`를 같은 Mapper(`SchoolAssessmentMapper`)로 본다. Admin 전용 Entity나 Table을 만들지 않았다.
2. **학교 공식정보와 학생 개인정보 분리**: `assessment_school_assessment`에는 학생 개인 관리 정보만 둔다. 공식 평가정보는 평가계획서 확정값 Table에 있고, 학생 기록에는 `evaluationItemRef`(Revision + 과목 + itemKey)로 참조만 남긴다. PATCH로는 과목·학기·참조·상태를 바꿀 수 없다(`not_editable`).
3. **AI 후보 / 사람 확정 분리**: 수신 결과는 `assessment_plan_analysis_run`(불변)에, 사람의 확정은 `assessment_plan_review` + `assessment_plan_confirmed_value`(불변)에 저장한다. 수신은 검토 상태를 바꾸지 않으며, 확정은 `PUT .../review`를 호출해야만 생긴다.
4. **값 보정 금지**: 비율 합계가 맞지 않아도 값을 고치지 않고 `warnings(source=SERVER)`로만 남긴다. 원문에 없는 값은 null로 받고 0으로 바꾸지 않는다.
5. **소유권은 조회 조건으로 확인**: 학생 조회는 `id AND student_id` 조건으로 한다. 다른 학생의 ID를 넣으면 존재 여부도 드러나지 않는 404를 반환한다. Body의 `studentId`는 무시한다.
6. **관리자 Scope**: 학생 지점은 기존 `ExistingStudentClient`(Integration 경계, 읽기만)로 확인한다. 평가계획서 운영 권한은 학생 조회 권한과 분리해 학교 단위로만 주며(OD-A08), 기본적으로는 아무에게도 주지 않는다.
7. **역전이 금지**: §13 "역전이 정책 미확정 시 허용하지 않음"에 따라 뒤 상태로는 409를 반환한다. 같은 상태로의 재요청은 재시도 안전성을 위해 변경 없는 200으로 처리한다(Frontend Mock MM-01과 같은 동작).
8. **중복 처리**: 같은 `evaluationItemRef`로 다시 등록해도 막거나 병합하지 않는다(domain.md §9-3 "알림, 자동 병합 금지"). 알림은 응답의 `evaluationItemRef`로 Frontend가 감지한다. 기존 LearnersHigh 수행평가와의 중복 판단은 OD-A01 해결 전이라 하지 않는다.
9. **동시성**: 수행평가 Entity에는 `@Version`을 둔다. 평가계획서 Revision 순번은 `revision_count` + `@Version` + `UNIQUE(plan_id, revision_number)`로 이중 생성을 막는다. 충돌은 공통 `409 CONCURRENT_MODIFICATION`으로 응답한다.
10. **인증 경계**: `AssessmentActorProvider` Interface와 개발용 `MockHeaderAssessmentActorProvider`(mock 모드 전용)로 구성했다. Provider가 없거나 Header가 없으면 401을 반환한다(fail-closed). 공통 인증 코드는 바꾸지 않았다.

## 4. 수정·추가한 파일

### 신규 (Backend main — `backend/src/main/java/com/learnershigh/extension/assessment/`)

```text
exception/AssessmentErrorCode.java
integration/auth/{AssessmentActorProvider, MockHeaderAssessmentActorProvider, StudentActor, AdminActor}.java
integration/context/{AcademicContextProvider, MockAcademicContextProvider, AcademicContextRecord}.java
entity/{SchoolAssessment, SchoolAssessmentStatus, EvaluationItemRef,
        EvaluationPlan, PlanRevision, PlanReviewStatus, PlanAnalysisRun, PlanAnalysisStatus, PlanReview}.java
repository/{SchoolAssessment, EvaluationPlan, PlanRevision, PlanAnalysisRun, PlanReview}Repository.java
dto/PageResponse.java
dto/context/AcademicContextResponse.java
dto/school/{SchoolAssessmentResponse, CreateSchoolAssessmentRequest, UpdateSchoolAssessmentRequest,
            ChangeStatusRequest, ChangeStatusResponse, SchoolAssessmentListQuery, EvaluationItemRefDto}.java
dto/plan/{AdminEvaluationPlanResponse, StudentEvaluationPlanResponse, PlanUploadResponse, PlanAnalysisResponse,
          PlanReviewRequest, ConfirmedFieldView, AnalysisImportRequest}.java
service/{AssessmentTimes, AdminStudentScope}.java
service/school/{SchoolAssessmentService, SchoolAssessmentQueryService, SchoolAssessmentMapper, AcademicContextQueryService}.java
service/plan/{EvaluationPlanService, EvaluationPlanQueryService, PlanAccess, PlanViews, PdfInspector,
              AnalysisImportValidator, AnalysisImportParser}.java
controller/{StudentSchoolAssessmentController, StudentEvaluationPlanController, AdminStudentAssessmentController,
            AdminEvaluationPlanController, AdminPlanAnalysisImportController, AssessmentExceptionAdvice}.java
controller/support/{AssessmentActorArgumentResolver, AssessmentWebConfig}.java
```

### 신규 (Test)

```text
backend/src/test/java/com/learnershigh/extension/assessment/controller/SchoolAssessmentApiTest.java   (integration)
backend/src/test/java/com/learnershigh/extension/assessment/controller/EvaluationPlanApiTest.java     (integration)
backend/src/test/java/com/learnershigh/extension/assessment/entity/SchoolAssessmentTest.java
backend/src/test/java/com/learnershigh/extension/assessment/service/plan/AnalysisImportValidatorTest.java
```

### 신규 (DB — 사용자 승인)

```text
database/migrations/V202611090300__create_assessment_school_assessment.sql
database/migrations/V202611090310__create_assessment_evaluation_plan.sql
```

### 수정 (Shared 성격 — 보고 대상)

```text
backend/src/main/resources/application.yml   assessment.analysis-import.enabled 추가 (기본 false, 기존 키 변경 없음)
```

### 신규 (문서)

```text
docs/specs/suyeon/assessment-ai-integration-handoff.md
docs/specs/suyeon/backend-run-2026-11/{IMPLEMENTATION-REPORT, API-STATUS, DB-STATUS, TEST-RESULT, NEXT-STEPS}.md
```

수정하지 않음: `backend/.../studentcare/**`, `backend/.../common/**`, 기존 Migration, `docs/api/api-contract.md`, `docs/architecture/**`, `docs/adr/**`, `frontend/**`.

## 5. 다른 Surface·담당자 영향

- **Wangyu Student Care**: 코드·DB 변경 없음. 기존 통합 테스트(Student Care 포함)가 모두 통과했다. 작업 중 `AssessmentWebConfig`가 `@WebMvcTest` Slice(Student Care `StudentCareLockConflictWebTest` 포함)의 Context 로딩을 깨뜨리는 회귀를 만들었으나, Provider를 지연 조회하도록 고친 뒤 재실행해 해결했다(TEST-RESULT §3).
- **공통 Web 설정**: Assessment 전용 `HandlerMethodArgumentResolver`를 하나 추가했다. `StudentActor`·`AdminActor` 타입 인자에만 작동하므로 다른 Controller에는 영향이 없다.
- **Frontend**: 코드 변경 없음. 응답 Shape은 Student `types.ts`의 `SchoolAssessment`, `EvaluationPlan`, Admin `AdminEvaluationPlan`과 맞췄다. 차이점은 API-STATUS §4에 정리했다.
