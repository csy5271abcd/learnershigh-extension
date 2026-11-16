# [계정 A] A24 — Railway 인증 토큰은 application.yml 값만 사용 (2026-11-17)

> 작업 위치: 통합 Worktree `C:\learnershigh-assessment-integration` · `integration/assessment-studentcare-20261116` · Draft PR #17. 원본 `C:\learnershigh-extension` 미변경.
> 이 보고서는 토큰 값을 다시 적지 않는다. 토큰은 A23에서 넣은 값 그대로이며 새로 만들거나 바꾸지 않았다.

## 최종 판정 — **PASS**

`ASSESSMENT_ANALYZER_TOKEN` 환경 변수(없음·올바름·틀림·빈 값), 시스템 속성, 실행 인자 중 어느 것이 있어도 Railway 호출에는 `application.yml`의 토큰만 쓰인다. 단위 시험과 실제 Railway 호출로 확인했다. 다른 설정의 우선순위는 바뀌지 않았고, 시험이 Railway를 호출하지 않도록 한 보호도 유지된다. 필수 회귀는 모두 통과했다(환경 실패 1개 클래스는 재실행으로 구분, §12). GitHub CI 결과는 §14에 적는다.

## 1. 시작 Git 상태

- 통합 Worktree HEAD `0c4c071`(= 원격). 작업 트리는 깨끗했다.
- 원격 `main`은 `c03a1a4`.
- 원본 폴더의 미Commit 68건은 목록을 저장해 두었다.

## 2. 변경 파일

| 파일 | 내용 |
|---|---|
| `backend/.../assessment/integration/analysis/AnalyzerTokenSource.java` (신규) | 토큰을 설정 파일 소스에서만 읽는다 |
| `backend/.../assessment/integration/analysis/PlanAnalyzerConfig.java` | `@Value` 토큰 바인딩을 없애고 `AnalyzerTokenSource` 사용, 무시 안내 로그(이름만) |
| `backend/src/main/resources/application.yml` | 주석 2줄(token 예외 정책). **값은 변경 없음** |
| `backend/src/test/.../AnalyzerTokenSourceTest.java` (신규) | Case 1~6과 시스템 속성·실행 인자·자리표시자, 총 8건 |
| `backend/src/test/.../PlanAnalyzerYamlConfigTest.java` | 시험 이름만 바꿈('토큰 외 설정은 환경 변수 우선') |
| `e2e/playwright.assessment.config.ts` | Stub E2E: 환경 변수 토큰 대신 로컬 Stub이 YAML 토큰을 받게 함(§6) |
| `docs/specs/suyeon/assessment-analyzer-setup.md` | 우선순위·교체·문제 해결 |
| `docs/specs/suyeon/assessment-studentcare-local-run-guide.md` | 환경 변수 안내 |
| 이 보고서 | — |

다음 항목은 변경하지 않았다.
- `backend/src/test/resources/config/application.yml`(시험 전용 설정)
- `HttpPlanAnalyzerClient`
- Student Care
- Migration
- React·PHP

## 3. YAML 토큰 강제 적용 방식

`PlanAnalyzerConfig`는 더 이상 `@Value("${assessment.analyzer.token:}")`로 토큰을 받지 않는다. 대신 `AnalyzerTokenSource.resolve(ConfigurableEnvironment)`가 처리한다.

- Environment의 PropertySource를 우선순위 순서대로 돌면서, **설정 파일 소스**(Spring Boot Config Data가 만드는 `Config resource '…'` 이름)에 있는 `assessment.analyzer.token`만 읽는다.
- 예외적으로 시험 실행 중에만 생기는 소스인 `Inlined Test Properties`(`@SpringBootTest(properties)`)와 `Dynamic Test Properties`도 허용한다. 기존 Stub 분석기 시험이 시험용 토큰을 넣는 경로이고, 운영 실행에는 이 소스가 없다.
- 토큰 값은 Java 소스에 없다. 단일 원천은 설정 파일이다.
- 설정 파일의 토큰이 `${…}` 자리표시자이면 기동을 거부한다. 자리표시자는 환경 변수를 다시 끌어올 수 있기 때문이다. 예외 메시지에 값은 넣지 않는다.
- `HttpPlanAnalyzerClient`는 그대로다. `X-Analysis-Token` 헤더 방식도 같다.

## 4. 환경 변수 무시 구현

다음 소스는 토큰 조회에서 건너뛴다.
- `systemEnvironment`: 현재 창의 환경 변수와 Windows User 환경 변수를 모두 포함한다.
- `systemProperties`: `-D`로 넣은 값이다.
- `commandLineArgs`: `--`로 넣은 값이다.

그래서 값이 무엇이든(올바름·틀림·빈 문자열) 토큰은 바뀌지 않는다. 덮어쓰기 시도가 있으면 기동 로그에 다음 한 줄만 남긴다. 값은 출력하지 않는다.

`plan analyzer token override ignored (ASSESSMENT_ANALYZER_TOKEN / assessment.analyzer.token): the token comes from the config file (application.yml) only`

## 5. Spring 설정 우선순위 변경 범위

변경 대상은 `assessment.analyzer.token` **한 키**뿐이고, 이 키를 읽는 곳은 `PlanAnalyzerConfig` 하나다(`grep`으로 확인). Environment 자체나 다른 키의 우선순위는 그대로다. 다음 값은 여전히 환경 변수가 YAML보다 우선한다(시험 Case 6, `PlanAnalyzerYamlConfigTest`).
- `DB_*`
- `ASSESSMENT_ANALYZER_BASE_URL`
- `ASSESSMENT_ANALYZER_CONTRACT03_VERSION`
- `ASSESSMENT_ANALYZER_TIMEOUT_MILLIS`

설정 파일끼리는 Spring 순서를 따른다. 따라서 Jar 옆의 `config/application.yml` 같은 외부 **설정 파일**은 토큰을 바꿀 수 있다. 이것도 YAML 설정 파일이라 이번 요구('YAML에 지정된 토큰')와 충돌하지 않는다고 판단해 막지 않았다(§17).

## 6. 시험에서 실제 Railway 호출 차단

- 시험 클래스패스의 `config/application.yml`도 설정 파일이다. 그래서 거기 적힌 빈 토큰이 main YAML보다 우선하고, 시험에서는 계속 '미설정' Client(503)가 된다. Case 5에서 잘못된 환경 변수가 있어도 `UnconfiguredPlanAnalyzerClient`가 됨을 확인했다.
- 전체 회귀 로그와 시험 결과 XML에서 Railway 주소는 0건이다.
- Stub 시험(`PlanServerAnalysisApiTest` 등)은 `@SpringBootTest(properties)`로 시험 토큰을 넣고, 주소는 `@DynamicPropertySource`로 로컬 Stub을 가리킨다. 계속 통과한다.
- **발견·수정한 영향**: Assessment Stub E2E 설정은 Backend에 `ASSESSMENT_ANALYZER_TOKEN`으로 Stub 토큰을 넣고 있었다. 이제 이 값이 무시되므로 그대로 두면 401로 깨진다.
  - 수정: E2E 설정이 main `application.yml`의 토큰을 읽어 **127.0.0.1의 로컬 Stub**에 넘기도록 했다. 값은 출력하지 않는다.
  - 주소는 여전히 로컬 Stub을 가리키므로 원격 전송은 없다.
  - 이 환경 변수를 쓰는 다른 곳은 저장소에 없다(`grep`으로 확인).

## 7. 잘못된 환경 변수가 있어도 YAML 토큰을 쓰는지

**쓴다.**

| 확인 | 결과 |
|---|---|
| 단위 시험 Case 2·3·4, 시스템 속성·실행 인자 | Client 토큰이 YAML 토큰과 같다(참/거짓만 단언). 대조로 `Environment.getProperty`(예전 `@Value` 방식)는 환경 변수 값을 돌려준다 |
| 변이 시험 | 소스 필터를 '모두 허용'으로 바꾸면 3건이 실패한다. 시험이 실제로 동작을 잡는다는 뜻이다. 원복을 확인했다 |
| 실제 Backend ①: 틀린 `ASSESSMENT_ANALYZER_TOKEN` | Railway 분석 7건 모두 201 |
| 실제 Backend ②: 빈 환경 변수 + 틀린 `--assessment.analyzer.token` | Railway 분석 201 |
| 실제 Backend ③: Student Care E2E 실행 중 틀린 환경 변수 | 무시 안내 1줄, 동작 정상 |

세 로그 모두 실제 토큰과 틀린 토큰 문자열이 0건이다.

## 8. Railway HTTPS 실제 인증

| 항목 | 결과 |
|---|---|
| Health | 200 |
| 인증 | 성공: Backend ①에서 7건, ②에서 1건 |
| 프로필 | `v21.10-b16-dev` |
| 사용한 DB | 일회용 tmpfs MySQL `lh_a24`(Migration 18개 적용 후 기동). 작업 후 삭제 |

## 9. PDF·HWP·HWPX 분석 결과

전송한 문서는 A19의 합성 manifest(SHA 가드)뿐이다.

| 문서 → 슬롯 | 분석 | 확정 | 학생 |
|---|---|---|---|
| G1 PDF → 1학년 | 201 PARTIAL, 운영계획 5행 | 200 | 1학년만 200 |
| G2 PDF → 2학년 | 201 | 200 | 2학년만 200 |
| G1 PDF → 2학년 | 201 | 400 `grade_conflict` | — |
| G3 HWPX → 3학년 | 201 REVIEW_REQUIRED, 수행 2·운영 5 | 운영 200 / 평가 400 `verified_auth_required` | Planner 3학년만 200 |
| G3 HWPX → 1학년 | 201 | 400 `grade_conflict` | — |
| G2 HWP → 2학년 | 201 | 평가 400 `verified_auth_required` | — |
| G3 PDF → 3학년 | 201 | 200·200 | 3학년만 200 |

- 학생 목록: 자기 학년만(1·1·2건). 다른 학년 Query는 403, 타교는 0건.
- **Railway 화면 E2E 4/4** — 업로드, 확정, 학생 Planner, 학년 충돌 안내.

## 10. Student Care 기능 보존

Student Care 코드 변경은 0건이다.

| 시험 | 결과 |
|---|---|
| Node 시험 | 92/92 |
| Backend Unit·IT(Student Care 포함) | §12 |
| Student Care 인수 Playwright(로컬, CI와 같은 구성) | **22 passed** |

Playwright 실행 구성: 일회용 MySQL, bootJar + `care-demo,e2e` Profile, 합성 Seed 100명, admin preview 4174, Edge.
- 범위: X′, 학습관별, 학생 상세, 상담 기록, 관리 기준, 사진 관찰 연결 실패, 학부모 리포트, Admin Shell(메뉴 3개, `/` → 학생 케어, 구형 주소 '페이지 없음').
- 알려진 결함(상담 양식 첫 글자 유실)은 `test.fail`이라 예상대로 실패했다. 수정하지 않았다.
- 첫 실행은 Playwright 기본 Chromium이 이 PC에 없어 22건 모두 브라우저 실행 실패였다(시험은 0건 실행된 환경 실패). Edge 경로를 지정해 다시 실행했다.

## 11. Assessment 기능 보존

Assessment 제품 코드는 분석기 설정 클래스만 바뀌었다.

| 시험 | 결과 |
|---|---|
| Assessment Unit·IT | 통과(§12) |
| Stub E2E | **23/23**. Backend에 틀린 `ASSESSMENT_ANALYZER_TOKEN`을 일부러 넣은 상태에서 실행했다 |
| Railway E2E | 4/4 |

- 업로드, 분석, 검토·확정, 학년별 평가정보, 학생 평가정보, Monthly Planner, 권한, HWP/HWPX 보호가 모두 유지된다.
- A23의 불안정 시험(A12·A13)은 이번 1회 실행에서 재현되지 않았다. 원인을 고치지 않았으므로 '해결'이 아니라 '이번에 재현 안 됨'이다.

## 12. Backend 회귀

| 범위 | 결과 |
|---|---|
| Unit | **389/389**(생략 1). A23의 381 + 신규 8 |
| ArchUnit | 포함 통과 |
| 설정 바인딩 시험 | 통과 — `PlanAnalyzerYamlConfigTest` 3, `PlanAnalyzerEnvBindingTest` 2 |
| HTTP Client 시험 | `HttpPlanAnalyzerClientTest` 8 통과 |
| Integration | 207/209 + **2건 환경 실패**(`StudentCareLockFailureApiTest`) → 단독 재실행 2/2 통과 |
| 신규 독립 DB 기동 | Migration 18개 적용 후 기동(§8) |

IT 환경 실패의 원인은 시험용 MySQL 컨테이너가 기동 중 종료된 것이다(`Container exited with code 1`, `cannot be accessed`). A20·A22·A23과 같은 클래스이고, 이번 변경과는 무관하다. 이 클래스 로그에 분석기 설정 흔적은 0건이다.

## 13. Frontend 회귀

| 항목 | 결과 |
|---|---|
| typecheck·lint·build | 통과 |
| e2e typecheck | 통과 |
| Harness `verify.ps1` | 통과 |
| Student Care Node | 92/92 |
| Student Care Playwright | 22 passed |
| Assessment Stub E2E | 23/23 |
| Railway 합성 E2E | 4/4 |

## 14. GitHub CI

**`1841b3c`에서 모두 success**(push·pull_request 2회): Harness ×2, Frontend ×2, Backend ×2(Testcontainers — 로컬 환경 실패 2건은 재현되지 않음), E2E (Playwright) ×2, CI Result ×2.
이 기록을 담은 문서 전용 Commit은 그 뒤에 Push되며 CI 결과는 확인하지 않는다(미확인 Commit).

## 15. Commit 및 Push

| Commit | 내용 |
|---|---|
| `757ab0a` | `fix(assessment)`: 토큰 YAML 전용(`AnalyzerTokenSource`, Config, 시험, Stub E2E 설정) |
| `1841b3c` | 가이드 2개 + 이 보고서 |
| (이 기록) | CI 결과 기록 |

`0c4c071..1841b3c` Fast-forward(Force 없음, Push 직전 원격이 `0c4c071` 그대로임을 확인). 원격 `main` `c03a1a4` 그대로.

## 16. PR #17 갱신

본문 맨 위에 A24 절을 추가하고 'Railway 설정' 절에 토큰 정책을 반영했다. 제목 유지, **Draft 유지**, Merge·Ready 전환 없음.

## 17. 남은 문제

- **토큰 공개**: A23부터 Public 저장소와 Git 이력에 공개되어 있다(사용자 승인). 무효화하려면 Railway 토큰을 교체하고 YAML도 함께 바꿔야 한다. A24부터는 환경 변수로 임시 교체할 수 없다. 운영에서 Secret으로 넣으려면 정책을 다시 결정해야 한다.
- **외부 설정 파일은 토큰을 바꿀 수 있다**: `--spring.config.location`, `SPRING_CONFIG_ADDITIONAL_LOCATION`, Jar 옆 `config/application.yml` 같은 경로다. '설정 파일만 허용' 정책의 경계이며, 설정 파일 위치를 고르는 것은 Spring 기본 동작이라 막지 않았다. main `application.yml` 하나로만 묶을지는 사용자 결정이 필요하다.
- **YAML 기본 주소가 Railway다**: 실제 학교 문서나 코퍼스로 시험할 때는 반드시 `ASSESSMENT_ANALYZER_BASE_URL`을 로컬로 덮어써야 한다. 이 키는 계속 덮어쓸 수 있다.
- Stub E2E 불안정(A12·A13)은 이번 1회에서 재현되지 않았지만 원인은 미확인이다.
- 로컬 IT 환경 실패 2건(컨테이너).
- A22 결함: 상담 양식 첫 글자 유실(완규님 담당, 미변경).
- 기존 시연 DB Migration(승인 필요, 미변경).
- 기존 러너스하이 PHP 연동(범위 밖).
