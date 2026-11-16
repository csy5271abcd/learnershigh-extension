# [계정 A] Assessment 관리자 평가계획서 검토 UI 재설계 — 다글로 레퍼런스 적용 (2026-11-14)

> 기준 HEAD `df70870`. 브랜치 `feature/assessment-student-integration-enhancement`. **Push 없음 · 이력 재작성 없음 · Backend/DB/API 계약 변경 없음 · AdminShell·Student Care 변경 없음.**
> 표기: [직접] 이번에 브라우저·명령으로 확인 · [정적] 코드 확인.

## 1. 다글로 이미지 19개 분석

`references/design/daglo/additional/` 19개를 모두 열어 봤다(18개는 다글로, `090706`은 macOS 달력 앱 — Monthly Planner 참고).

| 이미지 | 화면 | 가져온 원칙 |
|---|---|---|
| 122334·122342 | PDF 분석 모달(업로드 중 12% → 완료 체크) | 큰 Radius 흰 모달, **왼쪽 연회색 파일 작업면 + 오른쪽 안내 카드**, 파일 카드(이름·크기·쪽 수·상태), 하단 우측 `취소`(텍스트) + 파란 CTA(준비 전 회색 비활성) |
| 122402 | 내 PDF 목록 + 삭제 확인 | 큰 제목, 얇은 표 머리, 행 아래 상태 문구(파란 "읽는 중"), 확인 Dialog 2버튼(회색/위험 빨강) |
| 122421·122430 | PDF 열람 + AI 작업 영역 | **원문(넓게, 쪽·확대 툴바) | 작업 영역**으로 화면을 반으로 나누고 각각 스크롤, 상단 얇은 머리글(뒤로·경로·우측 액션) |
| 122507 | 내 자료 추가 모달 | 상단 소스 탭(pill), 회색 작업면 안 흰 파일 카드, 하단 "n개 등록됨" 정보 + CTA |
| 122602·122949·123000·123010·123017 | 슬라이드 생성 → 완료 | Indeterminate 스피너+문장("검색 중이에요"), 생성 중 Skeleton, **단계 목록마다 녹색 ✓ 완료**, 마지막에 "완성됐어요!" 블록과 다음 행동 버튼, 왼쪽 목차 카드 + 오른쪽 결과 카드 |
| 123128 | 설정 모달 | 왼쪽 회색 탐색 + 오른쪽 흰 콘텐츠, 섹션 제목 + 큰 행 카드 + 우측 검정 버튼 |
| 123300 | 홈/새 작업 Popover | 아이콘 Grid, 최근 카드(종류·제목·날짜) |
| 123327·123341·123454 | 퀴즈 생성 중 → 문제 | 왼쪽 Segmented 탭(흰 선택) + 선택 카드 진한 테두리, 가운데 빈/진행 상태 일러스트+2줄 설명, 넓은 선택지 카드, 하단 우측 회색 비활성 CTA |
| 123357·123429 | 문서번역 빈 상태 · 업로드 모달 | 가운데 큰 빈 상태 카드 + 단일 CTA, 모달 오른쪽 "번역 전 안내사항" 카드, 용량 표시(0.52MB/20MB) |
| 090706 | 달력 앱 | 왼쪽 미니 달력·일정 목록, 상단 월 이동, 7열 Grid, 일정 블록 클릭 → 상세 Popover |

공통 원칙: ① 흰 카드 + 연회색 보조면 ② Radius 14~24px, 얇은 회색 선, 그림자 거의 없음 ③ 화면당 파란 CTA 하나(하단 우측) ④ 진행은 숫자 대신 문장+Indeterminate(숫자가 있을 때만 %) ⑤ 단계 완료는 녹색 ✓ ⑥ 긴 내용은 카드·탭·좌우 분할로 나눔 ⑦ 넉넉한 여백과 큰 제목/회색 설명의 위계.

## 2. 기존 화면 문제 → 적용

| 기존 문제 (A3.5 화면: `account-a-a35-a4-20261114/`) | 적용 |
|---|---|
| 본문 최대 1480px, PDF 작음·빈 공간 큼 | 검토 화면은 가용 폭 전체(`plan-review` → full). 원문 카드 52% 기본, **분할선 끌기/←→ 키로 30~70%**, 원문 폭 맞춤 기본, **전체 화면**(Esc 닫기) |
| 오른쪽에 상태·오류·경고·파일 대조·과목 ID·체크박스 표·확정·탭이 길게 이어짐 | **5단계 탐색**(분석 요약 → 과목 확인 → 수행평가 검토 → 월별 운영 계획 → 최종 확정), 단계 완료 ✓, 자유 이동. 하단 고정 작업 막대(검토 n/m 진행 막대 · 이전/다음 · 파란 CTA) |
| 기술 정보 노출(`plan_rev_…`, `SUBJECT_SECTION_NOT_FOUND`, `performanceEvaluation.items[1].weightPercent`, SHA 전체, Adapter 버전) | 관리자 문장으로 변환(예: "일부 과목의 평가정보를 찾지 못했어요", `PARTIAL` → "일부 항목 확인 필요", 반영비율·만점·평가 시기·수행평가명). 원래 값은 **'상세 진단 보기'**에만. 서버 데이터는 그대로 |
| 모든 필드 앞 체크박스 표 | 수행평가 **카드** + 항목 **결정 타일**(미확인/확인 필요/✓ 확인함/수정함/수정 중) — `맞아요`·`수정`·`원문에 없음`·`되돌리기`, 수정 전 값 취소선 |

## 3. 변경한 화면 구성

- **검토 Workspace** (`review/ReviewWorkspace.tsx`): 머리글(뒤로 · 학교·학년도·학년·학기 · 문서명 · 분석 상태 · 확정 상태) / 원문 | 분할선 | 검토 카드(단계 탐색 · 단계 본문 · 하단 작업 막대). 1100px 이하는 **원문/검토 전환**(Segmented).
- 단계: `OverviewStep`(서버 결과에서 센 숫자 5개 · 확인 필요 목록 · 상세 진단) · `SubjectStep`(과목 카드 · 원문 쪽 범위 이동 · 과목 코드 연결) · `PerformanceStep`(과목 rail · 평가 비율 카드 · 수행평가 카드 · 평가 방법/제출물/조건 · 채점기준표 · 근거 쪽 이동) · `TeachingPlanStep`(달력 + 계약 대기) · `ConfirmStep`(체크리스트 · 확정할 값 표 · 남은 일 · 완료 화면).
- **업로드 Dialog** (`EvaluationPlansRoute` `UploadPlanModal` 안쪽만): 왼쪽 회색 파일 영역(끌어다 놓기 · 파일 카드: 형식·크기·상태 · Indeterminate 진행), 오른쪽 학교·학년도·학년·학기·출처 + "등록 안내" 카드, 하단 `취소` + `등록하고 분석`. 등록 뒤 서버 분석이 `검토 필요`/`일부 항목 확인 필요`면 **바로 검토 Workspace 요약으로 이동**.
- Mock 데이터 모드(`VITE_ASSESSMENT_DATA_SOURCE=mock`)는 기존 검토 화면을 그대로 쓴다(시연 Fixture 저장 흐름 보존).

## 4. 디자인 시스템·공통 Component

- 색·글꼴: 기존 `.lh-assessment` `--as-*` Token만(LearnersHigh Blue `--as-color-primary` #216cf8). 새 CSS는 `review/review.module.css` 한 파일(카드 Radius 14~16px, 모달 24px, 작업면 `--as-color-subtle`).
- 재사용: Student `PdfViewer`(쪽·확대·폭 맞춤), `PlanOriginalViewer`(+`bare` 모드·Skeleton·다시 시도), 공용 `Modal`(focus trap·Esc), `RemoteView`, `Toast`, 아이콘. 기존 `PlanReviewConfirmPanel`은 **HWP·HWPX 확정**(구조 위치 대조)에 그대로 재사용.
- 순수 로직: `reviewModel.ts`(용어 변환·요약·확정 조건·PUT 요청 조립), `teachingPlanCalendar.ts`(`placeEntries`).

## 5. 변경 파일

| 파일 | 내용 |
|---|---|
| `admin/.../assessment/review/ReviewWorkspace.tsx` (신규) | Workspace·분할선·단계·작업 막대·확정 실행 |
| `review/OverviewStep.tsx`·`SubjectStep.tsx`·`PerformanceStep.tsx`·`TeachingPlanStep.tsx`·`ConfirmStep.tsx`·`SourcePane.tsx`·`TeachingPlanCalendar.tsx` (신규) | 단계·원문·달력 |
| `review/reviewModel.ts`·`teachingPlanCalendar.ts`·`review.module.css` (신규) | 순수 로직·스타일 |
| `components/PlanOriginalViewer.tsx` | `bare` 모드, 로딩 Skeleton, 오류 시 다시 시도 |
| `api/http/assessmentAdminHttp.ts`·`api/types.ts` | 응답에 이미 있던 Plan 슬롯(`slot`)·항목 순번(`subjectIndex`/`itemIndex`)을 화면 모델로 넘김 — **API 계약 변경 없음** |
| `routes/AssessmentAdminRoute.tsx` | http 모드 `plan-review` → 새 Workspace, 폭 full |
| `routes/EvaluationPlansRoute.tsx` | 업로드 Dialog 화면 재구성, 분석 오류 사유 전달, 성공 시 Workspace 이동, **잘못된 안내 문구 2건 수정**(http 모드에서 "파일은 서버에 저장되지 않아요", 등록 Toast "서버 분석 실행은 아직 없어") |
| `model/adminFormat.ts` | PARTIAL 표기 "일부 항목 확인 필요" |

## 6. PDF Viewer

[직접] 최초 진입 폭 맞춤(1920: 111~129%), 쪽 이동·확대·축소·폭 맞춤·새 탭(기존), 문서 Skeleton, 실패 시 "다시 시도", 전체 화면, 채점기준표·필드 근거 쪽 클릭 → 원문 그 쪽 이동(좁은 화면은 원문 탭으로 전환). 정확한 좌표 강조는 Locator가 쪽 단위라 만들지 않았다. HWP·HWPX는 가짜 미리보기 없이 기존 안내(전체 화면 버튼 비활성).

## 7. 수행평가 검토 UX

과목 rail(수행평가 수·검토 n/m) → 평가 비율 카드 → 수행평가 카드(검토 완료 / 확인 n개 남음) → 항목 타일. 값 없는 후보는 노란 점선 "확인 필요"(0으로 바꾸지 않음, `맞아요` 비활성). `수정` → 값·근거 쪽 입력 → `적용`(숫자 검증) / `원문에 없음` / `취소`. 수정값은 취소선 원래 값과 함께 표시. **화면 안 결정은 서버에 임시 저장되지 않는다**(API 없음) — 작업 막대에 "확정 전까지 서버에 저장되지 않아요" 표시. 채점기준표 수준·배점 단위 확정은 0.3 계약 전이라 확인용(문구 표시).

## 8. PARTIAL UX

머리글·요약에 "일부 항목 확인 필요"(경고 톤), "목록에 없는 과목·항목은 '분석되지 않음'" 안내, 분석기 오류 코드 → 문장(빨간 점), 과목 단계에 "분석되지 않은 과목이 있을 수 있어요". 확정 조건은 그대로: 원문 동일 확인(브라우저 SHA-256) · 과목 코드 · 값 있으면 근거 쪽 · **PARTIAL 확인 체크** · 원문 대조 확인 → 모두 충족 전 `확정하고 학생에게 공개` 비활성 + "확정 전에 남은 일" 목록. 확정 성공 → Toast + 서버 재조회 값으로 **완료 화면**(✓ · 확정값 표), 중복 클릭 방지(ref + aria-busy), 이미 확정된 문서는 추가 확정 없음(정책 미결 안내).

## 9. 업로드·분석 화면

§3. 진행률 숫자는 서버가 주지 않으므로 Indeterminate 막대 + "올리는 중/분석 중" 문장만. 분석 실패 사유를 Toast에 그대로 전달(이전엔 삼킴). **목록 화면 자체(5-1: 검색·필터 표)는 이번에 재설계하지 않았다** — 후속.

## 10. Monthly Planner

`TeachingPlanCalendar`(Admin·Student 공용 설계, 현재 Admin 폴더): 왼쪽 학년도 월 Grid·과목 필터·표시 기준 범례, 월 이동, 월 요약 띠(MONTH_ONLY), 주차 띠(WEEK_ONLY, 학교 주차 그대로), 7열 날짜 Grid(EXACT_DATE), 기간(DATE_RANGE), 날짜 미확인 목록(UNKNOWN). 학년도 1~2월은 연도 확인 전이라 날짜 칸을 그리지 않는다. **데이터 없음**: 0.2 계약에 운영 계획이 없어 빈 달력 + "운영 계획을 기다리고 있어요" 덮개, 확정 조건에서 제외. 합성 Preview·학생 화면 연결·상세 Popover/Drawer 편집은 후속.

## 11. API 연결 유지 [직접]

GET analysis·GET plan·preview·file·POST analysis(업로드 뒤)·PUT review 그대로 사용. Mock·하드코딩 데이터 없음. 분석기 직접 요청 0건(Backend 경유).

## 12~14. 브라우저 검증 [직접, Edge headless]

환경: Volume 없는 일회용 MySQL 컨테이너 + Backend(18083, Flyway 9개) + 시험용 Stub 분석기(테스트 Fixture, PARTIAL Envelope) + Admin dev(5184, http 모드). 검증 뒤 모두 종료·컨테이너 삭제. 시연 DB·Volume·Storage 접근 없음.

| # | 화면 (`account-a-ui-redesign-20261114/`, Commit 안 함) | 결과 |
|---|---|---|
| 1·2 | `ui-01-initial` · `ui-02-pdf-loaded-partial` | PDF 렌더링, 요약 숫자(과목 1·수행평가 2·확인 13·못 읽음 2), 오류 문장 |
| 3·4 | `ui-03-subjects` · `ui-04-performance` | 과목 코드 입력, 카드·타일 |
| 5·6 | `ui-05-editing` · `ui-06-edited` | 60→55 수정(취소선), 수행평가명 ✓ |
| 8 | `ui-07-teaching-plan` | 계약 대기 달력(2026년 9월) |
| 7 | `ui-08-confirm-ready` · `ui-09-confirmed` | 확인 전 비활성 → PARTIAL 확인 전 비활성 → 활성 → 확정 → 새로고침 뒤 서버 값 `subj_02 수행평가 반영비율 55% 1쪽 / 수행평가명 탐구 보고서 1쪽` |
| 업로드 | `ui-10`~`ui-13` | 목록 → Dialog(빈/선택) → 등록·서버 분석 → Workspace 요약(일부 항목 확인 필요) |
| 9 반응형 | `ui-r-1440x900` · `1366x768` · `1024x768`(원문/검토 전환) · `390x844` | 가로 넘침 0px 전부, 1920은 위 화면 |
| 콘솔 | 전 시나리오 | 오류 0 |

검증하지 못한 것: 300쪽 이상 실제 문서(합성 2쪽만 — 렌더링은 기존 PdfViewer가 현재 쪽만 그림), 긴 학교·과목명 실데이터(ellipsis·keep-all 적용만), 에러 상태 화면 캡처(코드 경로만: `RemoteView` 오류·원문 다시 시도·확정 실패 알림), 다크 모드.

## 15. 시험

| 항목 | 결과 |
|---|---|
| Frontend `typecheck` / `lint` / `build` (전체 workspace) | exit 0 / 0 / 0 |
| 브라우저 시나리오 | §12 PASS |
| Backend | 이번 변경 없음 → 재실행 안 함(직전 Unit 282·Integration 159 / 실패 0, `df70870`) |
| Student Care E2E | AdminShell·공통 CSS·Student Care 변경 없음 → 이번에 재실행 안 함(기준선 11-13 7/7) |

## 16. Student Care 보호

변경 파일은 모두 `frontend/admin/src/features/assessment/**`. `app/`(AdminShell)·`features/student-care/`·`frontend/shared/`·`e2e/`·Backend·DB 변경 **0건** [직접 `git diff --name-only`]. Student 쪽 공용 Component(Modal·PdfViewer·Toast)는 수정하지 않고 재사용만.

## 17. Git

이번 Commit Hash는 최종 응답에 기록(Frontend 1 + 보고서 1). 미커밋 유지: C8 문서·`api-contract.md`, `backend/bin/`, `references/**`, 증거 화면 폴더. Push 없음(미Push 이력의 로컬 경로 문제는 그대로 Push 전 처리 필요).

## 18. 미완료·후속

1. 평가계획서 **목록 화면** 재설계(검색·필터·표, 분석/검토/공유 상태 열) — 전체 학교 원천 API 필요.
2. 화면 안 검토 결정의 **서버 임시 저장**(review-draft 계약·Table 결정 필요) — 지금은 새로고침하면 확정 전 결정이 사라진다.
3. 채점기준표 수준·배점 확정, 운영 계획 확정 — 계정 B 0.3 계약 후.
4. Monthly Planner: 상세 Popover/Drawer, 합성 Preview(개발 전용), Student 화면 연결, `frontend/shared` 이동 검토.
5. 과목 코드 직접 입력 → 슬롯 과목 선택 목록 API.
6. 300쪽+ 문서·긴 이름·오류 상태·다크 모드 시각 검증, Student Care E2E 회귀(병합 전 1회).
7. HWP/HWPX Viewer(변환 엔진 승인 대기).
