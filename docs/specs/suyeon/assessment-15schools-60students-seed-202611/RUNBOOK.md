# 시연·재실행 방법

> 비밀번호·토큰 값은 적지 않는다. 개발용 Mock 인증(Header)은 **실제 로그인이 아니다.** 운영 환경에서 시연 플래그를 켜지 않는다.

## 1. Backend (시연 명단 ON)

```powershell
cd C:\learnershigh-extension\backend
# DB 연결 환경 변수(DB_URL / DB_USERNAME / DB_PASSWORD)는 평소 방식 그대로
$env:ASSESSMENT_ANALYSIS_IMPORT_ENABLED = 'true'      # 기존 시연과 같음(선택)
$env:ASSESSMENT_DEMO_ROSTER_ENABLED     = 'true'      # 시연 지점 3개·학생 60명·관리자 4명 (기본 OFF)
.\gradlew.bat bootJar --no-daemon                     # 코드가 바뀌었으면 jar를 다시 만든다(실행 중이면 먼저 종료)
& "$HOME\.jdks\jbr-21.0.8\bin\java.exe" -Xmx384m -jar ".\build\libs\learnershigh-extension-backend-0.0.1.jar" --server.port=18080
```

- `--server.port=18080`을 빼면 8080으로 뜬다. 기존 Student/Admin 개발 서버의 Proxy는 18080을 본다.
- 플래그를 빼면(OFF) 이전과 완전히 같다: 시연 관리자는 401, 시연 학생은 인증 실패.

## 2. 화면 (계정 Context마다 개발 서버 1개)

실제 로그인·로그아웃 UI가 없다. **계정 = 개발 서버 실행 시 지정하는 ID**다. 계정을 바꾸려면 서버를 끄고 다른 ID로 다시 띄우거나, 다른 포트로 하나 더 띄운다.

```powershell
# 관리자 (A01 / A02 / B01 / C01 중 하나)
.\docs\specs\suyeon\assessment-full-integration-202611\scripts\run-admin-http-dev.ps1 -AdminId adm_demo_a01 -PlanSchools '' -CurrentTerm 2026-2
#   → http://localhost:5174/assessment/students   (A지점 20명)

# 학생 (예: 3학년 자사고 stu_demo_019)
.\docs\specs\suyeon\assessment-ui-analysis-connection-202611\scripts\run-student-analysis-preview-dev.ps1 -StudentId stu_demo_019 -CurrentTerm 2026-2 -Port 5176
#   → http://localhost:5176/assessment
```

| 계정 | 지점 | 담당 학교 |
|---|---|---|
| `adm_demo_a01`, `adm_demo_a02` | `br_demo_a` 러너스하이 시연 A지점 | 운정·문현·호서·인천하늘·세화 |
| `adm_demo_b01` | `br_demo_b` 러너스하이 시연 B지점 | 대신·한림·진양·삼각산·가좌 |
| `adm_demo_c01` | `br_demo_c` 러너스하이 시연 C지점 | 충무·광명·세종·한솔·제주 |

추천 시연 학생: `SYNTHETIC-STUDENTS.md` (예: `stu_demo_001` 1학년 일반고·피드백 전달 / `stu_demo_006` 2학년 생명·지구·PDF+PNG / `stu_demo_011` 3학년 자연과학·피드백 대기 / `stu_demo_019` 3학년 자사고 수학·정보).

## 3. 데이터 재생성·검증 (다시 실행해도 중복 없음)

```powershell
cd C:\learnershigh-extension\docs\specs\suyeon\assessment-15schools-60students-seed-202611\scripts
node build-grade-semester-subject-catalog.mjs          # 카탈로그(이전 근거 유지) → Backend 리소스
node build-demo-roster.mjs                            # 명단 → Backend 리소스 (바꾸면 jar 재빌드·재시작)
node seed-student-activities.mjs --api http://localhost:18080 [--school unjeong,sehwa]
node verify-seed.mjs --api http://localhost:18080     # → DATA-VALIDATION.json
node build-docs.mjs                                   # 문서 재생성
```

화면 검증(검증용 개발 서버를 계정마다 다른 포트로 띄운 뒤):

```powershell
node ui-verify-e2e.mjs admin   "C:\Program Files\Google\Chrome\Application\chrome.exe" http://localhost:5184 adm_demo_a01 ..\screenshots\admin
node ui-verify-e2e.mjs student "C:\Program Files\Google\Chrome\Application\chrome.exe" http://localhost:5190 stu_demo_001 ..\screenshots\student --create-via-modal
```

## 4. 원래대로 (시연 끄기)

`ASSESSMENT_DEMO_ROSTER_ENABLED`를 빼고 Backend를 재시작한다. 이미 만든 시연 수행평가 등은 DB에 남지만, 명단이 꺼지면 어떤 계정으로도 조회되지 않는다(삭제는 하지 않았다).
