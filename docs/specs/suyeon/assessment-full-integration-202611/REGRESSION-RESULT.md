# 회귀·신규 시험 결과 (2026-11-11 13:00~13:40, 실제 실행분만)

## 1. 기존 기준선

| 기준선 | 이번 결과 | 상태 | 비고 |
|---|---|---|---|
| Backend 단위 261 | **261 / 실패 0 / 건너뜀 0** (Student Care 145 포함) | 재실행 | `gradlew test --rerun` (13:21). `clean` 없이 실행 — `clean`은 실행 중인 시연 jar를 지우기 때문. jar SHA-256 앞 16자 `c8f9e5cabcd1661a` 시험 전후 동일, 18080 응답 유지 |
| Backend 통합 129 | **129 / 0 / 0** (Student Care 72 포함) | 재실행 | `gradlew integrationTest --rerun` (Testcontainers, 13:24) |
| Frontend typecheck·lint·build | **통과** (Student·Admin·Mentor) | 재실행 | `scripts/verify-frontend.ps1` PARTIAL PASS — Frontend 단위 테스트 미구성(원래 상태) |
| PDF 브라우저 43 | 미실행 | **차단** | 새 빈 Schema 필요(root 권한 없음), `BLOCKERS-AND-APPROVALS.md` B-7 |
| 이전 브라우저 회귀 33 | 미실행 | **차단** | 같음 + S7은 5173 Flag OFF 전제 |
| PDF HTTP 33 | 미실행 | **차단** | 새 Schema 필요 |
| 실험 OFF 9 | 미실행 | **차단** | 새 Schema 필요 |
| HWP·HWPX Adapter E2E 83 | 미실행 | **차단** | 새 Schema 필요 |
| 확정 준비 점검표 6 | 미실행 | **차단** | 같음 |

`verify-backend.ps1`(= `clean build` + `integrationTest`)의 테스트 부분은 위 두 Task와 같다. `clean build`의 컴파일·ArchUnit은 `test`에 포함된다.

## 2. 이번 변경의 영향 판단

| 영역 | 변경 | 근거 |
|---|---|---|
| Backend·DB·Migration·`api-contract.md` | 없음 | 해시·파일 목록 확인(직전 보고서와 동일, Migration 4개) |
| Admin 평가계획서 등록 | Flag ON일 때만 분석기 흐름. Flag OFF는 기존 코드 경로 그대로(`requestPlanAnalysis`) | 조건 분기, 운영 번들에서 제거 확인 |
| Student PDF 가져오기 | Flag ON일 때만 새 Modal·Route. Flag OFF는 기존 Modal·라벨 "PDF로 가져오기" | 직전 보고서 Flag OFF 브라우저 확인, 운영 번들 0건 |
| Student Care·Admin Shell·Router | 없음 | — |

## 3. 신규 시험

| 시험 | 결과 | 환경 |
|---|---|---|
| `student-analysis-page-e2e.mjs` | **30/30** (최종 코드 재실행) | 5173(Flag ON) + 18080 + 분석기, 쓰기 0 |
| `admin-analysis-page-e2e.mjs` PDF | **13/13** | 격리 18081(`lh_demo_pdf`) + 5184 |
| 같은 시험 HWPX | **15/15** | 격리 18081(`lh_demo_mf2`, 실험 ON) + 5184(Multiformat) |
| 같은 시험 HWP | **15/15** | 같음 |
| `enrichment-static-e2e.mjs` (직전 작업) | **36/36** | 현재 5173 |
| Admin 5174 렌더링 프로브 | 2개 주소 렌더링, 콘솔 오류 0 | 5174 |
| 운영 번들 개발 문자열 | Student 0 · Admin 0 (`dev-analysis`, `analyze-preview`, `X-Analysis-Token`, `X-Assessment-Student-Id`, Flag 전용 문구) | `npm run build` |
| 토큰 노출 | 소스·번들·보고서 폴더 0건 | grep |

격리 시험에 쓴 Schema(`lh_demo_pdf`, `lh_demo_mf2`)는 이전 회귀용 합성 Schema다. 합성 계획서 3건(3학년 2학기 PDF, 3학년 1학기 HWPX, 2학년 2학기 HWP)이 추가됐다. 시연 Schema `lh_demo_manual_20261111`에는 시험 데이터를 쓰지 않았다.
