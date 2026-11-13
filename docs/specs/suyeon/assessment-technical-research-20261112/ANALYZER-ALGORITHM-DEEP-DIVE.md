# 평가계획서 분석기 알고리즘 — 함수 수준 실행 경로

> 기준: 기본 프로필 `v21.1`, 시연 HTTP 서비스 경로. 모든 경로는 `CA/tools/` 기준(`CA` = `C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis`).
> AI·LLM 단계는 없다. 모든 판정은 정규식·표 모양 규칙이며, 결과는 후보(DRAFT_UNREVIEWED)다.
> 상태: 각 단계는 **[코드 확인]**. 테스트 근거는 `tools/tests/` 파일 이름으로 적었다.

## 0. 전체 흐름

```
HTTP multipart → upload_guard.inspect → SHA-256 → 임시 폴더 → analysis_worker(하위 프로세스, 메모리 상한·네트워크 차단)
  → analysis_result.analyze_file(profile="v21.1")
      → build_docmodel → (PDF) run_pdf_layout[Java PdfLayout] → docmodel.build.build
          → hwp_model.parse_hwp | hwpx_model.parse_hwpx | pdf_model.parse_layout   (blocks·pages·integrity)
          → analyze.segments (과목 구간) → analyze.document_type → contexts
      → analyze_docmodel
          → assessment_assembly03.assemble_document (구간마다 assemble)
          → task_detail.extract_segment (수행평가 상세)
          → resolve_subject (머리표 과목명)
          → validate / validate_levels (Locator·인용·범위)
          → 문서 상태
  → backend_import: PDF → backend_adapter.to_import_request / HWP·HWPX → multiformat_adapter.to_experimental
→ JSON 응답 → 임시 폴더 삭제
```

## 1. 단계별 실제 구현

| # | 단계 | 함수·모듈 | 입력 → 출력 | 알고리즘·규칙 | 예외 처리 | 테스트 |
|---|---|---|---|---|---|---|
| 1 | 파일 수신 | `service/analysis_service.py` `Handler.do_POST` | HTTP multipart → bytes + 필드 | `email.parser.BytesParser(policy=HTTP)`. Host 헤더 = `127.0.0.1:<port>`·`localhost:<port>`만, `X-Analysis-Token` `hmac.compare_digest` | 401·403·405·411·413(Content-Length 상한) | `test_analysis_service.py` 22건 |
| 2 | 형식 검증 | `service/upload_guard.inspect(data, max_bytes)` | bytes → (format, problem) | 매직 바이트(`build.actual_format`). HWPX: ZIP 항목 ≤2,000, 항목 ≤100MB, 합계 ≤200MB, 1MB 이상 항목 압축비 ≤200, 경로 이탈·절대경로·중복·암호 항목 거절, 실제 스트리밍 해제 검사. HWP: CFB 헤더(byte order `0xFFFE`, (major, sector shift) ∈ {(3,9),(4,12)}) | 415 `UNSUPPORTED_FORMAT`, 413, 422 `CORRUPT_FILE` | 같음 |
| 3 | SHA-256 | `analysis_service`(요청 바이트), `analysis_result.build_docmodel`(파일) | bytes → 64자 hex | `hashlib.sha256`. 요청에 `sha256`을 보내면 대조(`SHA_MISMATCH`) | 422 | 같음 |
| 4 | Parser 선택 | `docmodel/build.actual_format` → `build.build` | bytes → `"PDF"|"HWP"|"HWPX"|"ZIP_OTHER"|"UNKNOWN"` | 확장자 무시. `%PDF-` / `D0CF11E0A1B11AE1` / `PK\x03\x04` + `Contents/section`·`mimetypehwp` | 지원 밖 → `UNSUPPORTED_FORMAT`(빈 결과로 바꾸지 않음) | `test_docmodel.py` |
| 5a | PDF 추출 | `analysis_result.run_pdf_layout` → Java `PdfLayout` → `pdf_model.parse_layout` | PDF → `<id>.layout.jsonl`(쪽마다 `{page,w,h,rotation,lines[[word,x0,y0,x1,y1]],rules}`) → blocks·pages | 단어 좌표 + 괘선 → 2pt 허용오차 군집·연결 성분 → 격자 → 단어 중심점 칸 배정. 작은 표부터 배정(중첩). 20pt 미만 사각형은 체크박스로 제외 | Java 실패 → `RuntimeError` → `PARSE_FAILED` | `test_docmodel.py`(합성 PDF Fixture `FixtureMaker.java`) |
| 5b | HWP 추출 | `hwp5.Cfb` → `hwp_model.parse_hwp` | CFB → `BodyText/Section*` → 레코드 → blocks | `FileHeader` 플래그(압축·암호·배포), `zlib.decompress(-15)`, 레코드 트리(level)로 문단·표(`CTRL_HEADER 'tbl '`→`TABLE`→`LIST_HEADER`) 복원 | 암호·배포용 거절, 칸 문단 수 불일치 `PARAGRAPH_COUNT_MISMATCH` 기록 | 같음 |
| 5c | HWPX 추출 | `hwpx_model.parse_hwpx` | ZIP → `Contents/section*.xml` → blocks | `hp:tbl/hp:tr/hp:tc` + `cellAddr`·`cellSpan` | XML 오류 → `PARSE_FAILED` | 같음 |
| 6 | 중간 표현 | `docmodel/build.build` | blocks → SourceDocument(docmodel-0.1) | `grid_check`(병합 포함 격자 검산 OK/AMBIGUOUS/INCOMPLETE), `loc_id`(결정적 Locator) | integrity에 문제 기록 | `test_docmodel.py` |
| 7 | 과목 구간 탐지 | `docmodel/analyze.segments` | DocumentModel → segments[] | HWP·HWPX: 제목 문단 정규식 `TITLE`(교수·학습 및 평가 (운영) 계획) + 머리표(`header_context`, 라벨 사전: 학년·학기·과목·교과…) + 1×1 제목 상자. PDF: 쪽 위 35% 제목, 머리표, **인쇄 쪽 번호 감소 = 재시작**. 제목+머리표 3블록 이내면 합침. 폴더 값은 `folderContext`로만(문서 값과 섞지 않음) | 시작점 없으면 `WHOLE_DOCUMENT` 1구간 | `test_docmodel.py` |
| 8 | 평가 영역·표 역할 | `assessment_assembly03.table_role` + `rubric_structure2` | 표 → `TEACHING_SCHEDULE`·`WRITTEN_ITEM_DISTRIBUTION`·`RUBRIC`·요약표 후보 | 머리글에 시간 단위 열(월·주·차시) + 단원·성취기준 열 → 운영표. 문항 수·난이도 열 → 지필 문항 분포표. 점수 열 모양 → 채점표 LIKELY/POSSIBLE | 판정 불가는 후보로 남김 | `test_llmprep_v19_1.py`, `v20` |
| 9 | 지필·수행 분리 | `assessment_assembly03.kind_of`, `_kind_above`, `group_question_type_rows` | 이름·위쪽 머리 칸 → `WRITTEN`/`PERFORMANCE` | `PERF=수행`, `WRIT=지필|정기|중간고사|기말고사|고사|시험`. 병합된 시험 칸 아래 문항 유형(선택형·서답형…)은 독립 평가가 아니라 구성요소 | 종류 미상 → `KIND_UNKNOWN`(전송 제외) | `test_llmprep_v21_1.py` |
| 10 | 평가 항목 추출 | `matrix_entries`(가로형) · `list_entries`(세로형) · `sheet_entry`(세부 계획표) · `_merge_registry` | 표 → entries[] | 이름 라벨 사전(`평가명`·`수행과제`·`평가영역`…), 이름 유사도(bigram, 0.6·여유 0.2)로 계획표·요약표 이름 합침(별칭 보존), 이름 품질(`name_quality`, 손상·조각·문항 유형 이름 표시) | 손상 이름 → `PARSE_UNCERTAIN`·`NAME_UNREADABLE` | `v19_1`, `v20`, `v21_1` |
| 11 | 반영비율·시기·만점 | `field_of`, `parse_value`, `parse_with_label`, `presence` | 칸 → `{value, unit, locator, origin, label}` | 라벨 정규식 `FIELDS`(weight·maxScore·baseScore·timing·occurrences·methods), 단위(%·점)로 필드 구분, 라벨 꼬리 단위 정규화, 괄호 값 = 부분집합(SUBSET), 같은 숫자 = `NUMERIC_COINCIDENCE` 표시 | 값이 여러 출처에서 다르면 `CONFLICTING`/`VARIANTS`(고르지 않음), 없으면 `NOT_STATED` | 같음 |
| 12 | 활동·조건·제출물 | `task_detail.extract`(평가마다) | 평가 + 범위 표 → taskDetail | 평가 범위 고정(`scope_for`): 요약표의 그 평가 열·행, `LINKED_CONFIDENT`·`LINKED_REVIEW_REQUIRED` 채점표만. 라벨 사전(`TASK`·`GOAL`·`TOPIC`·`UNIT`·`STANDARD`·`PERSPECTIVE`…), 제출물 STATED(제출·결과물 표현) / INFERRED(작성 대상 낱말), 조건 종류(LENGTH·TIME·FORMAT·GROUP·MATERIAL·REQUIRED_CONTENT·PROCEDURE), 체크 상자 ■/□, 특수 규정(`SPECIAL`=미제출·결시…) | 연결 표 없음 → `NOT_EXTRACTED`(원문에 없다는 뜻 아님), 원인 `detail_cause` | `test_llmprep_v21.py` |
| 13 | 채점 요소·배점 | `count_bands`, `task_detail.element_levels(recover=True)`, `_merge_rubrics`, `link_confidence` | 채점표 → 요소·수준·점수, 개수 구간 | 수준 칸의 개수 표현(`N가지 이상`·`모든`)으로 개수 구간 판정, 점수 열, v21.1 수준 문장 복원(같은 행 병합 칸·같은 행 조각 칸만). 연결: 표 제목 행·앞 제목 문단·칸 안 이름 → 신뢰 단계 5종(`LINKED_CONFIDENT`·`LINKED_REVIEW_REQUIRED`·`AMBIGUOUS`·`UNLINKED`·`SOURCE_STRUCTURE_BROKEN`, `link_confidence`) + 근거 검사(`TOP_SCORE_VS_MAX`, `PLAN_TIMING`) | 후보 2개 이상이면 연결 안 함 | `v20`, `v21_1` |
| 14 | 원문 Locator | `docmodel/model.loc_id`, `assessment_assembly03._loc` | 칸·문단 → `"<fileId>#s<sec>.<path>"` / `"#pg<n>.t<t>.r<r>c<c>"` / `"#pg<n>.l<line>"` | 같은 원본(SHA)에서 항상 같은 값(결정적) | – | `test_docmodel.py` |
| 15 | 분석값 검증 | `analysis_result.validate`, `validate_levels` | 결과 + DocumentModel → `validation` | ① 모든 Locator가 DocumentModel에 있는가 ② 추출 글이 Locator 글 안에 공백 무시로 그대로 있는가 ③ 상세 항목이 그 평가 범위 표에서 왔는가(교차 오염) ④ 수준 문장 인용 | 실패 → 문서 상태 `PARTIAL` | `v21`, `v21_1` |
| 16 | 경고·모호성 | `_checks`, `component_sums`, `task_detail.detail_checks`, `_segment_status` | → `checks[]`, 구간 상태 | `CONFLICTING`·`VARIANTS`·`NOT_STATED`·`NUMERIC_COINCIDENCE`·`TERMS_DIFFER`·`ZERO_CRITERIA_SCORE NOT_STATED` 등. 구간: `ASSESSMENTS_EXTRACTED`/`ASSESSMENT_LIST_NOT_EXTRACTED`/`NO_ASSESSMENT_SIGNAL` | 값을 고르거나 계산해 채우지 않음 | 같음 |
| 17 | 결과 JSON | `analysis_result.analyze_docmodel` | → `curriculum-analysis-result-0.1` | 문서 상태 `OK_REVIEW_REQUIRED`/`PARTIAL`/`NO_ASSESSMENTS_EXTRACTED`/`NO_SEGMENTS`/`UNSUPPORTED_FORMAT`/`PARSE_FAILED`, `reviewState=DRAFT_UNREVIEWED`, `keyFingerprint`(평가 위치 지문) | – | `v21`, `v21_1_final` |
| 18 | Backend Import 변환 | `service/analysis_worker.backend_import` → `backend_adapter.to_import_request`(PDF) / `multiformat_adapter.to_experimental`(HWP·HWPX) | 결과 + DocumentModel → `AnalysisImportRequest` | 계약 필드만 낸다. 숫자는 근거 Locator(PDF는 `pdfPageNumber`)가 있을 때만. 충돌 값은 null + warnings. INFERRED 제출물·차수 추정(중간=1)·손상 이름 평가는 보내지 않음. 계약 밖 정보는 `gaps[]`, 평가별 처리 `dispositions[]` | 로컬 계약 검증 위반 → `importable=false` | `v21`, `v21_mf`, `test_analysis_service.py` |

## 2. 실제 코드와 지시서 단계의 차이

| 지시서 단계 | 실제 |
|---|---|
| "평가 영역 탐지" | 별도 단계가 없다. 표 역할 판정(8)과 이름 라벨(`평가영역`이 이름 라벨 중 하나)에 섞여 있다. Backend `area` 필드는 대부분 비어 있다 |
| "중간 문서 표현 → 과목 구역 탐지" 순서 | 같다. 단, 과목명은 v21.1에서 조립 뒤 `resolve_subject`로 한 번 더 고친다(머리표 '과목' 칸 우선) |
| "분석값 검증 → 경고 처리" | 경고(16)는 조립 중에 먼저 생기고, 검증(15)은 결과를 만든 뒤 한다 |
| LLM 단계 | 현재 경로에 없음 |

## 3. 함수 사이 자료구조 (실제 키)

### DocumentModel (docmodel-0.1)

```json
{
  "schema": "docmodel-0.1", "sourceId": "F02532", "sha256": "…", "actualFormat": "HWP",
  "parser": {"name": "hwp_model", "version": "0.1"},
  "blocks": [
    {"type": "paragraph", "text": "…", "locator": {"kind": "HWP_PARAGRAPH", "id": "F02532#s0.p3", "section": 0, "path": "p3"}},
    {"type": "paragraph", "text": "", "locator": {…}, "blocks": [
      {"type": "table", "tableIndex": 11, "rows": 13, "cols": 10,
       "cells": [{"row": 6, "col": 7, "rowSpan": 1, "colSpan": 3,
                  "paragraphs": [{"type": "paragraph", "text": "…", "locator": {"kind": "HWP_TABLE_CELL", "id": "F02532#s0.p111.c0.r6c7.p0", …}}],
                  "locator": {"kind": "HWP_TABLE_CELL", "id": "F02532#s0.p111.c0.r6c7", "table": 11, "row": 6, "col": 7, "rowSpan": 1, "colSpan": 3}}],
       "grid": {"status": "OK", "holes": 0, "overlaps": 0}, "mergedCellRanges": [ … ]}]}],
  "pages": null,
  "segments": [{"segmentId": "S01", "startedBy": "HEADER_TABLE", "blockRange": [0, 120], "context": {…}, "folderContext": {…}, "contextStatus": "FROM_DOCUMENT"}],
  "contexts": [{"contextId": "C01", "academicYear": 2025, "grades": [1], "semesters": [1], "subject": {"asWritten": "…"}, "status": "RULE_CANDIDATE"}],
  "integrity": {"status": "OK", "sections": 1, "rawTextChars": 44985, "problems": []}
}
```

PDF는 `pages[] = {pdfPage, printedPage, width, height, blockRange}`가 있고, 표에 `pdfPage`·`bbox`가 붙는다.

### 조립 결과 (구간마다, 내부)

`{assessments[{key, name, aliases, kind, kindSource, nameQuality, summary{timing,occurrences,weight,maxScore,baseScore}, components, groupValues, sources, rubricTables[{table, link, linkConfidence, linkEvidence, countBands}], rubric, checks}], tables[{table, role, r2, captions}], teaching[], writtenItemDistributions[]}`

### 분석 결과 (curriculum-analysis-result-0.1)

`{schema, analyzer{name, version:"v21.1", modules}, source{sourceId, sha256, format, pageCount, parser, integrity}, reviewState{status:"DRAFT_UNREVIEWED", humanReviews:0}, segments[{segmentId, status, statusReasons, context, subjectResolution, pdfPageRange, assessments[{key, name, kind, timing, occurrences, weight, maxScore, baseScore, components, groupValues, sources, link, scoring{model, elements, countBandTables}, checks, keyFingerprint, detailCause, taskDetail{scope, activities, activityTypes, goals, topics, units, standards, methods, perspectives, deliverables, assessorInstruments, conditions, specialRules, presence}}], unlinkedRubricTables, teaching, writtenItemDistributions}], validation{locators, quotes, scope, levelQuotes}, status, statusReasons}`

각 값 필드는 `{presence: FOUND|NOT_STATED|CONFLICTING|VARIANTS|NOT_EXTRACTED|PARSE_UNCERTAIN, values:[{value|raw, unit, locator, origin, label}]}` 모양이다.

### HTTP 응답 (analyze-preview-0.1-dev)

최상위 키(저장된 예시 `CA/runs/v22-analysis-preview-service-20261111/examples/response-pdf.json`에서 확인): `service, requestId, ok, status, analyzerVersion, analyzerChannel, analyzer, analysisMode, source, reviewState, summary, backendImport, warnings, errors, elapsedMs`(+ `includeAnalysis=true`이면 `analysis`).

`{…, source{sha256, sizeBytes, detectedFormat, declaredExtension, extensionMatchesFormat, pageCount, sectionCount}, reviewState, summary{segments, segmentsExtracted, subjects, assessments, written, performance, performanceWithActivities, locatorsUnresolved, quotesNotVerbatim, outOfScope}, backendImport{contract, variant: OFFICIAL_PDF|EXPERIMENTAL_MULTIFORMAT, adapter, requiresBackendFlag, importable, blockers, payload, localValidation, dispositionSummary, contractGapSummary, includeInferredDeliverables:false}, analysis?(includeAnalysis=true일 때), analysisMode{llmCalls:false, method}, elapsedMs}`

## 4. 처리 시간 (실측만)

| 대상 | 시간 | 근거 |
|---|---|---|
| 합성 PDF·HWP·HWPX 1건(HTTP 왕복, 워커 시작 포함) | 1초 안쪽 | 2026-11-11 시연 점검 실측(`CA/runs/v22-analysis-preview-service-20261111/OPERATIONS.md` §5). 저장된 예시 JSON의 `elapsedMs`는 비교용으로 0으로 고정되어 근거로 쓰지 않음 |
| 실제 PDF 220쪽(G001) DocumentModel | 8.5초(+PdfLayout 1.8~14.9초 별도) | `runs/v4-pilot-20261106/baseline_report.md` |
| 실제 PDF 346쪽(G003) | 33.4초(+PdfLayout 별도) | 같음 |
| 실제 HWP·HWPX | 0.1~0.5초 | 같음 |

전수(5,170개) 처리 시간·처리량은 측정한 적이 없다.
