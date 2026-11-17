# Assessment 평가계획서 분석기 연결 설정 (개발자 가이드)

> 상태: 개발·시연 설정 안내(2026-11-16, A20 작성 · A23 갱신 — 연결값을 `application.yml`에 고정 · A24 갱신 — **토큰은 YAML 값만 사용, 환경 변수 무시**). 분석기 0.3 계약은 **EXPERIMENTAL/DEV**이며 운영 사용 전 팀 합의가 필요하다.
> 근거 코드: `backend/.../assessment/integration/analysis/PlanAnalyzerConfig.java`, `HttpPlanAnalyzerClient.java`, `service/plan/PlanAnalysisService.java`. 실측: `ACCOUNT-A-A19-RAILWAY-HTTPS-INTEGRATION-20261116.md`.

## 1. 구조

```text
관리자 React ──/api──▶ Spring Boot(Assessment) ──HTTPS + X-Analysis-Token──▶ 분석기(Railway)
                                     │
                                     └─ 결과 저장(DB) → 관리자 검토·확정 → 학생 조회
```

분석기는 **Spring Boot 서버만** 호출한다. React·PHP 등 브라우저나 다른 서버 코드는 분석기를 직접 부르지 않는다.

## 2. 설정 위치 — `application.yml` (A23)

2026-11-16 사용자 결정으로 분석기 연결값을 `backend/src/main/resources/application.yml`에 **고정**했다. **Railway 연결용 환경 변수를 따로 설정하지 않아도** Spring Boot를 실행하면 `HttpPlanAnalyzerClient`가 만들어지고, 모든 분석 요청에 `X-Analysis-Token` 헤더가 자동으로 붙는다. DB 연결(`DB_URL`·`DB_USERNAME`·`DB_PASSWORD`)은 계속 환경 변수로 넣는다.

```yaml
assessment:
  analysis-import:
    contract03-enabled: true          # analysis-import-0.3 결과 수신 (B16 확장 필드 maxScore·linkReview·grades)
  multiformat:
    experimental: true                # HWP·HWPX 업로드·분석 (평가정보 '공식 확정'은 별개 — §5)
  analyzer:
    base-url: https://learnershigh-assessment-analyzer-production.up.railway.app
    version: v21.1                    # 0.2 기본 분석기 프로필 (그대로)
    contract03-version: v21.10-b16-dev  # 0.3 B16 확장 프로필 — version과 같은 값이면 시작 거부
    timeout-millis: 150000            # 분석기 120초 + 30초 여유, Timeout은 재시도하지 않음
    token: <실제 Railway 토큰 — 파일에 직접 들어 있다>
```

| 설정 키 | 값 | 덮어쓰는 환경 변수 |
|---|---|---|
| `assessment.analyzer.base-url` | Railway 주소 | `ASSESSMENT_ANALYZER_BASE_URL` |
| `assessment.analyzer.token` | 실제 토큰 | **없음 — 덮어쓸 수 없다(A24)**. `ASSESSMENT_ANALYZER_TOKEN`·`-Dassessment.analyzer.token`·`--assessment.analyzer.token`은 무시 |
| `assessment.analyzer.contract03-version` | `v21.10-b16-dev` | `ASSESSMENT_ANALYZER_CONTRACT03_VERSION` |
| `assessment.analyzer.version` | `v21.1` | `ASSESSMENT_ANALYZER_VERSION` |
| `assessment.analyzer.timeout-millis` | `150000` | `ASSESSMENT_ANALYZER_TIMEOUT_MILLIS` |
| `assessment.analysis-import.contract03-enabled` | `true` | `ASSESSMENT_ANALYSIS_IMPORT_CONTRACT03_ENABLED` |
| `assessment.multiformat.experimental` | `true` | `ASSESSMENT_MULTIFORMAT_EXPERIMENTAL` |
| `assessment.analyzer.max-retries` | (코드 기본 `2`) | `ASSESSMENT_ANALYZER_MAX_RETRIES` |

**우선순위**
- **토큰(A24)**: 설정 파일(`application.yml`, Spring Config Data 파일)의 값만 쓴다. `AnalyzerTokenSource`가 Environment에서 설정 파일 소스만 골라 읽는다. 그래서 `ASSESSMENT_ANALYZER_TOKEN`(현재 창·Windows User 환경 변수)이 있든, 올바르든, 틀리든, 빈 문자열이든 **무시된다**. 시스템 속성·실행 인자도 같다. 덮어쓰기를 시도하면 기동 로그에 이름만 한 줄 남긴다: `plan analyzer token override ignored (…)` (값은 출력하지 않음). **이 환경 변수는 설정할 필요도, 지울 필요도 없다.** YAML 토큰에 `${…}` 자리표시자를 쓰면 기동을 거부한다(환경 변수를 다시 끌어오지 못하게).
- **그 밖의 키**: Spring Boot 기본 규칙 그대로 — 실행 인자 > OS 환경 변수(`ASSESSMENT_ANALYZER_BASE_URL` 등) > `application.yml`. 주소·프로필·Timeout은 덮어쓸 수 있다.
- **실제 학교 문서·기존 코퍼스(F0xxxx)로 시험할 때는 반드시 `ASSESSMENT_ANALYZER_BASE_URL`을 로컬 분석기로 덮어쓴다.** 기본 주소가 Railway라서 덮어쓰지 않으면 원문이 원격으로 간다(원격 전송 금지 정책).
- 시험 클래스패스(`backend/src/test/resources/config/application.yml`)는 분석기를 '미설정'으로 되돌린다(토큰 빈 값도 설정 파일이라 그대로 적용된다) — `@SpringBootTest`가 원격으로 요청을 보내지 않고, A22까지의 시험 기본값(503·실험 기능 꺼짐)이 그대로 유지된다. Stub 분석기 시험은 `@SpringBootTest(properties)`(시험 실행 중에만 있는 소스)로 시험용 토큰을 넣는다. 이 파일은 Jar에 들어가지 않는다.

분석기 쪽(Railway, 계정 B) 값은 이 저장소에서 바꾸지 않는다: `ANALYZER_TIMEOUT_SEC=120`, `ANALYZER_ENABLE_CONTRACT03=1`, `ANALYZER_ENABLE_B13=1`, `ANALYZER_ENABLE_CONTRACT03_EXT=1`, `ANALYZER_ALLOWED_HOSTS`, `CURRICULUM_ANALYSIS_TOKEN`.

## 3. 토큰 — 공개 저장소에 포함됨 (사용자 승인 사항)

- `application.yml`의 `token`은 **실제 Railway 인증 값**이며 Railway `CURRICULUM_ANALYSIS_TOKEN`과 같아야 한다(A23에서 실제 인증 요청으로 일치 확인).
- **보안상 위험**: 이 저장소는 Public이다. 토큰은 파일과 **Git 이력**에 남아 누구나 읽을 수 있고, 이후 파일에서 지워도 이력에서는 사라지지 않는다. 토큰을 아는 사람은 누구나 분석기를 호출할 수 있다(요청 수 제한 없음, 동시 처리 1 → 남이 계속 호출하면 `BUSY`로 우리 분석이 막힐 수 있다). 2026-11-16 사용자가 이 위험을 알고 명시적으로 승인했다.
- **토큰 교체**: Railway `CURRICULUM_ANALYSIS_TOKEN`과 `application.yml`의 `assessment.analyzer.token`을 **함께** 바꾸고 Backend를 다시 빌드·재시작한다(환경 변수로는 바꿀 수 없다). 한쪽만 바꾸면 `503 analyzer_auth_failed`.
- 공개를 원하지 않게 되면: Railway 토큰을 새 값으로 교체하고(공개된 값은 무효화), 비공개 설정 파일로 옮긴다. A24부터 환경 변수는 토큰으로 쓰이지 않으므로, 서버 밖 설정 파일(예: Jar 옆 `config/application.yml` — 이것도 설정 파일이라 읽힌다)을 쓰거나 `AnalyzerTokenSource` 정책을 바꾼다(사용자 결정 필요).
- 토큰은 로그·API 응답·React·PHP 코드에 넣지 않는다(§5). Backend 로그에는 토큰 값이 출력되지 않는다(A23 실측: 로그 검색 0건).

## 4. 미설정·오류 시 동작

| 상황 | Backend 응답 | 저장 |
|---|---|---|
| 실제 적용된 주소가 비었거나(예: `ASSESSMENT_ANALYZER_BASE_URL=`) 설정 파일에 토큰이 없음 | `503 PLAN_ANALYZER_NOT_CONFIGURED` (조용히 다른 주소로 대체하지 않음) | 없음 |
| 토큰 불일치(분석기 401) — YAML 토큰과 Railway 토큰이 다름(환경 변수로는 생기지 않음) | `503 PLAN_ANALYZER_UNAVAILABLE` · `analyzer_auth_failed` (재시도 안 함) | 없음 |
| Backend 대기 초과 | `503 PLAN_ANALYZER_UNAVAILABLE` · `timeout` (재시도 안 함) | 없음 |
| 분석기 자체 시간 초과(504) | `502 PLAN_ANALYZER_BAD_RESPONSE` · `analyzer_error:analysis_timeout` | 없음 |
| 분석기 `503 BUSY`(동시 처리 1) | 최대 2회 재시도 후 `503` | 없음 |
| 분석기 4xx(미지원 형식·프로필 오류) | 거절(`REJECTED`) | 없음 |
| 응답의 원문 SHA-256이 업로드 원문과 다름 | `502` · `sha_mismatch` | 없음 |

실패한 분석은 Run을 만들지 않고 문서 상태가 `NOT_REQUESTED`로 남으며, 학생에게는 확정된 값만 보인다.

## 5. 토큰을 React·PHP 코드에 넣지 않는 이유 (Backend YAML에 둔 지금도 같다)

- **브라우저로 내려간 값은 비밀이 아니다.** Vite의 `VITE_*` 변수는 빌드 결과 JavaScript에 그대로 들어가 누구나 개발자 도구로 읽을 수 있다. 토큰이 새면 누구나 분석기를 호출할 수 있다(분석기에는 요청 수 제한이 없고 동시 처리 1이라 쉽게 막힌다).
- **업로드 원문 검증·저장·권한 검사는 Backend의 책임이다.** 브라우저가 직접 부르면 SHA 대조, 관리자 학교·학년 권한, 결과 저장 규칙을 건너뛰게 된다.
- **PHP(기존 러너스하이)** 쪽에 넣으면 비밀이 두 곳에 퍼지고 교체 시 누락 위험이 생긴다. 기존 서비스 연동은 Spring Boot API를 경유한다(Integration Boundary, ADR-0002).

## 6. 이 설정과 별개로 남은 사항

- 실제 관리자 인증(지금은 개발용 Mock Header). HWP·HWPX 평가정보 공식 확정은 `ASSESSMENT_PLAN_REVIEW_STRUCTURED_CONFIRM_DEV=false`(기본) 그대로 `verified_auth_required`로 막힌다 — 실제 인증 연동 전 켜지 않는다.
- 기존 러너스하이 PHP 로그인·학생/학교/학년/학기·개설 과목 원천 연동(1팀 협업).
