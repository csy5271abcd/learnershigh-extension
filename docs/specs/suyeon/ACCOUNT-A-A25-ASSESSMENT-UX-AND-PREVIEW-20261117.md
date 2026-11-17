# [계정 A] A25 — Assessment 사용자 흐름 문제 해결 · HWP/HWPX PDF 미리보기 · Daglo 방향 UI 정리 (2026-11-17)

> 작업 위치: 통합 Worktree `C:\learnershigh-assessment-integration` · `integration/assessment-studentcare-20261116` · Draft PR #17.
> 원본 `C:\learnershigh-extension`은 읽기만 했다(미Commit 68건 변경 0). 실제 학교 문서는 로컬 Docker 변환 시험에만 쓰고 Railway로 보내지 않았으며, Git에 넣지 않았다.

## 최종 판정 — **PARTIAL**

우선 과제 4개 중 2개(PDF 404, 삭제)와 세부 개선 4개(빨간 문구, 과목 ID, 파일 선택, PDF AI 버튼)는 구현과 검증을 마쳤다(PASS).
나머지 2개(HWP/HWPX 변환 미리보기, 달력)와 Daglo 전면 통일은 제약이 남아 PARTIAL이다.
- HWP/HWPX 변환 미리보기: 동작은 하지만, 실제 문서 표본 17%가 변환되지 않고 글꼴이 대체되며 Docker 설정이 필요하다.
- 달력: 기존 달력을 다듬었지만, 실제 원문 대부분이 주차 단위라 날짜 칸이 비는 데이터 한계가 있다.
- Daglo 전면 통일: Token·공통 패턴 수준에서 적용했고, 화면별 전면 재디자인은 하지 않았다.

| # | 요구 | 판정 | 근거 |
|---|---|---|---|
| 1 | 대학별 자료 PDF 404 | **PASS** | 원인 확인·수정, 관리자·학생 3해상도 표시 |
| 2 | 평가계획서 삭제 | **PASS** | 논리 삭제 API·UI·IT 3건·실화면 삭제·새로고침 유지 |
| 3 | HWP/HWPX → PDF 미리보기 | **PARTIAL** | Docker 변환 실동작, 실제 문서 30개 중 25개 변환, 글꼴 대체, 기본값은 꺼짐 |
| 4 | 월별 운영계획 달력 | **PARTIAL** | 실제 확정 데이터로 표시. 주차 단위 원문은 날짜 칸에 둘 수 없음(계약), 수행평가·시험 유형 합류는 안 함 |
| 5 | Daglo 방향 화면 통일 | **PARTIAL** | Token·공통 패턴(메뉴·업로드 카드·탭·안내 줄)만. 화면별 전면 재디자인 아님 |
| 6 | 빨강·노랑 최소화 | **PASS** | '확인 필요' Token 무채색화, 학년 충돌 무채색 차단 상자(검증 유지) |
| 7 | 과목 ID 제거 | **PASS** | Select·확정 체크리스트·검토 표에서 기술 ID 제거 |
| 8 | 최종 확정 파일 선택 UI | **PASS** | 카드형 선택(버튼+끌어 놓기), 대조 규칙 그대로 |
| 9 | PDF AI 분석 버튼 제거 | **PASS** | 버튼·Route·화면·미사용 API 함수 제거, 등록 분석 보존 |
| 10 | 기존 기능 보존 | **PASS** | Stub E2E 23/23, Railway 4/4, Student Care IT 85/85(단독), Node 92/92, GitHub CI Backend·E2E(Student Care 인수) success |
| 11 | 회귀·사용자 실행 준비 | **PASS** | 로컬 전체 IT 80건 환경 실패(컨테이너 기동) → 단독 재실행 85/85, GitHub CI 전체 IT·E2E success. 가이드 갱신 |

## 1. 시작 Git 상태

- 통합 Worktree HEAD `59c4a2f`(= 원격, 작업 트리 깨끗). 원격 `main`은 `c03a1a4`.
- 원본 폴더 미Commit 68건은 목록을 저장해 두었다.

## 2. Daglo 참고 자료 조사

`daglo/` 22장 중 9장, `additional/` 19장 중 8장, 모두 17장을 **직접 열어** 확인했다. 홈, 새 작업 Popover, 전체 보드·폴더·휴지통 목록, 새 받아쓰기·PDF 분석 Modal(업로드 전·중), 설정 Modal, 스크립트/요약 2단 화면, PDF 뷰어, 슬라이드 생성·생성 중, 퀴즈, 문서번역 Empty, 캘린더(외부 앱)다. 나머지 24장은 같은 화면군(녹음·퀴즈·스크립트 변형)으로 판단해 열지 않았다.

| 요소 | Daglo |
|---|---|
| 레이아웃 | 좌측 아이콘 Rail + 보조 Sidebar(연회색) + 흰 본문, 상단 검색(회색 채움)·주 동작 버튼(블루) |
| Typography | 굵은 제목(22~28px), 본문 차콜, 보조 회색, 날짜·메타 회색 tabular |
| 색 | 흰색·#F3F4F6 계열 Surface·차콜/검정·블루 Primary. 빨강은 '삭제하기' 같은 파괴 동작 텍스트에만 |
| 버튼 | 블루 채움(주 동작), 차콜 Pill(보조 강조), 회색 비활성, 텍스트 버튼(취소) |
| 입력·Select | 연한 테두리, Radius 10~12, 오른쪽 Chevron |
| 탭 | 밑줄 탭(선택 = 굵은 글씨 + 검정 밑줄), Segmented(회색 바탕 + 흰 선택) |
| 카드·패널 | Radius 12~16, 얇은 테두리 또는 연회색 면, 그림자 거의 없음 |
| Popover | 흰 카드 + 부드러운 그림자, 아이콘 그리드 |
| 업로드 | 왼쪽 연회색 Drop Zone + 가운데 아이콘·두 줄 문구, 파일을 고르면 흰 파일 카드(이름·진행률·진행 바·X) |
| 목록 | 구분선 없는 행, Hover/선택 시 연회색·연블루 배경, 오른쪽 `⋯` |
| Empty·Loading | 가운데 아이콘 + 굵은 한 줄 + 회색 설명, Skeleton 회색 면, 점 3개 로딩 |
| Modal | 큰 Radius, 제목 왼쪽, X 오른쪽, 하단 오른쪽 '취소(텍스트) · 주 동작' |

기존 Assessment Token(`assessmentTheme.css`: Pretendard, 블루 `#216cf8`, Fill `#f3f4f7`, Radius 10~16)은 이미 Daglo에 가깝다. 그래서 전면 교체하지 않고 상태 색과 컴포넌트 패턴을 맞췄다. 디자인 원칙 문서 §1에 A25 방향(Daglo 우선, 빨강 제한)을 추가했다.

## 3. 이미지 1~11 대응표

이번 대화에는 사용자 스크린샷(이미지 1~11, 네이버 캘린더·PlanB 이미지 5·6 포함) **파일이 전달되지 않았다**. 그래서 지시문의 문제 설명으로 코드 위치를 찾았다.

| 문제 | 코드 위치 |
|---|---|
| 01 PDF 404 | `frontend/student/tools/universityExamPdfDevServer.ts`, 두 Vite 설정, `PdfViewer.tsx` |
| 02 삭제 | `AdminEvaluationPlanDeletionController`·`EvaluationPlanDeletionService`·`EvaluationPlan`, `EvaluationPlansRoute.tsx` |
| 03 HWP/HWPX | `integration/preview/*`, `PlanPreviewRenditionService`, `ConvertedOriginalViewer.tsx`, 학생 `EvaluationPlanOriginalRoute.tsx` |
| 04 달력 | `components/teaching-plan/MonthlyPlanner.tsx`(학생·관리자 공용) |
| 05 빨간 문구 | `review/SubjectStep.tsx`(학년 충돌), Token `--as-color-warning-*` |
| 06 과목 ID | `review/SubjectStep.tsx`, `TeachingPlanStep.tsx`, `ConfirmStep.tsx`, `EvaluationPlanReviewRoute.tsx` |
| 07 파일 선택 | `review/LocalOriginalPicker.tsx`, `ConfirmStep.tsx`, `PlanReviewConfirmPanel.tsx` |
| 08 PDF AI 버튼 | `EvaluationPlansRoute.tsx`, `AssessmentAdminRoute.tsx`, `paths.ts`, `ai/aiApi.ts`, `ai/EvaluationPlanAiRoute.tsx`(삭제) |

## 4. PDF 404 원인

1. PDF 27개는 원본 폴더 `references/previous-exam-questions/`에 **실제로 있다**. 다만 Git **미추적** 자료(원본 미Commit 68건 중 하나)다.
2. 그래서 통합 Worktree에는 이 폴더가 없다(0개). 개발 서버 Plugin은 저장소 안 경로만 읽었기 때문에, 관리자·학생 모두 `HEAD 404` → "원본 PDF 파일을 찾을 수 없어요"가 나왔다.
3. Manifest 파일명·documentId·크기·SHA는 원본 폴더 파일과 일치한다(폴더를 지정하면 27/27 `AVAILABLE`).
4. Plugin은 관리자·학생 Vite에 모두 들어 있다. 포트 문제는 아니다.

## 5. PDF 404 수정 결과

- 자료 폴더를 `ASSESSMENT_UNIVERSITY_EXAM_ROOT`(절대 경로, 환경 변수 또는 `.env.local`)로 지정한다. 없으면 기존 저장소 경로를 쓴다. 다른 개발자 경로를 코드에 하드코딩하지 않았다. PDF는 Git에 넣지 않았다(재배포 권한 미확인).
- 폴더 자체가 없으면 `404 SOURCE_FOLDER_MISSING` + `X-University-Exam-Source: missing`을 돌려준다. 화면은 "원본 자료 폴더가 연결되지 않았어요(설정 확인)"로 **파일 없음과 구분**한다. 개발 서버 기동 로그에 연결 여부가 찍힌다.
- Manifest ID만 받는 규칙, 크기·SHA 불일치 409, 경로 조작 차단(실측 404)은 그대로다.
- E2E용 학생 설정(`e2e/assessment/vite.student.config.ts`)은 함수형 설정에 맞췄다.
- 실측:
  - 폴더 미지정: 27/27 `MISSING`, 원인 헤더가 붙음.
  - 지정: 관리자·학생 모두 27/27 `AVAILABLE`, HEAD·GET 200 `application/pdf`(729,402 B).
  - 화면: 관리자·학생 대학별 자료 PDF Canvas가 1366·1600·1920에서 모두 표시.

## 6. 평가계획서 삭제

`DELETE /api/admin/assessment/evaluation-plans/{planId}?schoolId=&confirmPublished=`(§38-9 DRAFT)

| 항목 | 내용 |
|---|---|
| 방식 | 논리 삭제. 신규 Migration `V202611170100`(`deleted_at`·`deleted_by` + CHECK). 기존 Migration 변경 0 |
| 보존 | Revision·원문 파일·분석 Run·검토·확정 기록·운영계획 검토는 그대로 둔다(감사·무결성). 물리 삭제·복원·보존 기간은 미결(OD-A11과 같음) |
| 숨김 | `EvaluationPlan`에 `@SQLRestriction("deleted_at is null")`. 관리자 목록·상세·원문·검토, 학교 검색, 현황, 학생 목록·상세·원문·Monthly Planner 모두에서 빠진다(학생 공개 해제) |
| 확인 | 학생 공개 중(확정 Revision 있음)이면 `confirmPublished=true`가 없을 때 `409 PLAN_DELETE_CONFIRMATION_REQUIRED` |
| 학교 | 요청 `schoolId` ≠ 문서 학교면 404. 운영 권한은 OD-A08(인증된 관리자 = 모든 학교 운영)이라 '다른 학교 관리자 차단' 개념은 없다. 잘못된 대상 삭제만 막는다 |
| 분석 중 | 그 Revision을 서버가 분석 중이면 `409 PLAN_ANALYSIS_IN_PROGRESS` |
| 재요청 | 이미 삭제 → 404. 동시 개정 등록은 낙관적 잠금 409 |
| UI | 행 오른쪽 `⋯` 메뉴 → '삭제'. Dialog: 파일명·학년도·학년·학기·개정본 수, 영향 안내, 공개 중이면 확인 체크, 처리 중 중복 클릭 방지, 오류 문구. 성공 시 목록·학교 검색 갱신 + Toast |

검증:
- IT `EvaluationPlanDeletionApiTest` 3/3: 확정 전 삭제·목록 반영·재삭제 404·기록 보존·다른 문서 무영향 / 공개 중 409 → 확인 후 삭제·학생 목록·상세·운영계획·원문 404 / 다른 schoolId 404·학생·무인증 401·schoolId 누락 400.
- 실화면: 1600에서 메뉴 → Dialog → 삭제 → 행 사라짐, **새로고침 후에도 0**.
- 부족: '분석 중' 409는 코드 경로만 있고 자동 시험이 없다(실행 중 집합은 실제 분석 요청 중에만 채워짐).

## 7. HWP/HWPX 기존 미리보기 문제

A10 구조 미리보기는 HWP/HWPX를 서버가 읽어 문단·표를 HTML로 다시 그린 것이다. 원본의 페이지·글꼴·표 너비·줄바꿈을 재현하지 않는다. 이 화면을 원문 미리보기 기본값에서 뺐다. 분석 근거 위치(구역·표·행·열)를 강조하는 데 필요하므로, 파서와 API는 그대로 두고 **'분석용 구조' 탭**으로만 남겼다.

## 8. 변환 기술 선정 근거

| 후보 | 결과 |
|---|---|
| LibreOffice 단독 | 이 PC에 없음. 기본 HWP 필터는 HWP 97(v3) 수준이라 HWP 5.x·HWPX는 확장이 필요 |
| **LibreOffice + H2Orestart 0.8.0** | 무료(MPL-2.0 / GPL-3.0, 2026-10-18 배포). HWP 5.x·HWPX 가져오기. **선택** — Docker 안에서만 실행, 호스트 설치 없음 |
| 한컴오피스 2024(이 PC에 설치됨) | 자동화(COM)는 원본 렌더러라 충실도가 가장 높을 수 있다. 하지만 데스크톱 라이선스의 서버 자동화 사용 가능 여부가 불명확하고, 보안 승인 창 등 비대화식 실행이 어려우며 Windows 전용이다. **사용자 승인 없이 쓰지 않았다**(평가도 하지 않음) |
| 외부 변환 서비스 | 문서 외부 전송 금지 → 제외 |

## 9. 변환 품질 검증 (실측, 로컬 Docker, `--network none`)

- 원본 폴더의 실제 학교 문서 무작위 30개(HWP 20 · HWPX 10, seed 25): **25개 변환**(HWP 16/20, HWPX 9/10), 문서당 약 4초.
- 따로 고른 실제 문서 3개: 2개 변환. 합성 문서 5개: 백엔드 시험용 HWP 2개만 변환. A19 합성 HWP/HWPX와 시험용 합성 HWPX는 `could not be loaded`로 실패(생성기가 만든 최소 파일).

렌더링(poppler 60dpi)으로 확인한 결과:

| 항목 | 결과 |
|---|---|
| 한글 글꼴 | 원본 함초롬 → **Nanum Gothic·DejaVu로 대체**. 글자 폭이 달라 줄바꿈이 다르다 |
| 표 너비·높이·셀 병합 | 유지(다단 병합 머리글 표 정상) |
| 표가 페이지를 넘어감 | 넘어간다. 쪽 나눔 위치는 원본과 다를 수 있다(표 앞 빈 공간 사례) |
| 머리말·꼬리말·페이지 번호 | 쪽 번호 표시됨 |
| 여백·방향 | 가로·세로 A4 유지 |
| 이미지 | 도장 이미지 표시 |
| 특수문자 | 대체 글꼴로 표시. 기호 일부 모양 차이 가능 |
| 쪽 수·순서 | 순서 유지(7·6·13·7·2쪽). 원본 쪽 수와는 대조하지 못했다(한컴 기준 렌더링 없음) |
| 긴 문서 | 13쪽 문서 정상 |

결론: 읽기용 미리보기로는 쓸 만하지만 **원본과 같은 레이아웃은 아니다**. 화면에 "미리보기용 변환, 줄바꿈·쪽 나눔이 다를 수 있음"을 표시하고, 정확한 대조는 원본 다운로드로 안내한다.

**원문 페이지 근거(6-6)**: HWP/HWPX 분석 근거는 페이지가 아니라 `documentLocator`(구역·표·행·열)이고, 변환 PDF 쪽과의 대응 정보가 없다. 근거를 누르면 변환 PDF 쪽으로 추측해 이동하지 않고 '분석용 구조' 탭을 연다(E2E로 확인).

## 10. 원본·변환 PDF 저장 구조

- **원본**: 기존 plan-documents Storage 그대로(바꾸지 않음). `/file` 다운로드는 계속 원본 HWP/HWPX(실측 바이트 동일).
- **변환본**: `{plan-storage}/preview-renditions/{revisionId}-{hash(원본 SHA-256 + 변환기 ID)}.pdf`. 원본 무결성(크기·SHA) 확인 뒤에만 변환한다.
- **실패**: 같은 키의 `.failed`에 원인 코드를 기록해 같은 원본을 다시 변환하지 않는다. 일시 원인(변환기 실행 불가·바쁨·중단)은 기록하지 않는다.
- **응답**: `/preview`가 변환 PDF를 `inline` + `X-Preview-Rendition: converted-pdf`로 준다(관리자, 학생 공개본). 변환기 미설정은 415, 실패는 422 `PLAN_PREVIEW_FAILED`.
- **안전**:
  - 형식 hwp/hwpx만, 20MB 상한, 90초 제한 + 강제 종료, 동시 2개.
  - 메모리 1g·CPU 2·pids 256, 네트워크 없음, 읽기 전용 입력.
  - 원본 파일명 대신 `source.hwp|hwpx`를 쓰고 셸 없는 인자 목록으로 실행.
  - `%PDF-` 서명과 60MB 상한 검사, 임시 폴더 삭제.
- **설정**: `assessment.preview.converter.mode`(`none` 기본 | `docker` | `soffice`). 시험 클래스패스는 `none`으로 고정.
- **이미지**: `tools/plan-preview-converter/Dockerfile`(ubuntu 24.04, H2Orestart SHA-256 고정).
- **실측**:
  - HWP 미리보기 200 converted-pdf 2.0초, 두 번째 21ms(캐시).
  - 변환 불가 HWPX 422 → 두 번째도 422(14ms, 재변환 없음).
  - 원본 다운로드 둘 다 업로드 바이트와 동일.

## 11~12. 월별 운영계획 Calendar 설계·데이터 매핑

계약(§10-1-2, §39-3)과 공용 `MonthlyPlanner`·`teachingPlanPlacement`(시간 정밀도 8종)를 확인했다. **월간 Grid·요일·날짜 칸·+N·상세 패널·과목 필터·월 이동·주차 목록 보기는 이미 있었고**, 실제 확정 데이터(학생 `/teaching-plan`, 관리자 검토 후보)에 연결돼 있다.

| 원문 | 표시(변경 없음) |
|---|---|
| `EXACT_DATE`·`DATE_RANGE` | 날짜 칸 |
| `WEEK_IN_MONTH` ('3월 2주') | 그 달의 'n주' 줄 — 날짜로 바꾸지 않음 |
| `MONTH`·`MONTH_RANGE` | '이 달 전체' 줄(여러 달이면 각 달) |
| `TERM_WEEK` | '학기 n주차' 줄 |
| 1~2월(학년도로 연도 결정 불가) | 날짜 칸을 그리지 않음(원문 연도 명시 시만) |
| 시기 없음 | '달을 정할 수 없는 계획'으로 따로 모음 |

A25 변경:
- '이번 달' 이동, 오늘 칸 강조(블루 원), 주말 회색.
- `+N개` 표기.
- 월·주차 줄을 달력 카드 안 '종일 줄' 형태로.
- 그 달 계획이 모두 주차·월 단위일 때 안내 문구.

실화면 확인: 학생 3학년 확정 HWPX, 1366·1600·1920에서 '2026년 3월', 가로 스크롤 없음.

**남는 한계**:
- 실제 평가계획서의 운영계획은 대부분 주차·월 단위라 날짜 칸이 비어 보인다. 계약상 학교 주차를 날짜로 바꿀 수 없다. 학사력(개학일) 데이터가 생기면 해결할 수 있다(제안).
- 수행평가·시험 일정을 같은 달력에 합치는 것은 하지 않았다. 별도 도메인이고 자동 병합이 금지돼 있다.
- 연도 이동은 학기 단위 화면이라 해당 없음.
- 2월·윤년·여러 달 일정은 기존 배치 함수 규칙대로이며, 이번에 새 자동 시험을 추가하지 않았다(Frontend Unit 프레임워크 없음).

## 13. 빨간 안내 문구

- **Token**: `--as-color-warning-soft/text`를 노랑 계열에서 연한 블루그레이(`#eef1f6`/`#3f4a5c`, 다크 대응)로 바꿨다. '부분 분석'·'관리자 정정'·'연결 확인 필요'·'쪽 없음' 등 '확인 필요' 표시가 모두 무채색이 됐다. `.lh-assessment` 범위라 Student Care에는 영향이 없다.
- **학년 충돌**: 빨간 글자 대신 무채색 상자 + 굵은 "확정할 수 없어요 · 학년이 달라요". 확정 차단 검증은 그대로이고, E2E(`a15-flows`, Railway 시나리오 4)로 확인했다.
- **유지**: 실제 실패(확정 실패·저장 실패·다운로드 실패 등 `role=alert`)와 파괴 동작(삭제)은 빨강 그대로.

## 14. 과목 ID 제거

- 과목 Select 두 곳: 과목명만(`subjectOptionLabel`). 같은 이름이 겹치면 '같은 이름 n번째'로 구분. 목록에 없는 저장값은 "목록에 없는 과목".
- 최종 확정 체크리스트: `과목 → subj_02` 대신 '연결됨/미연결'.
- 검토 표: 분석기 `itemKey`(`performance_01`)를 화면에서 제거(`data-item-key`에는 남음).
- 학생 모의고사 `EN-01`은 사람이 읽는 자료 번호라 유지.
- `subjectId`는 값·저장·API에 계속 쓴다.

## 15. 파일 선택 UI

`LocalOriginalPicker`:
- 형식 아이콘, '파일 선택' 버튼과 끌어 놓기.
- 고른 뒤 파일명·크기, 비교 중 진행 바.
- '같은 파일이에요'(블루) / '다른 파일 — 확정할 수 없어요'(빨강).
- '다른 파일 선택'.

PDF와 HWP/HWPX 확정 패널 모두에 적용했다. 브라우저 SHA-256 대조, 파일 서버 미전송, 미선택·불일치 시 확정 차단(blockers)은 바뀌지 않았다. 시험 ID(`review-local-pdf`)는 유지해 Stub·Railway E2E가 그대로 통과한다.

## 16. PDF AI 버튼 제거

- 제거: 상단 버튼, Route(`plan-ai`), 경로, 화면 `EvaluationPlanAiRoute.tsx`, 이 화면만 쓰던 `analyzeEvaluationPlanPdf`·`EvaluationPlanResult`.
- 예전 주소는 목록으로 연다.
- 보존: 등록 과정의 서버 분석(Railway), Backend AI API, 대학별 자료 AI 화면이 쓰는 `saveAiReview`·`analyzeUniversityExamPdf`.
- 실화면에서 버튼 0개를 3해상도에서 확인했다.

## 17~19. Daglo 디자인 적용 결과·변경 목록

- **관리자**:
  - 학교별 평가계획서(⋯ 메뉴·삭제 Dialog·HWP/HWPX 'PDF 변환 미리보기' 표기)
  - 검토 Wizard(원문 탭 'PDF 미리보기/분석용 구조', 안내 줄, 과목 Select, 학년 충돌 상자, 확정 파일 카드, 체크리스트)
  - HWP 확정 패널, 학년도별 열람 안내 문구
  - 월별 운영계획 단계(공용 달력)
  - '확인 필요' 색(전체 Assessment)
- **학생**: 원문 화면(HWP/HWPX 변환 PDF + 안내, 415/422 안내), 대학별 자료 PDF(폴더 안내), 월별 운영계획 달력, '확인 필요' 색.
- **변경하지 않음**: 전체 현황·학생 Assessment·피드백·심화 탐구·참고자료실·학생 홈 등 나머지 화면의 레이아웃은 그대로다. 이미 같은 Token을 쓰고 있어 색 변화만 반영됐다.
- **스크린샷**: Before/After 체계 비교는 하지 않았다. After 스크린샷은 Scratchpad `a25/ui/`에 있다(Commit 안 함).

## 20. Student Care 보존

Student Care 코드·CSS 변경은 0이다. Admin Shell도 변경하지 않았다.

| 시험 | 결과 |
|---|---|
| Node | 92/92 |
| Student Care IT | 단독 재실행 85/85(E2E 지원 포함) |
| 인수 Playwright | GitHub CI E2E Job(§24) |

## 21. Assessment 보존

Stub E2E 23/23, Railway 합성 4/4, 평가계획서·운영계획·다중 형식·구조 미리보기 IT 통과. 학년 검증·원본 대조·확정·학생 비공개 규칙은 바꾸지 않았다.

## 22. Backend 테스트

| 범위 | 결과 |
|---|---|
| Unit | **392/392**(생략 1) — 변환기 명령·제한 3건 추가, ArchUnit 포함 |
| Integration 전체(1회차) | 210 중 130 통과, **80 실패 = 모두 Testcontainers MySQL 기동 실패**(`Could not create/start container`, `Communications link failure`; 동시 컨테이너 20개 상태, 48분) |
| 실패 클래스 단독 재실행 | Student Care 전체 + E2E 지원 **85/85** |
| 신규 IT | 삭제 3/3, 변환 미리보기 3/3(캐시·실패 기록·원본 다운로드·PDF 미변환) |
| Migration | 일회용 DB에 19개 적용 후 기동 |
| 원격 호출 | 회귀 로그 Railway 주소 0, 로그 토큰 0 |

## 23. Frontend 테스트

typecheck·lint·build·e2e typecheck·Harness 통과, Student Care Node 92/92.

## 24. Playwright

| 대상 | 결과 |
|---|---|
| Assessment Stub E2E | 1회차 22/23 → **23/23**. 실패 1건은 HWP 원문 기본 탭이 바뀐 데 따른 시험 갱신과, 근거와 함께 열 때 첫 탭 결함(수정 `dc7e9fe`) |
| Railway 합성 | 1회차 3/4(첫 분석 요청 Railway `CONNECTION_FAILED` ×3, 이후 요청 정상) → 재실행 **4/4** |
| 화면 확인 스크립트(1366·1600·1920) | 대학별 PDF(관리자·학생), HWP 변환 미리보기, 목록·삭제, 학생 달력. 가로 스크롤 0 |
| Student Care 인수 Playwright | 로컬 미실행 → GitHub CI E2E Job |

## 25. Railway

A24 설정 그대로다(토큰은 YAML만, 덮어쓰기 무시 로그 확인). 합성 문서 7종 분석 201, B16 프로필. 미리보기 변환은 Railway와 무관한 로컬 기능이다.

## 26. 기존 시연 DB

`lh_demo_manual_20261111`에는 접근하지 않았다. 사용한 DB는 일회용 tmpfs(`lh_a25`, 33471)와 Testcontainers뿐이며 작업 후 삭제했다.

관찰: 사용자의 `lh-local-run-mysql`(오늘 07:24 KST 생성, 가이드 실행용)이 실행 중이다. 건드리지 않았다. 다음에 통합 Backend를 실행하면 이 DB에 새 Migration `V202611170100`이 적용된다(기존 시연 DB 아님).

## 27. 실행 가이드 변경

`assessment-studentcare-local-run-guide.md`:
- §4: `ASSESSMENT_PREVIEW_CONVERTER=docker`.
- §4-1 변환기: 설치 프로그램, 확인 명령, 이미지 빌드, 없을 때·실패할 때의 화면, 캐시 위치, Linux·Docker 배포 주의.
- §7·§8: `ASSESSMENT_UNIVERSITY_EXAM_ROOT`.
- §9-5: A25 확인 절차.

포트(33307·8080·5174·5173)와 실행 명령은 유지했다.

## 28. Git Commit

| Commit | 내용 |
|---|---|
| `3183325` | 평가계획서 논리 삭제 + PDF AI 진입점 제거 + 계약 §38-9 |
| `696173f` | 대학별 자료 PDF 폴더 설정·구분 안내 |
| `0f460c7` | 과목명·파일 선택 카드·상태 색 |
| `06e68c3` | HWP/HWPX 변환 미리보기(Backend·Docker·Frontend·계약 §38-10) |
| `9bf5992` | 달력 다듬기 |
| `4b62f6e` | 실행 가이드·디자인 원칙 |
| `dc7e9fe` | 근거 위치와 함께 열 때 구조 탭 + E2E 갱신 |
| (이 보고서) | A25 보고서 |

## 29. Push · CI

`59c4a2f..d74f975` Fast-forward(Force 없음, Push 직전 원격 일치 확인). 원격 `main` `c03a1a4` 그대로.
**GitHub CI — `d74f975`에서 모두 success**(push·pull_request 2회):
- Harness ×2, Frontend ×2.
- **Backend ×2**: Testcontainers 전체 Integration. 로컬 환경 실패 80건은 재현되지 않았다.
- **E2E (Playwright) ×2**: Student Care X′ 인수 + Admin Shell.
- CI Result ×2.

이 기록을 담은 문서 Commit은 그 뒤에 Push된다(CI 미확인 Commit).

## 30. PR #17

본문 맨 위에 A25 절을 추가했다(PARTIAL 이유 포함). 제목 유지, **Draft 유지**, Merge·Ready 전환 없음.

## 31. 사용자 직접 확인 필요

1. 가이드 §4-1대로 변환기 이미지를 만들고 `ASSESSMENT_PREVIEW_CONVERTER=docker`를 설정한 뒤, 실제 HWP/HWPX 원문의 변환 품질(글꼴·쪽 나눔)이 업무에 충분한지 판단해 주세요.
2. `ASSESSMENT_UNIVERSITY_EXAM_ROOT`를 설정한 뒤 관리자·학생 대학별 자료 PDF가 열리는지 확인해 주세요.
3. 삭제 정책(논리 삭제, 복원 화면 없음, 공개 중 문서는 추가 확인)이 맞는지 확인해 주세요.
4. 달력: 주차 단위 원문은 날짜 칸이 아닌 '이 달·n주' 줄에 둡니다. 학사력 연동이 필요하면 결정해 주세요.
5. 한컴오피스 기반 변환(충실도 높을 수 있음)을 검토할지(라이선스 확인 필요) 결정해 주세요.
6. 이미지 1~11 원본이 이번 작업에 전달되지 않았습니다. 지적한 화면과 실제 수정이 맞는지 확인해 주세요.

## 32. 남은 문제

- 변환기: 실제 문서 약 17% 변환 실패(다운로드로 대체), 글꼴 대체로 쪽 나눔 차이, 기본값은 꺼짐(설정 필요), Linux 컨테이너 권한은 미검증, H2Orestart GPL-3.0(별도 프로세스로만 사용 — 배포 시 고지 검토).
- Daglo 전면 통일은 일부만(나머지 화면은 Token 색만 반영). Before/After 체계 비교 미작성.
- 삭제 '분석 중' 자동 시험 없음. 복원·영구 삭제·보존 기간 미결.
- 달력 날짜 칸 빈약(데이터 정밀도 한계), 수행평가·시험 일정 합류 없음.
- 전체 IT 실행 시 Testcontainers 동시 기동 실패(환경). CI에서 재확인한다.
- A22 상담 첫 글자 유실(완규님), 기존 시연 DB Migration(승인 필요) — 범위 밖, 미변경.
