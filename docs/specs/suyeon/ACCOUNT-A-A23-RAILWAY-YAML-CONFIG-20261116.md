# [계정 A] A23 — Railway 분석기 연결을 application.yml에 고정 (2026-11-16)

> 작업 위치: 통합 Worktree `C:\learnershigh-assessment-integration` · `integration/assessment-studentcare-20261116` · Draft PR #17. 원본 `C:\learnershigh-extension` 미변경.
> 이 보고서는 토큰 값을 다시 적지 않는다(파일 경로만).

## 최종 판정 — **PASS**

환경 변수 없이 Railway 호출 정상 · 인증 성공 · 설정 바인딩 시험 통과 · Student Care·Assessment 기능 유지 · 필수 회귀 통과(불안정 시험·환경 실패는 재실행으로 구분, §16·§17) · PR 갱신. GitHub CI 결과는 §24.
A22에서 발견한 별도 결함(상담 양식 첫 글자 유실)과 기존 시연 DB Migration 문제는 이번 범위 밖으로 그대로 남는다(§25).

## 1. 시작 Git 상태

통합 Worktree HEAD `54a0acf`(= 원격), 작업 트리 깨끗. 원격 `main` `c03a1a4`. 원본 폴더 미Commit 68건(목록 저장). 지정 토큰은 A19~A22에서 Railway 인증에 성공한 User 환경 변수 값과 **같음**(값 출력 없이 비교).

## 2. 수정한 파일

| 파일 | 내용 |
|---|---|
| `backend/src/main/resources/application.yml` | `assessment.analyzer.*`, `analysis-import.contract03-enabled`, `multiformat.experimental` 추가 |
| `backend/src/test/resources/config/application.yml` (신규) | 시험 클래스패스 전용 — 분석기를 '미설정'·실험 기능 '꺼짐'으로 되돌림 |
| `backend/src/test/java/.../integration/analysis/PlanAnalyzerYamlConfigTest.java` (신규) | YAML 값·환경 변수 우선순위·시험 차단 3건 |
| `docs/specs/suyeon/assessment-analyzer-setup.md` | 설정 위치·우선순위·공개 토큰 위험·교체 방법 |
| `docs/specs/suyeon/assessment-studentcare-local-run-guide.md` | Railway 환경 변수 단계 제거, 남은 User 환경 변수 주의 |
| 이 보고서 | — |

제품 코드(Java·React) 변경 0. Student Care 파일 변경 0. Migration 변경 0.

## 3. application.yml 설정 구조

```yaml
assessment:
  ai: …                    # 기존
  storage: …               # 기존
  plan-review:
    structured-confirm-dev: ${ASSESSMENT_PLAN_REVIEW_STRUCTURED_CONFIRM_DEV:false}   # 기존 그대로 (보호 유지)
  demo-roster: …           # 기존
  analysis-import:
    enabled: ${ASSESSMENT_ANALYSIS_IMPORT_ENABLED:false}   # 기존
    contract03-enabled: true                               # 추가
  multiformat:
    experimental: true                                     # 추가
  analyzer:                                                # 추가
    base-url: https://learnershigh-assessment-analyzer-production.up.railway.app
    version: v21.1
    contract03-version: v21.10-b16-dev
    timeout-millis: 150000
    token: (실제 값)
```

## 4. 기존 설정과의 병합

기존 `assessment:` 블록 안에 넣었다(새 최상위 블록 없음). 기존 `analysis-import`에는 `contract03-enabled`만 더했다. 최상위 키는 `spring`·`server`·`app`·`assessment`·`learnershigh` 그대로이고, `assessment` 하위 키는 `ai`·`analysis-import`·`analyzer`·`demo-roster`·`multiformat`·`plan-review`·`storage`로 중복이 없다(PyYAML로 확인). 새 값은 `${…}` 없이 고정했고, Spring 규칙상 환경 변수·실행 인자가 계속 우선한다.

## 5~7. 분석기 URL · B16 프로필 · Timeout

| 항목 | 값 | 실측 |
|---|---|---|
| URL | `https://learnershigh-assessment-analyzer-production.up.railway.app` | Health 200(0.59초), 분석 요청 201 |
| 0.2 기본 프로필 | `v21.1`(그대로) | — |
| 0.3 프로필 | `v21.10-b16-dev` | 저장된 Run 13건 모두 `analyzer_profile=v21.10-b16-dev` |
| Timeout | `150000` | Unit 시험 확인. 환경 변수 300으로 덮어쓰면 0.38초에 `503 timeout`(§10) → 바인딩이 실제 Client에 적용됨 |

## 8. 토큰 하드코딩

적용함(사용자 지정 값 그대로, 대체·Placeholder 없음). **Public 저장소와 Git 이력에 공개**된다(사용자 명시 승인). Backend 로그 토큰 문자열 0건, API 응답·React·PHP에 없음. 문서·보고서에는 값을 다시 적지 않았다.

## 9. 환경 변수 없이 Backend 실행

실행 스크립트가 `ASSESSMENT_ANALYZER_*`·`ASSESSMENT_ANALYSIS_IMPORT_CONTRACT03_ENABLED`·`ASSESSMENT_MULTIFORMAT_EXPERIMENTAL`·`ASSESSMENT_PLAN_REVIEW_STRUCTURED_CONFIRM_DEV`를 **명시적으로 제거**한 독립 프로세스에서 `bootRun`(DB·시연 명단만 넣음, 일회용 DB). Migration 18개 적용 → 기동. 분석 요청이 Railway에서 201로 돌아와 `HttpPlanAnalyzerClient`가 YAML 값으로 만들어졌음을 확인(미설정이면 503 `PLAN_ANALYZER_NOT_CONFIGURED`). Student Care API·Assessment API 200.

**우선순위·충돌**:
- 실행 인자 > OS 환경 변수(Windows User 환경 변수 포함) > `application.yml`.
- 이 PC에는 A19 때 넣은 User 환경 변수 `ASSESSMENT_ANALYZER_TOKEN`이 남아 있다. 지금 값이 YAML과 **같아서 충돌은 없다.** 사용자 환경 변수는 지우거나 바꾸지 않았다(가이드에 확인 방법 안내).
- 환경 변수로 토큰을 틀린 값으로 주면 YAML보다 우선해 `503 analyzer_auth_failed`가 난다(§10 실측). Override 기능은 그대로 남아 있다.

## 10. Railway 인증 결과

| 경우 | 결과 |
|---|---|
| YAML 토큰(환경 변수 없음) | 인증 성공 — 합성 문서 7건 모두 201 |
| 환경 변수로 틀린 토큰 덮어쓰기 | `503 PLAN_ANALYZER_UNAVAILABLE (analyzer_auth_failed)`, Run 없음, `NOT_REQUESTED`, 학생 404, 응답·로그에 토큰 없음 |
| 환경 변수로 Timeout 300ms | `503 (timeout)` 0.38초, Run 없음 |
| BUSY·미지원 형식·프로필 오류·SHA 불일치 | 원격 장애를 만들지 않았다 — 기존 Unit·IT(Stub) 회귀로 확인(§16), A19 직접 실측(415·400·BUSY) 유효 |

## 11~13. 합성 문서 분석 · DB 저장·확정 · 학생 조회

A19 합성 manifest(SHA 가드)만 전송. `railway-api-check.mjs` 7건 + 화면 E2E 4건.

| 문서 → 슬롯 | 분석 | 확정 | 학생 |
|---|---|---|---|
| G1 PDF → 1학년 | 201 PARTIAL, 원문 1학년, 운영계획 5행 | 평가 비율 200 | 1학년 200 / 2·3학년·타교 404 |
| G2 PDF → 2학년 | 201 | 200 | 2학년만 200 |
| G1 PDF → 2학년 | 201 | **400 grade_conflict** | 모두 404 |
| G3 HWPX → 3학년 | 201 REVIEW_REQUIRED, 수행 2·채점 3·운영 5 | 운영계획 200 / 평가정보 **400 verified_auth_required** | Planner 3학년만 200 |
| G3 HWPX → 1학년 | 201 | 운영계획 **400 grade_conflict** | 404 |
| G2 HWP → 2학년 | 201 | 평가정보 **400 verified_auth_required** | 404 |
| G3 PDF → 3학년 | 201 | 평가 200·운영 200 | 3학년만 200 |

학생 목록: 자기 학교·학년·1학기만(1·1·2·0건), 남의 학년 Query 403, 2학기 0건. **Railway 화면 E2E 4/4**(업로드·진행 표시·원문 학년·확정·새로고침 유지·학년 충돌 안내·HWPX 운영계획·학생 Planner·다른 학년 차단).

## 14. Student Care 보존

Student Care 코드·설정 변경 0. Node 92/92. Backend Unit 180·IT 83(환경 실패 2건 재실행 통과). 인수 E2E는 GitHub CI e2e Job으로 확인(§24, A22 로컬 22 passed와 같은 시험).

## 15. Assessment 보존

Assessment 코드 변경 0. Unit 103·IT 103, Stub E2E 23/23(§17), Railway 4/4.

## 16. Backend 회귀

| 범위 | 결과 |
|---|---|
| Unit | **381/381**(생략 1) — 신규 `PlanAnalyzerYamlConfigTest` 3 포함, ArchUnit 24 |
| Integration | 207/209 + **2 환경 실패**(`StudentCareLockFailureApiTest`, 시험용 MySQL 컨테이너 기동 중 끊김 — A20·A22와 같은 클래스) → 단독 재실행 2/2 |
| 시험의 원격 호출 | 회귀 로그에 Railway 주소 0건 — `config/application.yml`이 분석기를 미설정으로 되돌림 |

## 17. Frontend 회귀

typecheck·lint·build 통과, Harness 통과, Student Care Node 92/92. **Assessment Stub E2E: 4회 실행 → 23/23은 4회차에 통과**:

| 회차 | 조건 | 결과 |
|---|---|---|
| 1 | YAML 기본값 | 22/23 — A12(채점기준 보완 후 새로고침 시 서버 초안 0개) |
| 2 | YAML 기본값 | 22/23 — A12 같은 지점 |
| 3 | 0.3 프로필·Timeout을 이전 기본값으로 덮어씀(대조) | 22/23 — **A13**(성장 기록 표시) |
| 4 | YAML 기본값 | **23/23** |

같은 설정에서 결과가 달라지므로 설정 변경으로 생긴 결함이 아니라 **불안정 시험**으로 판단한다(Stub 분석기는 요청 프로필과 무관하게 같은 결과를 준다). 이 시간대에 외부에서 `learnershigh-mysql`이 시작되는 등 부하가 있었다(§18). A12의 '임시 저장 직후 새로고침 → 서버 초안 0개'는 저장 완료와 새로고침 사이의 경쟁일 수 있어 후속 확인 대상이다. Stub E2E는 GitHub CI에 포함돼 있지 않다.

## 18. 기존 시연 DB 미변경

- 사용한 DB: 일회용 tmpfs MySQL(`lh-a23-mysql`, 127.0.0.1:33468)과 Testcontainers뿐이다. 작업 후 삭제했다.
- **관찰**: 기존 `learnershigh-mysql`(원본 폴더 Compose로 10-14 생성, 포트 3307)이 **23:29 KST(14:29:31 UTC)에 시작돼 실행 중**이다. A23 작업 중 이 컨테이너나 Compose를 다룬 명령은 없다. 사용자나 다른 작업이 켠 것으로 보인다. 연결·중지·변경하지 않았다.

## 19. 사용자 실행 가이드 변경

§4의 Railway 환경 변수 6종 설정을 지우고 "`application.yml`에서 자동 적용"으로 바꿨다. 남아 있는 User 환경 변수·창 환경 변수가 YAML을 덮어쓰는지 확인하는 명령을 추가했다. 토큰 입력 단계를 없앴다. 실제 학교 문서로 시험할 때는 Base URL을 로컬로 덮어쓰라는 경고를 넣었고, 체크리스트·문제 해결·검증 상태(A23 실측)도 갱신했다.

## 20. 개발자 설정 가이드 변경

§2를 'YAML 설정 위치'로, §3을 '공개 토큰'으로 바꿨다.
- §2: 키별 값과 덮어쓰는 환경 변수, 우선순위, 시험 클래스패스 차단.
- §3: Railway 토큰과 일치 필요, 공개·Git 이력 위험(누구나 호출 가능, BUSY로 분석이 막힐 수 있음), 교체 시 YAML과 Railway를 함께 바꿈, 공개를 원치 않게 될 때의 절차.

문서 내용은 실제 YAML·코드 키와 대조했다.

## 21. Git Commit

| Commit | 내용 |
|---|---|
| `01cd59e` | `chore(assessment): configure Railway analyzer directly in application.yml` — YAML·시험 전용 설정·설정 시험 |
| `8404b17` | 가이드 2개 |
| (이 보고서) | A23 보고서 |

## 22. GitHub Push

`54a0acf..5c307a3` Fast-forward(Force 없음, Push 직전 원격이 `54a0acf` 그대로임을 확인). GitHub Push Protection 차단 없음. 원격 `main` `c03a1a4` 그대로.

## 23. PR #17 업데이트

본문 맨 위에 A23 절을 추가하고 'Railway 설정' 절을 YAML 방식으로 바꿨다. 토큰 공개 사실과 Git 이력에 남는다는 점을 명시했다. 제목 유지, **Draft 유지**, Merge·Ready 전환 없음.

## 24. 최종 GitHub CI 결과

**`5c307a3`에서 모두 success**(Workflow 실행 2회 — push·pull_request): Harness / Repository Rules ×2, Frontend ×2, **Backend ×2**(Testcontainers — 로컬 환경 실패 2건은 재현되지 않음), **E2E (Playwright) ×2**(Student Care X′ 인수 + Admin Shell, YAML 변경 뒤 Backend로 실행), CI Result ×2.
(이 기록을 담은 문서 전용 Commit은 그 뒤에 Push된다.)

## 25. 미해결 사항

- **토큰 공개**: Public 저장소·Git 이력에 영구 노출(사용자 승인). 무효화하려면 Railway 토큰 교체가 필요하다.
- **YAML 기본값이 Railway를 가리킨다**: 실제 학교 문서·코퍼스용 로컬 시험(`playwright.assessment-real.config.ts` 등)은 반드시 `ASSESSMENT_ANALYZER_BASE_URL`을 로컬로 덮어써야 한다. A18의 실행 스크립트는 그렇게 하지만, 실수로 빠뜨리면 원격 전송된다. 막는 장치(예: real 설정이 Backend 대상을 확인)는 후속 제안이다.
- Stub E2E 불안정(A12 초안 새로고침, A13 성장 기록) — 후속 확인.
- 로컬 IT 환경 실패 2건(메모리, CI에서는 성공 이력 있음).
- A22 결함: 상담 양식 첫 글자 유실(완규님).
- 기존 시연 DB Migration(승인 필요), 실행 중인 `learnershigh-mysql`의 출처 확인(사용자).
- 기존 러너스하이 PHP 연동(범위 밖).
