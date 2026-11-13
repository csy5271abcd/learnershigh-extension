# 평가계획서 분석기 내부 아키텍처 — 설명

> 다이어그램: `ARCHITECTURE-ANALYZER.mmd` (Mermaid flowchart). SVG·PNG는 만들지 않았다(이 PC에 Mermaid 렌더러가 없고, 이번 작업은 패키지 설치·외부 다운로드를 하지 않았다). GitHub·VS Code Mermaid 미리보기에서 바로 렌더링된다.
> 모든 상자는 실제 모듈·함수 이름이다. 경로는 `CA/tools/` 기준. 지시서의 계층 중 실제 코드에 없는 것은 넣지 않았다.

## 1. 계층과 실제 모듈

| 계층 | 지시서 이름 | 실제 구성요소 | 비고 |
|---|---|---|---|
| Input | PDF·HWP·HWPX | 같은 세 형식 | DOCX는 `UNSUPPORTED_FORMAT` |
| Validation(입력) | File Signature·File Size·SHA-256 | `service/upload_guard.inspect`(매직 바이트·크기·ZIP·CFB), `hashlib.sha256` | 서비스 경로에서만. CLI(`tools/v21/analyze_file.py`)는 `build_docmodel`의 매직 바이트 판정만 |
| (격리) | – | `service/analysis_worker.py` 하위 프로세스, Job Object, 네트워크 차단 | 지시서에 없지만 실제로 있는 계층 |
| Parsing | PDF/HWP/HWPX Parser | `java/PdfLayout.java`+`docmodel/pdf_model.py`, `docmodel/hwp5.py`+`hwp_model.py`, `docmodel/hwpx_model.py` | PDF만 Java 프로세스를 거침 |
| Intermediate Representation | Text·Table·Cell·Section·Locator | DocumentModel `blocks`(paragraph·table·cell), `pages`(PDF), `segments`, Locator | `Row` 객체는 없음(칸 좌표만). `Section`은 HWP·HWPX Locator 번호 |
| Structure Analysis | Subject Detection | `docmodel/analyze.segments` + `analysis_result.resolve_subject` | |
| | Written Exam Detection | `assessment_assembly03.kind_of`·`group_question_type_rows` | 지필과 수행을 같은 조립기가 처리 |
| | Performance Assessment Extraction | `assessment_assembly03.matrix_entries/list_entries/sheet_entry` + `task_detail.extract` | |
| | Rubric Extraction | `rubric_structure2`, `assessment_assembly03.count_bands`, `task_detail.element_levels`, `link_confidence` | |
| Validation(결과) | Evidence·Field Validation·Ambiguity | `analysis_result.validate`·`validate_levels`, 조립·상세 `checks`, `presence` 상태 | 값을 고르지 않고 `CONFLICTING`/`VARIANTS`로 남김 |
| Output | Structured JSON·AnalysisImportRequest | `analysis_result.analyze_docmodel` → `backend_adapter.to_import_request`(PDF) / `multiformat_adapter.to_experimental`(HWP·HWPX) | |

## 2. 데이터 흐름

1. 브라우저가 아니라 **개발 서버 Proxy(Vite, Node)**가 토큰을 붙여 `POST /analyze-preview`로 보낸다(전체 흐름은 `ARCHITECTURE-ASSESSMENT-E2E-EXPLAINED.md`).
2. 서비스는 Host·토큰·크기를 먼저 보고, 형식·ZIP·CFB를 검사한 뒤 SHA-256을 계산한다.
3. 임시 폴더에 원본을 쓰고 워커 프로세스를 띄운다. 워커는 메모리 상한(Job Object)을 걸고 네트워크를 막은 뒤 `analysis_result.analyze_file(profile="v21.1")`을 부른다.
4. 매직 바이트로 형식을 고른다.
   - PDF: Java `PdfLayout`(PDFBox)이 쪽마다 단어 좌표·괘선을 JSONL로 쓰고, `pdf_model`이 괘선으로 표 격자를 다시 만든다.
   - HWP: 자체 CFB 판독기가 `BodyText/Section*`를 풀고 레코드 트리에서 문단·표·칸을 만든다.
   - HWPX: ZIP 안 XML에서 문단·표·칸을 만든다.
5. 세 형식 모두 같은 DocumentModel이 된다. 이후 단계는 **형식과 무관한 공통 코드**다. 차이는 Locator 모양뿐이다.
6. 과목 구간 → 표 역할 → 평가 목록·지필/수행 → 비율·만점·시기 → 채점표 연결 → 수행평가 상세 → 과목명 복원 순서로 조립한다.
7. 검증: 모든 근거 Locator가 문서에 있는지, 추출 글이 원문 그대로인지, 다른 평가의 표에서 가져오지 않았는지 확인한다.
8. 형식에 따라 Adapter를 고른다. PDF는 공식 계약, HWP·HWPX는 실험 계약 모양이다. 계약에 없는 정보는 `gaps`로 남긴다.
9. 응답 JSON을 돌려주고 임시 폴더를 지운다.

## 3. 원문 근거 연결

- 추출한 모든 값은 `locator`(문자열 id)를 갖는다. id는 같은 원본에서 항상 같다(`model.loc_id`).
- 검증 단계가 이 id로 DocumentModel 글을 다시 찾아 비교한다.
- Backend로 갈 때 PDF는 `pdfPageNumber`+`extractedText`, HWP·HWPX는 `documentLocator{kind, section, path, table, row, col, rowSpan, colSpan}`+`extractedText`로 바뀐다.
- HWP·HWPX에는 쪽 번호를 만들지 않는다.

## 4. 오류 처리

| 지점 | 결과 |
|---|---|
| 토큰·Host 불일치 | 401 / 403 |
| 형식 아님 / 크기 초과 / 손상·ZIP 위험 | 415 / 413 / 422 |
| 동시 요청 초과 | 503 `BUSY` |
| 120초 초과 | 504 `ANALYSIS_TIMEOUT`(워커와 Java 손자 프로세스까지 종료) |
| 파서 예외(Java 실패 포함) | 분석 결과 `PARSE_FAILED`(빈 결과로 바꾸지 않음) |
| 평가를 못 찾음 | `NO_ASSESSMENTS_EXTRACTED`, 구간별 `ASSESSMENT_LIST_NOT_EXTRACTED`/`NO_ASSESSMENT_SIGNAL` |
| 일부 실패 | `PARTIAL` + `statusReasons` |
| 계약 위반 | `backendImport.importable=false` + `blockers` |

## 5. 실제 LLM 사용 여부

**사용하지 않는다.** Health 응답 `analysisMode = {llmCalls:false, method:"RULE_BASED_STRUCTURE_ANALYSIS"}`이고, 워커가 LLM SDK·HTTP 클라이언트 import와 소켓을 막는다. 응답의 `networkClientModulesLoaded`로 확인할 수 있다. 과거 LLM 실험 코드는 같은 폴더에 남아 있지만 이 경로에서 호출되지 않는다(`AI-TECH-STACK.md` §3).

## 6. 프로필

| 프로필 | HWPX 파서 | 조립 | 쓰임 |
|---|---|---|---|
| `v21.1`(기본) | hwpx_model 0.1 | assessment-assembly-0.3 | 시연·연동 기준선 |
| `v21` | 0.1 | assembly 0.2 | 이전 결과 재현 |
| `v21.2-quality` | hwpx_model 0.2(캡션) | assembly 0.4-dev(캡션 제목·2단 머리글) | 개발용, 요청에서 `analyzerVersion`으로만 선택 |
