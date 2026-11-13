# Backend 구현 (2026-11-10)

상태: **구현 완료 · 실험 기능(기본 off) · 운영 적용 불가**

## 1. 실험 기능 스위치

- 키: `assessment.multiformat.experimental` (코드 기본 `false`). `application.yml`에 키를 추가하지 않았다. 환경 변수 `ASSESSMENT_MULTIFORMAT_EXPERIMENTAL=true`로 켠다.
- 분석 결과 수신은 기존 `assessment.analysis-import.enabled`도 켜져 있어야 한다.
- 꺼져 있으면:
  - 등록: PDF가 아니면 415(기존과 같음)
  - 수신: `source.format`·`documentLocator`를 보내면 `unknown_field`(기존과 같은 결과)
  - 그 밖의 PDF 동작·저장 JSON·재전송 해시: 변경 전과 같음

## 2. 등록

- `DocumentFormatInspector.inspect(bytes)` → `Inspection(format, sha256, pageCount, sizeBytes)`. PDF는 기존 `PdfInspector`에 위임.
- 저장: 기존 `assessment_plan_revision`에 `content_type` = 실제 MIME(`application/pdf`, `application/x-hwp`, `application/hwp+zip`), `page_count` = PDF만, `file_ref` NULL(원본 미보관 유지).
- 기존 평가계획서·Revision 구조를 그대로 쓴다(HWP 전용 Entity 없음). 같은 문서에 다른 형식 개정본을 올리는 것은 막지 않는다(학교가 형식을 바꿀 수 있음).
- `PlanRevision.format()`: `content_type` → `PlanDocumentFormat`. 모르는 값은 예외(데이터 혼합 방지).
- 관리자 응답 Revision에 `documentFormat` 추가.

## 3. 분석 결과 수신

- DTO: `source.format`(선택), `source.pageCount`(선택), `Locator.pdfPageNumber`(선택), `Locator.documentLocator`(선택). 새 필드는 `@JsonInclude(NON_NULL)`.
- 기존 PDF 코드 호환용 생성자: `SourceDocument(sha256, pageCount)`, `Locator(pdfPageNumber, printedPageLabel, extractedText)`.
- Validator: `validate(request, revision, multiformat)`. 규칙은 `../assessment-multiformat-integration-draft.md` §4.
- 저장: 후보는 기존처럼 `result_json`. 상태 `REVIEW_REQUIRED`, Revision은 `UNREVIEWED`, Review 자동 생성 없음.

## 4. 검토

- `PUT .../review`: Revision 형식이 PDF가 아니면 400 `VALIDATION_ERROR` `revision.documentFormat: review_not_supported`. 다른 검사보다 먼저 거절하고 아무것도 저장하지 않는다.
- 이유: 확정값 근거 Column이 `pdf_page_number`뿐이라 HWP·HWPX 근거를 저장할 곳이 없다(Migration 필요). 사람이 원문 위치를 대조했다는 기록 방법도 없다.

## 5. 테스트

| 테스트 | 건수 | 내용 |
|---|---|---|
| `DocumentFormatInspectorTest` (단위) | 5 | HWPX·HWP 서명 판별, 실험 꺼짐 동작, HWP 암호·배포용·구버전·서명 없음, HWPX 경로 이탈·손상·mimetype·암호·압축 폭탄, 텍스트·빈 파일·PDF 손상 |
| `MultiformatExperimentalApiTest` (통합, 실험 켬) | 4 | HWPX 등록·수신·재전송·조회·학생 비노출·참조 불가·검토 차단 / Locator 규칙 12종 거절·저장 없음 / PDF↔HWPX 혼합 거절 + PDF 저장 JSON 동일성 / 확장자 위장·잘못된 파일 5종 |
| `MultiformatDisabledApiTest` (통합, 실험 끔) | 1 | HWPX 415, `format`·`documentLocator` `unknown_field`, PDF 수신 정상·저장 JSON 동일 |
