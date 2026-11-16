# [계정 A] A16 — 과목 근거 쪽 범위 계약 수정(F01664) 및 실제 B13 분석기 재검증 (2026-11-16)

> 상태 표기: **완료(실제 B13 HTTP)** / **완료(시험)** / **미실행** / **후속(외부 의존)**
> [실제] 계정 B B15 확정 Commit `5c59fb7`을 `git archive`로 스크래치 폴더에 꺼내 A16 전용 포트에서 실행 → 실제 HTTP → 계정 A Backend(일회용 DB) · [IT] Testcontainers · [E2E] Playwright(Edge, 일회용 DB, **분석기 Stub**)

## 1. 시작 상태

- Branch `feature/assessment-student-integration-enhancement`, 시작 HEAD `1641a82`(A15 보고서), Stage된 파일 없음, A16 작업 흔적 없음.
- 미Commit 68건(`.claude/rules/*`, 루트 문서, ADR, `docs/architecture/*`, `scripts/*`, seed·증거 폴더, `backend/bin/`, `references/**`)은 다른 담당자·이전 작업 소유로 변경·Stage하지 않았다.
- A15 Bundle(`~/.learnershigh-extension/backups/a15-feature-assessment-20261116.bundle`) `git bundle verify` 정상.
- Docker 데몬은 꺼져 있었다. 사용자 승인 뒤 Docker Desktop을 켰고(설치 경로가 `%LOCALAPPDATA%\Programs\DockerDesktop`이라 그 경로로 실행), 켠 직후 기존 컨테이너는 모두 `Exited` 그대로였다.

## 2. API 계약 변경 — `api-contract.md` §39-3

"PDF 원문 근거 쪽 범위 규칙"(A16, 0.2·0.3 공통)을 새로 적었다. 이전에는 이 규칙이 코드에만 있었다.

| 근거 | 문서 쪽 수(1~`pageCount`) | 과목 `pageRange` 안 |
|---|---|---|
| `subjects[].pageRange` 자체 | `from ≤ to ≤ pageCount` | — |
| `subjects[].sources[]` (과목 확인 근거) | 필수 | **요구하지 않음**(공통 머리글·요약표) |
| 지필·시험·수행·항목·채점 근거 | 필수 | 필수 — 변경 없음 |
| 0.3 `issues[].sources`·`teachingPlan[].sources` | 필수 | 요구하지 않음 — 변경 없음 |

근거 삭제·`pageRange` 확대는 하지 않는다(받은 그대로 저장).

## 3. F01664 수정 전후

- **코드**: `AnalysisImportValidator.java:151` 한 줄 — 과목 근거 검사에 `range` 대신 `null`.
- **문서 쪽 수 검증이 남는지 먼저 확인**: PDF는 `source.pageCount`가 필수(없으면 `required`)이고 `pdfLocator`가 `page > pageCount`를 `range`와 별도로 검사한다. 1 미만은 DTO `@Min(1)`. 따라서 `null`은 본문 범위만 끈다.
- **재현**: 새 Unit 시험을 수정 전 코드로 돌리면 F01664 모양 2건(`과목 본문 밖 머리글 허용`, `40과목 중 22과목 머리글`)이 `subjects[n].sources[1].pdfPageNumber:out_of_range`로 실패, 수정 후 통과.

| | A15 (수정 전) | A16 (수정 후) |
|---|---|---|
| F01664 실제 HTTP | `502 PLAN_ANALYZER_BAD_RESPONSE`, 저장 없음 | `201` PARTIAL, 40과목·수행 118 저장(2회 실행 모두) |
| 과목 본문 밖 과목 근거 | 거절 사유 | 22과목·22건 그대로 보존(DB `result_json` 직접 확인) |

## 4. 실제 B13 분석기 9문서 결과 — **완료(실제 B13 HTTP)**

실행: 일회용 MySQL `lh_a16_real`(tmpfs, 127.0.0.1:33361, 무작위 비밀번호), 분석기 127.0.0.1:18868(`--enable-contract03 --enable-contract03-b13 --timeout 280`, 토큰은 환경 변수 — 시작 로그 `tokenSource: env:CURRICULUM_ANALYSIS_TOKEN`, `tokenFile: null`), Backend 127.0.0.1:18192(`contract03-version=v21.9-b13-dev`). 원문은 로컬 공개 코퍼스에서 계정 B 목록의 SHA-256으로 찾았고 외부로 보내지 않았다. 같은 9문서를 두 번(새 문서로) 돌려 결과가 같았다.

| 문서 | 유형 | 수신 | 상태 | 과목 | 수행 | 채점 요소 | 운영계획 행 | A15와 비교 |
|---|---|---|---|---|---|---|---|---|
| F02455 | PDF | 201 | PARTIAL | 13 | 18 | 35 | 106 | 같음 |
| **F01664** | PDF | **201** | PARTIAL | **40** | 118 | 0 | 0 | **A15 502 → 저장** |
| F04902 | PDF | 201 | PARTIAL | 10 | 18 | 0 | 0 | 같음 |
| F01657 | HWP | 201 | PARTIAL | 13 | 45 | 0 | 266 | 같음 |
| F01673 | HWP | 201 | PARTIAL | 28 | 0 | 0 | 549 | 같음 |
| F01781 | HWP | 201 | PARTIAL | 11 | 6 | 26 | 158 | 같음 |
| F01912 | PDF | 201 | PARTIAL | 12 | 39 | 70 | 122 | 같음 |
| F02099 | HWPX | 201 | PARTIAL | 1 | 0 | 0 | 24 | 같음 |
| F00554 | 스캔 PDF | 201 | FAILED | 0 | 0 | 0 | 0 | 같음 |

- 분석기 버전 `v21.9-b13-dev/contract03-adapter-0.3-draft`, 프로필 `v21.9-b13-dev`, 계약 0.3, 출처 `SERVER_ANALYZER`(9/9).
- 정밀도 분포도 A15와 같다: F01912 `MONTH_RANGE` 40·`WEEK_UNRESOLVED` 1, F01781 `MONTH_RANGE` 61.
- 임시 분석기(B15 확정 Commit)와 A15 결과 사이에 차이가 없었다.

## 5. 과목 근거·원문 쪽·Locator 검증

| 항목 | 결과 |
|---|---|
| 원문 SHA | 9/9 등록 SHA = 계정 B 목록 SHA, 원문 내려받기 바이트 SHA 9/9 일치 |
| PDF 쪽 | F02455 828·F01664 437·F04902 54·F01912 1,502개 Locator 모두 문서 쪽 수 안(밖 0) |
| F01664 과목 근거 | 과목 근거 쪽 1~8(문서 11쪽), 본문 범위 밖 22건 보존 |
| HWP·HWPX Locator | F01657 2,300·F01673 4,089·F01781 1,542·F02099 122 = 8,053/8,053 원문 구조 미리보기 위치와 일치, 구조 응답 SHA 일치 |
| 문서 밖 쪽 거절 | 실제 문서로는 해당 사례 없음 → [Unit]·[IT]로 확인(§10) |

## 6. DB 저장·GET 재조회

- `assessment_plan_analysis_run` 18건(9문서 × 2회): PARTIAL 16·FAILED 2, 모두 `contract_version=0.3`·`analyzer_profile=v21.9-b13-dev`.
- POST 응답과 GET 재조회의 분석 ID가 9/9 같고, 과목 수도 같다.
- F01664 Run 2건 모두 `result_json` 과목 40개, 본문 밖 과목 근거 22건.

## 7. 관리자 확정·학생 공개 — **완료(실제 B13 HTTP)**

| 시나리오 | 결과 |
|---|---|
| F01664 평가정보(머리글 근거를 가진 과목 #6, 본문 2~2쪽, 수행평가 이름·근거 2쪽) | 확정 200 → 학생 200, 확정값 일치·근거 2쪽, 학생 응답에 분석 후보·분석 과목 번호 없음, 인증 없음 401 |
| F02455 평가정보(수행평가 이름, 근거 4쪽) | 확정 200 → 학생 200, 값 일치 |
| F01912 운영계획(4과목 64행: `WEEK_UNRESOLVED` 1·`MONTH_RANGE` 21·`WEEK_IN_MONTH` 34·`UNKNOWN` 8) | 확정 200 → 학생 64행, 정밀도 분포 동일, 원문 주 표기 64/64 보존, 범위 행에 만든 날짜·주 번호 0 |
| F01781 HWP 운영계획(4과목 66행, `MONTH_RANGE` 24) | 확정 200 → 학생 66행, 학생 PDF 쪽 0(위치를 쪽으로 바꾸지 않음) |
| F02099 HWPX 운영계획 24행 | 확정 200 → 학생 24행 |
| F01781 HWP 평가정보 | `400 revision.documentFormat: verified_auth_required` — 기존 보호 유지(켜지 않음) |
| F00554 FAILED | 평가정보·운영계획 확정 모두 `400 analysisId: analysis_failed`, 학생 운영계획 404 |

운영계획 확정 행은 DB에 `ANALYSIS`·`CONFIRMED` 209건(1회 55 + 2회 154)이다. 재검토·관리자 추가 행·재확정은 이번 실측에서 다시 하지 않았고 E2E(§12, Stub)와 IT로 회귀를 확인했다.

## 8. 확장 필드 3종 회귀

- `maxScore`·`linkReview`·`grades` 수신·검증·표시 코드는 바꾸지 않았다.
- [Unit] `AnalysisImportContract03ExtensionTest` 7건, [IT] `TeachingPlanReviewApiTest`의 확장 필드 3건, [E2E] `a15-flows` 통과(§10·§12).
- 실제 B13 응답에는 확장 필드가 없고(B13 프로필은 출력하지 않음), 생략된 응답이 그대로 수신됐다(9/9).

## 9. B16 실험 프로필 실제 HTTP — **미실행(후속)**

- 계정 B 저장소(읽기만 함): HEAD는 여전히 B15 `5c59fb7`. 작업 중 `B16-ACCOUNT-A-EXT-HANDOFF-20261116.md`·`tools/b16/` 등이 **미Commit**으로 생겼다(B 측 '실제 HTTP·Docker 출력 완료' 표기).
- 승인 범위(미Commit 변경을 검증에 섞지 않음)에 따라 `v21.10-b16-dev` 실제 HTTP 수신·Wizard·확정은 하지 않았다. B16 Commit 뒤 `assessment.analyzer.contract03-version=v21.10-b16-dev`로 별도 통합 단계에서 검증한다.
- B16 인계 문서 참고: 과목 중복은 B13과 같아 A15의 '다른 학년 동명 과목 둘 다 수신'은 B16 출력으로도 아직 실행되지 않는다(분석기 과목 구간 정리 후속).

## 10. Backend 시험

| 범위 | 결과 |
|---|---|
| Unit 전체 | **317건, 실패 0**(생략 1 = 기본 꺼진 코퍼스 도구). 신규 `AnalysisImportValidatorTest` 5건 |
| Integration 전체 | **201건, 실패 0**(8분 5초). 신규 `EvaluationPlanApiTest` 1건 — 본문 밖 머리글 근거 수신·DB 저장·GET 보존, 문서 밖 과목 근거 `subjects[0].sources[1].pdfPageNumber: out_of_range`, 지필 근거 범위 위반 거절 유지 |

신규 통합 시험은 A15 교훈대로 기존 Spring 시험 Context(`EvaluationPlanApiTest`)에 넣어 MySQL 컨테이너를 늘리지 않았다.

신규 Unit 5건: 머리글 근거 허용 · 40과목 중 22과목 머리글 · 문서 밖 과목 근거 거절(`pageRange` 없어도) · `pageRange` 자체 검사(문서 밖·거꾸로) · 지필·수행·항목·채점 근거 본문 범위 계속 적용.

## 11. Frontend

Frontend 코드는 바꾸지 않았다. typecheck·lint(`oxlint --deny-warnings`)·build(student·admin·shared) 모두 통과.

## 12. Assessment E2E

- **22/22 통과**(2.5분, Edge, 일회용 DB의 실제 Backend·Storage, 분석기 Stub): a12 5 · a13 4(운영계획 확정 → 재검토 → 재확정 이력 포함) · a14 2(관리자 추가 행 추가·수정·제외·복원·재확정·잘못된 입력) · a15 1(확장 필드 3종) · 분석 실패 확정 차단 1 · 평가정보 업로드·검토·초안·확정·학생 확정값 1 · Stepper 반응형 3 · 학년도 열람 1 · HWP·HWPX 미리보기·다과목 PDF·Wizard 근거 3 · 운영계획 초안·학생 Planner 1.
- 첫 실행은 22건 모두 2ms에 실패했다 — 원인은 Playwright 번들 Chromium(`chromium_headless_shell-1243`) 미설치(환경). 시험·코드 변경 없이 A14·A15와 같이 설치된 Edge(`E2E_BROWSER_CHANNEL=msedge`)로 다시 실행해 통과했다.
- 신규 E2E는 추가하지 않았다. 이번 변경은 분석 결과 수신 검증이라 화면 동작이 없고, 실제 HTTP 수신은 §4·§7, 경계값은 §10에서 확인했다.
- 일반 E2E의 분석기는 Stub이다. 실제 분석기 검증(§4~§7)과 구분한다.

## 13. Student Care 회귀

- Unit 17클래스 145건·Integration 8클래스 77건, 실패 0. Student Care 코드·화면·Migration 변경 없음.
- Student Care Playwright E2E(`e2e/playwright.config.ts`, README §22 절차·`/api/test/reset` 사용)는 **미실행** — 이번 변경은 Assessment 분석 결과 Validator 한 줄이라 Student Care 경로와 무관하다.

## 14. 시연 DB 미변경

- `learnershigh-mysql`: `restart=no`, 작업 전후 `Exited (0)`, 마지막 실행 2026-11-15 21:42~21:44(UTC) 그대로 — 이번 작업 중 켜지지 않았다.
- Flyway는 일회용 `lh_a16_real`(15개 Migration)·Testcontainers·E2E 일회용 DB에만 적용됐다. **A14 `V202611160200`은 시연 DB에 적용되지 않았다**(승인 대기 유지). 새 Migration 없음.
- 정리: A16 Backend·분석기 종료, `lh-a16-real-mysql` 삭제, 포트 18868·18192·33361 닫힘 확인. 계정 B 원본 저장소·프로세스에는 쓰거나 멈추지 않았다(새로 생긴 파일은 모두 B16 작업물, 분석기 출력은 스크래치 폴더).

## 15. Commit·Bundle

| Commit | 내용 |
|---|---|
| `7c39757` | `api-contract.md` §39-3 PDF 원문 근거 쪽 범위 규칙 (계약 먼저) |
| `87a5bea` | `AnalysisImportValidator` 한 줄 + Unit 5·IT 1 |
| (이 보고서) | docs: A16 보고서 |

- Stage는 위 파일만 골라서 했다(다른 미Commit 파일 그대로).
- Bundle: `~/.learnershigh-extension/backups/a16-feature-assessment-20261116.bundle`(보고서 Commit 뒤 생성, `git bundle verify` 결과는 최종 보고).
- 실측 증거(수치만, 원문 글자 없음)는 저장소에 넣지 않고 스크래치 폴더 `a16/result-b13*.json`에 두었다.

GitHub Push·Merge·Rebase·PR은 하지 않았다. `main` 변경 없음.

## 16. 미완료·외부 의존

| 항목 | 상태 |
|---|---|
| B16 `v21.10-b16-dev` 실제 HTTP(`maxScore`·`linkReview`·`grades`) | B16 Commit 대기 → 후속 통합 |
| 계정 B 이식 검증기에 §39-3 과목 근거 규칙 반영 | 계정 B 공유 필요(B16 인계 문서에 '과목 근거 쪽 범위 계약' 항목 있음 — 내용 대조는 후속) |
| HWP·HWPX 평가정보 공식 확정 | 운영 보호 유지(실제 관리자 인증 연동 전 금지) |
| 40과목 상한(80 상향) | 사용자 결정 대기 — F01664는 40과목으로 저장됨(상한 그대로) |
| 같은 학년·다른 학기 과목 중복 | 학기 정책 결정 필요 |
| 시연 DB에 A14 Migration 적용 | 사용자 승인 대기 |
| Student Care Playwright E2E | 미실행(§13) |
| 실제 학교·학생 슬롯 | Mock 슬롯(2026/1학년/2학기)에 1학기 문서 등록 — 1팀 원천 연결 후 재확인 |
| Railway HTTPS 분석기 연결 | 다음 단계 |
