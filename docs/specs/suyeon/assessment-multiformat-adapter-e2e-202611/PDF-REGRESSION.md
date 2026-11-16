# PDF 회귀 · 실험 기능 ON/OFF 격리 (2026-11-10)

## 1. 실험 기능 ON (로컬 테스트 프로세스만)

| 검증 | 결과 | Schema |
|---|---|---|
| 최종 PDF 흐름 `final-browser-e2e.mjs`(Student 수정·PDF 등록·개정·오류 6종·검토 확정·학생 참조) | **43/43** | `lh_assessment_adp_pdf_on2` |
| 이전 흐름 회귀 `regression-browser-e2e.mjs` | **33/33** | 같은 Schema |

1차 실행(`lh_assessment_adp_pdf_on`)은 두 스크립트 모두 `TimeoutError`로 멈췄다. Student 개발 서버를 막 띄운 직후 첫 페이지 로드(의존성 최적화)가 길어진 **환경 원인**이었다. 페이지를 한 번 미리 연 뒤 새 Schema에서 다시 실행해 위 결과를 얻었다.

## 2. 실험 기능 OFF (기본)

| 검증 | 결과 | Schema |
|---|---|---|
| `flag-off-check.py`: 계정 B 원본 HWP·HWPX 업로드 415(세부 사유 없음 = 기존 동작), 저장 없음, PDF 등록 201, B HWP Payload → PDF Revision 400(`source.format`·`documentLocator` `unknown_field`), PDF Payload 201 → 재전송 200(같은 ID), PDF 저장 JSON = 보낸 subjects(완전 일치, `documentLocator`·`format` 없음), PDF 조회 응답 Shape 유지 | **9/9** | `lh_assessment_adp_off` |
| v21.1 HTTP `e2e_v211.py` | **33/33** | `lh_assessment_adp_off_v211` |
| 재전송 판정 해시 | 다중 형식 변경 **이전** 서버(`lh_assessment_final3`)와 같음: `49d2c72ff7fa…253b` | — |

## 3. 자동 검증

| 명령 | 결과 |
|---|---|
| `scripts/verify-backend.ps1` | **PASS** (3회차) — 단위 **251** / 실패 0 (기준선 251), 통합 **129** / 실패 0 (기준선 128 + 신규 1: 칸 안 문단·중첩 표 경로 허용), Student Care 단위 145·통합 77 포함 |
| `scripts/verify-frontend.ps1` | **PARTIAL PASS** — typecheck·lint·build 통과, Frontend 단위 테스트는 원래 미구성 |
| Production 번들 | 개발 Flag(`VITE_ASSESSMENT_DEV_MULTIFORMAT`)·Student 개발 Header 문자열 없음 |
| Mock 모드 | Student 배지·Mock 수정·`/api` 0건 / Admin 시연 표시·기존 검토 화면(HTTP 전용 영역 없음)·`/api/admin` 0건 |

## 4. `verify-backend.ps1` 실행 기록

| 회차 | 결과 | 원인 |
|---|---|---|
| 1 | 중단 — Student Care 통합 테스트 다수 `CannotGetJdbcConnectionException` | 실행 중 Docker가 로컬 개발 DB와 Testcontainers MySQL을 **한꺼번에** 종료(Exited 255). 코드와 무관한 환경 장애 |
| 2 | 실패 — 테스트 JVM 시작 불가 | **메모리 부족**(Windows 페이징 파일 부족, errno 1455. 남은 물리 메모리 약 400MB/16GB). 1회차가 남긴 고아 Testcontainers 3개가 메모리를 씀 |
| 3 | **PASS** | 1회차 고아 컨테이너(`org.testcontainers=true`, 같은 session) 제거, 검증 동안만 로컬 개발 DB 컨테이너 **중지**(삭제 아님, 끝난 뒤 다시 시작 — Volume 유지) |

- 사용자의 다른 프로그램(브라우저·편집기 등)은 종료하지 않았다.
- 2회차 JVM이 남긴 `backend/hs_err_pid61780.log`(제 실행이 만든 크래시 로그)는 지웠다.
- 1회차의 종료된(Exited) Testcontainers 컨테이너 몇 개가 Docker에 남아 있다(실행 중 아님).
- 시연 전에 메모리 여유를 확인하는 것이 좋다.
