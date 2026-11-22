# A27-UX 로컬 실행 보고서 — Backend · 학생 · 관리자 Frontend (2026-11-21)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_LocalRun_Student_Admin_Backend_ClaudeCode_20261121.md`
- 작업 위치: `C:\learnershigh-assessment-integration`. 원본 `C:\learnershigh-extension`은 변경하지 않았다(변경 목록 68건 그대로).
- 비밀값(DB 계정·암호)은 이 문서·콘솔·로그 어디에도 쓰지 않았다.

## ① 최종 판정

| 서비스 | 판정 | 근거 |
|---|---|---|
| Backend (8080, `local-run`) | **PASS** | 사용자 DB 연결(Hikari), Flyway 'up to date'(신규 적용 0), `Started LearnersHighExtensionApplication`, 8080 LISTEN, HTTP 응답(401 JSON) |
| 관리자 Frontend (5174) | **PASS** | Vite 5174 LISTEN, `/assessment` 200, `/api` Proxy → 8080 확인(Backend와 같은 401 JSON 본문) |
| 학생 Frontend (5173) | **PARTIAL** | Vite 5173 LISTEN, `/assessment` 200. 저장소 기본 설정으로는 **Mock 데이터 모드이고 Backend에 연결되지 않는다**(⑨-1). 연결 모드는 데이터 변경 위험이 있어 사용자 결정으로 남겼다 |

세 서버는 **계속 실행 중**이다(⑥).

## ② 실행 환경

| 항목 | 값 |
|---|---|
| Worktree · Branch · HEAD | `C:\learnershigh-assessment-integration` · `integration/assessment-studentcare-20261116` · `9755581` (staged 0, M 149 · D 14 · ?? 163 — 이 보고서 1개 추가 외 변경 없음) |
| MySQL | Docker `lh-local-run-mysql` (실행 중, `127.0.0.1:33307→3306`), DB `lh_local_run`, 컨테이너 환경에 `MYSQL_USER`·`MYSQL_PASSWORD`·`MYSQL_DATABASE` 있음(값 미출력) |
| Java | PATH의 `java -version` = OpenJDK 17. Backend는 Gradle 도구체인으로 실행됨(프로젝트 Java 21) |
| Node | v22.22.2, Vite 8.3.4 |

## ③ 이전 오류 분석

| 오류 | 원인 | 해결 |
|---|---|---|
| A. `'url' must start with "jdbc"` | `application.yml`의 datasource는 `url: ${DB_URL}`·`username: ${DB_USERNAME}`·`password: ${DB_PASSWORD}`이다. Gradle을 실행한 프로세스에 `DB_URL`이 없거나 JDBC 형식이 아니면, Spring이 자리표시자(`${DB_URL}`)나 그 값을 그대로 URL로 넘겨 이 오류가 난다 | 같은 프로세스에서 `DB_URL=jdbc:mysql://127.0.0.1:33307/lh_local_run?serverTimezone=Asia/Seoul&characterEncoding=UTF-8` 설정 |
| B. `Access denied for user '${DB_USERNAME}'@'172.17.0.1'` (1045) | URL만 고쳐졌고 `DB_USERNAME`(그리고 `DB_PASSWORD`)이 그 프로세스에 없어 **문자 그대로 `${DB_USERNAME}`** 이 사용자명으로 전달됐다. `172.17.0.1`은 Docker 브리지를 거쳐 MySQL에 실제로 도달했다는 뜻이다(네트워크·컴파일 문제 아님). 흔한 원인은 다른 PowerShell 창에서 `$env:`를 설정했거나 `SPRING_DATASOURCE_URL`만 설정한 경우다 | 실행 스크립트가 **자기 프로세스 안에서** `DB_USERNAME`·`DB_PASSWORD`를 컨테이너 환경(`MYSQL_USER`·`MYSQL_PASSWORD`)에서 메모리로만 읽어 설정한 뒤 바로 `gradlew bootRun`을 실행한다(값 미출력, 영구 저장 없음) |

- 재현 여부: 이번 실행에서는 두 오류 모두 **재현되지 않았다**(첫 시도에 기동 성공).

## ④ 실제 실행한 명령 (순서대로, 비밀값은 환경 변수 이름으로 표기)

```powershell
# 1. 사전 점검(읽기 전용)
git -C C:\learnershigh-assessment-integration status --short ; git rev-parse --short HEAD
docker ps --filter "name=lh-local-run-mysql"
netstat -ano | findstr LISTENING            # 8080 비어 있음, 5173·5174 는 사용자가 띄운 Vite(PID 1920·4556) 확인
# 컨테이너 환경 변수는 '있음/없음'만 확인(값 미출력)
# Flyway: 저장소 database/migrations 24개 버전 vs flyway_schema_history 성공 24건 비교 → 차이 0, 실패 0, V202611180100 없음

# 2. 사용자 DB 읽기 전용 백업(mysqldump --single-transaction) → C:\learnershigh-local-run-backup-20261121\lh_local_run-20261121.sql
#    + 일회용 컨테이너(--rm, 포트 없음)에 복원 검증(표 38개, 최신 202611190300) 후 삭제 · 30개 표 CHECKSUM 기록

# 3. Backend (별도 PowerShell 창, 스크립트는 저장소 밖)
Start-Process powershell -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File','C:\learnershigh-local-run\start-backend.ps1'
#   스크립트 내용(요지):
#   $env:DB_URL      = 'jdbc:mysql://127.0.0.1:33307/lh_local_run?serverTimezone=Asia/Seoul&characterEncoding=UTF-8'
#   $env:DB_USERNAME = (docker exec lh-local-run-mysql printenv MYSQL_USER).Trim()       # 화면에 출력하지 않음
#   $env:DB_PASSWORD = (docker exec lh-local-run-mysql printenv MYSQL_PASSWORD).Trim()   # 화면에 출력하지 않음
#   cd C:\learnershigh-assessment-integration\backend
#   .\gradlew.bat --no-daemon bootRun --args="--spring.profiles.active=local-run" | Tee-Object <로그>

# 4. Frontend (각각 별도 PowerShell 창) — 기존 5173·5174 Vite 가 스스로 종료돼 포트가 빈 것을 확인한 뒤
Start-Process powershell -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File','C:\learnershigh-local-run\start-student.ps1'   # npm run dev:student
Start-Process powershell -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File','C:\learnershigh-local-run\start-admin.ps1'     # npm run dev:admin

# 5. 확인(GET 만, 인증 Header 없음)
curl http://localhost:5173/assessment ; curl http://localhost:5174/assessment
curl http://127.0.0.1:8080/api/admin/assessment/schools ; curl http://localhost:5174/api/admin/assessment/schools
curl http://localhost:5173/api/student/assessment/academic-context
```

- 처음 만든 Frontend 실행 스크립트는 로그 경로 오류와 한글(BOM 없는 UTF-8) 때문에 시작하지 못했다. 그 두 창(이 작업이 띄운 것)만 닫고, ASCII 스크립트로 다시 띄웠다.
- `/api/test/reset`, POST, 학교알리미 수집, 분석 API는 호출하지 않았다. 브라우저 자동 순회도 하지 않았다.

## ⑤ DB 안전 확인

| 항목 | 기동 전 | 기동 후 |
|---|---|---|
| Flyway 최신 · 성공 건수 · 실패 | `202611190300` · 24 · 0 | `202611190300` · 24 · 0 |
| 저장소 Migration vs 이력 | 24 = 24, 미적용 0, `V202611180100` 없음 | Backend 로그 `Schema lh_local_run is up to date. No migration necessary.` |
| 30개 표 `CHECKSUM TABLE` | 부록 L 마감과 같음 | **기동 전과 같음** |
| 백업 | `C:\learnershigh-local-run-backup-20261121\lh_local_run-20261121.sql` (7,825,649 bytes, SHA-256 `71f539d3…`, 'Dump completed', 표 38, 일회용 컨테이너 복원 검증 OK) | 보존 |

- 사용자 데이터 변경·시드·리셋은 0이다.

## ⑥ 서버 기동 증거 (현재 실행 중)

| 서비스 | 접속 주소 | LISTEN · PID | 실행 창(PowerShell) PID | 로그 |
|---|---|---|---|---|
| Backend | `http://localhost:8080` | `0.0.0.0:8080` · java **39700** | 31244 | `C:\learnershigh-local-run\backend-20261121-001936.log` (UTF-16) |
| 학생 Frontend | `http://localhost:5173/assessment` | `[::1]:5173` · node **14316** | 19024 | `C:\learnershigh-local-run\student-20261121-002746.log` |
| 관리자 Frontend | `http://localhost:5174/assessment` | `[::1]:5174` · node **41428** | 28952 | `C:\learnershigh-local-run\admin-20261121-002747.log` |

Backend 핵심 로그:

```
The following 1 profile is active: "local-run"
HikariPool-1 - Added connection com.mysql.cj.jdbc.ConnectionImpl@…   /   HikariPool-1 - Start completed.
Current version of schema `lh_local_run`: 202611190300
Schema `lh_local_run` is up to date. No migration necessary.
schoolinfo year-query-verified=true (기본 false, 운영 프로필 local-run 에서만 true)
Tomcat started on port 8080 (http)
Started LearnersHighExtensionApplication in 15.048 seconds
plan preview converter image ready: lh-plan-preview-converter:e6b3e1dd2ee1
```

- HTTP: `GET /api/admin/assessment/schools` → **401 JSON** `{"code":"UNAUTHORIZED",…}`. 서버는 응답하지만 인증이 필요하다는 뜻이며, 기능 정상 판정과는 구분한다.
- `GET /actuator/health` → 404(Actuator 미포함).

## ⑦ Frontend 증거

| 항목 | 학생 5173 | 관리자 5174 |
|---|---|---|
| 실행 | `npm run dev:student` → Vite 8.3.4 ready 1419ms, `strictPort` 5173 | `npm run dev:admin` → Vite ready 1419ms, 5174 |
| `/assessment` | 200 `text/html` (`LearnersHigh Student Extension`) | 200 `text/html` (`학생 케어 · LearnersHigh Admin`) |
| Backend 연결 | **연결 안 됨**: `frontend/student/vite.config.ts`에 `/api` Proxy가 없고, 개발 서버 기본 데이터 출처가 `mock`이다(`VITE_ASSESSMENT_DATA_SOURCE` 미설정 — 주입된 `VITE_` 변수 0개 확인). `/api/student/…` 요청이 5173의 HTML로 돌아온다 | **연결됨**: `/api` → `http://localhost:8080`(vite.config 기본값). 5174 경유 응답 본문 = Backend 401 본문 |
| 개발 인증 | — | `VITE_ASSESSMENT_DEV_ADMIN_ID` 미설정 → Assessment 관리 API는 401. 브라우저에서 `?devAdmin=adm_plan_operator`로 들어가면 개발용 관리자 Header가 붙는다 |

- 참고: 작업 시작 시 5173·5174에서 사용자가 띄운 Vite(PID 1920·4556, 이 작업본을 서비스 중)가 응답했지만, 점검 도중 **스스로 종료**됐다. 이 작업은 그 프로세스를 종료하지 않았다(GET 요청만 보냄). 포트가 빈 것을 확인한 뒤 새로 띄웠다.

## ⑧ 접속 링크 (실제 응답 확인됨)

- 학생: `http://localhost:5173/assessment` — Mock 데이터 화면
- 관리자: `http://localhost:5174/assessment` — Assessment 관리는 `http://localhost:5174/assessment?devAdmin=adm_plan_operator`로 개발용 관리자 선택(Backend 데이터 표시). Student Care 메뉴도 같은 화면에 있다.

## ⑨ 남은 문제 · 사용자 결정 필요

1. **학생 화면을 Backend에 연결하려면 (실행하지 않음 — 데이터 변경 위험)**
   - 저장소 기본 학생 개발 설정은 Mock 모드이고 Proxy가 없다. 코드 변경 없이 E2E용 설정 파일(`e2e/assessment/vite.student.config.ts`, 학생 기본 설정 + `/api` Proxy만 추가)과 환경 변수로 연결할 수 있다. 아래 ⑩-4 명령이다.
   - **주의**: 연결 모드에서 학생 Assessment 홈을 열면 화면이 자동 확보를 호출한다(부록 K). 그러면 서버가 학생 학교(Mock 학적 '예시고등학교')를 **실제 학교알리미에서 검색**하고, 결과(확인 기록, 원본이 있으면 원본)를 **사용자 DB에 쓴다**(`local-run`의 `year-query-verified=true`).
   - 이번 작업 승인 범위(추가 수집 미승인)와 '데이터 변경 위험 시 중단' 지시에 따라 여기서 멈췄다.
2. **관리자 평가계획서 탭 주의**: 관리자 Assessment의 평가계획서 탭에 학교를 고르고 들어가면 같은 자동 확인(학교알리미 실제 요청 + 사용자 DB 기록)이 시작된다(부록 E·H 설계). 화면 확인만 원하면 다른 탭부터 보길 권한다.
3. PATH의 기본 Java는 17이다. Gradle이 Java 21 도구체인으로 실행하므로 이번 기동에는 문제가 없었다.
4. 이번 범위 밖(검증하지 않음): 분석기 정확도(완규님 담당), 부록 L의 기본 E2E 간헐 시간 초과.

## ⑩ 재실행 · 종료 방법

**실행** (각각 새 PowerShell 창에서. 스크립트는 저장소 밖 `C:\learnershigh-local-run\`):

```powershell
# 0) DB 컨테이너가 꺼져 있으면(데이터 볼륨은 그대로)
docker start lh-local-run-mysql

# 1) Backend — 자격증명은 스크립트가 컨테이너에서 메모리로만 읽음
powershell -NoExit -ExecutionPolicy Bypass -File C:\learnershigh-local-run\start-backend.ps1

# 2) 학생 (기본: Mock 데이터)
powershell -NoExit -ExecutionPolicy Bypass -File C:\learnershigh-local-run\start-student.ps1

# 3) 관리자
powershell -NoExit -ExecutionPolicy Bypass -File C:\learnershigh-local-run\start-admin.ps1
```

직접 입력하려면 같은 창에서 이어서 실행해야 한다(다른 창의 `$env:`는 이어지지 않음):

```powershell
cd C:\learnershigh-assessment-integration\backend
$env:DB_URL = 'jdbc:mysql://127.0.0.1:33307/lh_local_run?serverTimezone=Asia/Seoul&characterEncoding=UTF-8'
$env:DB_USERNAME = (docker exec lh-local-run-mysql printenv MYSQL_USER).Trim()
$env:DB_PASSWORD = (docker exec lh-local-run-mysql printenv MYSQL_PASSWORD).Trim()
.\gradlew.bat --no-daemon bootRun --args="--spring.profiles.active=local-run"
```

**4) (선택, 위험 확인 후) 학생 화면을 Backend에 연결해서 실행** — 위 ⑨-1의 학교알리미 요청·DB 기록을 받아들일 때만:

```powershell
# 먼저 기본 학생 서버(5173) 창을 Ctrl+C 로 멈춘 뒤
cd C:\learnershigh-assessment-integration\frontend\student
$env:VITE_ASSESSMENT_DATA_SOURCE = 'http'
$env:VITE_API_TARGET = 'http://localhost:8080'
$env:E2E_STUDENT_PORT = '5173'
$env:VITE_ASSESSMENT_DEV_STUDENT_ID = 'stu_001'      # 개발용 Mock 학생 ID(비밀값 아님)
npx vite --config ../../e2e/assessment/vite.student.config.ts --port 5173 --strictPort
```

**종료**:
- 각 서버 창에서 `Ctrl+C`(Gradle·Vite 종료) 뒤 창을 닫는다.
- 또는 PID로 종료한다(이번 실행 기준):
  - `Stop-Process -Id 39700` (Backend java) · `Stop-Process -Id 14316` (학생 node) · `Stop-Process -Id 41428` (관리자 node)
  - 실행 창 PowerShell PID는 31244 · 19024 · 28952다.
- DB 컨테이너는 계속 켜 두어도 되고, 끄려면 `docker stop lh-local-run-mysql`(데이터 유지)를 쓴다.

## 변경 · 생성한 것

- 저장소: 이 보고서 1개(`docs/specs/suyeon/A27-UX-LOCAL-RUN-EXECUTION-REPORT-20261121.md`)만 추가했다. 제품 코드·설정·Migration 변경 0, Git 쓰기 0.
- 저장소 밖:
  - `C:\learnershigh-local-run\` — 실행 스크립트 3개와 로그. 비밀값 없음.
  - `C:\learnershigh-local-run-backup-20261121\` — DB 백업, SHA, 체크섬.
- 시작 시점의 잘못된 로그 경로 파일은 생성되지 않았다(C:\ 루트 확인).
