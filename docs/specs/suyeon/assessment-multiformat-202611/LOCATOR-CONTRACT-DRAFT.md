# 원문 Locator 계약 초안 요약 (2026-11-10)

전체 변경안: `../assessment-multiformat-integration-draft.md`. 상태: **계약 설계 완료(검토용) · 실험 구현됨 · 공식 계약 아님 · 계정 B 미협의.**

## 1. 공통 원문 근거가 표현하는 것

| 요구 | 표현 |
|---|---|
| 원본 SHA-256 | `source.sha256` (모든 형식) |
| 원본 형식 | `source.format` (`PDF` 기본 / `HWP` / `HWPX`) |
| 문서 내 위치 | PDF `pdfPageNumber` · HWP·HWPX `documentLocator` |
| 근거 원문 | `extractedText` (모든 형식, 2,000자) |
| 위치 유형 | `documentLocator.kind` |
| 검증 가능한 범위 | PDF: 쪽 수·쪽 범위 검사 / HWP·HWPX: 형식·구조 필드 검사만(원본 미보관) |
| 위치 미확정 | `CONTROL_TEXT` + `cell: "UNAVAILABLE"`, 또는 근거를 빼고 `warnings`. 가짜 쪽 번호 금지 |
| 분석 실패 | 기존 `status: FAILED` + `failureReason` |

## 2. `documentLocator` 필드 (계정 B DocumentModel 그대로)

| 필드 | 형식 | 필수 | 출처 |
|---|---|---|---|
| `kind` | `HWP_PARAGRAPH` · `HWP_TABLE_CELL` · `HWPX_PARAGRAPH` · `HWPX_TABLE_CELL` · `CONTROL_TEXT` | 예 | `docmodel/model.py loc_id` |
| `section` | int ≥ 0 | 예 | 구역 번호 |
| `path` | `[A-Za-z0-9.]+`, 200자 | 예 | `p3.c0.r5c4` 등 구조 경로 |
| `table`·`row`·`col` | int ≥ 0 | `*_TABLE_CELL`이면 row·col 필수 | 칸 문맥 |
| `rowSpan`·`colSpan` | int ≥ 1 | 아니오 | 병합 |
| `control` | 50자 | 아니오 | `CONTROL_TEXT` 종류 |
| `cell` | `UNAVAILABLE` | 아니오 | 칸 위치 모름 |

받지 않는 것: `id`(분석기 로컬 파일 ID가 들어 있음), PDF 좌표, 인쇄 쪽.

## 3. 실제로 확인한 것

- 계정 B v21.1 HWPX 파서가 합성 HWPX에서 낸 locator는 위 필드와 같았다(예: `HWPX_TABLE_CELL, section 0, path p3.c0.r5c4, table 1, row 5, col 4, rowSpan 1, colSpan 1`).
- HWP 파서(`hwp_model.py`)도 칸 문맥으로 같은 필드(`table, row, col, rowSpan, colSpan`)를 쓴다(코드 확인, 실제 HWP 실행 없음).

## 4. 계정 B와 확인할 것

1. 필드 이름(`documentLocator`·`format`) 수용 여부
2. `path` 문법의 안정성(재분석·개정본 사이)
3. 위치 미확정 표현(`cell: UNAVAILABLE` vs 근거 제외)
4. 채점 요소별 칸 Locator 제공 가능 여부
5. HWP 실제 합성 파일 생성 가능 여부(현재 계정 A·B 모두 없음)
