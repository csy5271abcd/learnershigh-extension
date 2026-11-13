# HWP·HWPX 공식 계약·검토 확정 준비 보고 (2026-11-10)

## 1. 한눈에

| 항목 | 상태 |
|---|---|
| 공식 계약 변경안(M-1~M-8) | **작성 완료(승인 대기)**. `api-contract.md` 미수정 |
| D-1 Migration 변경안 | **작성 완료(승인 대기)**. SQL 초안·타입 근거(실측)·영향·롤백. `database/**` 미수정, 새 Migration 파일 없음 |
| 원본 대조 방식 | **설계 완료**. 단기 A안(관리자 수동 확인 기록), 장기 B안(Storage) 권장 |
| HWP·HWPX 검토 확정 | **활성화하지 않음** — `review_not_supported` 유지 |
| Phase A 구현 | Admin 읽기 전용 "확정 준비 상태" 점검표(10개 조건, 브라우저 6/6) |
| 회귀 | 모두 기준선 유지(`REGRESSION-RESULT.md`) |
| Phase B | 승인이 없어 **착수하지 않음** |

이 대화에는 Shared 계약·DB Migration·원문 검토 절차에 대한 승인이 없다. 작업 요청 자체를 승인으로 보지 않았다.

## 2. 핵심 결정·근거

| 결정 | 근거 |
|---|---|
| 필드 이름은 검증된 `source.format`·`documentLocator` 유지 | 계정 A·B 실제 E2E 83/83, 이름을 바꾸면 양쪽 동시 수정 필요 |
| M-8(`sectionCount`·`sourceRange`)은 보류 | 서버가 원본을 보관하지 않아 대조할 수 없음 |
| D-1은 `VARCHAR(1000)` 대신 MySQL `JSON`(+ 앱 상한 2KB) | 실측: Locator만 최대 184B, 원문 인용 포함 765B, 계약상 인용 최대 2,000자 → 1000이 부족할 수 있음. JSON은 DB가 유효성 보장 |
| HWP·HWPX는 `pdf_page_number` NULL을 CHECK로 강제 | 가짜 쪽 번호 금지 |
| 근거 Locator는 검토한 분석 Run에 있는 것만(`evidence_not_in_analysis`) | 파서 버전·원본 SHA와 묶인 위치만 의미가 있음 |
| `localFileSha256`은 "관리자 확인 기록"으로만 | 브라우저 계산값이라 서버 증명이 아님 |
| 점검표의 원문 대조·확인·근거 저장은 항상 "승인 대기" | 자동 체크·자동 확정 금지 |

## 3. 변경 파일

| 구분 | 파일 |
|---|---|
| Admin (신규) | `frontend/admin/src/features/assessment/components/MultiformatReviewReadiness.tsx` |
| Admin (수정) | `frontend/admin/src/features/assessment/components/PlanReviewConfirmPanel.tsx`(HWP·HWPX일 때 점검표 렌더링) |
| 문서 | 이 폴더 보고서 7종, `scripts/readiness-check.mjs` |
| 진행 기록 | `docs/specs/suyeon/progress.md` |

Backend·DB·계약·Student·Student Care·공용 E2E·계정 B 폴더: 변경 없음(보호 파일 해시 확인).

## 4. 보고서

`API-CONTRACT-PROPOSAL.md` · `MIGRATION-D1-PROPOSAL.md` · `SOURCE-REVIEW-DESIGN.md` · `REVIEW-IMPLEMENTATION-STATUS.md` · `REGRESSION-RESULT.md` · `NEXT-STEPS.md`
