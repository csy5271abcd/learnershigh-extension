# 직접 확인하는 방법

> 비밀번호·토큰 값은 적지 않는다. 서버는 **직접 연 PowerShell 창**에서 하나씩 띄운다(Claude Code 백그라운드는 메모리 부족 시 종료될 수 있음).

## 1. 서버 (순서대로)

```powershell
# 1) Backend — Java 21
cd C:\learnershigh-extension\backend
$env:DB_URL='jdbc:mysql://localhost:3307/lh_demo_manual_20261111'; $env:DB_USERNAME='<계정>'; $env:DB_PASSWORD='<비밀번호>'
$env:ASSESSMENT_ANALYSIS_IMPORT_ENABLED='true'
& "$HOME\.jdks\jbr-21.0.8\bin\java.exe" -Xmx384m -jar build\libs\learnershigh-extension-backend-0.0.1.jar --server.port=18080

# 2) Student 5173 (분석기 연동이 필요하면 -TokenFile 추가)
C:\learnershigh-extension\docs\specs\suyeon\assessment-ui-analysis-connection-202611\scripts\run-student-analysis-preview-dev.ps1 -Port 5173

# 3) Admin 5174 (분석기 연동이 필요하면 -Analyzer -TokenFile 추가)
C:\learnershigh-extension\docs\specs\suyeon\assessment-full-integration-202611\scripts\run-admin-http-dev.ps1 -AdminId adm_demo_gangnam

# 4) (선택) 분석기 — 계정 B 폴더
.venv-llm\Scripts\python.exe -I -B -X utf8 tools\service\analysis_service.py
```

분석기 없이도 아래 모든 확인이 된다. 심화 탐구는 Backend 없이도 열린다.

## 2. 데이터 (이미 등록됨 — 다시 실행해도 중복되지 않음)

```powershell
cd C:\learnershigh-extension\docs\specs\suyeon\assessment-seed-and-ui-verification-202611\scripts
.\seed-assessment-demo.ps1 -ConfirmSchema lh_demo_manual_20261111
```

ID 목록: `SEED-MANIFEST.md`. MySQL 대조: `scripts/verify-seed.sql`(읽기 전용, `DATABASE-VERIFICATION.md` §4).

## 3. 화면에서 볼 것

**Student `http://localhost:5173/assessment`** (2026학년도 1학기)
1. 학교 수행평가 → [DEMO-1112] 4건 (진행 중 2·시작 전 1·완료 1)
2. "과학 실험 보고서 작성" → 노트 v2, 수정 이력 v1·v2, 결과물 PDF(v1·v2)·그래프 PNG
3. 결과물 눈 아이콘 → PDF 미리보기 → "비교할 버전" v1 / 그래프 확대
4. 오른쪽 "피드백" → 선생님 최종 답변
5. 성장 기록 → "용해도 실험을 통해 배운 탐구 설계"
6. 자료함 → 개인 자료 2 + 선생님 공개 자료 1 / 보관함 → 중요(A·C), 휴지통
7. 심화 탐구 → 탐구 라이브러리 · 모의고사 60 · 대학별 27

**Admin `http://localhost:5174/assessment`**
1. 학생 Assessment → 김서준 → 수행평가 4건 → A 열기(읽기 전용) → "학생 화면으로 보기"
2. 피드백 관리 → 전달 완료 요청(요청 당시 v2)
3. 관리자 참고자료실 → 내 스크랩: 공개 A·비공개 B
4. 심화 탐구 콘텐츠 → 탐구 라이브러리 · 모의고사 지문 · 대학별 자료 · 참고자료원 (편집·공개 버튼 없음)

## 4. 자동 검증 다시 돌리기

```powershell
$chrome='C:/Program Files/Google/Chrome/Application/chrome.exe'; $out="$env:TEMP\lh-verify"
node scripts\admin-enrichment-static-e2e.mjs $chrome "$out\static.json" "$out\static" http://localhost:5173 http://localhost:5174 on   # Backend 꺼져 있으면 off
node scripts\seed-ui-verification-e2e.mjs $chrome seed-manifest.json "$out\ui.json" "$out\ui" http://localhost:5173 http://localhost:5174
```

두 스크립트는 쓰기 요청을 하지 않는다.

## 5. 정리(필요할 때만)

자동 삭제 스크립트는 만들지 않았다. 데이터를 치우려면 화면에서 휴지통으로 옮긴다(복원 가능, 영구 삭제 없음).
