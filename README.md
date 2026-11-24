# LearnersHigh Extension

> **현행 코드 안내 · 2026-11-24 · `main` 기준**
>
> 기존 LearnersHigh의 학습관리 흐름에 **Assessment(학교 수행평가)**와 **Student Care(학생 케어)**를 확장하는 React + Spring Boot 프로젝트입니다. 이 README는 현재 구현된 코드와 로컬 실행 방법을 안내합니다. 초기 기획의 Mentor Hub, Mentor 전용 앱, School & Admissions, Today Board 등은 **현재 서비스 기능이 아닙니다**.

## 1. 구현 범위

| 영역 | 현재 기능 | 화면 |
|---|---|---|
| **Assessment — 학생** | 학교·학기 선택, 수행평가와 평가정보 확인, 월별 교수·학습 운영계획, 노트·첨부 파일, 선생님 피드백 요청, 심화 탐구 참고 콘텐츠, 자료함·성장 기록·보관함 | `frontend/student` |
| **Assessment — 관리자** | 학교알리미 원본 확인·등록, PDF/HWP/HWPX 분석, 결과 검토·최종 확정, 월별 운영계획, 학생별 현황·피드백, 학생 화면 읽기 전용 조회 | `frontend/admin` |
| **Student Care** | 학생 상태 확인, 관리 사유·상담·후속관리, 관련 관리자 화면 및 학부모 리포트 흐름 | `frontend/admin` |

Assessment 노트에는 이미지·PDF 등 첨부 파일을 서버에 보관하는 기능, 지원 형식의 미리보기, 노트 PDF 내보내기, 보관함 복구 및 조건부 영구 삭제가 포함됩니다. 분석 결과는 자동으로 공식 확정되지 않으며 **관리자가 검토·승인**합니다. 월·주차만 있는 운영계획을 달력에 표시한 날짜는 공식 평가일이 아닙니다.

**구현과 연동의 구분**

- 평가계획서 분석은 Spring Boot 내부의 `local` 분석기에서 실행합니다. 외부 Railway HTTP 분석기는 사용하지 않습니다.
- 학교알리미 자료 수집과 분석·확정 기능은 구현되어 있지만, 원본별 분류·추출 결과는 실제 학교 문서로 검토해야 합니다.
- 과거 학년/학기는 **실제 학적 이력이 존재하는 경우에만** 선택할 수 있습니다. 없는 과거 기록을 생성하지 않습니다.
- 기존 LearnersHigh 서비스의 실제 데이터 연동, **실제 로그인·운영 인증, 배포**는 별도 통합이 필요하며 **1팀 담당**입니다. 로컬의 개발용 헤더 인증은 운영 인증을 대체하지 않습니다.

상세 화면과 동작은 [Assessment 화면 맵](docs/specs/suyeon/assessment-screen-map.md), [Assessment 기능 문서](docs/specs/suyeon/README.md), [Student Care 명세](docs/specs/wangyu/features/student-care.md)를 참고하세요.

## 2. 기술 구성

| 구분 | 기술 |
|---|---|
| 학생·관리자 Frontend | React 19, TypeScript, Vite 8, npm workspaces |
| Backend | Java 21, Spring Boot 4, Gradle Wrapper |
| 데이터베이스 | MySQL 8.4, Flyway (`database/migrations/`) |
| 분석·원문 보기 | 서버 내부 PDF/HWP/HWPX 분석기, OCR 선택 지원, PDF 미리보기 및 HWP/HWPX 변환기 |
| 테스트 | JUnit/ArchUnit, MySQL Testcontainers, Node 테스트, Playwright E2E/REPLAY |

```text
learnershigh-extension/
├── frontend/
│   ├── student/                  # 학생 앱 (개발 포트 5173)
│   └── admin/                    # 관리자 앱 (개발 포트 5174)
├── backend/                      # Spring Boot API (개발 포트 8080)
├── database/migrations/          # Flyway SQL
├── e2e/                          # 시나리오·REPLAY 테스트
├── scripts/                      # 검증·시연 도구
├── docs/                         # 현행 계약, 설계, 담당, 검증 기록
└── references/                   # 원본 및 디자인 참고 자료
```

## 3. 로컬 실행 (Windows PowerShell — `main`)

**준비물:** Windows PowerShell, Docker Desktop, Node.js 22 및 npm, JDK 21(Backend Java Toolchain). 아래 명령은 **기존 사용자 DB `lh_local_run`과 기존 Storage를 그대로 사용하는 로컬 개발/검증용**입니다. 실제 로그인·운영·배포는 1팀 담당입니다.

먼저 GitHub의 최신 `main` 코드가 `C:\learnershigh-main`에 체크아웃되어 있는지 확인합니다. 다른 경로에 내려받았다면 아래 `cd` 경로만 바꾸세요. 로컬 변경 사항이 없다면 최신 코드로 갱신할 수 있습니다.

```powershell
cd C:\learnershigh-main
git branch --show-current          # main 확인
git status --short                 # 로컬 변경 여부 확인
# 변경이 없을 때만: git pull --ff-only origin main
```

### 3-1. 기존 MySQL 시작

```powershell
docker ps --filter 'name=^lh-local-run-mysql$' --format '{{.Names}}'
# 컨테이너가 중지되어 있을 때만 실행
docker start lh-local-run-mysql
```

기존 컨테이너는 `127.0.0.1:33307`, DB는 `lh_local_run`입니다. 이미 실행 중이면 `docker start`는 생략합니다. **컨테이너·볼륨을 새로 만들거나 삭제하지 마세요.**

### 3-2. Backend — PowerShell 창 1

기존 `C:\learnershigh-local-run\start-backend.ps1`과 같은 방식으로 **Docker 컨테이너 환경 변수에서 DB 계정·암호를 읽습니다.** 암호를 입력하거나 README·설정 파일에 기록할 필요가 없습니다.

```powershell
# 최신 main Backend
cd C:\learnershigh-main\backend

# 기존 DB 연결
$env:DB_URL = 'jdbc:mysql://127.0.0.1:33307/lh_local_run?serverTimezone=Asia/Seoul&characterEncoding=UTF-8'
$env:DB_USERNAME = (docker exec lh-local-run-mysql printenv MYSQL_USER | Out-String).Trim()
$env:DB_PASSWORD = (docker exec lh-local-run-mysql printenv MYSQL_PASSWORD | Out-String).Trim()
if (-not $env:DB_USERNAME -or -not $env:DB_PASSWORD) {
    throw 'MySQL 계정 정보를 읽지 못했습니다. Docker 컨테이너 상태를 확인하세요.'
}

# 기존 평가계획서·학생·학교 데이터와 첨부파일 보존
$env:ASSESSMENT_DEMO_ROSTER_ENABLED = 'true'
$env:ASSESSMENT_STORAGE_ROOT = Join-Path $env:USERPROFILE '.learnershigh-extension\local-run-storage'
$env:ASSESSMENT_ANALYZER_MODE = 'local'
$env:LEARNERSHIGH_TEST_ENDPOINTS_ENABLED = 'false'

# local-run 프로필, 8080 포트
Remove-Item Env:NoDefaultCurrentDirectoryInExePath -ErrorAction SilentlyContinue
.\gradlew.bat --no-daemon bootRun --args='--spring.profiles.active=local-run'
```

성공하면 `Tomcat started on port 8080`과 `Started ...Application` 로그가 표시됩니다. API 주소는 **http://localhost:8080**입니다. 이미 8080을 사용하는 이전 Backend가 있다면 기존 PowerShell 창에서 `Ctrl+C`로 종료한 후 실행하세요.

**DB/데이터 주의:** `application.yml`의 `DB_URL`·`DB_USERNAME`·`DB_PASSWORD`는 실행 시 환경 변수로 받습니다. 위 설정은 이 PowerShell 세션에만 적용됩니다(영구 환경 변수 변경 없음). Backend 시작 시 Flyway가 **미적용 Migration을 자동 적용할 수 있으므로** 새 버전 실행 전 DB 백업·Migration 이력을 확인하세요. 기존 원본과 학생 데이터를 초기화하지 마세요.

### 3-3. Frontend 의존성 — 최초 1회

```powershell
cd C:\learnershigh-main\frontend
npm ci
```

학생·관리자 두 앱은 npm workspace를 공유하므로 `frontend`에서 한 번 설치합니다.

### 3-4. 관리자 — PowerShell 창 2

```powershell
cd C:\learnershigh-main\frontend\admin
$env:VITE_ASSESSMENT_DATA_SOURCE = 'http'
$env:VITE_API_TARGET = 'http://localhost:8080'
$env:VITE_ASSESSMENT_DEV_ADMIN_ID = 'adm_demo_b01'
npm run dev
```

관리자 Assessment: **http://localhost:5174/assessment** (루트 `/`는 Student Care 화면). `adm_demo_b01`은 로컬 시연용 관리자이며 실제 운영 로그인 계정이 아닙니다.

### 3-5. 학생 — PowerShell 창 3

```powershell
cd C:\learnershigh-main\frontend\student
$env:VITE_ASSESSMENT_DATA_SOURCE = 'http'
$env:VITE_API_TARGET = 'http://localhost:8080'
$env:VITE_ASSESSMENT_DEV_STUDENT_ID = 'stu_demo_073'
npm run dev
```

학생 Assessment: **http://localhost:5173/assessment**. `stu_demo_073`은 시연용 학생 ID이며, 본인의 로컬 DB에 맞는 ID로 변경할 수 있습니다. 두 앱의 개발 서버는 `/api` 요청을 Backend 8080으로 프록시합니다.

### 3-6. 종료 및 확인

| 구성 | 경로/주소 | 종료 방법 |
|---|---|---|
| Backend | `C:\learnershigh-main\backend` · `http://localhost:8080` | Backend PowerShell에서 `Ctrl+C` |
| 관리자 | `C:\learnershigh-main\frontend\admin` · `http://localhost:5174/assessment` | 관리자 PowerShell에서 `Ctrl+C` |
| 학생 | `C:\learnershigh-main\frontend\student` · `http://localhost:5173/assessment` | 학생 PowerShell에서 `Ctrl+C` |

**주의:** 이 실행 절차는 로컬 시연 DB·개발용 Header를 사용합니다. 운영 환경의 실제 인증·권한·배포는 별도로 1팀에서 통합해야 합니다. 새로운 PC에서 DB를 처음 생성하는 경우에만 [상세 로컬 실행 가이드](docs/specs/suyeon/assessment-studentcare-local-run-guide.md)를 참고하되, 기존 사용자 DB에 새 DB 생성·시드·초기화 명령을 실행하지 마세요.

## 4. 테스트·검증

```powershell
# 저장소 루트에서 — 공통 Harness/Frontend/Backend 검증
.\scripts\verify.ps1 -Strict

# Frontend만
.\scripts\verify-frontend.ps1 -Strict

# Backend 단위/ArchUnit — backend/에서
.\gradlew.bat test --no-daemon --max-workers=1

# Backend 통합 테스트 — backend/에서 (Docker/Testcontainers 사용)
.\gradlew.bat integrationTest --no-daemon --max-workers=1
```

Assessment E2E와 REPLAY의 실행·격리 조건은 [로컬 실행 가이드](docs/specs/suyeon/assessment-studentcare-local-run-guide.md) 및 `e2e/`를 확인하세요. **사용자 DB에 E2E 초기화 API를 실행하지 마세요.** 메모리 부족으로 MySQL이 종료된 이력이 있으므로 무거운 테스트는 격리 DB에서 순차 실행합니다.

## 5. 협업·담당 경계

| 범위 | 담당 |
|---|---|
| Assessment 학생·관리자 기능, 평가계획서 분석기 정확도 | 수연 |
| Student Care·상담 | 완규 |
| 실제 로그인 연결·운영·배포 | 1팀 |
| 공통 API·DB Migration·앱 Shell·E2E·CI | 영향 범위 확인 후 공동 검토 |

학교알리미/서버 내부 분석기의 초기 구현에는 [PR #18](https://github.com/csy5271abcd/learnershigh-extension/pull/18)의 기여가 포함되어 있으며, 이후 Assessment에 통합·개선됐습니다. 자세한 담당 및 변경 규칙은 [OWNERSHIP](docs/OWNERSHIP.md)을 따릅니다.

## 6. 현재 제한과 인계 사항

- **운영 인증 미연동:** 개발용 사용자·관리자 Header만으로 운영할 수 없습니다. 1팀의 실제 인증/인가 및 기존 LearnersHigh 연결 작업이 필요합니다.
- **Railway 분석기 퇴역:** 현재 분석 경로는 서버 내부 `local`입니다. 과거 Git 이력의 토큰 폐기 여부는 별도 보안 확인 사항입니다.
- **API 계약:** 구현된 일부 절도 문서상 `DRAFT`입니다. 팀의 계약 승인 여부는 [API 계약](docs/api/api-contract.md)에 따릅니다.
- **환경 차이:** PDF 내보내기·스캔본 OCR·HWP/HWPX 변환은 서버의 한글 글꼴, OCR 및 변환기 환경에 따라 제한될 수 있습니다.
- **과거 데이터:** 학생의 학년·학기별 기록은 실제 보유한 학적/평가 데이터 범위에서만 조회됩니다.

## 7. 현행 문서 바로가기

- [Source of Truth](docs/SOURCE_OF_TRUTH.md) · [Ownership](docs/OWNERSHIP.md)
- [Architecture](docs/architecture/overview.md) · [Integration Boundary](docs/architecture/integration-boundary.md)
- [API 계약](docs/api/api-contract.md) · [Flyway Migration](database/migrations/README.md)
- [Assessment 기능·검증 문서 색인](docs/specs/suyeon/README.md)
- [Assessment 화면 맵](docs/specs/suyeon/assessment-screen-map.md) · [분석기 설정](docs/specs/suyeon/assessment-analyzer-setup.md)
- [Student Care 기능 명세](docs/specs/wangyu/features/student-care.md)
- [로컬 실행 가이드](docs/specs/suyeon/assessment-studentcare-local-run-guide.md)

초기 기획·퇴역 기능의 결정 및 검증 기록은 `docs/`와 Git 이력에 보존되어 있습니다. 초기 설계를 **현재 구현 기능으로 오해하지 않도록**, 이 README에서는 현행 기능과 로컬 실행 절차만 설명합니다.
