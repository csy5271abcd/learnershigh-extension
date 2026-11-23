# 시연 실행 가이드 (11-12 오전)

> 비밀번호·토큰 값은 적지 않는다. 이전 가이드: `../assessment-db-integration-202611/DEMO-RUNBOOK.md`.

## 0. 지금 실행 중 (11-12 새벽 확인)

| 구분 | 주소 | 설정 |
|---|---|---|
| Backend | `http://localhost:18080` | 새 jar(Java 21), 시연 Schema `lh_demo_manual_20261111`(Migration 8개, 기존 데이터 보존), 분석 수신 ON, 다중 형식 실험 OFF, **HWP·HWPX 확정 OFF(운영 보호)** |
| Student | `http://localhost:5173/assessment` | http, stu_001(김서준), 2026-1, 분석기 Proxy·분석 Flag ON |
| Admin | `http://localhost:5174/assessment` | http, `adm_demo_gangnam`, 분석기 Proxy ON |
| 분석기 | `http://127.0.0.1:8765/health` | 계정 B |

메모리: 4개 서버를 함께 띄운 상태에서 사용 가능 약 2GB. Gradle 빌드·E2E를 함께 돌리지 않는다.

## 1. 다시 띄울 때 (순서대로, 한 번에 하나씩)

```powershell
# 1) Backend — Bash PATH의 java는 17이다. Java 21로 실행한다
cd C:\learnershigh-extension\backend
$env:DB_URL='jdbc:mysql://localhost:3307/lh_demo_manual_20261111'; $env:DB_USERNAME='<MYSQL_USER>'; $env:DB_PASSWORD='<MYSQL_PASSWORD>'
$env:ASSESSMENT_ANALYSIS_IMPORT_ENABLED='true'
& "$HOME\.jdks\jbr-21.0.8\bin\java.exe" -Xmx384m -jar build\libs\learnershigh-extension-backend-0.0.1.jar --server.port=18080
# 2) 분석기 (계정 B 폴더, 파일 수정 없음)
.venv-llm\Scripts\python.exe -I -B -X utf8 tools\service\analysis_service.py
# 3) Student 5173
.\docs\specs\suyeon\assessment-ui-analysis-connection-202611\scripts\run-student-analysis-preview-dev.ps1 -Port 5173 -TokenFile "<계정 B>\sensitive\service\dev-token.txt"
# 4) Admin 5174 (Student 코드를 바꿨다면 반드시 다시 띄운다)
.\docs\specs\suyeon\assessment-full-integration-202611\scripts\run-admin-http-dev.ps1 -Analyzer -AdminId adm_demo_gangnam -TokenFile "<계정 B>\sensitive\service\dev-token.txt"
```

메모리가 부족하면 분석기를 마지막에 띄운다. 분석기 없이도 1~3번 시연(아래 §2-A~C)은 된다.

## 2. 시연 순서

**A. 학생 기록 + 새 기능 (약 8분)**
1. Student 수행평가 추가 → 상세 → 탐구 노트 입력(저장됨 v2) → 결과 파일 등록(유효한 합성 PDF) → 새 버전.
2. 결과물 카드 **눈 아이콘** → 앱 안 PDF 미리보기(확대·스크롤) → 상단 "비교할 버전" → 좌우 비교 + 파일 정보 표("내용 자동 비교는 지원하지 않아요" 안내).
3. 사진(PNG·JPEG)을 결과물로 올리면 → 미리보기에서 +/− 확대.
4. 선생님께 피드백 요청 → Admin 피드백 → 답변 보내기.
5. 결과물 **휴지통** → 보관함 › 휴지통(원래 소속·삭제 시각) → **복구** → 같은 v1·v2. 휴지통 상태에서도 Admin 피드백 상세의 요청 당시 파일이 그대로다.

**B. 관리자 학생 화면 보기 (2분)**
Admin 학생 Assessment → 김서준 → "학생 화면 보기" → 학생과 같은 화면(읽기 전용 배지), 쓰기 버튼 없음.

**C. 과목별 추천 자료원 (2분)**
Student 자료함 → 과목 선택(예: 통합과학1) → 자료원·실제 링크 → "이 자료원에서 찾은 자료 추가" → 저장. Admin 참고자료실 → 추천 사이트 "자료 저장" → 내 스크랩 "학생에게 공개" → Student 자료함 "선생님이 공개한 자료". 삭제하면 휴지통에서 복원할 수 있다.

**D. HWP·HWPX 공식 검토 (설명만 권장)**
시연 Backend는 운영 보호 상태라 HWP·HWPX 확정 요청을 거절한다(`verified_auth_required`). 다중 형식 실험도 꺼져 있어 등록되지 않는다. 화면 흐름은 캡처로 보여 준다: `scripts/phase-b-ux-e2e.mjs` 실행 결과(scratchpad `pb/shots/b01·b02`). 실제로 확정하려면 격리 Backend를 `ASSESSMENT_PLAN_REVIEW_STRUCTURED_CONFIRM_DEV=true`와 `--assessment.multiformat.experimental=true`로 따로 띄워야 하며, 그 기록은 Mock 관리자 기록이다.

## 3. 보여 주지 않을 것

HWP·HWPX 운영 확정(인증 없음), 문서 내용 Diff, 영구 삭제, 실제 학교 문서·실제 학생 정보.

## 4. 문제 대응

| 증상 | 조치 |
|---|---|
| 미리보기 "열지 못했어요" 409 | 저장 파일이 등록 당시와 다르다(무결성 실패). 새 버전으로 다시 올린다 |
| 미리보기 대신 "지원하지 않는 형식" | HWP·DOCX 등은 내려받아 확인한다(정상) |
| 결과물 복구 400 | 그 결과물의 수행평가가 휴지통에 있다 → 수행평가를 먼저 복구한다 |
| Admin 흰 화면 | Admin Vite를 다시 띄운다(Student 모듈 변경 뒤) |
| Backend가 `class file version 65` 오류 | Java 17로 실행됨 → 위 Java 21 경로를 쓴다 |
