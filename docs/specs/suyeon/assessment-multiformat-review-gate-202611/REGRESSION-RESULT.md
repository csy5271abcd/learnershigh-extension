# 회귀 결과 (2026-11-11 00:00~00:10, 2차)

> 이번 2차 작업의 Main 코드 변경은 **API에 연결되지 않은** `ReviewEvidenceScope.java` 정규식 1줄뿐이다. 실행 경로(Controller·Service·Entity·Frontend)는 바뀌지 않았다. 그래서 Backend·Frontend 전체 검증과 D-1 격리 시험만 다시 실행했고, 브라우저·Adapter E2E는 다시 실행하지 않았다(아래 표에 "미실행"으로 표시).

## 1. 이번에 실행한 검증

| 검증 | 결과 | 기준선 | 조건 |
|---|---|---|---|
| `scripts/verify-backend.ps1` | **PASS** (exit 0) | PASS | 실험 Flag 기본값(OFF) |
| Backend 단위 | **261** / 실패 0 / 건너뜀 0 | 251 | 251(기존) + `ReviewEvidenceScopeTest` 10. Student Care 145 포함 |
| Backend 통합 | **129** / 실패 0 / 건너뜀 0 | 129 | Testcontainers MySQL |
| `ReviewEvidenceScopeTest` 단독 | **10/10** | 9 (1차) | 2차에 비정규 색인 거절 1개 추가 |
| `scripts/verify-frontend.ps1` | **PARTIAL PASS** — typecheck·lint·build 통과, Frontend 단위 테스트 미구성(원래 상태) | 같음 | Frontend 변경 없음 |
| D-1 진리표 `scripts/d1_truth_table.py` | **42/42** | 40/40 (1차) | 새 Schema `lh_assessment_d1_truth3` |
| D-1 기존 데이터 사본 `scripts/d1_existing_copy.py` | **14/14** | 14/14 (1차) | 새 사본 `lh_assessment_d1_copy2`(원본 `lh_assessment_rn_pdf` 읽기만), 현재 코드 Backend 18080 |

## 2. 이번에 다시 실행하지 않은 검증 (1차 결과 유지, 재확인 아님)

| 검증 | 마지막 결과 | 다시 실행하지 않은 이유 |
|---|---|---|
| HWP·HWPX Adapter E2E `adapter-e2e.mjs` | 83/83 (2026-11-10, `../assessment-multiformat-review-next/REGRESSION-RESULT.md`) | 실행 경로 변경 없음. 계정 B Adapter·브라우저·메모리(여유 약 470MB) 필요 |
| 확정 준비 점검표 `readiness-check.mjs` | 6/6 | Frontend 변경 없음 |
| PDF 브라우저 `final-browser-e2e.mjs` | 43/43 | 같음 |
| 기존 브라우저 회귀 | 33/33 | 같음 |
| PDF v21.1 HTTP `e2e_v211.py` | 33/33 | Backend 실행 경로 변경 없음 |
| 실험 OFF `flag-off-check.py` | 9/9 | 같음 |

1차 시연(11-12) 전에 위 6개를 한 번 다시 돌리는 것을 권장한다(`NEXT-STEPS.md` §1).

## 3. 보호 파일 (작업 시작 해시와 비교)

| 파일 | 결과 |
|---|---|
| `docs/api/api-contract.md` (`052128cf…`) | 같음 |
| `database/migrations/*.sql` 4개 (`61231497…`, `dd65c6ec…`, `565051a8…`, `8a65518b…`) | 같음, 새 Migration 파일 없음 |
| `EvaluationPlanService.java`, `PlanReview*`, `PlanReviewRequest`, `AnalysisImportRequest`, `AnalysisImportValidator` | 변경 없음 |
| Frontend 전체 | 변경 없음 |

`git status`에 보이는 그 밖의 `M`·`??` 파일은 세션 시작 전부터 있던 미커밋 변경이며 건드리지 않았다.

## 4. Student Care 영향

코드 변경 없음. 단위 145 통과, 통합 129 전체 통과(Student Care 포함).

## 5. 환경 메모

- 세션 시작 시 Docker 데몬이 꺼져 있었다. Docker Desktop을 실행하고 `learnershigh-mysql`(정상 종료 상태)을 `docker start`로만 다시 켰다. 컨테이너·Volume·기존 Schema는 삭제하지 않았다.
- 시험용 Backend(18080)는 시험 후 종료했다.
