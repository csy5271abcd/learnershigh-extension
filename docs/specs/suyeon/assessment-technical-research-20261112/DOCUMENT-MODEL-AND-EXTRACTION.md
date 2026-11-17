# DocumentModel과 평가정보 필드 지원 범위

> 근거 코드: `CA/tools/docmodel/model.py`(스키마 주석), `build.py`, `CA/tools/llmprep/analysis_result.py`, `backend_adapter.py`,
> Backend `assessment/dto/plan/AnalysisImportRequest.java`, `service/plan/EvaluationPlanService.java`(`FIELD_PATH`), `ConfirmedItemKeys.java`, `EvaluationPlanQueryService.java`, `database/migrations/V202611090310__create_assessment_evaluation_plan.sql`.
> 상태: 모두 **[코드 확인]**. "MySQL 저장"은 테이블·코드 경로가 있다는 뜻이며, 실제 학교 문서를 저장한 적은 없다(합성 데이터만).

## 1. 실제 중간 자료구조 (docmodel-0.1)

실제 코드에 있는 이름만 적었다. 지시서의 `Document·Page·Section·Paragraph·Table·Row·Cell·Text·Locator` 중 **`Row`라는 독립 객체는 없다**(칸이 `row`·`col` 좌표를 가진다). `Section`은 HWP·HWPX Locator의 `section` 번호로만 존재한다.

| 이름(실제 키) | 형식 | 내용 |
|---|---|---|
| SourceDocument | 전체 | `schema, sourceId, sha256, actualFormat, parser{name,version}, originalFile, renditions[ORIGINAL], blocks[], pages[]|null, segments[], contexts[], folderContext, documentType, integrity` |
| `blocks[]` paragraph | 공통 | `{type:"paragraph", text, locator, blocks?[]}` — 문단 안 컨트롤(표 등)은 `blocks`로 중첩 |
| `blocks[]` table | 공통 | `{type:"table", tableIndex, rows, cols, cells[], grid{status,holes,overlaps}, mergedCellRanges[], caption?[]}` + PDF는 `pdfPage, bbox` |
| cell | 공통 | `{row, col, rowSpan, colSpan, paragraphs[], locator, nonRectangular?}` |
| `pages[]` | PDF만 | `{pdfPage, printedPage, width, height, blockRange}` |
| `segments[]` | 공통 | `{segmentId, startedBy: TITLE|HEADER_TABLE|TITLE+HEADER_TABLE|PRINTED_PAGE_RESTART|DOCUMENT_FRONT|WHOLE_DOCUMENT, pdfPageRange|blockRange, context, folderContext, contextStatus}` |
| `contexts[]` | 공통 | `{contextId, academicYear, grades[], semesters[], subject{asWritten}, sources, status:"RULE_CANDIDATE", segmentRefs[]}` |
| Locator | 형식별 | `HWP_PARAGRAPH`·`HWP_TABLE_CELL`·`HWPX_PARAGRAPH`·`HWPX_TABLE_CELL`·`CONTROL_TEXT`(셀 `UNAVAILABLE`)·`PDF_TEXT{pdfPage,bbox,printedPage}`·`PDF_TABLE_CELL{pdfPage,table,row,col,bbox}`. id = `<fileId>#s<section>.<path>` 또는 `#pg<n>.l<line>` / `#pg<n>.t<t>.r<r>c<c>` |

## 2. 필드별 지원 범위

열 뜻:
1 **Parser/분석기 추출** — 분석 결과 JSON에 값이 생기는가 · 2 **결과 JSON** · 3 **Backend Import**(AnalysisImportRequest 필드) · 4 **MySQL 저장**(`assessment_plan_analysis_run.result_json`에 Payload 통째, 확정값은 `assessment_plan_confirmed_value`) · 5 **관리자 검토**(검토 화면에 보이고 fieldPath로 확정 가능) · 6 **공식 확정**(`PUT …/review`. PDF는 기본 허용, HWP·HWPX는 `structured-confirm-dev=true`일 때만. 둘 다 **Mock Header 인증**이라 운영 확정 실적이 아님) · 7 **학생 조회** · 8 미지원.

학생 API(`GET /api/student/assessment/evaluation-plans[/{id}]`)는 **계획서 메타데이터와 검토 상태(`reviewStatus`)만** 돌려준다(`StudentEvaluationPlanResponse`). 확정된 필드 값 자체는 학생 응답에 없다. 학생은 수행평가를 등록할 때 `evaluationItemRef{documentRevisionId, subjectId, itemKey}`로 **확정 검토에 쓰인 Run의 수행평가 itemKey**만 참조할 수 있다(`ConfirmedItemKeys`). 그래서 7열은 아래처럼 적었다.

### 문서 기본 정보

| 필드 | 1 추출 | 2 JSON | 3 Import | 4 DB | 5 검토 | 6 확정 | 7 학생 |
|---|---|---|---|---|---|---|---|
| 학년도 | ○(제목 정규식) | `segments[].context.academicYear` | ✕ | ✕(계획서 등록 시 관리자가 입력: `assessment_evaluation_plan.academic_year`) | – | – | 계획서 메타데이터로 ○ |
| 학교 | ✕(지도교사·학교는 후보 생성 안 함) | ✕ | ✕ | 등록 시 입력 | – | – | 메타데이터 ○ |
| 학년·학기 | ○(머리표·제목) | `context.grades/semesters` | ✕(계약 없음 → gaps `SUBJECT_CONTEXT`) | 등록 시 입력 | – | – | 메타데이터 ○ |
| 과목 | ○(머리표 '과목' 칸 우선) | `context.subject` | ○ `subjects[].subjectName` | Payload | ○ | ○ | ✕ |
| 쪽 범위 | PDF만 | `pdfPageRange` | PDF만 `pageRange` | Payload | ○ | – | ✕ |

### 지필평가

| 필드 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| 지필 전체 반영비율 | ○(묶음 값) | `groupValues` | `writtenEvaluation.weightPercent` — 묶음인지 구분 못 하면 null | Payload | ○ | ○ | ✕ |
| 시험 차수 | ○(이름에 숫자로 적힌 경우만) | `name`·`key` | `exams[].round` — 숫자 없으면 **전송 제외**(`ROUND_NOT_STATED`) | Payload | ○ | ○ | ✕ |
| 실시 시기 | ○ | `timing` | `exams[].timing` (충돌·변형이면 null) | Payload | ○ | ○ | ✕ |
| 반영비율 | ○ | `weight` | `exams[].weightPercent` | Payload | ○ | ○ | ✕ |
| 만점 | ○ | `maxScore` | `exams[].maxScore` | Payload | ○ | ○ | ✕ |
| 평가 범위(단원) | 부분(운영표·문항 분포표에서만) | `writtenItemDistributions` | ✕ | ✕ | ✕ | ✕ | ✕ |
| 문항 유형 | ○ | `components`·`questionTypeRows` | `exams[].questionTypes` | Payload | ○ | ○ | ✕ |
| 문항 유형별 점수·비율 | ○ | `components` | ✕ (gaps `WRITTEN_COMPONENTS`) | ✕ | ✕ | ✕ | ✕ |

### 수행평가

| 필드 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| 평가명 | ○ | `name`, `aliases`, `nameQuality` | `items[].label` (손상 이름은 전송 제외) | Payload | ○ | ○ | itemKey만 참조 |
| 평가 영역 | 거의 ✕ | 라벨에 섞임 | `items[].area` — 대부분 null | Payload | ○ | ○ | ✕ |
| 실시 시기 | ○ | `timing` | `items[].timing` | Payload | ○ | ○ | ✕ |
| 반영비율 | ○ | `weight` | `items[].weightPercent` | Payload | ○ | ○ | ✕ |
| 만점 | ○ | `maxScore` | `items[].maxScore` | Payload | ○ | ○ | ✕ |
| 활동 내용 | ○(연결 표 있을 때) | `taskDetail.activities` | `items[].content`(문자열 하나로 합침) | Payload | ○ | ○ | ✕ |
| 제출물 | STATED만 전송 | `deliverables{confirmation}` | `items[].submissions` — **INFERRED는 보내지 않음** | Payload | ○ | ○ | ✕ |
| 조건 | ○ | `conditions{kind,…}` | `items[].conditions`(문장만, 구조는 gaps `CONDITION_STRUCTURE`) | Payload | ○ | ○ | ✕ |
| 채점 요소 | ○ | `scoring.elements` | `rubric[].element` | Payload | ○ | ○ | ✕ |
| 평가 수준 | ○ | `elements[].levels[].description` | `rubric[].levels[].description` | Payload | ○ | ○ | ✕ |
| 수준별 배점 | ○ | `levels[].score`, `countBandTables` | `rubric[].levels[].score` | Payload | ○ | ○ | ✕ |
| 기본점수 | ○ | `baseScore`, `specialRules` | ✕ (gaps `BASE_SCORE`) | ✕ | ✕ | ✕ | ✕ |
| 미제출·결시 규정 | ○(표 칸·문단) | `taskDetail.specialRules` | 채점 수준 문장으로만 일부(예: '미기재·미제출·불참자' 7점 수준) | Payload 일부 | 일부 | 일부 | ✕ |
| 활동 목표·방법·주제 | ○ | `goals`·`methods`·`topics` | ✕ (gaps `TASK_GOALS`, `TASK_METHODS`) | ✕ | ✕ | ✕ | ✕ |
| 근거 위치 | ○ | 모든 값의 `locator` | `sources[]`: PDF `pdfPageNumber`+`extractedText`, HWP·HWPX `documentLocator` | Payload | ○(원문 대조) | 확정값에 근거 저장 | ✕ |

### 운영계획

| 필드 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| 교수학습 운영계획(월·주·단원·성취기준·방법) | 표 **분류만**(`TEACHING_SCHEDULE`) | `segments[].teaching`(표 ID·역할 목록) | **✕ 계약 필드 없음**, gaps에도 기록 안 함 | ✕ | 관리자가 `teachingPlan.*` fieldPath로 **수동 확정은 가능**(화이트리스트에 있음) | 수동만 | ✕ |
| 평가 운영계획(일반 규정·동점자·결시 처리) | 문단 후보(`SPECIAL_RULE_PARAGRAPHS`, v4 `notes`) | 수행평가 `specialRules`에 연결된 것만 | ✕ | ✕ | ✕ | ✕ | ✕ |
| 성취기준 | ○(코드 정규식 2015·2022·약식) | `taskDetail.standards` | ✕ | ✕ | `achievement.*` fieldPath 수동 확정 가능 | 수동만 | ✕ |
| 평가 방법 | ○(■/□) | `taskDetail.methods` | ✕ | ✕ | ✕ | ✕ | ✕ |

## 3. 정리

- 분석기가 추출하는 정보 중 **Backend로 가는 것은 평가 목록·비율·만점·시기·문항 유형·활동·확정 제출물·조건 문장·채점표·근거**다.
- 기본점수·문항 유형별 점수·조건 구조·활동 목표·평가 방법·학년/학기·값별 상태(`presence`)는 분석 결과에만 있고 계약 차이(`gaps`)로 기록된다.
- 교수학습 운영계획은 분석기가 **표를 찾아 표시만** 하고 내용을 구조화하지 않으며, Backend로 보내지 않는다.
- 학생은 확정 값을 직접 받지 않고, 확정 여부와 itemKey 참조만 쓴다.
