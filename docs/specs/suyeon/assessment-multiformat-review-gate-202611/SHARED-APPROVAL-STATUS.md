# Shared 승인 상태 (2026-11-10)

## 확인 방법

- Repository 문서 검색: `docs/OWNERSHIP.md`, `docs/specs/suyeon/**`, `docs/api/api-contract.md`, `docs/adr/**`에 M-1~M-7, D-1, A안 승인 기록 없음
- 이 대화(2026-11-10~11, 2차 확인 포함): 사용자·공동 담당자(Wangyu)의 명시적 승인 없음. 작업 지시서는 "이 프롬프트 자체는 승인이 아니다"라고 명시
- `database/**`는 공동 소유(@suyeon @wangyu, `docs/OWNERSHIP.md`)다. 공동 담당자 확인 기록이 없다

## Gate 상태

| Gate | 승인 요청 대상 | 문서 | 실제 승인 | 공동 담당자 확인 |
|---|---|---|---|---|
| 1. Shared API 계약 | M-1~M-7, M-4 필드별 근거 검증, null 정책, M-8 제외, PDF 호환 | `API-CONTRACT-REVISED.md` | **없음** | 없음 |
| 2. D-1 Migration | 최종 SQL, JSON 매핑(A), NULL·CHECK, 기존 데이터 보존, 신규 Migration 파일 소유 | `MIGRATION-D1-REVISED.md`, `sql/D1-draft.sql` | **없음** | 없음 |
| 3. 원문 수동 검토 | A안 사용 범위, 관리자 확인 기록 방식, 운영 인증 전 제한, Flag OFF 유지 | `SOURCE-REVIEW-REVISED.md` | **없음** | 해당 없음(Assessment 정책, 사용자 승인 필요) |

## 승인된 변경 파일

없음. Shared 파일(`api-contract.md`, `database/**`, `common/**`, `frontend/shared/**`, 공용 E2E, `frontend/student/vite.config.ts`, `application.yml`)은 바꾸지 않았다.

## 승인받을 때 함께 결정할 것

1. `evidence_scope_unavailable` 신규 오류 사유 코드 추가 여부
2. PDF에 `analysisSubjectIndex` 등을 적용하지 않는 현행 유지(형식 간 차이 인정) 여부
3. 영역 반영비율(근거 노드에 구조 Locator 없음)을 HWP·HWPX에서 확정 불가로 두는 것
4. 운영 보호 장치(Mock 인증이면 HWP·HWPX 확정 거절) 도입 여부
5. fieldPath 색인 정규형(`[01]` 거절)을 계약에 넣을지, 넣는다면 **현행 PDF review에도 적용할지**(PDF 동작 변경이므로 PDF 회귀 재시험 필요). 이번에는 HWP·HWPX 준비 코드에만 적용했다
6. D-1 2차 보완(PDF 행 `analysis_subject_index IS NULL`)을 포함한 최종 SQL 승인
