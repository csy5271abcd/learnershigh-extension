# Phase B 구현 상태 (2026-11-10)

## 착수 여부: **착수하지 않음**

Gate 1~3 승인이 없다(`SHARED-APPROVAL-STATUS.md`).

| 항목 | 상태 |
|---|---|
| 적용한 Migration | 없음. `database/migrations/` 변경 없음, 운영·개발 DB 적용 없음(격리 시험 Schema에서만 SQL 시험) |
| 연결한 API | 없음. HWP·HWPX review는 `revision.documentFormat: review_not_supported` 유지 |
| DTO·Entity 변경 | 없음(`PlanReviewRequest`, `PlanReview`, `ConfirmedFieldView`, `PlanViews` 해시 작업 시작과 같음) |
| Admin UI | 변경 없음. 점검표 승인 대기 3개·확정 버튼 비활성 유지(브라우저 6/6) |
| Student 조회 | 변경 없음 |
| 사람 검토 | 0건 |

## Phase A-2에서 준비한 것 (Assessment 소유 영역)

| 파일 | 내용 | 연결 |
|---|---|---|
| `backend/.../assessment/service/plan/ReviewEvidenceScope.java` (신규) | fieldPath → 근거 노드·허용 Locator 판정(M-4 §3-2) | **API에 연결하지 않음** |
| `backend/src/test/.../service/plan/ReviewEvidenceScopeTest.java` (신규) | 10개(2차에 색인 정규형 1개 추가): 같은 항목 허용, 다른 항목·채점 요소·영역·과목·Run 근거 거절, 병합 정보 차이, 지필 시험, 없는 과목·속성·색인, 분석 밖 영역, 구조 근거 없는 노드, `[01]` 같은 비정규 색인 | 단위 테스트 10/10 |
| `sql/D1-draft.sql`, `scripts/d1_truth_table.py`, `scripts/d1_existing_copy.py`, `scripts/D1JsonMappingProbeTest.java.txt` | D-1 시험 자료 | 격리 Schema 전용 |

## 승인 후 순서

1. D-1 Migration 파일 + Migration 통합 테스트(진리표를 JUnit으로)
2. `PlanReviewRequest`(`sourceCheck`, `analysisSubjectIndex`, `documentLocator`, `absence`), Entity, View
3. `EvaluationPlanService.review`: 형식별 분기. PDF 경로는 그대로 두고 HWP·HWPX만 `ReviewEvidenceScope` 사용
4. Admin: 근거 선택, 수동 확인 체크, 미리보기, 확정, 재조회
5. Student: 확정값만(현행 itemKey 무결성·지필 Key 차단 유지)
6. 합성 HWP·HWPX: 원본 → 계정 B Adapter → Backend → 후보 → 합성 수동 검토 API 시험 → 확정 → Student 조회
