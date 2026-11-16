# Shared 변경 요청 (승인 대기, 미적용)

## 1. `docs/api/api-contract.md`

| # | 변경 | 내용 |
|---|---|---|
| M-1 | §38 등록 | 허용 형식 PDF·HWP·HWPX, 형식은 바이트 판별, HWP·HWPX는 `pageCount` 없음. 거절 사유 목록(`FILE-FORMAT-SUPPORT.md` §2)을 415 `details.fields[file]`로 명시 |
| M-2 | §38 응답 | Revision `documentFormat`(`PDF`·`HWP`·`HWPX`), `pageCount` PDF만 |
| M-3 | 분석 결과 수신(C-10과 함께) | `source.format`, `Locator.documentLocator` Shape(`../assessment-multiformat-integration-draft.md` §3) |
| M-4 | §39 review | HWP·HWPX 근거 표현(아래 DB 변경과 함께), 그 전까지 `review_not_supported` |
| M-5 | §11 학생 분석 | 학생에게 HWP·HWPX 위치 근거를 보여줄지 |

## 2. DB Migration (`database/**`)

| # | 제안 | 이유 |
|---|---|---|
| D-1 | `assessment_plan_confirmed_value.evidence_locator_json VARCHAR(1000) NULL` | HWP·HWPX 확정값 근거 위치 저장. PDF는 기존 `pdf_page_number` 유지 |
| D-2 | (선택) `assessment_plan_revision.document_format VARCHAR(10)` + CHECK | 조회·통계용. 지금은 `content_type`으로 충분 — 필요 여부 결정 |

기존 Migration은 수정하지 않는다. 새 Migration 파일로만 추가한다.

## 3. 정책 결정

| # | 항목 |
|---|---|
| P-1 | HWP·HWPX 원문 위치 대조 수단(HWP 뷰어, 서버 원문 보관 + 위치 미리보기) — 확정 허용의 전제 |
| P-2 | 원본 Storage(API-OD-A03) — 보관하면 서버가 Locator·원문 대조 가능 |
| P-3 | HWP 배포용·구버전, HWPX 암호화 처리 |
| P-4 | 압축 해제 한도(100MB·2,000 항목) |
| P-5 | 실험 기능 운영 활성화 시점 |
| P-6 | 실제 학교 HWP·HWPX 로컬 DB 반입 승인 |

## 4. 계정 B 요청

`../assessment-multiformat-integration-draft.md` §8 (Adapter의 `documentLocator` 출력, `format`, `pageCount` 생략, 실제 합성 HWP 파일 생성 가능 여부).
