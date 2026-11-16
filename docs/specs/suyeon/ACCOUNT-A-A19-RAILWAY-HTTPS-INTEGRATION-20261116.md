# [계정 A] A19 — Railway HTTPS 최종 통합 검증 (2026-11-16)

> 상태 표기: **완료(Railway 실측)** / **완료(Railway + React 화면)** / **완료(로컬 회귀)** / **미검증(원인)** / **후속(외부 의존)**
> [원격] 로컬 Spring Boot(일회용 DB `lh_a19_railway`, 시연 명단 ON) → `https://learnershigh-assessment-analyzer-production.up.railway.app` (프로필 `v21.10-b16-dev`) · [화면] 같은 Backend에 붙인 Admin·Student Vite + Playwright(Edge) · [직접] curl → Railway(합성 문서만) · [로컬] B17 `9a0155c` 사본 분석기(실제 코퍼스는 여기서만)

## 결론 — **PARTIAL**

합성 문서에 대한 **Railway HTTPS → Backend HTTP Client → 일회용 DB → 관리자 확정 → 학생 조회** 흐름은 PDF·HWP·HWPX 모두 실제로 동작했다(API 실측 7건 + 화면 4/4 + 실패 경로 2건). 학년별(1·2·3) 확정·학생 공개·학년 충돌·다른 학교 차단·HWP/HWPX 인증 보호도 원격에서 같게 동작했다.

PASS로 올리지 않은 이유(모두 Railway 연결 결함이 아니라 **합성 문서로는 증명할 수 없는 항목**):

1. **합성 PDF에서 수행평가 항목이 0건**(반영 비율·지필·운영계획·학년·쪽 번호는 추출). 계정 B 공개 생성기의 합성 PDF(`pdf-full`)도 원격에서 똑같이 0건이므로 Fixture 문제가 아니라 분석기 규칙의 합성 PDF 표 처리 한계다 → PDF 수행평가·채점기준·원문 근거(항목 단위)·**화면 요소 배점 수정**은 원격 미검증.
2. **`rubric[].maxScore`·`linkReview`는 원격에서 0건**(합성 HWP·HWPX 채점기준 3요소는 수신). 계정 B 공개 시험도 합성 문서로 이 두 필드를 단언하지 않는다. 확장 필드 실수신은 A17·A18의 로컬 실제 코퍼스 결과에만 근거가 있다.
3. Railway Metrics(메모리·CPU)·자동 배포 설정·Host 허용 목록은 계정 A에서 조회할 권한·수단이 없어 **사용자 확인 필요**(§15).

## 1. 시작 Git 상태

- Branch `feature/assessment-student-integration-enhancement`, HEAD `47937a8`(A18 보고서), Stage 없음.
- 미Commit 68건(수정 26 · 미추적 42) — 작업 전 목록을 저장소 밖에 저장하고 작업 후 비교(§19). 건드리거나 Stage하지 않았다.
- 실행 중 컨테이너 없음(과거 종료 컨테이너만). 여유 메모리 약 1.85GB → 무거운 작업은 하나씩 실행.
- 사용 포트: Backend 19194, MySQL 33463(127.0.0.1 전용, tmpfs), Admin Vite 5495, Student Vite 5496, (로컬 회귀) 분석기 18870·Backend 18194.

## 2. A18 기준선

Backend Unit 322 · Integration 203 · Assessment Stub E2E 23/23 · 실제 B16 Edge E2E 5/5 · Student Care Unit 145 · IT 77 · Frontend typecheck·lint·build 통과(`ACCOUNT-A-A18-ALL-GRADES-MOCK-ASSESSMENT-20261116.md`). A18 코드는 이번에 바꾸지 않았다.

## 3. Railway HTTPS URL

`https://learnershigh-assessment-analyzer-production.up.railway.app` — TLS 검증 성공(`ssl_verify_result=0`). Backend 로그의 분석기 호출 대상도 이 주소였고, 로컬 분석기(18870)는 원격 시험 동안 실행하지 않았다 → 로컬 주소로 조용히 대체될 경로가 없었다.

## 4. 인증 토큰

- 사용자가 별도 PowerShell 창에서 User 범위 환경 변수 `ASSESSMENT_ANALYZER_TOKEN`에 **새 토큰**을 넣었고, Railway 토큰도 노출 이후 교체됐다고 확인했다(2026-11-16, 사용자 답변).
- 계정 A는 값을 출력하지 않았다: Backend 시작 스크립트가 프로세스 환경 변수로만 넘기고, curl은 권한 077 임시 Header 파일(사용 직후 삭제)로만 보냈다. 확인한 것은 길이(64)뿐.
- Backend 로그·응답·보고서·스크린샷에 토큰 문자열 0건(로그 grep 0, 잘못된 토큰 시험 응답에도 없음).
- 검증 후 정리 권장: `[Environment]::SetEnvironmentVariable('ASSESSMENT_ANALYZER_TOKEN',$null,'User')`.

## 5. 실제 분석 프로필

| 구분 | 값 |
|---|---|
| Backend `ASSESSMENT_ANALYZER_CONTRACT03_VERSION` | `v21.10-b16-dev` |
| Backend `ASSESSMENT_ANALYZER_VERSION` | **설정 안 함**(기본 `v21.1` 유지 — 0.2 기본 분석기와 0.3 프로필을 섞지 않음) |
| 원격 Health `defaultAnalyzerVersion` / `contract03.experimentalProfiles` | `v21.1` / `v21.10-b16-dev`(B16_EXT)·`v21.9-b13-dev`(B13) |
| 저장된 Run 30건 | 30/30 `analyzer_profile=v21.10-b16-dev`, `contract_version=0.3`, `origin=SERVER_ANALYZER`, 분석기 버전 `v21.10-b16-dev/contract03-adapter-0.3-draft` |

## 6. Backend Timeout 환경 변수

- `ASSESSMENT_ANALYZER_TIMEOUT_MILLIS=150000`으로 기동(정상 시험), `=300`으로 재기동해 동작 차이로 바인딩을 확인(§16). 바인딩 자체는 A18 Unit `PlanAnalyzerEnvBindingTest`가 검증.
- 원격 Health `limits.timeoutSec=120`·`concurrency=1`·`workerMemoryMb=2048`·`maxFileBytes=20971520`·`auth.required=true`·`pdfLayout.java/classes=true`.

## 7. 실제 HTTP 테스트 결과 — **완료(Railway 실측)**

| 검사 | 경로 | 결과 |
|---|---|---|
| Health | 직접 | 200, 0.68초 |
| 토큰 없음 / 잘못된 토큰 | 직접(합성 HWPX) | 401 / 401 `UNAUTHORIZED` |
| 미지원 형식(합성 .txt) | 직접 | 415 `UNSUPPORTED_FORMAT` |
| 없는 0.3 프로필 | 직접 | **400** `CONTRACT_PROFILE_MISMATCH`(422가 아님 — 계정 A는 4xx 모두 `REJECTED`로 처리, 저장 없음) |
| 0.3 프로필을 0.2 요청으로 | 직접 | 400 `BAD_ANALYZER_VERSION` |
| 올바른 토큰 | **계정 A `HttpPlanAnalyzerClient`** | 합성 7건 × 2회 + 화면 시험 = Run 30건 모두 201 |
| 잘못된 토큰 | 계정 A Backend | §16 |

## 8. 합성 PDF·HWP·HWPX 파일 및 SHA

생성기(저장소, 원문 Binary는 저장소 밖 스크래치 `a19/fixtures/`):
- `e2e/assessment-railway/fixtures/synthetic_grade_plans.py` — 학년별 HTML(2099학년도 N학년 1학기, 학교명 '가상고', 과목 `가상과학탐구`·`가상사회탐구`·`가상융합탐구`, 평가 요약표·채점기준표·교수·학습 운영 계획표) → 계정 B 공개 생성기 `make_synthetic_hwp(x).py`를 **읽기 전용으로 불러** HWP·HWPX 생성(그 저장소에 쓰지 않음, 작업 후 `git status` 깨끗).
- `e2e/assessment-railway/fixtures/SyntheticGradePlanPdf.java` — PDFBox 3.0.5 + NanumGothic(SIL OFL), 같은 내용의 2쪽 PDF. PDFBox가 문서 ID를 새로 만들어 PDF 바이트는 매번 다르다 → 전송한 파일의 SHA를 manifest에 고정해 추적.
- 실제 학생·교사·학교명, 실제 문서 변형 없음. F02455·F01664·F02099 등 코퍼스는 원격에 보내지 않았다(원격 시험 도구는 manifest·이름 규칙·SHA가 맞지 않으면 전송 전 거절).

| ID | 파일 | 학년 | Byte | SHA-256 |
|---|---|---|---|---|
| SYN-G1-HWPX | synthetic-a19-g1.hwpx | 1 | 3118 | `486e4aa6f519be3929b352c6c7a6152057a2caa4a08e0fd4026e9b5b0a449d88` |
| SYN-G1-HWP | synthetic-a19-g1.hwp | 1 | 4096 | `28d41f41a4c7815a268103aa1928bcbf5784b69dc68f42b78c25b5618b4acf36` |
| SYN-G2-HWPX | synthetic-a19-g2.hwpx | 2 | 3112 | `c18460c2757b1e1d40012485ce1ee79f95d4cac9e02cc1ff5bc718c1666fdbc3` |
| SYN-G2-HWP | synthetic-a19-g2.hwp | 2 | 4096 | `37272f940087b077c13047363d9539f616b0e170b9be77e47e83f156097c0af9` |
| SYN-G3-HWPX | synthetic-a19-g3.hwpx | 3 | 3114 | `62e8f0ea0aa201fdeedf49589abb39aea58d7e74e607a293a6b3da84afffe50e` |
| SYN-G3-HWP | synthetic-a19-g3.hwp | 3 | 4096 | `91c4e1cfddc62d599a65e90ace115f13ed461c8c2481980579ce76973eb0b473` |
| SYN-G1-PDF | synthetic-a19-g1.pdf | 1 | 34261 | `d6d9bf3d559d238398446d2ec5f57b0d970a111eb3a9b057c2ee794599808890` |
| SYN-G2-PDF | synthetic-a19-g2.pdf | 2 | 33537 | `4bb62f41623c39e15601afcef887e9aa9e08a2e72c44357af2d37baae68a8b7a` |
| SYN-G3-PDF | synthetic-a19-g3.pdf | 3 | 34172 | `05b865c306ae68c73f7ff67aa5d3c6825c735c3ebf001844d7510d889f100a6b` |
| (비교) B 공개 `pdf-full` | synthetic-b17-pdf-full.pdf | 1 | 28255 | `c525ac5366d4525e626a08b6d45d45bb6c4d8278d685be23736da872a19d4301` |
| (415 시험) | synthetic-a19-unsupported.txt | — | 26 | — |

## 9. 분석 응답 및 DB 저장 결과 — **완료(Railway 실측)**

`e2e/assessment-railway/railway-api-check.mjs`(2회 실행, 두 번째 값):

| 문서 → 슬롯 | HTTP | 분석 상태 | Backend 전체 | 과목·원문 학년 | 수행평가 / 채점요소 / 근거 | 운영계획(정밀도·주 표기) |
|---|---|---|---|---|---|---|
| G1 PDF → 1학년 | 201 | PARTIAL | 1.37초 | 1 · [1] | 0 / 0 / 0 (반영 비율 60%·쪽 1은 있음) | 5행 (MONTH·MONTH_RANGE, 주 표기 3) |
| G2 PDF → 2학년 | 201 | PARTIAL | 1.01초 | 1 · [2] | 0 / 0 / 0 | 5행 |
| G1 PDF → 2학년(충돌) | 201 | PARTIAL | 1.19초 | 1 · [1] | 0 / 0 / 0 | 5행 |
| G3 HWPX → 3학년 | 201 | REVIEW_REQUIRED | 0.72초 | 1 · [3] | 2 / 3 / 10 (구조 위치) | 5행 (WEEK_IN_MONTH 포함, 주 표기 3) |
| G3 HWPX → 1학년(충돌) | 201 | REVIEW_REQUIRED | 0.76초 | 1 · [3] | 2 / 3 / 10 | 5행 |
| G2 HWP → 2학년 | 201 | REVIEW_REQUIRED | 0.71초 | 1 · [2] | 2 / 3 / 10 | 5행 |
| G3 PDF → 3학년 | 201 | PARTIAL | 1.17초 | 1 · [3] | 0 / 0 / 0 | 5행 |

- 모든 문서 `maxScore` 0 · `linkReview` 0 · issues 0.
- DB(정리 직전): Run 30건 = PARTIAL 18 · REVIEW_REQUIRED 12, 모두 B16 프로필 / 문서 Revision 32건(실패 시험 2건은 Run 없음) / **원문 SHA 32건 모두 manifest와 일치**. Backend는 분석기 응답 `source.sha256`이 원문과 다르면 `sha_mismatch`로 거절하므로(`PlanAnalysisService`), 저장된 30건은 원격이 같은 원문을 처리했다는 증거.
- 확정 평가정보 6 · 운영계획 확정 6(행 30) · `care_case` 0(Student Care 데이터와 섞이지 않음).

## 10. 학년별 관리자 확정 — **완료(Railway 실측 + 화면)**

| 학년 | 평가정보 | 운영계획 |
|---|---|---|
| 1 | G1 PDF `performanceEvaluation.weightPercent=60`(원문 1쪽) 200, 상세 재조회 값 유지 · 화면 확정 + 새로고침 후 '확정됨' | — |
| 2 | G2 PDF 200(API·화면) / G1 PDF를 2학년 슬롯에 → **400 `grade_conflict`**, 화면 과목 카드 '확정할 수 없어요' / G2 HWP → **400 `verified_auth_required`** | — |
| 3 | G3 PDF 200 / G3 HWPX → **400 `verified_auth_required`** | G3 HWPX·G3 PDF 5행 200, 화면 확정 + 새로고침 후 '확정됨' / G3 HWPX를 1학년 슬롯에 → 5행 모두 **400 `grade_conflict`**, 화면 '원문상 이 문서 학년이 아닌 과목의 행이 있어요' |

슬롯: 모든 등록에서 `available=true`, `source=DEV_DEMO_CATALOG`, 과목 수 13(1학년)·25(2학년)·41(3학년). 수행평가 항목·채점기준이 PDF에서 추출되지 않아 **PDF 채점기준·요소 배점 확정은 미검증**.

## 11. 학년별 학생 조회 — **완료(Railway 실측 + 화면)**

| 문서 | 1학년 | 2학년 | 3학년 | 다른 학교 3학년 |
|---|---|---|---|---|
| G1 PDF(1학년 확정) 상세 | **200**(확정값 1) | 404 | 404 | 404 |
| G2 PDF(2학년 확정) | 404 | **200** | 404 | 404 |
| G1 PDF(2학년 슬롯, 충돌) | 404 | 404 | 404 | 404 |
| G3 HWPX 운영계획 | 404 | 404 | **200**(5행) | 404 |
| G3 PDF 상세·운영계획 | 404 | 404 | **200** | 404 |
| G2 HWP(보호로 미확정) | 404 | 404 | 404 | 404 |

학생 응답에 `linkReview`·`grades`·`analysisSubjectIndex` 0건. 화면: 1·2학년 학생 '학교 평가 정보'에 자기 학년 문서만, 3학년 학생 Monthly Planner에 그 문서 영역(HWPX는 `3월 1주/2주` 주 띠, PDF는 `3월 전체` 월 띠 — 정밀도 그대로).

## 12. 학교·학년·학기별 접근 — **완료(Railway 실측)**

| 학생 | 자기 학교·학년·1학기 목록 | 2학기 목록 | 남의 학년 Query |
|---|---|---|---|
| 1학년 | 200, 1건 | 0건 | 403 |
| 2학년 | 200, 1건 | 0건 | 403 |
| 3학년 | 200, 4건 | 0건 | 403 |
| 다른 학교 3학년 | 200, 0건 | 0건 | 403 |

## 13. React 실제 화면 E2E — **완료(Railway + React 화면)**

`e2e/playwright.assessment-railway.config.ts` + `e2e/assessment-railway/railway-synthetic.spec.ts`(신규, opt-in, 합성 manifest 아니면 시작 거부) **4/4 통과**(48.7초, Edge).

| # | 요구 항목 | 결과 |
|---|---|---|
| 1 | 관리자 파일 업로드 | ✅ 등록 Dialog(1학년 1학기 필터) → 합성 PDF |
| 2 | 분석 진행 표시 | ✅ 진행 막대 + 버튼 `aria-busy`(브라우저→Backend 분석 요청만 1.5초 지연해 관찰). **관찰**: 서버 분석 경로에서는 버튼 문구가 '분석 중…'이 아니라 '올리는 중…'으로 남는다(`stage`가 분석기 직결 경로에서만 바뀜) — P3, 이번에 수정하지 않음 |
| 3 | 원격 분석 결과 로드 | ✅ Workspace, 프로필 B16 |
| 4 | 채점기준 확인 | ✅ HWPX 채점기준 후보 표(읽기 전용) · PDF는 '추출된 수행평가 없음' 표시 |
| 5 | 요소 배점 수정 | ❌ **미검증** — 편집기는 PDF 수행평가 항목에만 있는데 합성 PDF에서 항목 0건(HWP·HWPX 수행평가 단계는 읽기 전용) |
| 6 | 학년별 과목 선택 | ✅ 1·2·3학년 슬롯 과목 선택 |
| 7 | 학년 충돌 안내 | ✅ 과목 카드 안내 + 운영계획 확정 거절 안내 |
| 8 | 운영계획 확정 | ✅ 3학년 HWPX 5행 |
| 9 | 학생 평가정보 조회 | ✅ 1·2학년 |
| 10 | 학생 Monthly Planner | ✅ 3학년 |
| 11 | 다른 학년·학교 차단 | ✅ 평가정보·Planner 모두(로딩 완료 후 비교) |
| 12 | 새로고침 후 유지 | ✅ 관리자 '확정됨'·학생 화면 |

캡처(`e2e/test-results/` — Git 무시 경로, Commit 안 함): `a19-railway-wizard-g1-subjects.png`, `…-g2-grade-conflict.png`, `…-g3-hwpx-rubric.png`, `…-g3-teaching-confirmed.png`, `a19-railway-student-g1-plan.png`, `…-g2-plan.png`, `…-g3-planner.png`. 원문 글자 외 토큰·개인정보 없음(합성 문서).

## 14. HTTP 처리 시간·지연

| 구간 | 값 |
|---|---|
| 분석기 처리(`elapsedMs`, 직접) | 합성 PDF 692~695ms, 합성 HWPX 402ms |
| HTTPS 왕복(직접 curl, 업로드 28~35KB·응답 11~12KB) | PDF 1.18~1.19초, HWPX 0.99초, 오류 응답 0.41~0.46초 |
| Backend 전체(등록 뒤 `POST …/analysis`, 저장 포함) | PDF 1.01~1.37초, HWP·HWPX 0.71~0.76초 |
| 화면 시험 문서 1건(업로드→확정→학생 3~4명 확인) | 8~14초 |

원격 왕복은 120초(분석기)·150초(Backend) 제한보다 두 자릿수 이상 작다. 실제 학교 문서(수 MB, A18 로컬 최장 16.6초)의 원격 시간은 이번 범위에서 측정하지 않았다(실제 문서 원격 전송 금지).

## 15. Railway 메모리·CPU 확인 범위

계정 A가 확인한 것: Health의 설정 값(Worker 2048MB·동시 1·120초), 동시 2건 → 1건 200 + 1건 즉시 **503 `BUSY`**, 이후 Health 200(서비스 유지). 계정 A는 Railway 대시보드 권한이 없어 **실제 메모리·CPU·요금은 미확인**(B17 로컬 측정 추정: 컨테이너 최대 약 215MiB, JVM 힙 상한 640MB).

사용자 확인 요청(Railway → 서비스 → Metrics / Variables / Settings):
- Metrics: 이번 시험 시간대(2026-11-16 18:25~18:43 KST) 메모리 최대값·CPU 최대값
- Variables: `ANALYZER_ALLOWED_HOSTS`가 `learnershigh-assessment-analyzer-production.up.railway.app`만인지(외부에서 Host 위조 시험은 Railway Edge가 Host로 라우팅해 불가), `ANALYZER_TIMEOUT_SEC=120`, 세 Flag
- Settings → 자동 배포: 트리거 브랜치·`Wait for CI` 여부(Public 저장소 Push가 곧 배포)
- Plan·사용량: 추가 과금 여부

## 16. Timeout 및 오류 처리 — **완료(Railway 실측 + 로컬 회귀)**

| 경우 | 응답 | 소요 | Run·상태 | 학생 |
|---|---|---|---|---|
| Backend 잘못된 토큰 → 원격 401 | `503 PLAN_ANALYZER_UNAVAILABLE (analyzer_auth_failed)`, 재시도 없음(attempt=1) | 0.60초 | Run 없음, `NOT_REQUESTED`, `UNREVIEWED` | 404 |
| Backend 제한 300ms < 원격 왕복 | `503 PLAN_ANALYZER_UNAVAILABLE (timeout)`, 재시도 없음 | 0.36초 | Run 없음, `NOT_REQUESTED` | 404 |
| 원격 415 / 400(프로필) | 직접 확인(§7). Backend는 4xx를 `REJECTED`로 처리(기존 IT) | — | — | — |
| 원격 BUSY 503 | 직접 확인(§15). Backend는 BUSY만 최대 2회 재시도(기존 IT) | — | — | — |
| 원격 504·502 | **원격 Timeout 미발생**(원격 설정·Flag를 바꿔 장애를 만들지 않음) — A18 로컬 실측(분석기 5초 제한 → 502 `analysis_timeout`, Run 없음)과 아래 로컬 회귀로 대체 | — | — | — |

학생에게 미확정 데이터 비공개(위 404·확정 전 학생 목록 미포함).

## 17. Student Care 및 전체 회귀 — **완료(로컬 회귀)**

| 범위 | A18 기준 | A19 결과 | 분석기 |
|---|---|---|---|
| Backend Unit | 322 | **322, 실패 0**(생략 1) — `cleanTest`로 다시 실행 | — |
| Backend Integration | 203 | **203, 실패 0**(7분 55초, Testcontainers) | Stub·합성 |
| Assessment E2E | 23/23 | **23/23**(1.9분, Edge) | Stub |
| 실제 코퍼스 화면 시험 | 5/5 | **5/5** — `a18-grades` 3 + `b16-ext` 2 | **로컬** B17 `9a0155c` 사본(127.0.0.1:18870, 시작 스크립트가 원격 주소면 거부) |
| 원격 화면 시험(신규) | — | **4/4** | **Railway**, 합성 문서만 |
| Student Care Unit / IT | 145 / 77 | **145 / 77, 실패 0** | — |
| **Student Care Playwright E2E** | 미실행 | **7/7 통과**(11.5초) — README §22 절차(`e2e` Profile Backend :8080 + Admin preview :4174, 별도 일회용 DB `lh_a19_care`). 시험 코드 변경 없음, Chromium 미설치라 `PLAYWRIGHT_CHROMIUM_PATH`=설치된 Edge 실행 파일 | — |
| Frontend typecheck·lint·build | 통과 | **통과**(student·admin·shared), e2e typecheck 통과 | — |

- `a18-grades` 첫 실행 1건 실패 → 원인: 그 시험의 3번째 항목이 '다른 학년 학생에게도 자기 학년 확정 문서가 이미 있다'를 전제로 함(A18은 API 드라이버 `grades.mjs`를 먼저 실행). 같은 순서로 로컬 드라이버(F02455·F01664·F02099, 결과 A18과 같음)를 먼저 돌린 뒤 3/3 통과. 코드 회귀 아님 — 시험 간 데이터 의존(후속 개선 후보: 그 시험이 전제 데이터를 스스로 만들게).
- 실제 코퍼스 요청 15건은 로컬 분석기 로그에만 있고 원격으로 가지 않았다.

## 18. 기존 시연 DB 미접근 증거

- `learnershigh-mysql`: 작업 전후 `Exited (0)`(마지막 종료 그대로), 시작·연결하지 않았다. 이번 Backend의 `DB_URL`은 `127.0.0.1:33463/lh_a19_railway`만 허용(시작 스크립트가 다르면 거부), Flyway 로그 대상도 `lh_a19_railway`.
- Migration은 일회용 DB(15개, 새 Migration 없음)와 Testcontainers에만 적용. **A14 Migration은 시연 DB에 적용하지 않았다.**
- 정리: 원격 시험 Backend(3회 기동)·로컬 회귀 Backend·분석기·Student Care Backend·Vite/preview 모두 명령줄·PID 확인 뒤 종료, 일회용 DB 3개(`lh-a19-railway-mysql`·`lh-a19-local-mysql`·`lh-a19-care-mysql`, tmpfs·`--rm`) 삭제, 사용 포트 모두 닫힘. 다른 컨테이너는 만지지 않았다.

## 19. 변경 파일 목록

| 파일 | 내용 |
|---|---|
| `e2e/assessment-railway/fixtures/synthetic_grade_plans.py` | (5bfe58d) 신규 — 학년별 합성 HTML·HWP·HWPX + manifest(SHA) 생성기 |
| `e2e/assessment-railway/fixtures/SyntheticGradePlanPdf.java` | 신규 — 학년별 합성 PDF 생성기(PDFBox) |
| `e2e/assessment-railway/railway-api-check.mjs` | 신규 — 원격 API 실측 드라이버(합성 manifest·SHA 가드) |
| `e2e/assessment-railway/railway-failure-check.mjs` | 신규 — 원격 실패 경로(잘못된 토큰·Backend 제한) 드라이버 |
| `e2e/assessment-railway/railway-synthetic.spec.ts` | 신규 — 원격 화면 시험 4건 |
| `e2e/playwright.assessment-railway.config.ts` | 신규 — opt-in 설정(합성 manifest 아니면 시작 거부) |
| `e2e/tsconfig.json` | 위 두 경로를 typecheck에 포함(1줄) |
| 이 보고서 | 신규 |

- **Backend·Frontend 제품 코드, API 계약, DB Migration 변경 없음.** Student Care·PHP·계정 B 저장소 변경 없음(계정 B `git status` 0줄).
- 원문 Binary·토큰·DB 비밀번호·측정 JSON은 저장소 밖 스크래치 `a19/`(`fixtures/`·`result-api*.json`·`fail-*.json`·`db-summary.txt`·로그)에만 있다.
- 다른 담당자 미Commit 68건: 작업 전후 목록 비교 결과 차이는 위 신규·수정 파일뿐.

## 20. 미완료·외부 의존·최종 통합 준비 상태

### A19에서 실제로 확인한 사항
- Railway HTTPS(TLS)·토큰 인증(정상·없음·잘못됨)·415·프로필 오류·BUSY를 원격에서 직접 확인.
- 계정 A 실제 HTTP Client로 PDF·HWP·HWPX 합성 문서를 원격 분석 → 저장(원문 SHA 32/32·`sha_mismatch` 검사) → 1·2·3학년 확정 → 학생 조회 → 다른 학년·학교·학기 차단.
- 원격 오류 시 Run·확정 데이터 오염 없음(인증 실패·Timeout), 학생에게 미확정 비공개, 토큰 미노출.
- React 실제 화면 4/4(업로드·진행 표시·결과 로드·과목 선택·학년 충돌·운영계획 확정·학생 화면·새로고침 유지).

### 원격에서 미검증(합성 문서 한계)
- PDF 수행평가 항목·채점기준·항목 단위 원문 근거 → 화면 요소 배점 수정(B 공개 합성 PDF도 같은 결과).
- `maxScore`·`linkReview` 원격 실수신(합성 문서에 해당 신호 없음). 로컬 실제 코퍼스로는 A17·A18·이번 로컬 회귀에서 동작.
- 실제 학교 문서(수 MB) 원격 처리 시간·원격 504(실제 Timeout) — 실제 문서 원격 전송 금지 정책상 실행하지 않음.

### 계정 B에 전달할 사항
- 합성 PDF(B 공개 `pdf-full` 포함)에서 수행평가 항목 0건 — PDF 공개 시험에 수행평가 항목 단언을 추가하거나 합성 PDF Fixture 보완 제안. 원격 PDF 실행 환경 자체는 정상(PDFBox Java·2쪽·SHA 일치).
- 없는 0.3 프로필은 422가 아니라 400 `CONTRACT_PROFILE_MISMATCH` — 문서화 확인 요청(계정 A는 4xx 모두 저장 없이 거절하므로 동작 문제 없음).

### 사용자 확인 필요
- Railway Metrics(메모리·CPU 최대값), `ANALYZER_ALLOWED_HOSTS`, 자동 배포 트리거·`Wait for CI`, 요금(§15).
- 검증용 User 환경 변수 토큰 삭제(§4).

### 계정 A 후속(경미)
- [P3] 등록 Dialog의 서버 분석 경로에서 진행 문구가 '올리는 중…'으로 남는다(진행 막대·`aria-busy`는 정상). 이번 단계에서는 수정하지 않음.
- `a18-grades` 시험의 전제 데이터 의존 제거.

### 완규님 최신 `main`과의 통합 준비 상태 (병합하지 않음)

기준: 로컬에 있는 `origin/main` `43260e1`(2026-10-29 참조, 원격 fetch는 하지 않음 — 그 뒤의 `main`이 있으면 다시 평가 필요). merge-base `d5be566`(2026-10-14). 이 브랜치 95 Commit 앞섬, `main` 5 Commit(Student Care 성능·주간 개요·Mock 지표) 뒤짐.

| 항목 | 평가 |
|---|---|
| 충돌 예측(`git merge-tree`, 작업 트리·Ref 변경 없음) | **4파일 충돌**: `backend/src/main/resources/application.yml`, `frontend/admin/src/App.tsx`, `frontend/admin/src/app/AdminShell.tsx`, `frontend/admin/vite.config.ts`(공용 설정·Admin Shell — 양쪽이 같은 구역에 Route·메뉴·Proxy·설정을 추가). `api-contract.md`·`AdminShell.module.css`는 자동 병합 |
| Student Care 코드 | 이 브랜치의 Student Care Backend·Frontend 변경 **0파일** → 완규님 변경이 그대로 들어온다 |
| Migration | `main` 신규 2개(`V202610251000`·`V202610290800`)는 이 브랜치 Assessment Migration(`V202611090300`~`V202611160200`)보다 **버전이 낮다** → 새 DB는 순서대로 적용되지만, 이 브랜치 Migration을 이미 적용한 DB(일회용 제외, 예: 시연 DB)에는 Flyway가 '순서 밖'으로 거절할 수 있다 → 병합 전 적용 순서 결정 필요(사용자·완규님 합의) |
| 병합 후 필수 검증 | Backend Unit·IT 전체, Student Care Playwright E2E(이번에 실행 경로 확인: 7/7), Assessment Stub E2E, Admin Shell 메뉴(학생 케어·Assessment 둘 다) 화면 확인 |
| 판단 | **준비됨(조건부)** — Assessment 범위는 검증됐고 Student Care 침범 없음. 단 공용 4파일 수동 병합과 Migration 순서 결정은 완규님과 합의 후 진행. 이번 단계에서 병합·Rebase·Push 하지 않았다 |
