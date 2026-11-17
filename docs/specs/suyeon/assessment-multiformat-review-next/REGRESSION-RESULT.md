# 회귀 결과 (2026-11-10)

| 검증 | 결과 | 기준선 | 조건·Schema |
|---|---|---|---|
| `scripts/verify-backend.ps1` | **PASS** | PASS | 메모리 확보를 위해 실행 동안만 로컬 개발 DB 컨테이너 중지(삭제 아님) 후 재시작 |
| Backend 단위 | **251** / 실패 0 / 건너뜀 0 | 251 | Student Care 145 포함 |
| Backend 통합 | **129** / 실패 0 / 건너뜀 0 | 129 | Student Care 77 포함 |
| `scripts/verify-frontend.ps1` | **PARTIAL PASS** — typecheck·lint·build 통과, Frontend 단위 테스트 미구성(원래 상태) | 같음 | — |
| 계정 B HWP·HWPX Adapter E2E `adapter-e2e.mjs` | **83/83** (HWP 42 · HWPX 41) | 83 | 실험 ON, `lh_assessment_rn_mf` |
| 확정 준비 상태 점검표 `readiness-check.mjs` | **6/6** (신규) | — | 같은 Schema |
| PDF 최종 흐름 `final-browser-e2e.mjs` | **43/43** | 43 | 실험 ON, `lh_assessment_rn_pdf` |
| 이전 흐름 회귀 `regression-browser-e2e.mjs` | **33/33** | 33 | 같은 Schema |
| 실험 OFF 격리 `flag-off-check.py` | **9/9** | 9 | `lh_assessment_rn_off` |
| PDF v21.1 HTTP `e2e_v211.py` | **33/33** | 33 | 실험 OFF, `lh_assessment_rn_v211` |
| 재전송 판정 해시 | `49d2c72ff7fa…253b` — 기준값과 같음 | 같음 | — |
| Mock 모드 | Student 배지·Mock 수정·`/api` 0건 / Admin 시연 표시·기존 검토 화면·`/api/admin` 0건 | 같음 | — |
| Production 번들 | 개발 Flag·Student 개발 Header 문자열 없음 | 같음 | — |

## Student Care 영향

코드 변경 없음. 단위 145·통합 77 통과.

## 보호 파일 (작업 시작 해시와 비교, 모두 같음)

`docs/api/api-contract.md` · `database/migrations/*.sql` 4개 · `AnalysisImportRequest.java` · `AnalysisImportValidator.java` · `EvaluationPlanService.java` · `PlanReview.java`. 새 Migration 파일 없음.

## 환경 메모

- PDF 브라우저 시험 전에 Student 개발 서버 첫 페이지를 미리 열었다(지난 작업의 첫 로드 시간 초과 예방).
- 여유 메모리가 적어(500MB~1.2GB) Backend 검증은 다른 서버를 내린 뒤 실행했다. 사용자의 다른 프로그램은 건드리지 않았다.
