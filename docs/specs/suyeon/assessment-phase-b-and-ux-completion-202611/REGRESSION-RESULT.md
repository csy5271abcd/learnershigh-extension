# 회귀 결과 (실제 실행분만, 2026-11-12 새벽)

| 시험 | 결과 | 기준선 | 환경·비고 |
|---|---|---|---|
| Backend 단위(ArchUnit 포함) | **261 / 실패 0** | 261 | Student Care 145 포함 |
| Backend 통합(Testcontainers, 빈 Schema + 전체 Migration 8개) | **144 / 실패 0** | 136 | +8: HWP·HWPX 검토 3, UX(학생 화면 보기·미리보기/비교·휴지통 2종) 4, PDF 중복·색인 1. Student Care 72 포함 |
| Frontend typecheck·lint·build | PARTIAL PASS | 같음 | Frontend 단위 테스트 미구성(원래 상태) |
| 운영 번들 개발 문자열(dev-analysis·analyze-preview·X-Analysis-Token·Mock Header) / 토큰 노출 | 0 / 0 | 0 | Student·Admin dist, src, docs, backend |
| 신규 교차 E2E | **44/44** | — | 격리 |
| 학생 기록 왕복 | **19/19** | 19 | 격리 |
| 성장 기록·자료 | **11/11** | 11 | 격리(데이터 누적 정리 후, `CROSS-SURFACE-E2E.md`) |
| Student 분석 결과 전체 페이지 | **30/30** | 30 | 시연 5173·분석기 8765, 시연 Schema 쓰기 0건 확인 |
| 심화 탐구 정적 콘텐츠 | **36/36** | 36 | 회귀용 격리 Stack 5173 |
| 시연 주소 읽기 점검 | **13/13** | — | API 오류 0·쓰기 0 |
| Migration 데이터 보존 | 행 수·MD5 동일 | — | `lh_demo_pdf`(PDF 확정값 2·Review 1 포함), 시연 Schema |
| PDF 브라우저(`frontend-backend-integration-202611/browser-e2e.mjs`, 기준 43) | **35 PASS · 2 FAIL, 이후 단계에서 중단** | 43 | 회귀용 격리 Stack(18080/5173/5174, Schema `lh_demo_pdf`). 아래 표 |
| 이전 브라우저 회귀(`regression-browser-e2e.mjs`, 기준 33) | **38 PASS · 2 FAIL** (40단계) | 33 | 같음. 아래 표 |
| PDF HTTP 33(`e2e_v211.py`) · 실험 OFF 9 · Adapter 83 · 확정 준비 점검표 6 | **미실행** | — | 빈 Schema가 필요하다. 권한 있는 Schema 이름은 모두 이전 시험 데이터가 있어 지우지 않았다(root 사용 안 함). 점검표 6은 Phase B로 "승인 대기" 상태가 "충족/운영 인증 대기"로 **의도적으로** 바뀌어 그대로는 통과할 수 없다 |
| Admin PDF 분석 13 · HWP/HWPX 15×2 | **미실행** | 13·15·15 | 평가계획서를 실제로 등록하는 스크립트라 시연 Schema에 돌리지 않았다. 격리 Stack에서는 시간 부족으로 생략. 같은 등록·수신 API는 통합 테스트(EvaluationPlan·Multiformat·AnalyzerV21 계열 20개)가 통과 |
| D-1 진리표 42 · PDF 사본 14 | **미실행** | 42·14 | 새 Schema 생성이 필요(위와 같은 이유). 대신 통합 테스트 + 실데이터 사본 적용으로 확인 |
| 계정 B 분석기 615 | 미실행 | 615 | 계정 B 코드 무변경 |

## 기존 브라우저 기준선의 실패 원인 (이번 기능 회귀 아님 — 그래도 PASS로 적지 않음)

| 실패 | 원인 | 근거 |
|---|---|---|
| A1 "관리자 화면 = 학생 서버 목록" (두 스크립트) | 스크립트가 지난 세션에 의도적으로 없앤 "제한 목록" 컴포넌트(`data-testid=http-school-assessment`)를 찾음 | `assessment-db-integration-202611/REGRESSION-RESULT.md` "바뀐 기존 동작" |
| browser-e2e `review-confirm-disabled` 대기 시간 초과 | 이 test id는 **HEAD 커밋 코드에도 없음**(검토 확정 패널 도입 이후 낡은 스크립트) | `git grep review-confirm-disabled HEAD` 결과 0 |
| A4 "확인된 값 표시" (regression) | 같은 Schema에서 먼저 돌린 browser-e2e가 만든 **미검토** PDF를 집음. 화면은 올바르게 "아직 확인한 값이 없어요" 표시 | 직접 확인(probe). 확정된 PDF Revision의 응답 모양은 변경 전과 같음(새 필드·sourceReview 없음) |
| 첫 실행 "PDF로 가져오기" 대기 | 분석 미리보기 Flag를 켠 실행 스크립트로 Student를 띄워 버튼 문구가 "평가계획서 가져오기"였음 | Flag OFF 스크립트로 다시 실행해 해소 |

## Student Care

`backend/.../studentcare/**`, `frontend/admin/src/features/student-care/**`, Student Care Migration 2개, Admin Shell·Sidebar·Router·Shared `vite.config.ts`는 이번에 바꾸지 않았다(수정 시각 10-29). Student Care 단위 145·통합 72 통과.
