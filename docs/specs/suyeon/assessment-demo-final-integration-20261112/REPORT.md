# 시연 환경 최종 통합 — 실제 15개교 학교명 표시 · 마감일·제목 정리 · 탐구 노트 작성 · PDF/HWP 분석 검증

> 2026-11-12. 사용자가 띄운 서버(Backend 18080·Student 5173·Admin 5174·MySQL 3307·분석기 8765)를 **재시작하지 않고** 진행했다. Backend·DB·Migration·Shared·Student Care 변경 없음. Git Commit 없음.
> 모든 학생·활동은 합성 시연 데이터이고 학교명만 실제 고등학교다. 개발용 Context 전환은 실제 로그인이 아니다.

## 1. 결과 요약

| 요구 | 결과 |
|---|---|
| '예시고등학교' 원인 | 5173이 기본 학생 `stu_001`(기존 Mock, 예시고 Fixture)로 실행 + 시연 학생을 고를 방법이 없었음. `-PlanSchools`는 무관 → `ROOT-CAUSE-EXAMPLE-SCHOOL.md` |
| 해결 | 개발용 시연 학생·관리자 **전환 패널**(지점→학교→학년→학생) + 시연 링크 `?devStudent=` `?devAdmin=` (HMR 반영, 재시작 불필요) |
| 15개교 60명 학교 정보 | 실시간 재조회 불일치 **0명**, 합성 학생의 예시고 표시 **0명**, 학교당 4명·지점당 20명 |
| 서버 | 18080·5173·5174·8765 정상, 502 없음. 단 5173 분석 토큰 없음·5174 분석 Proxy 없음 |
| 마감일 | 361건 대상(Seed 360 + UI 1): **291건 변경**, 70건은 이미 미래라 유지 → 과거·오늘·없음 **0건**, 2026-11-13~2027-01-22 47개 날짜, 상태 변경 0, 재실행 변경 0 |
| 제목 | 규칙 검토 후 **159건 변경**(인접 단어 중복 0) → `ASSESSMENT-TITLE-QUALITY.md` |
| 탐구 노트 | 실제 5173에서 A 신규(v1)·B 수정(v2→v3, v1·Snapshot 불변)·C 신규(v1) → 5174 담당 관리자가 같은 노트 확인 **18/18** |
| Admin 학교 표시·필터 | 학교 필터가 Mock 고정이라 비어 있던 결함 수정 → 4명 모두 담당 5개교, 범위 밖 학생 URL은 "볼 수 없어요" **21/21** |
| PDF·HWP 분석(Admin 화면) | 합성 PDF·HWP를 API로 등록→분석→후보 수신, 5174 검토 화면에서 과목·수행평가·비율·근거(PDF 쪽 / HWP 구역·표·행·열)·검토 전 상태 **12/12**. HWP 공식 확정은 막혀 있음(설계대로) |
| 실제 학교 문서 분석 | PDF 3·HWP 3·HWPX 2 미리보기(저장 안 함) + 오류 4종. 사람 대조 표본 21항목: 검출 **16/21**, 이름 정확 12/16, 비율 정확 14/14, 시기 11/12, 만점 10/10, **채점표 0/5**. 삼각산 과목명 "반" 오류 → `DOCUMENT-EXTRACTION-ACCURACY.md` |
| 결과물 | 6명 8개 결과물에 한글 보고서 PDF(표)·한글 그래프 PNG **새 버전** 추가(기존 버전 보존, SHA 일치), 5173 뷰어 표시 2/2 |
| 데이터 정합성 | `verify-seed` **833/833**(상태 분포 불변 236/78/46, Seed 버전 67 보존 + 추가 8) |
| 운영 번들 | 전환 패널·명단·Mock Header 이름·`dev-analysis` **0건** |

## 2. 화면 분석 시연에 필요한 재시작 (사용자 판단)

학생 "평가계획서 분석하기"와 Admin "등록 → 자동 분석"은 Vite 실행 설정(토큰·Proxy)이 필요해 **지금 서버로는 불가**하다. 명령은 `RUNBOOK.md` §4. 재시작 전까지 이 두 화면 기능은 완료로 보고하지 않는다. 분석기·검토 화면·정확도 검증은 지금 상태에서 완료했다.

## 3. 이번 코드 변경 (Frontend Assessment만)

| 파일 | 변경 |
|---|---|
| Student `dev/devContext.ts` 외 3(신규) | 개발 전용 Context 선택·저장·시연 링크, 전환 패널, 명단 JSON |
| Student `api/http/assessmentHttpClient.ts`, Admin `api/http/adminHttpClient.ts` | Mock Header ID를 선택값 → 실행 설정 순으로(조기 반환 유지로 운영 번들 0건) |
| Student `routes/AssessmentLayout.tsx`, Admin `routes/AssessmentAdminRoute.tsx` | 개발 서버 http에서만 패널 동적 로드(학생 화면 보기 iframe 제외) |
| Student `components/notes/NoteEditor.tsx` | "지금 저장" 버튼(기존 저장 흐름) |
| Admin `routes/StudentsRoute.tsx` | 범위 밖 학생 안내(첫 학생 자동 표시 중단, 필터가 있을 때는 기존 동작) |
| Admin `api/http/adminRecordsHttp.ts`, `api/assessmentAdminApi.ts` | 학교·학년·상태 필터와 필터 선택지를 서버 담당 목록에서 계산, 학생 기록 학기 보완 |
| Admin `routes/StudentRecordRoute.tsx` | 과목명 서버 Context 우선 |

## 4. 검증

`REGRESSION-RESULT.md`: Student 76/76·노트 18/18·Admin 21/21·평가계획서 12/12·결과물 2/2·정합성 833/833·학교 매핑 0 불일치·Seed 재실행 생성 0·typecheck·lint·build PASS·번들 0건·Student Care API 정상. Backend 테스트는 Backend 변경이 없어 미실행(직전 272/144 PASS).

## 5. 남은 일

`ISSUES.md`: 재시작 필요 2건(A-1·A-2), 분석기 품질(B-1·A-3, 계정 B 소유), 기존 Shell 이름(B-2), HWP 칸 "PDF" 문구(B-3), Shared 계약·실제 로그인·실제 학교 문서 반입·HWP 공식 확정 승인 대기(C).

## 6. 문서

시스템: `SERVER-CONNECTION-VERIFICATION.md` · `SERVER-REUSE-AND-MEMORY.md` · `ROOT-CAUSE-EXAMPLE-SCHOOL.md` · `SCHOOL-DATA-FLOW.md` · `SCHOOL-MAPPING-VERIFICATION.md`
학생·관리자: `STUDENT-CONTEXT-VERIFICATION.md` · `ADMIN-CONTEXT-VERIFICATION.md` · `STUDENT-SCHOOL-DISPLAY.md` · `ADMIN-SCHOOL-DISPLAY.md` · `STUDENT-UI-VERIFICATION.md` · `ADMIN-UI-VERIFICATION.md` · `CROSS-SURFACE-CHECK.md`
수행평가·활동: `DEADLINE-UPDATE-RESULT.md` · `ASSESSMENT-TITLE-QUALITY.md` · `NOTE-CREATE-UPDATE-E2E.md` · `ARTIFACT-CONTENT-REVIEW.md`
평가계획서: `PDF-UPLOAD-ANALYSIS-RESULT.md` · `HWP-UPLOAD-ANALYSIS-RESULT.md` · `HWPX-REGRESSION-RESULT.md` · `DOCUMENT-EXTRACTION-ACCURACY.md` · `DOCUMENT-SOURCE-EVIDENCE.md` · `DOCUMENT-ANALYSIS-ERROR-CASES.md`
최종: `REGRESSION-RESULT.md` · `SCREENSHOTS.md`(실제 캡처 32장) · `RUNBOOK.md` · `ISSUES.md`
스크립트: `scripts/`(E2E·분석·등록·결과물·문서 생성), 데이터: `plan-*.json`, `artifact-improvement.json`, `deadline-title-*.json`
