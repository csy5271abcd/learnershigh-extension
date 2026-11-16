# 최종 회귀 결과 (2026-11-11 07:40~08:20)

모두 이번에 **실제로 실행한** 결과다. 코드는 바꾸지 않았다(이번 작업의 새 파일은 이 폴더뿐이다). 합성 자료만 썼고, 시험마다 **새 빈 Schema**를 만들었다(기존 Schema는 재사용·삭제하지 않음).

## 1. 요약

| # | 검증 | 결과 | 기준선 | 조건 |
|---|---|---|---|---|
| 1 | `scripts/verify-backend.ps1` | **PASS** | PASS | 실험 Flag 기본값 |
| 1-a | Backend 단위 | **261** / 실패 0 / 건너뜀 0 | 261 | `ReviewEvidenceScopeTest` 10, `studentcare` 테스트 파일 145 포함 |
| 1-b | Backend 통합 | **129** / 실패 0 / 건너뜀 0 | 129 | Testcontainers MySQL. `studentcare` 테스트 파일 72 포함(※) |
| 2 | `scripts/verify-frontend.ps1` | **PARTIAL PASS** | 같음 | Student·Admin·Mentor typecheck·lint·build 통과. **Frontend 단위 테스트 미구성**(원래 상태, 통과로 보지 않음) |
| 3 | PDF v21.1 HTTP `e2e_v211.py` | **33/33** | 33 | `lh_demo_v211`, 분석 수신 ON·실험 OFF |
| 3-a | 재전송 판정 해시 | `49d2c72ff7fa…253b` — 기준 Schema `lh_assessment_final3`과 같음 | 같음 | — |
| 4 | 실험 Flag OFF `flag-off-check.py` | **9/9** | 9 | `lh_demo_off` |
| 5 | PDF 최종 브라우저 `final-browser-e2e.mjs` | **43/43** | 43 | `lh_demo_pdf`, Student 5173·Admin 5174 http, **실험 OFF**(시연 설정) |
| 6 | 이전 브라우저 회귀 `regression-browser-e2e.mjs` | **33/33** | 33 | 같은 서버 |
| 7 | HWP·HWPX Adapter E2E `adapter-e2e.mjs` | **83/83** (HWP 42 = 23+19, HWPX 41 = 22+19) | 42 / 41 | `lh_demo_mf2`, 이 Backend 프로세스만 실험 ON, Admin `VITE_ASSESSMENT_DEV_MULTIFORMAT=true` |
| 8 | 확정 준비 점검표 `readiness-check.mjs` | **6/6** | 6 | 7과 같은 Schema |
| 9 | Mock 모드 `scripts/demo-env-check.mjs mock` (신규) | **6/6** | (이전 수동 확인) | Student·Admin 기본 모드 |
| 10 | Backend 꺼짐 오류 표시 `demo-env-check.mjs down` (신규) | **5/5** | — | http 모드, Backend 중지 |

※ 이전 보고서는 Student Care 통합을 77로 적었다. 이번에는 `studentcare` 패키지의 테스트 결과 파일만 세어 72가 나왔다. 집계 기준이 달라서일 수 있으며, 통합 129건은 전부 통과했다.

## 2. 무효로 처리한 1차 시도 (숨기지 않음)

HWP·HWPX Adapter E2E 1차(`lh_demo_mf`)도 83/83이었지만 **채택하지 않았다.** PDF 시험에서 쓴 Admin Vite(실험 표시 Flag 없음)가 TaskStop 뒤에도 Node 자식 프로세스로 남아 5174를 잡고 있었다. 그래서 새 Admin(Flag ON)은 `Port 5174 is already in use`로 시작하지 못했다. 그 프로세스(제가 띄운 것)만 종료한 뒤 새 빈 Schema `lh_demo_mf2`에서 다시 돌렸다. 이번에는 Admin 모듈에 `"VITE_ASSESSMENT_DEV_MULTIFORMAT": "true"`가 들어간 것을 확인하고 실행했다(위 7·8).

교훈: 백그라운드 `npx vite`를 멈춘 뒤에는 Node 자식 프로세스까지 남지 않았는지 확인해야 한다(`DEMO-RUNBOOK.md` §7).

## 3. HWP·HWPX 확정 차단 (Part B)

| 확인 | 결과 | 근거 |
|---|---|---|
| Backend `review_not_supported` | 유지 | 7: HWP·HWPX 직접 PUT → 400 `revision.documentFormat: review_not_supported`, Review 0, `UNREVIEWED` |
| Admin 확정 버튼 비활성 | 유지 | 7·8: 해시·과목·필드가 다 맞아도 확인 체크·확정 버튼 비활성, 화면 PUT 0 |
| 점검표 승인 대기 표시 | 유지 | 8: 원문 대조·명시적 확인·근거 저장 = `blocked`(승인 대기) |
| 관리자 확인 체크 비활성 | 유지 | 8 |
| 학생에게 미승인 후보 미노출 | 유지 | 7: 학생 응답 `UNREVIEWED`, 후보·Locator 없음 |
| 공식 수행평가 참조 차단 | 유지 | 7: 학생 공식 평가 항목 참조 → 400 `not_confirmed`, 저장 없음 |
| 수신 시 `UNREVIEWED`, Review 자동 생성 없음 | 유지 | 7: 최초 201·재전송 200 모두 Review 0. 시험 후 DB `assessment_plan_review` 0행, Revision 2개 모두 `UNREVIEWED` |
| 실험 ON 상태에서도 확정 비활성 | 유지 | 7·8은 실험 ON에서 실행 |
| D-1 미적용 | 유지 | 모든 시험 Schema의 Flyway 이력 = 기존 4개(`…090310`까지). `database/migrations/`에 새 파일 없음 |

## 4. 보호 파일 (작업 시작 해시와 비교)

| 파일 | 결과 |
|---|---|
| `docs/api/api-contract.md` `052128cf…` | 같음 |
| `database/migrations/*.sql` 4개 | 같음, 새 파일 없음 |
| Backend·Frontend 소스 | 이번 작업에서 변경 없음 |

`git status`의 다른 `M`·`??` 항목은 이 작업 전부터 있던 미커밋 변경이다.

## 5. 한계

- 10(Backend 꺼짐): Student는 실제 네트워크 실패(`HTTP 502`)를 오류로 표시했다. Admin Assessment 첫 화면의 오류 2건은 http 모드에서 아직 연결하지 않은 리소스의 "연결 전" 오류다. **Admin의 네트워크 실패 표시를 이 시험이 따로 증명하지는 않는다.** Admin PDF 등록의 네트워크 실패 표시는 5(`[PDF] 네트워크 실패 → 오류 표시`)에서 확인됐다.
- 브라우저 시험은 Headless Chrome, 1440×900(점검 스크립트) 또는 각 스크립트 기본 크기다. 시연 PC 해상도에서의 시각 확인은 하지 않았다.
- 계정 B v21.2-quality 출력은 시험하지 않았다(시연 기준선은 v21.1).
