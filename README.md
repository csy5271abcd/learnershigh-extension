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

## 3. 로컬 실행 (Windows PowerShell)

**필수 환경:** Node.js 22, npm, Java(Gradle 실행용 JDK 17 이상 / Backend Java 21 Toolchain), Docker Desktop, MySQL 8.4.

아래는 **기존 로컬 데이터베이스 `lh_local_run`을 사용하는 경우의 예시**입니다. 새로운 PC나 초기 DB 설정은 [로컬 실행 가이드](docs/specs/suyeon/assessment-studentcare-local-run-guide.md)를 따르세요.

### 3-1. MySQL 확인

```powershell
docker ps --filter "name=lh-local-run-mysql"
# 기존 컨테이너가 중지된 경우에만
docker start lh-local-run-mysql
```

기존 `lh-local-run-mysql`은 `127.0.0.1:33307`, DB는 `lh_local_run`을 사용합니다. **기존 데이터와 Storage를 보존**하세요. 컨테이너·볼륨을 새로 생성하거나 지우지 마세요.

### 3-2. Backend — 터미널 1

```powershell
cd .\backend

$env:DB_URL = "jdbc:mysql://127.0.0.1:33307/lh_local_run"
$env:DB_USERNAME = "lhlocal"
$securePassword = Read-Host "기존 DB 비밀번호" -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password

$env:SPRING_PROFILES_ACTIVE = "local-run,care-demo"
$env:ASSESSMENT_DEMO_ROSTER_ENABLED = "true"
$env:LEARNERSHIGH_MOCK_DATABASE_EXAMPLES = "true"
$env:LEARNERSHIGH_TEST_ENDPOINTS_ENABLED = "false"
$env:ASSESSMENT_ANALYZER_MODE = "local"

# 중요: 이미 사용 중인 Storage의 실제 경로와 일치시켜야 합니다.
$env:ASSESSMENT_STORAGE_ROOT = "$env:USERPROFILE\.learnershigh-extension\local-run-storage"

.\gradlew.bat bootRun --console=plain
```

Backend: **http://localhost:8080**

`ASSESSMENT_STORAGE_ROOT`가 기존 실행 스크립트의 경로와 다르면 저장된 파일을 못 찾을 수 있습니다. 실행 전에 본인 환경의 기존 설정을 확인하세요. Backend 시작 시 Flyway가 적용되지 않은 Migration을 실행할 수 있으므로 **DB 백업 및 Migration 상태 확인**이 선행되어야 합니다.

### 3-3. Frontend 의존성 — 최초 1회

```powershell
cd .\frontend
npm ci
```

### 3-4. 관리자 — 터미널 2

```powershell
cd .\frontend\admin
$env:VITE_ASSESSMENT_DATA_SOURCE = "http"
$env:VITE_API_TARGET = "http://localhost:8080"
$env:VITE_ASSESSMENT_DEV_ADMIN_ID = "adm_demo_b01"
npm run dev
```

관리자: **http://localhost:5174/assessment** (루트 `/`는 Student Care 화면)

### 3-5. 학생 — 터미널 3

```powershell
cd .\frontend\student
$env:VITE_ASSESSMENT_DATA_SOURCE = "http"
$env:VITE_API_TARGET = "http://localhost:8080"
$env:VITE_ASSESSMENT_DEV_STUDENT_ID = "stu_demo_073"
npm run dev
```

학생: **http://localhost:5173/assessment**

**주의:** 각 명령은 **저장소 루트**를 기준으로 해당 디렉터리에서 실행합니다. 위 `cd .\backend` / `cd .\frontend` 등은 루트에서 시작하는 경우의 예시입니다. 실제 시연 데이터·계정 ID·환경 변수는 본인 로컬 DB에 맞춰 설정하세요. Frontend 개발 서버는 `/api` 요청을 8080으로 프록시합니다.

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
