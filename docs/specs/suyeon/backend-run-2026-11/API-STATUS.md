# Assessment API 구현 현황 (2026-11-09)

> 기준 계약: `docs/api/api-contract.md` (DRAFT). 구현은 계약 Shape을 따랐고, 계약에 없는 것은 "PROPOSED"로 표시했다.  
> 인증(개발용 Mock, 사용자 승인): 학생 `X-Assessment-Student-Id: <stu_xxx>`, 관리자 `X-Assessment-Admin-Id: adm_gangnam | adm_bundang | adm_plan_operator`. Header가 없거나 알 수 없는 ID면 `401 UNAUTHORIZED`.

## 1. Student

| Method | Endpoint | Request | Response | 권한 | 구현 | 테스트 |
|---|---|---|---|---|---|---|
| GET | `/api/student/assessment/academic-context?academicYear&semester` | Query 둘 다 필수 | §9-1 `{school, academicYear, grade, semester, subjects[], source}` | 본인 | 예(Mock 원천) | 통합 |
| PUT | `/api/student/assessment/academic-context` | — | — | — | **아니오** (Write Owner 미확정) | — |
| GET | `/api/student/assessment/school-assessments` | `academicYear`·`semester` 필수, `subjectId`, `status`, `query`, `sort`(`deadlineDate,asc` 기본 \| `createdAt,desc` \| `title,asc`), `page`(0~), `size`(1~100) | `{items: SchoolAssessment[], page{number,size,totalElements,totalPages}}` | 본인 것만 | 예 | 통합 |
| POST | `/api/student/assessment/school-assessments` | `{title*, subjectId*, academicYear*, semester*, deadlineDate?, description?, status?, evaluationItemRef?}` | 201 `SchoolAssessment` | 본인(인증) | 예 | 통합 |
| GET | `/api/student/assessment/school-assessments/{id}` | — | `SchoolAssessment` | 본인 것만(아니면 404) | 예 | 통합 |
| PATCH | `/api/student/assessment/school-assessments/{id}` | `title` / `description` / `deadlineDate` 중 일부. 없으면 유지, null이면 비움 | `SchoolAssessment` | 본인 것만 | 예 | 통합 |
| DELETE | `/api/student/assessment/school-assessments/{id}` | — | — | — | **아니오** (OD-A11) | — |
| PATCH | `/api/student/assessment/school-assessments/{id}/status` | `{status}` | `{assessmentId, status, updatedAt}` | 본인 것만 | 예 | 단위·통합 |
| GET | `/api/student/assessment/evaluation-plans?schoolId&academicYear&grade&semester` | 4개 필수 | `{items: [{planId, documentRevisionId, schoolId, academicYear, grade, semester, fileName, sourceUrl, reviewStatus, uploadedAt}]}` | 본인 학교·학년·학기만(아니면 403) | 예 | 통합 |
| GET | `/api/student/assessment/evaluation-plans/{planId}` | — | 위 항목 1개 | 본인 슬롯만(아니면 404) | 예 | **미검증** |
| POST | `/api/student/assessment/evaluation-plans/uploads` | — | — | — | **아니오** (File Storage·OD-A13) | — |
| POST/GET/PUT | `.../evaluation-plans/{documentRevisionId}/analysis`, `/personal-review` | — | — | — | **아니오** | — |

`SchoolAssessment` = `{assessmentId, title, subjectId, status, deadlineDate|null, createdAt, evaluationItemRef|null}` (§12).

## 2. Admin

| Method | Endpoint | Request | Response | 권한 | 구현 | 테스트 |
|---|---|---|---|---|---|---|
| GET | `/api/admin/assessment/students/{studentId}/school-assessments?academicYear&semester&page&size` | | `{items: SchoolAssessment[], page}` (학생과 같은 Shape·ID) | 관리자 지점에 속한 학생만(아니면 404) | 예 | 통합 |
| GET | `/api/admin/assessment/students`, `/students/{id}` | — | — | — | **아니오** (계약에 응답 Shape 없음) | — |
| GET | `/api/admin/assessment/evaluation-plans?schoolId&academicYear?&grade?&semester?` | | `{items: AdminEvaluationPlan[]}` | 학교 운영 권한(아니면 403) | 예 | 통합 |
| POST | `/api/admin/assessment/evaluation-plans` (multipart) | `file`(PDF ≤20MB), `schoolId`, `academicYear`, `grade`, `semester`, `sourceUrl?` | 201 `{planId, documentRevisionId, schoolId, academicYear, grade, semester, fileRef:null, analysisStatus:"NOT_REQUESTED", reviewStatus:"UNREVIEWED"}` | 학교 운영 권한 | 예 | 통합·서버 |
| GET | `/api/admin/assessment/evaluation-plans/{planId}` | | `AdminEvaluationPlan` | 운영 권한(아니면 404) | 예 | 통합 |
| POST | `/api/admin/assessment/evaluation-plans/{planId}/revisions` (multipart) | `file`, `sourceUrl?` | 201 (위와 같음) | 운영 권한 | 예 | 통합 |
| POST | `.../revisions/{revisionId}/analysis` | — | — | — | **아니오** (원본 미보관) | — |
| GET | `.../revisions/{revisionId}/analysis` | | `PlanAnalysisResponse` (인계서 §5-1) | 운영 권한 | 예 | 통합 |
| PUT | `.../revisions/{revisionId}/review` | `{analysisId, decision:"CONFIRM", reviewedSubjects[{subjectId, confirmedFields[{fieldPath, value, pdfPageNumber}]}]}` | `PlanAnalysisResponse` | 운영 권한 | 예 | 통합·서버 |
| POST | `.../revisions/{revisionId}/analysis-imports` | `AnalysisImportRequest` (인계서 §3) | 201 신규 / 200 동일 내용 재전송 | 운영 권한 | 예 (**PROPOSED, 기본 off**) | 통합·서버 |

`AdminEvaluationPlan` = `{planId, schoolId, academicYear, grade, semester, revisions[{documentRevisionId, revisionNumber, fileName, fileRef, sizeBytes, pageCount, sourceUrl, uploadedAt, analysisStatus, reviewStatus, confirmedFields[]}]}`.

## 3. Error

| 상황 | Status / code |
|---|---|
| 인증 없음·알 수 없는 사용자 | 401 `UNAUTHORIZED` |
| 학교 운영 권한 없음 / 다른 학교 평가계획서 요청(학생) | 403 `FORBIDDEN` |
| 다른 학생·범위 밖 학생의 수행평가 | 404 `ASSESSMENT_NOT_FOUND` (존재 여부 비노출) |
| 없는·권한 밖 평가계획서 | 404 `NOT_FOUND` (§53에 전용 code 없음 → 계약 보완 대상) |
| 역전이 | 409 `INVALID_STATE_TRANSITION` `details{currentState, requestedAction}` |
| 동시 수정 | 409 `CONCURRENT_MODIFICATION` (공통) |
| 입력 오류 | 400 `VALIDATION_ERROR` `details.fields[{field, reason}]` |
| PDF 아님 / 20MB 초과 / 손상 PDF | 415 `UNSUPPORTED_FILE_TYPE` / 413 `FILE_TOO_LARGE` / 422 `PDF_EXTRACTION_FAILED` |

## 4. 계약·Frontend와의 차이 (보완 필요)

| # | 내용 | 현재 처리 |
|---|---|---|
| C-1 | §12 목록의 허용 `sort` 값이 계약에 없음 | Frontend Stage 1과 같은 3개만 허용, 그 밖의 값은 400 |
| C-2 | §9-1 Query 생략 시 의미가 계약에 없음 | 두 값 필수 |
| C-3 | §12 PATCH의 편집 가능 필드가 계약에 없음 | title / description / deadlineDate |
| C-4 | §12 등록 시 `status` 생략 의미 | `BEFORE_START` |
| C-5 | §13 같은 상태 재요청 | 변경 없는 200 |
| C-6 | §53에 평가계획서 Not Found code 없음 | 공통 `NOT_FOUND` |
| C-7 | Admin Frontend `confirmedFields`는 `subjectName`, 계약 §39 review는 `subjectId` | 계약대로 `subjectId` |
| C-8 | Admin Frontend `PageResponse`는 `page`가 숫자(평면), 계약 §4는 `page` 객체 | 계약대로 객체 |
| C-9 | 중복 등록 알림을 응답에 담는 필드가 계약에 없음 | 막지 않음, Frontend가 `evaluationItemRef`로 감지 |
| C-10 | 외부 분석 결과 수신 Endpoint가 계약에 없음 | PROPOSED, 기본 off |
| C-11 | 계약은 `fileRef`를 문자열로 예시, 원본 미보관 | `fileRef: null` |
