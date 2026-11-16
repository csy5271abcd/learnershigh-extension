# Student Care + Assessment 로컬 직접 실행 가이드 (Windows PowerShell)

> 작성: 2026-11-16 (A22) · 갱신: 2026-11-16 (A23 — Railway 분석기 연결을 `application.yml`에 고정, 환경 변수 단계 제거) · 2026-11-17 (A24 — 토큰은 YAML 값만 사용, `ASSESSMENT_ANALYZER_TOKEN` 무시). 대상 코드: `integration/assessment-studentcare-20261116` (Draft PR #17).
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

# Railway 평가계획서 분석기: 설정할 것이 없다 (A23).
#   backend/src/main/resources/application.yml 의 assessment.analyzer.*(주소·B16 프로필·150초·토큰)와
#   assessment.analysis-import.contract03-enabled / assessment.multiformat.experimental 이 그대로 적용된다.
# 토큰은 application.yml 값만 쓴다(A24). ASSESSMENT_ANALYZER_TOKEN 환경 변수(이 창·Windows User)가 남아 있어도 무시되므로 지울 필요 없다.
# 주소·프로필·Timeout 등 다른 ASSESSMENT_ANALYZER_* 는 환경 변수가 있으면 YAML보다 우선한다 — 남은 덮어쓰기 이름만 확인:
Get-ChildItem Env:ASSESSMENT_ANALYZER_*, Env:ASSESSMENT_ANALYSIS_*, Env:ASSESSMENT_MULTIFORMAT_* -ErrorAction SilentlyContinue | Where-Object Name -ne 'ASSESSMENT_ANALYZER_TOKEN' | Select-Object Name

# 설정하지 않는 것: ASSESSMENT_PLAN_REVIEW_STRUCTURED_CONFIRM_DEV (HWP·HWPX 공식 확정 보호 — 기본 false 유지)
```

| 변수 | 의미 / 없을 때 |
|---|---|
| `care-demo` Profile + `LEARNERSHIGH_MOCK_DATABASE_EXAMPLES=true` | 학생 케어가 §6의 합성 원천(210명)을 읽는다. 빠지면 13명 Java Fixture |
| `e2e` Profile + `APP_FIXED_DATE` | 화면 기준일을 2026-11-12로 고정한다(합성 원천은 11-11까지). 빠지면 실제 오늘 기준이라 최근 7일에 기록 없음이 많아진다 |
| `ASSESSMENT_DEMO_ROSTER_ENABLED=true` | 학년별 시연 슬롯·합성 학생. 빠지면 `school_001` 1학년만 |
| Railway 분석기 | `application.yml`에 고정(A23). **토큰은 YAML 값만 쓰고 환경 변수는 무시한다(A24)**. 주소·프로필·Timeout은 환경 변수가 있으면 그 값이 우선한다 — 실제 학교 문서로 시험할 때는 반드시 `ASSESSMENT_ANALYZER_BASE_URL`을 로컬 분석기로 덮어쓴다(원격 전송 금지) |

## 5. Spring Boot 실행·확인 (4·5단계)

```powershell
.\gradlew.bat bootRun --console=plain
```

- 성공 로그(처음 실행): `Successfully applied 18 migrations to schema `lh_local_run`` → `Started LearnersHighExtensionApplication`.
- 두 번째부터: `Successfully validated 18 migrations` · `Schema ... is up to date. No migration necessary.`
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

### 9-1. 합성 시험 문서 만들기 (Railway로 보내도 되는 문서만)

**Railway로는 아래 생성기가 만든 합성 문서만 보낸다. 실제 학교 문서·기존 코퍼스(F0xxxx)는 보내지 않는다.**

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
2. **평가계획서 등록** → `synthetic-a19-g1.pdf` → **등록하고 분석**. 진행 막대가 보이고 1~2초 뒤 검토 화면이 열린다(Railway 왕복 약 1~1.4초 — A19 실측).
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

## 10. 정상 종료 (15단계)

```powershell
# 각 Vite 창: Ctrl+C
# Backend 창: Ctrl+C (Gradle이 묻으면 Y)
docker stop lh-local-run-mysql          # 데이터는 lh-local-run-mysql-data 볼륨에 남는다
# 다음에 다시: docker start lh-local-run-mysql → §4~§8 (§6은 다시 할 필요 없음)

# 처음부터 다시(이 가이드가 만든 것만 지운다 — learnershigh-mysql·mysql-data는 건드리지 않음)
docker rm -f lh-local-run-mysql; docker volume rm lh-local-run-mysql-data
# 예전에 넣은 분석기 토큰 User 환경 변수(ASSESSMENT_ANALYZER_TOKEN)는 무시되므로 그대로 두어도 된다(A24).
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
- [ ] Railway 분석 요청 정상 (별도 설정 없이)
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
| 분석 503 `PLAN_ANALYZER_NOT_CONFIGURED` | 실행 중 주소가 비었다 — `ASSESSMENT_ANALYZER_BASE_URL`에 빈 값을 넣지 않았는지 확인 |
| 분석 503 `analyzer_auth_failed` | `application.yml`의 토큰과 Railway 토큰이 다르다(환경 변수 때문에는 생기지 않음 — A24). Railway 토큰이 교체됐는지 확인 |
| 분석 503 `BUSY` | Railway 동시 처리 1 — 잠시 뒤 다시 |

## 13. 검증 상태 (A22)

| 단계 | 상태 |
|---|---|
| 새 독립 DB에 18 Migration 순서대로 적용 + Backend 기동 + 같은 DB로 재기동(`validated 18`, `up to date`) + 학생 케어·Assessment API 200 | **실행 확인**(일회용 tmpfs MySQL, bash로 같은 값 실행) |
| §6 합성 원천·상담 예시 Seed(재실행 시 쓰기 없음) | **실행 확인** |
| §7 관리자 preview/화면 (`/`→학생 케어, 메뉴 3개, 학생 케어·Assessment·학부모 리포트 전환) | **실행 확인**(Playwright 인수 시험 22건) |
| §8 학생 Vite + §9-2·9-3 Railway 흐름(합성 PDF·HWPX 업로드·분석·학년별 확정·학생 조회·학년 충돌·HWP/HWPX 보호) | **A23에서 실행 확인** — Railway 관련 환경 변수를 모두 지운 Backend로 Railway 화면 E2E **4/4**, API 실측 7건(합성 문서만 전송) |
| §9-4 학생 케어 흐름 | **실행 확인** — 학생 케어 X′ 인수 시험(학습관·거르기·상세·상담 저장·관리 기준·학습관별·사진 관찰 오류 안내·학부모 리포트) |
| PowerShell 문법 그대로의 실행(§2~§10) | **미검증** — 같은 값으로 bash에서 실행했다. PowerShell 줄 바꿈(`` ` ``)·따옴표에서 문제가 나면 알려 주세요 |
