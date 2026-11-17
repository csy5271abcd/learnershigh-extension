# HWP·HWPX 공식 검토 게이트 — 결과 보고 (2026-11-10~11)

## 1. 요약

| 항목 | 상태 |
|---|---|
| Phase A-2 (설계 보완) | **완료** — 계약·D-1·A안 보완, 격리 DB 시험 |
| Gate 1 Shared API 계약 | **승인 없음** |
| Gate 2 D-1 Migration | **승인 없음** |
| Gate 3 원문 수동 검토 A안 | **승인 없음** |
| Phase B (실제 구현) | **착수하지 않음** |
| HWP·HWPX 확정 | 차단 유지(`review_not_supported`, Admin 확정 버튼 비활성, 사람 검토 0건) |
| 기존 PDF 기준선 | 보호(실행 경로 변경 없음, Backend 단위 261·통합 129 PASS) |
| Commit·Push·Merge | 하지 않음 |

이 작업 지시서는 승인 기록이 아니므로 Shared 파일과 실제 DB는 바꾸지 않았다.

## 2. 이번 작업의 두 단계

이 폴더는 같은 날 두 번에 걸쳐 작성됐다.

- **1차(2026-11-10 23:12 이전):** 계약 보완안·D-1 보완안·A안 보완·승인 상태·Phase B 상태 문서, SQL 초안, 시험 스크립트, `ReviewEvidenceScope` 준비 코드(테스트 9개).
- **2차(2026-11-10 23:30 ~ 11-11 00:10, 이 보고):** 1차 산출물을 실제 코드·DB와 다시 대조해 허점 2개를 고치고, 격리 시험과 회귀를 다시 돌리고, 남은 보고서 3개(`REPORT.md`, `REGRESSION-RESULT.md`, `NEXT-STEPS.md`)를 썼다.

## 3. 2차에서 찾아 고친 문제

| # | 문제 | 실패 시나리오 | 조치 | 검증 |
|---|---|---|---|---|
| 1 | fieldPath 색인 선행 0 허용 | `items[01].weightPercent`와 `items[1].weightPercent`가 같은 노드로 풀린다 → 문자열 기준 `duplicate` 검사를 우회해 한 필드에 확정값 2개 저장 가능 | `ReviewEvidenceScope` 색인 문법을 `0\|[1-9]\d{0,2}`로 제한. 계약안 §3-4에 `unknown` 사유 추가 제안 | 단위 테스트 `nonCanonicalIndexIsRejected` |
| 2 | D-1 PDF 분기가 분석 과목 번호를 막지 않음 | PDF 확정값에 `analysis_subject_index=0` INSERT·UPDATE가 통과 → 계약안의 PDF `not_allowed`와 불일치 | `ck_assessment_plan_confirmed_evidence_shape` PDF 분기에 `analysis_subject_index IS NULL` 추가 | 진리표 INSERT·UPDATE 2건 추가, 42/42 |

같은 허점(1)이 현행 PDF `FIELD_PATH`에도 있으나 PDF 동작을 바꾸면 시연 기준선이 흔들리므로 **고치지 않고 결정 항목으로 올렸다**(`SHARED-APPROVAL-STATUS.md` 항목 5).

## 4. 성공 기준 대비 (승인 전 완료 기준)

| # | 기준 | 상태 | 문서 |
|---|---|---|---|
| 1 | M-4 필드별 근거 무결성 해결안 | 완료 — Revision→Run→분석 과목(`analysisSubjectIndex`)→근거 노드→Locator 전체 일치. 같은 항목 안 필드 단위 구분은 분석 JSON 한계로 불가함을 기록(검증 완화 없음) | `API-CONTRACT-REVISED.md` §2~3 |
| 2 | null 확정값 정책 | 완료 — 5가지 상황 구분, `NOT_IN_SOURCE`만 확정 가능, 새 상태 Column 불필요 | 같은 문서 §4 |
| 3 | D-1 CHECK NULL 문제 | 완료 — 형식 NOT NULL + `IS [NOT] NULL` 비교, MySQL 실측 42/42 | `MIGRATION-D1-REVISED.md` §1~2 |
| 4 | sourceCheck 쌍 검증 | 완료 — 쌍·method 허용값·소문자 hex 64, "SHA만 있는 행" 결함을 실측으로 발견·수정 | 같은 문서 §2 |
| 5 | JSON Column 저장 방식 | 완료 — Hibernate 7 실측 3방식, 이중 인코딩 없음, A 방식 권장 | 같은 문서 §4 |
| 6 | A안 관리자 확인 절차 | 완료 — 12단계, SHA 비교·Locator 검증·관리자 선언·운영 감사 4가지 구분 | `SOURCE-REVIEW-REVISED.md` |
| 7 | Shared 승인 요청 문서 | 완료 — Gate별 대상·결정 항목 6개 | `SHARED-APPROVAL-STATUS.md` |
| 8 | 기존 PDF 회귀 | Backend 단위·통합 PASS. **브라우저·HTTP E2E는 2차에서 재실행하지 않음**(실행 경로 변경 없음) | `REGRESSION-RESULT.md` |
| 9 | HWP·HWPX 확정 차단 유지 | 유지 | `PHASE-B-IMPLEMENTATION.md` |

## 5. 변경 파일 (이 작업 전체)

| 파일 | 소유 | 내용 |
|---|---|---|
| `backend/src/main/java/.../assessment/service/plan/ReviewEvidenceScope.java` (신규, 미추적) | Assessment | M-4 근거 범위 판정 준비 코드. **API 미연결** |
| `backend/src/test/java/.../assessment/service/plan/ReviewEvidenceScopeTest.java` (신규, 미추적) | Assessment | 단위 테스트 10개 |
| `docs/specs/suyeon/assessment-multiformat-review-gate-202611/**` (신규) | Assessment | 보고서 8개, `sql/D1-draft.sql`, `scripts/` 3개 |

API / DB 변경: **없음**. `docs/api/api-contract.md`, `database/migrations/**`, `application.yml`, Frontend 변경 없음.
로컬 Docker에 시험 Schema 5개(합성 데이터)를 새로 만들었고 삭제하지 않았다(`MIGRATION-D1-REVISED.md` §8).

## 6. 다른 Surface·담당자 영향

- Wangyu Student Care: 코드·Migration·Fixture 변경 없음, 테스트 통과.
- Student·Admin 화면: 변경 없음.
- 계정 B(AI 분석기): 코드 수정 없음. 필드별 근거 참조는 협의 항목으로만 기록(`NEXT-STEPS.md` §4).

## 7. 남은 Blocker / Open Decision

1. Gate 1~3 승인(사용자 + `database/**` 공동 소유자 Wangyu 확인)
2. `SHARED-APPROVAL-STATUS.md`의 결정 항목 6개
3. 기존 미결 정책 3가지(재검토 대체·이전 확정 공개·itemKey 변경) — 이번에 바꾸지 않음
4. 실제 관리자 인증 전에는 운영 확정 불가
5. 시연 전 브라우저·E2E 재실행 권장
