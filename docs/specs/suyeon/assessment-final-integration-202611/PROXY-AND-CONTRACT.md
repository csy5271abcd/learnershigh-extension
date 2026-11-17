# Student 개발 Proxy · 계약 차이 · Mock 표시 (2026-11-10)

## 1. Student 개발 Proxy — 방법 B (Shared 무수정)

`frontend/student/vite.config.ts`는 Shared 영향 영역이다. 작업 전부터 다른 작업자의 미커밋 변경(2026-10-29)이 있었고, 이번에 수정 승인을 받지 않았다. 그래서 **수정하지 않았다.**

### 실행 방법 (PowerShell)

```powershell
# 1) Backend (예: 로컬 E2E Schema, Docker MySQL 3307)
cd backend
$env:DB_URL='jdbc:mysql://localhost:3307/<E2E Schema>'; $env:DB_USERNAME='learnershigh'; $env:DB_PASSWORD='<.env의 MYSQL_PASSWORD>'
.\gradlew bootRun --args='--server.port=18080'

# 2) Student (다른 창, 저장소 루트에서)
.\docs\specs\suyeon\assessment-final-integration-202611\scripts\run-student-http-dev.ps1 -ApiTarget http://localhost:18080 -StudentId stu_001 -CurrentTerm 2026-1

# 3) Admin (다른 창) — 기존 vite.config의 Proxy를 그대로 사용
cd frontend\admin
$env:VITE_API_TARGET='http://localhost:18080'; $env:VITE_ASSESSMENT_DATA_SOURCE='http'
$env:VITE_ASSESSMENT_DEV_ADMIN_ID='adm_plan_operator'; $env:VITE_ASSESSMENT_DEV_PLAN_SCHOOLS='school_001'; $env:VITE_ASSESSMENT_DEV_CURRENT_TERM='2026-1'
npx vite
```

- `run-student-http-dev.ps1`은 같은 폴더의 `vite.student-http.config.ts`를 쓴다. 이 설정은 기존 Student 설정을 그대로 불러오고 개발 서버 `/api` Proxy만 덧붙인다. Build에는 쓰이지 않는다.
- 2026-11-10 실제 실행: 스크립트로 띄운 Student 서버에서 `/api/student/assessment/academic-context` 200, 이 서버로 브라우저 검증 43건을 수행했다.
- Mock Header는 개발 서버에서만 붙는다. Production Build 번들 확인: Student에는 Header 문자열 없음. Admin에는 라벨 함수의 키 문자열만 있고 Header 함수는 `{}`를 반환한다.

### 방법 A용 최소 Diff (승인 시)

```diff
 import react from '@vitejs/plugin-react'
 import { defineConfig } from 'vite'
 import { universityExamPdfDevServer } from './tools/universityExamPdfDevServer.ts'

+// Backend API (Spring Boot). Admin vite.config와 같은 방식: 개발 서버에서만 /api 를 Backend로 넘긴다.
+const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:8080'
+
 export default defineConfig({
   plugins: [react(), universityExamPdfDevServer()],
   server: {
     port: 5173,
     strictPort: true,
+    proxy: { '/api': apiTarget },
   },
 })
```

- 영향: Student 개발 서버만. Student 소스에서 `/api`를 부르는 곳은 Assessment `api/http/`뿐이다(2026-11-10 확인). Student Care는 Admin Surface에 있어 영향이 없다.
- 위 Diff는 **현재 작업 트리 파일** 기준이다. 이 파일에는 다른 작업자의 미커밋 변경(2026-10-29, HEAD의 인라인 Plugin을 `tools/universityExamPdfDevServer.ts`로 분리)이 들어 있다. 적용 전에 그 작업자와 커밋 순서를 확인해야 한다.

## 2. Backend ↔ Frontend 계약 차이 (이번 갱신)

| # | 내용 | 현재 처리 | 승인 필요 |
|---|---|---|---|
| F-1 | 관리자용 슬롯 과목 목록 Endpoint 없음 | 과목 ID 직접 입력 + 서버 검증 | 예: 예) `GET /api/admin/assessment/evaluation-plans/{planId}/subjects` → `{items:[{subjectId,name}]}` 또는 §34 확정 |
| F-2 | 관리자 Revision 응답 `checksum` | 이번에 추가(hex SHA-256, §48 이름) | 예: 형식·노출 범위 |
| F-3 | 검토 확정 `reviewedSubjects[i].subjectId` 슬롯 검증 | 이번에 추가(400 `unknown`) | 예: 계약 문구 반영 |
| F-4 | §12 상세 응답에 `description` 없음 | 수정 Modal은 "설명 바꾸기"를 켤 때만 전송 | 예: 응답 필드 추가 여부 |
| F-5 | 학생 평가계획서 목록은 문서별 **최신 Revision**만 | 확정된 이전 Revision이 학생 목록에서 안 보일 수 있음 | 예: "학생에게 보일 Revision" 규칙 |
| C-2 | 현재 학기 기준 없음 | 개발 설정 `VITE_ASSESSMENT_DEV_CURRENT_TERM` | 유지 |
| C-3 | PATCH 편집 필드 | title·description·deadlineDate | 유지 |
| C-7 | `confirmedFields` subjectName ↔ subjectId | 확정 패널은 subjectId 직접 사용 | 유지 |
| C-10 | 분석 수신 Endpoint 계약 미등록 | PROPOSED, 기본 off | 유지 |
| C-11 | `fileRef: null` | 원본 미보관 안내 | 유지 |

`docs/api/api-contract.md`는 수정하지 않았다.

## 3. Mock 학업 정보 표시 문제

| 문제 | 이번 처리 |
|---|---|
| Backend Mock 학업 Context의 `source`가 `EXISTING_LEARNERSHIGH` | Backend 값은 바꾸지 않음(계약 예시 값, 바꾸면 미정 Enum을 새로 만드는 셈). 대신 **http 개발 서버 화면에 "학교·과목 정보는 개발용 Mock이에요(실제 LearnersHigh 연동 전)"를 항상 표시** |
| Frontend Fixture `stu_001`=최하은, Backend Mock 학생 Client `stu_001`=김서준 | 이름을 맞추려고 데이터를 고치지 않음. http 화면은 학생 이름을 표시하지 않음 |
| Admin http 화면 | "개발 서버 · 실제 Backend 저장 · 개발용 Mock 인증 · 학교·학생·학업 정보는 개발용 Mock" 표시 |
| Production | 위 표시와 Mock Header 모두 없음(`import.meta.env.DEV`일 때만) |
