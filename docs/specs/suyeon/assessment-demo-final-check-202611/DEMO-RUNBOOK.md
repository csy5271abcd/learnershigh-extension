# 시연 실행 가이드 (11-12 오전, PDF v21.1 기준선)

> 로컬 개발 환경 전용이다. 인증·학업 정보는 **개발용 Mock**이며 운영 확정이 아니다. 비밀번호는 이 문서에 적지 않는다. DB 계정 값은 `docker-compose.yml`·`.env`(없으면 `.env.example`)를 따른다.

## 0. 시작 전 점검 (시연 30분 전)

| 확인 | 방법 | 정상 |
|---|---|---|
| 여유 메모리 | 작업 관리자 | 1GB 이상 권장(점검 당시 약 0.5~1.2GB였음). 브라우저 탭·다른 프로그램 정리 |
| Docker Desktop | `docker info` | 응답. 실패하면 §6-1 |
| MySQL | `docker ps --filter name=learnershigh-mysql` | `Up … (healthy)` |
| 포트 | `netstat -ano \| findstr ":18080 :5173 :5174"` | 비어 있어야 함(남아 있으면 §7) |

## 1. Docker·MySQL

```powershell
# Docker Desktop이 꺼져 있으면 (설치 위치: 사용자 LocalAppData\Programs\DockerDesktop)
Start-Process "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
docker start learnershigh-mysql        # 컨테이너가 Exited면 시작만. 삭제·재생성·Volume 삭제 금지
```

포트: 이 PC의 현재 컨테이너는 `localhost:3307`로 열려 있다(compose 기본값은 3306, `MYSQL_PORT`로 바뀜). `docker ps`의 PORTS로 확인하고 §3의 `DB_URL`을 맞춘다.

## 2. 시연용 Schema

**기본 개발 DB `learnershigh_extension`은 쓰지 않는다.** 이 DB에는 Assessment 테이블이 없고, 현재 저장소에 없는 Migration 이력(`202610150300`)이 남아 있어 Flyway 검증에서 시작이 실패할 수 있다. 고치지 말고 그대로 둔다.

시연 전날 **새 빈 Schema**를 하나 만든다(예: `lh_demo_live`). 이름이 이미 있으면 다른 이름을 쓴다.

```powershell
docker exec -i learnershigh-mysql mysql -uroot -p -e "CREATE DATABASE lh_demo_live CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; GRANT ALL PRIVILEGES ON lh_demo_live.* TO 'learnershigh'@'%';"
```

Backend가 처음 시작될 때 Flyway가 기존 Migration 4개를 적용한다. D-1은 적용하지 않는다(승인 전).

## 3. Backend (18080)

```powershell
cd C:\learnershigh-extension\backend
.\gradlew.bat bootJar
$env:DB_URL = 'jdbc:mysql://localhost:3307/lh_demo_live'
$env:DB_USERNAME = '<compose의 MYSQL_USER>'
$env:DB_PASSWORD = '<compose의 MYSQL_PASSWORD>'
$env:ASSESSMENT_ANALYSIS_IMPORT_ENABLED = 'true'   # v21.1 분석 결과 수신 시연에 필요(기본 false)
# ASSESSMENT_MULTIFORMAT_EXPERIMENTAL 은 설정하지 않는다 → HWP·HWPX 기본 OFF
java -Xmx384m -jar build\libs\learnershigh-extension-backend-0.0.1.jar --server.port=18080
```

정상: 로그 `Successfully applied 4 migrations`(처음) 또는 `validated 4 migrations`, 그리고 `Started LearnersHighExtensionApplication`.

## 4. Student (5173, http)

```powershell
cd C:\learnershigh-extension
.\docs\specs\suyeon\assessment-final-integration-202611\scripts\run-student-http-dev.ps1 -ApiTarget http://localhost:18080 -StudentId stu_001 -CurrentTerm 2026-1
```

Shared `vite.config`는 바꾸지 않는다(이 스크립트는 별도 설정 파일을 쓴다). 첫 로딩이 6초 정도 걸린다. **시연 전에 `http://localhost:5173/assessment`를 한 번 미리 연다.**

## 5. Admin (5174, http)

```powershell
cd C:\learnershigh-extension\frontend\admin
$env:VITE_API_TARGET = 'http://localhost:18080'
$env:VITE_ASSESSMENT_DATA_SOURCE = 'http'
$env:VITE_ASSESSMENT_DEV_ADMIN_ID = 'adm_plan_operator'
$env:VITE_ASSESSMENT_DEV_PLAN_SCHOOLS = 'school_001'
$env:VITE_ASSESSMENT_DEV_CURRENT_TERM = '2026-1'
# VITE_ASSESSMENT_DEV_MULTIFORMAT 은 설정하지 않는다
npx vite
```

`http://localhost:5174/assessment`도 미리 연다(첫 로딩 약 8초).

### 시험 계정 (Mock Header, 실제 인증 아님)

| 값 | 의미 |
|---|---|
| `stu_001` / `stu_002` | 학생(본인 기록만) |
| `adm_plan_operator` | 평가계획서 운영 관리자 |
| `adm_gangnam` / `adm_bundang` | 지점 관리자(범위·권한 시연) |

화면 상단 "개발 서버 · 실제 Backend 저장 · … 개발용 Mock" 안내는 **그대로 보여 주고 설명한다**.

## 6. 시연할 것 / 하지 않을 것

### 시연할 것 (PDF v21.1, 브라우저 43 + 회귀 33으로 확인한 흐름)

1. Student: 수행평가 등록·조회·수정(필수값 검사, 중복 클릭 방지, 오류 시 입력 유지), 마감일 비우기 → "날짜 미정"
2. Admin: 평가계획서 PDF 등록 → 개정본 추가(이전 Revision 보존, 이력 v1·v2)
3. Admin: 잘못된 파일 거절(PDF 아님 415, 손상 422, 20MB 초과 413)
4. v21.1 AI 분석 결과 수신(`UNREVIEWED`, 후보는 AI 제안일 뿐임을 설명)
5. Admin 검토: 로컬 원본 PDF 선택 → 해시 일치 → 과목·필드·쪽 → 관리자 확인 체크 → 확정 → 재조회
6. Student: 확정된 공식 평가정보만 표시, 미확정 후보 미노출, 확정된 수행평가 항목만 참조 가능

합성 PDF·분석 결과: 계정 B 폴더 `runs/v21-pdf-quality-backend-bridge-20261109/e2e/`의 `synthetic-e2e.pdf`·`analysis-import.json`(읽기만). 실제 학교 문서는 쓰지 않는다.

> **주의 (미결 정책):** 학생 화면은 문서의 **최신 Revision**만 보여 준다. 확정한 v1 위에 개정본 v2를 올리고 v2를 확정하지 않으면, 학생 화면은 v2를 `UNREVIEWED`로 보여 주고 v1 확정값이 보이지 않는다. 학생 화면에서 확정값을 보여 주려면 **확정한 Revision이 최신인 상태**에서 보여 준다. 이 정책은 바꾸지 않았다.
> 같은 Revision을 다시 확정하는 것도 화면에서 막혀 있다(재검토 정책 미결).

### 시연하지 않을 것

| 기능 | 이유 |
|---|---|
| HWP·HWPX 등록·검토 | 실험 기능, 공식 계약·D-1·A안 승인 전. 질문이 나오면 "확정은 승인 대기 상태로 막혀 있다"고 설명 |
| AI v21.2-quality | 기준선이 아님 |
| 실제 관리자 인증·지점 권한·학교 정보 연동 | 미연결(Mock) |
| 파일 원본 보관·미리보기 | Storage 미결 |

HWP·HWPX를 꼭 보여 줘야 하면 **별도 Schema**로 Backend에 `ASSESSMENT_MULTIFORMAT_EXPERIMENTAL=true`, Admin에 `VITE_ASSESSMENT_DEV_MULTIFORMAT=true`를 그 프로세스에만 주고 "실험 · 확정 불가"라고 함께 안내한다.

## 7. 문제 대응

| 증상 | 조치 |
|---|---|
| `docker` 명령이 `dockerDesktopLinuxEngine` 오류 | §1처럼 Docker Desktop 실행 후 1~2분 대기, `docker start learnershigh-mysql` |
| Backend 시작 시 Flyway 검증 실패 | 기본 DB를 가리키는지 확인 → §2의 시연용 Schema로 바꾼다. Flyway 이력을 고치지 않는다 |
| `Port 5173/5174 is already in use` | 이전 Vite가 남아 있다. `Get-CimInstance Win32_Process -Filter "Name='node.exe'"`에서 **명령줄이 `learnershigh-extension\frontend\…vite`인 것만** 종료. 다른 Node 프로그램은 건드리지 않는다 |
| 18080 사용 중 | 명령줄이 `learnershigh-extension-backend…jar`(또는 `gradlew bootRun`)인 `java.exe`만 종료 |
| 화면에 "불러오지 못했어요 (HTTP 502)" | Backend가 꺼져 있다. §3 다시 실행 후 "다시 시도" |
| 화면에 "연결 전 (Stage 2)" | http 모드에서 아직 연결하지 않은 리소스다(정상 동작, Mock 값을 대신 보여 주지 않음) |
| 첫 페이지가 오래 걸림 | 미리 연 탭을 쓴다. 메모리 부족이면 다른 프로그램 정리 |
| 그래도 안 되면 | Mock 모드로 전환: Student `cd frontend\student; npx vite`, Admin `cd frontend\admin; npx vite`(환경 변수 없이). 화면에 "시연용 샘플 데이터"가 보이고 서버에 저장되지 않는다(Mock 6/6 확인) |

## 8. 끝난 뒤

Backend·Vite를 끄고 남은 프로세스가 없는지 §0의 포트 점검으로 확인한다. MySQL 컨테이너와 시연 Schema는 삭제하지 않는다.
