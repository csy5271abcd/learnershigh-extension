# [계정 A] A27-UX — Assessment 관리자·학생 UI/UX 재설계 결과 보고 (중간본)

- 작성: 2026-11-18 · 작업 Worktree `C:\learnershigh-assessment-integration` · 브랜치 `integration/assessment-studentcare-20261116`
- **상태: 중간 보고.** Docker Desktop 엔진 장애(`500 Internal Server Error`)로 Backend 통합 테스트 일부·Playwright E2E·브라우저 해상도 확인을 실행하지 못했다. 사용자 지시(2026-11-18)에 따라 지금 결과로 먼저 작성하고, Docker 회복 후 §49~§53·§60을 갱신한다.
- 판정 기준: **PASS** = 구현 + 데이터 연결 + 테스트 + 브라우저 확인 / **PARTIAL** = 구현했지만 저장·권한·연결·테스트·브라우저 확인 중 남은 것이 있음 / **FAIL** = 미구현 또는 회귀. 이번에는 브라우저 확인을 하지 못해 **화면 항목은 모두 PASS로 올리지 않았다.**
- Commit·Push·PR 갱신·Merge: **하지 않음.** 모든 변경은 로컬 미커밋.

---

## 1. 시작 Git 상태

- HEAD `9755581` (A26 push 기록, CI green `fde4085`). 작업 시작 시 미커밋 파일은 A27 HWP 수정 6개뿐이었다.
- 원본 폴더 `C:\learnershigh-extension`: 시작 시 `git status --porcelain` 68건을 `$TEMP/a27ux-status-before.txt`에 저장했다. 작업 후 다시 비교했고 **동일(68건)** 이다. 원본 폴더는 수정·Stage하지 않았다.

## 2. 기존 HWP 미커밋 수정 사항 (A27, 보존)

| 파일 | 상태 |
|---|---|
| `backend/.../integration/preview/PlanPreviewConverter.java` | M (보존) |
| `backend/.../integration/preview/ProcessPlanPreviewConverter.java` | M (보존) |
| `backend/.../service/plan/PlanPreviewRenditionService.java` | M (보존) |
| `backend/src/main/resources/assessment/preview-converter/Dockerfile` | M (보존, `libreoffice-math-nogui`) |
| `backend/.../integration/preview/ConversionDiagnostics.java` | ?? (보존) |
| `backend/src/test/.../preview/ConversionDiagnosticsTest.java` | ?? (보존) |

시작 전 scratchpad `a27ux/`에 Patch·사본을 백업했다. 이번 작업에서 이 6개 파일은 수정하지 않았다. 변환기 추가 안정화 작업도 하지 않았다.

## 3. 이미지 1~20 검토

20개 이미지(`C:\learnershigh-A27-local-references\A27-reference`)를 직접 열어 확인했다. 이 참고 폴더는 Git에 추가하지 않았다.

| 이미지 | 확인 내용 | 반영 |
|---|---|---|
| 01·03 | 탭 6개 + 탭 옆 개발 문구 | 탭 8개 재편, 개발 문구 제거 |
| 02 | Toss식 KPI·Calendar | 전체 현황 재구성 |
| 04·05 | 6칸 참고 / 기존 목록 | 평가계획서 6칸, 기존 목록은 분석 탭으로 전환 |
| 06~09 | 검토 Wizard·왼쪽 굵은 테두리·근거 파란 링크·운영계획 칩 | 테두리 제거, 회색 링크, 과목→수행평가 계층 |
| 10~13 | 긴 확정 화면·과목 ID 입력·Daglo 퀴즈 | 4단계 확정, 과목명 검색 선택 |
| 14 | 관련 심화 Task | 제거 |
| 15·16 | 학생 AI 입력창·개발 문구 | 제거, Dashboard 재구성 |
| 17 | 오른쪽 패널·주제명 추천·정보 출처·담당 선생님 | 제거·이동 |
| 18 | "파일 첨부는 준비 중" | 실제 업로드 구현 |
| 19·20 | 파란 면적 과다 | 주요 동작 외 무채색 |

## 4. Daglo 디자인 분석 / 5. Toss Payments 참고

- **Daglo** (A25에서 분석한 `references/design/daglo` 기준)
  - 무채색 카드, 얇은 전체 테두리, 둥근 Pill 버튼을 쓴다.
  - 한 화면에 질문 하나와 진행 막대를 두는 단계형 구성이다. 최종 확정 4단계에 적용했다.
- **Toss Payments** (이미지 2)
  - 큰 숫자 KPI 카드 4개, 넓은 여백, 흰 카드 안에 Calendar를 배치한다. 관리자 전체 현황과 학생 Home 카드에 적용했다.
  - 결제·정산 데이터나 문구는 쓰지 않았다.
- **색상 원칙**
  - 파란색은 주요 동작과 선택 상태로 제한했다.
  - 일반 버튼은 흰 바탕, 차콜 글자, 얇은 테두리로 바꿨다.

---

## 6~10. 관리자 정보 구조·Dashboard

| # | 항목 | 구현 | 판정 |
|---|---|---|---|
| 6 | 탭 8개 (전체 현황·학생 Assessment·피드백 관리·평가계획서·분석·월별 운영계획·심화 콘텐츠·관리자 참고자료실) | `routes/paths.ts`·`AssessmentAdminRoute.tsx`. 새 주소: `/assessment/analysis`, `/assessment/analysis/{planId}/revisions/{revisionId}/result`, `/assessment/monthly-plan`. 예전 검토 주소(`/evaluation-plans/{id}/revisions/{rev}`)는 그대로 열린다. URL Query로 Filter를 유지한다. | PARTIAL (Typecheck·Build만, 브라우저·E2E 미실행) |
| 7 | 전체 현황 Dashboard | `OverviewRoute.tsx` 재작성. KPI 4개(평가계획서 문서·학교 / 분석·검토 대기·확정·실패 / 학생 수행평가·담당 학생·심화 / 피드백 대기). 모두 기존 `GET /overview` 값이며 화면용 Counter는 만들지 않았다. | PARTIAL |
| 8 | 학교별 Calendar | 같은 학교·학년도·학년·학기 Context(URL `school·year·grade·semester`)로 확정 운영계획만 보여 준다. A26 `MonthlyPlanner`(주차 잠정 배치·하루 4/3개·`+N개`·상세 Modal)를 그대로 쓴다. 다른 학교·학년 문서는 목록 단계에서 거른다(`model/confirmedTeachingPlan.ts`). | PARTIAL |
| 9 | 담당 학생 현황 | 기존 `StudentSummaryTable`을 같은 학교·학년 Filter로 보여 준다. | PARTIAL |
| 10 | 최근 Assessment 활동 | 기존 `recentActivity`. 평가계획서 활동은 결과 조회·분석 목록으로, 피드백 활동은 피드백 관리로 이동한다. | PARTIAL |

## 11~15. 평가계획서와 분석 분리

| # | 항목 | 구현 | 판정 |
|---|---|---|---|
| 11 | 6칸 | `PlanSlotsRoute.tsx`. 학교·학년도 Filter, 고1~3 × 1·2학기 고정 6칸. 한 칸에 문서 여러 개를 둘 수 있고, 빈 칸은 "원본 미등록"으로 표시한다. | PARTIAL |
| 12 | 원본 문서 관리 | 각 문서에 형식·크기·등록일·개정 횟수·출처(직접 등록/출처 링크)·업무 상태를 보여 준다. 등록, 개정본 등록, 논리 삭제(A25 정책 그대로), 원본 내려받기를 지원한다. **미흡:** 칸 안 "원본 열기(미리보기)" 버튼이 없고(분석·결과 화면에서는 열림), 개정 이력은 횟수만 보인다. | PARTIAL |
| 13 | 분석 탭 분리 | 기존 목록(`EvaluationPlansRoute.tsx`)을 분석 업무 화면으로 바꿨다. 상태 Filter(분석 전·AI 결과·검토 중·확정·실패)를 추가했다. 행 동작은 상태에 따라 분석 시작 / 검토 시작·이어하기 / AI·검토·확정 결과 보기 / 원문이다. | PARTIAL |
| 14 | 문서 선택 흐름 | 6칸의 "분석하기"가 `plan=<planId>`와 학교·학년도·학년·학기를 분석 탭으로 넘기고, 그 행을 강조한다. 이미 분석된 문서에는 "분석 시작"이 보이지 않는다(분석기 중복 호출 방지). 탭 이동만으로 분석을 시작하지 않는다. | PARTIAL |
| 15 | 상태별 조회 | View Model `model/planStatus.ts`: 서버 `analysisStatus`·`reviewStatus`와 공유 초안 결정 수(`review-draft`)로 상태를 정한다. **제약:** 서버에 '검토 완료·미확정'을 판정할 기준(검토 대상 총수)이 없어 '검토 중'과 구분하지 못한다. 서버에서 '확정' = 학생 공개이므로 '확정·비공개' 상태는 만들지 않았다. | PARTIAL |

## 16~22. 검토 UI·최종 확정

| # | 항목 | 구현 | 판정 |
|---|---|---|---|
| 16 | 검토 2패널 유지 | 레이아웃은 바꾸지 않았다. "최종 확정" 이동 버튼과 확정 버튼을 무채색으로 바꿨다. | PARTIAL |
| 17 | 과목 확인 | 학년 불일치 안내(`.blockedNote`)를 왼쪽 굵은 선 대신 얇은 전체 테두리로 바꿨다. 학년 불일치 검증은 그대로 둔다. | PARTIAL |
| 18 | 수행평가 검토 계층 | `PerformanceStep.tsx`: 과목 버튼을 누르면 그 과목의 수행평가만 펼친다. 상세 상단에 "과목 › 수행평가" 경로를 표시한다. 기존 필드·자동 저장은 그대로다. | PARTIAL |
| 19 | 원문 근거 회색 | `review.module.css` `.page`·`.link`를 파란색에서 회색·차콜 + 밑줄로 바꿨다. 이동 기능은 그대로다. | PARTIAL |
| 20 | 월별 운영계획 | 칩 왼쪽 3px 선을 제거했다. "이 학기 달 밖의 계획"을 "Outside This Term"으로 바꿨다(분류 기준 동일). | PARTIAL |
| 21 | 최종 확정 4단계 | `ConfirmStep.tsx`(PDF): ① 원본 대조(브라우저 SHA, 재업로드 없음) → ② 과목 연결(검색 선택, 학년 불일치 차단 표시) → ③ 검토 결과 확인(확정·미확인·근거 없음 수와 표, 부분 분석 확인) → ④ 요약 + 대조 확인 + 확정. 진행 막대·이전/다음이 있고, 단계를 오가도 입력값은 Workspace 상태·서버 초안에 남는다. 확정에 성공하면 결과 조회 화면으로 이동한다. 확정 조건(`blockersOf`)과 서버 검증은 바꾸지 않았다. HWP·HWPX는 기존 구조 위치 대조 패널을 그대로 쓴다. | PARTIAL |
| 22 | 과목 ID 직접 입력 제거 | `components/SubjectSearchSelect.tsx`(Combobox, 과목명 검색, ID는 값으로만 사용). 과목 확인 단계·HWP 확정 패널·확정 2단계에 적용했다. 목록을 받지 못하면 ID 입력으로 바꾸지 않고 "불러오지 못함·다시 불러오기"를 보여 준다. 확정 요약 표의 `과목 코드`(subjectId 노출)를 과목명으로 바꿨다. | PARTIAL |

## 23~30. 분석·검토 완료 결과 조회

`routes/PlanResultRoute.tsx` — 독립 Route `/assessment/analysis/{planId}/revisions/{revisionId}/result`. 검토 Wizard와 별도이고, 읽기 API만 호출한다(§38 단건 GET, §39 analysis·review-draft·teaching-plan-review, §39-8 reviews, §39-10 teaching-plan-reviews). Railway 분석기와 자동 저장 API는 호출하지 않는다.

| # | 항목 | 구현 | 판정 |
|---|---|---|---|
| 23 | 분석·검토 결과 조회 | 머리글에 학년도·학년·학기·형식·개정·등록일·상태 문구를 표시한다(AI 결과 · 검토 전 / 검토 중 / 확정 완료 · 학생 공개). 확정 전이면 "검토하기" CTA가 보인다. 값마다 상태를 구분한다(관리자 확정 / 원문에 없음 / 분석 후보). **미흡:** 검토 중 초안의 관리자 수정값·검토 진행률은 결과 화면에 보이지 않는다(검토 화면에서만 보임). | PARTIAL |
| 24 | 확정 결과 읽기 전용 | 저장 가능한 입력·체크박스가 없다. 재검토는 기존 Revision 재검토 흐름(검토 화면)으로만 간다. | PARTIAL |
| 25·26 | 과목별·수행평가 상세 | A9 `DocumentDetail`을 재사용했다. 과목 칩 → 수행평가 목록 → 채점기준·반영비율·제출물 순서다. | PARTIAL |
| 27 | 확정 운영계획 Calendar | 결과 화면 "월별 운영계획" 탭(A9 Timeline + 확정 행). 전체 현황·월별 운영계획 탭의 Calendar는 확정 행만 쓴다. | PARTIAL |
| 28 | 원문 대조 | 근거 위치를 누르면 원문 Viewer Modal이 열린다(PDF 쪽 / HWP 구조 위치, 쪽수로 바꾸지 않음). **미흡:** 요구된 **왼쪽 원문 고정 2패널이 아니라 Modal**이다. | PARTIAL |
| 29 | 검토·확정 이력 | "확정 이력" 탭에 평가 정보 n차 확정(시각·확정값 수·학생 공개 중)과 운영계획 n차 확정(공개·제외 행 수)을 표시한다. **미구현:** AI 최초 후보 ↔ 관리자 수정값 ↔ 확정값 비교(9.8). | PARTIAL |
| 30 | 학생 공개 상태 | 현재 도메인에서 확정 = 학생 공개(§10-1)이므로 "학생 공개 중"과 확정 시각을 공개 시각으로 표시한다. | PARTIAL |

권한: 결과 화면은 관리자 기존 API의 권한 검사를 그대로 탄다. 다른 학교·지점 직접 URL 접근 차단은 기존 IT(EvaluationPlan·Archive)가 다루지만, **결과 화면 E2E는 미실행**이다.

## 31. 관리자 참고자료실

자료 저장 Modal에서 "관련 심화 Task" 입력을 제거했다. 서버 필드는 선택값이라 계약은 바꾸지 않았고, 기존 연결값은 요청에 그대로 보존한다. Modal 디자인 재정비는 하지 않았다. → PARTIAL

## 32~41. 학생

| # | 항목 | 구현 | 판정 |
|---|---|---|---|
| 32 | AI 도우미·주제 추천 제거 | Home AI 입력창·"AI 도우미" 바로가기, 상세 "주제명 추천받기", 꿀팁의 주제 추천 동작, 자료 상세 "AI 요약"을 제거했다. `DetailPanel.tsx`·`TopicSuggestionModal.tsx`는 삭제했다. 관리자 분석은 그대로다. | PARTIAL (브라우저 미확인) |
| 33 | 학생 Dashboard | Home에 공식 원본 3개년 카드 + 월별 운영계획 Calendar(확정분만) + 다가오는 수행평가(평가일·제출 마감 구분, 날짜 미정은 임박 계산 제외) + 최근 기록을 둔다. | PARTIAL |
| 34 | 3개년 원본 | `OfficialPlansCard.tsx`: 현재 학년도부터 3개년 슬롯을 둔다. 학적 기록이 없는 해는 "학적 기록 없음"으로 표시한다(다른 학년 추측 금지). 공급자 미연결이라 "공식 공개 원본 확인되지 않음"으로 표시한다. | PARTIAL |
| 35 | 원본 열람·분석 공개 분리 | 새 API `GET /api/student/assessment/evaluation-plans/official`(§10-1-3 DRAFT)은 관리자 등록 문서·분석 결과와 분리되어 있고, 학생 학적 Context로만 슬롯을 정한다. 분석 결과는 기존대로 확정분만 공개한다. | PARTIAL (Backend 컴파일·단위 OK, 전용 IT 미작성) |
| 36 | 학교알리미 연동 준비 | `integration/officialplan/OfficialPlanSourceProvider`·`OfficialPlanLookup`(공급자·원본 ID·출처 URL·SHA-256·공개·검증 시각·최신 여부) 경계와 `UnconnectedOfficialPlanSourceProvider`. 수집 기능은 구현하지 않았다. | PARTIAL |
| 37 | 개인 수행평가 CRUD | 등록·조회·수정·삭제(기존 휴지통)·상태 변경. 새 필드 저장은 IT로 확인했다(`개인_관리_정보를_등록_수정하고_범위를_검사한다_A27`, 다른 학생 404). | PARTIAL (브라우저 미확인) |
| 38 | 상태 되돌리기 | 사용자 결정에 따라 §13 역전이를 허용하고 이력 테이블을 남긴다. IT로 확인했다(`상태를_앞으로_바꾸고_되돌리면_이력이_남는다_A27`). 학생 화면 선택지 제한도 해제했다. | PARTIAL |
| 39 | 입력 항목 확장 | `PersonalDetailsFields.tsx`(추가·수정 Modal 공용): 평가 유형·평가일·제출 마감·반영 비율(0~100, 빈 값 = 모름)·제출물·수행 내용·진행 상태(추가 시)·개인 메모. 미저장 닫기 확인이 있다. | PARTIAL |
| 40 | 오른쪽 패널 제거 | 본문 한 열(최대 820px)로 바꿨다. 평가 기준은 본문 접이식 Section, 피드백은 상단 버튼 Modal(요청·이력 유지)로 옮겼다. "정보 출처"·"담당 선생님"을 제거했다(서버 데이터는 보존). | PARTIAL |
| 41 | 자료 찾기 Modal | "선생님께 피드백 요청" 옆 버튼으로 기존 `ResourcesTab`(과목별 추천 자료원·노트에 출처 카드 넣기)을 Modal로 연다. **미흡:** 자료 유형 Filter·연결 해제는 기존 탭 기능 범위다. | PARTIAL |

## 42~45. 탐구노트·자료함·참고자료

| # | 항목 | 구현 | 판정 |
|---|---|---|---|
| 42 | 블록 편집 | 기존 편집기를 유지한다(블록·`/` 메뉴·Enter/Backspace·Alt+↑↓ 순서 이동·IME 보호). 추가한 것: Markdown 단축 입력(`#`·`##`·`###`·`-`·`*`·`1.`·`[]`·`>`·`---`, 조합 중 제외, `noteMarkdownShortcuts.ts`)과 편집기 단위 되돌리기·다시 하기(Ctrl/⌘+Z, Ctrl+Shift+Z·Ctrl+Y, 버튼, `noteHistory.ts`). **미구현:** 굵게·기울임·밑줄·인라인 링크. 저장 형식(블록 `text`) 변경이 필요한 Open Decision(Editor 결정)이라 하지 않았다. 새 Editor 패키지(Tiptap 등)도 설치하지 않았다. | PARTIAL |
| 43 | 자동 저장 | 기존 동작(입력 멈춤 1.5초, 저장 상태 표시, 충돌·실패 처리, 이동 전 확인)을 유지한다. 저장 형식 변경은 없다. | PARTIAL (이번 변경 후 브라우저 미확인) |
| 44 | 자료함 파일 업로드 | Backend: `POST/DELETE/GET .../resources/{id}/file`, `GET .../file/preview`(§22-1 DRAFT). 확장자 + 서명 이중 검사(XLS·WEBP 추가, WEBP는 RIFF+WEBP 확인), 빈 파일 400, 크기 한도, 안전 파일명, 본인 전용 404, SHA 재확인, 원본 바이트 보존(GIF). Frontend: 자료 추가 Modal에 파일·Drag&Drop·형식/크기 사전 검사·업로드 상태·실패 시 파일만 다시 올리기. 자료 상세에서 내려받기·바로 보기(PDF·이미지만)·바꾸기·빼기. IT `ResourceFileApiTest` 3건 통과. | PARTIAL (브라우저·E2E 미실행) |
| 45 | 학생 참고자료 UI | `referenceLinks.module.css`: 파란색은 첫 화면 주요 동작(`.heroButton`)만 남기고 나머지는 차콜·회색으로 바꿨다. 기능은 바꾸지 않았다. | PARTIAL |

## 46. 개발용 문구 제거

- http 모드의 `개발 서버 · 실제 Backend 저장 · {계정} · 개발용 Mock` 안내(관리자 탭 옆, 학생 Home·상세)가 더 이상 보이지 않는다.
- 시연 계정 전환 패널은 `?devPanel=1` 또는 `VITE_ASSESSMENT_DEV_PANEL=1`일 때만 보인다. `?devStudent=`/`?devAdmin=` 링크는 그대로 동작한다.
- "개발 설정 학교" 표시와 "개발 환경:" 업로드 안내, HWP 패널 "개발용 Mock 관리자 기록" 문구를 바꿨다.
- **남은 것:** Mock 데이터 모드 전용 "시연 데이터" 문구, 대학 원문 PDF 화면의 "개발 환경에서만 열려요" 이용 허락 안내. 전체 화면 전수 확인은 브라우저 미실행으로 하지 못했다.

→ PARTIAL

**왼쪽 굵은 테두리:** 제거한 것은 `.blockedNote`, 운영계획 `.band .chip`, 학생 `context.sourceQuote blockquote`, `pdfImport .sourceText`다. 노트 인용 블록(`.quote`·`.readQuote`·관리자 `.noteQuote`)은 인용문 의미 표시라 남겼다(3px 회색). 관리자 `structure.controlText`(2px)도 남아 있다. 디자인 회귀 테스트는 추가하지 않았다. → PARTIAL

## 47·48. 기존 기능 보존

- Student Care 제품 코드는 바꾸지 않았다(Student Care·상담·학부모 리포트 파일 변경 0건).
- Assessment 기존 기능(분석·변환·원본 대조·논리 삭제·확정·학생 공개·대학 PDF·모의고사 지문)의 코드 경로는 유지했다.
- 단, 이번 실행에서 **Student Care IT 10개 Class가 Docker 장애로 실패**해 회귀 여부를 아직 확인하지 못했다(§49).

---

## 49. Backend 테스트

| 실행 | 결과 |
|---|---|
| `gradlew test` (Unit + ArchUnit) | **402 tests, 0 failed** |
| 관련 IT 선택 실행 (Docker 정상 시점): `SchoolAssessmentApiTest`, `EvaluationPlan*`, `ResourceFileApiTest`, `StudentRecordExtrasApiTest`, `AssessmentUxCompletionApiTest` | **모두 통과** |
| 전체 `gradlew integrationTest` (Docker 장애 중) | 214 tests, **81 failed — 전부 환경 실패.** 실패 10개 Class(Student Care 8·E2E 지원 2·Migration 1 등)는 모두 Context 로딩 단계에서 `Container startup failed for image mysql:8.4`(Docker `Status 500`) 또는 `Communications link failure / Read timed out`로 실패했다. **Docker 회복 후 재실행 필요** |

수정한 기존 테스트: `SchoolAssessmentTest` 역전이 409 → 되돌리기 허용·이전 상태 반환, `SchoolAssessmentApiTest` 역전이 409 → 이력 기록 확인. 이유는 §13 정책을 사용자 결정으로 바꿨기 때문이다(테스트를 약화한 것이 아니라 정책 변경을 반영).

## 50. Frontend 테스트

| 실행 | 결과 |
|---|---|
| admin `npm run typecheck` / `npm run lint`(oxlint --deny-warnings) / `npm run build` | 통과 / 통과 / exit 0 |
| student `typecheck` / `lint` / `build` | 통과 / 통과 / exit 0 |
| `node --test` (teachingPlanPlacement + noteMarkdownShortcuts + noteHistory) | **14/14 통과** |

## 51. Playwright E2E — **미실행**

- 새 시나리오 `e2e/assessment/tests/a27-ux.spec.ts` (아직 실행하지 않음):
  - 탭 8개 순서·개발 문구 없음
  - 6칸 → 분석하기 → 분석 탭 선택 → AI 결과 → 확정 후 읽기 전용·이력·새로고침
  - 학생 AI 없음·3개년 슬롯·개인 수행평가 상세 입력·되돌리기·자료 찾기·피드백 Modal
  - 자료 GIF 첨부·새로고침·내려받기·빼기
  - 해상도 3종 가로 넘침 검사와 캡처
- 기존 시나리오 수정: `a12`·`a15`·`evaluation-flow`·`analysis-failure`·`railway-synthetic`·`a18-grades`·`b16-ext`. 4단계 확정과 과목 Combobox 공용 Helper `e2e/assessment/reviewUi.ts`를 쓰고, 분석 목록 주소를 `/assessment/analysis`로 바꿨다.
- Student Care Node·Playwright, Railway 합성 E2E: 미실행.

## 52·53. Before/After 스크린샷 · 해상도별 확인 — **미실행**

1366×768·1600×900·1920×1080 확인과 캡처는 위 E2E에 포함되어 있으나 실행하지 못했다. 브라우저에서 확인하지 않은 화면은 검증 완료로 보고하지 않는다.

## 54·55. DB Migration · 기존 DB

| 새 Migration | 내용 |
|---|---|
| `V202611170200__assessment_school_assessment_personal_details.sql` | `assessment_school_assessment`에 `assessment_type`·`evaluation_date`·`weight_percent`(0~100 CHECK)·`submissions`·`personal_memo` 추가. 상태 이력 테이블 `assessment_school_assessment_status_event` 추가(감사 기록이라 FK 없음, 색인만) |
| `V202611170300__assessment_resource_file_attachment.sql` | `assessment_resource`에 파일 첨부 열 6개 + 일관성 CHECK |

- 기존 Migration은 변경하지 않았다. 두 Migration은 Testcontainers 일회용 DB에서만 적용·검증했다. 첫 시도의 FK 문자셋 불일치를 고쳤다.
- 사용자 DB `lh-local-run-mysql`(33307)·시연 DB에는 적용하지 않았고 접근하지 않았다. **사용자 환경 Backend를 다시 띄우면 Flyway가 이 두 Migration을 적용한다.**

## 56. 변경 파일 (A27-UX, 111건 중 A27 HWP 6건 제외)

- **Backend**
  - 새 파일: `integration/officialplan/*`(3), `dto/plan/StudentOfficialPlanResponse`, `entity/SchoolAssessmentType`, `entity/SchoolAssessmentStatusEvent`, `repository/SchoolAssessmentStatusEventRepository`, `service/plan/OfficialPlanQueryService`, `service/record/ResourceFileService`, 테스트 `ResourceFileApiTest`
  - 수정: `StudentEvaluationPlanController`, `StudentRecordController`, `ResourceDtos`, `Create/UpdateSchoolAssessmentRequest`, `SchoolAssessmentResponse`, `AssessmentResource`, `SchoolAssessment`, `SchoolAssessmentStatus`, `ArtifactFileTypes`, `ResourceService`, `SchoolAssessmentMapper`, `SchoolAssessmentService`, 테스트 2
- **DB:** Migration 2
- **Docs:** `docs/api/api-contract.md`(§13 갱신 + "A27-UX DRAFT 추가 계약"), 이 보고서
- **Admin**
  - 새 파일: `PlanSlotsRoute`, `PlanResultRoute`, `MonthlyPlanTabRoute`, `SchoolYearFilters`, `SubjectSearchSelect`, `planSchoolContext`, `planStatus`, `confirmedTeachingPlan`, CSS 3
  - 수정: `paths`, `AssessmentAdminRoute`, `OverviewRoute`, `EvaluationPlansRoute`, `PlanArchiveRoute`, `ReferenceLibraryRoute`, `AdminParts`, `PlanReviewConfirmPanel`, `ConfirmStep`, `PerformanceStep`, `ReviewWorkspace`, `SubjectStep`, `review.module.css`, `archive.module.css`, API 2
- **Student**
  - 새 파일: `PersonalDetailsFields`, `home/OfficialPlansCard`, `home/HomeCalendar`, `home/dashboard.module.css`, `resources/ResourceFileRow`, `model/personalDetails`, `model/noteMarkdownShortcuts`(+test), `model/noteHistory`(+test)
  - 삭제: `detail/DetailPanel.tsx`, `detail/TopicSuggestionModal.tsx`
  - 수정: Home·상세·자료 상세·꿀팁·Layout Route, 추가/수정 Modal, `StatusSelect`, `DetailTopBar`, `MockDataNotice`, 노트 편집기 2, `AddResourceModal`, `MonthlyPlanner`, API 4·types, model 3, CSS 다수, `dev/devContext`
- **E2E:** `reviewUi.ts`·`a27-ux.spec.ts` 새 파일, 기존 7개 수정

전체 목록은 `git status --porcelain`으로 확인한다(`backend/bin/`은 이전부터 있던 빌드 산출물로 제외).

## 57. Git

Commit·Push·PR 갱신·Merge·Draft 해제를 하지 않았다. HEAD `9755581` 그대로이고 모든 변경은 미커밋이다. A27 HWP 6개 파일은 보존했다.

## 58. 남은 문제

1. **Docker Desktop 엔진 장애**: 전체 IT 재실행, E2E·해상도 확인·캡처 모두 대기 중이다.
2. 결과 조회 화면이 원문 고정 2패널이 아니라 Modal이다. AI 후보 ↔ 수정값 ↔ 확정값 비교가 없고, 검토 중 초안 값과 진행률이 결과 화면에 없다.
3. '검토 완료·미확정' 상태를 판정할 서버 값이 없다(검토 대상 총수 계약 필요).
4. 6칸 안 원본 미리보기 버튼이 없고, 개정 이력은 횟수만 보인다.
5. 탐구노트 인라인 서식(굵게·기울임·밑줄·링크)이 미구현이다(저장 형식 Open Decision).
6. 학생 '다가오는 수행평가'는 학생이 등록한 수행평가만 보인다(관리자 공개 수행평가를 따로 합치는 모델이 없음).
7. 자료 찾기 Modal의 유형 Filter·연결 해제가 없다(기존 탭 범위).
8. 관리자 참고자료 Modal 디자인 재정비와 왼쪽 테두리 디자인 회귀 테스트가 없다.
9. `docs/specs/suyeon/domain.md`에 §12 개인 관리 필드·상태 이력·자료 파일·공식 원본 경계를 아직 반영하지 않았다(api-contract만 갱신).
10. 학생 화면 다른 CSS(목록·상세·학업 정보 등)의 파란색 축소는 하지 않았다.

## 59. 사용자 직접 확인할 항목

- Docker Desktop을 재시작하고 알려 주시면 IT·E2E를 다시 실행해 이 보고서를 갱신한다.
- 사용자 환경 Backend를 다시 띄우면 새 Migration 2개가 `lh-local-run-mysql`에 적용된다. 필요하면 미리 DB를 백업해 두시기를 권한다.
- 개발용 계정 전환 패널이 필요하면 주소에 `?devPanel=1`을 붙인다(그 탭 동안 유지, `?devPanel=0`으로 끔).
- 확인할 화면:
  - 관리자 `/assessment`, `/assessment/evaluation-plans`, `/assessment/analysis`, `/assessment/monthly-plan`, 확정 문서의 결과 보기
  - 학생 `/assessment`, 수행평가 상세, 자료함 파일 첨부

## 60. 최종 판정 (중간)

| 구분 | 판정 |
|---|---|
| 관리자 탭·Dashboard·Calendar·월별 탭 | PARTIAL (구현·Build, 브라우저·E2E 미실행) |
| 평가계획서 6칸·분석 탭 분리·문서 전달 | PARTIAL |
| 검토 UI 개편·4단계 확정·과목 ID 입력 제거 | PARTIAL |
| 결과 조회 화면 | PARTIAL (독립 Route·읽기 전용·이력 구현. 2패널·비교·초안 표시 미흡) |
| 관리자 참고자료 Modal | PARTIAL |
| 학생 AI 제거·Dashboard·3개년 원본·공개 분리 | PARTIAL |
| 개인 수행평가 확장·되돌리기 | PARTIAL (Backend IT 통과, 브라우저 미확인) |
| 오른쪽 패널 제거·자료 찾기 | PARTIAL |
| 탐구노트 | PARTIAL (단축 입력·되돌리기 추가, 인라인 서식 미구현) |
| 자료함 업로드 | PARTIAL (Backend IT 통과, 브라우저 미확인) |
| 참고자료 UI·개발 문구 제거 | PARTIAL |
| Student Care·기존 Assessment 회귀 | **미검증** (Docker 장애) |
| Before/After·해상도 확인 | **미실행** |

FAIL로 확정한 항목은 없다. 다만 "AI 후보 ↔ 수정값 ↔ 확정값 비교"(9.8)와 "탐구노트 인라인 서식"은 미구현 상태다.

---

# 계정 B 이어받기 보고 (2026-11-18)

> 위 §1~§60은 계정 A의 중간 보고이며 **그대로 두었다**. 아래는 계정 B가 같은 작업 트리(`C:\learnershigh-assessment-integration`, Branch `integration/assessment-studentcare-20261116`)에서 이어서 한 일이다.
> 판정 기준은 위 §0과 같다(PASS = 구현 + 데이터 연결 + 테스트 + 브라우저 확인). 실행하지 않은 검증은 PASS로 적지 않았다.

## B1. 계정 A에서 인수인계한 상태

위 §58의 남은 문제 10건(Docker 장애, 결과 화면 Modal·비교 없음, '검토 완료·미확정' 판정 불가, 6칸 원본 미리보기·이력 부족, 인라인 서식 미구현, 학생 Home 공식 수행평가 미통합, 자료 찾기 Filter·연결 해제 없음, 참고자료 Modal 디자인, domain.md 미반영, 학생 CSS 파란색)과 IT·E2E·브라우저 미실행 상태.

## B2. 작업 시작 Git 상태

HEAD `9755581`, 미커밋 112건(수정 76 · 삭제 2 · 새 파일 38 — `git-status.txt`). Staged 없음.

## B3. 기존 미커밋 파일 보호

작업 전 백업 `C:\learnershigh-A27-backup-accountB-20261118-015659\`: `git-status.txt`, `head.txt`, `tracked.diff`, `staged.diff`(빈 파일), `deleted.txt`, `untracked.tar`(38), `modified-fulltext.tar`, `all-changed-before.sha256`(112). `git reset`·`clean`·`checkout --`·`stash`·Commit을 하지 않았다. 계정 A 파일 가운데 계정 B가 손댄 것은 B28 목록뿐이고 나머지 해시는 그대로다.

## B4. HWP 수정 파일 6개 보존

`hwp6.sha256` 6건 모두 `OK`(작업 마지막에 재확인): `PlanPreviewConverter`, `ProcessPlanPreviewConverter`, `PlanPreviewRenditionService`, `preview-converter/Dockerfile`, `ConversionDiagnostics`, `ConversionDiagnosticsTest`. HWP 변환기 추가 안정화·분석기 정확도 작업은 하지 않았다.

## B5. Docker 문제의 실제 원인

Docker Desktop 백엔드 로그에 2026-11-18 01:15 KST 무렵부터 `connect tcp 192.168.65.7:2376: no route to host`가 반복됐다. Docker Desktop VM 안 dockerd로 가는 내부 네트워크가 끊겨 모든 API 호출이 `500 Internal Server Error`를 받았다. 코드·Testcontainers 설정 문제는 아니었다. 사용자가 Docker Desktop을 직접 재시작했다. 계정 B는 Docker·컨테이너·Volume을 재시작·삭제하지 않았다.

## B6. 테스트 환경 복구

재시작 뒤 `docker version`(29.8.0)·`docker info`(16 CPU, 약 8GB)·`docker ps`(`lh-local-run-mysql` Up)가 정상 응답했다. 이 PC 사용자 프로필에 Playwright Chromium이 없어 `npx playwright install chromium`(Playwright 1.63.0 고정판 chromium-1243)을 설치했다.

## B7~B10. 분석 결과 조회 화면

| 항목 | 내용 | 판정 |
|---|---|---|
| B7 결과 조회 보완 | `PlanResultRoute` 다시 작성. 상단(뒤로·학교/학년도/학기·파일명·Revision 선택·검토하기/검토 이어하기/재검토 이어하기), 오른쪽 상태 요약(단계·검토 대상·검토 결정·미검토 또는 학생 비공개·학생 공개 확정값·진행 막대), 탭 `?view=result\|compare\|history`(새로고침 유지). 초안·이력 조회 실패는 '값 없음'과 따로 표시 | PASS |
| B8 원문 고정 2패널 | 왼쪽 `SourcePane` 고정(48%), 결과 탭의 '근거 쪽'이 왼쪽 원문으로 이동. `DocumentDetail`에 `onSource`를 주면 Modal 없이 동작(학년도별 열람은 기존 Modal 그대로) | PASS |
| B9 AI 후보·수정값·확정값 비교 | `model/planReviewComparison.ts`: AI 후보(§39 analysis) · 관리자 검토값(§39-4 초안 decisions) · 최종 확정값(§39-8 current) · 직전 확정값을 서로 다른 원천에서 읽고 덮어쓰지 않는다. 확정값 ↔ 분석 과목 연결은 api-contract A10 우선순위 ① `analysisSubjectIndex` ② 초안 `subjectLinks` ③ 분석 과목 1개 + 번호 없는 확정 과목 1개만 쓴다(③은 E2E에서 '미확정'으로 잘못 보이던 것을 찾아 추가). Filter: 전체·관리자 수정·미검토(확정 뒤에는 '미확정')·원문에 없음 | PASS |
| B10 검토 완료 판정 | 새 서버 상태 없이 계산: 확정(`CONFIRMED`) > 검토 완료·미확정(ACTIVE 초안이 검토 대상 전부를 결정) > 검토 중 > AI 결과. 검토 대상 총수 = 확정 화면과 같은 `reviewFields` 수. 분석 목록(`EvaluationPlansRoute`)도 ACTIVE 초안이 있는 문서만 분석 결과를 더 읽어 같은 규칙으로 표시. 확정 뒤 요약은 '미검토' 대신 '학생 비공개 = 검토 대상 − 확정값'(검토 화면 머리글과 같은 계산) | PASS |

## B11. 평가계획서 원본 열람·개정 이력 — PASS

`PlanSlotsRoute`: 문서 카드에 '원본 보기'(앱 안 미리보기 Modal), '개정 이력 N' 펼침(v#·최신 표시·형식·크기·등록일·단계, Revision별 원본 보기·내려받기·결과 보기), 빈 칸 안내. 탭 개편으로 진입 단추가 사라져 **고아 화면이 된 '학년도별 열람'을 6칸 화면 머리에 되살렸다**(기존 E2E 3건이 이것으로 실패하고 있었다).

## B12. 학생 수행평가 Dashboard — PASS

`model/upcomingAssessments.ts` + `AssessmentHomeRoute`: '다가오는 수행평가'에 학생 개인 수행평가(정확한 평가일·마감으로만 D-day)와 관리자 확정·공개 수행평가(등록 과목, 확정 이름만, 날짜가 없어 '날짜 미정')를 함께 보인다. 같은 Revision·과목에 `evaluationItemRef`로 연결되고 이름이 같으면 한 번만 보인다. 공식 목록 조회 실패는 따로 안내한다. 저장 모델은 합치지 않았다(domain.md §10-2).

## B13. 탐구노트 인라인 서식 — PASS (저장 형식은 DRAFT)

굵게·기울임·밑줄·링크(Ctrl/⌘+B·I·U·K + 도구 막대). `text`는 그대로 두고 `attrs.marks: [{type,start,end,href?}]`로만 저장(Backend는 블록 JSON을 그대로 보존 — 서버 변경 없음). 블록 나누기·합치기·입력·되돌리기/다시 하기에 범위가 따라간다. 링크는 저장·표시 모두 http(s)만. 학생 읽기 화면·관리자 열람에 같은 `InlineText`. E2E 중 **서식 있는 블록을 누르면 입력칸이 새로 만들어져 포커스·선택이 사라지는 결함**을 찾아 고쳤다(감싸개 구조 고정). Editor Schema(OD-A05)는 여전히 Open Decision.

## B14. 자료 찾기 Modal — PASS

`ResourcesTab`: 검색 + 유형 Filter(§22 `type`) + '이 수행평가 노트에 연결된 자료' 목록 + 연결 해제(노트의 출처 카드만 빼고 자료는 그대로, 자동 저장) + '연결됨' 표시. 연결 = 노트의 RESOURCE_LINK 블록(§23, 별도 Entity 없음).

## B15. 관리자 참고자료실 Modal — PARTIAL

`ReferenceLibraryRoute` 스크랩 Modal을 자료 정보·분류·관리자 메모 세 묶음으로 나누고 입력 높이 40px·2열(560px 미만 1열)로 정리(`scrapModal.module.css`). 동작 변경 없음. 브라우저에서 Modal 자체를 연 캡처는 없다(E2E 시나리오 미포함).

## B16·B17. 디자인 점검 · 개발용 문구 — PARTIAL

- 왼쪽 굵은 테두리: 노트 인용·관리자 노트 인용 3px → 2px 회색.
- 파란색: 학생 Home D-day를 차콜로(임박만 빨강). 상세 화면 마감 D-day 등 학생 다른 CSS의 파란색은 그대로(§58-10과 같이 남음).
- 학생 상세 '평가 정보 수정''휴지통으로 이동'이 붙어 한 단어로 보이던 것(HEAD부터 있던 문제)을 띄움.
- 개발 문구: `ConvertedOriginalViewer`(415), `PlanReviewConfirmPanel`(`verified_auth_required`), `MultiformatReviewReadiness`, `TeachingPlanStep`(개발 미리보기 링크를 `devPanelEnabled()` 뒤로), `MockExamRoutes`, `StaticContentRoutes`·`UniversityRoutes`, '학교 코드 {id}' → '선택한 학교 (이름 확인 안 됨)'. 문구만 바꿨다.
- 전수 점검은 E2E 캡처 화면(아래 B25) 범위에서만 했다.

## B18. 도메인·API 계약 동기화 — PASS

- `domain.md`: 9-2 '검토 진행 표시', §10-2 A27-UX 반영(되돌리기·개인 관리 정보·Home 두 출처·자료 파일·공식 원본·확정 = 공개) — §58-9 해소, §12-1-1 인라인 서식(OD-A05 열린 채).
- `api-contract.md`: 'A27-UX 계정 B 보완' 절(결과 화면이 쓰는 읽기 API와 원천, A10 ②③ 맞춤 규칙). **새 Endpoint·새 필드·새 Migration 없음.**

## B19. 신규 Migration 검증 — PARTIAL (사용자 DB 미적용)

`V202611170200`·`V202611170300`(계정 A 작성, 계정 B는 수정하지 않음). 독립 DB에서만 적용됐다: 전체 IT(Testcontainers 일회용 MySQL, `ResourceFileApiTest`·`SchoolAssessmentApiTest` 포함 통과), Assessment E2E 일회용 tmpfs DB(파일 첨부·평가일 D-day 시나리오 통과). **`lh-local-run-mysql`에는 적용하지 않았고 접근하지 않았다**(B32).

## B20. 전체 Backend Unit — PASS

`gradlew test`: 402 tests, 0 failed, 1 skipped(`StructureCorpusDumpTest.dump` — 설계상 수동 도구).

## B21. 전체 Integration — PASS (재실행 포함)

- 1차 `gradlew integrationTest`(1h15m): 219 tests 중 **187 통과 · 32 실패**. 실패 3개 Class(`TeachingPlanReviewApiTest` 14 · `ErrorResponseHttpTest` 15 · `MalformedQueryOutsideMvcHttpTest` 3) 모두 Context 로딩 단계의 Testcontainers MySQL 연결 끊김(`Container is started, but cannot be accessed` / `Communications link failure`) — 환경 실패.
- 같은 3개 Class 재실행: **32/32 통과**(1m03s). → 219건 모두 통과 확인. Student Care IT도 1차에서 모두 통과.
- 로그: 백업 폴더 `backend-it.log`, `backend-it-rerun.log`.

## B22. Assessment E2E — PASS

`npm run test:assessment`(일회용 DB·Stub 분석기): **최종 32/32 통과**(2.2m, `e2e-assessment-full-final.log`). 첫 실행 8건 실패의 원인과 조치:

| 실패 | 원인 | 조치 |
|---|---|---|
| a27 비교 '미검토' | 제품: A10 ③ 규칙 누락 | 모델 수정 + Unit 1건 추가 |
| a27 인라인 링크 | 제품: 서식 블록 포커스 시 입력칸 재생성 | `NoteBlockEditor` 구조 고정 |
| a27 링크 범위 | 시험 오타(글자 위치 5~10 → 6~11) | 시험 수정 |
| a27 Home D-3 | 시험: UTC 날짜로 계산(한국 0~9시 하루 어긋남) | 지역 날짜로 수정 |
| plan-archive·preview-subjects ×2 | 제품: '학년도별 열람' 진입 단추 사라짐 | 6칸 화면에 단추 복원 |
| a12 A·B · a15 | 시험(계정 A 미실행 수정분): 확정 후 결과 화면 → 뒤로 오면 1단계부터 열림 | 공용 Helper가 최종 확정 단계를 연다 |
| a12 G | 시험: Dashboard가 학교·학년 Filter로 바뀜 | 같은 조건의 API 값과 비교 |
| evaluation-flow | 시험: 등록 단추 기본 칸이 고1 1학기 | 고1 2학기 칸의 '+ 등록'으로 올림 |
| a13 D·E 성장 기록 | 시험 경쟁 조건: 저장 끝나기 전 새로고침 | 상세 주소 이동을 기다림(제품은 정상 — 저장 뒤 상세로 이동 확인) |

단언을 약화하거나 `skip`한 시험은 없다.

## B23. Student Care 회귀 — PASS

- Backend: Student Care IT 전부 통과(B21).
- Playwright 인수 시험(CI e2e Job과 같은 구성 — `care-demo,e2e` Profile, `APP_FIXED_DATE=2026-11-12`, 합성 원천 210명, 일회용 MySQL `lh-a27b-care-mysql` 127.0.0.1:33341 tmpfs `--rm`, Admin preview 4174): **22/22 통과**. 그중 1건은 기존 `test.fail()` 예상 실패(상담 양식 첫 글자 사라짐 — 완규님 영역 기존 결함, 손대지 않음).
- 시험 뒤 Backend·preview 종료, 일회용 DB 중지(자동 삭제), 포트 8080·4174·33341 닫힘 확인. Student Care 코드는 수정하지 않았다.

## B24. Railway 합성 문서 E2E — 미실행

지시는 '기존 합성 문서만'이다. 이 PC에 합성 문서 manifest(`%USERPROFILE%\.learnershigh-extension\synthetic-a19`)가 없어 새로 만들어야 하고, 실행하면 외부(Railway)로 문서를 보낸다. 새 문서 생성·외부 전송은 하지 않았다. 실행하려면 run guide §9-1로 합성 문서를 만든 뒤 `ASSESSMENT_RAILWAY_*` 환경 변수로 `playwright.assessment-railway.config.ts`를 돌린다(시험 파일은 공용 Helper 변경만 반영됨, 형식 검사 통과).

## B25. 브라우저 해상도별 검증 — PASS (캡처 화면 범위)

`a27-ux.spec.ts` 해상도 시험 3건(1366×768·1600×900·1920×1080)에서 관리자 Dashboard·평가계획서·분석·월별, 학생 Home·참고자료의 가로 넘침 0을 확인했다. 캡처를 직접 보고 확인한 것: 관리자 결과 2패널(1600), 평가계획서 6칸(1366), 학생 Home 두 출처 목록(1366), 학생 상세(1600), 노트 서식(1600). 관리자 Sidebar 배경이 전체 페이지 캡처에서 첫 화면 높이까지만 칠해지는 것은 기존 Admin Shell 동작으로 보이며 바꾸지 않았다.

## B26. Before/After 스크린샷 — PARTIAL (After만)

Before 캡처는 계정 A도 남기지 않았고, 지금 만들려면 코드를 되돌려야 해서 만들지 않았다. After 21장: `C:\learnershigh-A27-backup-accountB-20261118-015659\screenshots-after\a27-*.png`(`e2e/test-results`는 Git 무시·다음 실행 때 지워지므로 복사해 둠).

## B27. 기존 DB 보존 — PASS

`lh-local-run-mysql`(127.0.0.1:33307)과 그 Volume에 접근·재시작·초기화하지 않았다. `docker compose down -v`·`prune`·Volume·이미지 삭제 없음. 쓴 DB는 모두 일회용(Testcontainers, `lh_e2e_assessment*` tmpfs, `lh-a27b-care-mysql`)이며 끝나고 사라졌다. 원본 개발 폴더 `C:\learnershigh-extension`: 작업 전후 `git status` 68건 동일(`original-folder-status-before/after.txt`).

## B28. 변경 파일 목록 (계정 B)

**계정 A 파일 중 계정 B가 수정한 것 (21)**
- Docs: `docs/api/api-contract.md`
- Admin: `components/PlanReviewConfirmPanel.tsx`, `routes/AssessmentAdminRoute.tsx`, `routes/EvaluationPlansRoute.tsx`, `routes/PlanArchiveRoute.tsx`, `routes/ReferenceLibraryRoute.tsx`, `routes/PlanResultRoute.tsx`, `routes/PlanSlotsRoute.tsx`, `routes/planSlots.module.css`
- Student: `api/types.ts`, `components/detail/context.module.css`, `components/home/home.module.css`, `components/notes/NoteBlockEditor.tsx`, `components/notes/NoteEditor.tsx`, `routes/AssessmentHomeRoute.tsx`, `routes/SchoolAssessmentDetailRoute.tsx`, `routes/SchoolAssessmentDetailRoute.module.css`
- E2E: `assessment/reviewUi.ts`, `tests/a27-ux.spec.ts`, `tests/a12-flows.spec.ts`, `tests/evaluation-flow.spec.ts`

**계정 B가 새로 손댄 파일 (23)**
- Docs: `docs/specs/suyeon/domain.md`, 이 보고서
- Admin 새 파일: `model/planReviewComparison.ts`(+`.test.mjs`), `routes/planResult.module.css`, `routes/scrapModal.module.css`
- Admin 수정: `components/ConvertedOriginalViewer.tsx`, `components/MultiformatReviewReadiness.tsx`, `components/NoteReadView.tsx`, `review/TeachingPlanStep.tsx`, `routes/MockExamRoutes.tsx`, `routes/StaticContentRoutes.tsx`, `routes/UniversityRoutes.tsx`, `styles/assessmentAdmin.module.css`
- Student 새 파일: `components/notes/InlineText.tsx`, `model/noteInlineMarks.ts`(+test), `model/upcomingAssessments.ts`(+test)
- Student 수정: `components/detail/NoteSection.tsx`, `components/detail/ResourcesTab.tsx`, `components/notes/notes.module.css`, `model/noteBlockOps.ts`
- E2E: `tests/a13-flows.spec.ts`

Backend·Migration·Student Care·`frontend/shared`는 수정하지 않았다. API·DB 변경 없음.

## B29. Git 미커밋·미Push

Commit·Push·PR 갱신·main Merge·Draft 해제를 하지 않았다. HEAD `9755581` 그대로. 미커밋 135건(계정 A 112 + 계정 B 새 항목 23, `git-status-after.txt`).

## B30. 남은 문제

1. **Railway 합성 E2E 미실행**(B24).
2. **Before 캡처 없음**(B26).
3. 새 Migration 2개가 사용자 DB에 아직 적용되지 않음 — 사용자 환경 Backend를 띄우면 Flyway가 적용한다(B32).
4. Open Decision: OD-A05 노트 Editor/Rich-text Schema(`attrs.marks`는 임시 형식), 확정값에 `itemKey`가 없어 공식 수행평가 중복 판정이 이름 기준, 확정과 학생 공개 분리 여부(현재 확정 = 공개), §13 역전이 정책 반전(DRAFT)의 팀 승인.
5. 학생 화면 다른 CSS의 파란색(상세 마감 D-day 등)과 참고자료실 Modal 브라우저 캡처.
6. 관리자 결과 화면 '확정 이력' 탭의 월별 운영계획 이력은 계정 A의 기존 표시를 그대로 쓴다.

## B31. 판정 (계정 B 기준)

| 구분 | 판정 |
|---|---|
| 결과 조회 화면(2패널·비교·진행률·검토 완료 판정) | PASS |
| 평가계획서 원본 열람·개정 이력·학년도별 열람 진입 | PASS |
| 학생 Home 공식 + 개인 수행평가 | PASS |
| 탐구노트 인라인 서식 | PASS (저장 형식 DRAFT, OD-A05 열림) |
| 자료 찾기 Modal | PASS |
| 관리자 참고자료 Modal | PARTIAL (브라우저 캡처 없음) |
| 디자인·개발 문구 정리 | PARTIAL (학생 다른 CSS 파란색 남음) |
| domain·api-contract 동기화 | PASS |
| 신규 Migration | PARTIAL (독립 DB만, 사용자 DB 미적용) |
| Backend Unit / Integration | PASS / PASS (환경 실패 3개 Class 재실행 통과) |
| Assessment E2E | PASS (32/32) |
| Student Care 회귀 | PASS (IT + Playwright 22/22) |
| Railway 합성 E2E | 미실행 |
| 해상도별 확인 | PASS (캡처 화면 범위) |
| Before/After | PARTIAL (After만) |

FAIL은 없다. 위 §60의 계정 A 판정은 바꾸지 않았고, 계정 B 확인 결과는 이 표를 따른다.

## B32. 사용자가 직접 확인할 항목

1. **새 Migration 적용 전 `lh-local-run-mysql` 백업**: 사용자 Backend를 다시 띄우면 `V202611170200`·`V202611170300`이 적용된다. 예) `docker exec lh-local-run-mysql sh -c "mysqldump -ulhlocal -p<비밀번호> lh_local_run" > lh_local_run-before-a27.sql`. 계정 B는 비밀번호를 쓰지 않았고 이 DB에 접근하지 않았다.
2. Railway 합성 E2E를 돌릴지(새 합성 문서 생성 + 외부 전송 필요).
3. Open Decision 4건(B30-4) 팀 결정.
4. 화면 확인: 관리자 `/assessment/evaluation-plans`(원본 보기·개정 이력·학년도별 열람), 확정 문서의 '결과 보기'(원문 2패널·검토 비교 탭), 학생 `/assessment`(다가오는 수행평가 두 출처), 수행평가 상세 노트(글자 선택 → B·I·U·링크, 자료 찾기의 연결 해제).
5. 검토 후 Commit 승인 여부. 계정 A 112건과 계정 B 23건 + 수정 21건을 나눠 Commit할지 정해 주시면 그에 맞춘다.

---

# 계정 B 2차 이어받기 보고 (2026-11-18 오전)

> 위 §1~§60(계정 A)과 B1~B32(계정 B 1차)는 **그대로 두었다**. 같은 인수인계 지시가 다시 내려와 계정 B 2차 세션이 이어서 확인·보완한 내용만 아래에 적는다.

## C1. 시작 상태 대조 — 재구현하지 않음

- HEAD `9755581`, Branch `integration/assessment-studentcare-20261116`, Staged 없음, 미커밋 135건.
- `git status --porcelain`이 1차 종료 기록(`C:\learnershigh-A27-backup-accountB-20261118-015659\git-status-after.txt`)과 **완전히 같았다**. 1차 마지막 E2E 로그(09:46) 이후 바뀐 소스 파일은 0건(보고서 파일만 바뀜).
- 즉 작업 트리는 B20~B25 검증을 마친 상태 그대로였다. 그래서 1차 결과(B7~B18)는 다시 만들지 않고, B30의 남은 문제만 진행했다.
- 2차 시작 전 백업: `C:\learnershigh-A27-accountB-backup-20261118\`
  - `git-status.txt`, `head.txt`, `tracked.diff`, `staged.diff`(빈 파일), `deleted.txt`(2), `untracked.tar`(47), `modified-files-snapshot.tar`
  - Stash·Commit·reset·clean 없음.
- HWP 6개: `hwp6.sha256` 6/6 `OK`(시작·끝 모두). 원본 폴더 `C:\learnershigh-extension`: `git status` 68건, 1차 기록과 같음(시작·끝).

## C2. Docker

- 2차 시작 시 Docker Desktop이 꺼져 있었다(`//./pipe/dockerDesktopLinuxEngine` 없음, 프로세스 없음).
- 사용자가 직접 재시작했다. 재시작 뒤 상태:
  - Engine 29.8.0, 16 CPU, 약 8GB
  - `lh-local-run-mysql` Up(127.0.0.1:33307)
  - 7일 전 종료된 이전 Testcontainers 잔여 컨테이너 5개와 `learnershigh-mysql`(Exited)는 손대지 않았다.
- 계정 B는 Docker를 중지·삭제·prune하지 않았다.

## C3. 이번에 바꾼 것

**학생 화면 장식용 파란색 → 무채색 (B30-5)**

A27 원칙은 "파란색은 주요 동작·선택·포커스만"이다. 학생 핵심 화면에서 정보 표시에 쓰인 파란색만 바꿨다.

| 파일 | 규칙 | 변경 |
|---|---|---|
| `routes/SchoolAssessmentDetailRoute.module.css` | `.dday`, `.chipIconBlue` | 차콜 (임박 `data-urgent`는 빨강 그대로) |
| `routes/SchoolAssessmentListRoute.module.css` | `.upcomingDday strong`, `.dday` | 차콜 (임박은 빨강 그대로) |
| 같은 파일 | `.textButton`, `.recordButton[data-tone='delivered']` | 차콜 |
| `components/detail/detail.module.css` | `.blueBadge`, `.statusPill[data-tone='blue']`, `.sentStatus` | 회색 면 + 차콜 |
| 같은 파일 | `.textAction` | 차콜 + 밑줄 |
| `components/feedback/feedback.module.css` | `.statusBadge[data-tone='blue']`(피드백 대기) | 회색 면 + 차콜 |

- 바꾸지 않은 것:
  - 주요 버튼(`.primaryButton`), 선택(`aria-pressed`·checked), 포커스 링, `accent-color`, Drag 상태
  - 심화(모의고사·대학) 화면 CSS — A27 핵심 범위 밖
- 동작·TSX 변경은 없다.

**관리자 참고자료실 Modal 브라우저 시험 추가 (B15·B30-5)**

`e2e/assessment/tests/a27-ux.spec.ts`에 1366×768·1920×1080·800×600 시험 3건을 추가했다. 확인하는 것:
- '링크 직접 저장' Modal이 열린다.
- Modal이 화면 밖으로 나가지 않는다.
- 페이지 가로 넘침이 없다.
- '심화 Task/관련 Task' 입력이 없다.
- 캡처를 남긴다.

800×600 캡처에서 Modal 본문이 화면 높이 안에서 잘려 스크롤 영역이 되는 것을 눈으로 확인했다(스크롤 자체는 단언하지 않았다).

## C4. 검증 (2차에서 실제 실행한 것만)

| 실행 | 결과 |
|---|---|
| `scripts/verify-frontend.ps1` (student·admin typecheck / oxlint --deny-warnings / build) | PASS (`verify-frontend-2nd.log`) |
| `node --test` student·admin `model/*.test.mjs` | 19/19 통과 |
| `gradlew test` | 402 tests, 0 failed, 1 skipped. Backend 입력 변경이 없어 Gradle이 UP-TO-DATE로 이전 결과를 다시 썼다(9s). 새로 돌린 실행은 아니다. |
| `npm run test:assessment` (일회용 tmpfs MySQL 33340, Stub 분석기) | **35/35 통과**(2.4m, `e2e-assessment-2nd.log`) = 기존 32 + 참고자료실 Modal 3 |
| 시험 제목 수정 뒤 `--grep 참고자료실` | 3/3 통과 |

- 실행 뒤 일회용 DB 컨테이너는 자동 삭제됐다. 실행 중인 컨테이너는 `lh-local-run-mysql`뿐이다.
- 2차에서 다시 돌리지 않은 것:
  - 전체 Backend Integration: 1차 B21 219/219 이후 Backend·Migration 변경 0건.
  - Student Care Playwright: 1차 B23 22/22 이후 Student Care·shared·Backend 변경 0건. 이번 변경은 Assessment 학생 CSS와 E2E 1개 파일뿐이다.

## C5. 캡처

After 24장: `C:\learnershigh-A27-accountB-backup-20261118\screenshots-after-2nd\`
- 1차 21장과 같은 화면
- `a27-admin-scrap-modal-{1366,1920,800}.png` 추가

직접 본 캡처:
- 참고자료실 Modal 800
- 학생 상세 1600: 제출 마감 D-20이 차콜

Before 캡처는 여전히 없다(B26과 같음).

## C6. 변경 파일 (2차)

- `frontend/student/src/features/assessment/components/detail/detail.module.css` (새로 수정 — 1차 목록에 없던 파일)
- `frontend/student/src/features/assessment/components/feedback/feedback.module.css` (새로 수정)
- `frontend/student/src/features/assessment/routes/SchoolAssessmentListRoute.module.css` (새로 수정)
- `frontend/student/src/features/assessment/routes/SchoolAssessmentDetailRoute.module.css` (계정 A·B1 수정 파일에 추가 수정)
- `e2e/assessment/tests/a27-ux.spec.ts` (B1 수정 파일에 시험 3건 추가)
- 이 보고서

API·DB·Migration·Backend·Student Care·`frontend/shared` 변경 없음. 미커밋 138건(135 + 새로 수정한 3개 파일). Commit·Push·PR 갱신·Merge·Draft 해제 없음.

## C7. 남은 문제 / 판정

| 구분 | 판정 |
|---|---|
| 관리자 참고자료 Modal | **PASS** (B15 PARTIAL → 브라우저 시험 3건·캡처) |
| 디자인·개발 문구 정리 | PARTIAL. 학생 A27 핵심 화면은 정리했다. 심화(모의고사·대학)·노트 링크 등 나머지 파란색은 남아 있다. |
| Assessment E2E | PASS (35/35) |
| 나머지 항목 | B31 판정 그대로 |

아직 남은 것:
- Railway 합성 E2E 미실행(B24, 외부 전송·새 합성 문서 필요 — 사용자 결정)
- Before 캡처 없음
- 새 Migration 2개 사용자 DB 미적용(백업 후 적용 권장, B32-1)
- Open Decision 4건(B30-4)
