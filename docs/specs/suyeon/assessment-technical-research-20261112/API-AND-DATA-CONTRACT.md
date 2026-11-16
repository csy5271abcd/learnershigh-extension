# 분석 서비스 ↔ Backend API·데이터 계약

> 근거: `CA/tools/service/analysis_service.py`·`analysis_worker.py`, `CA/tools/llmprep/backend_adapter.py`·`multiformat_adapter.py`, Backend `AdminPlanAnalysisImportController`·`AdminEvaluationPlanController`·`EvaluationPlanService`·`AnalysisImportValidator`·`AnalysisImportRequest`·`ConfirmedItemKeys`, `application.yml`, `docs/api/api-contract.md`(§10~12, §47-A, §62-2).
> 상태: **[코드 확인]** / **[실행 확인]** / **[PROPOSED]**(구현은 있으나 `api-contract.md`에 반영 안 됨) / **[개발 전용]**

## 1. 분석 서비스 API [코드·실행 확인, 개발 전용]

| 항목 | 내용 |
|---|---|
| 주소 | `http://127.0.0.1:8765` (127.0.0.1만 바인딩, 외부 공개 없음) |
| Endpoint | `GET /health`, `POST /analyze-preview` |
| 요청 형식 | `multipart/form-data`: `file`(필수), `analyzerVersion`(`v21.1` 기본 · `v21` · `v21.2-quality`), `includeAnalysis`(true면 분석 결과 전문 포함), `fileId`, `includeInferred`(false만 허용), 선택 `sha256` |
| 인증 | 헤더 `X-Analysis-Token`(공유 비밀, `hmac.compare_digest`) + Host 헤더 검사. 토큰 원천: 환경변수 `CURRICULUM_ANALYSIS_TOKEN` 또는 `sensitive/service/dev-token.txt`. **브라우저에 토큰 없음** — Vite Proxy(Node)가 `CURRICULUM_ANALYSIS_TOKEN(_FILE)`에서 읽어 주입. CORS 헤더 없음 |
| 응답 | `service, requestId, ok, status, analyzerVersion, analyzerChannel, analyzer, analysisMode{llmCalls:false}, source, reviewState, summary, backendImport{contract, variant, adapter, requiresBackendFlag, importable, blockers, payload, localValidation, dispositionSummary, contractGapSummary, includeInferredDeliverables}, warnings, errors, elapsedMs` |
| 오류 | 401 `UNAUTHORIZED` · 403 `HOST_NOT_ALLOWED` · 405 · 411 · 413 `FILE_TOO_LARGE` · 415 `UNSUPPORTED_FORMAT` · 422 `CORRUPT_FILE`/`PARSE_FAILED`/`SHA_MISMATCH` · 503 `BUSY` · 504 `ANALYSIS_TIMEOUT` · 500 |
| 한도 | 20MB, 120초, 동시 2, 워커 메모리 2048MB |
| 로그 | 요청 ID·크기·SHA 앞 12자·형식·상태·시간만. 파일 이름·원문·토큰 없음 |
| 저장 | 없음. 임시 폴더는 요청이 끝나면 삭제 |

## 2. Backend Endpoint (평가계획서) [코드 확인]

| Method·경로 | 역할 | 비고 |
|---|---|---|
| `POST /api/admin/assessment/evaluation-plans` (multipart) | 계획서 + Revision 1 등록 | PDF 기본. HWP·HWPX는 `assessment.multiformat.experimental=true`일 때만 |
| `POST …/{planId}/revisions` (multipart) | 새 Revision | 같음 |
| `GET …/{planId}/revisions/{rid}/analysis` | 저장된 분석 후보 + 확정값 + 검토 기록 | 관리자 |
| `POST …/{planId}/revisions/{rid}/analysis-imports` (JSON) | **외부 분석기 결과 수신** | **[PROPOSED]** `assessment.analysis-import.enabled`(기본 false → 404). `api-contract.md`에 없음(검색 0건) |
| `PUT …/{planId}/revisions/{rid}/review` (JSON) | 관리자 검토·확정 | fieldPath 화이트리스트 `(writtenEvaluation|performanceEvaluation|achievement|teachingPlan)(.속성|[색인])*`, 같은 fieldPath 중복·비정규 색인 거절 |
| `GET /api/student/assessment/evaluation-plans?schoolId&academicYear&grade&semester`, `/{planId}` | 학생 조회 | 메타데이터 + `reviewStatus`만(학업 Context로 범위 확인) |
| `POST /api/admin/assessment/ai/evaluation-plan-analyses` | Backend Claude 분석 | **[PROPOSED, 비활성]** §47-A, 기본 503 |

## 3. AnalysisImportRequest (Backend DTO) [코드 확인]

```
AnalysisImportRequest {
  analyzer { name ≤100, version ≤50 }
  source   { sha256 [0-9a-f]{64}, pageCount ≥1 (PDF), format? PDF|HWP|HWPX (NON_NULL, 실험) }
  status   REVIEW_REQUIRED | FAILED
  failureReason ≤500
  subjects[≤40] {
    subjectName ≤100, pageRange{from,to}?, sources[≤50] Locator,
    writtenEvaluation   { weightPercent 0~100, sources[≤20], exams[≤20] {itemKey, round ≥1, weightPercent, maxScore >0, timing ≤100, questionTypes[≤10], sources} }
    performanceEvaluation { weightPercent, sources, items[≤50] {itemKey, label ≤200, area, timing, weightPercent, maxScore, content ≤4000,
                            submissions[≤20], conditions[≤20], rubric[≤30] {element ≤300, levels[≤10] {description ≤1000, score ≥0}, sources}, sources} }
  }
  warnings[≤100]
}
Locator { pdfPageNumber ≥1, printedPageLabel ≤20, extractedText ≤2000,
          documentLocator? { kind HWP_PARAGRAPH|HWP_TABLE_CELL|HWPX_PARAGRAPH|HWPX_TABLE_CELL|CONTROL_TEXT, section ≥0, path [A-Za-z0-9.]+,
                             table, row, col, rowSpan, colSpan, control, cell "UNAVAILABLE" } }
```

- 알 수 없는 필드는 거절(Jackson `FAIL_ON_UNKNOWN_PROPERTIES`), 정수 자리 소수·문자열 숫자·숫자 Enum 거절(`application.yml`).
- `AnalysisImportValidator`: PDF는 숫자 값에 `pdfPageNumber` 근거 필수(`evidence_required`), 쪽 수 범위. HWP·HWPX는 `documentLocator.kind`가 형식과 맞아야 하고, `path`의 마지막 `r<행>c<열>`이 `row`·`col`과 맞아야 한다(`path_mismatch`).
- 분석기 쪽은 같은 규칙을 로컬로 옮겨(`backend_adapter.validate_request`, `multiformat_adapter.validate_experimental`) 보내기 전에 검사한다. 계정 A DTO 13개 record 필드와의 일치는 테스트(`v21_mf/dto_contract.py`)로 고정.

## 4. 데이터 처리 관계 [코드 확인]

```
EvaluationPlan (학교·학년도·학년·학기 슬롯)
  └─ PlanRevision (revision_number, file_name, size, page_count, sha256, review_status UNREVIEWED|CONFIRMED)
       └─ PlanAnalysisRun (status REVIEW_REQUIRED|FAILED, origin, analyzer_name/version, result_json = Payload 전체, warnings_json, payload SHA로 중복 방지)
            └─ PlanReview (analysis_id, decision, reviewed_by, reviewer_auth MOCK_HEADER|VERIFIED, manual_comparison_confirmed, 원본 SHA 대조)
                 └─ ConfirmedValue (subject_id, field_path, value_json, pdf_page_number | evidence_format + evidence_locator_json)
SchoolAssessment.evaluationItemRef {documentRevisionId, subjectId, itemKey}
  → ConfirmedItemKeys: 그 Revision의 검토가 가리키는 Run의 performanceEvaluation.items[].itemKey 중에 있어야 함
```

"분석 후보 → 관리자 검토 → Confirmed Values" 관계는 지시서와 같다. 다른 점: **원본 파일은 저장하지 않는다**(SHA·크기만). 그래서 HWP·HWPX 검토는 관리자 PC의 원본을 다시 해시해 SHA를 대조한다.

## 5. 반드시 구분할 흐름

| 흐름 | 저장 | 인증 | 형식 | 상태 |
|---|---|---|---|---|
| Student 개인 분석 미리보기 | **없음**(탭 메모리) | 분석기 토큰(Proxy) | PDF·HWP·HWPX | 개발 Flag(`VITE_ASSESSMENT_DEV_ANALYSIS_PREVIEW`)에서만. 운영 번들 0건 |
| Admin 분석 후보 저장 | `plan_analysis_run` | Mock 관리자 헤더 | PDF / HWP·HWPX(실험 Flag) | 수신 Endpoint 기본 off |
| 관리자 원문 검토 | `plan_review`(+확정값) | Mock | PDF: 쪽 근거 / HWP·HWPX: 원본 SHA 재확인·Locator·수동 대조 확인 | |
| 개발용 공식 확정 | `confirmed_value`, `reviewer_auth=MOCK_HEADER` | Mock | PDF 기본, HWP·HWPX는 `structured-confirm-dev=true` | 운영 검토 실적 아님 |
| 운영 환경 공식 확정 | – | 실제 인증 필요(`VERIFIED`) | – | **미구현** — 실제 인증 연동 전 |

## 6. Backend 수신·저장 검증 기록 (이전 보고서)

| 시험 | 결과 | 출처 |
|---|---|---|
| 합성 PDF Payload 수신 → DB → 재조회 | 통과(PDF HTTP 33) | `frontend-backend-integration-202611`, `assessment-demo-final-check-202611/REPORT.md` |
| 합성 HWP·HWPX Adapter E2E | 83 | `assessment-multiformat-adapter-e2e-202611` |
| Admin 등록 → 분석기 → 수신 → 검토 화면 | PDF 13/13 · HWP 15/15 · HWPX 15/15(격리) | `assessment-full-integration-202611/FEATURE-MATRIX.md` |
| 실제 학교 문서 Payload 수신 | **실행한 적 없음**(DB 반입 승인 필요) | 분석기 v21.1·다중 형식 보고서 |
| 최신 회귀(2026-11-12) | PDF HTTP 33·실험 OFF 9·Adapter 83·Admin 13/15×2는 **미실행**(빈 Schema 필요) | `assessment-phase-b-and-ux-completion-202611/REGRESSION-RESULT.md` |
