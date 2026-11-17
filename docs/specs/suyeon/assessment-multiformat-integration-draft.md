# Assessment 다중 형식(PDF·HWP·HWPX) 연동 변경안 — 검토용 초안 (2026-11-10)

> **공유 API 계약이 아니다.** 계정 A가 작성한 검토용 변경안이며 `docs/api/api-contract.md`에는 반영하지 않았다. 필드 이름은 계정 B DocumentModel의 실제 Locator 필드를 그대로 따랐고, 계정 B와 협의 전이다.
> Backend에는 이 초안을 **실험 기능**(`assessment.multiformat.experimental`, 기본 false)으로만 구현했다.

## 1. 현재 PDF 요청·응답 (변경 없음)

- 등록: `POST /api/admin/assessment/evaluation-plans` (multipart `file`, `schoolId`, `academicYear`, `grade`, `semester`, `sourceUrl?`). 서버는 SHA-256·쪽 수·크기를 저장하고 원본은 보관하지 않는다.
- 수신(PROPOSED, 기본 off): `POST .../revisions/{revisionId}/analysis-imports`

```json
{ "analyzer": {"name": "curriculum-analysis", "version": "v21.1/backend-adapter-0.2"},
  "source": {"sha256": "<64 hex>", "pageCount": 2},
  "status": "REVIEW_REQUIRED",
  "subjects": [{ "subjectName": "...", "pageRange": {"from": 1, "to": 2},
                 "performanceEvaluation": {"items": [{"itemKey": "P01", "sources": [{"pdfPageNumber": 1, "printedPageLabel": "1", "extractedText": "..."}]}]} }],
  "warnings": [] }
```

- 검토: `PUT .../review` — `confirmedFields[].pdfPageNumber`가 근거.

## 2. HWP·HWPX에 필요한 정보

| 정보 | PDF | HWP | HWPX |
|---|---|---|---|
| 형식 판별 | `%PDF-` + PDFBox 열기 | OLE 서명 + FileHeader "HWP Document File"·5.x·암호/배포용 속성 | ZIP + `mimetype=application/hwp+zip` + `Contents/section*.xml` |
| 원본 SHA-256 | 있음 | 있음 | 있음 |
| 쪽 수 | 물리 쪽 | **없음**(조판 없이 알 수 없음) | **없음** |
| 근거 위치 | 물리 쪽(1부터) | 구역·문단·표·칸 경로 | 구역·문단·표·칸 경로 |

## 3. Locator 후보 (계정 B DocumentModel 기준)

계정 B `docmodel/model.py`·`hwp_model.py`·`hwpx_model.py`의 locator 객체:

```text
kind: HWP_PARAGRAPH | HWP_TABLE_CELL | HWPX_PARAGRAPH | HWPX_TABLE_CELL | CONTROL_TEXT
id:   "<파일ID>#s{section}.{path}"        (분석기 로컬 파일 ID 포함 → Backend로 보내지 않음)
section: int(0부터)   path: "p3.c0.r5c4" 같은 구조 경로
표 칸이면 table, row, col(0부터), rowSpan, colSpan
CONTROL_TEXT면 control(예: caption), cell: "UNAVAILABLE"(칸 위치를 알 수 없음)
```

초안 Shape (기존 Locator에 선택 필드 하나 추가):

```json
{ "extractedText": "25%",
  "documentLocator": { "kind": "HWPX_TABLE_CELL", "section": 0, "path": "p3.c0.r5c4",
                        "table": 1, "row": 5, "col": 4, "rowSpan": 1, "colSpan": 1 } }
```

- PDF Locator는 지금 Shape 그대로(`pdfPageNumber` 필수, `documentLocator` 금지).
- HWP와 HWPX는 같은 필드를 쓰지만 `kind` 접두어로 구분한다(HWP 문서에 HWPX_* kind는 거절).
- `source.format`: `PDF`(생략 시 기본) / `HWP` / `HWPX`. HWP·HWPX는 `pageCount`·`pageRange`·`pdfPageNumber`·`printedPageLabel`을 보내지 않는다(가짜 쪽 번호 금지).
- 위치가 정해지지 않은 근거: `CONTROL_TEXT` + `cell: "UNAVAILABLE"`로 표현하거나, 근거를 빼고 `warnings`에 사유를 남긴다. 근거 없는 숫자는 기존처럼 `evidence_required`로 거절된다.

## 4. Validator 변경 (실험 기능 켬일 때)

| 규칙 | 사유 |
|---|---|
| `source.format` ≠ 등록 Revision 형식 | `source.format: format_mismatch` |
| PDF: `pageCount` 없음 / `pdfPageNumber` 없음 / `documentLocator` 있음 | `required` / `required` / `not_allowed` |
| HWP·HWPX: `pageCount`·`pageRange`·`pdfPageNumber`·`printedPageLabel` 있음 | `not_allowed` |
| HWP·HWPX: `documentLocator` 없음 | `required` |
| `kind` 접두어가 형식과 다름 | `documentLocator.kind: format_mismatch` |
| `*_TABLE_CELL`인데 row·col 없음 | `documentLocator: cell_position_required` |
| `documentLocator.id` 등 모르는 필드 | `unknown_field` (엄격 Parser) |
| 실험 기능 꺼짐 + `format`·`documentLocator` 사용 | `unknown_field` (기존과 같은 결과) |

공통 규칙(SHA-256, Key 중복, 근거 없는 숫자, 자동 확정 금지, 알 수 없는 필드, 권한, 부분 저장 없음)은 형식과 관계없이 그대로다.

한계: 원본을 보관하지 않으므로 서버는 `section`·`path`가 실제 문서에 있는지, `extractedText`가 그 위치 글인지 대조하지 못한다(PDF의 쪽 범위 검사에 해당하는 검사가 HWP·HWPX에는 없음).

## 5. Review 근거 위치

- 현재 `assessment_plan_confirmed_value`의 근거 Column은 `pdf_page_number INT`뿐이다.
- HWP·HWPX 확정값의 근거(구역·경로·표 칸)를 저장하려면 **Migration이 필요**하다. 제안: `evidence_locator_json VARCHAR(1000) NULL` 추가(형식별 Locator JSON). 또는 confirmedFields에 `documentLocator`를 받고 같은 Column에 저장.
- 승인 전까지 Backend는 HWP·HWPX Revision의 검토 확정을 **형식 단위로 거절**한다(`revision.documentFormat: review_not_supported`). 화면도 확정 버튼을 비활성으로 둔다.
- 추가로 필요한 것: 관리자가 원문 위치를 믿을 수 있게 대조할 수단(HWP 뷰어 또는 서버 원문 보관 + 위치 미리보기). 파일 해시 일치만으로 사람이 원문을 확인했다고 보지 않는다.

## 6. DB 변경 필요 여부

| 항목 | 필요 | 이번 처리 |
|---|---|---|
| Revision 형식 | 아니오 | 기존 `content_type`에 실제 MIME(`application/x-hwp`, `application/hwp+zip`) |
| 쪽 수 없음 | 아니오 | `page_count` NULL 허용(기존 Schema) |
| 분석 후보의 Locator | 아니오 | `result_json`(LONGTEXT)에 그대로 |
| 확정값 근거 위치 | **예** | 미적용(승인 대기), 검토 확정 차단 |
| 형식 Column(조회·통계용) | 선택 | 미적용. `content_type`으로 충분한지 결정 필요 |

## 7. 기존 PDF 데이터 호환

- 형식 생략 = PDF. 기존 PDF 요청은 그대로 통과한다(통합 테스트·v21.1 HTTP 33건).
- 새 필드는 값이 있을 때만 직렬화(`@JsonInclude(NON_NULL)`)한다. 그래서 PDF 결과의 저장 JSON과 재전송 판정 해시(`payload_sha256`)가 변경 전과 같다. 실제로 변경 전 서버와 새 서버의 해시를 비교해 같음을 확인했다(`49d2c72f…`).
- 기존 행의 `content_type`은 모두 `application/pdf` → 형식 PDF.

## 8. 계정 B Adapter 변경 요구

1. HWP·HWPX이면 `source.format`을 보내고 `pageCount`는 보내지 않는다.
2. `locator()`가 쪽이 없는 Locator id에 대해 `None`을 돌려주는 대신, DocumentModel locator 객체에서 `kind, section, path, table, row, col, rowSpan, colSpan, control, cell`만 골라 `documentLocator`로 보낸다(`id`는 보내지 않음). `extractedText`는 그 칸·문단 글.
3. `pageRange`는 보내지 않는다.
4. `FORMAT_NOT_ACCEPTED` 차단은 Backend 실험 기능이 켜진 환경에서만 풀 수 있게 옵션으로 둔다(기본 차단 유지 권장).
5. 채점 요소별 근거 칸이 있으면 그 칸 Locator를 `rubric[].sources`에 넣는다(지금 PDF와 같은 규칙).
6. 참고 구현: 계정 A 임시 변환기 `assessment-multiformat-202611/scripts/draft_hwpx_payload.py`(shapePreview + DocumentModel locator로 채움).

## 9. 미확정 정책

- `source.format`·`documentLocator`·`kind` 값의 공식 이름과 Enum
- HWP·HWPX 확정값 근거 저장 구조(Migration)와 원문 위치 대조 수단
- HWP 배포용 문서·구버전(3.x) 처리(현재 거절)
- HWPX 암호화 판별 기준(현재 `META-INF/manifest.xml`의 `encryption-data` 표지 또는 ZIP 암호 항목)
- 압축 해제 한도(현재 100MB·항목 2,000개)
- 원본 Storage(API-OD-A03)
- 학생에게 HWP·HWPX 근거 위치를 보여줄지

## 10. 통합 테스트 절차

1. 합성 HWPX 생성: `python -I make_synthetic_hwpx.py out.hwpx`
2. 계정 B 분석(무수정, 출력은 계정 A 폴더): `run_v21.py <B> out.hwpx <work> <out> SYNHWPX01` → `PARTIAL`, W01·P01·P02, Adapter는 `FORMAT_NOT_ACCEPTED`
3. 초안 JSON: `draft_hwpx_payload.py <B> out.hwpx <work> draft.json` (계정 B Adapter 변경 후에는 B 출력으로 교체)
4. Backend: `ASSESSMENT_ANALYSIS_IMPORT_ENABLED=true ASSESSMENT_MULTIFORMAT_EXPERIMENTAL=true ./gradlew bootRun --args='--server.port=18080'` (로컬 E2E Schema)
5. Admin: `VITE_ASSESSMENT_DEV_MULTIFORMAT=true` + 기존 http 개발 설정
6. `hwpx-browser-e2e.mjs` 실행
