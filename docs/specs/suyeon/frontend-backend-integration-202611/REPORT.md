# Assessment Frontend ↔ Backend 연결 + v21.1 통합 보고 (2026-11-09~10)

## 1. 요약

| 목표 | 상태 | 검증 수준 |
|---|---|---|
| v21.1 합성 PDF 결과 실제 HTTP·MySQL 수신 | 완료 | 실제 서버 33/33 + 통합 테스트 |
| 없는 `itemKey` 참조 차단(G-7 A안) | 완료(+지필 Key 차단) | 통합 테스트 + 실제 서버 |
| Student 수행평가 목록·등록·상세·상태 변경 | 화면 HTTP 연결 완료 | 브라우저 검증 |
| Student 수행평가 수정(PATCH) | **API Adapter만**(화면 없음) | 서버 API |
| Student 평가계획서 목록 / 상세 | 목록 화면 연결 / 상세는 Adapter만 | 브라우저(목록) / 서버 API(상세) |
| Admin 학생 수행평가 조회 | 화면 HTTP 연결 완료(http 전용 화면) | 브라우저 검증 |
| Admin 평가계획서 목록·분석 후보 조회 | 화면 HTTP 연결 완료 | 브라우저 검증 |
| Admin PDF 등록·개정 (P1) | Adapter 연결 | **브라우저 미검증** |
| Admin 검토 확정 (P1) | **연결하지 않음**(과목 ID 매핑 UI 없음, C-7) | 버튼 비활성·PUT 없음 확인 |

"서버 API 확인", "화면 HTTP 연결", "브라우저 검증"을 구분한다. 브라우저 검증은 로컬 Chrome + 저장소 Playwright 1.63.0(라이브러리만 사용, 공용 `e2e/` 테스트는 추가·수정하지 않음)으로 했다. 인증·학업 Context·학생 정보는 여전히 Mock이다.

## 2. 구현 내용

### Backend (Assessment 소유 코드만)

- `service/plan/ConfirmedItemKeys.java`(신규): 검토에 쓰인 Run에서 itemKey를 찾고 종류(수행/지필/없음)를 돌려준다.
- `service/school/SchoolAssessmentService.java`: `evaluationItemRef` 검사에 itemKey 확인 추가(`unknown` / `not_allowed`).
- `service/plan/PlanViews.java`, `EvaluationPlanService.java`: 분석 수신 응답이 그 요청의 Run을 가리키도록 수정(D-3).
- Migration·`application.yml`·`api-contract.md`·`common/**`·Student Care 변경 없음.

### Student Frontend (`frontend/student/src/features/assessment/api/**`)

- 신규 `api/http/`: `assessmentHttpClient.ts`(같은 Origin `/api`, 개발 전용 Mock Header, §5 오류 그대로), `schoolAssessmentHttp.ts`, `academicContextHttp.ts`, `evaluationPlansHttp.ts`.
- Facade 연결: `schoolAssessmentApi.ts`(목록·상세·등록·상태 + 신규 `updateSchoolAssessment`), `academicContextApi.ts`(GET), `evaluationPlansApi.ts`(목록 + 신규 `getEvaluationPlan`).
- Mock 대응 함수 추가(같은 시그니처): `updateSchoolAssessmentMock`, `getEvaluationPlanMock`.
- `types.ts`: `UpdateSchoolAssessmentRequest`(Backend 편집 필드 3개).
- 화면(routes/components)은 바꾸지 않았다.

### Admin Frontend (`frontend/admin/src/features/assessment/**`)

- 신규 `api/http/adminHttpClient.ts`, `api/http/assessmentAdminHttp.ts`(Backend Shape → 화면 Shape 변환).
- `api/assessmentAdminApi.ts`: 9개 함수를 Data Source에 따라 Mock / http로 고르게 변경. 나머지는 그대로 Mock(http에서는 503).
- `api/types.ts`: `fileRef: string | null`, 선택 필드 `pageCount`, `confirmedFields[].subjectId`, 분석 `analysisId`·`analyzer`·`receivedAt`·`warnings`.
- `routes/StudentDetailRoute.tsx`: http 모드 전용 학생 기록 화면(학교 수행평가만, 이름·과목은 "계약 없음" 안내). Mock 모드 화면은 그대로다.
- `routes/EvaluationPlanReviewRoute.tsx`: http 모드에서 후보 안내·분석기 버전·확정값·경고 영역을 보이고, 확정 버튼은 이유와 함께 비활성.
- `routes/EvaluationPlansRoute.tsx`: http 모드 업로드 완료 안내 문구("원본 미보관·서버 분석 없음").
- Admin Shell·Sidebar·Router·Student Care·`vite.config.ts`는 수정하지 않았다.

### 테스트·Fixture·문서

- `backend/src/test/resources/assessment/analyzer-v21_1/`(PDF·JSON 바이트 복사 + README)
- `AnalyzerV211ImportAndItemKeyApiTest.java`(통합 2건)
- 이 폴더 보고서 5종, `scripts/`(브라우저 검증·v21.1 HTTP 검증·Student 검증용 Vite 설정)
- `docs/specs/suyeon/progress.md` 항목 추가, `backend-run-2026-11/AI-BACKEND-CONTRACT-GAPS.md` G-7 상태 갱신

## 3. 실제 연결 결과

### 3-1. 브라우저 (최종 빌드, 32/32 PASS)

환경: Backend 18080(`lh_assessment_e2e_v211b`), Student Vite 5173(http, `stu_001`, 검증용 Proxy 설정), Admin Vite 5174(http, 기존 Proxy).

| 영역 | 확인 |
|---|---|
| S2 목록 | 서버 항목 표시, Mock 배지 없음, 상태 필터(진행 중/시작 전)·과목 화면이 서버 Query(`status=`, `subjectId=`)로 전달 |
| S3 등록 | 화면 Modal 등록 → 서버 1건(마감일 null, BEFORE_START) → 새로고침 후 같은 항목 |
| S4 상세 | 서버 상세 GET 200, 제목 표시 |
| S5 수정 | 서버 PATCH(API 직접) 후 상세 새로고침에 마감일 반영 |
| S6 상태 | 화면 선택 → 서버 IN_PROGRESS, 역방향 선택지 비활성, 서버 역방향 409 |
| S7 평가계획서 | 학생 목록 GET 200, AI 후보 미노출 |
| 오류 | 다른 학생 기록 404 표시·내용 미노출 / 서버 400 필드 오류·Modal 유지·저장 없음 / 401 / 연결 실패 → 오류 표시, Mock 값 없음 |
| A1 | 강남 관리자 화면 = 학생 서버 목록(같은 ID·상태), 수정 UI 없음 / 분당 관리자 404 |
| A2·A3 | 평가계획서 목록에 서버 문서, "원본 PDF" 비활성 |
| A4 | 분석 조회 200, 외부 분석기 후보 안내·버전, 후보 과목·항목, 확정값 영역 분리 |
| A5 | 확정 버튼 비활성, 화면을 열어도 PUT 없음 |

Mock 모드 회귀(별도 실행): Student는 "시연용 샘플 데이터" 배지와 Fixture 5건이 보이고 `/api` 호출이 0건이다. Admin은 "시연 데이터" 표시와 기존 학생 상세·평가계획서 화면이 그대로다.

### 3-2. 실제 서버 HTTP

v21.1 33/33 PASS (`V211-E2E-RESULT.md`).

## 4. 테스트 결과

| 명령 | 결과 |
|---|---|
| `scripts/verify-backend.ps1` | **PASS** |
| 단위 테스트 | 246 / 실패 0 (기준선 246, 변화 없음) |
| 통합 테스트 | 122 / 실패 0 (기준선 120 + 신규 2) — Student Care 77건 포함 |
| 신규 통합 2건 반복 | `--rerun` 3회 모두 통과 (D-3 수정 확인용) |
| `scripts/verify-frontend.ps1` | **PARTIAL PASS** — typecheck·lint·build 통과, Frontend 단위 테스트는 미구성(스크립트 표기) |
| Production Build의 개발 Header | Student 번들에 없음 / Admin 번들에는 라벨 함수의 키 문자열만 있고 Header 함수는 `{}`를 반환(전송 안 됨) |

작업 중 겪은 문제:

| # | 증상 | 원인 | 조치 |
|---|---|---|---|
| 1 | 전체 통합 테스트에서 신규 테스트 1건 간헐 실패 | D-3(수신 응답의 Run ID가 최신 시각 기준) | Backend 수정 + 회귀 assert |
| 2 | 1차 itemKey 구현이 W01(지필) 참조 허용 | 계약 §12 확인 누락 | 수행 항목만 허용(D-2) |
| 3 | "가장 최근 검토" 기준이 시각 동률에서 흔들림 | 대체 규칙 미확정 상태에서 최신을 기준으로 잡음 | "검토된 Run 중 하나" 규칙으로 변경 |
| 4 | 브라우저 연결 실패 시나리오가 빈 화면 | 제 검증 스크립트가 `**/api/**`로 Vite 소스 모듈까지 차단 | `/api/student/**`만 차단하도록 수정 후 통과 |
| 5 | Student Vite Proxy 없음 | Shared 설정 | 저장소 밖 검증용 설정으로만 실행, 변경안 기록 |

## 5. 다른 담당·Shared 영향

- Student Care: 코드 변경 없음, 통합 77건·단위 145건 통과.
- Shared 파일(`vite.config.ts`, `api-contract.md`, `common/**`, `e2e/**`, Migration) 변경 없음.
- `frontend/student/vite.config.ts`는 작업 전부터 다른 변경(10/29)이 있었다. 이번에 건드리지 않았다.

## 6. 미완료

| 항목 | 이유 |
|---|---|
| Student 수행평가 수정 화면 | 기존 화면에 수정 UI가 없음(버튼은 안내만). 새 화면은 만들지 않음 |
| Admin 검토 확정 화면 연결 | 분석 과목 → 학업 과목 ID 매핑 UI 필요(C-7) |
| Admin PDF 업로드 브라우저 검증 | 시간 우선순위(P1). Adapter·타입·서버 API만 확인 |
| Admin 학생 목록·이름·수강 과목 | §34 응답 Shape 없음 |
| Student 개인 PDF·분석·노트·결과물·피드백 | Backend 미구현(P1·File Storage) |
| 실제 인증·학업 Context | Mock (API-OD-A01, OD-A04) |
| 공용 Playwright E2E 등록 | `e2e/**` Shared 승인 필요(제안만) |
