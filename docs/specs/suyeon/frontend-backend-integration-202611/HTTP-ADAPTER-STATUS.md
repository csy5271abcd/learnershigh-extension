# Assessment HTTP Adapter 연결 현황 (2026-11-10)

> 구분: **서버 API 확인**(HTTP 직접 호출) / **화면 HTTP 연결**(화면이 실제 Backend 데이터를 씀) / **브라우저 검증**(Chrome + Playwright로 화면 조작 확인).
> 전환 스위치: `VITE_ASSESSMENT_DATA_SOURCE = mock | http` (Surface별, 미지정 시 개발 서버 mock · Production http). 전환은 Resource 단위다. http 모드에서 연결하지 않은 Resource는 "연결 전" 오류(503)로 끝나며 **Mock 값을 돌려주지 않는다.**

## 1. 개발 환경 설정 (개발 서버 전용, 실제 인증 아님)

| 변수 | Surface | 값 예 | 의미 |
|---|---|---|---|
| `VITE_ASSESSMENT_DATA_SOURCE` | Student·Admin | `http` | 실제 Backend 사용 |
| `VITE_ASSESSMENT_DEV_STUDENT_ID` | Student | `stu_001` | `X-Assessment-Student-Id` Mock Header |
| `VITE_ASSESSMENT_DEV_ADMIN_ID` | Admin | `adm_plan_operator` / `adm_gangnam` / `adm_bundang` | `X-Assessment-Admin-Id` Mock Header |
| `VITE_ASSESSMENT_DEV_CURRENT_TERM` | Student·Admin | `2026-1` | "현재 학기" (계약에 기준 없음, C-2) |
| `VITE_ASSESSMENT_DEV_PLAN_SCHOOLS` | Admin | `school_001` 또는 `school_001:학교명` | 담당 학교 목록(Endpoint 없음) |
| `VITE_API_TARGET` | Admin | `http://localhost:18080` | 기존 Admin vite.config `/api` Proxy 대상 |

- Mock Header는 `import.meta.env.DEV`일 때만 붙는다. Production Build에서는 Header 함수가 빈 객체를 돌려준다(Build 결과 확인). 그래서 서버가 401을 주고 화면은 오류를 표시한다.
- 존재하지 않는 학생·관리자를 만들지 않는다. Backend Mock에 있는 ID만 쓴다.
- **Student 개발 서버에는 `/api` Proxy가 없다**(`frontend/student/vite.config.ts`는 Shared 영향 영역이라 수정하지 않음). 검증은 저장소 밖 설정 `scripts/vite.student-http.config.ts`(같은 설정 + Proxy만 추가)로 했다. 변경안은 `INTEGRATION-NEXT-STEPS.md` §2에 있다.
- Backend에 CORS 설정이 없다. Adapter는 같은 Origin `/api`만 쓰고 CORS를 우회하지 않는다.

## 2. Student

| Resource / 함수 | Endpoint | http | 화면 연결 | 브라우저 검증 | 비고 |
|---|---|---|---|---|---|
| 학업 Context `getAcademicContext` | GET `/api/student/assessment/academic-context` | 예 | 예(Layout·학기 선택) | 예 | 학기 생략 시 `VITE_ASSESSMENT_DEV_CURRENT_TERM`, 없으면 이유 오류. Backend 원천은 Mock(`source` 값이 `EXISTING_LEARNERSHIGH`로 오지만 실제로는 Mock) |
| 학업 Context 변경 `updateAcademicContext` | PUT | 아니오 | — | — | Write Owner 미정(§9-2) |
| 과목 직접 추가 `createStudentSubject` | (계약 없음, P-26) | 아니오 | — | — | Mock 전용 |
| 수행평가 목록 `listSchoolAssessments` | GET `.../school-assessments` | 예 | 예 | 예 | 학년도·학기·과목·상태·검색어·정렬(3값)·페이지를 Query로 전달 |
| 수행평가 등록 `createSchoolAssessment` | POST | 예 | 예(추가 Modal) | 예 | 실패 시 Modal 유지·필드 오류, 성공 Toast 없음 |
| 수행평가 상세 `getSchoolAssessment` | GET `.../{id}` | 예 | 예 | 예 | |
| 수행평가 수정 `updateSchoolAssessment` | PATCH `.../{id}` | 예(신규 함수) | **아니오** | 서버 API만 | 화면의 "평가 정보 수정" 버튼은 기존대로 안내만 한다(새 화면 만들지 않음) |
| 상태 변경 `changeSchoolAssessmentStatus` | PATCH `.../{id}/status` | 예 | 예 | 예 | 역방향 선택지는 화면에서 비활성. 서버 409는 API로 확인 |
| 평가계획서 목록 `listEvaluationPlans` | GET `.../evaluation-plans` | 예 | 예(PDF로 가져오기 Modal) | 예 | 후보 미노출 |
| 평가계획서 상세 `getEvaluationPlan` | GET `.../evaluation-plans/{planId}` | 예(신규 함수) | 아니오(쓰는 화면 없음) | 서버 API만 | |
| 개인 PDF 업로드·분석·개인 검토 | §10-2·§11 | 아니오 | — | — | Backend 미구현(File Storage, OD-A13). http에서 "연결 전" |
| 노트·결과물·피드백·심화·자료함·성장 기록 | §18~§32 | 아니오 | — | — | P1·Backend 미구현. http에서 "연결 전"(목록의 '기록' 칸에 오류 아이콘이 보이는 이유) |

## 3. Admin

| Resource / 함수 | Endpoint | http | 화면 연결 | 브라우저 검증 | 비고 |
|---|---|---|---|---|---|
| 학생별 학교 수행평가 `listStudentSchoolAssessments` | GET `/api/admin/assessment/students/{id}/school-assessments` | 예 | 예(http 전용 학생 기록 화면) | 예 | 학생과 같은 ID·상태. 수정 UI 없음. 과목은 ID로 표시(이름 원천 없음) |
| 학생 목록·상세 `listStudents`·`getStudent` | §34 | 아니오 | — | — | 계약에 응답 Shape 없음. http 학생 화면은 주소(`/assessment/students/{id}?term=2026-1`)로 연다 |
| 담당 학교 `listSchools` | (없음) | 개발 설정으로만 | 예 | 예 | Production은 "연결 전" |
| 학년도 `listPlanYears` | GET `.../evaluation-plans?schoolId` | 예 | 예 | 예 | 등록 문서의 학년도 + 개발용 현재 학년도 |
| 평가계획서 목록 `listEvaluationPlans` | GET `.../evaluation-plans` | 예 | 예 | 예 | `fileRef:null`. "원본 PDF" 버튼은 비활성 |
| PDF 등록·개정 `uploadEvaluationPlan`·`addPlanRevision` | POST (multipart) | 예 | 예 | **아니오**(서버 API·타입만) | 등록 후 같은 문서를 다시 읽어 개정 이력을 보여줌. 안내 문구는 "원본 미보관·서버 분석 없음" |
| 서버 분석 실행 `requestPlanAnalysis` | §39 POST | 아니오 | 버튼은 있음 → 이유 오류 | — | Backend 미구현(원본 미보관) |
| 분석 후보 조회 `getPlanAnalysis` | GET `.../analysis` | 예 | 예 | 예 | 후보·확정값·경고·분석기 버전 분리 표시. 빈 값은 "미확인"(원문에 없음 아님) |
| 검토 확정 `savePlanReview` | PUT `.../review` | **아니오** | 버튼 비활성(이유 표시) | 예(PUT 없음 확인) | 화면에 분석 과목 → 학업 과목 ID 매핑 UI가 없음(C-7). 임시 저장(SAVE)은 Backend에 없음 |
| 피드백·심화 콘텐츠·자료실·Overview | §33~§47 | 아니오 | — | — | Backend 미구현 |

### Admin 변환 (Adapter 내부)

| 차이 | 처리 |
|---|---|
| C-8 `PageResponse.page` 객체 ↔ 화면 `{items}` | 학생 수행평가는 `items`만 넘기고 `totalElements`를 덧붙임 |
| C-7 `confirmedFields.subjectId` ↔ 화면 `subjectName` | `subjectName` 칸에 `subjectId`를 넣고 `subjectId`도 보존(이름을 지어내지 않음) |
| C-11 `fileRef:null` | Admin 타입을 `string \| null`로 넓힘 |
| 수신 Shape(채점 요소·수준 객체) ↔ 화면 `rubric: string[]` | "요소(수준 점수 / …)" 문장으로 표시. 값은 바꾸지 않음 |
| 성취기준·교수학습계획 | 수신 계약에 없어 빈 배열(화면에는 표시하지 않음) |

## 4. 오류 처리

| 상황 | Student | Admin |
|---|---|---|
| 400 `VALIDATION_ERROR` | 필드 사유를 해당 입력 옆에 표시(브라우저 확인: `subjectId: unknown`) | 공통 RemoteView 오류 |
| 401 (Header 없음) | "불러오지 못했어요" 오류 + 다시 시도, 데이터 미표시(브라우저 확인) | 같은 방식(코드 경로) |
| 403 | 공통 오류 표시(서버 API로 학생 다른 학교 403 확인) | — |
| 404 | 다른 학생 기록: "찾을 수 없어요", 내용 미표시(브라우저 확인) | 다른 지점: 오류 표시, 기록 미표시(브라우저 확인) |
| 409 | 역방향은 화면에서 비활성, 서버 409 확인(API) | — |
| 연결 실패 / JSON 아닌 응답 | `NETWORK_ERROR` / 502 오류. Mock 값으로 바꾸지 않음(브라우저 확인) | 같은 클라이언트 규칙 |
| 미연결 Resource | 503 `INTERNAL_ERROR` "서버 연결 전" | 503 `ASSESSMENT_API_NOT_CONNECTED` + 이유 |
