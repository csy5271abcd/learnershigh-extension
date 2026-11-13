# 조사 근거 색인

> `CA` = `C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis`(저장소 밖, Git 제외). `REPO` = `C:\learnershigh-extension`.
> `CA/sensitive/`는 원문이 들어 있어 공유·외부 전송 금지다. 이 조사는 그 안의 결과 JSON에서 **상태·개수·Locator·숫자만** 읽었다.

## 1. 원본·코퍼스

| 근거 | 쓰인 문서 | 확인 방법 |
|---|---|---|
| `REPO/references/curriculum-plan/` | SCHOOL-INVENTORY, DOCUMENT-CORPUS-STATISTICS, SCHOOL-SELECTION-RESEARCH | 이번 조사에서 전수 열거·SHA-256 계산(읽기 전용) |
| `CA/runs/v3-20261106/manifest.jsonl`·`manifest_full.csv`·`stats.txt`·`coverage.csv`·`school_summary.jsonl`·`pdf_probe.jsonl`·`office_probe.jsonl`·`features.jsonl`·`split_v3.json`·`cp.txt` | 같음 | 읽기 |
| `CA/runs/v2-20261106/school_table.md` | (이력: samsung → myeongji) | 읽기 |
| `CA/README.md` | 전반(보존 등급·버전 이력) | 읽기 |

## 2. 분석기 코드

| 근거 | 쓰인 문서 |
|---|---|
| `CA/tools/docmodel/{model,build,hwp5,hwp_model,hwpx_model,pdf_model,analyze}.py` | AI-TECH-STACK, ANALYZER-ALGORITHM-DEEP-DIVE, DOCUMENT-MODEL-AND-EXTRACTION, DOCUMENT-STRUCTURE-DIVERSITY, FORMAT-COMPARISON |
| `CA/tools/docmodel_v02/hwpx_model.py` | 같음(v21.2 프로필) |
| `CA/tools/java/PdfLayout.java` | 같음 |
| `CA/tools/llmprep/analysis_result.py` (`PROFILES`, `run_pdf_layout`, `build_docmodel`, `analyze_docmodel`, `resolve_subject`, `validate`) | 같음 |
| `CA/tools/llmprep/assessment_assembly03.py` (`assemble`, `table_role`, `matrix_entries`, `list_entries`, `group_question_type_rows`, `count_bands`, `link_confidence`) | 같음 |
| `CA/tools/llmprep/task_detail.py` (`extract`, `scope_for`, `element_levels`) | 같음 |
| `CA/tools/llmprep/backend_adapter.py`, `multiformat_adapter.py` | API-AND-DATA-CONTRACT, REAL-DOCUMENT-CASE-STUDY |
| `CA/tools/service/{analysis_service,analysis_worker,upload_guard}.py`, `service.ps1` | AI-TECH-STACK, ARCHITECTURE-ANALYZER |
| `CA/tools/llmprep/{providers_live,run_live*,privacy,gate,real_metrics,review_workbench}.py` | AI-TECH-STACK §3, AI-ENHANCEMENT-RESEARCH |
| `CA/.venv-llm/pyvenv.cfg`, `pip list`, `java -version` | AI-TECH-STACK |
| `CA/approvals/real-docs.json` | AI-TECH-STACK, AI-ENHANCEMENT-RESEARCH |

## 3. 분석기 실행 기록·결과

| 근거 | 내용 |
|---|---|
| `CA/runs/v4-pilot-20261106/{baseline_report.md, pilot_files.json, test_real_files.json}` | 실문서 10개 파싱·구조 지표 |
| `CA/runs/v6~v17-1*/calls.json`(9개) | LLM 호출 원장(22회, 합성만) |
| `CA/runs/v17-generalization-20261109/GENERALIZATION-TEST-MATRIX.md` | 합성 사례·Mock 복원 |
| `CA/runs/v19-real-document-validation-20261109/{DOCUMENT-FORMAT-AUDIT.md, REAL-DOCUMENT-EVALUATION-PLAN.md, REPORT.md}` | 형식별 구조, 평가 계획, 사람 검토 0 |
| `CA/runs/v20-cross-school-pdf-generalization-20261109/REPORT.md` | HWP 교차 검증 |
| `CA/runs/v21-assessment-detail-integration-20261109/TASK-EXTRACTION-RESULT.md` | 수행 상세 추출 |
| `CA/runs/v21-pdf-quality-backend-bridge-20261109/{REPORT.md, PDF-BEFORE-AFTER.md}` | v21.1 변화 |
| `CA/runs/v21-multiformat-backend-bridge-20261110/REPORT.md` | 다중 형식 |
| `CA/runs/v21-2-quality-improvement-202611/{REPORT.md, NEXT-STEPS.md}` | v21.2·남은 PDF 문제 |
| `CA/runs/v22-analysis-preview-service-20261111/{REPORT.md, ASSESSMENT-INTEGRATION.md, OPERATIONS.md, examples/}` | HTTP 서비스, 615 통과 |
| `CA/sensitive/v21-pdf-quality/results/G*.{analysis,backend-import}.json` | 실문서 10개 상태·개수 집계(이번 조사) |
| `CA/sensitive/v21-multiformat/results/G024.experimental-{import,meta}.json` | 사례 추적(P01) |
| `CA/sensitive/docmodel/v4/F02532.docmodel.json` | 사례 표 크기 확인 |

## 4. Assessment 저장소

| 근거 | 쓰인 문서 |
|---|---|
| `REPO/backend/build.gradle.kts`, `backend/src/main/resources/application.yml` | ARCHITECTURE-ASSESSMENT-E2E-EXPLAINED, AI-TECH-STACK §3-3 |
| `REPO/backend/.../assessment/controller/*.java`(Endpoint 매핑) | API-AND-DATA-CONTRACT |
| `REPO/backend/.../assessment/dto/plan/AnalysisImportRequest.java` | API-AND-DATA-CONTRACT, DOCUMENT-MODEL-AND-EXTRACTION |
| `REPO/backend/.../assessment/service/plan/{EvaluationPlanService, AnalysisImportValidator, ReviewFieldRules, ConfirmedItemKeys, EvaluationPlanQueryService}.java` | 같음 |
| `REPO/backend/.../assessment/entity/{PlanAnalysisStatus, PlanReviewStatus, PlanDocumentFormat}.java` | 같음 |
| `REPO/backend/.../assessment/integration/{ai,auth,context,storage}/*` | ARCHITECTURE-ASSESSMENT-E2E-EXPLAINED |
| `REPO/database/migrations/*.sql`(8개) | 같음 |
| `REPO/frontend/{package.json, student/package.json, admin/package.json, student/vite.config.ts}` | 같음 |
| `REPO/frontend/admin/src/features/assessment/routes/EvaluationPlansRoute.tsx`, `api/http/assessmentAdminHttp.ts` | Admin 등록 → 분석 → 수신 흐름 |
| `REPO/frontend/student/src/features/assessment/api/dev/analysisPreviewClient.ts`, `routes/AnalysisPreviewResultRoute.tsx` | Student 미리보기 흐름 |
| `REPO/docs/specs/suyeon/assessment-ui-analysis-connection-202611/scripts/vite.student-analysis-preview.config.ts`, `assessment-full-integration-202611/scripts/vite.admin-analyzer.config.ts` | Vite Proxy |
| `REPO/docs/api/api-contract.md`(§10~12, §47-A, §61, §62-1, §62-2) | API-AND-DATA-CONTRACT |
| `REPO/docs/specs/suyeon/assessment-phase-b-and-ux-completion-202611/{REPORT, NEXT-STEPS, REGRESSION-RESULT}.md` | CURRENT-IMPLEMENTATION-STATUS, FUTURE-WORK-BACKLOG, VERIFIED-EXPERIMENT-RESULTS |
| `REPO/docs/specs/suyeon/assessment-db-integration-202611/REPORT.md` | 같음 |
| `REPO/docs/specs/suyeon/assessment-demo-final-check-202611/{REPORT, NEXT-STEPS}.md` | 같음 |
| `REPO/docs/specs/suyeon/assessment-full-integration-202611/FEATURE-MATRIX.md` | 같음(일부 항목은 이후 보고서로 갱신됨) |
| `REPO/docs/specs/suyeon/progress.md:381` | Backend AI 미호출 |

## 5. 이번 조사에서 실행한 명령 (읽기 전용)

| 명령 | 목적 | 출력 위치 |
|---|---|---|
| 원본 폴더 재귀 열거 + SHA-256 + Manifest 대조(Python, `-I`) | 코퍼스 무결성 | Scratchpad `inv_check.json`(저장소 밖) |
| `manifest_full.csv` 집계 | 학교·지역·형식·연도 통계 | Scratchpad `corpus_stats.json` |
| 실문서 10개 결과 JSON 상태·개수 집계 | 추출 결과 표 | 콘솔(원문 미출력) |
| `python --version`, `pip list`, `java -version` | 기술 스택 | 콘솔 |
| `grep`(코드·문서) | 함수·Endpoint·설정 확인 | 콘솔 |

서버 시작·종료·재시작, 테스트 재실행, 분석 재실행, DB 접근, 외부 API 호출은 하지 않았다.
