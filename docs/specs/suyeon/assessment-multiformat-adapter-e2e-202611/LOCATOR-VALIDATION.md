# Locator 검증 (2026-11-10)

## 1. 계정 A·B 계약 일치

| 항목 | 계정 A 실험 DTO | 계정 B `experimental-import.json` | 일치 |
|---|---|---|---|
| 형식 | `source.format` | `source.format: HWP·HWPX` | 예 |
| 쪽 수 | HWP·HWPX 금지 | 없음 | 예 |
| 위치 | `Locator.documentLocator{kind, section, path, table, row, col, rowSpan, colSpan, control, cell}` | 이 중 `kind, section, path, table, row, col, rowSpan, colSpan` 사용 | 예 |
| 분석기 로컬 `id` | 받지 않음 | 보내지 않음 | 예 |
| `pdfPageNumber`·`printedPageLabel`·`pageRange` | HWP·HWPX 금지 | 없음 | 예 |

계정 B는 계정 A DTO의 record 13개와 자기 이식 Schema가 같은지 자동 대조한다(B 보고). 계정 A 쪽은 실제 서버 수신 201로 확인했다.

## 2. 형식별 검증 (Backend `AnalysisImportValidator`, 실험 기능 켬)

| 규칙 | 사유 | 실제 HTTP 확인 |
|---|---|---|
| `source.format` = Revision 형식 | `format_mismatch` | HWP·HWPX 모두 |
| HWP·HWPX의 `pdfPageNumber`·`pageCount`·`pageRange`·`printedPageLabel` | `not_allowed` | `printedPageLabel` 외 모두 |
| HWP·HWPX의 `documentLocator` 필수 | `required` | 통합 테스트 |
| kind 접두어 = 형식(`HWP_*`/`HWPX_*`, `CONTROL_TEXT`는 공통) | `documentLocator.kind: format_mismatch` | HWP·HWPX 교차 |
| `*_TABLE_CELL`의 row·col 필수 | `cell_position_required` | HWP·HWPX |
| `path` 문법 `[A-Za-z0-9.]+` | `format` | HWP·HWPX |
| **`*_TABLE_CELL`의 row·col = path의 마지막 `r<row>c<col>` 구간** (이번 추가) | `documentLocator.path: path_mismatch` | HWP·HWPX + 통합 테스트 |
| 공통: Key 중복·숫자 근거·알 수 없는 필드·자동 확정·SHA-256 | 기존 사유 | HWP·HWPX |

## 3. path·row·col 규칙의 근거

- 계정 B 초안 규칙(`.r{row}c{col}`이 path 어디든 있음)보다 엄격하게 **마지막 칸 구간**만 본다. 중첩 표는 안쪽 칸 좌표를 쓰기 때문이다.
  - 칸 안 문단: `…r2c3.p0` → 마지막 칸 구간 `r2c3`
  - 중첩 표: `…r1c1.p0.c0.r0c2` → 안쪽 칸 `r0c2`
- 적용 범위: `*_TABLE_CELL`만. 문단·`CONTROL_TEXT`(칸 위치 모름)에는 적용하지 않는다.
- 오탐 점검: 계정 B 실험 출력 전체 **568개 Locator**(합성 HWP·HWPX 60, 실제 개발 문서 결과 508 — 중첩 표 경로 244개 포함)에서 위반 **0**. 실제 문서 결과는 로컬에서 읽어 개수만 셌고 내용은 기록하지 않았다(DB 반입 없음).
- 통합 테스트: 좌표 변경·중첩 표에 바깥 좌표 → `path_mismatch`. 칸 안 문단 경로·중첩 표 안쪽 좌표 → 201.
- HWP와 HWPX는 같은 내용이어도 path가 다를 수 있다(계정 B `locator-divergence` 예시). 두 형식 사이에 같은 path를 강제하지 않는다.

## 4. 한계 (구조 검증 ≠ 원문 검증)

Backend는 원본을 보관하지도, 전체 해석하지도 않는다. 그래서 확인하는 것은 **Locator의 구조와 형식뿐**이다.

- 확인하지 못함: 그 section·path가 실제 문서에 있는지, `extractedText`가 그 위치 글인지, 표 번호(`table`)가 맞는지
- 원문 대조는 계정 B 분석기 검증(합성 41/41)과 사람의 확인에 의존한다
- 관리자 화면은 근거를 "분석기가 기록한 위치"로만 보여주며, HWP·HWPX 원문을 열람·대조할 수 있다고 표시하지 않는다
