# API 계약 변경안 — PDF·HWP·HWPX (M-1~M-8, 승인 요청용)

> **승인 전 초안이다.** Shared `docs/api/api-contract.md`는 수정하지 않았다(SHA-256 `052128cf…` 그대로). 필드 이름은 계정 A·B가 실제 E2E로 검증한 것(`source.format`, `Locator.documentLocator`)을 그대로 쓴다. 새 이름으로 다시 설계하지 않는다.

## 0. 확정 후보 요약

| # | 항목 | 확정 후보 | 현재 구현 |
|---|---|---|---|
| M-1 | §38 등록 형식 | PDF·HWP·HWPX. 형식은 **실제 바이트**로 판별(확장자·Content-Type 무시). 실패는 415 `UNSUPPORTED_FILE_TYPE` + `details.fields[file]` 사유 | 실험 Flag에서 구현·검증 |
| M-2 | §38 응답 | Revision에 `documentFormat`(`PDF`·`HWP`·`HWPX`), `checksum`(원본 SHA-256 hex, §48 이름), `pageCount`(PDF만, HWP·HWPX는 `null`) | 구현(Admin 응답) |
| M-3 | 분석 결과 수신 | `source.format`(선택, 생략 = `PDF`), `Locator.documentLocator`(HWP·HWPX 필수, PDF 금지). PDF는 `source.pageCount`·`pdfPageNumber` 필수 | 실험 Flag에서 구현·검증 |
| M-4 | §39 review 근거 | PDF는 `pdfPageNumber`(현행). HWP·HWPX는 확정 필드마다 `documentLocator` + review 단위 `sourceCheck` (§4) | **미구현·차단**(D-1·원문 검토 절차 승인 필요) |
| M-5 | 학생 노출 | 학생 응답에는 확정값만. 근거 위치(`documentLocator`)는 학생에게 **보내지 않음**(현행 유지 제안) | 현행(후보·위치 미노출) |
| M-6 | `documentLocator.path` | 문법 `[A-Za-z0-9.]+`(200자). `*_TABLE_CELL`은 row·col = path 마지막 `r<row>c<col>` 구간(`path_mismatch`) | 구현·검증(계정 B 출력 568개 오탐 0) |
| M-7 | 필드 이름 | `source.format`·`documentLocator` 유지(계정 B도 같은 의견) | 구현 |
| M-8 | `sectionCount`·`sourceRange` | **이번에는 채택하지 않음**. 서버가 원본을 보관하지 않아 구역 수·과목 구간을 대조할 수 없고, 값이 늘어도 검증력이 늘지 않음. Storage 결정(P-2) 뒤 재검토 | 없음 |

## 1. §38 등록 (M-1·M-2)

요청은 현행 multipart 그대로(`file`, `schoolId`, `academicYear`, `grade`, `semester`, `sourceUrl?`).

| 형식 | 판별 | 저장 | 거절 사유(`details.fields[file].reason`) |
|---|---|---|---|
| PDF | `%PDF-` + PDFBox 열기 | 쪽 수 | 413 `FILE_TOO_LARGE`, 422 `PDF_EXTRACTION_FAILED`(현행) |
| HWP | OLE 서명 + 한글 5.x FileHeader(암호·배포용 아님) | 쪽 수 없음 | `not_hwp_document` · `unsupported_version` · `encrypted` · `distribution_document` |
| HWPX | ZIP + `mimetype=application/hwp+zip` + `Contents/section*.xml` | 쪽 수 없음 | `not_hwpx_package` · `unsafe_entry_path` · `too_many_entries` · `uncompressed_too_large` · `encrypted` · `corrupted` |
| 그 밖 | — | — | `not_supported_format` |

응답(201, 현행 + 추가 필드):

```json
{ "planId": "plan_…", "documentRevisionId": "plan_rev_…", "schoolId": "school_001",
  "academicYear": 2026, "grade": 1, "semester": 1,
  "fileRef": null, "analysisStatus": "NOT_REQUESTED", "reviewStatus": "UNREVIEWED" }
```

문서 상세 Revision(관리자 전용):

```json
{ "documentRevisionId": "plan_rev_…", "revisionNumber": 1, "fileName": "plan.hwp", "fileRef": null,
  "sizeBytes": 36864, "pageCount": null, "documentFormat": "HWP",
  "checksum": "581cc33d951d26b8ab81797fae46e8e8c54859a146b68ea870ef08e8629cde2b", … }
```

## 2. 분석 결과 수신 (M-3·M-6)

```json
{ "analyzer": {"name": "curriculum-analysis", "version": "v21.1/multiformat-adapter-0.1-draft"},
  "source": {"sha256": "<64 hex>", "format": "HWPX"},
  "status": "REVIEW_REQUIRED",
  "subjects": [{ "subjectName": "가상과학탐구",
    "performanceEvaluation": {"weightPercent": 60, "sources": [
      {"documentLocator": {"kind": "HWPX_TABLE_CELL", "section": 0, "path": "p3.c0.r1c3",
                           "table": 1, "row": 1, "col": 3, "rowSpan": 1, "colSpan": 1}, "extractedText": "60%"}],
      "items": [ … ]}}],
  "warnings": [] }
```

`documentLocator` 필드:

| 필드 | 형식 | 필수 |
|---|---|---|
| `kind` | `HWP_PARAGRAPH`·`HWP_TABLE_CELL`·`HWPX_PARAGRAPH`·`HWPX_TABLE_CELL`·`CONTROL_TEXT` | 예 |
| `section` | int ≥ 0 | 예 |
| `path` | `[A-Za-z0-9.]+`, ≤ 200 | 예 |
| `table`·`row`·`col` | int ≥ 0 | `*_TABLE_CELL`이면 row·col 필수 |
| `rowSpan`·`colSpan` | int ≥ 1 | 아니오 |
| `control` | ≤ 50 | 아니오 |
| `cell` | `UNAVAILABLE` | 아니오 |

해석 범위: Locator는 **같은 원본 SHA-256 + 같은 형식 + 그 결과를 만든 분석기 버전(Run의 `analyzer.version`)** 안에서만 의미가 있다. HWP와 HWPX의 path가 같다고 가정하지 않는다. PDF에는 HWP식 Locator를 요구하지 않고, HWP·HWPX에는 쪽 번호를 만들지 않는다.

오류 규칙(모두 400 `VALIDATION_ERROR`):

| 조건 | field | reason |
|---|---|---|
| `source.format` ≠ Revision 형식 | `source.format` | `format_mismatch` |
| PDF: `pageCount`·`pdfPageNumber` 없음 / `documentLocator` 있음 | 해당 경로 | `required` / `not_allowed` |
| HWP·HWPX: `pageCount`·`pageRange`·`pdfPageNumber`·`printedPageLabel` 있음 | 해당 경로 | `not_allowed` |
| HWP·HWPX: `documentLocator` 없음 | `…documentLocator` | `required` |
| kind 접두어가 형식과 다름 | `…documentLocator.kind` | `format_mismatch` |
| `*_TABLE_CELL` row·col 없음 / path 불일치 | `…documentLocator` / `…documentLocator.path` | `cell_position_required` / `path_mismatch` |
| path 문법 | `…documentLocator.path` | `format` |
| 알 수 없는 필드(`id`·`confidence` 등) | 해당 경로 | `unknown_field` |
| 공통(현행) | — | `document_mismatch`·`duplicate`·`evidence_required` 등 |

## 3. PDF 하위 호환 (검증됨)

- `source.format` 생략 = PDF. 기존 PDF Payload는 그대로 201.
- 새 필드는 값이 있을 때만 직렬화. 기존 PDF 저장 JSON·조회 응답 Shape·재전송 판정 해시(`payload_sha256`)가 다중 형식 변경 전과 같다(`49d2c72f…253b`, 2026-11-10 재확인).
- 관리자 응답의 `documentFormat`·`checksum`은 **추가 필드**다. 기존 필드는 바뀌지 않는다.

## 4. §39 review 근거 (M-4, 승인 후 구현)

요청(HWP·HWPX):

```json
{ "analysisId": "analysis_…", "decision": "CONFIRM",
  "sourceCheck": { "method": "LOCAL_FILE_EXTERNAL_VIEWER", "localFileSha256": "<64 hex>" },
  "reviewedSubjects": [{ "subjectId": "subj_14", "confirmedFields": [
    { "fieldPath": "performanceEvaluation.items[0].weightPercent", "value": 30,
      "documentLocator": {"kind": "HWP_TABLE_CELL", "section": 0, "path": "p3.c0.r5c3", "table": 1, "row": 5, "col": 3} },
    { "fieldPath": "writtenEvaluation.exams[0].maxScore", "value": null } ] }] }
```

| 규칙 | reason |
|---|---|
| Revision이 HWP·HWPX인데 `sourceCheck` 없음 | `sourceCheck: required` |
| `sourceCheck.localFileSha256` ≠ Revision `checksum` | `sourceCheck.localFileSha256: document_mismatch` |
| 값이 있는 필드에 `documentLocator` 없음 | `…documentLocator: evidence_required` |
| HWP·HWPX에 `pdfPageNumber` / PDF에 `documentLocator` | `not_allowed` |
| `documentLocator`가 **검토한 분석 Run에 있는 Locator가 아님**(kind·section·path·table·row·col 비교) | `…documentLocator: evidence_not_in_analysis` |
| kind·path 규칙(§2와 같음) | 같은 사유 |
| 슬롯 밖 과목(현행) / FAILED 분석(현행) / 허용 안 된 fieldPath(현행) | 현행 사유 |

- `localFileSha256`은 **관리자 브라우저가 계산해 보낸 값**이다. 서버는 그 파일을 받지 않는다. 따라서 이 값은 "관리자가 같은 파일을 열었다는 기록"이며 서버가 증명한 사실이 아니다.
- `method`: `BROWSER_PDF_VIEW`(PDF, 현행 화면) · `LOCAL_FILE_EXTERNAL_VIEWER`(HWP·HWPX, 한글 프로그램 등). 원문 대조 자체는 사람의 수동 확인이다.
- 응답 `confirmedFields[]`: 현행 `{subjectId, fieldPath, value, pdfPageNumber}` + HWP·HWPX일 때만 `documentLocator`. PDF 응답은 바뀌지 않는다.
- 학생 응답에는 근거 위치를 넣지 않는다(M-5).

## 5. 실험 기능 ON/OFF 정책

| 단계 | 정책 |
|---|---|
| 지금 | `assessment.multiformat.experimental=false`(기본). 로컬 테스트 프로세스에서만 켬 |
| M-1~M-3·M-6·M-7 승인 | 등록·수신을 정식 기능으로(Flag 제거 또는 기본 true) — PDF 동작 변화 없음 |
| M-4 + D-1 + 원문 검토 절차 승인 | HWP·HWPX review 활성화. 그 전까지 `review_not_supported` 유지 |

## 6. 테스트 (승인 후 추가)

PDF 현행 회귀 전체 + HWP·HWPX: `sourceCheck` 누락·불일치, 분석에 없는 Locator, 형식 교차 근거, 값 없는 필드(null)의 근거 생략 허용, 확정값 재조회 시 Locator 보존, Run·Revision 교차 거절, 부분 저장 없음, 학생 응답에 Locator 없음.
