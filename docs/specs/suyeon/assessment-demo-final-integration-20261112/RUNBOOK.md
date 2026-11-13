# 시연 절차 (사용자가 직접)

> 지금 떠 있는 서버(18080·5173·5174·8765) 그대로 1~3을 할 수 있다. 4는 Vite 재시작이 필요하다.
> 모든 학생·활동은 합성 시연 데이터, 학교명만 실제 고등학교. "개발용" 전환은 실제 로그인이 아니다.

## 1. 학생 시연 (Student 5173)

1. `http://localhost:5173/assessment` 접속 → 왼쪽 아래 **"개발용 · 시연 학생"** 버튼.
2. 지점(A/B/C) → 학교 → 학년 → 학생 고르고 **"이 학생으로 보기"**. (바로 가기: `http://localhost:5173/assessment?devStudent=stu_demo_041`)
3. 왼쪽 위 학교·학년·학기 확인(예: 충무고등학교 2026학년도 1학년 1학기). 학기는 그 버튼에서 1·2학기 전환.
4. **학교 수행평가** → 목록의 마감일(모두 내일 이후)·상태 확인 → 하나를 연다.
5. 아래 **탐구 노트**에 제목·내용 입력 → **"지금 저장"**(또는 1.5초 뒤 자동 저장) → 오른쪽 위 "자동 저장됨 · v1".
6. 내용을 조금 고치고 다시 저장 → v2. **수정 이력**에서 v1·v2 비교.
7. 결과물(눈 모양 미리보기 버튼): 추천 `stu_demo_041`·`stu_demo_001`의 한글 보고서 v3, `stu_demo_041`·`stu_demo_044` 그래프 v2.
8. 오른쪽 **피드백** 탭: 전달된 선생님 답변과 요청 당시 Snapshot(노트·파일 버전).
9. 왼쪽 **성장 기록**·**보관함**(중요 표시).
10. 다른 학교 학생으로 바꿔 데이터가 바뀌는지 확인(이전 학생 데이터 남지 않음).

추천 학생: `stu_demo_001` 운정 1학년(피드백 전달·한글 보고서) / `stu_demo_006` 문현 2학년(PDF+PNG) / `stu_demo_019` 세화(자사고) 3학년 / `stu_demo_026` 한림 2학년(노트 v3) / `stu_demo_059` 제주 3학년.

## 2. 관리자 시연 (Admin 5174)

1. `http://localhost:5174/assessment/students` → 왼쪽 아래 **"개발용 · 시연 관리자"** → `adm_demo_a01` → "이 관리자로 보기". (바로 가기 `?devAdmin=adm_demo_b01`)
2. 담당 지점 학생 20명·실제 학교명 확인 → **학교 필터**로 한 학교만(예: C지점 제주고 4명).
3. 학생 상세: 학교·학년·학기·반·번호, 수강 과목, 수행평가(과목명·마감일).
4. 수행평가를 열고 **"관리자 기록 도구"** 탭 → 학생이 1에서 쓴 노트·Revision 확인.
5. **피드백 관리**: 대기·전달 건, 요청 상세의 Snapshot.
6. 다른 지점 관리자로 바꿔 학생이 완전히 달라지는지 확인. 다른 지점 학생 주소(예: a01로 `/assessment/students/stu_demo_021`)를 열면 "이 학생의 기록을 볼 수 없어요".

## 3. 평가계획서 분석 결과 보기 (Admin 5174, 지금 가능)

1. 관리자를 `adm_demo_gangnam`(평가계획서 운영 권한)으로 → **학교별 평가계획서** → school_001 고1 1·2학기 칸("검토 필요").
2. 2학기(합성 PDF) / 1학기(합성 HWP) 칸 → 추출 결과 검토:
   - 과목 가상과학탐구, 지필 1차 40%, 수행 탐구 보고서 30%·토론 활동 30%
   - 근거: PDF 쪽 / HWP는 구역·표·행·열 + 원문 인용(쪽 번호 없음)
   - "관리자가 확인한 값 0" = 자동 확정 없음. HWP는 "실제 관리자 인증 없으면 확정 거절" 안내.
3. 지점 관리자(`adm_demo_a01`)로 바꾸면 평가계획서 운영 권한이 없어 문서가 보이지 않는다(403).

## 4. 화면에서 업로드 → 분석 (재시작 필요)

지금 5173은 분석기 토큰 없이, 5174는 분석기 Proxy 없이 실행 중이라 화면 업로드 분석이 안 된다(401/404). 각 창에서 `Ctrl+C` 후:

```powershell
# Student 5173 (학생 "평가계획서 분석하기" 미리보기)
C:\learnershigh-extension\docs\specs\suyeon\assessment-ui-analysis-connection-202611\scripts\run-student-analysis-preview-dev.ps1 -Port 5173 -CurrentTerm 2026-2 -TokenFile "C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis\sensitive\service\dev-token.txt"

# Admin 5174 (등록 → 자동 분석 → 검토, HWP 실험 표시)
C:\learnershigh-extension\docs\specs\suyeon\assessment-full-integration-202611\scripts\run-admin-http-dev.ps1 -AdminId adm_demo_gangnam -PlanSchools 'school_001:예시고등학교' -CurrentTerm 2026-2 -Analyzer -TokenFile "C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis\sensitive\service\dev-token.txt" -Multiformat
```

- Student: 학교 수행평가 → **"평가계획서 분석하기"** → PDF/HWP/HWPX 선택 → 분석 → 결과 페이지("자동 분석 후보 · 관리자 확인 전", 저장 안 됨).
- Admin: 학교별 평가계획서 → **평가계획서 등록** → 학년·학기·파일 → 자동으로 분석·후보 저장 → 검토 화면.
- 실제 학교 문서로 시험할 때는 **학생 미리보기**(저장 안 됨)를 쓰는 것을 권장한다. Admin 등록은 시연 DB에 기록이 남는다(공식 반입 승인 전).
- 분석기 상태: `cd "C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis"; powershell -ExecutionPolicy Bypass -File tools\service\service.ps1 status`

## 5. 데이터 다시 맞추기 (필요할 때)

```powershell
cd C:\learnershigh-extension\docs\specs\suyeon\assessment-15schools-60students-seed-202611\scripts
node update-deadlines-and-titles.mjs --api http://localhost:18080   # 날짜가 지나면 지난 마감일만 다시 미래로(멱등)
node verify-seed.mjs --api http://localhost:18080                   # 60명 정합성
```
