# Backend ↔ AI 분석기 계약 상태 (2026-11-10)

## 1. 실험 계약 일치

| 구분 | 상태 |
|---|---|
| 계정 B `multiformat_adapter.py`(`multiformat-adapter-0.1-draft`)의 `experimental-import.json` ↔ 계정 A 실험 DTO | **일치** — HWP·HWPX 원본 JSON을 수정 없이 보내 201 수신, 저장 JSON 구조 동일 |
| 계정 B 공식 Adapter(`backend-adapter-0.2`) ↔ 기존 PDF 계약 | **일치** — PDF v21.1 HTTP 33/33, 재전송 해시 변경 전과 같음 |
| 계정 B 제안 초안(`multiformat-draft.json`, `documentFormat`·`sectionRange`·`extensions`) | **보내지 않음**(협의용). 계정 A DTO에 없는 필드라 보내면 `unknown_field` |

## 2. 이번에 Backend에 넣은 것

| 변경 | 이유 | 범위 |
|---|---|---|
| `*_TABLE_CELL` 좌표 = path 마지막 `r행c열` 검사(`path_mismatch`) | 계정 B 제안. 잘못 붙은 좌표를 서버가 잡을 수 있는 유일한 구조 검사 | 실험 기능 켬일 때 HWP·HWPX만. PDF·기본 설정 영향 없음 |
| Admin 검토 화면에 수행 활동·제출물·조건(AI 후보) 표 | 관리자가 Adapter가 보낸 값을 볼 수 있게(값 그대로, 빈 값은 "추출되지 않음 · 확인 필요") | http 모드만. Mock 화면 영향 없음 |

## 3. 공식 계약 변경 필요 (승인 대기, 미적용)

`docs/api/api-contract.md`는 수정하지 않았다. 지난 변경안(`../assessment-multiformat-202611/SHARED-CHANGE-REQUEST.md` M-1~M-5)에 아래를 더한다.

| # | 항목 |
|---|---|
| M-6 | `documentLocator.path` 문법과 `path_mismatch` 규칙(마지막 칸 구간 기준) |
| M-7 | 실험 Payload의 필드 이름 확정(`source.format` 유지 권장 — 계정 B도 같은 의견) |
| M-8 | 계정 B 제안 `sectionCount`·`sourceRange`(과목 구간) 수용 여부 |

## 4. DB Migration 승인 대기

| # | 제안 | 상태 |
|---|---|---|
| D-1 | `assessment_plan_confirmed_value.evidence_locator_json VARCHAR(1000) NULL` | 미적용. HWP·HWPX 검토 확정의 전제 |
| D-2 | (선택) `assessment_plan_revision.document_format` | 미적용. `content_type`으로 충분한지 결정 필요 |

## 5. 계정 B 전달 정보

1. **두 Payload 모두 수정 없이 수신 성공**: HWP 201/200(재전송), HWPX 201/200, 서버 경고 없음, Run 각 1건, Review 0건, 저장 JSON = Payload `subjects`.
2. 실험 기능 꺼짐: 원본 HWP·HWPX 업로드 415(세부 사유 없음), HWP Payload를 PDF Revision에 → 400 `source.format`·`documentLocator` `unknown_field`(+`document_mismatch`, `source.pageCount: required`).
3. 형식 교차 전송: HWP Payload → HWPX Revision 400 `format_mismatch` + `document_mismatch` + kind `format_mismatch`(인계 예상과 같음).
4. 확정: 400 `revision.documentFormat: review_not_supported`(인계 예상과 같음).
5. `path_mismatch` 규칙은 계정 B 초안(`.r{row}c{col}` 포함)보다 엄격한 "마지막 칸 구간" 기준이다. 계정 B 실험 출력 568개 Locator에서 위반 0. 로컬 검증기(`validate_experimental`)에 같은 규칙을 넣으면 사전 검사가 맞춰진다.
6. 계정 A가 확인한 `AnalysisImportRequest.java`는 계정 B 대조 이후 바뀌지 않았다(이번 변경은 Validator만).
7. 합성 원본의 '마지막 저장자' 메타데이터: 계정 A는 원본을 저장소에 복사하지 않았다. 지속 Fixture가 필요하면 메타데이터 없는 합성본을 따로 만드는 방안을 요청한다(원본과 SHA가 달라지므로 별도 Fixture로 관리).
