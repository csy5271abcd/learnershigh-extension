# AI 분석기 × Backend 통합 검증 결과 (2026-11-09)

> 사용한 데이터는 **모두 합성 자료**다(가상고등학교·가상 과목). 실제 학교 평가계획서와 그 분석 결과는 DB에 넣지 않았다.
> 검토 확정(PUT review)은 **합성 데이터 기반 검토 API 시험**이며, 실제 운영자의 검토가 아니다.

## 1. 도달한 수준

| 수준 | 내용 | 결과 |
|---|---|---|
| 1 | 합성 JSON으로 Backend 계약 검증 | 기존 `EvaluationPlanApiTest` 6건으로 이미 확인됨 |
| **2** | **합성 PDF → 실제 v21 분석기 → Adapter → HTTP 수신 → MySQL** | **실제 서버·실제 DB로 확인 (이번 작업)** |
| 3 | 실제 학교 PDF 결과 반입 | **하지 않음.** 실제 문서 파생 데이터의 DB 반입 승인이 없음 |

계정 B가 넘긴 합성 예시(`examples/synthetic.backend-import.json`)는 PDF가 아니라 손으로 만든 DocumentModel에서 나왔다. `sha256`도 `aaa…`인 가짜 값이라 그대로는 수준 2가 아니었다. 그래서 같은 표 내용을 실제 PDF로 그려 v21 파이프라인 전체에 통과시켰다.

## 2. 실행 환경

| 항목 | 값 |
|---|---|
| Backend | `./gradlew bootRun --args='--server.port=18080'`, Java 21 Toolchain, Spring Boot 4.1.1 |
| DB | 로컬 Docker `learnershigh-mysql`(MySQL 8.4, 포트 3307), **새로 만든 빈 Schema `lh_assessment_e2e`** |
| 수신 기능 | 이 서버 프로세스에만 환경 변수 `ASSESSMENT_ANALYSIS_IMPORT_ENABLED=true`. `application.yml` 기본값 false는 그대로 |
| 인증 | Mock Header(`adm_plan_operator`, `adm_gangnam`, `adm_bundang`, `stu_001`, `stu_002`) |
| 분석기 | 계정 B `C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis`, v21 (`.venv-llm` Python 3.12, PdfLayout/PDFBox 3.0.5, JDK 17) |

환경 보호:

- 기존 `learnershigh_extension` DB, Docker Volume, 구형 mentor Migration 이력은 건드리지 않았다. Flyway repair도 실행하지 않았다.
- 계정 B 폴더에는 아무것도 쓰지 않았다. 분석기 모듈을 수정 없이 import하고 작업·출력 폴더만 scratchpad로 바꿨다(`-I -B`, 바이트코드도 쓰지 않음).
- 작업 중 계정 B가 `assessment_assembly03.py`를 수정하고 있었다(22:54). 그래서 실행 시점의 모듈 해시를 아래에 남긴다.
- 18080을 쓰던 다른 서버는 없었다. 제가 띄운 서버 3개(PID 47908, 4384, 55372)만 직접 종료했다.

계정 B 모듈 SHA-256 (2026-11-09 22:56):

```text
47c0f88cf97d7758d9bf542683e4df35ffcb8888d2483899774ea17509a1b62d  llmprep/analysis_result.py
be8135db3651c1930bfd5cc95ed46372ba8ca50e1e34bbe19f5ddb7c6ac351dd  llmprep/backend_adapter.py
92d4a5c32320bd466e821a181a3108a67f2b163c6f975fe96ee4bbc3497b2814  llmprep/assessment_assembly03.py
b82cd99e4ece3d47f5ce4a6f82e59b011574b183841f57382525683600dfa942  llmprep/task_detail.py
c151bac5427457ddcfe8efb2901a77b54350d8d8e68de1672bedbf8f02f54ade  java/PdfLayout.java
1c516c36f82657df0aafbcbaf728a5f23c5edd58e0b3e4bd0b2c3c6ec6ebf206  classes/PdfLayout.class
```

## 3. 실행 명령

재현 파일: `backend/src/test/resources/assessment/analyzer-v21/` (README·PDF·payload·`generator/`).

```bash
# 1) 합성 PDF 생성 (PDFBox 3.0.5, 맑은 고딕) — UTF-8 컴파일 필수
javac -encoding UTF-8 -cp "<pdfbox·fontbox·pdfbox-io·commons-logging jar>" -d cls SynthPlanPdf.java
java -cp "<같은 jar>;cls" SynthPlanPdf synthetic-plan.pdf C:/Windows/Fonts/malgun.ttf

# 2) 계정 B v21 파이프라인 (계정 B 폴더 무수정, 출력은 scratchpad)
"<B>/.venv-llm/Scripts/python.exe" -I -B -X utf8 run_v21.py "<B>" synthetic-plan.pdf <work> <out> SYNPDF02

# 3) Backend (로컬 전용으로 수신 켬)
cd backend
DB_URL=jdbc:mysql://localhost:3307/lh_assessment_e2e DB_USERNAME=learnershigh DB_PASSWORD=<.env의 MYSQL_PASSWORD> \
ASSESSMENT_ANALYSIS_IMPORT_ENABLED=true ./gradlew bootRun --args='--server.port=18080'

# 4) HTTP·DB 검증 (UTF-8 바이트로 전송)
python -X utf8 e2e_http.py synthetic-plan.pdf <out>/SYNPDF02.backend-import.json e2e-run2.json
```

## 4. 원본 동일성

| 항목 | 값 | 일치 |
|---|---|---|
| 등록 PDF SHA-256 (로컬 계산) | `f5839c052602a228ed2074aa593f0e58a8ad30986c4fd81c18c4e45a37f9a274` | — |
| 분석기 `source.sha256` | 위와 같음 (분석기가 같은 파일 바이트에서 계산) | 예 |
| Backend DB `assessment_plan_revision.sha256` | 위와 같음 (서버 `PdfInspector` 계산) | 예 |
| 쪽 수: 분석기 / DB | 2 / 2 | 예 |
| 원문 Locator | 모든 `sources[].pdfPageNumber`가 1~2 (PDF 물리 쪽) | 예 |

해시를 손으로 적거나 검사를 우회하지 않았다. 세 값 모두 같은 파일에서 각자 계산했다.

## 5. 분석기 출력 (v21 실제 실행)

- 문서 상태 `PARTIAL`. 사유는 "세부 표 연결이 없어 상세정보를 추출하지 못한 수행평가 1개"(P02).
- 과목 구간 1개: `과학`, 2026학년도 1학년 1학기(제목 상자·머리표에서 읽음).
- 평가 3개: `W01` 1차 시험(지필), `P01` 탐구 보고서, `P02` 발표 활동.
- Adapter: `importable=true`, 차단 0, 로컬 계약 검증 위반 0, `warnings=[]`.
- 계약 밖 정보(계약 차이) 13건: SUBJECT_CONTEXT 3, BASE_SCORE 2, FIELD_PRESENCE 2, TASK_METHODS 2, CONDITION_STRUCTURE 1, LINK_CONFIDENCE 1, TASK_GOALS 1, WRITTEN_COMPONENTS 1.
- 계정 B 단위 테스트의 합성 기대값과 같은 내용이 나왔다(P01 활동·제출물 1·조건 2·채점 요소 2, P02 상세 없음). 공통 채점표(AMBIG)는 연결이 모호해 쓰지 않았다(분석기 정책).

계정 B 예시에는 없던 `subjects[].sources`(학년·학기·과목 칸 근거)가 실제 출력에 들어 있었다. Backend DTO는 이 필드를 이미 받으므로 수정이 필요 없었다.

## 6. HTTP · DB 결과 (실제 서버, 77개 검사 중 76개 PASS)

기록: `e2e_http.py` 출력. 1건은 제 기대값 오류다(§6-5).

### 6-1. 단계 A — PDF 등록

| 검사 | 결과 |
|---|---|
| `POST /api/admin/assessment/evaluation-plans` | 201, `planId`·`documentRevisionId` 반환 |
| 응답 | `fileRef:null`, `analysisStatus:NOT_REQUESTED`, `reviewStatus:UNREVIEWED` |
| DB | sha256·page_count=2·size_bytes=34028 저장, `file_ref` NULL, Schema에 BLOB Column 없음 → 원본 바이트 미보관 유지 |

### 6-2. 단계 B·C — 분석 후보 수신·관리자 조회

| 검사 | 결과 |
|---|---|
| 최초 수신 | 201, `REVIEW_REQUIRED` / `UNREVIEWED` |
| 같은 Request 재전송 | 200, 같은 `analysisId`. Run 1건 유지 |
| DB Run | `origin=EXTERNAL_IMPORT`, 분석기 이름·버전 기록. `result_json`이 payload `subjects`와 **완전히 같음**(값 보정 없음) |
| 검토 기록 | Review 0건, 확정값 0건, Revision `review_status` 그대로 UNREVIEWED |
| `GET .../analysis` | 200. 과목·W01·P01·P02 반환. P01 활동·제출물·조건 2·채점기준 2(수준·점수·근거 쪽) 반환 |
| 내용 없는 항목 | P02 `content:null`, `submissions/conditions/rubric:[]` 그대로(Backend가 만들어 넣지 않음) |
| 후보 / 확정 분리 | `subjects`(후보)와 `confirmedFields:[]`(확정)가 따로 옴, `reviewStatus:UNREVIEWED` |

### 6-3. 단계 D — 학생 공개 상태

| 검사 | 결과 |
|---|---|
| 학생 목록(2026·1학년·1학기) | 200, 문서 1건, `reviewStatus:UNREVIEWED` |
| AI 후보 노출 | 없음. 응답 키는 `planId, documentRevisionId, schoolId, academicYear, grade, semester, fileName, sourceUrl, reviewStatus, uploadedAt`뿐 |
| 학생 상세 `GET /evaluation-plans/{planId}` | 200, 후보 미노출 (**지난 보고의 미검증 항목, 이번에 확인**) |
| 다른 학년 / 다른 학교 | 403 `FORBIDDEN` |
| 미확정 Revision 참조 등록 | 400 `VALIDATION_ERROR` `evaluationItemRef.documentRevisionId: not_confirmed`, 저장 0건 |

### 6-4. 단계 E·F — 합성 데이터 기반 검토 API 시험 → 학생 참조

| 검사 | 결과 |
|---|---|
| 운영 권한 없는 관리자(`adm_gangnam`)의 검토 | 404, Review 0건 |
| `adm_plan_operator` 검토(4개 값, 과목 `과학` → `subj_12` 매핑은 **시험용 가정**) | 200 `CONFIRMED`, 확정값 4건 |
| DB Review | 1건, `reviewed_by=adm_plan_operator`(Mock ID — 실제 사람 아님), `analysis_id` 일치 |
| AI 후보 Run | 그대로 `REVIEW_REQUIRED` 1건(후보는 확정으로 바뀌지 않음) |
| 학생 참조 등록 | 201. DB `stu_001 / subj_12 / BEFORE_START / Revision 1 / subj_12 / P01` |
| 학생 재조회 | `evaluationItemRef` 유지 |
| 관리자(강남) 조회 | 같은 Assessment ID·`BEFORE_START` |
| 학생 상태 IN_PROGRESS → 관리자 재조회 | 관리자도 `IN_PROGRESS` |
| 분당 관리자 / 다른 학생 | 404 / 404 `ASSESSMENT_NOT_FOUND` |
| 역전이(IN_PROGRESS → BEFORE_START) | 409 `INVALID_STATE_TRANSITION` |
| 같은 PDF를 Revision 2로 등록 → FAILED 결과 수신 | 201 `FAILED` / `UNREVIEWED`. FAILED 분석으로 확정 시도는 400, Review 1건 그대로 |
| 개정본 추가 후 학생 참조 | Revision 1 그대로 |

### 6-5. 오류·보안 (모두 실패 후 6개 Table 행 수 불변 확인)

| 상황 | 기대 | 실제 |
|---|---|---|
| SHA-256 불일치 | 거절 | 400 `source.sha256: document_mismatch` |
| 쪽 수 불일치 | 거절 | 400 `source.pageCount: page_count_mismatch` |
| 근거 쪽 범위 밖(3쪽) | 거절 | 400 `...sources[0].pdfPageNumber: out_of_range` |
| 근거 없는 수치 | 거절 | 400 `...items[1].sources: evidence_required` |
| `itemKey` 중복 | 거절 | 400 `...items[1].itemKey: duplicate` |
| 알 수 없는 필드(`specialRules`) | 거절 | 400 `unknown_field` |
| 내부 분석 필드(`confidence`) | 거절 | 400 `unknown_field` |
| `status=CONFIRMED` | 거절 | 400 `status: format` |
| 최상위 `reviewStatus=CONFIRMED` | 거절 | 400 `reviewStatus: unknown_field` |
| 같은 Request 재전송 | 기존 Run 재사용 | 200, 같은 `analysisId` |
| 인증 없음 / 학생 Header로 수신 | 거절 | 401 / 401 |
| 운영 권한 없는 관리자의 수신 | 거절 | **404 `NOT_FOUND`** (저장 없음) |
| 운영 권한 없는 관리자의 분석 조회 | 거절 | 404 |
| 다른 학생 Assessment | 404 | 404 |
| 수신 기능 꺼짐(기본 설정 서버 재시작) | 노출 안 됨 | `POST .../analysis-imports` 404, Run 수 2→2. 기존 `GET .../analysis`는 200 |

FAIL 1건은 "운영 권한 없는 관리자 수신 → 403"이라는 **제 기대값이 틀린 것**이다. 문서 경로(`{planId}` 아래)에서는 문서가 있는지 드러내지 않도록 404를 주는 것이 기존 설계다(API-STATUS §2). 403은 학교 단위 목록·등록에만 쓴다. 코드는 바꾸지 않았다.

### 6-6. 관찰 (결함 후보)

- 확정된 Revision에 대해 **분석 결과에 없는 `itemKey`(`P99`)로도 학생 참조 등록이 201로 된다.** 현재 Backend는 `itemKey`의 의미를 해석하지 않는다(코드 주석 §12, 자동 매핑 규칙 미합의). 처리 방안은 `AI-BACKEND-CONTRACT-GAPS.md` G-7에 적었다.

### 6-7. Student Care

기본 설정 서버에서 `/api/admin/student-care/branches` 200, `/board?branchId=br_gangnam` 200.

## 7. 자동 테스트로 고정한 것

| Test | 내용 |
|---|---|
| `AnalyzerV21SyntheticImportApiTest` (2건) | 위 Fixture로 등록 → 수신 201 → 재전송 200 → 후보 조회(값 그대로) → 학생 비노출·상세 GET → 미확정 참조 400 → 합성 검토 시험 → 참조 201 → 관리자 같은 ID / 다른 PDF(해시만 다름)에 같은 결과 → 400 `document_mismatch`, 저장 0 |
| `AnalysisImportDisabledApiTest` (1건) | 기본 설정에서 수신 404, 저장 0 |

## 8. 작업 중 겪은 문제

| # | 증상 | 원인 | 조치 |
|---|---|---|---|
| 1 | 첫 합성 PDF에서 분석기가 과목·평가를 못 찾음 | 제 생성기를 JDK 17 단일 파일 실행으로 돌려 UTF-8 소스가 MS949로 컴파일됨 → **PDF 안의 한글 자체가 깨짐**(분석기 문제 아님) | `javac -encoding UTF-8`로 재생성. 깨진 PDF 결과는 Backend에 보내지 않음 |
| 2 | `▪` 글리프 없음 | 맑은 고딕·나눔고딕에 U+25AA 없음 | 글머리표를 `•`로 바꿈(분석 결과에 영향 없음 확인) |
| 3 | DB `result_json` 비교 불일치처럼 보임 | mysql CLI `-B`가 줄바꿈을 `\n` 문자로 표시 | `--raw`로 읽어 완전 일치 확인. E2E Schema를 다시 만들어 처음부터 재실행 |
| 4 | `verify-backend.ps1`가 `clean`에서 실패 | 제 셸 작업 폴더가 `backend/build/test-results` 안에 있었음(환경 문제) | 작업 폴더를 옮기고 재실행 → PASS |

## 9. 남은 상태

- `lh_assessment_e2e` Schema에 합성 데이터가 남아 있다(Plan 1, Revision 2, Run 2, Review 1, 수행평가 2). 다른 데이터는 없다.
- Docker MySQL 컨테이너는 계속 켜져 있다. Backend 서버는 모두 종료했다.
- 커밋·Push 하지 않았다.
