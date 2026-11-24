# Student Care + Assessment 로컬 직접 실행 가이드 (Windows PowerShell)

> 작성: 2026-11-16 (A22) · 갱신: 2026-11-16 (A23) · 2026-11-17 (A24) · **2026-11-24 (병합 후 문서 정리 — 분석기는 Backend 안 `local` 모드, Railway 외부 분석기 안내를 현행 절차에서 뺌, 대상 코드 `main`)**.
> 대상 코드: `main`(2026-11-24 기준 `5b9db4b`, PR #17 로 integration 병합 완료). 예전 대상은 `integration/assessment-studentcare-20261116`(당시 Draft PR #17)였다.
> **Railway 는 현행 운영·배포 대상이 아니다**(2026-11-24 사용자 결정). 예전 Railway 단계는 맨 끝 '퇴역 기록'에만 남긴다. 운영·배포·실제 로그인 연동은 1팀 담당으로 이 가이드 범위 밖이다.
> 목적: 개발자가 Spring Boot · 관리자 React · 학생 React를 직접 띄워 학생 케어와 Assessment 사용자 흐름을 확인한다.
> 모든 값(포트·경로·Profile·환경 변수 이름)은 코드에서 확인한 실제 값이다. 아래 '검증 상태' 표에 A22에서 실제로 실행한 것과 아닌 것을 구분했다.

## 0. 한눈에 보기

| 구성 | 실행 위치 | 주소 |
|---|---|---|
| 개발용 MySQL (새 독립 DB) | Docker | `127.0.0.1:33307` · DB `lh_local_run` |
| Spring Boot | `backend/` | `http://localhost:8080` |
| 관리자 React (학생 케어 + Assessment) | `frontend/admin` | `http://localhost:5174` |
| 학생 React (Assessment) | `frontend/student` (+ `e2e/assessment/vite.student.config.ts`) | `http://localhost:5173` |

- **기존 컨테이너와 섞지 않는다.** 저장소의 `docker-compose.yml`은 `learnershigh-mysql`(3306, 볼륨 `mysql-data`)을 쓴다. 이 가이드는 그것을 쓰지도 지우지도 않고, 이름·포트·볼륨이 다른 `lh-local-run-mysql` / `33307` / `lh-local-run-mysql-data`를 새로 만든다. **기존 시연 DB `lh_demo_manual_20261111`에는 연결하지 않는다**(§9).
- 관리자 기본 화면(`/`)은 학생 케어다. 메뉴는 학생 케어 · 학부모 리포트(학생 케어 소속) · Assessment 관리 셋뿐이다.

## 1. 실행 전 준비

| 항목 | 필요 버전·확인 명령 |
|---|---|
| JDK | Gradle 실행용 **JDK 17 이상** (`java -version`). Backend는 **Java 21 Toolchain**으로 빌드·실행된다 — 없으면 Gradle이 내려받는다(`backend/build.gradle.kts`) |
| Node.js / npm | **Node 22** (`^22.12.0`, `node -v`), npm만 사용 |
| Docker Desktop | 실행 중이어야 한다 (`docker version`) |
| Python 3 + JDK `javac` | 합성 시험 문서를 만들 때만(§7-1) |

```powershell
$REPO = 'C:\learnershigh-assessment-integration'
cd $REPO
git status --short          # 비어 있어야 한다
git log --oneline -1        # PR #17 최신 Commit
```

처음 한 번 의존성 설치:

```powershell
cd $REPO\frontend; npm ci
cd $REPO\e2e;      npm ci
```

## 2. 개발용 MySQL 시작 (1단계)

```powershell
# 비밀번호는 이 PowerShell 창에서만 쓴다(파일·Git에 쓰지 않는다)
$env:LH_DB_PASSWORD = [guid]::NewGuid().ToString('N')

docker run -d --name lh-local-run-mysql `
  -p 127.0.0.1:33307:3306 `
  -v lh-local-run-mysql-data:/var/lib/mysql `
  -e MYSQL_ROOT_PASSWORD=$env:LH_DB_PASSWORD `
  -e MYSQL_DATABASE=lh_local_run `
  -e MYSQL_USER=lhlocal `
  -e MYSQL_PASSWORD=$env:LH_DB_PASSWORD `
  mysql:8.4 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

- 성공: 컨테이너 ID 한 줄. `docker ps --filter name=lh-local-run-mysql` 에 `Up`.
- 이미 같은 이름이 있으면(두 번째 실행부터) `docker start lh-local-run-mysql` 만 한다. 이때 **처음 만든 비밀번호**를 다시 써야 하므로 `$env:LH_DB_PASSWORD`를 안전한 곳(비밀번호 관리자 등)에 보관한다. 잊었다면 §10 "처음부터 다시"를 따른다.

## 3. DB 연결 확인 (2단계)

```powershell
# 'ready for connections' 가 두 번 나오면 준비 완료 (처음 기동은 20~40초)
docker logs lh-local-run-mysql 2>&1 | Select-String 'ready for connections'
docker exec -e MYSQL_PWD=$env:LH_DB_PASSWORD lh-local-run-mysql mysql -ulhlocal lh_local_run -e "select database();"
```

- 성공: `lh_local_run` 한 줄. 실패(`Access denied`)면 비밀번호가 처음 값과 다르다.

## 4. Spring Boot 환경 변수 (3단계)

새 PowerShell 창을 Backend 전용으로 쓴다. **토큰은 출력하지 않는다.**

```powershell
cd $REPO\backend

# DB (코드: application.yml의 ${DB_URL} ${DB_USERNAME} ${DB_PASSWORD})
$env:DB_URL      = 'jdbc:mysql://127.0.0.1:33307/lh_local_run'
$env:DB_USERNAME = 'lhlocal'
$env:DB_PASSWORD = $env:LH_DB_PASSWORD      # §2와 같은 창이 아니면 같은 값을 다시 넣는다

# 학생 케어 합성 원천 + 화면 기준일 고정 (CI e2e Job과 같은 값)
$env:SPRING_PROFILES_ACTIVE              = 'care-demo,e2e'
$env:APP_FIXED_DATE                      = '2026-11-12'   # 화면의 오늘
$env:LEARNERSHIGH_MOCK_ANCHOR_DATE       = '2026-11-11'   # 합성 원천 마지막 날
$env:LEARNERSHIGH_MOCK_DATABASE_EXAMPLES = 'true'
$env:LEARNERSHIGH_TEST_ENDPOINTS_ENABLED = 'false'        # 사용자 테스트에서는 /api/test/** 를 열지 않는다

# Assessment: 개발용 시연 명단(합성 학교 15곳·학생 60명·학년별 슬롯)
$env:ASSESSMENT_DEMO_ROSTER_ENABLED = 'true'
$env:ASSESSMENT_STORAGE_ROOT        = "$env:USERPROFILE\.learnershigh-extension\local-run-storage"

# 평가계획서 분석기: 설정할 것이 없다. 기본값 assessment.analyzer.mode=local(Backend 안에서 표를 읽어 분석, 원문 외부 전송 없음·토큰 없음).
#   스캔본 OCR 은 assessment.analyzer.ocr=auto(Tesseract → Windows 내장 OCR). 자세한 값: docs/specs/suyeon/assessment-analyzer-setup.md
#   일부러 끄려면 $env:ASSESSMENT_ANALYZER_MODE='none'(분석 요청이 503). loopback-stub 은 E2E 전용이라 직접 실행에 쓰지 않는다.
# 예전 Railway 용 ASSESSMENT_ANALYZER_BASE_URL·ASSESSMENT_ANALYZER_TOKEN 은 현재 코드가 읽지 않는다(남아 있어도 영향 없음). 남은 덮어쓰기 이름만 확인:
Get-ChildItem Env:ASSESSMENT_ANALYZER_*, Env:ASSESSMENT_ANALYSIS_*, Env:ASSESSMENT_MULTIFORMAT_* -ErrorAction SilentlyContinue | Select-Object Name

# HWP·HWPX 원문 PDF 미리보기 변환기: 설정할 것이 없다(A26 — 기본 켬, 이미지는 Backend가 자동 준비, §4-1).
# 예전에 넣은 ASSESSMENT_PREVIEW_CONVERTER 가 이 창에 남아 있으면 지운다(값이 none이면 변환이 꺼진다):
Remove-Item Env:ASSESSMENT_PREVIEW_CONVERTER -ErrorAction SilentlyContinue

# 설정하지 않는 것: ASSESSMENT_PLAN_REVIEW_STRUCTURED_CONFIRM_DEV (HWP·HWPX 공식 확정 보호 — 기본 false 유지)
```

### 4-1. HWP·HWPX 미리보기 변환기 (A26 — 자동 준비, 명령 입력 없음)

HWP·HWPX 원문은 서버가 PDF로 변환해 PDF Viewer로 보여 준다. 변환기는 LibreOffice(무료, MPL-2.0) + H2Orestart 0.8.0(무료, GPL-3.0 — HWP 5.x·HWPX 읽기 확장)을 넣은 Docker 이미지다. **한컴오피스 등 유료 프로그램은 쓰지 않는다.** 변환은 네트워크를 끊은 일회용 컨테이너에서 한 파일씩 하며, 문서를 외부로 보내지 않는다.

- **할 일: Docker Desktop만 켜 둔다.** `docker build`·환경 변수 입력은 필요 없다.
- Backend가 기동 직후(기동은 기다리지 않음) Docker를 확인하고, 이미지 `lh-plan-preview-converter:<Dockerfile 해시 12자>`가 없으면 **백그라운드로 한 번 만든다**(처음 PC는 2~5분, 약 1.5GB 내려받기). Dockerfile: `backend/src/main/resources/assessment/preview-converter/Dockerfile`. 내용이 바뀌면 새 Tag로 다시 만든다.
- Backend 창 로그로 확인: `plan preview converter image missing — building …` → `… image built: …` (이미 있으면 `… image ready: …`).

```powershell
docker version --format '{{.Server.Version}}'        # 숫자가 나오면 Docker 실행 중
docker image ls lh-plan-preview-converter           # 준비 후 해시 Tag 이미지가 보인다(직접 만들 필요 없음)
```

| 상황 | 화면 (서버 응답) |
|---|---|
| 이미지를 처음 만드는 중 | "PDF 변환기를 준비하고 있어요" + 다시 시도 (503 `PLAN_PREVIEW_PREPARING`) — 몇 분 뒤 다시 열면 된다 |
| Docker Desktop이 꺼짐 | "Docker가 실행 중이어야 해요" (503) — Docker를 켜면 60초 안에 다시 확인해 준비한다(Backend 재시작 불필요) |
| 이미지 만들기 실패(네트워크 등) | "준비하지 못했어요" (503) — 60초 뒤 다음 요청에서 다시 시도. Backend 로그에 원인 |
| 문서를 변환할 수 없음(손상·지원하지 않는 내용) | "이 문서를 PDF로 변환하지 못했어요" + 원본 내려받기 (422). 같은 파일은 다시 변환하지 않는다 |
| 정상 | 변환 PDF + "미리보기용 변환본" 안내. 처음 여는 문서는 2~4초, 두 번째부터(Backend 재시작 후에도) 캐시 |
| 변환을 끄고 싶을 때 | `$env:ASSESSMENT_PREVIEW_CONVERTER = 'none'` → 415, 원본 내려받기만 |

- 변환 PDF는 **원본이 아니다**: 원본 글꼴(함초롬 등) 대신 Nanum·Noto 글꼴을 쓰므로 줄바꿈·쪽 나눔이 원본과 다를 수 있다. 화면에도 그렇게 표시된다. 정확한 대조는 원본 내려받기(한글 프로그램).
- 실측(A25, 로컬 실제 문서 30개 표본): 25개 변환(HWP 16/20, HWPX 9/10), 문서당 약 4초. 실패한 문서는 원본 내려받기로 확인한다.
- 시험·CI는 변환기를 끈다(`none`). 운영 배포는 자동 준비를 끄고(`ASSESSMENT_PREVIEW_CONVERTER_AUTO_PROVISION=false`) 미리 만든 이미지(`ASSESSMENT_PREVIEW_CONVERTER_IMAGE`)를 지정하거나 `soffice` 모드를 쓴다. Spring Boot 컨테이너에 Docker 소켓을 연결하는 방식은 쓰지 않는다.

| 변수 | 의미 / 없을 때 |
|---|---|
| `care-demo` Profile + `LEARNERSHIGH_MOCK_DATABASE_EXAMPLES=true` | 학생 케어가 §6의 합성 원천(210명)을 읽는다. 빠지면 13명 Java Fixture |
| `e2e` Profile + `APP_FIXED_DATE` | 화면 기준일을 2026-11-12로 고정한다(합성 원천은 11-11까지). 빠지면 실제 오늘 기준이라 최근 7일에 기록 없음이 많아진다 |
| `ASSESSMENT_DEMO_ROSTER_ENABLED=true` | 학년별 시연 슬롯·합성 학생. 빠지면 `school_001` 1학년만 |
| 평가계획서 분석기 | 기본 `local`(Backend 안 분석, 원문 외부 전송 없음). `ASSESSMENT_ANALYZER_MODE=none` 이면 분석 503. 별도 분석 서버·토큰 없음 |

## 5. Spring Boot 실행·확인 (4·5단계)

```powershell
.\gradlew.bat bootRun --console=plain
```

- 성공 로그(처음 실행): `Successfully applied N migrations to schema `lh_local_run`` → `Started LearnersHighExtensionApplication`. N 은 `database/migrations` 의 SQL 수(2026-11-24 `main` 기준 **31**, 마지막 `V202611231000`). A22 작성 당시에는 18이었다.
- 두 번째부터: `Successfully validated N migrations` · `Schema ... is up to date. No migration necessary.`
- 로그 `plan analyzer: local (ocr=…)` 이 보이면 분석기가 Backend 안에서 준비된 것이다.
- `Tomcat started on port 8080`. 8080이 이미 쓰이면 `$env:SERVER_PORT='8081'` 후 다시 실행하고, §7·§8의 `VITE_API_TARGET`도 같은 포트로 바꾼다.

다른 창에서 확인:

```powershell
Invoke-RestMethod http://localhost:8080/api/admin/student-care/branches          # §6 전에는 빈 목록
Invoke-RestMethod http://localhost:8080/api/admin/assessment/schools -Headers @{ 'X-Assessment-Admin-Id' = 'adm_plan_operator' }
```

- 둘 다 오류 없이 JSON. 403/401이면 Header 값, 500이면 Backend 로그를 본다.

## 6. 학생 케어 합성 원천 넣기 (처음 한 번)

학생 케어 화면에 학습관·학생이 보이려면 합성 원천(210명 · 3,500일×2.1)을 넣는다. 원천 표 3개만 만들고/갱신하며 DELETE·DROP이 없다.

```powershell
cd $REPO
node scripts/demo/generate-care-seed.mjs            # → scripts/demo/care-demo.generated.sql (Git 무시)
docker cp scripts/demo/care-demo.generated.sql lh-local-run-mysql:/tmp/care-seed.sql
docker exec -e MYSQL_PWD=$env:LH_DB_PASSWORD lh-local-run-mysql sh -c "mysql -ulhlocal --default-character-set=utf8mb4 lh_local_run < /tmp/care-seed.sql"
Invoke-RestMethod http://localhost:8080/api/admin/student-care/branches         # 강남점 150 · 분당점 50 · 수지점 10

# (선택) 상담 이력 예시 1건: 강남점 '등원 시간 늦어짐' 학생 1명에게 '[화면 확인용 예시]' 관리 건. 두 번째 실행은 아무것도 쓰지 않는다
$env:CARE_DEMO_API_ORIGIN = 'http://localhost:8080'; node scripts/demo/seed-care-history.mjs
```

## 7. 관리자 React 실행 (6단계)

새 PowerShell 창:

```powershell
cd $REPO\frontend\admin
$env:VITE_ASSESSMENT_DATA_SOURCE      = 'http'                    # Assessment를 실제 Backend로
$env:VITE_API_TARGET                  = 'http://localhost:8080'   # /api Proxy 대상 (학생 케어도 같은 Backend)
$env:VITE_ASSESSMENT_DEV_ADMIN_ID     = 'adm_plan_operator'       # 개발용 Mock 관리자(평가계획서 운영자) — 실제 로그인 아님
$env:VITE_ASSESSMENT_DEV_CURRENT_TERM = '2026-1'                  # 시연 슬롯·합성 문서가 1학기
# 대학별 자료 원본 PDF 폴더(A25). 원본 PDF는 Git에 없다(재배포 권한 미확인). 이 PC에 있는 폴더를 절대 경로로 지정한다
$env:ASSESSMENT_UNIVERSITY_EXAM_ROOT  = 'C:\learnershigh-extension\references\previous-exam-questions'
# 심화 탐구 모의고사 원문 지문(텍스트, PDF 아님 — A26). Git 밖 JSON 파일을 절대 경로로 지정한다
$env:ASSESSMENT_MOCK_EXAM_PASSAGES_FILE = 'C:\learnershigh-extension\frontend\student\src\features\assessment\api\mock\mockExamPassages.local.json'
npx vite --port 5174 --strictPort
```

- 성공: `Local: http://localhost:5174/`. 브라우저로 열면 주소가 `/student-care`로 바뀌고 **학생 케어**(학습관 '강남점', '150명')가 보인다.
- '사진 관찰' 탭은 감독관 서비스(127.0.0.1:39741)가 없으면 **"사진 관찰 서버에 연결하지 못했습니다"**가 정상이다(오류 안내, 빈 화면 아님).

## 8. 학생 React 실행 (7단계)

새 PowerShell 창. 학생 기본 `vite.config.ts`에는 `/api` Proxy가 없어서, 같은 설정에 Proxy만 더한 `e2e/assessment/vite.student.config.ts`로 띄운다(A18·A19 실측과 같은 방법).

```powershell
cd $REPO\frontend\student
$env:VITE_ASSESSMENT_DATA_SOURCE      = 'http'
$env:VITE_API_TARGET                  = 'http://localhost:8080'
$env:VITE_ASSESSMENT_DEV_STUDENT_ID   = 'stu_demo_001'            # 기본 학생 (운정고 1학년)
$env:VITE_ASSESSMENT_DEV_CURRENT_TERM = '2026-1'
$env:E2E_STUDENT_PORT                 = '5173'
$env:ASSESSMENT_UNIVERSITY_EXAM_ROOT  = 'C:\learnershigh-extension\references\previous-exam-questions'   # 대학별 자료 PDF (A25)
$env:ASSESSMENT_MOCK_EXAM_PASSAGES_FILE = 'C:\learnershigh-extension\frontend\student\src\features\assessment\api\mock\mockExamPassages.local.json'   # 모의고사 원문 텍스트 (A26)
npx vite --config ../../e2e/assessment/vite.student.config.ts --port 5173 --strictPort
```

- 성공: `Local: http://localhost:5173/`. `/`는 `/assessment`로 간다.
- 학생 바꾸기(개발 서버 전용): 주소 끝에 `?devStudent=<id>`.

| 학생 | ID | 학교·학년 |
|---|---|---|
| 1학년 | `stu_demo_001` | 운정고등학교(`sch_demo_unjeong`) 1학년 |
| 2학년 | `stu_demo_002` | 운정고 2학년 |
| 3학년 | `stu_demo_003` | 운정고 3학년 |
| 다른 학교 | `stu_demo_007` | 문현(`sch_demo_munhyeon`) 3학년 |

## 9. 사용자 흐름 (8~14단계)

### 9-1. 합성 시험 문서 만들기

화면 흐름을 개인정보 없이 확인할 때 쓰는 합성 문서 생성기다. 분석은 Backend 안(`local`)에서 하므로 문서가 외부로 나가지 않는다. 생성기는 예전 이름 그대로 `e2e/assessment-railway/fixtures/` 에 있다(폴더 이름만 옛것 — 경로 변경은 시험·스크립트 영향 확인 뒤 별도 변경으로 한다).

```powershell
$OUT = "$env:USERPROFILE\.learnershigh-extension\synthetic-a19"; New-Item -ItemType Directory -Force $OUT | Out-Null
$B   = 'C:\Users\<계정>\LearnersHigh-local\public-release\learnershigh-assessment-analyzer\tools\public_tests\fixtures'   # 계정 B 공개 생성기(읽기만)
python -I -X utf8 $REPO\e2e\assessment-railway\fixtures\synthetic_grade_plans.py $B $OUT     # HWP·HWPX·HTML + manifest
# PDF: Backend를 한 번 빌드하면 Gradle 캐시에 PDFBox 3.0.5가 있다
$G  = "$env:USERPROFILE\.gradle\caches\modules-2\files-2.1"
$CP = (Get-ChildItem $G -Recurse -Include pdfbox-3.0.5.jar,fontbox-3.0.5.jar,pdfbox-io-3.0.5.jar,commons-logging-1.3.5.jar | Where-Object Name -notlike '*sources*' | ForEach-Object FullName) -join ';'
javac -encoding UTF-8 -cp $CP -d $OUT\build $REPO\e2e\assessment-railway\fixtures\SyntheticGradePlanPdf.java
1..3 | ForEach-Object { java -cp "$OUT\build;$CP" SyntheticGradePlanPdf $_ "$OUT\synthetic-a19-g$_.pdf" C:\Windows\Fonts\NanumGothic.ttf }
Get-ChildItem $OUT -Include *.pdf,*.hwp,*.hwpx -Recurse | Select-Object Name, Length
```

### 9-2. 관리자: 평가계획서 업로드·분석·확정

1. 관리자 `http://localhost:5174/assessment/evaluation-plans?school=sch_demo_unjeong&year=2026&grade=1&semester=1`
2. **평가계획서 등록** → `synthetic-a19-g1.pdf` → **등록하고 분석**. 진행 막대가 보이고 분석이 끝나면 검토 화면이 열린다(Backend 안 분석 — 걸리는 시간은 문서 쪽수·스캔 여부에 따라 다르다).
3. **과목 확인**: 과목 카드 1개, '원문 1학년'. 학년 슬롯 과목 하나를 고른다.
4. **수행평가 검토**: '평가 비율' → 수행평가 반영비율 60% **확인**. 화면 아래 '서버에 임시 저장됨'.
5. **최종 확정**: 같은 PDF를 '원본 대조'로 고르고 대조 확인 체크 → (부분 분석 안내가 있으면 체크) → **최종 확정** → '확정됨'.
6. 학년 충돌 확인: 같은 학교 `grade=2` 목록에서 `synthetic-a19-g1.pdf`를 올리면 과목 카드에 **'확정할 수 없어요'**(원문 1학년 ≠ 2학년).
7. HWPX 운영계획: `grade=3` 목록에서 `synthetic-a19-g3.hwpx` 업로드 → '월별 운영 계획' 단계 → 과목 선택 → 5행 **확인** → **확정** → '확정됨'.
8. HWP·HWPX의 **평가정보 공식 확정은 거절된다**(`verified_auth_required` — 실제 관리자 인증 연동 전 보호). 정상 동작이다.

### 9-3. 학생: 평가정보·Monthly Planner

1. `http://localhost:5173/assessment/evaluation-plans?devStudent=stu_demo_001` → 1학년 확정 문서가 보인다.
2. `?devStudent=stu_demo_002` → 1학년 문서가 **보이지 않는다**(다른 학년 차단).
3. `http://localhost:5173/assessment/monthly-plan?devStudent=stu_demo_003` → 3학년 HWPX 운영계획 5행. `stu_demo_001`·`stu_demo_007`에게는 없다.
4. 새로고침해도 그대로(서버 저장).

### 9-4. 학생 케어

1. 관리자 `http://localhost:5174/` → 학생 케어. 학습관 바꾸기(분당점 50명·수지점 10명), '관리 사유로 거르기', 검색.
2. 학생 줄을 누르면 상세: 학습관 생활(최근 7일 출결·계획 제출·공부 시간) · 사진 관찰 · 상담 · 학부모 리포트.
3. '상담' 탭에서 상담 방법·내용·결과(계속 관리)를 넣고 **저장** → '상담 기록' 보기에서 그 학생의 관리 건 1건, 줄을 펼치면 내용.
   - **알려진 결함**: 상담 탭을 연 뒤 처음 입력한 글자 하나가 사라진다(예: 기록자 'XY' → 'Y'). 두 번째 칸부터는 정상. 완규님 확인 대기.
4. 메뉴 '학부모 리포트' → 학부모 리포트 화면.

### 9-5. A25 변경 확인

1. **대학별 자료 PDF**: 관리자 '심화 탐구 콘텐츠 → 대학별 자료'와 학생 '대학별 자료'에서 문서를 열면 원본 PDF가 쪽 이동·확대·축소로 보인다. 개발 서버 창에 `[university-exams] 원본 PDF 폴더: 연결됨`이 찍혀야 한다. '원본 자료 폴더가 연결되지 않았어요'가 보이면 `ASSESSMENT_UNIVERSITY_EXAM_ROOT`를 확인한다(파일이 없는 것과 구분해 안내).
2. **평가계획서 삭제**: 학교별 평가계획서 목록 → 행 오른쪽 `⋯` → 삭제 → 파일 이름 확인 → 삭제. 학생에게 공개 중인 문서는 '학생 화면에서도 사라지는 것을 확인했어요'를 체크해야 삭제된다. 삭제 뒤 목록·학생 화면·Monthly Planner에서 사라지고, 기록·원문 파일은 서버에 보관된다(복원 화면은 없음).
3. **HWP·HWPX 원문**: 검토 화면 왼쪽 'PDF 미리보기' 탭(변환본 안내 문구 포함), '분석용 구조' 탭(근거 위치 강조). 근거 위치 버튼을 누르면 '분석용 구조' 탭으로 바뀐다(변환 PDF 쪽으로 추측해 이동하지 않음).
4. **최종 확정 원본 대조**: 'PDF' 카드의 '파일 선택'(또는 끌어 놓기) → 파일 이름·크기·'같은 파일이에요'. 다른 파일이면 '이 파일로는 확정할 수 없어요'로 막힌다.
5. 상단 'PDF AI 분석' 버튼은 없어졌다(등록 과정에서 서버 분석). 예전 주소 `/assessment/evaluation-plans/ai-analysis`는 목록으로 열린다.

### 9-6. A26 변경 확인

1. **HWP·HWPX 미리보기(자동 변환)**: Docker Desktop을 켠 채 Backend를 실행 → 로그에 `image ready` 또는 `building … built` → 관리자 학교별 평가계획서에서 HWP/HWPX 문서 '검토' → 왼쪽 'PDF 미리보기'에 변환본이 보인다. 이미지 준비 중이면 "준비하고 있어요" → 잠시 뒤 '다시 시도'.
2. **모의고사 원문(텍스트)**: 학생 `http://localhost:5173/assessment/enrichment/mock-exams/KO-02`, 관리자 `http://localhost:5174/assessment/content/mock-exams/KO-02` → 문항 번호·시험 이름과 지문 원문(문단·줄바꿈 그대로)이 보인다. **PDF·문서 변환은 필요 없다.** 등록 데이터에는 지문만 있고 발문·선택지는 없으며 화면에도 그렇게 표시된다. 개발 서버 창에 `[mock-exam-passages] 모의고사 원문 지문: 60개 (설정 파일)`가 찍혀야 한다. '원문이 아직 연결되지 않았어요'가 보이면 `ASSESSMENT_MOCK_EXAM_PASSAGES_FILE` 확인. 대학별 자료 PDF(`ASSESSMENT_UNIVERSITY_EXAM_ROOT`)와는 다른 기능이다.
3. **월별 운영계획 달력**: 학생 `http://localhost:5173/assessment/monthly-plan?devStudent=stu_demo_003`(3학년 확정 운영계획이 있을 때). 'n월 m주' 계획은 **그 달 달력의 m번째 줄(일요일 시작) 날짜에 임시 배치**된다 — 예: 2026년 3월은 1일이 일요일이라 1주차 3/1~3/7, **2주차 3/8~3/14**, 3주차 3/15~3/21. 같은 주의 여러 과목은 월~금에 나눠 놓고(새로고침해도 같은 날짜), 칸마다 최대 4개(좁은 화면 3개), 넘치면 `+N개`. 일정을 누르면 상세 창(원문 시기 · 달력 표시 날짜 · '주차 기준 임시 배치 · 실제 수업일 미확정'), Esc로 닫힘. 표시 날짜는 저장되지 않는다. 관리자 검토의 '월별 운영 계획' 단계도 같은 달력이다.

## 10. 정상 종료 (15단계)

```powershell
# 각 Vite 창: Ctrl+C
# Backend 창: Ctrl+C (Gradle이 묻으면 Y)
docker stop lh-local-run-mysql          # 데이터는 lh-local-run-mysql-data 볼륨에 남는다
# 다음에 다시: docker start lh-local-run-mysql → §4~§8 (§6은 다시 할 필요 없음)

# 처음부터 다시(이 가이드가 만든 것만 지운다 — learnershigh-mysql·mysql-data는 건드리지 않음)
docker rm -f lh-local-run-mysql; docker volume rm lh-local-run-mysql-data
# 예전에 넣은 분석기 토큰 User 환경 변수(ASSESSMENT_ANALYZER_TOKEN)는 현재 코드가 읽지 않는다. 정리하려면 Windows 사용자 환경 변수에서 지운다(값을 화면에 출력하지 않는다).
```

## 11. 체크리스트

- [ ] Spring Boot 정상 실행 (18 migrations / validated, port 8080)
- [ ] Admin Frontend 정상 실행 (5174)
- [ ] Student Frontend 정상 실행 (5173)
- [ ] 관리자 기본 화면이 학생 케어 (`/` → `/student-care`)
- [ ] 학부모 리포트 진입 (메뉴 · 학생 상세 탭)
- [ ] Assessment 관리자 화면 진입
- [ ] PDF 업로드
- [ ] HWP 업로드
- [ ] HWPX 업로드
- [ ] 평가계획서 분석 정상 (Backend 안 `local` 분석기, 별도 설정 없이)
- [ ] 분석 결과 검토
- [ ] 학년별 확정 (PDF 평가 비율 · HWPX 운영계획)
- [ ] 학생 평가정보 조회
- [ ] Monthly Planner 조회
- [ ] 다른 학년 정보 접근 차단
- [ ] 데이터 저장·새로고침 유지
- [ ] 구형 관리자 메뉴 제거 (Today Board · Feedback Dashboard · Connection · Interview · Operations 없음, 예전 주소는 '페이지 없음')
- [ ] 화면 전환 시 오류 없음

**수동 시연으로 확인할 수 없는 항목(현재 한계)**

| 항목 | 이유 |
|---|---|
| PDF 수행평가 항목·채점기준·요소 배점 수정 | 합성 PDF에서 분석기가 수행평가 항목을 뽑지 못한다(계정 B 공개 합성 PDF도 같음, A19). 반영 비율·지필·운영계획·학년만 나온다 |
| `maxScore`·`linkReview` 원격 수신 | 합성 문서에 해당 신호가 없다 |
| HWP·HWPX 평가정보 공식 확정 | `verified_auth_required` 보호(실제 관리자 인증 연동 전 의도된 거절) |
| 사진 관찰 실제 사진 | 감독관·사진 관찰 서비스가 로컬에 없다(연결 실패 안내가 정상) |
| 실제 로그인·실제 학교 데이터 | Mock Header·합성 명단. 기존 러너스하이 PHP 연동은 범위 밖 |

## 12. 문제 해결

| 증상 | 확인 |
|---|---|
| Backend가 `Access denied` | `DB_PASSWORD`가 §2 처음 값과 같은지 |
| `Detected resolved migration not applied to database` | 다른 DB(예: 시연 DB)에 붙었다. `DB_URL`이 `33307/lh_local_run`인지 |
| 학생 케어 '학습관 목록을 불러오지 못했습니다' | §6 원천을 넣었는지, Profile에 `care-demo`가 있는지 |
| 학생 케어 최근 7일이 '기록 없음' | `e2e` Profile과 `APP_FIXED_DATE=2026-11-12`가 빠졌다 |
| Assessment 화면 401 | `VITE_ASSESSMENT_DEV_ADMIN_ID`(관리자) / `VITE_ASSESSMENT_DEV_STUDENT_ID`(학생)가 비었다 |
| 학생 화면 404/연결 실패 | 학생은 `e2e/assessment/vite.student.config.ts`로 띄워야 `/api`가 Backend로 간다 |
| 분석 503 `PLAN_ANALYZER_NOT_CONFIGURED` | `ASSESSMENT_ANALYZER_MODE` 가 `none` 이다 — 지우거나 `local` 로 둔다 |
| 분석 거절 `PLAN_ANALYSIS_UNSUPPORTED` | 서버 안 분석기가 읽을 수 없는 형식이다(`LocalPlanAnalyzer` 의 `UNSUPPORTED_FORMAT` — PDF·HWP·HWPX 만) — 파일 형식 확인 |
| Backend 가 `assessment.analyzer.mode 는 local 또는 none 이어야 합니다` 로 시작 거부 | 예전 값(`http` 등)이 환경 변수에 남았다 — `ASSESSMENT_ANALYZER_MODE` 를 지운다 |
| 스캔본 PDF 에서 표를 못 읽음 | OCR 엔진이 없다 — Windows 는 내장 OCR, Linux 는 `tesseract`(`kor`) 설치(`assessment-analyzer-setup.md`) |

## 13. 검증 상태 (A22 — 당시 기록, 역사 보존)

> 아래 표는 2026-11-16 A22·A23 당시 실행 기록이다(당시 Migration 18건, 분석은 Railway). 현재 `main` 의 시험 증거는 `docs/specs/suyeon/POST-MERGE-DOCUMENT-CLEANUP-20261124.md` §2 를 본다.

| 단계 | 상태 |
|---|---|
| 새 독립 DB에 18 Migration 순서대로 적용 + Backend 기동 + 같은 DB로 재기동(`validated 18`, `up to date`) + 학생 케어·Assessment API 200 | **실행 확인**(일회용 tmpfs MySQL, bash로 같은 값 실행) |
| §6 합성 원천·상담 예시 Seed(재실행 시 쓰기 없음) | **실행 확인** |
| §7 관리자 preview/화면 (`/`→학생 케어, 메뉴 3개, 학생 케어·Assessment·학부모 리포트 전환) | **실행 확인**(Playwright 인수 시험 22건) |
| §8 학생 Vite + §9-2·9-3 Railway 흐름(합성 PDF·HWPX 업로드·분석·학년별 확정·학생 조회·학년 충돌·HWP/HWPX 보호) | **A23에서 실행 확인** — Railway 관련 환경 변수를 모두 지운 Backend로 Railway 화면 E2E **4/4**, API 실측 7건(합성 문서만 전송) |
| §9-4 학생 케어 흐름 | **실행 확인** — 학생 케어 X′ 인수 시험(학습관·거르기·상세·상담 저장·관리 기준·학습관별·사진 관찰 오류 안내·학부모 리포트) |
| PowerShell 문법 그대로의 실행(§2~§10) | **미검증** — 같은 값으로 bash에서 실행했다. PowerShell 줄 바꿈(`` ` ``)·따옴표에서 문제가 나면 알려 주세요 |

## 14. 퇴역 기록 — Railway 외부 분석기 (역사, 현행 절차 아님)

- 2026-11-16 A19·A23·A24 당시 평가계획서 분석은 Railway 의 외부 HTTP 분석기(`/analyze-preview`)로 했고, 이 가이드도 그 연결(주소·토큰을 `application.yml` 에 고정, `analyzer_auth_failed`·`BUSY` 문제 해결, 'Railway 분석 요청 정상' 체크 항목)을 설명했다. 근거 기록: `ACCOUNT-A-A19-RAILWAY-HTTPS-INTEGRATION-20261116.md` · `ACCOUNT-A-A23-RAILWAY-YAML-CONFIG-20261116.md` · `ACCOUNT-A-A24-RAILWAY-TOKEN-YAML-ONLY-20261117.md`(모두 보존).
- 2026-11-19 PR #18(완규님) 통합으로 분석은 Backend 안 `local` 분석기로 바뀌었고 `http` 모드는 사라졌다(`PlanAnalyzerConfig`). 2026-11-24 사용자 결정으로 Railway 는 현행 운영·배포 대상에서 제외됐다.
- **이 저장소가 한 것**: 코드·현행 문서에서 Railway 사용을 걷어 냄. **하지 않은 것**: Railway 원격 프로젝트·서비스 삭제, 토큰 폐기 — 외부 서비스 조작은 1팀·해당 서비스 관리자와 조율할 운영 항목이다.
- **보안 경고(유지)**: 예전 `application.yml` 에 들어 있던 Railway 토큰 형태의 값이 과거 Git 커밋에 남아 있다(값은 어디에도 다시 적지 않는다). 현재 코드는 Railway 를 쓰지 않지만, **과거 토큰이 무효화됐는지는 확인이 필요하다**(1팀/Railway 관리자). Git 이력 재작성은 팀 결정 사항이다.
