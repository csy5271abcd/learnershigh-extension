# PDF 회귀 (2026-11-10)

## 1. 자동 검증

| 명령 | 결과 | 기준선 |
|---|---|---|
| `scripts/verify-backend.ps1` | **PASS** | PASS |
| Backend 단위 | **251** / 실패 0 | 246 (+5 형식 판별) |
| Backend 통합 | **128** / 실패 0 | 123 (+5 다중 형식) |
| 그중 Student Care | 단위 145 · 통합 77 통과 | 같음 |
| `scripts/verify-frontend.ps1` | **PARTIAL PASS**(typecheck·lint·build, Frontend 단위 테스트 원래 미구성) | 같음 |

## 2. 실제 서버·브라우저

| 검증 | 실험 기능 | 결과 | Schema |
|---|---|---|---|
| 최종 PDF 흐름 `final-browser-e2e.mjs`(Student 수정·PDF 등록·개정·오류·검토 확정·학생 참조) | 켬 | **43/43** | `lh_assessment_mf_pdf2` |
| 이전 흐름 회귀 `regression-browser-e2e.mjs` | 켬 | **33/33** | 같은 Schema |
| v21.1 HTTP `e2e_v211.py`(수신·재전송·DB 일치·UNREVIEWED·학생 비노출·오류·P99·W01·Student↔Admin) | 끔(기본) | **33/33** | `lh_assessment_mf_off2` |
| 재전송 판정 해시 호환 | 끔 | 변경 전 서버(`lh_assessment_final3`)와 새 서버 `payload_sha256` **동일**(`49d2c72f…`) | — |
| 실험 꺼짐 + HWPX 업로드(curl) | 끔 | 415 | `lh_assessment_mf_off` |
| Mock 모드(Student 배지·Mock 수정·`/api` 0건 / Admin 시연 표시·기존 검토 화면·`/api/admin` 0건) | — | 통과 | — |

v21.1 HTTP 1차 실행(NON_NULL 수정 전 빌드)은 31/33이었다. 실패 2건은 "DB 후보 = 분석기 출력" 비교였고, 원인은 새 필드의 null 직렬화였다(`HWP-HWPX-E2E-RESULT.md` §4-2). 수정한 뒤 위 결과를 얻었다.

## 3. 보호 항목

| 항목 | 결과 |
|---|---|
| PDF 등록 201·개정 추가·SHA-256 불일치·쪽 범위 검사 | 유지 |
| 관리자 원본 PDF 대조(브라우저 해시 + PDF 보기) | 유지 |
| 미승인 후보 유지 / Student·Admin 같은 ID / P99·W01 차단 | 유지 |
| 개발 Header·개발 Flag Production 미포함 | 번들 확인 |
| 공용 영역(`api-contract.md`, `database/**`, `common/**`, Student Care, `e2e/**`, Shared vite) | 변경 없음 |
