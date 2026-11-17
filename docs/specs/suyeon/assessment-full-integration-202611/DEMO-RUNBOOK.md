# 시연 실행 가이드 (11-12 오전) — Student 5173 · Admin 5174 · 분석기 연결

> 기존 `assessment-demo-final-check-202611/DEMO-RUNBOOK.md`(PDF v21.1 기준선)를 바탕으로, 이번에 추가한 분석기 연결 실행만 덧붙였다. 비밀번호·토큰 값은 적지 않는다.

## 0. 지금(11-11 저녁) 실행 중인 상태

| 구분 | 주소 | 실행 방식 |
|---|---|---|
| Backend | `http://localhost:18080` | 기존 jar, 시연 Schema `lh_demo_manual_20261111`, 분석 수신 ON, 실험(HWP·HWPX) OFF |
| Student | `http://localhost:5173/assessment` | http + **분석기 Proxy·분석 Flag ON** |
| Admin | `http://localhost:5174/assessment` | http + **분석기 Proxy·자동 분석 Flag ON** (PDF) |
| 분석기 | `http://127.0.0.1:8765/health` | 계정 B 서비스 |
| MySQL | `localhost:3307` | Docker `learnershigh-mysql` |

## 1. 처음부터 다시 띄울 때 (PowerShell, 각각 다른 창)

```powershell
# 1) MySQL·Backend — 기존 DEMO-RUNBOOK §1~3 그대로 (Schema는 시연 Schema 사용, Flyway Repair 금지)

# 2) 분석기 (계정 B)
cd "C:\Users\<사용자>\LearnersHigh-local\curriculum-analysis"
.venv-llm\Scripts\python.exe -I -B -X utf8 tools\service\analysis_service.py

# 3) Student 5173 (분석 결과 전체 페이지 포함)
cd C:\learnershigh-extension
.\docs\specs\suyeon\assessment-ui-analysis-connection-202611\scripts\run-student-analysis-preview-dev.ps1 -Port 5173 `
  -TokenFile "C:\Users\<사용자>\LearnersHigh-local\curriculum-analysis\sensitive\service\dev-token.txt"

# 4) Admin 5174 (자동 분석 포함)
.\docs\specs\suyeon\assessment-full-integration-202611\scripts\run-admin-http-dev.ps1 -Analyzer `
  -TokenFile "C:\Users\<사용자>\LearnersHigh-local\curriculum-analysis\sensitive\service\dev-token.txt"
```

분석기 없이 기존 PDF v21.1 시연만 하려면: Student는 `assessment-final-integration-202611\scripts\run-student-http-dev.ps1`, Admin은 `run-admin-http-dev.ps1`(스위치 없이).

포트가 사용 중이면 Vite가 다른 포트로 옮겨 가지 않고 실패한다(strictPort). 명령줄이 `learnershigh-extension\frontend\…vite`인 Node만 종료한다.

## 2. 시연 순서 (권장)

1. **Student 분석 결과 전체 페이지**: `5173/assessment/school-assessments` → "평가계획서 가져오기" → 합성 PDF 선택 → 분석 시작 → 결과 페이지(문서 정보·요약·과목 탭·지필 표·수행 카드·채점 표·근거 펼치기). 같은 방법으로 합성 HWPX → "구역·표·행·열" 근거와 실험 안내.
   - 설명: "자동 분석 후보 · 관리자 확인 전", 규칙 기반(AI 호출 없음), 저장 안 됨(새로고침하면 다시 분석).
2. **Admin 자동 분석**: `5174/assessment/evaluation-plans` → "평가계획서 등록" → 학년·학기 → 합성 PDF → "등록하고 분석" → 검토 전체 페이지로 이동 → 원본 PDF 선택(해시 일치) → 과목 연결 → 필드 확인 → 확정.
   - 주의: 시연 Schema에 실제로 저장된다. 이미 확정한 문서가 있는 칸에 올리면 새 개정본이 된다(DEMO-RUNBOOK 기존 주의 그대로).
3. **Student 공식 정보**: 확정된 Revision이 최신일 때 학생 화면에 확정값만 보인다.
4. **심화 탐구**: 참고자료(모의고사 60·대학 27·PDF 뷰어).

합성 파일(읽기만): 계정 B `runs/v21-pdf-quality-backend-bridge-20261109/e2e/synthetic-e2e.pdf`, `runs/v21-multiformat-backend-bridge-20261110/synthetic/synthetic-plan.hwp(x)`. 실제 학교 문서는 쓰지 않는다.

## 3. 시연하지 않을 것 (아직 실데이터 아님)

노트·수정 이력·결과물·피드백 요청/답변·성장 기록·자료함·즐겨찾기·관리자 학생 기록·관리자 참고자료·학생 화면 보기 — http 모드에서 "연결 전"으로 보인다(DB 테이블 승인 대기, `BLOCKERS-AND-APPROVALS.md` B-1). 꼭 보여 줘야 하면 Mock 모드(환경 변수 없이 `npx vite`)로 "시연용 샘플 데이터, 서버 저장 안 됨" 표시와 함께 설명한다.

HWP·HWPX를 Admin에서 등록하려면 실험 Flag가 켜진 **별도 Backend·별도 Schema**가 필요하다(시연 Backend에 켜지 않는다).

## 4. 문제 대응

| 증상 | 조치 |
|---|---|
| Admin 화면이 하얗게 빔 | 콘솔에 `does not provide an export named` → Student 소스 변경 후 Admin Vite 캐시 문제. Admin Vite만 재시작(`ADMIN-5174-RECOVERY.md`) |
| 분석 배너 "연결 안 됨" / "분석기 연결 실패" | 분석기 미실행 또는 토큰 파일 경로 오류. 분석기 실행 후 Vite 시작 로그 `token=set` 확인 |
| 결과 페이지 "다시 불러올 수 없어요" | 정상(미리보기는 저장 안 됨). 다시 분석 |
| Admin 등록 후 "자동 분석은 실패했어요" | Revision은 저장됨. 같은 파일로 "분석 다시 시도" |
| 그 밖 | 기존 DEMO-RUNBOOK §7 |

## 5. 끝난 뒤

Vite(5173·5174)·분석기(8765)·Backend를 끄고 Node 자식 프로세스가 남지 않았는지 확인한다. MySQL 컨테이너·Schema는 삭제하지 않는다.
