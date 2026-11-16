# Assessment 1차 마감 최종 통합 보고 (2026-11-10)

## 1. 결과 요약

| 목표 | 상태 | 도달 수준 |
|---|---|---|
| P0-1 Student 수행평가 수정 UI + PATCH | **완료** | 브라우저 조작 검증(상세 → 수정 → PATCH → MySQL → 새로고침 유지) |
| P0-2 Admin 검토 UI + 과목 ID 매핑 | **완료(조건부 확정)** | 브라우저 조작 검증. 확정은 원본 SHA-256 대조·과목 ID(서버 검증)·필드·명시적 확인을 모두 갖출 때만. 합성 데이터 기반 API 시험으로만 확정 실행 |
| P0-3 Admin PDF 등록·개정 | **완료** | 브라우저 조작 검증(등록·개정·오류 6종) |
| P0-4 Student 개발 Proxy | **방법 B**(Shared 무수정) | 저장소 안 실행 스크립트로 연결 확인. 정식 Proxy는 승인 대기 |
| 전체 통합·회귀 | 통과 | Backend 단위 246·통합 123, Frontend typecheck·lint·build, 브라우저 43 + 회귀 33, v21.1 HTTP 33, Mock 모드 |

"운영 환경 검증"은 하지 않았다. 인증·학교·학생·학업 정보는 개발용 Mock이고, 모든 데이터는 로컬 Docker MySQL의 E2E 전용 Schema에 넣은 합성 데이터다.

## 2. 주요 설계 결정

| 결정 | 이유 |
|---|---|
| 수정 Modal은 기존 등록 Modal의 구성 요소·스타일 재사용, 바뀐 필드만 PATCH | 새 공통 컴포넌트·Router를 만들지 않음. 보내지 않은 필드는 서버에서 유지 |
| 설명은 "설명 바꾸기"를 켤 때만 전송 | §12 상세 응답에 `description`이 없어 기존 설명을 채울 수 없음. 모르는 사이 지우지 않게 함 |
| 과목 ID는 직접 입력 + **서버가 문서 슬롯 과목인지 검증**(신규) | 관리자용 과목 목록 API가 계약·구현에 없음(§34 응답 Shape 없음). 과목명으로 추측하지 않음 |
| 원본 대조는 관리자 로컬 PDF의 SHA-256을 브라우저에서 계산해 서버 `checksum`과 비교 | 서버가 원본 바이트를 보관하지 않음. 같은 파일임이 확인될 때만 확인 체크·확정 가능 |
| 관리자 Revision 응답에 `checksum` 추가 | 이미 저장한 SHA-256을 §48 File Contract 필드 이름으로 노출(값 형식 hex는 계약 미정 → 승인 대상) |
| 이미 확인 완료된 Revision은 화면에서 추가 확정 차단 | 재검토(이전 확정 대체) 정책 미확정. 자동 취소·덮어쓰기·"최신이 최종" 가정을 만들지 않음 |
| 확정 대상은 단일 값 필드만(비율·만점·시기·이름) | 배열 값(제출물·조건·채점 기준)의 값 단위 편집 규칙이 없음. 화면에서 보기는 가능 |
| HTTP 개발 모드에 "실제 저장 · Mock 인증 · 학업 정보 Mock" 표시 | 서버 `source` 값이 `EXISTING_LEARNERSHIGH`라도 실제 연동처럼 보이지 않게 함. Production에는 안 보임 |

## 3. 변경 파일

### Backend (Assessment 소유)

| 파일 | 변경 |
|---|---|
| `integration/context/AcademicContextProvider.java` | `findSlot(schoolId, academicYear, grade, semester)` 추가 |
| `integration/context/MockAcademicContextProvider.java` | `findSlot` Mock 구현 |
| `service/plan/EvaluationPlanService.java` | 검토 확정 시 `reviewedSubjects[i].subjectId`가 문서 슬롯 과목이 아니면 400 `unknown` |
| `dto/plan/AdminEvaluationPlanResponse.java` | Revision에 `checksum`(저장된 SHA-256) |
| `service/plan/PlanViews.java` | `checksum` 채움 |
| `test/.../AnalyzerV211ImportAndItemKeyApiTest.java` | 슬롯 밖 과목 거절·`checksum` 통합 테스트 1건 추가 |

Migration·`application.yml`·`api-contract.md`·`common/**`·Student Care 변경 없음.

### Student Frontend

| 파일 | 변경 |
|---|---|
| `components/EditSchoolAssessmentModal.tsx` | **신규** 수정 Modal |
| `routes/SchoolAssessmentDetailRoute.tsx` | "평가 정보 수정" 버튼을 Modal에 연결(읽기 전용 보기에서는 비활성), 저장 후 서버 재조회 |
| `components/MockDataNotice.tsx` | http 개발 서버 표시 추가 |

### Admin Frontend

| 파일 | 변경 |
|---|---|
| `components/PlanReviewConfirmPanel.tsx` | **신규** 검토 확정 패널 |
| `routes/EvaluationPlanReviewRoute.tsx` | http 모드에 패널 연결, 후보 비율 입력은 http에서 읽기 전용 |
| `api/http/assessmentAdminHttp.ts` | 검토 후보 필드·원문 쪽·파일 checksum 제공, `confirmPlanReviewHttp`(PUT 후 재조회) |
| `api/assessmentAdminApi.ts` | `confirmPlanReview` 노출 |
| `api/types.ts` | `checksum`, `revisionFile`, `reviewFields`, `subjectPages`, `ReviewFieldCandidate`, `PlanReviewConfirmRequest` |
| `components/AdminParts.tsx` | http 개발 서버 표시 추가 |

### 문서·스크립트 (이 폴더)

보고서 7종, `scripts/`(최종 브라우저 검증, 회귀 브라우저 검증 사본, Student http 실행 PowerShell·Vite 설정). `progress.md` 항목 추가.

## 4. 완료 / 부분 완료 / 미완료

| 구분 | 항목 |
|---|---|
| 완료 | Student 등록·목록·상세·수정·상태 변경·새로고침 유지 / Admin 같은 ID 조회·평가계획서 조회·분석 후보 확인·원본 대조·과목 매핑·명시적 확정(합성 시험) / PDF 등록·개정·오류 처리 |
| 부분 완료 | 과목 매핑: 목록 선택이 아니라 직접 입력 + 서버 검증(목록 API 승인 대기) / 확정 대상: 단일 값 필드만 / Student Proxy: 저장소 밖 Shared 무수정 실행 경로 |
| 미완료 | 재검토(추가 확정) — 정책 미확정으로 차단 / 실제 인증·학업 정보 연동 / 학생 평가계획서 상세 화면(쓰는 화면 없음) / 노트·결과물·피드백 Backend(이번 범위 제외) |

## 5. 보고서

| 파일 | 내용 |
|---|---|
| `STUDENT-EDIT-RESULT.md` | 수정 UI·PATCH·DB·브라우저 |
| `ADMIN-REVIEW-RESULT.md` | 과목 매핑·원본 대조·확정 |
| `PDF-UPLOAD-RESULT.md` | 등록·개정·오류 |
| `PROXY-AND-CONTRACT.md` | Proxy·계약 차이·Mock 표시 |
| `REGRESSION-RESULT.md` | 전체 회귀 |
| `NEXT-STEPS.md` | 이후 작업 |
