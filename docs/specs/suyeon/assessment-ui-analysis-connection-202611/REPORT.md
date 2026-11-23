# 실제 화면 오류 수정 · 심화 탐구 정적 참고자료 복구 · PDF/HWP/HWPX 분석 미리보기 연결 (2026-11-11)

> 상태: **Frontend 구현 + 개발 환경 브라우저 검증 완료. Commit·Push·Merge 하지 않음.**
> 공식 API 계약(`api-contract.md`)·Migration·Backend·Admin·Shared `vite.config.ts`는 바꾸지 않았다.
> 분석 미리보기는 **개발 전용·별도 프로세스·Flag OFF 기본**이며, 11-12 PDF v21.1 시연 환경(5173·5174·18080)에는 적용하지 않았다.

## 0. 한눈에 보기

| 항목 | 결과 |
|---|---|
| 심화 탐구 "서버 연결 전 (Stage 2)" 오류 | **해결.** http 모드에서 정적 참고자료로 열림 (Backend 정상 36/36, Backend 없음 37/37) |
| 심화 탐구 작성 기능 | 직접 만들기·내 탐구·탐구 시작·내 지문 등록·노트에 추가 **화면에서 제거**, 폐기 Route는 목록으로 Redirect. 데이터·코드 파일은 삭제하지 않음 |
| 평가계획서 분석 미리보기 | **계정 B 실제 분석기(127.0.0.1:8765)에 연결 완료.** PDF·HWP·HWPX 실제 분석 성공, 실패 4종 구분 (36/36) |
| PDF payload 일치 | 화면에서 보낸 합성 PDF의 결과 payload = 계정 B 저장 산출물 `analysis-import.json`과 **완전 일치** |
| 기본 시연 환경 | Flag OFF → 기존 "PDF로 가져오기" Modal 그대로 (브라우저 확인) |
| Production 번들 | 분석 미리보기 코드·`/dev-analysis` 경로·토큰·Mock 인증 Header 문자열 **0건** |
| Backend 단위/통합·기존 브라우저 회귀 | **이번에 재실행하지 않음** — 사유와 대체 확인은 §9 |

---

## 1. 현재 API 연결 진단 결과

`frontend/student/src/features/assessment/api/*.ts`의 모든 Adapter 함수를 조사했다(작업 시작 시점). Student 실행 설정은 `run-student-http-dev.ps1`(방법 B, Shared vite.config 무수정, `/api` → 18080 Proxy).

| Adapter | http 모드 동작 | 구분 |
|---|---|---|
| `schoolAssessmentApi` (목록·상세·생성·수정·상태) | **실제 Backend** (`api/http/schoolAssessmentHttp.ts`) | 정상 연결 — 유지 |
| `academicContextApi.getAcademicContext` | **실제 Backend** | 정상 연결 — 유지 |
| `academicContextApi` 학업 정보 수정·과목 추가 | 503 "연결 전" | API 미구현 (Backend 없음) |
| `evaluationPlansApi` 목록·상세 | **실제 Backend** | 정상 연결 — 유지 |
| `evaluationPlansApi` 학생 업로드·분석 요청·분석 조회·개인 검토 | 503 "연결 전" | API 미구현 (학생 업로드 계약·File Storage 미결) |
| `assessmentDetailApi` 노트·Revision·결과물·버전·피드백 (13개) | 503 "연결 전" | API 미구현 (Stage 2 범위 밖) |
| `growthArchiveApi` 성장 기록·보관함 (6개) | 503 "연결 전" | API 미구현 |
| `resourcesApi` 자료함 (5개) | 503 "연결 전" | API 미구현 |
| `enrichmentApi` 공개 콘텐츠·모의고사·대학 자료 (읽기) | 503 "연결 전" | **정적 콘텐츠 전환 누락** ← 이번 버그 |
| `universityExamApi` 대학 PDF 목록·상세 | 503 "연결 전" + 원문 URL `null` | **정적 콘텐츠 전환 누락** |
| `referenceLinksApi` 참고자료 카탈로그 | 503 "연결 전" | **정적 콘텐츠 전환 누락** (계약 없음, P-24) |
| `enrichmentApi` 개인 Task·개인 지문 (쓰기 포함) | 503 "연결 전" | 폐기 범위(2026-11-03). 화면 진입 제거 |

화면별 원인

| 화면 | 증상(수정 전) | 원인 |
|---|---|---|
| `/assessment` 홈 | 수행평가 영역 정상, 피드백·보관함 영역은 "연결 전" 오류 | API 미구현(정상 정책) |
| `/assessment/school-assessments` | 정상(실제 API 200) | — |
| `/assessment/enrichment` | 목록·미리보기 "연결 전", 과목 칩이 비어 맞지 않음 | 정적 콘텐츠 전환 누락 + 콘텐츠 과목 ID(`subj_01~04`)와 http 학업 정보 과목 ID(`subj_11~14`) 불일치 |
| `/assessment/enrichment/mock-exams` | "Assessment 서버 연결 전이에요 (Stage 2) (INTERNAL_ERROR)" | 정적 콘텐츠 전환 누락 |
| `/assessment/enrichment/universities` | "연결 전", PDF도 안 열림 | 정적 콘텐츠 전환 누락 + 원문 URL이 `isMockDataSource`일 때만 생성됨 |
| `/assessment/reference-links` | "연결 전" | 정적 콘텐츠 전환 누락 |
| 학생 평가계획서 가져오기 Modal | 공통 문서 목록은 실제 API, 내 PDF 업로드·분석은 503 | API 미구현 (학생 업로드·분석 계약 없음). 분석기 연결 자체가 없었음 |

**서버 전체 연결 실패·개발 서버 설정 오류는 아니었다.** 작업 시작 시 18080(Backend jar)·5173(Student, http 설정)·5174(Admin)·3307(MySQL)이 모두 실행 중이었고, `/api/student/assessment/academic-context` 200, 수행평가 목록 200을 확인했다.

## 2. 심화 탐구 미노출의 정확한 원인

1. 2026-11-03 범위 변경으로 명세(`features/assessment-enrichment-content.md` §1·§6)는 심화 탐구를 **Frontend 정적 참고자료(dataSource 무관, http에서도 503 없음)**로 정했지만, 같은 문서 §10에 적힌 대로 **코드는 바뀌지 않았다.**
2. 그래서 `enrichmentApi`·`universityExamApi`·`referenceLinksApi`의 읽기 함수가 여전히 Contract Mock 규칙(`isMockDataSource ? Mock : httpNotConnected()`)을 따랐고, http 모드에서 503 `INTERNAL_ERROR` "Assessment 서버 연결 전이에요. (Stage 2)"를 냈다.
3. 추가로 대학 PDF 원문 주소가 `import.meta.env.DEV && isMockDataSource`일 때만 만들어져 http 개발 서버에서는 원문도 열리지 않았다.
4. 탐구 라이브러리 과목 필터는 학생 학업 정보(학기별 과목 ID)에 묶여 있어 http 학업 정보와 콘텐츠 과목 ID가 맞지 않았다.

## 3. 정적 참고자료 화면 수정 결과

구조

```text
학교 수행평가·평가계획서 → 실제 HTTP API (변경 없음)
심화 탐구 참고자료      → content/enrichmentContent.ts (정적, dataSource 무관)
그 밖의 미구현 기능     → 기존 "연결 전" 정책 유지 (Mock Fallback 없음)
```

- 신규 `frontend/student/src/features/assessment/content/enrichmentContent.ts`: 명세 §6-2의 **승인 전 임시 위치**. 기존 Fixture(탐구 8개, 모의고사 60선, 대학 Manifest 27문서, 참고자료 카탈로그)를 **그대로** 읽는 동기 조회 함수만 제공. 원본 데이터 파일은 Admin(`canonicalSource.ts`)도 같은 경로로 읽으므로 옮기지 않았다(복제 금지).
- `enrichmentApi`(§16·§17 읽기), `universityExamApi`, `referenceLinksApi`의 읽기 함수가 이 모듈을 쓰도록 바꿈. 없는 ID는 404(`ENRICHMENT_CATALOG_NOT_FOUND`·`MOCK_EXAM_MATERIAL_NOT_FOUND`·`UNIVERSITY_RESOURCE_NOT_FOUND`) → 화면 "찾을 수 없어요".
- 탐구 라이브러리: 과목 필터를 **콘텐츠 자체 교과 이름**(통합사회·통합과학·공통국어·과학탐구실험)으로 바꿈. URL `subject`·`q`·`selected` 유지. 미리보기에 "출처 확인 필요" 표시(외부 출처 미연결 — 지어내지 않음).
- 모의고사 지문: 60개(영어 30·국어 30) 목록·과목 탭·학년/시기/계열 필터·검색·상세. 로컬 원문(`mockExamPassages.local.json`, Git 제외)이 이 PC에 60개 있어 상세에 원문이 보인다. 원문이 없는 환경에서는 카드에 **"원문 미포함"**, 상세에 "원문 미포함 · 배포 권한 확인 전" 안내(원문 생성 없음).
- 대학별 자료: 27문서 목록·검색·필터·상세·**앱 안 PDF 뷰어**(개발 서버 전용 `/__dev/university-exams`, Manifest 크기·SHA-256 검사 그대로). 원문 주소 조건을 `DEV`만으로 바꿔 http 개발 서버에서도 열림. 파일 없음·변경은 기존 404/409 안내 그대로. **Production Build에는 원문 PDF 없음**(API-OD-A11).
- 참고자료(`/assessment/reference-links`): 정적 카탈로그로 열림. 이 화면의 "자료함에 저장"은 자료함 API 미구현이라 기존 "연결 전" 정책 그대로 둠.
- 심화 탐구 화면에서 "실제 Backend에 저장돼요" 개발 안내(MockDataNotice)를 뺐다(정적 자료인데 저장 안내가 보이면 오해 소지). 대신 "학생 기록으로 저장되지 않아요" 표시.

브라우저 검증(`scripts/enrichment-static-e2e.mjs`, Headless Chrome 1440×960)

| 실행 | 환경 | 결과 |
|---|---|---|
| up | 시연 Student 5173(http) + Backend 18080 | **36/36** |
| down | 별도 Student 5183(http, Proxy 대상 = 비어 있는 18099) — 시연 Backend는 끄지 않음 | **37/37** |

확인 항목: 목록 로딩(탐구 8·모의고사 60·대학 27), 탭 3개, 선택 카드 = 미리보기, 교과 필터, 검색 Empty(오류와 구분), 영어 필터 30, 검색 URL 반영, 상세·새로고침 유지, 없는 ID 안내, PDF canvas 렌더링·`?page=` 유지, 참고자료 표시, 폐기 Route Redirect, **심화 화면이 `/api` 심화 요청 0건**, 페이지 예외 0.
down 마지막 시험: 심화 탐구는 정상 열람, 수행평가 화면은 실제 요청(`academic-context`)이 502로 실패하고 "학업 정보를 불러오지 못했어요 (HTTP 502)" + 다시 시도 표시(빈 목록·Mock 표시 아님).

캡처(직접 확인): 탐구 라이브러리, 모의고사 목록, 대학 PDF 뷰어(서울대 2026 구술 2쪽), Backend 없음 수행평가 오류 화면.

## 4. 제거·비활성화한 이전 기능

**화면·탐색에서만** 제거했다. Task·개인 지문 Fixture, Mock Store, Adapter 쓰기 함수, Route 컴포넌트 파일은 **삭제하지 않았다.**

| 제거/비활성 | 위치 |
|---|---|
| "직접 만들기" 버튼·만들기 Modal 진입, "내 탐구" 탭 | `EnrichmentFrame.tsx` |
| "이 탐구 시작하기", 진행 중/완료 배지, 콘텐츠 즐겨찾기 | `EnrichmentLibraryRoute.tsx` (재작성) |
| "내 지문 등록", 내가 등록한 지문, 스크린샷 영역, 카드 "심화 탐구 시작" | `MockExamMaterialsRoute.tsx`, `MockExamResearchCard.tsx` |
| 상세 "이 주제로 심화 탐구 시작"(2곳), "학교 수행평가에 아이디어로 연결"(이미 비활성 버튼) | `MockExamMaterialDetailRoute.tsx` |
| 대학 목록 "탐구 시작", PDF 화면 "이 문항/쪽으로 심화 탐구 시작"·"현재 쪽을 노트에 추가"·`?task=` 복귀 | `UniversityResourcesRoute.tsx`, `UniversityExamRow.tsx`, `UniversityExamDocumentRoute.tsx`, `ExamQuestionNavigator.tsx`(동작 버튼 선택 사항으로) |
| `/assessment/enrichment/my`, `/assessment/enrichment/tasks/:taskId` | `assessmentRoutes.tsx` → `/assessment/enrichment`로 Redirect |
| 학교 수행평가 상세 "연결된 심화 탐구" 행 | `SchoolAssessmentDetailRoute.tsx` (http에서 늘 "불러오지 못했어요"였음) |
| Sidebar 심화 탐구 "진행 중 Task 수" | `AssessmentLayout.tsx` |

**보호(유지):** 학교 수행평가 노트의 대학 기출 출처 카드(`ExamSourcePickerModal`·`EXAM_SOURCE`), `PdfViewer`, 대학 PDF 개발 서버 Plugin, 학교 수행평가·보관함 즐겨찾기.

### 별도 제안: 미사용 코드 정리(이번에 하지 않음)

영향 분석 결과, 아래는 이제 화면에서 도달하지 않는다. 지우려면 Admin `canonicalSource.ts`(`fixtureEnrichmentTasks` 재수출)·Admin 읽기 전용 Viewer·성장 기록의 `ENRICHMENT_TASK` 관련 소스 유형·`api/types.ts` Enum 축소(명세 §10 마지막 단계)를 함께 정리해야 하므로 Shared/Admin 영향 검토 후 진행한다.

- `routes/MyEnrichmentTasksRoute.tsx`, `routes/EnrichmentTaskDetailRoute.tsx`
- `components/enrichment/CreateEnrichmentModal.tsx`, `PersonalMaterialModal.tsx`, `ScreenshotRegionsModal.tsx`, `EnrichmentPanel.tsx`, `model/mockExamScreenshotStore.ts`
- `components/university/examTaskPrefill.ts`, `TaskExamSource.tsx`, `NoteTargetModal.tsx`, `components/notes/NoteContextPanel.tsx`의 `LinkedTasks`
- `enrichmentApi`의 Task·개인 지문 함수와 `mock/enrichmentMock.ts`의 해당 함수
- 성장 기록 작성 화면의 "관련 심화 탐구" 선택(`GrowthRecordFormRoute.tsx`, 성장 기록 자체가 http 미구현이라 이번 범위 밖)

## 5. PDF/HWP/HWPX 업로드 UI 구현 상태

- 신규 `components/pdf-import/AnalysisPreviewModal.tsx` — 제목 **"평가계획서 분석하기"**. 개발 Flag가 켜진 서버에서만 학교 수행평가 목록·홈의 버튼이 "평가계획서 분석하기"가 되고 이 Modal을 연다. Flag OFF면 기존 "평가계획 PDF 가져오기" Modal 그대로(`PdfImportModal` 진입점에서 분기).
- 상태: 파일 선택(끌어 놓기 포함) → 파일명·형식·크기·**내용 서명 확인** → 검증 오류 → 분석 시작 → 분석 중 → 성공(결과 미리보기) / 실패(종류별) → 다시 분석.
- 형식 검증: 확장자 `.pdf/.hwp/.hwpx` + 앞 8바이트 서명(PDF `%PDF-`, HWP OLE, HWPX ZIP)이 확장자와 맞아야 전송. 빈 파일·20MB 초과 차단. **최종 판별은 분석기가 파일 내용으로 다시 한다**(ZIP이지만 HWPX 아님 → 415).
- 결과 표시: 배지 **"자동 분석 후보 · 관리자 확인 전"**, 형식·쪽/구역 수·분석기 버전·상태·검토 상태(`DRAFT_UNREVIEWED`)·SHA-256 앞 12자, 과목별 지필/수행 비율, 수행평가 후보(이름·비율·만점·시기·내용·평가 요소), **근거 위치**(PDF 쪽 / HWP·HWPX 구역·표·행·열), HWP·HWPX는 "실험용 다중 형식 Adapter · 공식 확정 경로 아님" 안내, "저장되지 않았어요" 안내. 문서에 없는 값은 "미표기".
- 문구 결정: 요청 예시는 "AI 분석 후보"였지만 계정 B 서비스는 **LLM 호출 없는 규칙 기반 분석**(`analysisMode.llmCalls=false`)이며 서비스 안내 §6-5가 "AI 분석" 표기를 금지한다. 사실과 맞게 **"자동 분석 후보 · 관리자 확인 전"**으로 쓰고 "AI·LLM 호출 없음"을 함께 표시했다. "AI"로 바꾸려면 알려 달라.
- 저장 없음: 결과는 화면 상태에만 있다. 학생 수행평가 생성·평가계획서 Revision·관리자 확정·브라우저 저장소 기록 없음. 시험 중 `/api` 쓰기 요청 0건 확인.
- 실패 구분(`api/dev/analysisPreviewClient.ts`): **분석기 연결 실패**(서비스 꺼짐·Proxy·토큰 401/403), **지원하지 않는 문서**(415), **원문 추출 실패**(422 손상·ZIP 폭탄·경로 조작), **분석 실패**(500·504·Client 150초 초과), 파일 너무 큼(413), 분석기 바쁨(503 BUSY), 요청 오류(400). 실패를 Mock 결과로 대신하지 않는다.

변경 파일(Student): `api/dev/analysisPreviewClient.ts`(신규), `components/pdf-import/AnalysisPreviewModal.tsx`(신규), `components/pdf-import/analysisPreview.module.css`(신규, `--as-*` Token만), `components/pdf-import/PdfImportModal.tsx`(진입점 분기), `routes/SchoolAssessmentListRoute.tsx`·`routes/AssessmentHomeRoute.tsx`(Flag일 때 버튼 이름).

## 6. 계정 B 분석기 API 연결 여부

**연결됨(개발 환경).** 계정 B가 오늘 만든 서비스(`runs/v22-analysis-preview-service-20261111/REPORT.md`)를 확인했다. 작업 시작 때는 꺼져 있어(8765 연결 거부) 그 문서의 실행 방법 그대로 띄웠다(`.venv-llm` Python `-I -B -X utf8 tools/service/analysis_service.py`). 계정 B 파일은 **수정하지 않았다**(토큰 파일은 Node Proxy가 읽기만).

| 항목 | 값 |
|---|---|
| 주소·포트 | `127.0.0.1:8765` (127.0.0.1만 바인딩, Host 검사, CORS 없음) |
| Health | `GET /health` — PDF·HWP·HWPX, 기본 `v21.1`, `llmCalls=false`, PdfLayout(Java) 준비 확인 |
| 분석 | `POST /analyze-preview`, `multipart/form-data`, 필드 `file`(필수). `analyzerVersion` 미지정 → **v21.1 기본**(v21.2-quality 자동 전환 없음), `includeAnalysis` 미지정 → 원문 전체 미요청 |
| 인증 | `X-Analysis-Token` — **개발 서버 Proxy(Node)에서만** 부착. Frontend 코드·번들·`VITE_` 변수에 없음 |
| 응답 | 계약 `analyze-preview-0.1-dev`(서비스 내부 계약, LearnersHigh 공식 계약 아님). `backendImport.payload` = 기존 `AnalysisImportRequest` Adapter 출력(PDF `backend-adapter-0.2`, HWP/HWPX `multiformat-adapter-0.1-draft`) |
| 실패 | 400/401/403/411/413/415/422/503/504/500 + `errors[].code` (서비스 REPORT §3) |

호출 경로: 브라우저 → 같은 Origin `/dev-analysis/*` → 개발 서버 Proxy(쿠키·Origin·Referer 제거, 토큰 부착, `changeOrigin`) → `127.0.0.1:8765`. 분석기 주소는 로컬 주소만 허용(설정 시작 시 검사).

## 7. 실제 파일 분석 테스트 결과

`scripts/analysis-preview-e2e.mjs` — **36/36** (최종 코드로 재실행). **합성 문서만** 사용(계정 B 산출물 사본을 scratchpad에 복사, 실제 학교 문서 미사용).

| 파일 | 결과 |
|---|---|
| `synthetic-e2e.pdf` (30,783B) | 200 `OK_REVIEW_REQUIRED`, v21.1·DEFAULT, 받은 바이트 SHA = 원본 SHA, **payload = 계정 B `e2e/analysis-import.json`과 완전 일치**, `DRAFT_UNREVIEWED`, 원문 전체 미포함. 화면: 가상과학탐구 · 지필 1 · 수행 2(탐구 보고서·토론 활동) · 근거 PDF 쪽 |
| `synthetic-plan.hwp` | 200, 형식 HWP, SHA 일치, `EXPERIMENTAL_MULTIFORMAT`, payload에 `pdfPageNumber` 없음(가짜 쪽 번호 없음), 화면 근거 "구역·표·행·열" |
| `synthetic-plan.hwpx` | 위와 같음(HWPX) |
| `corrupt.pdf` (`%PDF-` + 임의 바이트) | 422 `PARSE_FAILED` → **원문 추출 실패** |
| `plain-zip.hwpx` (HWPX 아닌 ZIP) | 415 `UNSUPPORTED_FORMAT` → **지원하지 않는 문서** |
| `fake.pdf`(글자 파일), `renamed-hwpx.pdf`(확장자 위장), `too-large.pdf`(21.5MB) | 전송 전 화면에서 차단, 분석기 호출 0건 |
| 분석기 꺼짐(별도 서버 5177, 분석기 주소 = 빈 포트) | 배너 "연결 안 됨", 분석 시 **분석기 연결 실패**(HTTP 502), 가짜 결과 없음 |
| 기본 시연 서버 5173 (Flag OFF) | 버튼 "PDF로 가져오기"·제목 "평가계획 PDF 가져오기" 그대로, 미리보기 배너 없음, `/dev-analysis` Proxy 없음 |

보안 확인: 분석기 로그(stderr JSON)에 파일 이름·토큰 없음(요청 ID·크기·SHA 앞 12자·형식만), 개발 서버 출력은 `token=set`만, 요청별 임시 폴더(`%TEMP%\lh-analyze-*`) 시험 후 0개, Production 번들에서 `dev-analysis`·`analyze-preview`·`X-Analysis-Token`·`X-Assessment-Student-Id`·"평가계획서 분석하기" 0건(Flag를 빌드 시점 상수로 써서 분기·Modal·Client가 번들에서 제거됨).

캡처(직접 확인): PDF 결과 미리보기, 손상 PDF "원문 추출 실패".

## 8. 사용한 개발 Flag와 포트

| 프로세스 | 포트 | 설정 | 비고 |
|---|---|---|---|
| Backend (시연, 기존) | 18080 | 변경 없음 | 시연 Schema `lh_demo_manual_20261111`, 이번 시험에서 쓰기 없음 |
| Student (시연, 기존) | 5173 | `run-student-http-dev.ps1`, **분석 Flag 없음** | 심화 탐구 수정은 HMR로 반영 |
| Admin (시연, 기존) | 5174 | 변경 없음 | — |
| 계정 B 분석기 | 127.0.0.1:8765 | 기본(20MB·120초·동시 2·메모리 2GB) | 이번에 기동, **실행 중** |
| Student 분석 미리보기 | **5176** | `scripts/run-student-analysis-preview-dev.ps1 -TokenFile <계정 B dev-token.txt>` | `VITE_ASSESSMENT_DEV_ANALYSIS_PREVIEW=true`(이 프로세스만), `/api`→18080, `/dev-analysis`→8765. **실행 중** |
| 연결 실패 시험용 | 5177 | 위 스크립트 `-Port 5177 -AnalyzerUrl http://127.0.0.1:8799` | 시험용 |
| Backend 없음 시험용 | 5183 | Student http, `VITE_API_TARGET=http://localhost:18099` | 시험 후 종료 확인 |

Flag

| 이름 | 위치 | 의미 |
|---|---|---|
| `VITE_ASSESSMENT_DEV_ANALYSIS_PREVIEW=true` | Student 개발 서버 | `import.meta.env.DEV`와 함께일 때만 분석 미리보기. 공개 값(boolean)이며 비밀 아님 |
| `CURRICULUM_ANALYSIS_TOKEN` / `CURRICULUM_ANALYSIS_TOKEN_FILE` | Node(Vite 설정) | 분석기 토큰 출처. `VITE_` 아님 → 번들 미포함 |
| `ANALYSIS_SERVICE_URL` | Node | 기본 `http://127.0.0.1:8765`, 로컬 주소만 허용 |
| `STUDENT_PREVIEW_PORT` | Node | 기본 5176 |

Shared `frontend/student/vite.config.ts`는 수정하지 않았다(새 설정 `scripts/vite.student-analysis-preview.config.ts`가 불러와 Proxy만 덧붙임). Vite가 이 `.ts` 설정을 CommonJS로 읽는다는 경고가 나오지만 기존 `vite.student-http.config.ts`와 같은 방식이며 동작에는 문제 없었다.

## 9. 기존 PDF 회귀 결과

| 기준선 | 이번 결과 | 비고 |
|---|---|---|
| `verify-frontend.ps1` | **PARTIAL PASS** (Student·Admin·Mentor typecheck·lint·build 통과, Frontend 단위 테스트 미구성 — 원래 상태) | 실행함 |
| Backend 단위 261 / 통합 129 | **미실행** | 아래 사유 |
| PDF 브라우저 43 / 이전 회귀 33 | **미실행** | 아래 사유 |
| PDF HTTP 33 / 실험 OFF 9 / Adapter E2E 83 / 점검표 6 | **미실행** | 아래 사유 |

미실행 사유(숨기지 않음)

1. 기존 브라우저·HTTP 회귀 스크립트는 **18080·5173·5174에 고정**돼 있고 **새 빈 Schema**를 전제로 데이터를 씀. 지금 18080은 시연 Schema(`lh_demo_manual_20261111`)라 그대로 돌리면 시연 데이터가 오염된다.
2. 새 Schema 생성에는 MySQL root 권한이 필요한데, 개발 계정 `learnershigh`는 기존 Schema별 권한만 있다. root 비밀번호가 있는 `.env` 읽기는 이번에 허용되지 않았다.
3. `verify-backend.ps1`은 `gradlew clean build`를 한다. `clean`은 실행 중인 시연 Backend jar(`backend/build/libs`)를 지우므로 시연 전날 실행하지 않았다. 여유 메모리도 약 1.4GB라 Testcontainers 통합 시험을 시연 프로세스와 같이 돌리는 위험이 있었다.

대체 확인(실행함)

- **Backend·DB·API 계약·Admin·Shared 설정 변경 없음:** `api-contract.md` SHA-256 `052128cf…`(이전 회귀와 동일), Migration 4개 그대로, 지난 5시간 수정 파일은 Student Assessment Frontend와 이 보고서 폴더뿐.
- 기존 회귀 스크립트의 Student 선택자 중 이번 변경과 겹치는 것은 `PDF로 가져오기` 버튼(S7)뿐 → Flag OFF 5173에서 버튼·Modal 제목 그대로임을 브라우저로 확인. "연결된 심화 탐구"·심화 화면을 검사하는 기존 시험은 없음.
- 시연 5173에서 수행평가 목록 실제 API 200 유지(위 up 36/36).

**완전한 기준선 재확인은 시연 후(또는 별도 PC)에 권장한다.** 순서: 시연 Backend 종료 → root로 새 Schema 생성 → `verify-backend.ps1` → `FINAL-REGRESSION.md`와 같은 조건으로 8개 시험.

## 10. 공식 DB 저장과 관리자 확정의 남은 승인 조건

이번 미리보기는 아래 어느 것도 하지 않는다. Admin API를 학생 권한으로 부르지 않는다.

| 기능 | 필요한 승인·결정 |
|---|---|
| 학생 개인 파일 업로드·영구 저장 | `api-contract.md` 학생 업로드 계약(§10-2 확정), File Storage Provider·보관 기간·삭제 정책(API-OD-A03), 크기·형식 제한 확정 |
| 학생 파일 분석 요청 API | 분석 서비스 호출을 **Backend 쪽**으로 옮기는 계약(계정 B 안내 방법 B), 서비스 인증 방식(개발 공유 토큰은 운영 불가), 실패·재시도·비용 정책(API-OD), 계약 `analyze-preview-0.1-dev`의 공식화 여부 |
| 학교 공식 평가계획서 Revision 생성 | 관리자 업로드 경로만 유지. 학생 파일을 학교 공식 Revision으로 올리는 규칙(권한·중복·출처) 결정 필요 |
| 관리자 승인(검토 확정) | 기존 PDF v21.1 흐름 유지. 확정 Revision 공개 규칙(F-5), 재검토 정책 미결 |
| HWP/HWPX 공식 확정 | Phase B: Shared 계약 M-1~M-8, D-1 Migration, 원문 대조 절차 승인(`assessment-multiformat-review-next/`). 현재 `review_not_supported` 유지 |
| 학생 공식 수행평가 자동 생성 | 하지 않는다는 기존 원칙(확정된 항목만 학생이 직접 참조) 유지. 바꾸려면 Feature Spec·ADR 필요 |
| 정적 콘텐츠 위치 | `frontend/shared/assessment/content/` 이동은 P-07·P-38 승인 후 |
| 문구 | "AI 분석 후보" vs "자동 분석 후보"(§5) 확인 |

## 11. 시험 스크립트

| 파일 | 용도 |
|---|---|
| `scripts/enrichment-static-e2e.mjs` | 심화 탐구 정적 참고자료 (up/down) |
| `scripts/analysis-preview-e2e.mjs` | 분석 미리보기 × 실제 분석기 (Flag OFF·ON·연결 실패) |
| `scripts/run-student-analysis-preview-dev.ps1` / `vite.student-analysis-preview.config.ts` | 분석 미리보기 개발 서버(5176) |

```powershell
# 분석기 (계정 B 문서 그대로)
cd "C:\Users\<사용자>\LearnersHigh-local\curriculum-analysis"
.venv-llm\Scripts\python.exe -I -B -X utf8 tools\service\analysis_service.py
# 분석 미리보기 Student (다른 창, 저장소 루트)
.\docs\specs\suyeon\assessment-ui-analysis-connection-202611\scripts\run-student-analysis-preview-dev.ps1 -TokenFile "C:\Users\<사용자>\LearnersHigh-local\curriculum-analysis\sensitive\service\dev-token.txt"
# → http://localhost:5176/assessment/school-assessments → "평가계획서 분석하기"
```

시연 후 정리: 5176(·5177) Vite와 8765 분석기를 끄고, `DEMO-RUNBOOK.md` §7처럼 Node 자식 프로세스가 남지 않았는지 확인한다.
