# 평가계획서 AI 분석기 기술 스택

> 분석기 경로: `C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis`(이하 `CA/`). 저장소 밖 로컬 폴더이며 Git에 넣지 않는다.
> 확인 방법: 실행 환경 명령(`python --version`, `pip list`, `java -version`), 소스 import 목록, `runs/v3-20261106/cp.txt`.
> 상태: **[코드 확인]** 실제 코드에서 확인 / **[실행 확인]** 명령으로 확인 / **[연구 기록]** / **[미사용]** / **[설계만]**

## 1. 한 줄 요약

현재 분석기는 **LLM을 쓰지 않는 규칙 기반 구조 분석기**다. PDF는 Java PDFBox로 단어 좌표와 괘선을 뽑고, HWP·HWPX는 Python 표준 라이브러리로 직접 파싱한다. 공통 문서 모델(DocumentModel) 위에서 정규식·표 모양 규칙으로 평가 정보를 조립한다. 시연 HTTP 서비스의 Health 응답도 `analysisMode = {llmCalls: false, method: "RULE_BASED_STRUCTURE_ANALYSIS"}`이다(`CA/tools/service/analysis_service.py:31`).

## 2. 기술 조사 표

| 영역 | 실제 기술 | 버전 | 역할 | 코드·설정 경로 | 상태 |
|---|---|---|---|---|---|
| 실행 언어 | CPython | 3.12.9 | 파서·분석·Adapter·HTTP 서비스 | `CA/.venv-llm/pyvenv.cfg` | 실행 확인 |
| 분석 파이프라인 의존성 | **Python 표준 라이브러리만** | – | `re`, `struct`, `zlib`, `zipfile`, `xml.etree.ElementTree`, `hashlib`, `json`, `decimal`, `subprocess`, `tempfile` | `CA/tools/docmodel/*.py`, `CA/tools/llmprep/{analysis_result,assessment_assembly03,task_detail,backend_adapter,multiformat_adapter}.py` import 목록 | 코드 확인 |
| PDF 런타임 | OpenJDK (Microsoft Build) | 17.0.18 | `PdfLayout` 실행 | `java -version` | 실행 확인 |
| PDF 파싱 | Apache PDFBox (+fontbox, pdfbox-io, commons-logging 1.3.5) | 3.0.5 | 쪽별 단어 좌표(`PDFTextStripper`)·괘선 경로(`PDFGraphicsStreamEngine`) 수집 | `CA/tools/java/PdfLayout.java`, 클래스패스 `CA/runs/v3-20261106/cp.txt`, 컴파일본 `CA/tools/classes/` | 코드 확인 |
| PDF ↔ Python 연동 | `subprocess.run(["java", "-cp", …, "PdfLayout", list.tsv, outDir])`, 쪽마다 1줄 JSONL | – | Python이 Java를 자식 프로세스로 실행(타임아웃 600초) | `analysis_result.run_pdf_layout` | 코드 확인 |
| PDF 표 재구성 | 자체 알고리즘(괘선 2pt 허용오차 군집·연결 성분·격자) | pdf_model 0.1 | 괘선 → 격자 → 칸 → 단어 배정, 병합 Span, 중첩 표 부모 | `CA/tools/docmodel/pdf_model.py` | 코드 확인 |
| HWP 파싱 | **자체 구현** OLE/CFB 판독기 + HWP 5 레코드 파서 + `zlib` raw deflate | hwp_model 0.1 | `FileHeader` 플래그, `BodyText/Section*` 레코드 → 문단·표·칸 | `CA/tools/docmodel/hwp5.py`, `hwp_model.py` | 코드 확인 (외부 HWP 라이브러리 사용 안 함) |
| HWPX 파싱 | `zipfile` + `xml.etree.ElementTree` | hwpx_model 0.1 (기본) / 0.2 (개발 프로필) | OWPML `hp:p/hp:run/hp:t/hp:tbl/hp:tc` → 문단·표·칸 | `CA/tools/docmodel/hwpx_model.py`, `CA/tools/docmodel_v02/hwpx_model.py` | 코드 확인 |
| 형식 판정 | 매직 바이트 | – | `%PDF-` / CFB 시그니처 / ZIP+`Contents/section` | `docmodel/build.py actual_format` | 코드 확인 |
| 중간 표현 | DocumentModel | docmodel-0.1 | blocks(문단·표·칸), pages(PDF), segments, contexts, Locator | `docmodel/model.py`, `build.py` | 코드 확인 |
| 과목 구간 탐지 | 정규식 + 머리표 라벨 사전 | analyze 0.1 | 제목 정규식(`교수·학습 및 평가 (운영) 계획`), 머리표(학년·학기·과목 라벨), PDF 인쇄 쪽 재시작 | `docmodel/analyze.py segments` | 코드 확인 |
| 평가 조립 | 규칙(라벨 정규식·표 모양·이름 유사도) | assessment-assembly-0.3 (기본) / 0.4-dev | 평가 목록, 지필·수행 분류, 비율·만점·시기, 채점표 연결·신뢰 단계 | `llmprep/assessment_assembly03.py`, `assessment_assembly04.py` | 코드 확인 |
| 채점표 구조 | 점수 열 모양·개수 구간 판정 | rubric_structure2 (v19) | 머리글 없는 채점표 후보(LIKELY/POSSIBLE) | `llmprep/rubric_structure2.py` | 코드 확인 |
| 수행평가 상세 | 라벨 정규식 + 평가 범위 고정 | task-detail-0.1 | 활동·제출물(STATED/INFERRED)·조건·관점·특수 규정·수준 문장 | `llmprep/task_detail.py` | 코드 확인 |
| 결과 조립·검증 | Locator·인용·평가 범위 검증 | curriculum-analysis-result-0.1, 프로필 `v21.1` | 결과 JSON, `validation{locators,quotes,scope,levelQuotes}` | `llmprep/analysis_result.py` | 코드 확인 |
| Backend 변환(PDF) | 계약 Adapter | backend-adapter-0.2 | 결과 → `AnalysisImportRequest`(공식), gaps·dispositions | `llmprep/backend_adapter.py` | 코드 확인 |
| Backend 변환(HWP·HWPX) | 다중 형식 Adapter | multiformat-adapter-0.1-draft | 결과 → 실험 DTO(`source.format`, `documentLocator`) | `llmprep/multiformat_adapter.py` | 코드 확인 |
| HTTP 서비스 | `http.server.ThreadingHTTPServer` (표준 라이브러리) | analyze-preview-0.1-dev | `GET /health`, `POST /analyze-preview`, 127.0.0.1만 | `CA/tools/service/analysis_service.py` | 코드·실행 확인 |
| Multipart 해석 | `email.parser.BytesParser(policy=email.policy.HTTP)` | – | `file`, `analyzerVersion`, `includeAnalysis`, `fileId`, `includeInferred` | 같은 파일 | 코드 확인 |
| 인증(개발용) | 공유 토큰 헤더 `X-Analysis-Token` + `hmac.compare_digest`, Host 헤더 검사, CORS 없음 | – | 토큰: 환경변수 `CURRICULUM_ANALYSIS_TOKEN` 또는 `sensitive/service/dev-token.txt` | 같은 파일 | 코드 확인 — **개발용이며 운영 인증이 아님** |
| 요청 격리 | 요청마다 하위 프로세스 + Windows Job Object(`ctypes`, 메모리 상한·`KILL_ON_JOB_CLOSE`) + 소켓 차단 | – | 손상 파일·폭주에서 서비스 보호. Java 손자 프로세스까지 종료 | `CA/tools/service/analysis_worker.py` | 코드·테스트 확인 |
| 업로드 방어 | 매직 바이트, 크기 상한(기본 20MB), ZIP 항목 수·이름·중복·암호·크기·압축비 + 실제 해제 검사, CFB 헤더 검사 | – | 415/413/422 | `CA/tools/service/upload_guard.py` | 코드·테스트 확인 |
| 동시성·시간 | 동시 분석 2(초과 503), 요청 120초(초과 504), 워커 메모리 2048MB | 기본값 | `--concurrency 2 --timeout 120 --mem-mb 2048` | `analysis_service.py:300-303` | 코드 확인 |
| 임시 파일 | `tempfile.mkdtemp(prefix="lh-analyze-")` → `finally`에서 삭제 | – | 원본·PdfLayout 출력이 남지 않게 | 같은 파일 | 코드·테스트 확인 |
| 운영 스크립트 | PowerShell 5.1 | – | `status|start|stop|restart` | `CA/tools/service/service.ps1` | 실행 확인 |
| 테스트 | `unittest` 기반 스크립트 24개 묶음 | – | 615건(2026-11-11) | `CA/tools/tests/` | 테스트 기록 |
| 합성 HWP·HWPX 생성 | 한컴오피스 2024 COM 자동화(PowerShell) | – | HTML 원천 → 실제 HWP·HWPX 저장 | `CA/tools/v21_mf/hancom_convert.ps1`, `v21_2/hancom_resave.ps1` | 연구 기록 (분석 경로 아님) |

## 3. LLM·AI 관련 기술 — 현재와 과거 구분

### 3-1. 현재 분석 경로 (v21.1 기본, HTTP 서비스) [코드 확인]

| 확인 항목 | 결과 |
|---|---|
| LLM API 호출 코드 | **없음.** `analysis_result → assembly03 → task_detail → backend_adapter/multiformat_adapter`는 네트워크 모듈을 import하지 않는다 |
| 서비스 워커의 차단 | `analysis_worker.py`가 `anthropic`, `google.genai`, `httpx`, `httpx2`, `requests`, `urllib3`, `llmprep.providers_live` import를 막고 소켓 연결을 차단한다(`NETWORK_CLIENT_MODULES`, `block_network`) |
| Health | `llmCalls: false`, `method: RULE_BASED_STRUCTURE_ANALYSIS` |
| 결과 상태 | 항상 `reviewState.status = DRAFT_UNREVIEWED`, Backend로는 `REVIEW_REQUIRED` 또는 `FAILED`만 |

### 3-2. 과거 LLM 실험 (v5~v17.1) [연구 기록]

| 항목 | 내용 |
|---|---|
| 별도 venv 패키지 | `anthropic` 2.6.0, `google-genai` 3.0.0 (+`httpx2`, `pydantic` 등). **분석 파이프라인은 쓰지 않음** |
| 모델 | Anthropic `claude-sonnet-5-5`, Google `gemini-3.8-flash` (원장 기록값) |
| 코드 | `llmprep/providers_live.py`(Adapter), `run_live*.py`(사용자가 직접 실행), `claude_wire*.py`·`gemini_wire*.py`(전송 형식·복원), `prompt05~07.py`(지침 seg-extract-0.5~0.7), `rubric_lite*.py`(2단계 채점표 형식), `staged*.py`(2단계 분할), `quote_strict.py`(근거 원문 대조), `gate.py`·`privacy.py`(실문서 전송 차단·마스킹) |
| 실제 호출 | 원장 9개 · 실행 기록 14건 · **API 요청 22회**, 추정 비용 합계 약 1.09 USD(`runs/v6~v17-1/calls.json`, 2026-11-07 ~ 11-09) |
| 입력 문서 | **합성 문서만**: SYN001(v6~v9), SYN003(v14~v17), SYN005(v17·v17.1) |
| 결과 상태 | Claude: FAILED 3 · NEEDS_REVIEW 1 · PARTIAL 1 · OK 2 / Gemini: FAILED 3 · NEEDS_REVIEW 1 · PARTIAL 1 · OK 2 (실행 기록 단위) |
| 실제 학교 문서 전송 | **0회.** `approvals/real-docs.json`의 Provider 승인·데이터 정책 확인이 모두 `false`, `run_real.py`는 Gate BLOCK |
| 규칙 기반 분석과의 연계 | **현재 연결되어 있지 않다.** v11~v17에서 "DocumentModel 입력 → LLM 추출 → Locator·인용 검증"을 합성 문서로 실험했고, v19부터 규칙 조립(assembly)으로 방향을 바꿨다 |

### 3-3. Backend 쪽 AI 코드 (분석기와 별개) [코드 확인 — 기본 비활성]

| 항목 | 내용 |
|---|---|
| 위치 | `backend/.../assessment/integration/ai/AnthropicAssessmentAiClient.java`, `service/ai/AssessmentAiService.java`, `controller/AssessmentAiController.java` |
| 의존성 | `com.anthropic:anthropic-java:3.2.0`, `org.apache.pdfbox:pdfbox:3.0.5` (`backend/build.gradle.kts`) |
| Endpoint | `POST /api/admin/assessment/ai/evaluation-plan-analyses`(PDF multipart), `/university-exam-analyses`, `/mock-exam-analyses`, `GET /ai/status` |
| 동작 조건 | `assessment.ai.provider=anthropic` **그리고** 환경변수 `ANTHROPIC_API_KEY`가 있을 때만. 기본 `provider: none` → `UnconfiguredAssessmentAiClient` → 503 `AI_PROVIDER_NOT_CONFIGURED` |
| 모델 기본값 | `claude-opus-5-5`, Structured Output, 출력 16,000 토큰, 타임아웃 300초, 재시도 1 |
| 결과 처리 | `AiEvidenceVerifier`로 원본 대조 → REVIEW_REQUIRED 응답만. 저장·공개 안 함 |
| 상태 | **설계·구현은 있으나 실제 호출 미실행**(`docs/specs/suyeon/progress.md:381` "AI Provider: OPEN_DECISION (기본 미연결, 실제 호출 미실행)"). Provider·비용·외부 전송 정책은 미결(API-OD-A10, P-31 PROPOSED) |

## 4. 현재 기술 스택에 넣으면 안 되는 것

| 항목 | 이유 |
|---|---|
| OCR | 코드 없음. 텍스트 없는 PDF 120개는 분석 불가 |
| DOCX 파서 | 분석 경로에 없음(415) |
| LLM 추출(분석기) | 과거 합성 실험만. 현재 경로에서 차단 |
| Backend Claude 분석 | 코드는 있으나 기본 비활성·미호출 |
| 모델 학습·Fine-tuning | 코드·기록 없음 |
| 비동기 Queue·Worker 서버 | 없음. HTTP 요청 안에서 동기 처리(최대 120초) |
| 운영 인증 | 분석 서비스는 개발용 공유 토큰, Backend는 Mock Header 인증 |
