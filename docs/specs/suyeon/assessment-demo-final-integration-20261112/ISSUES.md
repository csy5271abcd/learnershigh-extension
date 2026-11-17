# 미완료·제약·승인 대기

## A. 재시작이 필요한 것 (완료로 보고하지 않음)

| # | 항목 | 이유 | 조치 |
|---|---|---|---|
| A-1 | 5173 학생 "평가계획서 분석하기" | 5173이 분석기 토큰 없이 실행(401) | `RUNBOOK.md` §4 명령으로 5173 재시작 |
| A-2 | 5174 등록 → 자동 분석 | 5174에 분석기 Proxy 없음(404) | 같은 §4 명령으로 5174 재시작 |
| A-3 | 분석 결과 상태 | 대신 심리학 HWPX: 항목 1/2·비율 누락인데 `OK_REVIEW_REQUIRED` | 분석기(계정 B) 개선 요청 — 부분 결과는 `PARTIAL`이어야 함 |

## B. 발견했지만 고치지 않은 것

| # | 내용 | 이유 |
|---|---|---|
| B-1 | 분석 정확도: 과목명 "반"(삼각산), 구간 미추출(진양 11/13), 표 열 결합("2차 시험 …"), 채점표 0, 다중 평가 2번째 항목 누락 | 분석기 코드는 다른 소유(계정 B). 재현 파일 SHA·근거는 `DOCUMENT-EXTRACTION-ACCURACY.md` |
| B-2 | 화면 맨 위 기존 LearnersHigh 상단바 학생 이름("최하은") 고정 | Assessment 밖 기존 Shell. 시연 학생 이름은 Assessment 화면·전환 패널에 표시 |
| B-3 | Admin 평가계획서 칸이 HWP 문서도 "PDF 1개 등록됨"으로 표시 | 표시 문구 결함(작음). 다음 작업 후보 |
| B-4 | 5174 평가계획서 학교 칸이 `school_001`(이름 없음) | 실행 설정 `-PlanSchools school_001`(이름 생략). 재시작 시 `school_001:예시고등학교` |
| B-5 | 노트 본문·결과물 파일명·성장 기록 제목 안의 원래 주제 문구 | 학생 원문이라 제목 정리 대상에서 제외 |
| B-6 | Admin 과목 필터(http) | 목록 응답에 수강 과목이 없어 http에서 미적용(선택지 비움). 계약 보완 필요 |
| B-7 | 마감일·제목 수정의 건별 로그 파일이 멱등 재실행으로 덮어써짐, 제주고 19·14건 이력 필드가 Seed 재실행으로 유실 | 실행 요약(291·159)은 Manifest에 보존, DB 값 정상. 두 스크립트 수정 완료(이후 재발 없음) |

## C. 승인 대기 (이전과 동일)

| # | 항목 |
|---|---|
| C-1 | `api-contract.md` §9-1 DRAFT(`catalogSubjects`·학교 반·번호), §62-1-3 시연 명단 — Shared 승인 |
| C-2 | 실제 로그인·로그아웃·Session(API-OD-A01) — 개발용 Context는 로그인 아님, Header 조작 차단 불가 |
| C-3 | 실제 학교 평가계획서의 DB 반입 — 승인 전이라 미리보기로만 분석 |
| C-4 | HWP·HWPX 공식 검토 확정 — 실제 관리자 인증 필요(`structured-confirm-dev` false 유지) |
| C-5 | Student Care Playwright E2E 미실행 |

## D. 이번 변경 파일 (Git 미커밋)

Frontend(Student 소유 Assessment): `dev/devContext.ts`·`dev/DevContextSwitcher.tsx`·`dev/devContextSwitcher.module.css`·`dev/demoContextRoster.json`(신규), `api/http/assessmentHttpClient.ts`, `routes/AssessmentLayout.tsx`, `components/notes/NoteEditor.tsx`
Frontend(Admin Assessment): `api/http/adminHttpClient.ts`, `api/http/adminRecordsHttp.ts`, `api/assessmentAdminApi.ts`, `routes/AssessmentAdminRoute.tsx`, `routes/StudentsRoute.tsx`, `routes/StudentRecordRoute.tsx`
스크립트: `assessment-15schools-60students-seed-202611/scripts/{lib/demo-content.mjs, update-deadlines-and-titles.mjs, seed-student-activities.mjs, verify-seed.mjs, build-demo-roster.mjs}`, 이 폴더 `scripts/*`
Backend·DB·Migration·Shared(`common`)·Student Care·Admin Shell: **변경 없음**. 수정 전 원본 일부는 저장소 밖에 백업.
