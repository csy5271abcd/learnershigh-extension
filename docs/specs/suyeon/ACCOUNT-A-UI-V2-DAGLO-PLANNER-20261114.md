# [계정 A] Assessment 2차 UI 개선 + Monthly Planner 구현 (2026-11-14)

> 기준 HEAD `1fa5ae0`(1차 UI `9136ca0`). **Push 없음 · 이력 재작성 없음 · Backend/DB/API 계약 변경 없음 · AdminShell·Student Care 변경 없음.**
> 표기: [직접] 이번에 브라우저·명령으로 확인 · [정적] 코드 확인. 증거 화면: `account-a-ui-redesign-v2-20261114/`(Commit 안 함).

## 1. 기존(1차) → 개선(2차)

| 1차 | 2차 |
|---|---|
| 연회색 바탕 위 큰 흰 카드 2개(원문·검토), 카드마다 테두리 | 흰 바탕, 원문 \| 검토를 **1px 선 하나**로 구분(끌어서 폭 조절), 겹친 카드 없음 |
| 머리글 2줄(학교·학기 + 파일명) + 색 배지 2개 | 56px 한 줄: 뒤로 · `학교 / 학년도 학년 학기 / 파일명` · 오른쪽 회색 상태 문구 |
| 단계: 둥근 알약 + 녹색 ✓ 원 | **밑줄 탭**(다글로 스크립트 화면). 현재 단계 검정 밑줄, 완료는 파란 ✓ 숫자만 |
| 요약: 숫자 카드 5개 + 노란 큰 경고 상자 + 이슈 카드 목록 | 한 줄 수치 4개 + **회색 안내 한 칸** + '자세히'(이슈·진단 펼치기) |
| 수행평가: 과목 칩 + 카드 속 작은 타일 13개(노랑 점선·초록·파랑 테두리), 타일마다 버튼 3~4개 | **왼쪽 목록(과목 → 평가 비율·수행평가, "n개 남음") \| 오른쪽 상세**. 필드는 `이름 · 값 · 원문 n쪽 · [확인][수정]` 한 줄, 수정할 때만 입력이 펼쳐짐. 항목 100개여도 한 번에 한 수행평가 |
| 최종 확정: 테두리 카드 체크리스트 + 녹색 원 | 선으로 나눈 행, 번호 원(완료 시 파랑) |
| 목록: 왼쪽 학교 Rail + 학년×학기 칸 Grid + 카드, "담당 학생의 학교가 없어요" | 다글로 '내 PDF·전체 보드': 제목 + 파란 CTA, 학교·학년도·학년·학기·검색 Toolbar, **행 목록**(제목 + 회색 부제 + 상태 문구 + 동작) |
| 월별 계획: 빈 7열 격자 + 덮개 문구 | **공용 MonthlyPlanner**(월·과목 탐색, 월/주차 줄, 날짜 칸 일정 블록, 상세 패널, 주차 목록 보기) + **개발용 샘플 Preview** |
| 새로고침하면 검토 결정 사라짐 | 이 브라우저에 임시 보관·복원(서버 저장 아님 표시) + 이탈 경고 |

## 2. 다글로 참고 적용

상위 `references/design/daglo/` **21개**(board·file·pdf·scripts-01~03·home·ai-chat·quiz-01/02·ppt·folder·recording-01/02·new-task·important-board·draft-recording·delete-file·setting·translate·trash)와 `additional/` 19개를 모두 열어 봤다.

| 다글로 패턴 | 적용 위치 |
|---|---|
| 목록(board·folder·trash·delete-file): 카드 없는 행, 굵은 제목 + 회색 부제/파란 상태 문구, 회색 작은 열 머리, 회색 채운 검색창, 우상단 파란 CTA | 평가계획서 목록 |
| 작업 화면(scripts-01~03): 상단 얇은 머리글(뒤로·경로·우측 동작), 좌우 1px 분할, 검정 밑줄 탭, 본문은 글자 위계만 | 검토 Workspace |
| 빈 상태(important-board·draft-recording·scripts-03 북마크): 가운데 아이콘 + 굵은 제목 + 회색 한두 줄 | 목록 빈 상태, 운영 계획 빈 상태 |
| 모달(file·pdf·translate): 왼쪽 회색 작업면 + 오른쪽 옵션 행(라벨 왼쪽·입력 오른쪽) + 안내 카드, 하단 `취소`(텍스트) + 파란 CTA(준비 전 회색) | 업로드 Dialog(옵션 행 구성으로 변경) |
| 버튼(setting·home): 보조 강조는 검정 버튼, 주 CTA만 파랑 | `검토`/`분석`/`적용` 검정, `등록`/`최종 확정` 파랑 |
| 달력(additional 090706): 왼쪽 월 탐색, 7열 Grid, 일정 블록, 상세 Popover | MonthlyPlanner |

## 3. 디자인 토큰

새 색을 만들지 않았다. 기존 `--as-*` Token이 요청 팔레트와 사실상 같다(배경 `#fff`, 보조 `--as-color-subtle #f8f9fb`, Surface `--as-color-fill #f3f4f7`, 본문 `--as-color-text #1d1f23`, 보조 `#72777f`, 선 `#eaebef`, 강조 `--as-color-primary #216cf8`(LearnersHigh Blue, 요청 `#286BFF`와 호환), 강조 배경 `#eaf1fe`, 검정 버튼 `--as-color-ink #1d1f23`) — 그대로 써서 다크 모드도 유지된다.
사용 규칙(`review/review.module.css` 머리 주석): 노랑·초록 사용 0, 빨강은 실제 오류(원문 불러오기 실패·SHA 불일치·확정 실패·쪽 없음)에만. 버튼·입력 높이 40(작은 것 32)·Radius 10 통일. 과목 구분 점 6색은 Planner 점에만(상태 색 아님).

## 4. 변경 파일

| 파일 | 내용 |
|---|---|
| `admin/.../review/review.module.css` | 2차 스타일 전체(Workspace·목록·Dialog) |
| `review/ReviewWorkspace.tsx` | 레이아웃, 브라우저 임시 보관·복원, 이탈 경고, 실제 상태 문구, 확정 후 재마운트 방지 |
| `review/OverviewStep.tsx`·`SubjectStep.tsx`·`PerformanceStep.tsx`·`ConfirmStep.tsx`·`SourcePane.tsx`·`TeachingPlanStep.tsx` | 각 단계 재구성 |
| `review/TeachingPlanCalendar.tsx` (삭제) · `review/teachingPlanCalendar.ts` → `student/.../teaching-plan/teachingPlanPlacement.ts` (이동·확장) | 공용 Planner로 대체 |
| `student/.../components/teaching-plan/MonthlyPlanner.tsx`·`monthlyPlanner.module.css` (신규) | Student 조회·Admin 검토 공용 렌더러(Assessment 소유 영역) |
| `admin/.../dev/teachingPlanSample.ts`·`MonthlyPlannerPreview.tsx` (신규) | 개발 전용 합성 Fixture·Preview |
| `components/canonicalUi.ts` | MonthlyPlanner 재수출(기존 Student Component 공유 방식) |
| `routes/AssessmentAdminRoute.tsx` | DEV 전용 `/assessment/dev/monthly-planner` |
| `routes/EvaluationPlansRoute.tsx` | 목록 재설계(학교 코드 열기 포함), 업로드 Dialog 옵션 행 |

## 5~6. 검토 Workspace · 수행평가 UX

§1 표. 기존 확정 조건(원문 SHA 대조 · 과목 코드 · 값 있으면 근거 쪽 · PARTIAL 확인 · 원문 대조 확인)과 `PUT review`·서버 재조회는 그대로다. 채점기준표는 평가 요소 rowSpan 표 + 근거 쪽 링크(원문 이동), 수준·배점 확정은 0.3 계약 후.

## 7~9. Monthly Planner

- **공용 렌더러** `MonthlyPlanner`(mode `student`/`admin`): 왼쪽 학기 월(계획 수 표시)·과목 필터(점 + 개수)·표시 기준, 위 월 이동·`달력 | 주차 목록` 전환, `n월 전체` 줄(MONTH_ONLY)·`n주` 줄(WEEK_ONLY, 학교 주차 그대로·"3~4주"는 시작 주 줄 + 원문 표기)·`날짜 미확인` 줄, 7열 날짜 Grid(EXACT_DATE 블록, DATE_RANGE는 기간 안 날짜마다 블록), 하루 2개 초과는 `+n개 더`, 블록 말줄임 + 상세 패널(단원·학습 내용·성취기준·수업/평가 방법·연계 수행평가·특별 일정·원문 n쪽 보기). Admin은 후보 점선·"분석 후보 · 검토 필요(읽지 못한 칸 n개)", Student는 빈 칸을 숨기고 확정만. 1180px 이하 상세는 하단 시트, 640px 이하는 주차 목록 기본.
- **날짜 규칙**(`teachingPlanPlacement.ts`): 원문에 없는 날짜·ISO 주·요일 시작 주를 만들지 않음. 학년도 3~12월만 실제 연도, 1~2월은 "2026학년도 2월"로 날짜 칸 없이 주·월 정보만.
- **실제 서비스 경로**: 검토 Workspace 4단계가 서버 행(현재 0개 — 0.2 계약에 없음)을 공용 렌더러에 넘기고, 없으면 정직한 빈 상태("아직 운영 계획 분석 결과가 없어요… 원문에 없음이 아님"). 학생 화면 연결은 서버 API가 생긴 뒤.
- **개발용 Preview** `/assessment/dev/monthly-planner`: `샘플 데이터 · 개발 환경 전용` 표시, 4과목 11행(정밀도 5종·같은 날 3건·긴 내용·2월·후보/확정·읽지 못한 칸). 관리자/학생(확정만) 보기 전환. **운영 Build에서 Route·샘플이 빠짐 [직접: dist에서 샘플 문자열 0건]**. 서버·DB·학생 화면 연결 없음.
- **Backend 연결 준비**: 행 모양은 §7-1 설계(0.3 `teachingPlan[]`)와 같은 필드 → Adapter에서 `TeachingPlanEntry`로 옮기면 바로 표시된다.

[직접] Preview: 9월 블록 2개+`+1개 더`, 주차 줄 3, 월 줄 1, 블록 클릭 → 상세 패널, 과목 1개 끄기 → 줄 항목 4→2, 다음 달 "2026년 10월", 2월 "2026학년도 2월", 학생 보기 확정 3건만, 모바일 가로 넘침 0.

## 10~11. 목록 · 업로드

- 학교 원천: 전체 학교 API가 없어 `담당 학생 학교 + 개발 설정`임을 목록 아래에 밝히고, **다른 학교는 학교 코드로 열기**(서버가 모든 학교 허용 — 업로드가 막힌 것처럼 보이지 않음). 학교를 만들거나 이름을 지어내지 않는다. 코드로 연 학교는 `학교 코드 …`로 표시.
- 행: 문서명 / `고1 · 2학기 · PDF · v1 · 30KB`(HWP·HWPX는 "미리보기 준비 중") / 분석 상태 문구 / `확정값 n개 공개` 또는 `확정 전 · 학생 비공개` / 등록일 / `검토`·`분석`(검정) · `원문` · `개정본`. 학년·학기·문서명 필터, 빈 상태·필터 빈 상태·학교 목록 오류(다시 시도) 구분.
- 업로드: 왼쪽 회색 Dropzone(“평가계획서 파일을 업로드해 주세요 · 20MB 이하”) → 파일 카드(형식·크기·상태, 진행은 Indeterminate만), 오른쪽 `학교/학년도/학년/학기/출처` 옵션 행 + 등록 안내, 하단 `취소` + 파란 `등록하고 분석`. PDF/HWP/HWPX 정책·재시도 흐름 유지.
- **API 변경안(구현 안 함)**: `GET /api/admin/assessment/schools?query=&page=` — Assessment 소유, 원천은 `AcademicContextProvider` 뒤 Adapter(1팀 통합 시 실제 학교 원천으로 교체). 응답 `{schoolId, name, region, schoolKind, planCount}`. 계약·원천 결정 전이라 구현하지 않음.

## 12. 검토 임시 보관 · 상태 정확성

- 현재 API로 가능한 범위: 서버 임시 저장 없음(`PUT review`는 확정만). → **브라우저 localStorage에만** 결정·과목 코드를 보관하고 새로고침 시 복원(키에 `analysisId` 포함 → 분석이 바뀌면 이전 보관본 무시). 하단에 "이 브라우저에만 임시 보관 · 서버 저장은 확정할 때 · 비우기", 다른 기기·브라우저에는 없다. 확정 성공 시 보관본 삭제. 저장소 사용 불가 시 조용히 보관 없이 진행.
- 이탈 경고: 확정 전 결정이 있으면 `beforeunload` [직접: 새로고침 시 dialog `beforeunload` 발생].
- 상태 문구(서버 값으로만): 확정 전 `일부 항목 확인 필요 · 검토 2/13`, 확정 후 `확정값 2개 학생 공개 · 미확인 11개 비공개`, 목록 `확정 전 · 학생 비공개` / `확정값 n개 공개`. 단계 ✓는 실제 조건(과목 연결 완료·모든 항목 확인·서버 CONFIRMED)일 때만.
- **서버 초안 저장 제안(승인 필요)**: `assessment_plan_review_draft(revision_id, analysis_id, admin_id, payload_json, version, updated_at)` + `GET/PUT .../revisions/{id}/review-draft`(If-Match version → 409 충돌), 확정 시 초안 삭제. 기존 Review·확정값 Table은 그대로. 여러 관리자 동시 검토 시 정책(관리자별 초안 vs 공유 초안) 결정 필요.

## 13~14. 브라우저 검증 [직접, Edge headless]

환경: Volume 없는 일회용 MySQL + Backend(18083) + 시험용 Stub 분석기(PARTIAL) + Admin dev(5184, http). 끝난 뒤 모두 종료·삭제. 시연 DB·Volume·Storage 접근 없음.

| # | 화면 | 결과 |
|---|---|---|
| 1 | `v2-01-list` | 문서 2행(일부 항목 확인 필요 / 분석 전) |
| 2 | `v2-02-upload` | 파일 카드·옵션 행 |
| 3 | `v2-03-overview` | 수치 1·2·13·분석 대기, 회색 안내 + 자세히(2) |
| 4 | `v2-04a-performance-common` · `v2-04-performance-item` | 목록 \| 상세, 채점기준표 |
| 5 | `v2-05-editing` | 반영비율 30→35 편집 행 |
| 6·7 | `v2-06-confirm` · `v2-07-confirmed` | 확정 활성 → 완료, 새로고침 뒤 서버 값 `수행평가명 탐구 보고서 1쪽 / 반영비율 35% 1쪽` |
| — | 새로고침 복원 | `검토 2/13` 유지, beforeunload 발생 |
| 8 | `v2-08-teaching-empty` | 실제 경로 빈 상태 + 개발용 Preview 링크 |
| 7(요청) | `v2-09-planner` · `v2-10-planner-detail` · `v2-11-planner-filter` · `v2-12-planner-feb` · `v2-13-planner-student` · `v2-14-planner-mobile` | §7~9 [직접] |
| 10·11 | `v2-r-390x844` · `v2-r-1024x768` · `v2-r-1366x768` · `v2-r-1440x900` | 가로 넘침 0. 첫 시도에서 390·1024 화면 오른쪽이 잘리는 문제(Grid 열 최소 폭) 발견 → 수정 후 재확인 |
| 12 | `v2-15-pdf-loading` · `v2-16-pdf-error` | Skeleton → 오류 + 다시 시도 |
| 콘솔 | 전 시나리오 | 오류 0 (의도한 500 제외) |

다글로 비교 뒤 고친 것: 근거 쪽 "원문 1쪽 원문 2쪽" → "원문 1쪽 · 2쪽", 모바일 Planner 제목·보기 전환 줄바꿈, Workspace 열 최소 폭.

## 15. 시험

| 항목 | 결과 |
|---|---|
| Frontend `typecheck` / `lint` / `build` (전체 workspace, Student 포함) | exit 0 / 0 / 0 |
| 브라우저 시나리오 | §13 PASS |
| Backend | 변경 없음 → 재실행 안 함(직전 Unit 282·Integration 159 / 실패 0) |
| Student Care E2E | AdminShell·공통 CSS·Student Care 변경 없음 → 재실행 안 함(기준선 7/7) |
| 미검증 | 300쪽+ 실제 문서, 다크 모드, Mock 데이터 모드 목록 화면(새 목록은 http·Mock 공용 함수만 씀 — Mock 시각 확인 안 함) |

## 16. Student Care 보호

변경은 `frontend/admin/src/features/assessment/**`와 `frontend/student/src/features/assessment/components/teaching-plan/**`(신규·Assessment 소유)뿐. `app/`(AdminShell)·`features/student-care/`·`frontend/shared/`·`e2e/`·Backend·DB 변경 0건 [직접 `git diff --name-only`].

## 17. Git

이번 Commit Hash는 최종 응답에 기록. Push 없음. 미커밋 유지: C8 문서·`api-contract.md`, `backend/bin/`, `references/**`, 증거 화면 폴더.

## 18. 미완료 · 다음 우선순위

1. 서버 초안 저장(§12 제안) 승인 → Migration·API·충돌 처리.
2. 계정 B 0.3 `teachingPlan[]` 합의 → Adapter → 실제 Planner 데이터, 학생 운영 계획 화면 연결(같은 MonthlyPlanner, mode=student).
3. 전체 학교 검색 API(§10 변경안) 승인 → 목록 학교 선택 교체.
4. 운영 계획 편집·확정(행 단위 저장 방식 결정 후).
5. 300쪽+ 문서·다크 모드·Mock 모드 시각 확인, 병합 전 Student Care E2E 1회.
