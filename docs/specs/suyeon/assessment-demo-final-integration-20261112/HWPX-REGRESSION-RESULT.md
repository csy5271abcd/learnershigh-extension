# HWPX 평가계획서 업로드·분석 결과

> 분석기: 로컬 `curriculum-analysis` 서비스(127.0.0.1:8765, 이미 실행 중인 것 재사용), **v21.1 규칙 기반 구조 분석 · LLM 호출 없음(`llmCalls=false`)**. 결과는 모두 **자동 분석 후보 · 사람 검토 전(`DRAFT_UNREVIEWED`)**이다.
> 실제 학교 문서는 **저장하지 않는 분석 미리보기**로만 분석했다(공식 DB 반입 승인 없음). DB 등록·분석 후보 저장·Admin 검토 화면은 정답이 있는 **합성 문서**로 검증했다.

## 1. 실제 학교 HWPX 분석 미리보기

| ID | 학교 폴더 | 형식 | 크기 | SHA-256 | 쪽/구역 | 분석 상태 | 과목 구간(추출/전체) | 지필 | 수행 | HWP 인용 일치 |  |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1713cfeee9dd | daeshin | HWPX | 92KB | 1713cfeee9dd | 구역 1 | PARTIAL | 1/1 | 0 | 1 | 5/5 | 257 |
| 910bf210b141 | daeshin | HWPX | 85KB | 910bf210b141 | 구역 1 | OK_REVIEW_REQUIRED | 1/1 | 0 | 1 | 5/5 | 266 |

### 1713cfeee9dd · daeshin (PARTIAL)

경고: 세부 표 연결이 없어 상세정보를 추출하지 못한 수행평가 1개 / HWP/HWPX 결과는 계정 A 실험 DTO 모양(source.format·documentLocator) — Backend 실험 플래그가 켜진 경우에만 수신 가능, 공식 PDF 계약 아님

| 과목 | 수행평가 후보(비율·만점·시기) |
|---|---|
| 물리학Ⅱ | 1. 전류계와 전압계를 이용한 직류 회로 분석 및 키르히호프 법칙 검증 (—%·—·1. 전류계와 전압계를 이용한) |

### 910bf210b141 · daeshin (OK_REVIEW_REQUIRED)

경고: HWP/HWPX 결과는 계정 A 실험 DTO 모양(source.format·documentLocator) — Backend 실험 플래그가 켜진 경우에만 수신 가능, 공식 PDF 계약 아님

| 과목 | 수행평가 후보(비율·만점·시기) |
|---|---|
| 심리학 | 심리학을 적용한 주제탐구보고서 작성하기 (—%·—·중간 고사 후, 수업 시간에 ) |

정확도(사람이 원문과 대조한 범위): `DOCUMENT-EXTRACTION-ACCURACY.md`.

## 오류 케이스 (함께 실행)

| 파일 | HTTP | 상태 | 오류 |
|---|---|---|---|
| corrupt.pdf | 422 | PARSE_FAILED | PARSE_FAILED: RuntimeError: PdfLayout 실패(code 0):  |
| corrupt.hwp | 422 | REJECTED | CORRUPT_FILE: HWP(CFB) 머리 값이 올바르지 않음 |
| plain-zip.hwpx | 415 | UNSUPPORTED_FORMAT | UNSUPPORTED_FORMAT: 지원하지 않는 형식(지원 형식: PDF·HWP·HWPX — 확장자가 아니라 파일 내용으로 판별) |
| no-token.pdf | 401 | REJECTED | UNAUTHORIZED: X-Analysis-Token 헤더가 없거나 맞지 않음 |
