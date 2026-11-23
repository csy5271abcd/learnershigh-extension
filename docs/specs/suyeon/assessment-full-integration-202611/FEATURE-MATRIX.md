# 기능별 실제 구현 상태 (2026-11-11 저녁, 코드·실행 확인 기준)

판정: **실데이터** = 화면 → HTTP → Backend → MySQL → 재조회까지 동작 확인 / **실분석** = 계정 B 로컬 분석기 실제 호출 / **정적** = Frontend 정적 콘텐츠(서버 없음, 명세상 의도) / **연결 전** = http 모드에서 503 "연결 전"(Mock 값 안 보여 줌) / **차단** = 승인 전 의도적 비활성.

## Student (5173)

| # | 기능 | 상태 | 근거·비고 |
|---|---|---|---|
| P0-1 | 5173 렌더링 | **완료** | http 모드 + 분석기 Proxy, 브라우저 확인 |
| P0-3 | 분석 결과 전체 페이지 (PDF·HWP·HWPX) | **완료 (실분석, 저장 안 함)** | `ANALYSIS-FULL-PAGE.md`, 30/30 |
| P0-5 | 수행평가 등록·조회·수정·상태 | **실데이터** (기존) | §12 API, 이전 PDF 브라우저 43·회귀 33. 삭제/보관은 계약 미정이라 없음 |
| P0-6 | 탐구 노트 작성·저장 | **연결 전** | Backend·테이블 없음 → Shared Migration 승인 필요(`BLOCKERS-AND-APPROVALS.md` B-1). 화면·템플릿 10종은 Mock 모드에서만 동작 |
| P0-7 | 노트 수정 이력(Revision) | **연결 전** | 위와 같음 |
| P0-8 | 결과물 업로드·버전 | **연결 전** | 테이블 + File Storage(API-OD-A03) 승인 필요(B-1·B-2) |
| P0-9 | 피드백 요청(Snapshot) | **연결 전** | B-1 (FeedbackRequest·Snapshot 테이블) |
| P0-12 | 피드백 조회 | **연결 전** | B-1 |
| P0-13 | 성장 기록 | **연결 전** | B-1 |
| P1-15 | 중요 표시(즐겨찾기) | **연결 전** | B-1 |
| P1-16 | 개인 참고자료(자료함) | **연결 전** | B-1 |
| — | 평가계획서 공식 정보 조회(확정값만) | **실데이터** (기존) | §10 학생 API |
| — | 학교·학업 정보 조회 | **실데이터 (개발용 Mock 원천)** | Backend Mock 학업 Context (OD-A04) |
| — | 학업 정보 수정·과목 추가 | **연결 전** | API 없음 |
| — | 심화 탐구(라이브러리·모의고사 60·대학 27·PDF) | **정적 (완료)** | 이전 보고서, 이번 재확인 36/36 |
| — | 참고자료 카탈로그(사이트 목록) | **정적** | P-24 |
| — | 수행평가 꿀팁 | 정적 (기존) | §15 |

## Admin (5174)

| # | 기능 | 상태 | 근거·비고 |
|---|---|---|---|
| P0-2 | 5174 렌더링 | **완료** | 원인·복구 `ADMIN-5174-RECOVERY.md` |
| P0-4 | 분석 결과 전체 페이지 | **완료** | 기존 검토 Route + 등록 후 자동 이동 |
| P1-19 | PDF 업로드·자동 분석 | **실데이터 + 실분석** | 등록 201 → 분석기 200 → 수신 201 → 검토 페이지 (13/13, 격리 환경) |
| P1-19 | HWP·HWPX 업로드·자동 분석 | **실데이터 + 실분석 (실험 Flag 환경만)** | 15/15 ×2, Backend `ASSESSMENT_MULTIFORMAT_EXPERIMENTAL=true` 별도 프로세스 필요. 시연 18080은 OFF |
| — | PDF 원문 대조·검토·확정 | **실데이터** (기존) | 이전 PDF 브라우저 43 |
| P2-22 | HWP·HWPX 공식 확정 | **차단** | Gate 1~3·D-1 승인 대기, 버튼 비활성 확인 |
| P0-10 | 학생 기록(노트·결과물·성장 기록) 열람 | **연결 전** | 학생 쪽 데이터가 DB에 없음(B-1) |
| — | 학생별 수행평가 조회 | **API 실데이터, 화면 진입 제한** | `GET /api/admin/assessment/students/{id}/school-assessments` 지점 범위 검사(v21.1 HTTP 33에 포함). 단 학생 **목록**(`listStudents`)이 http 연결 전이라 화면에서 학생을 고를 수 없음 |
| P0-11 | 피드백 대기열·답변·전달 | **연결 전** | B-1 |
| P1-17 | 관리자 참고자료 등록·공개 | **연결 전** | B-1 |
| P1-18 | 학생별 활동 현황 | **연결 전** | 원천 데이터 없음 |
| P1-21 | 학생 화면 읽기 전용 보기 | **연결 전 (Mock 전용)** | 원천 데이터 없음 |
| — | 심화 탐구 콘텐츠 열람 | Mock 화면(정적 원천 공유) | Admin 쪽 정적 전환은 미착수 |
| — | Student Care·기존 관리자 메뉴 | **변경 없음** | Sidebar·Route 보존 확인 |

## 이번에 바뀐 코드 (Assessment 소유 범위만)

| 파일 | 변경 |
|---|---|
| `frontend/student/.../routes/AnalysisPreviewResultRoute.tsx` | 신규 — 결과 전체 페이지 |
| `frontend/student/.../model/analysisPreviewSession.ts` | 신규 — 탭 메모리 결과 보관 |
| `frontend/student/.../components/pdf-import/AnalysisPreviewModal.tsx` | 결과 본문 제거, 성공 시 페이지 이동, 공식 문서 화면 전환 버튼 |
| `frontend/student/.../components/pdf-import/PdfImportModal.tsx` | Flag일 때 미리보기 ↔ 공식 문서 화면 전환 |
| `frontend/student/.../components/pdf-import/analysisPreview.module.css` | 결과 페이지 스타일(`--as-*` Token만) |
| `frontend/student/.../api/dev/analysisPreviewClient.ts` | `includeAnalysis` 옵션, 브라우저 SHA-256, 전체 분석 Type |
| `frontend/student/.../routes/paths.ts`, `assessmentRoutes.tsx` | 새 Route 1개 |
| `frontend/student/.../routes/SchoolAssessmentListRoute.tsx`, `AssessmentHomeRoute.tsx` | Flag일 때 버튼 이름 "평가계획서 가져오기" |
| `frontend/admin/.../routes/EvaluationPlansRoute.tsx` | Flag일 때 등록 → 분석기 → 수신 → 검토 페이지, 실패 시 재시도 |
| `frontend/admin/.../api/assessmentAdminApi.ts`, `api/http/assessmentAdminHttp.ts` | `importPlanAnalysis` (기존 PROPOSED 수신 Endpoint 호출) |
| `frontend/admin/.../api/canonicalSource.ts` | Student 분석기 Client 재수출(복제 금지) |
| `docs/specs/suyeon/assessment-full-integration-202611/scripts/*` | Admin 실행 스크립트·분석기 Proxy 설정·E2E |

변경하지 않음: Backend·DB·Migration·`api-contract.md`·Shared `vite.config.ts`·Admin Shell·Router·Student Care.
