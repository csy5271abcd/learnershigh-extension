# 회귀 결과 (2026-11-12, 실제 실행분만 PASS로 적음)

| 시험 | 결과 | 기준선 | 환경 |
|---|---|---|---|
| **신규** Admin 심화 탐구 정적 E2E (Backend 꺼짐) | **38/38** | — | Student 5173·Admin 5174, Backend 없음 |
| **신규** Admin 심화 탐구 정적 E2E (Backend 켜짐) | **36/36** | — | 시연 Stack |
| **신규** Seed 등록·API 재조회 (1회차 / 재실행) | 30/31 → 스크립트 수정 → **30/30** (재실행 생성 0) | — | 시연 Schema |
| **신규** Seed 데이터 Student·Admin 화면 E2E | **38/38** (중간 33/38·36/38은 스크립트 판정 오류·I-3 보강 전) | — | 시연 Stack, 쓰기 0 |
| Student 심화 탐구 정적 (`enrichment-static-e2e.mjs`, up) | **36/36** | 36 | 시연 Stack |
| 시연 읽기 점검 (`demo-readonly-smoke.mjs`) | **13/13** | 13 | 시연 Stack, 쓰기 0 |
| Frontend typecheck·lint·build (`verify-frontend.ps1`, 2회) | PARTIAL PASS | 같음 | Frontend 단위 테스트 미구성(원래 상태) |
| 운영 번들 개발 문자열·토큰 | 0 / 0 | 0 | Student·Admin dist |
| Backend 단위 261 · 통합 144 | **미실행** | 261·144 | Backend 코드 변경 없음. 메모리(여유 1.2~1.7GB) 때문에 서버 실행 중 Gradle 동시 실행 안 함 |
| 학생 기록 교차 19 · 성장·자료 11 · 신규 교차 44 | **미실행** | 19·11·44 | 시험 데이터를 쓰는 스크립트라 시연 Schema에 돌리지 않음 |
| Student 분석 결과 페이지 30 | **미실행** | 30 | 분석기(8765) 꺼짐 |
| PDF 브라우저 43 · 이전 브라우저 33 | **미실행** | 43·33 | 쓰기 스크립트 + 낡은 기준선(이전 REGRESSION-RESULT) |
| PDF HTTP 33 · 실험 OFF 9 · Adapter 83 · 점검표 6 | **미실행** | — | 빈 Schema 필요(이전과 같은 사유) |
| 계정 B 분석기 615 | 미실행 | 615 | 계정 B 코드 무변경 |
| Student Care E2E | **미실행** | — | Student Care·Admin Shell·공통 CSS 변경 없음. Shell 메뉴 렌더링만 확인(정적 E2E shell 항목) |

## 변경 범위

- Admin Assessment: `routes/StaticContentRoutes.tsx`(신규), `routes/ContentRoute.tsx`, `routes/paths.ts`, `routes/AssessmentAdminRoute.tsx`, `api/canonicalSource.ts`
- Student Assessment: `components/detail/NoticeAttachments.tsx` 1줄
- 문서·스크립트: 이 폴더
- 변경 없음: Backend, DB Migration, API 계약, Student Care, Admin Shell·Sidebar·Router(`app/`), Shared `vite.config.ts`, `references/**`, 계정 B
