# 시연 실행 가이드 (11-12 오전) — 학생 기록 실데이터 포함

> 이전 가이드(`assessment-full-integration-202611/DEMO-RUNBOOK.md`)에 학생 기록 실데이터 흐름을 더했다. 비밀번호·토큰 값은 적지 않는다.

## 0. 지금 실행 중 (11-11 15:30 확인)

| 구분 | 주소 | 설정 |
|---|---|---|
| Backend | `http://localhost:18080` | 새 jar, 시연 Schema `lh_demo_manual_20261111`(새 Migration 적용, 기존 데이터 보존), 분석 수신 ON, 실험 OFF, 파일 저장소 기본 위치 |
| Student | `http://localhost:5173/assessment` | http, `stu_001`(김서준), 2026-1, 분석기 Proxy·분석 Flag ON |
| Admin | `http://localhost:5174/assessment` | http, **`adm_demo_gangnam`**(강남 학생 기록 + school_001 평가계획서), 분석기 Proxy ON |
| 분석기 | `http://127.0.0.1:8765/health` | 계정 B |

## 1. 다시 띄울 때

```powershell
# Backend (backend 폴더에서, DB 계정은 compose 설정값)
$env:DB_URL='jdbc:mysql://localhost:3307/lh_demo_manual_20261111'; $env:DB_USERNAME='<MYSQL_USER>'; $env:DB_PASSWORD='<MYSQL_PASSWORD>'
$env:ASSESSMENT_ANALYSIS_IMPORT_ENABLED='true'
# 선택: $env:ASSESSMENT_STORAGE_ROOT='D:\lh-dev-storage'   (기본: 사용자 홈\.learnershigh-extension\dev-artifact-storage)
.\gradlew.bat bootJar; java -Xmx384m -jar build\libs\learnershigh-extension-backend-0.0.1.jar --server.port=18080

# Student 5173
.\docs\specs\suyeon\assessment-ui-analysis-connection-202611\scripts\run-student-analysis-preview-dev.ps1 -Port 5173 -TokenFile "<계정 B>\sensitive\service\dev-token.txt"

# Admin 5174
.\docs\specs\suyeon\assessment-full-integration-202611\scripts\run-admin-http-dev.ps1 -Analyzer -AdminId adm_demo_gangnam -TokenFile "<계정 B>\sensitive\service\dev-token.txt"
```

Student 소스를 바꾼 뒤에는 Admin Vite도 재시작한다(`assessment-full-integration-202611/ADMIN-5174-RECOVERY.md`).

## 2. 시연 순서 (약 10분)

1. **Student** `5173/assessment/school-assessments` → "수행평가 추가"로 수행평가 1건 등록(과목 통합과학1 등).
2. 상세 → 탐구 노트 "실험 보고서" 템플릿 → 내용 입력 → "저장됨 · v2" 확인 → "수정 이력"에서 v1·v2.
3. "결과 파일 등록" → 합성 PDF(예: 계정 B `runs/v21-pdf-quality-backend-bridge-20261109/e2e/synthetic-e2e.pdf`, 읽기만) → "새 버전"으로 한 번 더 → 버전 이력·내려받기.
4. "선생님께 피드백 요청" → 확인 Modal.
5. **Admin** `5174/assessment/feedback` → 같은 요청 → 요청 당시 노트·파일 확인 → 의견 작성 → "임시 저장"(학생에게 아직 안 보임) → "보내기".
6. **Student** "선생님 피드백" → 답변 완료·의견 확인. 노트를 고쳐도 관리자 화면의 요청 당시 노트는 그대로임을 보여 준다.
7. **Admin** "학생 Assessment" → 김서준 → 수행평가 → "관리자 기록 도구" 탭(노트 Revision·결과물 버전, 읽기 전용).
8. **Student** "성장 기록" → 새 기록 작성·저장, 목록 별표(중요) → 보관함 "중요".
9. **Admin** "관리자 참고자료실" → "내 스크랩" → 자료 저장 → "학생에게 공개" → **Student** "자료함" 하단 "선생님이 공개한 자료".
10. (선택) 평가계획서 자동 분석·전체 페이지 — 이전 가이드.

시연 Schema에 실제로 저장된다. 실제 학교 문서·실제 학생 정보는 쓰지 않는다.

## 3. 보여 주지 않을 것

HWP·HWPX 공식 확정(차단), 관리자 "학생 화면 보기" 탭("연결 전"), 결과물 앱 안 미리보기·비교, 삭제·휴지통, 추천 자료원(과목별, "연결 전").

## 4. 문제 대응

| 증상 | 조치 |
|---|---|
| 결과 파일 올리기 415 | 확장자와 파일 내용이 다름(형식 서명 검사). 원본 파일 사용 |
| 노트 저장 409 | 다른 탭에서 먼저 저장됨. 새로고침 후 계속 |
| 관리자 화면에 학생이 없음 | Admin이 `adm_demo_gangnam`인지 상단 안내 확인 (`adm_plan_operator`는 학생 범위 없음) |
| 그 밖 | 이전 가이드 §4 |
