# Assessment 평가계획서 분석기 연결 설정 (개발자 가이드)

> 상태: 개발·시연 설정 안내(2026-11-16, A20). 분석기 0.3 계약은 **EXPERIMENTAL/DEV**이며 운영 사용 전 팀 합의가 필요하다.
> 근거 코드: `backend/.../assessment/integration/analysis/PlanAnalyzerConfig.java`, `HttpPlanAnalyzerClient.java`, `service/plan/PlanAnalysisService.java`. 실측: `ACCOUNT-A-A19-RAILWAY-HTTPS-INTEGRATION-20261116.md`.

## 1. 구조

```text
관리자 React ──/api──▶ Spring Boot(Assessment) ──HTTPS + X-Analysis-Token──▶ 분석기(Railway)
                                     │
                                     └─ 결과 저장(DB) → 관리자 검토·확정 → 학생 조회
```

분석기는 **Spring Boot 서버만** 호출한다. React·PHP 등 브라우저나 다른 서버 코드는 분석기를 직접 부르지 않는다.

## 2. 환경 변수

Spring Boot는 환경 변수를 `assessment.analyzer.*` 설정으로 읽는다(Relaxed Binding). `application.yml`에는 값을 쓰지 않는다.

| 환경 변수 | 설정 키 | 시연 값 | 코드 기본값 | 의미 |
|---|---|---|---|---|
| `ASSESSMENT_ANALYZER_BASE_URL` | `assessment.analyzer.base-url` | `https://learnershigh-assessment-analyzer-production.up.railway.app` | (없음) | 분석기 주소. `/analyze-preview`를 붙여 호출 |
| `ASSESSMENT_ANALYZER_TOKEN` | `assessment.analyzer.token` | **서버 비밀 환경 변수** | (없음) | `X-Analysis-Token` 헤더 값 |
| `ASSESSMENT_ANALYZER_CONTRACT03_VERSION` | `assessment.analyzer.contract03-version` | `v21.10-b16-dev` | `v21.4-dev` | 0.3 계약 분석 프로필(B16 확장: 요소 배점·연결 확인·원문 학년) |
| `ASSESSMENT_ANALYZER_TIMEOUT_MILLIS` | `assessment.analyzer.timeout-millis` | `150000` | `130000` | Backend 대기 상한. 분석기 120초 + 30초 여유. Timeout은 재시도하지 않음 |
| `ASSESSMENT_ANALYSIS_IMPORT_CONTRACT03_ENABLED` | `assessment.analysis-import.contract03-enabled` | `true` | `false` | 0.3 계약 결과 수신 허용 |
| `ASSESSMENT_MULTIFORMAT_EXPERIMENTAL` | `assessment.multiformat.experimental` | `true` | `false` | HWP·HWPX 업로드 허용(평가정보 공식 확정은 별도 보호, §5) |
| `ASSESSMENT_ANALYZER_VERSION` | `assessment.analyzer.version` | **설정하지 않음** | `v21.1` | 0.2 기본 분석기 프로필. 0.3 프로필(`…CONTRACT03_VERSION`)과 같은 값이면 시작 거부 |
| (선택) `ASSESSMENT_ANALYZER_MAX_RETRIES` | `assessment.analyzer.max-retries` | — | `2` | 연결 실패·`503 BUSY`만 재시도 |

```dotenv
ASSESSMENT_ANALYZER_BASE_URL=https://learnershigh-assessment-analyzer-production.up.railway.app
ASSESSMENT_ANALYZER_CONTRACT03_VERSION=v21.10-b16-dev
ASSESSMENT_ANALYZER_TIMEOUT_MILLIS=150000
ASSESSMENT_ANALYSIS_IMPORT_CONTRACT03_ENABLED=true
ASSESSMENT_MULTIFORMAT_EXPERIMENTAL=true
ASSESSMENT_ANALYZER_TOKEN=<서버의 비밀 환경 변수 — 저장소·문서·PR에 쓰지 않는다>
```

분석기 쪽(Railway, 계정 B) 값은 이 저장소에서 바꾸지 않는다: `ANALYZER_TIMEOUT_SEC=120`, `ANALYZER_ENABLE_CONTRACT03=1`, `ANALYZER_ENABLE_B13=1`, `ANALYZER_ENABLE_CONTRACT03_EXT=1`, `ANALYZER_ALLOWED_HOSTS`, 토큰.

## 3. 토큰 설정 방법

### 로컬 개발 (Windows PowerShell)

토큰을 대화·터미널 기록·파일에 남기지 않도록, 별도 PowerShell 창에서 **현재 사용자 환경 변수**로 넣고 Backend를 그 값으로 띄운다.

```powershell
# 1회 설정 (값은 화면에 출력하지 않는다)
$s = Read-Host -AsSecureString   # 입력이 화면에 보이지 않는다 (Windows PowerShell 5.1 / PowerShell 7 공통)
[Environment]::SetEnvironmentVariable('ASSESSMENT_ANALYZER_TOKEN', [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)), 'User')
Remove-Variable s

# Backend를 띄우는 창에서 읽어 프로세스에만 넣는다
$env:ASSESSMENT_ANALYZER_TOKEN = [Environment]::GetEnvironmentVariable('ASSESSMENT_ANALYZER_TOKEN', 'User')
cd backend; .\gradlew.bat bootRun

# 검증이 끝나면 삭제
[Environment]::SetEnvironmentVariable('ASSESSMENT_ANALYZER_TOKEN', $null, 'User')
```

`.env`·`application*.yml`·`docker-compose.yml`·스크립트에 토큰을 쓰지 않는다(Git에 들어갈 수 있는 파일 전부).

### 실제 Spring Boot 서버

배포 플랫폼의 **Secret/환경 변수 기능**으로 `ASSESSMENT_ANALYZER_TOKEN`을 넣는다. 다른 값(§2)은 일반 환경 변수로 넣어도 된다. 토큰을 바꾸면 분석기(Railway)와 Backend 양쪽을 같은 값으로 갱신하고 Backend를 재시작한다.

## 4. 미설정·오류 시 동작

| 상황 | Backend 응답 | 저장 |
|---|---|---|
| `BASE_URL` 또는 `TOKEN` 없음 | `503 PLAN_ANALYZER_NOT_CONFIGURED` (조용히 다른 주소로 대체하지 않음) | 없음 |
| 토큰 불일치(분석기 401) | `503 PLAN_ANALYZER_UNAVAILABLE` · `analyzer_auth_failed` (재시도 안 함) | 없음 |
| Backend 대기 초과 | `503 PLAN_ANALYZER_UNAVAILABLE` · `timeout` (재시도 안 함) | 없음 |
| 분석기 자체 시간 초과(504) | `502 PLAN_ANALYZER_BAD_RESPONSE` · `analyzer_error:analysis_timeout` | 없음 |
| 분석기 `503 BUSY`(동시 처리 1) | 최대 2회 재시도 후 `503` | 없음 |
| 분석기 4xx(미지원 형식·프로필 오류) | 거절(`REJECTED`) | 없음 |
| 응답의 원문 SHA-256이 업로드 원문과 다름 | `502` · `sha_mismatch` | 없음 |

실패한 분석은 Run을 만들지 않고 문서 상태가 `NOT_REQUESTED`로 남으며, 학생에게는 확정된 값만 보인다.

## 5. 토큰을 React·PHP 코드에 넣지 않는 이유

- **브라우저로 내려간 값은 비밀이 아니다.** Vite의 `VITE_*` 변수는 빌드 결과 JavaScript에 그대로 들어가 누구나 개발자 도구로 읽을 수 있다. 토큰이 새면 누구나 분석기를 호출할 수 있다(분석기에는 요청 수 제한이 없고 동시 처리 1이라 쉽게 막힌다).
- **업로드 원문 검증·저장·권한 검사는 Backend의 책임이다.** 브라우저가 직접 부르면 SHA 대조, 관리자 학교·학년 권한, 결과 저장 규칙을 건너뛰게 된다.
- **PHP(기존 러너스하이)** 쪽에 넣으면 비밀이 두 곳에 퍼지고 교체 시 누락 위험이 생긴다. 기존 서비스 연동은 Spring Boot API를 경유한다(Integration Boundary, ADR-0002).

## 6. 이 설정과 별개로 남은 사항

- 실제 관리자 인증(지금은 개발용 Mock Header). HWP·HWPX 평가정보 공식 확정은 `ASSESSMENT_PLAN_REVIEW_STRUCTURED_CONFIRM_DEV=false`(기본) 그대로 `verified_auth_required`로 막힌다 — 실제 인증 연동 전 켜지 않는다.
- 기존 러너스하이 PHP 로그인·학생/학교/학년/학기·개설 과목 원천 연동(1팀 협업).
