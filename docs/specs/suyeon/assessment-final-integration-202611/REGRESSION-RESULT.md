# 회귀 결과 (2026-11-10)

## 1. 자동 검증

| 명령 | 결과 | 기준선 |
|---|---|---|
| `scripts/verify-backend.ps1` | **PASS** | PASS |
| Backend 단위 테스트 | 246 / 실패 0 / 건너뜀 0 | 246 |
| Backend 통합 테스트 | **123** / 실패 0 / 건너뜀 0 | 122 (+1: 검토 과목 슬롯 검증·`checksum`) |
| 그중 Student Care | 단위 145, 통합 77 — 모두 통과 | 같음 |
| `scripts/verify-frontend.ps1` | **PARTIAL PASS** — typecheck·lint·build 통과. Frontend 단위 테스트는 원래 미구성(새로 구성하지 않음) | 같음 |

## 2. 브라우저 (Chrome + 저장소 Playwright 1.63.0 라이브러리, 공용 `e2e/**` 무수정)

| 검증 | 결과 | Schema |
|---|---|---|
| 최종 핵심 흐름 `scripts/final-browser-e2e.mjs` | **43/43** (1차 41/43 — 실패 2건은 기대값 오류, 아래) | `lh_assessment_final2` |
| 이전 흐름 회귀 `scripts/regression-browser-e2e.mjs` | **33/33** | 같은 Schema(최종 흐름 뒤) |
| Mock 모드 (Student·Admin) | Student 배지·Mock 수정 저장·`/api` 0건 / Admin 시연 표시·기존 검토 화면(저장·확정 버튼, http 패널 없음)·`/api/admin` 0건 | — |

1차 실행 실패 2건(코드 결함 아님, 기대값을 고쳐 재실행):

1. 확정값 순서와 null 값의 근거 쪽: 화면 순서(지필 → 수행)로 저장되고, "원문에 없음" 확인에도 관리자가 본 쪽(1)이 기록됨(Backend 허용).
2. 학생 평가계획서 목록은 문서별 최신 Revision을 보여줌 → 개정본(v2, `UNREVIEWED`)이 보이고 확정된 v1은 안 보임(기존 설계, `PROXY-AND-CONTRACT.md` F-5).

회귀 사본 변경: 확정 버튼 식별자(`review-confirm`)와 분석 화면 진입(최신 Revision이 분석 없는 개정본일 수 있어 분석 있는 Revision으로 바로 이동)만 바꿨다.

## 3. 실제 서버 HTTP

| 검증 | 결과 | Schema |
|---|---|---|
| v21.1 `e2e_v211.py` (수신·재전송·DB 일치·UNREVIEWED·학생 비노출·오류·P99·W01·Student↔Admin) | **33/33** | `lh_assessment_final3` |

## 4. 보호 항목 확인

| 항목 | 결과 |
|---|---|
| AI 분석 후보 `UNREVIEWED` 유지(수신 시) / 확정 뒤에도 Run은 `REVIEW_REQUIRED` | 확인 |
| `P99` 차단 / `W01` 지필 Key 차단 | 확인(HTTP·브라우저 흐름) |
| Student·Admin 같은 Assessment ID·상태 | 확인 |
| 개발용 Header Production 미전송 | Build 번들 확인 |
| Student Care | 코드 변경 없음, 테스트 통과 |
| 공용 `e2e/**`, `api-contract.md`, `common/**`, Migration, Shared `vite.config.ts` | 변경 없음 |

## 5. 검증하지 않은 것

- 운영 환경, 실제 인증·학교·학생·학업 정보 연동
- 서버 500 화면, PDF 업로드 "파일 선택 없이 등록"(버튼 비활성, 별도 스크립트 검사 없음)
- 실제 학교 PDF(수준 3)
- 동시 확정·동시 업로드 경쟁
- AI 분석기 528개 테스트(계정 B 프로젝트) — 이번에 다시 실행하지 않음(계정 B 폴더 무수정)

## 6. 남은 로컬 상태

- E2E 전용 Schema `lh_assessment_final`, `lh_assessment_final2`, `lh_assessment_final3`(및 이전 `lh_assessment_e2e*`)에 합성 데이터가 남아 있다.
- Backend·Vite 서버는 모두 종료했다. Docker MySQL은 켜져 있다. 커밋·Push 없음.
