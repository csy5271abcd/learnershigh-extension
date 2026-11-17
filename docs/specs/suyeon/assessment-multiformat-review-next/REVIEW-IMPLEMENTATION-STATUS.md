# HWP·HWPX 검토 구현 상태 (2026-11-10)

## 1. 결론

| 항목 | 상태 |
|---|---|
| HWP·HWPX 검토 확정 | **활성화하지 않음.** Backend `review_not_supported`, 화면 확정 버튼 비활성 유지 |
| 차단 사유 | ① D-1 Migration 미승인(근거 위치 저장 Column 없음) ② M-4 계약 미승인 ③ 원문 수동 확인 기록 절차 미승인 ④ 실제 관리자 인증 없음(Mock) |
| 이번 구현(Phase A) | Admin 읽기 전용 "확정 준비 상태" 점검표 |
| Backend 코드 | 변경 없음(주요 파일 해시 작업 시작과 같음) |

## 2. 구현한 것 — 확정 준비 상태 점검표

- 파일: `frontend/admin/src/features/assessment/components/MultiformatReviewReadiness.tsx`(신규), `PlanReviewConfirmPanel.tsx`(HWP·HWPX일 때만 렌더링).
- 10개 조건을 상태별로 보여준다: `충족` / `아직` / `승인 대기` / `서버 확인`.
  - 화면 상태로 판단: 원본 확보, SHA-256 일치, 과목 ID 입력, 항목 선택, 선택 값의 위치 근거, analysisId
  - 항상 `승인 대기`: 관리자 원문 대조, 명시적 확인 행동, 근거 위치 저장
  - `서버 확인`: 권한
- 확정을 켜지 않는다. 점검표가 모두 "충족"이 될 수 없게 되어 있다(승인 대기 3개는 고정).
- PDF 검토 화면과 Mock 화면에는 나타나지 않는다(형식별 경계 유지).

## 3. 브라우저 확인 (`scripts/readiness-check.mjs`, 6/6 PASS)

Schema `lh_assessment_rn_mf`(계정 B 합성 HWP·HWPX + 계정 B Adapter JSON을 `adapter-e2e.mjs`로 등록·수신한 뒤).

| 형식 | 확인 |
|---|---|
| HWP·HWPX | 처음: 원본·해시·과목·항목·위치 `아직`, 원문 대조·확인·근거 저장 `승인 대기`, analysisId `충족`, 권한 `서버 확인` |
| HWP·HWPX | 원본 선택(해시 일치)·과목 ID·항목 선택 뒤: 앞 5개 `충족`, 승인 대기 3개 그대로 |
| HWP·HWPX | 확인 체크·확정 버튼 비활성, 화면에서 PUT 없음 |

## 4. 승인 후 구현 범위 (준비 완료, 미착수)

`API-CONTRACT-PROPOSAL.md` §4와 `MIGRATION-D1-PROPOSAL.md` §6 순서로:

1. 새 Migration(D-1) 추가 → 빈 Schema·기존 데이터 Schema 모두 적용 검증
2. `PlanReviewRequest`에 `sourceCheck`·`documentLocator`, Entity·View 확장
3. `EvaluationPlanService.review`에 형식별 근거 검증 경계(PDF 경로는 그대로): SHA 기록 일치, 근거 Locator가 검토한 Run에 있는지, kind·path 규칙
4. 점검표의 승인 대기 3개를 실제 상태로 바꾸고 확인 체크 활성 조건 연결
5. 확정값 재조회·학생 공식 정보·수행평가 참조(현행 itemKey 무결성·지필 Key 차단 유지)
6. 합성 데이터 기반 검토 API 시험 + PDF 회귀 전체
