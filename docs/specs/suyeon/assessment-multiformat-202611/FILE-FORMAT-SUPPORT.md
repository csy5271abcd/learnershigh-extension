# 문서 형식 지원 (2026-11-10)

## 1. PDF 전용 가정 전수 조사

분류: ① 모든 형식 공통 ② PDF 전용 ③ HWP·HWPX 별도 규칙 필요 ④ 계약 변경 필요 ⑤ DB Migration 필요

| 위치 | 조건 | 분류 | 이번 처리 |
|---|---|---|---|
| `PdfInspector` | `%PDF-` 서명 + PDFBox 열기, 20MB, SHA-256 | ②(서명·쪽 수) ①(크기·SHA) | 그대로 두고 `DocumentFormatInspector`가 PDF는 위임, HWP·HWPX는 별도 검사 |
| `EvaluationPlanService.upload` | `content_type` 고정 `application/pdf` | ③ | 판별 형식의 MIME 저장 |
| `PlanRevision.pageCount` | PDF 물리 쪽 | ② | HWP·HWPX는 NULL |
| `AnalysisImportRequest.source.pageCount` `@NotNull` | ②④ | 선택 필드화, PDF 필수는 Validator |
| `Locator.pdfPageNumber` `@NotNull` | ②④ | 선택 필드화, PDF 필수는 Validator. HWP·HWPX는 금지 |
| `Subject.pageRange` | ② | HWP·HWPX 금지 |
| Validator 쪽 범위 검사 | ② | PDF만 |
| SHA-256 일치 | ① | 그대로 |
| 근거 없는 숫자 거절(`evidence_required`) | ① | 그대로(형식별 Locator 모두 근거로 인정) |
| Key 중복·자동 확정 거절·알 수 없는 필드·권한·부분 저장 없음 | ① | 그대로 |
| 원문 근거 검증(`extractedText` 대조) | ①(미구현) | 원본 미보관이라 모든 형식에서 없음 |
| `PlanReview` 확정값 `pdf_page_number` | ②⑤ | HWP·HWPX 검토 확정 차단 |
| 관리자 원본 대조(브라우저 SHA-256 + PDF 보기) | ②(보기) ①(해시) | HWP·HWPX는 해시만, 보기 없음 |
| Admin 업로드 `accept=pdf` | ③ | 개발 Flag에서만 `.hwp`·`.hwpx` 추가 |
| Admin 검토 표 "근거 PDF 쪽" | ③ | 형식별 열(위치 설명) |
| `AdminEvaluationPlanResponse` 형식 정보 없음 | ④ | `documentFormat` 추가(실험) |
| 학생 참조(`evaluationItemRef`) | ① | 확정된 Revision만 → HWP·HWPX는 확정 불가라 참조 불가 |

## 2. 형식 판별 규칙 (`DocumentFormatInspector`)

실험 기능 꺼짐: 기존 `PdfInspector`와 완전히 같다(PDF 아니면 415, 세부 사유 없음).

실험 기능 켬:

| 형식 | 판별 | 거절 사유 (`415 UNSUPPORTED_FILE_TYPE` + `details.fields[file]`) |
|---|---|---|
| PDF | `%PDF-` → 기존 검사(손상 422, 20MB 초과 413) | 기존과 같음 |
| HWP | OLE 서명(`D0 CF 11 E0 A1 B1 1A E1`) + "HWP Document File" 서명 + 버전 주 번호 5 | `not_hwp_document`(서명 없음) · `unsupported_version` · `encrypted`(암호 속성) · `distribution_document`(배포용) |
| HWPX | ZIP 서명 → 스트리밍으로 모든 항목 검사, `mimetype`=`application/hwp+zip`, `Contents/section*.xml` 존재 | `not_hwpx_package` · `unsafe_entry_path`(절대 경로·`..`·역슬래시·드라이브) · `too_many_entries`(2,000 초과) · `uncompressed_too_large`(압축 해제 100MB 초과) · `encrypted`(ZIP 암호 항목 또는 manifest `encryption-data`) · `corrupted` |
| 그 밖 | — | `not_supported_format`(빈 파일 포함) |

- 새 오류 코드는 없다. 기존 415·413·422와 필드 사유만 쓴다.
- HWPX의 XML은 해석하지 않는다(외부 엔터티 위험 없음). 항목 앞 512 byte만 표지 확인에 쓴다.
- HWP는 OLE 디렉터리를 끝까지 해석하지 않는다(**구조 서명 수준**). 서명이 있는 손상 HWP는 등록될 수 있다 → 분석기가 `PARSE_FAILED`로 알리는 단계에서 걸러진다.
- **등록 가능 ≠ 분석 가능.** 등록은 형식·안전 검사만이고, 분석 가능 여부는 분석기 결과(`status`, `failureReason`)로 따로 관리한다.

## 3. 확인된 동작 (테스트)

| 경우 | 결과 | 근거 |
|---|---|---|
| 합성 HWPX | HWPX, 쪽 수 null, SHA-256 일치 | 단위·통합·브라우저 |
| HWP 서명 합성 바이트 | HWP | 단위·통합 |
| PDF 바이트 `.hwp` 이름 / HWPX 바이트 `.pdf` 이름 | PDF / HWPX로 저장 | 통합 |
| 암호 HWP / 배포용 / 구버전 / 서명 없는 OLE | 거절(사유별) | 단위·통합·브라우저(암호) |
| ZIP 경로 이탈 / 압축 폭탄(101MB) / mimetype 없음·다름 / manifest 암호 표지 / 손상 ZIP | 거절 | 단위·통합 |
| 텍스트·빈 파일 | `not_supported_format` | 단위·통합 |
| 실험 기능 꺼짐 + HWPX | 415(세부 사유 없음, 기존과 같음) | 단위·통합·실서버 curl |
