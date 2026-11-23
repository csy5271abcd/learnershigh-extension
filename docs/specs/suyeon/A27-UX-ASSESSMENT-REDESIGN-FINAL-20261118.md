# A27-UX — Assessment 관리자·학생 재설계 최종 통합 보고서

- 작성: 2026-11-18
- Worktree `C:\learnershigh-assessment-integration` · Branch `integration/assessment-studentcare-20261116` · HEAD `9755581`
- 이 문서는 A27-UX 전체를 **기능별로** 정리한다. 작업 경과 기록과 검증 근거의 원본은 [ACCOUNT-A-A27-UX-ASSESSMENT-REDESIGN-20261117.md](ACCOUNT-A-A27-UX-ASSESSMENT-REDESIGN-20261117.md)에 그대로 보존한다(§1~§60, B1~B32, C1~C7 — 과거 진행 순서대로 쓴 기록이며 담당 구분이 아니다).
- 판정
  - **PASS**: 구현 + 실제 데이터 동작 + 필요한 테스트 + 화면 확인
  - **PARTIAL**: 구현됐으나 테스트·연결·UX·정책 제약이 남음
  - **FAIL**: 미구현 또는 회귀 확인
  - **NOT RUN**: 실행하지 않음
- 테스트 표기
  - **[이번 실행 hh:mm]**: 2026-11-18 이 문서를 마감한 작업 구간(10:58~11:22 KST)에 실제로 실행한 결과
  - **[기존 실행 hh:mm]**: 그 이전 실행 결과. 다시 돌리지 않았다.
- Commit·Push·PR 갱신·Merge·Draft 해제: **하지 않음.**

---

## 1. 프로젝트 개요

LearnersHigh Extension의 Assessment(학교 수행평가·평가계획서) 영역을 관리자·학생 양쪽에서 다시 설계했다.
- 기존 LearnersHigh 기능(Plan·Library·Study 등)은 재구현하지 않았다.
- Student Care(상담 영역)는 변경하지 않았다.

## 2. A27-UX 목표

사용자 제공 화면 20장(`C:\learnershigh-A27-local-references\A27-reference`)과 Daglo·Toss Payments 참고를 기준으로 다음을 목표로 했다.
- 관리자
  - 탭 재편
  - Dashboard
  - 평가계획서 6칸
  - 분석과 결과 조회 분리
  - 4단계 확정
- 학생
  - AI 도우미 제거
  - Dashboard
  - 개인 수행평가 확장
  - 탐구노트 서식
  - 자료함 파일
- 디자인
  - 무채색 중심
  - 왼쪽 굵은 강조선 제거
  - 개발용 문구 제거

## 3. 기준 Git 상태

| 시점 | 상태 |
|---|---|
| A27-UX 시작 | HEAD `9755581`, 미커밋은 HWP 수정 6건뿐 |
| 이번 작업 구간 시작 | HEAD `9755581`, Staged 0, 미커밋 **138건** (M 91 · D 2 · ?? 45 항목). 백업 `C:\learnershigh-A27-UX-backup-20261118\` |
| 이번 작업 구간 끝 | HEAD `9755581`, Staged 0, 미커밋 **151건** (M 102 · D 2 · ?? 47 항목 — 이 문서 포함, `git-status-final.txt`) |

- 증가한 13건은 모두 이번 구간에 수정·추가한 파일이다(§33, 이 문서 포함).
- 시작 백업의 해시(`all-changed.sha256`)와 비교하면 바뀐 기존 파일 13개도 모두 이번 구간에 직접 수정한 파일이다.
- 다른 세션이 동시에 변경한 흔적은 없었다.

## 4. 전체 구현 요약

| 영역 | 상태 |
|---|---|
| 관리자 Dashboard·탭 8개·월별 Calendar | PASS |
| 평가계획서 6칸·원본 보기·개정 이력 | PASS |
| 분석 탭(상태별 목록·문서 선택) | PASS |
| 분석 결과 조회(원문 고정 2패널·읽기 전용) | PASS |
| AI 후보 ↔ 관리자 검토값 ↔ 확정값 비교·검토 진행률 | PASS |
| 최종 확정 4단계·과목명 검색 | PASS |
| 관리자 참고자료실 Modal | PASS |
| 학생 Dashboard(공식 원본 3개년·Calendar·두 출처 일정) | PASS |
| 학생 개인 수행평가 CRUD·되돌리기·이력 | PASS (되돌리기 정책은 DRAFT, §31) |
| 탐구노트 블록·단축키·Undo/Redo·인라인 서식 | PASS (저장 형식 DRAFT, §31) |
| 자료함 파일 첨부 | PARTIAL (§17) |
| 학생 참고자료·자료 찾기 Modal | PASS |
| 심화 콘텐츠 디자인 | PASS |
| 디자인 시스템 정리(파란색·강조선) | PASS |
| 개발용 문구 정리 | PASS |

---

## 5. 관리자 Dashboard

**탭 8개** (`routes/paths.ts`·`AssessmentAdminRoute.tsx`)
- 전체 현황 · 학생 Assessment · 피드백 관리 · 평가계획서 · 분석 · 월별 운영계획 · 심화 콘텐츠 · 관리자 참고자료실
- 이전 검토 주소도 그대로 열린다.

**Dashboard** (`OverviewRoute.tsx`)
- KPI 4개는 서버 `GET /overview` 값만 쓴다. 화면용 Counter는 없다.
- 학교·학년도·학년·학기 Filter는 URL에 유지된다.
- 다른 학교·학년 문서는 목록 단계에서 걸러진다(`model/confirmedTeachingPlan.ts`). 그래서 이전 학교의 운영계획이 남지 않는다.
- 학교별 확정 운영계획 Calendar는 A26 주차 잠정 배치와 상세 Modal을 그대로 쓴다.
- 담당 학생 현황과 최근 활동을 보여 준다.

**검증**
- E2E `a27-ux` "탭 8개 순서·개발 문구 없음·Dashboard" 통과 **[이번 실행 11:17~11:19]**
- `a12 G` Dashboard 값과 API 값 비교 통과 **[이번 실행]**
- 해상도 3종 캡처를 확인했다.

→ **PASS**

## 6. 평가계획서 원본 관리

`PlanSlotsRoute.tsx`
- 고1~3 × 1·2학기 6칸이며, 한 칸에 문서 여러 개를 둘 수 있다.
- 문서 카드
  - 형식·크기·등록일·출처·단계
  - '원본 보기'(앱 안 PDF/HWP/HWPX 미리보기)
  - 내려받기, 논리 삭제(A25 정책)
  - '개정 이력 N' 펼침: Revision별 원본 보기·내려받기·결과 보기
- 빈 칸에는 안내가 나온다.
- '학년도별 열람' 진입 단추가 있다.

**검증**
- E2E `a27-ux` 6칸 → 분석하기 흐름 통과 **[이번 실행]**
- `plan-archive`·`preview-subjects`(HWP·HWPX 원문 앱 안 열람·근거 칸 강조) 통과 **[이번 실행]**

→ **PASS**

## 7. AI 분석 Tab

`EvaluationPlansRoute.tsx`
- 상태 Filter: 분석 전 / AI 결과 / 검토 중 / 검토 완료·미확정 / 확정 / 실패
- 6칸의 '분석하기'가 `plan=<planId>`와 학교·학년 Context를 넘겨 해당 행을 강조한다.
- 탭 이동만으로는 분석을 시작하지 않는다. 이미 분석된 문서에는 '분석 시작'이 보이지 않는다.
- '검토 완료·미확정'은 새 서버 상태 없이 계산한다: ACTIVE 초안이 검토 대상 전부를 결정했으면 해당한다. 검토 대상 수는 확정 화면과 같은 `reviewFields` 수다(domain 9-2).

**검증**
- E2E `a27-ux` 분석 탭 문서 선택 통과 **[이번 실행]**
- `analysis-failure` 2건 통과 **[이번 실행]**

→ **PASS**

## 8. 분석 결과 조회

`PlanResultRoute.tsx` — `/assessment/analysis/{planId}/revisions/{revisionId}/result`
- 왼쪽은 원문 고정 패널(`SourcePane`)이다. PDF 쪽 이동, 확대·축소, 폭 맞춤, 새 탭 열기를 지원한다.
- 오른쪽에는 단계, 검토 대상·검토 결정·학생 비공개·학생 공개 확정값, 진행 막대가 있다.
- 탭 `?view=result|compare|history`는 새로고침 후에도 유지된다.
- '근거 쪽'을 누르면 왼쪽 원문이 그 쪽으로 이동한다. 원문 근거 링크는 이번에 회색으로 정리했다.
- 결과 화면은 읽기 전용이다.
  - 입력칸·체크박스가 없다(E2E 단언).
  - 확정 문서에서는 검토 Wizard를 실행하지 않는다.
  - 재검토는 기존 Revision 재검토 흐름으로만 간다.

**검증**
- E2E `a27-ux` 확정 후 읽기 전용·새로고침 유지·원문 패널 표시 통과 **[이번 실행]**
- `admin-result-1600` 캡처를 직접 확인했다.

→ **PASS**

## 9. 분석 결과 비교

`model/planReviewComparison.ts`
- 네 값을 각기 다른 원천에서 읽고, 서로 덮어쓰지 않는다.
  - AI 후보(§39 analysis)
  - 관리자 검토값(§39-4 초안 decisions)
  - 최종 확정값(§39-8 current)
  - 직전 확정값
- 확정값과 분석 과목의 연결 순서: api-contract A10 ① `analysisSubjectIndex` → ② 초안 `subjectLinks` → ③ 단일 과목 규칙
- Filter: 전체 · 관리자 수정 · 미검토(확정 뒤에는 '미확정') · 원문에 없음

**검증**
- Node Unit `planReviewComparison.test.mjs` 통과 **[이번 실행]**
- E2E 비교 탭·새로고침 유지 통과 **[이번 실행]**

→ **PASS**

## 10. 관리자 검토·확정

**4단계 확정** (`ConfirmStep.tsx`)
- ① 원본 대조(브라우저 SHA, 재업로드 없음)
- ② 과목 연결(`SubjectSearchSelect` 과목명 검색, ID 입력 없음, 학년 불일치 차단 유지)
- ③ 검토 결과 확인
- ④ 확정
- 확정 조건(`blockersOf`)과 서버 검증은 바꾸지 않았다. 확정이 성공하면 결과 조회 화면으로 이동한다.

**수행평가 검토 계층** (`PerformanceStep.tsx`)
- 과목 → 수행평가 경로로 보인다.
- 원문 근거 링크는 회색이다.

**이번 정리** (기록 표시만 바꿈, 데이터·API 무변경)
- 확정·검토 이력에 내부 관리자 계정 ID(`adm_…`)가 그대로 보이던 것을 '관리자'로 바꿨다(`model/actorLabel.ts`).
- 적용 위치: 결과 화면 이력, 재검토 패널, 운영계획 이력, HWP 확정 패널, 운영계획 확정 줄
- 원래 ID는 서버 기록에 그대로 있다. 진단 모드(`?devPanel=1`)에서만 함께 보인다.
- 초안 작성자 문장('처음 …, 마지막 …')도 진단 모드에서만 보인다.

**검증** (모두 독립 일회용 DB의 합성 문서, 사용자 DB의 실제 문서는 확정하지 않음)
- E2E `evaluation-flow`, `a12`, `a15`, `preview-subjects`(다과목 PDF 확정), `teaching-plan` 통과 **[이번 실행]**
- `a27-ux`에 "확정 이력에 `adm_` 없음·'관리자' 표시" 단언을 추가했고 통과했다 **[이번 실행]**

→ **PASS**

## 11. 월별 운영계획

- `MonthlyPlanTabRoute.tsx`는 관리자 탭이다. 학생 Home과 결과 화면은 같은 `MonthlyPlanner`를 쓴다.
- 확정 행만 쓰고, A26 주차 잠정 배치를 유지한다. 잠정 날짜를 실제 마감으로 쓰지 않는다.
- 이번 수정: 학생 Home 1366 화면에서 '달을 정할 수 없는 계획 n개' 라벨이 고정 64px 폭 때문에 세 줄로 꺾였다. 내용 폭 한 줄로 바꿨다(`monthlyPlanner.module.css .band/.bandLabel`). 캡처로 확인했다.

**검증**
- E2E `teaching-plan` 통과 **[이번 실행]**
- 해상도 `admin-monthly` 3종 가로 넘침 0 **[이번 실행]**

→ **PASS**

## 12. 심화 콘텐츠

이번 구간에 색상을 정리했다.

**학생 모의고사·대학별 자료·탐구 라이브러리·PDF 가져오기 CSS**
- 무채색으로 바꾼 것
  - 정보 Tag(`.subjectBadge`, `.badge[data-tone=blue]`)
  - 안내 상자(`.hero`, `.ideaBox`, `.exampleBox`)
  - 단계 번호, 보조 링크·버튼(`.detailLink`, `.linkButton`, `.textLink`, `.textButton`, `.resetButton`, `.expandButton`)
  - 원문 링크(`.planOriginalLink` 회색)
  - 장식 아이콘
- 색이 빠진 링크·텍스트 버튼에는 밑줄을 더했다. 색만으로 링크를 구분하지 않기 위해서다.
- 파란색을 유지한 것: 주요 CTA, 선택 상태(`aria-pressed`·`aria-current`·checked), 포커스 링, Drag·Spinner, 캡처 영역 그리기

**개발용 문구**
- 모의고사 원문 지문이 없을 때 환경 변수 이름(`ASSESSMENT_MOCK_EXAM_PASSAGES_FILE`)이 보였다. '원문 지문을 지금 확인할 수 없어요'로 바꿨다.
- 대학 PDF가 없을 때 '개발 PC 폴더'·환경 변수·'원인: PDF 서버 응답 404'가 보였다. '원본 자료를 확인할 수 없어요'로 바꿨다.
- 진단 문구는 지우지 않고 `?devPanel=1`에서만 보인다.
- 원본이 없다는 사실은 그대로 알린다. 없는 데이터를 만들지 않는다.

**검증**
- E2E 해상도 시험에 `student-enrichment`·`student-mock-exams`·`student-universities` 3종을 추가했다.
- 새 시험 '심화 콘텐츠 상세 1600'(개발 문구·환경 변수 없음, 가로 넘침 0) 통과 **[이번 실행]**
- 모의고사 상세·대학 상세 캡처를 직접 확인했다.

→ **PASS**

## 13. 관리자 참고자료실

- 스크랩 Modal에서 '관련 심화 Task' 입력을 제거했다(서버 값은 보존).
- 입력을 자료 정보·분류·관리자 메모 세 묶음으로 나눴다. 입력 높이 40px, 2열(560px 미만 1열)이다(`scrapModal.module.css`).

**검증**
- E2E 1366×768·1920×1080·800×600에서 다음을 확인했다 **[이번 실행]**
  - Modal이 화면 안에 들어온다.
  - 가로 넘침이 없다.
  - 심화 Task 입력이 없다.
- 800×600 캡처에서 본문이 Modal 높이 안에서 스크롤 영역이 되는 것을 눈으로 확인했다. 스크롤 자체를 단언하지는 않았다.
- 키보드 포커스 이동, 저장 후 목록 표시는 E2E로 따로 단언하지 않았다.

→ **PASS** (저장 흐름은 기존 기능을 그대로 유지)

## 14. 학생 Dashboard

`AssessmentHomeRoute.tsx`
- 공식 원본 3개년 카드(`OfficialPlansCard`)
  - 학적 Context로 슬롯을 정한다.
  - 학교알리미 공급자가 미연결이라 '공식 공개 원본 확인되지 않음'으로 표시한다. 원본이 있는 척하지 않는다.
- 확정 운영계획 Calendar
- 다가오는 수행평가: 개인 수행평가(정확한 평가일·마감만 D-day 계산)와 관리자 확정·공개 수행평가('날짜 미정')를 함께 보인다.
- 최근 기록

**이번 수정 — 중복 판정 오병합 버그**
- 같은 과목·같은 Revision에 이름이 같은 공식 수행평가가 둘일 때(예: 1·2차 '보고서'), 학생이 하나만 연결해도 공식 항목 **둘 다** 사라졌다.
- Unit으로 재현했고, 학생 연결 1건은 공식 1건만 대신하도록 고쳤다(`model/upcomingAssessments.ts`, 시험 1건 추가).
- API·DB 변경은 없다. 근본 해결(확정값 `itemKey`)은 §31-2.

**이번 정리**
- '푸시 알림·읽음 표시는 아직 없어요'(개발 범위 문구)를 제거했다.

**검증**
- Node Unit 20/20 **[이번 실행 11:17]**
- E2E 'Home 두 출처' 통과 **[이번 실행]**
- `student-home` 3종 캡처를 직접 확인했다.

→ **PASS**

## 15. 학생 수행평가

**개인 수행평가 CRUD** (§12 확장)
- 평가 유형·평가일·제출 마감·반영 비율(0~100, 빈 값 = 모름)·제출물·수행 내용·개인 메모
- 진행 상태 변경·되돌리기, 상태 변경 이력(`assessment_school_assessment_status_event`)
- 휴지통 삭제, 다른 학생 404
- 상세 화면
  - 오른쪽 고정 패널은 없다.
  - 평가 기준은 접이식 Section이다.
  - 피드백은 Modal, 자료 찾기는 Modal이다.
- 학생 개인 데이터는 공식 확정값과 다른 저장소(학생 소유)에 있어서 확정값을 덮어쓰지 않는다.
- 이번 정리: 상세·목록의 D-day는 차콜(임박만 빨강)로, 정보 Badge는 무채색으로 바꿨다.

**검증**
- Backend IT `개인_관리_정보를_등록_수정하고_범위를_검사한다_A27`, `상태를_앞으로_바꾸고_되돌리면_이력이_남는다_A27` 통과 **[기존 실행, 2026-11-18 08:53 전체 IT 안]**
- E2E `a27-ux` 개인 수행평가 상세 입력·되돌리기·피드백·자료 찾기 통과 **[이번 실행]**

→ **PASS** (되돌리기 정책 승인은 §31-4)

## 16. 탐구노트

- 기존 블록 편집기를 유지했다: 블록, `/` 메뉴, Enter/Backspace, Alt+↑↓, IME 보호, 자동 저장 1.5초
- Markdown 단축 입력: `#`·`##`·`###`·`-`·`*`·`1.`·`[]`·`>`·`---`. 조합 중에는 동작하지 않는다.
- Undo/Redo: Ctrl/⌘+Z, Ctrl+Shift+Z·Ctrl+Y
- 인라인 서식: 굵게·기울임·밑줄·링크(Ctrl/⌘+B·I·U·K + 도구 막대)
- 저장 형식
  - `text`는 그대로 두고 `attrs.marks: [{type,start,end,href?}]`를 추가했다. 서버는 블록 JSON을 보존한다(서버 변경 없음).
  - 링크는 http(s)만 허용한다.
- 인용 블록의 2px 연회색 선은 인용 의미 표시라서 유지했다(§19).

**검증**
- Node Unit `noteInlineMarks`·`noteHistory`·`noteMarkdownShortcuts` **[이번 실행]**
- E2E 서식 → 저장 → 새로고침 후 복원 → 되돌리기 통과 **[이번 실행]**
- 한글 IME 실제 입력(조합 중 커서·글자 유실)은 Playwright로 재현할 수 없다. 직접 확인이 필요하다(§37).

→ **PASS** (저장 형식 DRAFT, §31-1)

## 17. 자료함

**Backend** (§22-1 DRAFT)
- `POST/DELETE/GET .../resources/{id}/file`, `GET .../file/preview`
- 확장자 + 파일 서명 이중 검사(PDF·HWP·HWPX·DOC/DOCX·XLS/XLSX·PPT/PPTX·JPG/PNG·GIF·WEBP)
- 빈 파일 400, 크기 한도, 본인 전용 404, SHA 재확인, 원본 바이트 보존

**Frontend**
- 파일 선택·Drag & Drop·사전 검사·업로드 상태
- 상세에서 내려받기·바로 보기(PDF·이미지)·바꾸기·빼기

**검증**
- IT `ResourceFileApiTest` 3건 통과 **[기존 실행 08:53]**
- E2E GIF 첨부 → 새로고침 → 내려받기 → 빼기 통과 **[이번 실행]**
- 형식별(HWP·Office·WEBP 등) 브라우저 업로드와 Drag & Drop 실제 조작은 E2E에 없다(서명 검사는 Backend 시험 범위).
- 외부 서비스 전송은 없다.

→ **PARTIAL** (형식별 브라우저 확인 미실행)

## 18. 학생 참고자료

- 과목별 탐색, 검색, 유형 Filter, 공식 사이트 열기, 자료 저장
- 자료 찾기 Modal(`ResourcesTab`)
  - 검색 + 유형 Filter
  - '이 노트에 연결된 자료'와 연결 해제(노트의 출처 카드만 빼고 자료는 남김)
- 파란색은 첫 화면 주요 CTA만 남겼다.
- Before(참고 이미지 19) 대비 After(`student-references-1366`): 개발용 '시연 학생' 배지가 사라졌고 파란 면적이 줄었다. 직접 대조했다.

**검증**
- E2E 자료 찾기 통과 **[이번 실행]**
- 해상도 3종 통과 **[이번 실행]**

→ **PASS**

## 19. 디자인 시스템

- 원칙
  - 흰색·연회색·차콜이 중심이다.
  - 파란색은 주요 동작·선택·포커스에만 쓴다.
  - 정보·D-day는 무채색, 임박·오류만 빨강이다.
- 기존 토큰만 썼다. 새 토큰은 없다: `--as-color-text/-secondary/-tertiary`, `--as-color-fill`, `--as-color-subtle`, `--as-color-line`, `--as-color-danger`. 다크 모드 토큰도 함께 적용된다.

**이번 구간 정리**
- 학생 핵심 화면
  - 상세·목록 D-day, 과목 칩 아이콘, 텍스트 버튼, 피드백 대기 Badge
  - 제출물 Badge, 상태 Pill(blue), 보낸 상태, 안내 링크
- 관리자
  - 원문 근거 쪽 링크(`archive .pageLink`): 회색 + hover
  - `.docStatus done`·`.badgeDone`·`.badge[primary]`·`.linkButton`(밑줄)
  - 검토 `.statusText`·`.doneMark`·`.fileIcon`·`details.more summary`
  - AI `.editedTag`

**왼쪽 강조선 전수 검색** (`border-left`·`inset box-shadow` 2px 이상)
- 남은 것은 4곳이다.
  - 학생 노트 `.quote`·`.readQuote`, 관리자 `.noteQuote`: 인용문 의미, 2px `--as-color-line`(#eaebef) → 유지
  - HWP 구조 Viewer `.controlText`: 인용이 아니므로 얇은 전체 테두리 + 회색 면으로 바꿨다.
- 경고·안내·검토 불가·운영계획 칩의 강조선은 이전 단계에서 이미 제거했다.

**노란색·초록색**
- 완료 점(`--as-color-success`)과 즐겨찾기 별(`--as-color-star`)은 상태·기능 표시다.
- 장식 남용은 찾지 못했다(별도 전수 단언 없음).
- Student Care UI는 변경하지 않았다.

→ **PASS**

## 20. 개발용 문구 정리

**실제(http) 모드에서 일반 사용자에게 보이던 것을 제거·완화**
- 관리자 탭 옆·학생 Home·상세의 '개발 서버·실제 Backend·개발용 Mock·계정' 안내
- 시연 계정 전환 패널: `?devPanel=1`일 때만 보인다.
- '학교 코드 {id}' → '선택한 학교 (이름 확인 안 됨)'
- 이번 구간 처리
  - 모의고사·대학 PDF의 환경 변수·개발 PC 문구
  - 학생 분석 미리보기 오류의 '개발 서버 설정(토큰·Proxy)'·'개발 설정을 확인'
  - '원인: PDF 서버 응답 404'
  - 관리자 이력의 `adm_…` ID
  - '푸시 알림·읽음 표시는 아직 없어요'

**유지한 것 (의도)**
- '시연 데이터'·'시연용 화면' 문구는 모두 Mock 데이터 모드(`isMockDataSource`·`isAdminMockDataSource`) 조건부다. Mock 상태를 감추지 않는 정직한 표시다.
- 관리자 전용의 기술적 진단: PDF 변환기 미설정(415) 안내, 원본 SHA 앞 12자리 대조 기록
- E2E `devText` 정규식(개발 서버·Mock 인증·시연 계정 ID·`subj_`·`adm_`)이 관리자·학생 주요 화면에서 0건이다 **[이번 실행]**

→ **PASS**

---

## 21. 데이터 및 API 계약

- `docs/api/api-contract.md`
  - §13 역전이 허용(DRAFT)
  - 'A27-UX DRAFT 추가 계약': 개인 관리 필드, 상태 이력, §22-1 자료 파일, §10-1-3 학생 공식 원본 `GET /api/student/assessment/evaluation-plans/official`
  - 결과 화면이 쓰는 읽기 API와 A10 ②③ 규칙
- `docs/specs/suyeon/domain.md`
  - 9-2 검토 진행 표시
  - §10-2 A27-UX(되돌리기·개인 관리 정보·Home 두 출처·자료 파일·공식 원본·확정 = 공개)
  - §12-1-1 인라인 서식
  - 이번 구간: 중복 판정 1:1 규칙 문장 추가
- 이번 구간에 새 Endpoint·필드·Migration은 없다.
- 권한
  - 공식 공개 원본은 학생 학적 Context로만 정한다(관리자 업로드 문서를 공식 원본으로 취급하지 않음).
  - AI 분석 결과는 확정분만 학생에게 공개한다.
  - Backend에서 검증한다.

## 22. DB Migration

| Migration | 내용 | 독립 DB | 사용자 DB |
|---|---|---|---|
| `V202611170200__assessment_school_assessment_personal_details.sql` | 개인 관리 열 5개 + 상태 이력 테이블 | Testcontainers·E2E 일회용 DB 적용 **[이번 실행 E2E 포함]** | **미적용** |
| `V202611170300__assessment_resource_file_attachment.sql` | 자료 파일 열 6개 + CHECK | 같음 | **미적용** |

- 사용자 DB 확인 **[이번 실행 11:2x, 읽기 전용]**: `lh-local-run-mysql`의 `flyway_schema_history` 최신 성공 `202611170100`, 위 두 버전 0건
- 비밀번호는 컨테이너 내부 환경 변수만 썼고 출력·기록하지 않았다.
- 기존 Migration은 수정하지 않았다.

## 23. HWP/HWPX 수정 사항 보존

다음 6개 파일의 SHA-256이 시작·끝 모두 6/6 일치했다(`hwp6.sha256`, **[이번 실행]**). 이번에 변환기를 수정하지 않았다.
- `PlanPreviewConverter.java`
- `ProcessPlanPreviewConverter.java`
- `PlanPreviewRenditionService.java`
- `preview-converter/Dockerfile`
- `ConversionDiagnostics.java`
- `ConversionDiagnosticsTest.java`

미리보기 회귀 확인: E2E `preview-subjects`(HWP·HWPX 원문 앱 안 열람·근거 칸 강조)가 통과했다 **[이번 실행]**.

---

## 24. Backend 테스트

| 항목 | 결과 | 시점 |
|---|---|---|
| Unit + ArchUnit `gradlew test` | 402 tests, 0 failed, 1 skipped(`StructureCorpusDumpTest.dump` 수동 도구) | **[기존 실행 02:28]**. 10:40 재실행은 입력 변경이 없어 Gradle UP-TO-DATE(결과 재사용) |
| 전체 Integration `gradlew integrationTest` | 1차 219건 중 187 통과·32 실패. 실패 3개 Class는 모두 Testcontainers MySQL 연결 끊김(환경) | **[기존 실행, ~08:53 종료, 1h15m]** |
| 같은 3개 Class 재실행 | 32/32 통과 | **[기존 실행 08:54]** |

- 한 번에 219건 전부 통과한 실행은 아니다. 1차 + 재실행의 합이다.
- 이번 구간에는 Backend·Migration 변경이 0건이라 다시 실행하지 않았다.

## 25. Frontend 테스트

| 항목 | 결과 | 시점 |
|---|---|---|
| `scripts/verify-frontend.ps1` (student·admin typecheck · oxlint --deny-warnings · build) | PASS | **[이번 실행 11:06, 11:17]** |
| Node Model Unit (student·admin `model/*.test.mjs`) | **20/20** (오병합 시험 1건 추가) | **[이번 실행 11:17]** |

## 26. Assessment E2E

`e2e`에서 `npm run test:assessment` 실행. 일회용 tmpfs MySQL(127.0.0.1:33340, `--rm`), 실제 Backend, Stub 분석기 사용.

| 실행 | 결과 |
|---|---|
| 이번 구간 1회차 (시험 추가 전) | 35/35 **[이번 실행 ~11:05]** |
| 이번 구간 최종 (심화 상세 시험 추가, 관리자 ID·라벨 수정 후) | **36/36 통과 (2.3m)** **[이번 실행 11:17~11:19]** |
| 이전 | 32/32 **[기존 실행 09:46]**, 35/35 **[기존 실행 ~10:42]** |

- 이번에 추가·강화한 시험
  - 해상도 루프에 심화 3화면 추가
  - 심화 상세 1건
  - 결과 화면 `adm_` 미노출 단언
- 단언 약화나 `skip`은 없다.

## 27. Student Care 회귀

| 항목 | 결과 | 시점 |
|---|---|---|
| Backend Student Care IT | 전부 통과 | **[기존 실행 08:53]** |
| Playwright 인수 시험 | 22/22. 1건은 기존 `test.fail()` 예상 실패: 상담 입력 첫 글자 유실, Student Care 영역의 기존 결함이며 손대지 않음 | **[기존 실행 09:35]** |

- 이번 구간에는 Student Care·`frontend/shared`·Backend 변경이 0건이라 다시 실행하지 않았다.
- 관리자 Build(Student Care 화면 포함)는 통과했다 **[이번 실행]**.

## 28. Railway 테스트

**NOT RUN.**
- 이 PC에 기존 합성 문서 manifest(`%USERPROFILE%\.learnershigh-extension\synthetic-a19`)가 없다.
- 실행하려면 새 합성 문서를 생성하고 외부(Railway)로 전송해야 하는데, 승인 전이라 하지 않았다.
- 실제 학교 문서는 전송하지 않았다.

## 29. 브라우저 검증

Playwright Chromium(실제 Backend + 일회용 DB)으로 확인했다 **[이번 실행]**.
- 해상도
  - 1366×768·1600×900·1920×1080: 관리자 Dashboard·평가계획서·분석·월별, 학생 Home·참고자료·심화 3화면 → 가로 넘침 0
  - 800×600: 참고자료실 Modal
- 캡처를 직접 열어 확인한 화면
  - 관리자 결과 2패널(이력 '관리자' 표시)
  - 학생 Home 1366(두 출처 일정·Calendar 라벨 한 줄)
  - 학생 상세 1600(D-20 차콜)
  - 모의고사 상세·대학 상세 1600(무채색·쉬운 안내)
  - 참고자료 1366
  - 참고자료실 Modal 800
- 사용자 로컬 서버(8080/5173/5174)와 사용자 DB로 띄운 수동 클릭 확인은 하지 않았다. 사용자 DB에 Migration이 적용되지 않은 상태라 그 환경에서는 새 필드가 동작하지 않는다(§37).

## 30. 스크린샷

- After(최종): `C:\learnershigh-A27-UX-backup-20261118\screenshots-final\` 35장
- 이전 After: `C:\learnershigh-A27-backup-accountB-20261118-015659\screenshots-after\`(21), `C:\learnershigh-A27-accountB-backup-20261118\screenshots-after-2nd\`(24)
- Before: 별도 캡처는 없다. 사용자 제공 원본 화면 `C:\learnershigh-A27-local-references\A27-reference\image-01~20.png`를 Before로 대조했다.
  - 예: 19 → `student-references`, 07 → 결과·검토 화면
- 그 밖의 화면은 Before가 없다. 코드는 되돌리지 않았다.

---

## 31. Open Decision

| # | 결정 사항 | 현재 | 위험도 | 제안 |
|---|---|---|---|---|
| 1 | 탐구노트 Rich-text 저장 형식(OD-A05) | `text` 유지 + `attrs.marks` 범위 배열. 기존 노트는 marks가 없어 그대로 열린다(호환). 서버는 JSON 보존(계약상 블록 attrs 자유 형식). | 중: Editor 교체 시 변환기가 필요하다. 범위 offset은 UTF-16 기준이다. | DRAFT 유지. 승인 시 api-contract §23에 `marks` Schema(type enum: bold·italic·underline·link, href http(s)만)를 명시하고 Editor 교체 시 marks→새 Schema 변환을 의무화한다. |
| 2 | 공식 수행평가 중복 판정 | Revision + 과목 + 이름 정규화, 학생 연결 1건 = 공식 1건(이번 버그 수정) | 저~중: 학생이 이름을 바꾸면 둘 다 보인다(안전한 쪽). 같은 이름 쌍둥이 중 어느 쪽인지는 구분하지 못한다. | 확정값(§39-8 confirmedFields)에 분석 `itemKey`를 싣고 학생 `evaluationItemRef.itemKey`와 맞춘다 — API 필드 추가와 승인이 필요하다. |
| 3 | 확정 = 학생 공개 | 유지(변경 안 함) | 저: 현재 흐름은 단순하다. 다만 확정 뒤 공개 시점을 늦출 수 없다. | 별도 공개가 필요하면 Review에 `publishedAt`/`visibility`를 추가하고, §10-1 학생 응답 조건 변경, 관리자 '공개' 동작, 이력 표시가 필요하다. Migration 1개와 API 2곳이 바뀐다. |
| 4 | 개인 수행평가 상태 되돌리기 | 허용 + 이력 기록(§13 DRAFT) | 저: 학생 본인 소유 데이터만 해당하고, 이력이 남는다. | 승인 범위: 학생 본인만, 모든 단계 간 이동 허용, 이력 보존 기간, 관리자 화면 이력 노출 여부를 정한다. |
| 5 | 관리자 표시 이름 | '관리자'로만 표시(이번) | 저 | 실제 인증 연동(API-OD-A01) 때 Actor Provider가 표시 이름을 주면 `actorLabel`에서 사용한다. |

## 32. 남은 문제

1. 사용자 DB에 Migration 2개가 미적용이다. 백업 후 적용해야 한다(§37).
2. Railway 합성 E2E를 실행하지 않았다(승인 필요).
3. 자료함 형식별 브라우저 업로드·Drag & Drop 실제 조작을 확인하지 않았다(§17).
4. 한글 IME 실제 입력은 직접 확인이 필요하다(§16).
5. 별도 Before 캡처가 없다(참고 이미지로 대조).
6. 관리자 전체 현황의 Admin Shell Sidebar 배경이 전체 페이지 캡처에서 첫 화면 높이까지만 칠해진다. 기존 Shell 동작으로 보이며 변경하지 않았다.
7. Open Decision 5건(§31)

## 33. 변경 파일 목록

전체 151건은 `C:\learnershigh-A27-UX-backup-20261118\git-status-final.txt`에 있다. 영역별 수는 다음과 같다.

| 영역 | 수 |
|---|---|
| backend/src | 29 (HWP 6 포함) |
| database/migrations | 2 |
| docs | 4 (이 문서 포함) |
| e2e | 10 |
| frontend/admin | 45 |
| frontend/student | 61 |

**이번 구간(10:58~11:22)에 수정한 파일 25개**

- Admin
  - `ai/ai.module.css`
  - `components/PlanReviewConfirmPanel.tsx`
  - `components/structure.module.css`
  - `model/actorLabel.ts`(신규)
  - `review/OverviewStep.tsx`
  - `review/ReReviewPanel.tsx`
  - `review/TeachingPlanHistoryPanel.tsx`
  - `review/TeachingPlanStep.tsx`
  - `review/review.module.css`
  - `routes/PlanResultRoute.tsx`
  - `routes/archive.module.css`
  - `styles/assessmentAdmin.module.css`
- Student
  - `components/enrichment/MockExamPassage.tsx`
  - `components/enrichment/enrichment.module.css`
  - `components/enrichment/mockExam.module.css`
  - `components/pdf-import/AnalysisPreviewModal.tsx`
  - `components/pdf-import/pdfImport.module.css`
  - `components/teaching-plan/monthlyPlanner.module.css`
  - `components/university/PdfViewer.tsx`
  - `components/university/university.module.css`
  - `model/upcomingAssessments.ts`
  - `model/upcomingAssessments.test.mjs`
  - `routes/AssessmentHomeRoute.tsx`
- E2E: `assessment/tests/a27-ux.spec.ts`
- Docs: `docs/specs/suyeon/domain.md`, 이 문서

같은 날 앞선 구간에 수정한 파일
- 학생 CSS 4개(`detail.module.css`, `feedback.module.css`, `SchoolAssessmentListRoute.module.css`, `SchoolAssessmentDetailRoute.module.css`)
- `a27-ux.spec.ts`(참고자료실 Modal 시험)

## 34. Git 상태

- HEAD `9755581`, Branch `integration/assessment-studentcare-20261116`, Staged 0, 미커밋 151건
- `main`(local `d5be566`)은 변경하지 않았다.
- Commit·Push·PR 갱신·Merge·Draft 해제는 하지 않았다.
- 원본 폴더 `C:\learnershigh-extension`: `git status` 68건이 시작·끝 모두 같다. 읽기만 했다.
- 백업 폴더 3개는 모두 보존했다(이번 구간: `C:\learnershigh-A27-UX-backup-20261118\`).
- Docker
  - Engine 29.8.0 정상
  - `lh-local-run-mysql`은 Up이며 접근은 읽기 전용 조회 1회뿐이다.
  - 일회용 E2E DB는 자동 삭제됐다.
  - Volume·컨테이너는 삭제하지 않았다.

## 35. Commit 준비 상태

**점검 결과** (이번 실행)
- 산출물(`bin/`·`build/`·`dist/`·`node_modules/`·`test-results/`·`.env`·`.log`·`.tar`)이 변경 목록에 0건이다.
- 민감 정보 패턴(password·secret·api key·token 하드코딩)이 0건이다.
- Untracked 47건이 모두 의도한 소스·시험·Migration·문서다.

**의존 관계**
- 관리자 코드가 학생 쪽 파일 15개를 import한다: `devContext`, `MonthlyPlanner`, `api/types`, `InlineText`, `NoteSection`, `PdfViewer`, 각종 CSS 등.
- 그래서 학생 Commit이 관리자보다 먼저 와야 한다.
- 학생 Frontend는 새 Backend 필드를 런타임에만 쓰므로, Backend를 먼저 두면 각 단계가 빌드된다.

**제안 순서** (승인 후 각 Commit마다 `verify-frontend.ps1`·`gradlew test`로 단계 빌드를 확인. 아직 단계별 빌드는 미검증)

| 순서 | 내용 | 대상 |
|---|---|---|
| 1 | `fix(assessment): HWP/HWPX PDF 변환 수식 오류·진단 개선` | HWP 6개 |
| 2 | `feat(assessment): 개인 수행평가 관리 정보·상태 이력·자료 파일·공식 원본 경계` | backend 23 + Migration 2 + Backend 시험 + `api-contract.md` + `domain.md` |
| 3 | `feat(assessment): 학생 Dashboard·개인 수행평가·탐구노트 서식·자료함·디자인 정리` | `frontend/student/**` 61 |
| 4 | `feat(assessment): 관리자 탭·Dashboard·평가계획서 6칸·분석/결과 조회·4단계 확정·디자인 정리` | `frontend/admin/**` 45 |
| 5 | `test(assessment): A27-UX E2E와 4단계 확정 공용 Helper` | `e2e/**` 10 |
| 6 | `docs(assessment): A27-UX 최종 보고서` | 보고서 2개 |

- 요청 예시의 8단위(Dashboard / 결과·확정 / 학생 / 노트·자료함 / 디자인 …)로 더 쪼개려면 같은 파일 안 변경을 Hunk 단위로 나눠야 한다. 이 경우 중간 Commit이 빌드되지 않을 위험이 크다.
  - 예: `archive.module.css`, `AssessmentHomeRoute.tsx`, `review.module.css`에 여러 기능 변경이 섞여 있다.
  - 그래서 영역 단위 6개를 권장한다.

## 36. 최종 판정

| 구분 | 판정 |
|---|---|
| 관리자 Dashboard·탭·월별 운영계획 | PASS |
| 평가계획서 원본 관리 | PASS |
| AI 분석 Tab | PASS |
| 분석 결과 조회·비교 | PASS |
| 관리자 검토·확정 | PASS |
| 심화 콘텐츠 | PASS |
| 관리자 참고자료실 | PASS |
| 학생 Dashboard | PASS |
| 학생 수행평가 | PASS (정책 DRAFT) |
| 탐구노트 | PASS (저장 형식 DRAFT, IME 수동 확인 필요) |
| 자료함 | PARTIAL |
| 학생 참고자료 | PASS |
| 디자인 시스템·개발 문구 | PASS |
| 데이터·API 계약 | PASS (DRAFT 항목 승인 대기) |
| DB Migration | PARTIAL (독립 DB만, 사용자 DB 미적용) |
| HWP/HWPX 보존 | PASS |
| Backend Unit / Integration | PASS (기존 실행, IT는 1차 + 환경 실패 재실행 합산) |
| Frontend | PASS (이번 실행) |
| Assessment E2E | PASS 36/36 (이번 실행) |
| Student Care 회귀 | PASS (기존 실행) |
| Railway 합성 E2E | NOT RUN |
| Before/After | PARTIAL (After 35장 + 참고 이미지 대조) |

**종합: PARTIAL**
- 기능 구현과 핵심 검증은 끝났다. FAIL은 없다.
- 남은 것은 사용자 DB 적용, Railway, 형식별 업로드·IME 수동 확인, Open Decision 승인이다.

## 37. 사용자가 직접 확인할 사항

1. **사용자 DB 백업 후 Migration 적용**
   - 사용자 Backend를 다시 띄우면 Flyway가 `V202611170200`·`V202611170300`을 적용한다.
   - 먼저 백업한다. 예: `docker exec lh-local-run-mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u"$MYSQL_USER" "$MYSQL_DATABASE"' > lh_local_run-before-a27.sql`
2. 로컬 화면 직접 확인
   - 관리자 `/assessment`, `/assessment/evaluation-plans`(원본 보기·개정 이력), 확정 문서의 '결과 보기'(원문 2패널·검토 비교·확정 이력 '관리자')
   - 학생 `/assessment`(두 출처 일정), 수행평가 상세(되돌리기·피드백·자료 찾기)
3. 탐구노트에서 한글로 빠르게 입력하며 B·I·U·링크 적용, 새로고침 후 복원 확인
4. 자료함에 HWP·DOCX·XLSX·WEBP 등을 실제로 올리고(Drag & Drop 포함) 내려받기·미리보기 확인
5. Railway 합성 E2E 실행 여부(새 합성 문서 생성 + 외부 전송 승인)
6. Open Decision 5건(§31) 팀 결정
7. Commit 승인과 §35 순서 확정

---

# 부록 A. 관리자 Assessment UI 개선 (참고 이미지 04~17, 2026-11-18 오후 ~ 11-19)

- 지시: `C:\learnershigh-A27-local-references\A27-admin-ui-20261118\A27-UX-ADMIN-UI-FULL-PROMPT-20261118.md`. **관리자 화면만** 수정했다. 학생 화면은 다음 단계다.
- 참고 이미지: 17장(README의 SHA-256 17/17 일치). 01~17을 모두 이미지로 열어 확인했다.
- 백업: `C:\learnershigh-A27-UX-admin-backup-20261118\`
  - 시작 Git 상태·Diff·Untracked·해시
  - 로그
  - 최종 캡처 `screenshots-final4\`(53장)
- 사용자 DB 확인 (읽기 전용): `flyway_schema_history`에서 `202611170200`·`202611170300` 모두 `success=1`(2026-11-18 02:42 UTC 적용). 본문 §22의 '미적용'은 그 이전 시점 기록이다.

## A1. 디자인 기준 (이미지 01~03 · Daglo · TDS)

**Toss Payments에서 가져온 것**
- 제목 → 필터 → 한 카드 안 KPI 4칸(얇은 세로 구분선 + 컬러 원형 아이콘)
- Calendar 오른쪽의 보조 패널(바로가기·최근 활동)
- 둥근 카드와 약한 그림자
- 활동 점 색(평가계획서 파랑·분석 보라·확정 초록·피드백 주황)
- 결제 숫자·로고·문구는 쓰지 않았다.

**TDS Stepper** (공식 문서 확인)
- StepperRow 구조: 왼쪽 번호 아이콘 · 가운데 제목/설명 · 행 사이 연결선 · 마지막 행 선 없음
- TDS에는 완료·현재 상태 prop이 없다. 그래서 기존 확정 조건 계산값으로 ✓와 현재 단계(파란 번호)만 덧붙였다.
- 데스크톱 번안: 넓을 때 왼쪽 세로 목록, 좁은 패널에서 한 줄 4칸

**색 원칙**
- 브랜드 블루: 핵심 동작(확정·검토하기), 선택, 포커스, 확정(학생 공개) 배지
- 정보용 컬러 아이콘은 절제해서 쓴다.
- 일반 버튼: [08]의 '학년도별 열람' 계열 중립 outline(`review.button`)으로 통일했다.

## A2. 이미지별 결과

| # | 이미지에서 확인한 문제 | 수정 | 주요 파일 | 검증 | 판정 |
|---|---|---|---|---|---|
| 04 | 탭 밑줄 바로 아래 Dropdown이 붙음, KPI가 따로 떨어진 카드 | 제목 행으로 탭·필터 분리. KPI 한 카드 4칸 + 아이콘. Calendar + 오른쪽 바로가기·최근 활동. 담당 학생은 아래 전체 폭(유지). 빈 Calendar 안내 카드. 1440px 미만은 보조 패널을 아래 2열로 | `OverviewRoute.tsx`, `overview.module.css` | E2E `[04]` 3해상도(탭-필터 간격 ≥16px, 아이콘 4, 가로 넘침 0, 학년 변경 반영). 캡처 확인 | PASS |
| 05 | 담당 선생님·정보 출처·연결된 심화 탐구 줄. "(§12 계약 필드 없음)" 개발 문구. 학생 입력값이 '미등록'으로 보임 | 세 줄·개발 문구 제거(서버 필드·API 그대로). 학생 입력값(유형·평가일·반영 비율·제출물) 표시, 없으면 평가계획서 후보. 개인 메모 비노출. '평가계획서 연결' 상태 | `StudentRecordRoute.tsx` | E2E `[05]`, 캡처 확인 | PASS |
| 06 | 의견 버튼이 블록 위쪽에 붙음 | 블록 높이 기준 세로 가운데·오른쪽 12px, 본문은 버튼 자리 비움, hover·focus 표시 | `NoteReadView.tsx`, `assessmentAdmin.module.css` | E2E: 제목·긴 문단 모두 중심 오차 ≤2px, 오른쪽 여백 ≥8px, 키보드 포커스. 캡처 확인 | PASS |
| 07 | '심화 탐구 Task 추천'·'모의고사 탐구 소재 추천' | 두 영역 제거(다른 화면·기능 그대로). 이전 초안의 그 추천은 '이전에 고른 추천'으로 보이고 뺄 수 있음(숨겨 보내지 않음). 스크랩 추천은 링크 있는 스크랩만 | `FeedbackDetailRoute.tsx` | E2E 문구 없음, 캡처 확인 | PASS |
| 08 | '학년도별 열람', 파란 채움 '평가계획서 등록' | 버튼·화면(`PlanArchiveRoute`) 제거, 예전 주소는 6칸으로. 등록은 중립 outline. 6칸·원본 보기·개정 이력·업로드·논리 삭제·분석 연결 유지. 문서 상세(`DocumentDetail`)는 결과 조회에서 사용 | `PlanSlotsRoute.tsx`, `PlanArchiveRoute.tsx`, `paths.ts`, `AssessmentAdminRoute.tsx` | E2E `[08]` 3해상도. `plan-archive`·`preview-subjects`는 진입로만 6칸 Filter·결과 조회(왼쪽 원문 패널)로 옮기고 상세 단언 유지 | PASS |
| 09 | 검정 채움 '검토 시작' vs 텍스트 'AI 결과 보기', 등록일 두 줄, '학교 Master 미연결' 문구 | 두 버튼 같은 중립 outline, 등록일 한 줄, 개발 문구 제거(학교 코드 열기 유지) | `EvaluationPlansRoute.tsx`, `review.module.css` | E2E: 두 버튼 계산 스타일 동일, 등록일 1줄. 캡처 확인 | PASS |
| 10 | 검정 채움 '과목 확인하기' | 중립 outline | `OverviewStep.tsx` | E2E 배경색, 캡처 | PASS |
| 11 | 근거 링크가 값 옆 한 줄에 몰림, 하단에 `adm_demo_b01` | 필드 행 2줄 그리드(항목·값·상태·버튼 / 근거), 버튼 34px·최소 64px. 근거는 회색 보조 링크. 관리자 ID → '관리자'(진단 모드만 ID) | `PerformanceStep.tsx`, `review.module.css`, `ReviewWorkspace.tsx`, `model/actorLabel.ts` | E2E: 버튼 높이 일관, `adm_` 없음. 캡처 | PASS |
| 12 | 'Outside This Term'·점선 칩이 왼쪽 구분선에 붙음 | 관리자 표시에서 세로 묶음 + 여백 18px + 묶음 사이 구분선. 의미·데이터 그대로 | `MonthlyPlanner.tsx`(공용 — `mode='admin'` 또는 새 선택 prop `adminBands`일 때만), `monthlyPlanner.module.css` | E2E(띠가 있을 때 `data-inset`), 캡처 | PASS |
| 13 | '달을 정할 수 없는 계획' 라벨·간격 | 관리자 표시에서 'Plans Without a Fixed Month' + [12] 여백. 관리자 전체 현황·월별 탭도 같은 표기(`adminBands`). 학생 문구 그대로 | 위 + `OverviewRoute.tsx`, `MonthlyPlanTabRoute.tsx` | E2E 단언, 1366 캡처 확인 | PASS |
| 14 | 달력 아래 모든 과목 상세 나열, '[확인 필요] ROWS_WITHOUT_TIME:4/42 (teachingPlan)' | '과목별 상세' 선택기(원문 학년·같은 이름 구분·행 수)로 한 과목만 표시, 처음은 행·확인 항목 있는 첫 과목. 달력은 전체 그대로. 과목 연결 선택은 상세 안 유지. 이슈 코드는 문장으로(원 코드는 진단 모드) | `TeachingPlanStep.tsx`, `review.module.css` | E2E: 선택기, 상세 섹션 1개, 내부 코드 없음. 캡처 | PASS |
| 15 | HWP 최종 확정이 1~4 목록 한 화면, 작은 체크박스, `fieldPath` 노출 | PDF·HWP·HWPX 모두 TDS식 세부 Stepper(원본 대조 → 과목 연결 → 필드별 검토 → 요약·확정). HWP 필드는 과목별 카드·큰 '확정 대상에 넣기' 토글(40px)·진행 수·과목 이동·근거 위치 칩. 일괄 승인 없음, 서버 검증·확정 조건 그대로, 확정은 파란 주 버튼, 오류 코드는 진단 모드만 | `ConfirmStepper.tsx`(신규), `ConfirmStep.tsx`, `PlanReviewConfirmPanel.tsx`, `review.module.css` | E2E `[15]`(Stepper 4행·현재 단계·4/4 이동·확정 비활성·남은 이유·'모두 확인' 없음), PDF 확정 흐름(`evaluation-flow`·`a12`·`a15`) 회귀. **HWP 패널 브라우저 조작 없음** | PARTIAL |
| 16 | 과목 칩 세 줄, 긴 안내, 탭 세로 스크롤 화살표, 목록·상세 빽빽 | 과목 한 줄 띠 + '과목 n/전체'(선택 차콜 채움), 짧은 범례, 탭 스크롤 제거, 좁은 패널에서 목록·상세 세로, 요약 KPI 한 카드 + 진행률(n/전체·%), 단계 배지(확정만 파랑). 2패널·읽기 전용·탭 데이터 유지 | `PlanArchiveRoute.tsx`(`DetailBody`), `archive.module.css`, `PlanResultRoute.tsx`, `planResult.module.css` | E2E `[16]` 3해상도(원문 패널·배지·n/전체·확정 전 '확정' 0·가로 넘침 0), 캡처 확인 | PASS |
| 17 | 링크 저장만 가능 | '자료 업로드'(선택·Drag & Drop·사전 검사·제목/유형 자동·메타정보·올리는 중·실패 안내), 목록에 유형 태그·사진 썸네일·크기·'관리자 전용', 미리보기(PDF·사진·MP4/WEBM 재생)·내려받기·바꾸기·파일 빼기. 서버 저장·권한 구현(A3) | `ReferenceLibraryRoute.tsx`, `components/ScrapFileView.tsx`, `model/scrapFiles.ts`, `scrapModal.module.css`, API 3파일 | IT `AdminReferenceFileApiTest` 4건, E2E `[17]`(MP4·PNG 업로드 → 새로고침 유지 → 재생 → 내려받기 이름 → 휴지통, exe 거절, 공개 불가 표시), 캡처 확인 | PASS |

## A3. 관리자 참고자료 업로드 (§43-1 DRAFT)

**API** (계약 먼저 추가)
- `POST /reference-library/uploads`: multipart `metadata`(JSON) + `file`
- `POST·DELETE·GET /reference-library/{id}/file`
- `GET .../file/preview`

**허용 형식** (확장자 + 파일 서명 둘 다)
- 학생 자료함과 같은 문서·사진
- 관리자 전용 영상: MP4·M4V·MOV(`ftyp`), WEBM(EBML)
- 학생 자료함·결과물 허용 형식은 그대로다(IT: 학생 MP4 415).

**한도·저장**
- 크기: 50MB 초과 413, 빈 파일 400
- 저장: 기존 격리 Storage(UUID 키, 원래 이름은 표시용), 다운로드 전 크기·SHA 재확인, `nosniff`·`no-store`
- 미리보기: PDF·사진·MP4·WEBM만. 그 밖은 '미리보기 없음' + 내려받기

**권한**
- 관리자 전용이고, 휴지통 스크랩은 404다.
- 학생 Endpoint는 없다.
- 링크 없는 업로드 스크랩은 **학생 공개 400·피드백 추천 제외**(학생이 파일을 받을 수 없음 — 화면은 '관리자 전용' 표시)

**DB**: 새 Migration 없음. `V202611170300` 파일 열을 `owner_type=ADMIN`에 사용한다. 사용자 DB는 변경하지 않았다.

**제약**: 영상 50MB 한도, Range 스트리밍 없음, 영상 썸네일 없음.

## A4. 검증 (이번 구간에 실제 실행)

| 항목 | 결과 | 시각 (KST) |
|---|---|---|
| Backend Unit + ArchUnit | 402 tests, 0 failed, 1 skipped | 11-18 14:54, 15:26 |
| 관련 IT: `AdminReferenceFileApiTest` 4 · `ResourceFileApiTest` 3 · `AssessmentUxCompletionApiTest` 4 · `StudentRecordExtrasApiTest` 3 | 14/14 | 11-18 14:54~14:56, 15:26~15:28 |
| `scripts/verify-frontend.ps1` (student·admin typecheck·oxlint·build) | PASS | 11-18 15:22, 15:28, 15:34 |
| Node Model Unit | 20/20 | 11-18 15:34 |
| Assessment E2E 전체 | 42/42 | 11-18 15:22~15:26 |
| Assessment E2E 전체 | 42/42 | 11-18 15:29~15:32 |
| Assessment E2E 전체 (`adminBands` 추가 후) | 1차: 39 통과·3 실패 | 11-18 15:34 시작, 14.6h 경과 |
| 같은 전체 재실행 | **42/42** | 11-19 06:14~06:18 |

- 1차 실패 3건(`a27-ux` 1920 해상도·`evaluation-flow` 2건)은 같은 시간대의 90초 타임아웃이었고 워커가 강제 종료됐다. PC 절전으로 보이는 실행 중단이며, 같은 코드 재실행에서 모두 통과했다.
- 전체 Backend Integration(219건)은 이번에 돌리지 않았다. 바뀐 Backend는 참고자료(스크랩) 경로뿐이라 관련 IT 4개 클래스만 실행했다.
- Student Care Playwright도 돌리지 않았다. Student Care·`frontend/shared` 변경은 0건이다.
- 브라우저 확인은 Playwright Chromium(실제 Backend·일회용 DB)으로 했다. 직접 연 캡처: Dashboard 1366/1600, 분석 목록, 기록 도구, 피드백, 검토 4·5단계, 결과 1600, 참고자료실. 사용자 로컬 서버(5174)에서 손으로 조작한 확인은 하지 않았다.

## A5. 변경 파일 (이 구간)

- **신규**
  - Backend: `AdminReferenceFileService.java`, `AdminReferenceFileApiTest.java`
  - Admin: `review/ConfirmStepper.tsx`, `components/ScrapFileView.tsx`, `model/scrapFiles.ts`
  - E2E: `tests/a27-admin-ui.spec.ts`
- **수정**
  - Backend: `AdminRecordController`, `ResourceDtos`, `ResourceService`, `ArtifactFileTypes`
  - Admin: `assessmentAdminApi`, `adminRecordsHttp`, `types`, `assessmentAdminMock`, `NoteReadView`, `PlanReviewConfirmPanel`, `ConfirmStep`, `OverviewStep`, `PerformanceStep`, `ReviewWorkspace`, `TeachingPlanStep`, `review.module.css`, `AssessmentAdminRoute`, `EvaluationPlansRoute`, `FeedbackDetailRoute`, `MonthlyPlanTabRoute`, `OverviewRoute`, `PlanArchiveRoute`, `PlanResultRoute`, `PlanSlotsRoute`, `ReferenceLibraryRoute`, `StudentRecordRoute`, `paths`, `archive.module.css`, `overview.module.css`, `planResult.module.css`, `scrapModal.module.css`, `assessmentAdmin.module.css`
  - 학생 쪽 공용 컴포넌트(관리자 전용 선택지만 추가, 학생 기본 동작 무변경): `MonthlyPlanner.tsx`, `monthlyPlanner.module.css`
  - E2E: `plan-archive.spec.ts`, `preview-subjects.spec.ts`
  - 문서: `api-contract.md`(§43-1), `domain.md`(10-2), 이 부록
- **Git**: 151 → 165건(M 110 · D 2 · ?? 53). HEAD `9755581`. Commit·Push·PR 갱신 없음.
- **보존**: HWP 6/6 일치, 원본 폴더 68건 동일. 사용자 DB는 읽기 1회뿐, 일회용 DB만 사용했다.

## A6. 남은 것

1. [15] HWP·HWPX 확정 Stepper를 브라우저에서 실제 조작한 검증이 없다(Stub에서는 HWP 공식 확정을 서버가 관리자 인증으로 거절 — 기존과 같음). 실제 HWP 문서로 직접 확인이 필요하다.
2. [17] 영상 50MB 한도, Range 스트리밍 없음, 영상 썸네일 없음.
3. 학생 화면 개선은 다음 단계다.
4. Commit 계획(§35)
   - 2단계 Backend에 §43-1 파일(`AdminReferenceFileService`, Controller, DTO, `ResourceService`, `ArtifactFileTypes`, IT)을 더한다.
   - 3단계 학생 Frontend에 `MonthlyPlanner` 선택 prop 변경을 함께 넣는다. 관리자 Frontend가 이를 import하므로 순서는 그대로다.


# 부록 B. 관리자 추가 수정 (이미지 01~06, 2026-11-19)

- 지시: `C:\learnershigh-A27-UX-admin-references\LearnersHigh_A27_UX_Admin_Additional_ClaudeCode_Prompt_20261119.md`와 사용자가 덧붙인 **과목 Dropdown 정책**을 따랐다.
  - 화면에 학교명·출처·'개설 과목' 문구를 보이지 않는다.
  - 범용 고등학교 과목 카탈로그는 검색 후보로만 쓴다.
  - 실제 연결은 선택한 학교의 학업 과목만 허용한다.
- 관리자 화면만 수정했다.
  - 학생 화면의 tracked diff는 이번 라운드 시작 백업과 바이트 단위로 같다(245,109 bytes, 비교 스크립트로 확인).
  - 공용 컴포넌트도 수정하지 않았다.
- 백업: `C:\learnershigh-A27-UX-admin2-backup-20261119\`
  - 시작 Git 상태·Diff·Untracked tar·HWP SHA, 로그, 캡처 `screenshots-final\`(10장)
  - **주의**: 이 백업은 Backend DTO·Service 편집을 일부 시작한 **뒤에** 만들었다. 그래서 `PlanReviewDraftRequest`·`PlanReviewDraftResponse`·`PlanReviewDraftService`의 이번 라운드 이전 상태는 이 백업에 없다. 그 이전 상태는 부록 A 백업(`C:\learnershigh-A27-UX-admin-backup-20261118\`)에 있다.

## B1. 이미지별 결과

| # | 요구 | 구현 | 주요 파일 | 검증 | 판정 |
|---|---|---|---|---|---|
| 01 | 과목 '이 문서 검토 대상에서 제외' / 되돌리기, 사유, 확인 다이얼로그, 확정·진행률에서 일관 제외, 서버 저장 | 과목 확인 단계의 행마다 '제외' 버튼이 있다.<br>• 다이얼로그: '삭제가 아니에요' 안내, 영향 범위, 확정본이 있을 때 재검토 안내, 사유(다른 학년 과목·중복 추출·현재 학기와 무관·기타), 메모 200자<br>• 원문 학년이 슬롯과 다르면 사유 기본값이 '다른 학년 과목'이다.<br>• 제외한 과목은 '제외됨 · 사유 · 메모'와 '되돌리기'로 표시한다.<br>• 수행평가·채점기준·운영계획·최종 확정 대상과 진행 수에서 뺀다(제외를 완료로 세지 않음). 하단에 '제외 n과목(m항목)'을 따로 보인다.<br>• 원문·AI 원본·근거·이미 확인한 값·확정 이력은 그대로 남는다.<br>• 서버 검토 초안(§39-4)에 저장되어 새로고침해도 유지된다.<br>• 서버는 제외 과목의 확정을 `subject_excluded`로 거절한다(평가 정보·운영계획 모두). | `PlanReviewDraftRequest/Response`, `PlanReviewDraftService`, `EvaluationPlanService`, `TeachingPlanReviewService`, `SubjectStep.tsx`, `ReviewWorkspace.tsx`, `ConfirmStep.tsx`, `TeachingPlanStep.tsx`, `useServerDraft.ts`, `reviewModel.ts`, `review.module.css` | • IT `SubjectExclusionApiTest` 3건: 저장·조회·구 클라이언트 저장 시 유지·되돌리기 / 검증 400 / 확정 거절 → 되돌린 뒤 200<br>• E2E `[01]`: 1학년 문서에 2학년 과목 포함 → 제외 → 서버 초안 확인 → 새로고침 유지 → 확정 단계 '제외 1' → 되돌리기<br>• 캡처 확인 | PASS |
| 02 | 4단계 과목 제목 옆 두 번째 Dropdown 제거, 연결 과목은 텍스트, 2단계 링크 | 상단 '과목별 상세' 선택 하나만 남겼다.<br>• 과목 제목 옆 `select`를 제거했다.<br>• 연결 과목은 텍스트로 보이고, '과목 확인에서 바꾸기/연결하기' 버튼으로 2단계로 간다. | `TeachingPlanStep.tsx` | E2E `[02]`(운영계획 단계에 과목 select 0개, 2단계 이동). 기존 a13·a14·teaching-plan·a18 시험은 '2단계에서 연결 → 운영계획' 흐름으로 바꿨다. | PASS |
| 03·04 | 학년별 과목 후보(1학년 = 1·2학기 합집합, 2·3학년 = 통합), 학교 과목만 연결, 없으면 '관리자 확인 필요', 별칭 검색, 키보드, 잘못된 연결 원인 교정, 단일 학교 하드코딩 금지 | **카탈로그** `courseCatalog.ts`<br>• 1학년 21개, 2·3학년 88개(평가계획서 목차 70 + 2022 개정 교육과정 18)<br>• 학교명·출처 필드가 없다. 수집 근거(`basis`)는 내부 값으로만 쓰고 화면에 보이지 않는다.<br>• 로마숫자와 띄어쓰기를 정규화해 검색한다.<br>**선택 화면** `SubjectSearchSelect`<br>• 학교 학업 과목만 고를 수 있다.<br>• 카탈로그에만 있는 후보는 '연결 가능한 학교 과목 없음' 아래 비활성(`aria-disabled`) + '관리자 확인 필요'로 보인다. 이름이 비슷해도 자동으로 같은 과목으로 보지 않는다.<br>• ↑/↓, Enter, Esc를 지원한다.<br>**'통합과학2 → 공통영어2' 원인**<br>• 운영계획 초안이 첫 행을 결정할 때 평가정보 연결을 복사해 두었다. 그 뒤 2단계에서 연결을 바꿔도 이 복사본이 우선해서 남았다.<br>• 교정: 2단계 연결(없으면 확정 연결)을 기준으로 삼는다. 어긋난 연결은 안내하고, 행을 결정하거나 저장할 때 맞춘다. | `courseCatalog.ts`(신규), `courseCatalog.test.mjs`(신규), `SubjectSearchSelect.tsx`, `subjectSearchSelect.module.css`, `TeachingPlanStep.tsx`, `reviewModel.ts`(`confirmedSubjectLinks`), `ConfirmStep.tsx`·`PlanReviewConfirmPanel.tsx`(`catalogGrade`) | • Node `courseCatalog.test` 4/4<br>• E2E `[03]`: 비활성 후보는 강제로 클릭해도 선택되지 않음, 학교명·'출처'·'개설 과목'·'평가계획서 기반' 문구 없음, '공통 국어' 띄어쓰기 검색<br>• 드롭다운 캡처 확인<br>• 카탈로그 이름은 로컬 `pdftotext` 대조로 112/113 일치(1건은 표기 정규화 차이). 외부 전송 없음. | PASS (2·3학년 유연 검색 화면 E2E는 1학년 슬롯 Fixture만 있어 단위 시험으로만 확인) |
| 05 | 결과 조회 좌우 분할 드래그·키보드, 30~70%, 기본 약 45:55, 검토 화면 구현 재사용 | 공용 훅 `useSplitPane`(포인터 캡처, ←/→ ±5, Home/End, `role=separator`, `aria-valuenow`, 브라우저별 기억)을 새로 만들었다.<br>• 검토 화면은 이 훅으로 바꿨다(기본 52, 동작 동일).<br>• 결과 조회는 기본 45다.<br>• 결과 영역은 최소 380px을 남긴다.<br>• 1100px 이하에서는 기존처럼 원문/결과 전환 버튼을 쓴다. | `review/useSplitPane.ts`(신규), `ReviewWorkspace.tsx`, `PlanResultRoute.tsx`, `planResult.module.css` | E2E `[05]`<br>• 1366·1600·1920에서 가로 넘침 0<br>• 드래그로 원문 폭 +80px 이상<br>• ← = −5, End = 70<br>• 70%일 때 결과 패널 370px 이상<br>• 새로고침 뒤 70 유지<br>• 3해상도 캡처 확인 | PASS |
| 06 | 결과 조회 과목 칩 → 검색형 단일 Dropdown + '과목 n/전체', 하위 탭 동기화, 읽기 전용, 제외·미연결 구분 | `ResultSubjectPicker`<br>• 과목명, 원문 학년, 같은 이름일 때 순번, 상태 태그(제외됨 / 학업 과목 미연결 / 확정 n / 확정 전)를 보인다.<br>• 검색, ↑/↓, Enter, Esc를 지원한다.<br>• 과목 칩 띠를 없앴다.<br>• 과목을 바꾸면 하위 탭은 유지하고, 고른 수행평가 항목은 처음으로, 스크롤은 위로 간다.<br>• '검토 비교'는 고른 과목만 보인다(탭 안의 과목 select는 제거).<br>• '확정 이력'은 차수마다 이 과목의 확정값 수를 덧붙인다.<br>• 선택은 URL `subject`로 유지된다. | `components/ResultSubjectPicker.tsx`(신규), `resultSubjectPicker.module.css`(신규), `PlanResultRoute.tsx`, `PlanArchiveRoute.tsx`(`DetailBody` 칩 제거) | • E2E `[06]`: '과목 1/3', 칩 띠 0개, 3번째 과목 선택 시 '원문 2학년' 표시, 월별 운영계획 탭 유지, 검색 + Enter, 검토 비교에서 새로고침 뒤 '과목 2/3' 유지<br>• `plan-archive`·`preview-subjects`·`a27-admin-ui [16]`은 단일 선택에 맞게 단언을 고쳤다(확정값·과목별 수행평가 수 단언은 그대로).<br>• 캡처 확인 | PASS ('제외됨' 태그의 결과 화면 표시는 E2E로 단언하지 않았다) |

## B2. 계약·DB

- `docs/api/api-contract.md` §39-4에 `subjectExclusions` 항목을 넣었다(**DRAFT**).
  - 형식: `{subjectIndex 0~49, reason OTHER_GRADE|DUPLICATE|NOT_THIS_TERM|OTHER, note ≤200}` 최대 50개
  - EVALUATION 범위 초안에서만 쓸 수 있고, TEACHING 범위에서는 `not_allowed`다.
  - `null`을 보내면 기존 값이 유지된다(구 클라이언트 호환).
  - 확정할 때 `subject_excluded`로 거절한다.
  - 초안을 다시 열면 빈 목록이다.
- **Migration 없음.** 기존 `payload_json`(MEDIUMTEXT)에 함께 저장한다. 사용자 DB는 읽지도 바꾸지도 않았고, 시험은 일회용 DB(Testcontainers, E2E tmpfs MySQL 33340)만 썼다.
- 과목 카탈로그는 Frontend 상수다(API·DB 아님). 실제 연결 대상은 여전히 `getPlanSubjects`(학교 학업 과목)이고, 서버가 확정할 때 `subjectId`를 검증한다.

## B3. 검증 (이번 구간에 실제 실행, KST)

| 항목 | 결과 | 시각 |
|---|---|---|
| IT `SubjectExclusionApiTest` 3 · `PlanReviewDraftApiTest` 7 · `AllGradesPlanSlotApiTest` 2 | 12/12 | 11-19 08:29~08:30 |
| `scripts/verify-frontend.ps1` (student·admin typecheck·oxlint·build·test) | PASS | 11-19 08:45 무렵 (모든 Frontend 수정 뒤) |
| Node Model Unit `courseCatalog` 4 · `planReviewComparison` 4 | 8/8 | 11-19 08:50 무렵 |
| E2E 변경분 (`a27-admin-extra` + a13·a14·teaching-plan·plan-archive·preview-subjects) | 1차 13 통과·1 실패(`[03]` 비활성 후보 클릭 대기 — 시험 코드 문제) → 수정 후 `a27-admin-extra` 3/3 | 08:46~08:49, 재실행 36초 |
| Assessment E2E 전체 | 1차 44 통과·1 실패(`a27-admin-ui [16]`이 옛 위치에서 '과목 n/전체'를 찾음 — 시험 단언 갱신) | 08:50~08:54 |
| Assessment E2E 전체 재실행 | **45/45** | 08:54~08:58 |
| Backend Unit + ArchUnit (`gradlew test`) | 402 tests, 0 failed, 1 skipped | 08:58~08:59 |
| 관련 IT: SubjectExclusion 3 · PlanReviewDraft 7 · TeachingPlanReview 14 · EvaluationPlan 9 · PlanReReview 2 · StructuredPlanReview 3 · AllGradesPlanSlot 2 | **40/40** | 08:59~09:02 |

- 실행하지 않은 것:
  - 전체 Backend Integration
  - Student Care Playwright(그 영역 변경 0건)
  - `e2e/assessment-real/a18-grades.spec.ts`: 실제 분석기 문서용이라 실행 환경이 없다. 과목 연결 단계만 새 흐름으로 바꿨고, 타입 검사(`tsc -p e2e`)는 통과했다.
- 브라우저 확인: Playwright Chromium(실제 Backend·일회용 DB) 캡처 10장을 직접 열어 봤다. 사용자 로컬 서버에서 손으로 조작하지는 않았다.

## B4. 변경 파일 (이 구간)

- **신규**
  - Backend: `SubjectExclusionApiTest.java`
  - Admin: `model/courseCatalog.ts`, `model/courseCatalog.test.mjs`, `review/useSplitPane.ts`, `components/ResultSubjectPicker.tsx`, `components/resultSubjectPicker.module.css`
  - E2E: `assessment/tests/a27-admin-extra.spec.ts`
- **수정**
  - Backend: `PlanReviewDraftRequest`, `PlanReviewDraftResponse`, `PlanReviewDraftService`, `EvaluationPlanService`, `TeachingPlanReviewService`
  - Admin: `api/types.ts`, `review/useServerDraft.ts`, `review/reviewModel.ts`, `review/SubjectStep.tsx`, `review/TeachingPlanStep.tsx`, `review/ReviewWorkspace.tsx`, `review/ConfirmStep.tsx`, `review/review.module.css`, `components/SubjectSearchSelect.tsx`, `components/subjectSearchSelect.module.css`, `components/PlanReviewConfirmPanel.tsx`, `routes/PlanResultRoute.tsx`, `routes/planResult.module.css`, `routes/PlanArchiveRoute.tsx`
  - E2E: `assessment/reviewUi.ts`(`linkSubjectThenTeaching`·`pickResultSubject`), `a13-flows`, `a14-flows`, `teaching-plan`, `plan-archive`, `preview-subjects`, `a27-admin-ui`, `assessment-real/a18-grades`
  - 문서: `api-contract.md`(§39-4), 이 부록
- **Git**: 181건(M 119 · D 2 · ?? 60). HEAD `9755581`. Commit·Push·PR 갱신 없음.
- **보존**
  - HWP 6/6 SHA 일치
  - 원본 폴더 `C:\learnershigh-extension` 68건 그대로
  - 사용자 DB 접근 없음
  - 실제 학교 PDF 외부 전송 없음
  - 변환기·AI 분석기 수정 없음
  - 학생 화면 diff 무변경

## B5. 남은 것·위험

1. **Open Decision**: `subjectExclusions`는 DRAFT 계약이다.
   - 확정한 뒤 초안을 다시 열면 제외 목록이 비어 시작한다. 확정 기록에 제외 사유를 남길지는 정하지 않았다.
   - 사유 Enum 4종도 확정이 필요하다.
2. 학생 화면 데모 명단 `frontend/student/.../dev/demoContextRoster.json`에 실제 학교명이 남아 있다. 이번 라운드 변경이 아니며(C4 커밋 이후 그대로) 개발용 Fixture다. 학생 화면 수정 금지 범위라 손대지 않았다.
3. 2·3학년 슬롯에서 과목 후보 Dropdown을 쓰는 E2E가 없다. 1학년 Fixture만 있어서다. 카탈로그 학년 분기는 단위 시험으로만 확인했다.
4. 결과 조회의 '제외됨' 상태 태그와 확정본이 있는 문서의 '재검토 안내' 문구는 코드와 캡처 경로가 있지만, 브라우저 단언이 없다.
5. 과목 카탈로그는 Frontend 상수다. 학교 학업 과목 데이터가 바뀌어도 '연결 가능 여부'는 서버 목록을 기준으로 하므로 잘못 연결될 위험은 없다. 다만 카탈로그 갱신은 코드 변경이 필요하다.
6. 결과 조회 분할 비율은 이 브라우저에만 기억된다(검토 화면과 같은 정책).
7. Commit 계획(§35)에 이번 파일을 더한다.
   - 2단계 Backend: 제외 DTO·Service·IT
   - 4단계 관리자 Frontend: 신규 5파일 + 수정분
   - E2E 묶음: `a27-admin-extra`·`reviewUi` 등
   - Commit은 사용자 승인 전까지 하지 않는다.


# 부록 C. 학생 Assessment 화면 개선 (참고 이미지 01~12, 2026-11-19)

- 지시: `C:\learnershigh-A27-UX-student-references\LearnersHigh_A27_UX_Student_ClaudeCode_Prompt_20261119.md` + 같은 폴더 `README.md`.
- 참고 이미지 01~12: 모두 이미지로 열어 확인했고, SHA-256 12/12가 README와 일치한다.
- **이미지 13**: 파일과 설명이 없어 **미제공 — 보류**로 둔다(임의 구현 없음).
- 보고서 사본(`A27-UX-ASSESSMENT-REDESIGN-FINAL-20261118-reference-copy.md`)은 참고만 했다. 저장소의 최신 보고서(부록 A·B 포함)를 기준으로 덧붙였다.
- **범위**
  - 학생 화면(`localhost:5173`)만 개선했다.
  - 관리자 화면은 바꾸지 않았다. 예외는 과목 카탈로그 파일 1개로, 학생 쪽 공용 파일을 다시 내보내기만 하고 내용은 같다. 관리자 E2E로 회귀를 확인했다.
  - Student Care·`frontend/shared`·`backend/common` 변경은 0건이다.
- **시작 상태·백업**
  - 시작: 181건(M 119 · D 2 · ?? 60), staged 0, HEAD `9755581`
  - 백업: `C:\learnershigh-A27-UX-student-backup-20261119\`
    - Git 상태, tracked diff, untracked tar, 수정 파일 스냅샷 tar, HWP SHA, 원본 폴더 상태
    - 로그
    - 캡처 `screenshots-final\`(36장)

## C1. 이미지별 Before → After

| # | Before (이미지) | After | 주요 파일 | 판정 |
|---|---|---|---|---|
| 01~03 | Toss Payments 정산 달력·관리 카드·모달 (참고용) | 레이아웃 리듬만 참고했다(로고·결제 데이터·문구 복제 없음). <br>• 밝은 회색 바탕 + 흰 카드 <br>• KPI 한 카드 4칸 + 작은 컬러 아이콘 <br>• 큰 월간 달력 + 오른쪽 보조 카드 <br>• 중앙 Modal(헤더·본문 스크롤·하단 버튼) | `AssessmentHomeRoute.tsx`, `home/homeDashboard.module.css` | 참고 반영 |
| 04 | 홈: 큰 제목 + 아이콘 7개 + 원본 3개년 + 월별 운영계획이 세로로 나열, `PDF 가져오기` 있음 | 순서: 헤더(학교·학년도·학기 Context + 제목) → KPI → 바로가기 + 원본 3개년 → 넓은 월간 달력 + 다가오는 수행평가·피드백 요청 현황 → 최근 업데이트 기록·메모 <br>**KPI 4칸** (모두 서버 값으로 계산, 실패하면 '미확인') <br>• 진행 중 · 임박(7일 이내, 정확한 날짜만) · 피드백 답변 대기 · 완료 <br>**바로가기** <br>• PDF 가져오기를 제거했다. <br>• 나머지 5개는 기존 아이콘 그림을 그대로 쓰고 배치만 바꿨다. <br>**원본 3개년** <br>• 공식 원본 미확인: '공식 원본이 아직 확인되지 않았어요' <br>• 학적 기록 없는 해: '해당 학년도 학적 정보 없음'(따로 구분) <br>• 관리자 등록 문서로 대체하지 않는다. <br>**달력** <br>• 내 평가일·제출 마감은 정확한 날짜 칸에 놓는다. <br>• 확정·공개 운영계획 중 'n월 m주'는 점선 '주차 기준 임시 표시(실제 날짜 아님)'로 표시하고 D-day를 만들지 않는다. <br>• 칸마다 3개 + '+N', 날짜를 누르면 상세 Modal, 월 이동·이번 달, 월 요약 3칸 <br>**보조 카드** <br>• 다가오는 수행평가: 정확한 날짜만 D-day, 학교 공개 날짜 미정 항목은 '미정' <br>• 피드백: 대기·도착 수와 최근 요청 <br>• 최근 기록: 실제 변경 시각(한국 시간) <br>**메모** <br>• 서버에 저장되어 새로고침 뒤에도 남는다. <br>• 본인만 보며, 다른 탭에서 먼저 저장했으면(409) 덮어쓰지 않고 알린다. | `AssessmentHomeRoute.tsx`, `home/HomeMonthCalendar.tsx`(신규, 학생 전용), `home/HomeMemoCard.tsx`(신규), `home/OfficialPlansCard.tsx`, `homeDashboard.module.css`(신규) | PASS |
| 05 | 목록: 파란 채움 '수행평가 추가', 'PDF로 가져오기', '정보 출처' 열, 기록 수가 '2 / 0'으로 보임 | **'2/0' 원인**: 서버 값은 20(저장 기록 20개 = 상세 v20)이었다. 58px 기록 열에 '노트 아이콘 + 20 + 피드백 아이콘'이 들어가지 않아 숫자가 두 줄로 줄바꿈된 표시 문제였다. <br>• **기록 수** = 탐구 노트 저장 기록(§21 Revision) 목록 길이(버전 번호를 그대로 쓰지 않음) <br>• **피드백 수** = 그 Revision을 가리키는 요청 수(대기 + 도착) <br>**열(8개)**: 수행평가 · 평가일 · 제출 마감(정확한 날짜만 D-day) · 평가 유형 · 반영 비율 · 진행 상태 · 기록 수 · 피드백 수 <br>• 비어 있으면 '미정/미입력'으로 표시한다. <br>• 좁은 폭에서는 유형·비율을 제목 아래로 옮긴다. <br>**버튼·정리** <br>• PDF 가져오기를 제거하고, 추가 버튼은 중립 outline으로 바꿨다. <br>• '정보 출처' 열을 없앴다. 학교 공개 평가에 연결된 항목만 제목 아래 작은 표시로 남긴다(데이터 삭제 없음). <br>• 학생 PDF 분석 Route 2개는 목록으로 돌린다. 관리자 분석 기능·공용 컴포넌트는 그대로다. | `SchoolAssessmentListRoute.tsx`·`.module.css`, `assessmentRoutes.tsx` | PASS |
| 06~08 | 추가 Modal: 과목 칩 + '수강하지 않는 과목 4개' 큰 박스, 제출물이 평가 정보 안 입력칸 | **과목: 검색형 Dropdown** <br>• 위: 내 수강 과목 / 아래: 현재 학년 과목 후보(범용 카탈로그 + 이 학기 공통 과목) / 목록에 없으면 직접 입력 <br>• 학교명·출처 문구 없음 <br>• ↑↓·Enter·Esc, 한글 조합 중 Enter는 무시한다. <br>• 사이드바에 없는 과목을 고르면 저장할 때 서버가 같은 트랜잭션에서 내 과목 목록에 더한다(§12-a). <br>• 같은 이름은 재사용하고, 같은 학기 공통 과목 후보와 이름이 같으면 그 기존 ID를 재사용한다. 학교 공식 목록은 바꾸지 않는다. <br>**Section 순서**: 기본 → 평가 유형(기타 선택 시 직접 입력칸, §12-b) → 일정(평가일·제출 마감 따로, 같은 날 허용) → 평가 정보(반영 비율 0~100 검증 + 수행 내용) → **제출물(독립 Section, 선택 목록 11개 + 기타 직접 입력)** → 관리(상태·개인 메모) <br>헤더·본문 스크롤·하단 버튼 분리, Esc, Focus 복귀는 기존 Modal을 그대로 쓴다. | `AddSchoolAssessmentModal.tsx`, `SubjectPicker.tsx`(신규)·`subjectPicker.module.css`(신규), `PersonalDetailsFields.tsx`, `EditSchoolAssessmentModal.tsx`, `model/personalDetails.ts`, `model/courseCatalog.ts`(학생 쪽으로 이동) | PASS |
| 09 | 상세 메타: '미입력·미등록·날짜 미정' 글자만, 바꾸려면 '평가 정보 수정' Modal | **Notion형 인라인 편집**: 값 자리를 누르면 그 자리에서 추가·수정한다. <br>• 평가 유형: 선택 + 기타 직접 입력 <br>• 평가일·제출 마감: 날짜 선택 + 날짜 지우기 <br>• 반영 비율: 미정/0~100(5단위) + 직접 입력(0~100 검증) <br>• 제출물: 선택 + 기타 직접 입력 <br>**저장 방식** <br>• 한 필드씩 PATCH로 보낸다(다른 필드 유지). Enter 저장 · Esc 취소 · 바깥 클릭은 바뀐 값이 있을 때만 저장 <br>• 저장 중 표시, 실패하면 이전 값으로 되돌리고 이유와 '다시 시도'를 보인다. <br>• 상태 되돌리기·이력, 피드백·자료 찾기 Modal, '평가 정보 수정' Modal은 그대로다. | `detail/InlineMeta.tsx`(신규)·`inlineMeta.module.css`(신규), `model/inlineMeta.ts`(신규), `SchoolAssessmentDetailRoute.tsx` | PASS |
| 10·11 | 안내문 '서버에 저장되지 않고… 새로고침하면 사라져요', 평가 기준이 '평가계획서 분석 값은 확인이 필요한 후보' + AI 쉬운 설명(준비 중), Section 제목 크기 제각각 | 다섯 Section을 같은 위계로 맞췄다: 16px Bold 제목, 보조 설명, 같은 여백, 구분선, 카드 중첩 없음. <br>① **안내문·첨부**: 서버 저장(§12-c). PDF·이미지, 본인만, 10개 한도, 새로고침 유지, 형식 거절 안내 <br>② **평가계획서 원본(신규)**: 내 학교·학년도·학년·학기로 §10-1-3을 자동 조회한다. 수집기 미연결 / 공개 원본 없음 / 학적 정보 없음을 구분하고, 관리자 등록 문서로 대체하지 않는다. <br>③ **평가 기준** <br>• 관리자가 확정해 학생에게 공개한 값(§10-1)만 쓴다. AI 분석(§11)은 읽지도 요청하지도 않는다. AI 쉬운 설명 자리도 없앴다. <br>• 같은 이름 항목이 있으면 그 항목을, 없으면 과목의 공개 항목 전체를 '같은 항목인지는 학교 안내로 확인'과 함께 보인다. 없으면 '공개된 평가 기준이 없어요'. <br>④ 결과물 · ⑤ 탐구 노트: 기능은 그대로 두고 제목 위계만 맞췄다. | `detail/DetailSections.tsx`(신규)·`detailSections.module.css`(신규), `model/officialCriteria.ts`(신규), `detail.module.css`(제목 16px), `EvaluationPlansRoute.tsx`(확정 항목 표 export만) | PASS (IME 조합 입력은 자동 시험 한계 → C5) |
| 12 | 참고자료: 검정 채움 '공식 사이트 열기', 큰 검정 칩·탭 | • '공식 사이트 열기 ↗'와 '찾은 자료 등록'을 같은 중립 outline으로 맞췄다(배경·테두리·높이 동일). <br>• 선택된 영역 칩은 블루 작은 강조, 유형 칩은 연한 면 + 굵은 글자. <br>• 검색 포커스는 블루, 카드 머리는 연한 면 + 유형별 작은 컬러 아이콘. <br>• 공식 URL·이용 제한 안내·자료함 기능은 그대로다. | `ReferenceSourceCard.tsx`, `referenceLinks.module.css` | PASS |
| 13 | **미제공** | 구현하지 않음 | — | 보류 |

## C2. API·DB (모두 DRAFT, `api-contract.md` 'A27-UX 학생 화면 개선 추가 계약')

- **§12-a**: `POST /school-assessments`에 `newSubjectName`을 추가했다(`subjectId`와 둘 중 하나). 과목 추가와 수행평가 등록은 한 트랜잭션이다. 정하는 순서는 ① 원래 수강 과목 → ② 공통 과목 후보 ID 재사용 → ③ 이미 더한 개인 과목 → ④ 새 `psubj_…`.
- **§9-1-a**: `subjects[]`에 학생이 더한 과목이 함께 들어가고 `addedByStudent: true`가 붙는다. Admin 학생 상세·학생 화면 보기도 같다.
- **§12-b**: `assessmentTypeLabel`(OTHER일 때만 저장, 다른 유형이면 서버가 비움)
- **§12-c**: `.../school-assessments/{id}/notice-files` 목록·올리기·빼기·내려받기·미리보기
- **§30-a**: `GET/PUT /home-memo`(`expectedVersion`, 409)
- **Migration**: `V202611190100__assessment_student_ux.sql`
  - 내용: `assessment_type_label` 열 1개 + 표 3개(`assessment_student_subject`·`assessment_home_memo`·`assessment_notice_file`)
  - 추가만 했고 기존 Migration은 바꾸지 않았다.
  - **사용자 DB(`lh-local-run-mysql`)에는 적용하지 않았다.** Testcontainers와 E2E 일회용 DB에서만 검증했다. 로컬 화면에서 쓰려면 사용자가 Backend를 재시작해 Flyway를 적용해야 한다(승인 필요).
- **관리자 Endpoint는 없다.** 관리자 학생 화면 보기에서 메모·안내문은 '학생 개인 파일이라 보여 주지 않아요'로 안내한다.

## C3. 검증 (이번 구간에 실제 실행, KST)

| 항목 | 결과 | 시각 |
|---|---|---|
| 새 IT `StudentUxApiTest`(개인 과목 원자 등록·재사용·다른 학생 격리·검증 실패 시 저장 없음 · 기타 유형 · 홈 메모 409 · 안내문 형식·권한·한도) | 1차 0/5(시험 학생 ID 401) → 2차 4/5(관리자 경로 404) → **5/5** — 모두 시험 코드 수정 | 11-19 09:58~10:10 |
| 관련 IT: StudentUx 5 · SchoolAssessment 12 · StudentRecord 4 · StudentRecordExtras 3 · AssessmentUxCompletion 4 · ResourceFile 3 · EvaluationPlan 9 · SubjectExclusion 3 | **43/43** | 12:07~12:09 |
| Backend Unit + ArchUnit | 402 tests, 0 failed, 1 skipped | 12:06~12:07 |
| `scripts/verify-frontend.ps1` (student·admin typecheck·oxlint·build·test) | PASS (3회, 마지막은 모든 수정 뒤) | 11:3x, 11:56, 12:09 |
| Node 모델 단위 (학생 32 + 관리자 8, 카탈로그 시험은 양쪽에서 각각 실행) | 36/36 | 11:57 |
| 새 학생 E2E `a27-student-ux` 5건 | 1차 4/5(시험의 날짜 표기 기대값 오류) → **5/5** | 11:53~11:56 |
| Assessment E2E 전체 | 1차 49/50 | 11:57~12:01 |
| Assessment E2E 전체 재실행 | **50/50** | 12:02~12:06 |

**전체 1차 실패 원인 (실제 결함)**: 같은 학기에 확정 문서가 여럿이면 평가 기준이 첫 문서만 보고 '같은 이름 항목 없음'으로 표시했다. 모든 확정 문서에서 같은 이름 항목을 먼저 찾도록 `officialCriteria.ts`를 고친 뒤 재실행에서 통과했다.

- **기존 시험 갱신** (요구 변경 반영, 단언을 약화하지 않음)
  - `a27-ux`: 공식 원본 문구, 과목 Dropdown, 제출물 선택
  - `a12-flows`: 과목 Dropdown
  - 공용 도우미 `e2e/assessment/studentUi.ts`(신규)
- **이전 결과와 구분**: 45/45 E2E, 402 Unit, 40/40 IT는 **부록 B 시점의 결과**다. 위 표가 이번 실행 결과다.
- **새 학생 E2E 시나리오** (지시서 §9 기준)
  1. 홈: KPI·바로가기 5(svg)·PDF 없음, 3개년(미확인 / 학적 없음 구분), 달력(정확한 날짜 칸 + 10월 '주차 기준 임시' + 날짜 상세), 다가오는 D-2, 피드백·최근 기록, 메모 저장 → 새로고침 유지 → 다른 학생 비노출 → 지우기
  2. 카탈로그 후보 과목 → 개인 과목 자동 등록(`addedByStudent`) → 새로고침 뒤 사이드바·상세 일치, 같은 이름 재등록 시 1개 유지, 공통 과목 후보 수 불변
  3. 기타 유형·제출물 직접 입력, 비율 101 차단·100 저장, 평가일 ≠ 마감
  4. 인라인 편집 5필드: 추가·수정·Esc 취소·새로고침 유지·서버 응답 일치, PATCH 500 → 원복 + 다시 시도 → 성공, 날짜 지우기
  5. 노트 20번 저장 → 목록 기록 수 '20'(한 줄)·피드백 수 '1' = 상세 v20
  6. 확정 공개 기준만 표시, 학생 페이지에서 분석 API 요청 0건, 공식 원본 Section에 관리자 등록 파일명 없음
  7. 안내문 PNG·PDF 올리기 → exe 거절 → 새로고침 유지 → 빼기 → 다른 학생 404, 다섯 Section 제목 크기·굵기 동일·순서, 한글 노트 저장
  8. 참고자료 두 버튼 같은 스타일·검정 채움 없음·공식 URL 새 탭
- **캡처**: 1366×768 / 1600×900 / 1920×1080 / 800×600, 가로 넘침 0을 자동으로 단언했다.
  - 대상: 홈·목록·상세(전체), 참고자료, Modal 상·중·하(1600) + 800, 상세 상·중·하(1600)
  - 직접 열어 본 것: 홈 1600·800, 목록 1366, Modal 상·중 1600, 상세 상·중 1600, 참고자료 1366
  - 육안 확인 중에 발견해 고친 것: Modal에서 새 과목을 고르면 과목 안내 문구가 두 번 보이던 것
- **실행하지 않은 것**
  - 전체 Backend Integration(바뀐 Domain의 관련 IT만 실행)
  - Student Care Playwright(그 영역 변경 0건)
  - 사용자 로컬 서버(5173/5174)에서 손으로 조작하는 확인

## C4. 변경 파일 (이 구간)

- **신규**
  - Backend 엔티티·저장소: `entity/StudentSubject`·`HomeMemo`·`NoticeFile`, `repository/StudentSubjectRepository`·`HomeMemoRepository`·`NoticeFileRepository`
  - Backend 서비스: `service/school/StudentSubjectService`·`HomeMemoService`, `service/record/NoticeFileService`
  - Backend Controller·DTO·IT: `controller/StudentAssessmentExtrasController`, `dto/school/HomeMemoRequest`·`HomeMemoResponse`·`NoticeFileResponse`, IT `StudentUxApiTest`
  - Migration: `database/migrations/V202611190100__assessment_student_ux.sql`
  - 학생 API·모델: `api/studentUxApi.ts`, `model/officialCriteria.ts`·`inlineMeta.ts`·`courseCatalog.ts`(+test)
  - 학생 컴포넌트: `components/SubjectPicker.tsx`(+css), `detail/DetailSections.tsx`·`InlineMeta.tsx`(+css 2), `home/HomeMonthCalendar.tsx`·`HomeMemoCard.tsx`·`homeDashboard.module.css`
  - E2E: `assessment/studentUi.ts`, `tests/a27-student-ux.spec.ts`
- **수정**
  - Backend: `SchoolAssessment`, `CreateSchoolAssessmentRequest`·`UpdateSchoolAssessmentRequest`·`SchoolAssessmentResponse`·`AcademicContextResponse`, `SchoolAssessmentService`·`SchoolAssessmentQueryService`·`SchoolAssessmentMapper`·`AcademicContextQueryService`, `AdminStudentQueryService`
  - 학생 API·모델: `types.ts`, `mock/schoolAssessmentMock.ts`, `personalDetails.ts`
  - 학생 컴포넌트: `PersonalDetailsFields`, `AddSchoolAssessmentModal`, `EditSchoolAssessmentModal`, `detail.module.css`, `ReferenceSourceCard`, `referenceLinks.module.css`, `OfficialPlansCard`
  - 학생 Route: `AssessmentHomeRoute`, `SchoolAssessmentListRoute`(+css), `SchoolAssessmentDetailRoute`, `EvaluationPlansRoute`(export), `assessmentRoutes`
  - 관리자: `model/courseCatalog.ts`(학생 파일 재수출, 내용 동일)
  - E2E: `a12-flows`, `a27-ux`
  - 문서: `api-contract.md`, 이 부록
- **쓰지 않게 된 파일 (지우지 않음)**: `detail/NoticeAttachments.tsx`, `model/assessmentNoticeStore.ts`, `detail/CriteriaTab.tsx`, `home/HomeCalendar.tsx`, `routes/PdfImportReviewRoute.tsx`·`AnalysisPreviewResultRoute.tsx`. 정리는 별도 결정으로 남긴다.
- **Git**
  - 181 → 221건(M 128 · D 2 · ?? 91), staged 0, HEAD `9755581`
  - 시작 대비 tracked diff가 바뀐 파일은 25개, 나머지 증가분은 새 파일이다.
  - Commit·Push·Merge·PR 갱신은 하지 않았다.
- **보존**
  - HWP 6/6 SHA 일치
  - 원본 폴더 `C:\learnershigh-extension` 68건 동일
  - 사용자 DB 접근 없음
  - 외부 전송·비밀값 기록 없음
  - 관리자 A27-UX·Student Care 변경 없음(관리자 회귀는 E2E 전체로 확인)

## C5. 남은 것 · 사용자 확인 필요

1. **사용자 DB Migration**: `V202611190100`이 적용돼야 로컬 화면의 메모·안내문·개인 과목·기타 입력이 동작한다. Backend를 재시작하면 Flyway가 적용하며, 이것은 사용자 결정이다.
2. **DRAFT 계약 5건**(§12-a·§9-1-a·§12-b·§12-c·§30-a)은 팀 승인 전이다.
   - 안내문 바이트는 빼도 Storage에 보존된다. 운영 보존 정책은 미정이다.
   - 개인 과목을 지우거나 이름을 바꾸는 기능은 없다.
3. **평가 기준 매칭**
   - 직접 등록한 수행평가는 이름이 같을 때만 '이 수행평가'로 본다.
   - 이름이 다르면 그 과목의 공개 항목 전체를 보인다(추측해 연결하지 않음).
   - 연결 규칙을 더 넓힐지는 결정이 필요하다.
4. **한글 IME 조합 입력**: Playwright는 조합 이벤트를 흉내 내지 못한다. 그래서 `insertText` 저장만 자동으로 확인했다. 실제 키보드 조합 중 글자 유실은 사용자 직접 확인이 필요하다.
5. **공식 원본 공급자**(학교알리미 수집기)는 아직 연결되지 않았다. 원본 Section·홈 3개년은 '확인되지 않음' 상태만 실제로 검증했다.
6. **로컬 화면 직접 확인 절차**
   1. Backend 재시작(Flyway 적용 승인 후)
   2. `cd frontend && npm run dev:student` (5173; 관리자 회귀는 `npm run dev:admin`, 5174)
   3. 홈 → 목록 → 추가 Modal → 상세 → 참고자료 순서로 확인
7. **Commit 계획(§35)에 더할 것**
   - Backend + Migration + 계약: 2단계
   - 학생 Frontend: 3단계 — 관리자 `courseCatalog`가 학생 파일을 가져오므로 학생 단계가 먼저다.
   - E2E: 마지막
   - Commit은 사용자 승인 전까지 하지 않는다.


# 부록 D. PR #18(학교알리미 수집 · 서버 안 분석기) 통합 · 학생/관리자 최종 점검 (2026-11-19)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_PR18_Integration_ClaudeCode_20261119.md`
- 사용자 승인(2026-11-19): 학생 Migration `V202611190100`, 학생 DRAFT 계약 5건, 미사용 파일 6개 정리, Spring Boot 내부 분석기 사용 + Railway HTTP 연동 퇴역(**Railway 원격 서비스·Python 저장소는 삭제하지 않음**).
- 승인되지 않은 것: PR `V202611180100`(기존 테이블 2개 DROP)의 **사용자 DB 적용**, Git Commit·Push·Merge·PR 갱신.
- 작업은 두 세션으로 나뉘었다.
  - **1세션 (12:51~13:35)**: G0~G6 대부분 수행. 부록 D를 쓰기 전에 끊겼다. 끊기기 직전 Docker 엔진이 멈춰 전체 IT 실행(13:30 시작)은 결과가 남지 않았다.
  - **2세션 (15:10~)**: 1세션 결과를 다시 확인하고, Docker 재시작(사용자) 뒤 자동 검증을 새로 돌렸다. 학교알리미 동명 학교 차단을 추가했고 이 부록을 썼다.
- 아래 표의 수치는 **실행 세션과 시각을 함께** 적는다. 부록 C·PR #18 자체의 수치는 이번 통합 결과로 옮기지 않았다.

## D1. 시작 환경 · 백업

| 항목 | 값 |
|---|---|
| Worktree · Branch | `C:\learnershigh-assessment-integration` · `integration/assessment-studentcare-20261116` |
| HEAD | `975558191158…` (`9755581`, 지시서 예상과 같음). Commit 없음, staged 0 |
| PR #18 | Head `e161f1541ba9f6303e17f3afcada44dfc0c7bcb0`(15:12 `git fetch`로 재확인, 변동 없음) · Base `9755581` · 149 파일(A 108 · M 30 · D 11) |
| 통합 시작 Git 상태 (12:51) | 221건 = M 128 · D 2 · ?? 91 (untracked 파일 93개) |
| 현재 Git 상태 | M 140 · D 14 · ?? 107항목(untracked 파일 124개), staged 0 |
| 원본 폴더 `C:\learnershigh-extension` | 68건, 12:51 기록과 동일(변경 없음) |
| HWP/HWPX 변환기 6파일 | SHA-256 **6/6 일치** (15:12 재확인, `hwp6.sha256`) |
| 백업 (1세션) | `C:\learnershigh-A27-UX-pr18-integration-backup-20261119\` — `tracked.diff`·`untracked.tar`·`modified-files-snapshot.tar`·`report-before.md`·`git-status.txt`·`lh_local_run-dump.sql`(7.8MB, 사용자 DB 덤프 03:51 기준 완료 표식 있음) + `backup.sha256` |
| 백업 (2세션 시작) | 같은 폴더 `session2-1510\` — `tracked.diff`·`untracked.tar`(124)·`modified-snapshot.tar`(140) + `backup.sha256` 검증 OK |
| 사용자 DB `lh_local_run` (33307) | Flyway 최신 `202611170300` (15:3x 읽기 전용 조회). `V202611180100`·`V202611190100` **둘 다 미적용**. `assessment_plan_teaching_plan_review` 표 존재, 학생 표 3개 없음 |
| 8080 · 5173 · 5174 | 사용자 프로세스(java·node)가 점유 중. **종료·재시작하지 않았다.** |

## D2. PR #18 파일별 채택 (149개)

| 묶음 | 파일 수 | 결정 | 현재 상태 |
|---|---|---|---|
| 서버 안 분석기 `service/plan/LocalPlanAnalyzer`·`PlanTableReader`·`extract/*`(10) | 12 | **채택** | PR과 바이트 동일 |
| 분석기 시험 `extract/*Test`(6)·`SchoolInfoGradesTest`·`StubPlanAnalyzer` | 8 | **채택** | PR과 동일 |
| 학교알리미 `integration/schoolinfo/*`(2)·`SchoolInfoImportService`·`AdminSchoolInfoImportController`·DTO 2 | 6 | **채택** (+ 2세션 동명 학교 차단, D6) | Service만 PR과 다름 |
| `ocr_win.ps1`, 시험 `config/application.yml`, `PlanServerAnalysisApiTest`, README | 4 | 채택 | PR과 동일 |
| `PlanAnalyzerConfig` | 1 | **채택 + 수정**: `local`(기본)·`none` + E2E 전용 `loopback-stub`(127.0.0.1·localhost·::1 아니면 기동 거부) | 병합 |
| `application.yml` | 1 | 채택 + Railway 주소·토큰 삭제 | 병합 |
| `AnalyzerTokenSource`(+Test), `PlanAnalyzerEnvBindingTest` | 3 | **삭제(퇴역)** | 삭제 |
| `HttpPlanAnalyzerClient`(+Test) | 2 | PR은 삭제 → **보존**: loopback Stub 전용 클라이언트로만 사용(E2E가 고정 합성 결과를 쓰기 위함). 원격 주소로는 만들 수 없다 | 보존 |
| Railway E2E 4파일 | 4 | **삭제** | 삭제 (`removed-railway-e2e\` 백업) |
| `e2e/playwright.assessment.config.ts`·`tsconfig.json` | 2 | 병합: loopback-stub + 고정 시험 토큰(비밀값 아님) | 병합 |
| 검토 테이블 병합: `V202611180100`, `PlanReview`·`PlanReviewDraft`·`TeachingPlanReview` 수정, `PlanReviewDraftEvent`(+Repository) 삭제, `PlanReviewDraftService` | 7 | **보류** — 분석기·수집기에 필요 없고, 기존 테이블 2개를 DROP하며, A27 `subjectExclusions`와 같은 Service를 고친다 | A27(HEAD) 그대로. Migration 파일은 저장소에 넣지 않음(백업 폴더에만) |
| 위 병합에 딸린 시험 7개(`draft_event` 정리 줄 등) | 7 | 분석기 관련 줄만 병합, 병합 테이블 전제 줄은 미채택 | 병합 |
| `AssessmentErrorCode` | 1 | 학교알리미 4개 추가분만 | 병합 |
| Admin API·타입·HTTP | 3 | 추가분만 | 병합 |
| Admin `SchoolInfoImportModal`(신규) | 1 | 채택 + A27 디자인(중립 outline·Modal 구조) | 병합 |
| Admin `PerformanceStep`·`review.module.css` | 2 | 채점기준 **요소별 목록 표시만** 채택(좁은 칸 가독성, 지시서 §4) | 병합 |
| Admin `PerformanceStep`·`TeachingPlanStep` '후보 그대로 일괄 확인' | — | **미채택** — A27 [15] '일괄 승인 없음'과 충돌 | — |
| Admin `ReviewWorkspace`·`TeachingPlanStep` 다른 학년 과목 접기 | — | **부분 채택**: 첫 선택만 이 문서 학년 과목. 접기는 A27 과목 제외([01])와 겹쳐 미채택 | 병합 |
| Admin `EvaluationPlansRoute` | 1 | PR은 '학년도별 열람' 옆에 버튼 → A27은 그 화면이 없으므로 **6칸 화면(`PlanSlotsRoute`)에 버튼** | 병합 |
| 문서 `api-contract`(§38-11·§39-1)·`assessment-analyzer-setup.md` | 2 | 수작업 병합 | 병합 |
| 도구·자료 `scripts/perf-assess-extract/**`(41)·`docs/design/perf-assess-*`(36) | 77 | **보류** — 런타임 불필요, `analyzer_server.py`(HTTP 분석 서버) 포함, 실측 결과 자료 | 미반영 |

- 집계(2세션 15:2x, PR Head와 바이트 비교): PR과 동일 30 · 병합(내용 다름) 28 · PR 삭제 반영 7 · PR 삭제 미반영(보존) 4 · 미반영 80(도구·자료 77 + `V202611180100` 1 + `docs/design` 보고서 HTML 2). 2세션 수정 뒤 `SchoolInfoImportService`는 '동일'에서 '병합'으로 바뀐다.
- PR의 Admin 수정 파일을 PR 버전으로 통째 바꾼 것은 없다. 학생 Frontend는 PR 변경 0건이다.

## D3. A27 유지 체크리스트

| 영역 | 확인 항목 | 근거 (자동) |
|---|---|---|
| Admin 8탭 · 개발 문구 없음 · 전체 현황 | 유지 | E2E `a27-ux` 관리자 탭, `a27-admin-ui [04]` |
| 평가계획서 6칸 · 중립 outline · 학년도별 열람 없음 | 유지 + 학교알리미 버튼(중립 outline) | `a27-admin-ui [08]`, `a27-pr18` 1번 |
| 원본 보기(PDF·HWP·HWPX) · 근거 칸 강조 | 유지 | `preview-subjects` 3건 |
| 검토 4단계 · Stepper · 초안 저장/복원 · 확정 · 확정 이력 | 유지 | `evaluation-flow` 4건, `a27-admin-ui [09]~[16]` |
| 과목 제외(`subjectExclusions`) · 서버 저장 · 확정 대상 제외 · 되돌리기 | 유지 | `a27-admin-extra [01]`, IT `SubjectExclusion*` |
| 과목 카탈로그(범용 후보, 학교 과목만 연결, 출처 문구 없음) | 유지 | `a27-admin-extra [03]` |
| 결과 2패널 분할(드래그·키보드) · 단일 과목 선택 | 유지 | `a27-admin-extra [02][05][06]` |
| 월별 운영계획(원문 주차·확정 행만) · 학생 Planner는 확정 뒤 | 유지 | `teaching-plan` |
| 참고자료실 업로드·미리보기·휴지통 · Modal 크기 | 유지 | `a27-admin-ui [17]`, `a27-ux` Modal 3해상도 |
| 상세 채점기준 요소별 목록(좁은 칸) · 일괄 승인 없음 | 신규 반영 | `a27-pr18` 2번 |
| Student 홈(KPI 4·아이콘 5·원본 3개년·달력·메모) | 유지 | `a27-student-ux [01]~` |
| 목록 8열 · 기록 수 20 · PDF 가져오기 없음 | 유지 | `a27-student-ux [05~08]` |
| 추가 Modal(개인 과목 자동 등록·OTHER·제출물) · 인라인 편집 | 유지 | `a27-student-ux [05~08]·[09]` |
| 상세 5 Section · 확정 공개 기준만 · 분석 API 호출 0 | 유지 | `a27-student-ux [10·11]` |
| 같은 이름 공개 항목 여러 개 → 자동 연결 안 함 | 유지 | `a27-pr18` 3번 |
| 참고자료 중립 버튼 | 유지 | `a27-student-ux [12]` |
| Student Care | 변경 0건(`care` 경로 diff·신규 파일 없음) | Student Care IT 7클래스 통과(D9). Student Care Playwright는 **미실행**(영향 경로 없음) |

## D4. 분석기 전환 (Railway HTTP → Spring Boot `local`)

- **모드**: `local`(기본, 원문이 서버 밖으로 나가지 않음) · `none`(503, Backend 시험 기본) · `loopback-stub`(E2E 전용). **`http` 모드는 없다.** 다른 값이면 기동 거부.
- **퇴역한 것**: `AnalyzerTokenSource`(+시험 2), Railway E2E 4파일, `application.yml`의 Railway 주소·토큰.
- **남긴 것**: `HttpPlanAnalyzerClient` — loopback Stub에만 연결된다(주소 검사는 `PlanAnalyzerConfig`). 시험 `PlanAnalyzerYamlConfigTest`가 원격 주소 거부를 확인한다.
- **Railway 원격 서비스·Python 분석기 저장소·원격 환경 변수는 건드리지 않았다.** 종료·삭제·비밀값 폐기는 별도 승인 사항이다.
- **OCR**: `auto` = Tesseract가 있으면 Tesseract, Windows면 내장 OCR(`ocr_win.ps1`), 둘 다 없으면 스캔 쪽은 읽지 않는다(성공으로 꾸미지 않음 — 그 쪽 표가 없으면 과목 0 → `FAILED`). 실제 스캔 PDF OCR은 **미검증**(합성 시험만, `ScanOcrTest`).
- **자원**: 분석은 Backend 프로세스 안에서 돌아간다. 학교알리미 불러오기는 서버 작업 1개가 차례로 분석한다. 관리자 업로드 분석은 요청마다 돌아 동시 요청 상한이 없다 — 큰 PDF 여러 개를 동시에 분석할 때의 메모리 상한은 **미측정**.
- **캐시**: `LocalPlanAnalyzer`의 프로세스 메모리 캐시(최근 8개 LRU, 키 = 원문 SHA + 파일 이름 + 계약 + 프로필). 분석기 출력만 담고 관리자 검토 데이터는 섞이지 않는다. 재시작하면 비워진다. 원본 Revision이 바뀌면 SHA가 달라 새로 분석한다.
  - 참고: 분석 프로필 이름(`v21.1`·`v21.10-b16-dev`)은 Railway 시절과 같다. 예전 실행 기록과 새 실행 기록은 채널(`LOCAL`)로만 구분된다. 프로필 이름을 바꿀지는 결정 필요(D10).

## D5. 문서 유형 11종 (합성 문서, `LocalAnalyzerScenarioTest`)

- 문서: 시험이 PDFBox로 만든 **가상 학교·가상 과목** 합성 문서와 저장소의 합성 HWP·HWPX뿐이다. 실제 학교 문서는 쓰지 않았고 외부로 보내지 않았다.
- 판정은 원문 정답(시험 안 `truth`)과 비교한 것이다. 분석 '건수'가 아니라 정답 대비 오탐·미탐이다.
- 실행: 1세션 13:13~13:14(`scenario-report.tsv`). 2세션 Unit 재실행(15:15)에 이 시험이 포함돼 다시 통과했다(안전 조건 단언 기준).

| # | 시나리오 | 결과 | 과목 (정답/결과, 오탐) | 수행 항목 | 비율·만점 오류 | 채점기준 연결 | ms |
|---|---|---|---|---|---|---|---|
| 1 | 한 학년 전 과목 통합 | PASS | 3/3, 0 | 5/5, 0 | 0 · 0 | 7/7 | 458 |
| 2 | 교과군(과학과) 통합 | PASS | 2/2, 0 | 2/2, 0 | 0 · 0 | 2/2 | 49 |
| 3 | 과목별 개별 문서 3개 | PASS | 각 1/1 | 2·1·2 전부 | 0 | 3/3·2/2·2/2 | 22~39 |
| 4 | 1·2·3학년 합본(같은 과목명 반복) | PASS | 3/3 (학년별 1개씩, 과목마다 학년 1개) | 3/3 | 0 | 3/3 | 63 |
| 5 | 채점기준 없음 | PASS | 1/1 | 2/2 | 0 | 0/0 — **없는 기준을 만들지 않음** | 24 |
| 6 | 상세 채점기준(부분 배점·기본·미제출) | PASS | 1/1 | 1/1 | 0 | 3/3 | 39 |
| 7 | 평가표·채점기준 멀리 떨어짐 + 반복 | PASS | 1/1 | 1/1 | 0 | 1/1 | 32 |
| 8 | 병합셀·전치·OCR 스캔 | **NOT RUN** (병합셀은 1~7 표에 포함, 전치·그림 위 표·실제 스캔본은 합성 문서 없음) | | | | | |
| 9a | HWP | READ (과목 1) | | | | | 22 |
| 9b | HWPX | **FAIL** — 과목 0, `FAILED` | 같은 내용의 HWP는 읽힘 | | | | 107 |
| 9c | 이름 `.hwp` · 서명 HWPX | 형식은 서명으로 HWPX 판정 **PASS**, 내용은 9b와 같이 과목 0 | | | | | 15 |
| 10 | 같은 과목·같은 이름 수행평가 2개 | **FAIL** — 2개가 1개로 합쳐짐(미탐 1) | 1/1 | 1/2 | 0 | 1/1 | 22 |
| 11 | 다른 학년도·학기 표기 문서 | PASS (분석기는 학기를 판단하지 않음 — 학교알리미 파일 이름 규칙·관리자 슬롯이 판단) | 1/1 | 1/1 | 0 | 0/0 | 10 |

- **9b·10은 PR 추출 규칙의 정확도 문제**다. 분석기 로직은 PR 담당 영역이라 고치지 않고 발견으로 남긴다(D10).
  - 10의 영향: 관리자 검토 화면에 1차·2차가 한 항목으로 보인다. 관리자가 원문 대조 단계에서 바로잡아야 한다. 확정 전 학생 비공개는 그대로다.
  - 9b의 영향: 합성 HWPX(평가표 1개짜리)에서 과목을 찾지 못해 `FAILED`로 안내된다. 가짜 결과는 만들지 않는다. 실제 학교 HWPX 정확도는 **미측정**.
- 기존 113개교 실측(PR 보고서)은 수도권 일반고·자율고 2026-2학기 중심이며 전국 대표성을 입증하지 않는다. 이번 통합은 그 수치를 다시 재지 않았다.

## D6. 학교알리미 수집

- **흐름**: 관리자 6칸 → '학교알리미에서 불러오기'(중립 outline) → 학교 이름 → `202` + 작업 번호 → 진행바 → 파일별 결과(학년·과목 수·건너뜀 사유) → 분석 탭에서 검토·확정.
- **출처**: 수집한 문서는 일반 관리자 업로드와 같다. `sourceUrl=https://www.schoolinfo.go.kr`은 참고 표시일 뿐이다. 학생 §10-1-3 공식 원본 공급자에는 **연결하지 않았다**(출처를 서버가 증명할 메타데이터 계약이 없음). 학생 화면은 '공식 원본이 아직 확인되지 않았어요' 그대로다. E2E `a27-pr18` 1번이 학생 쪽 비표시를 확인한다.
- **합본 학년**: 파일 이름이 여러 학년이면 학년마다 등록한다. 과목의 원문 학년이 슬롯 학년과 다르면 확정을 막는 A27 정책(`a15-flows`)과 과목 제외([01])가 그대로 동작한다.
- **2세션 추가 수정 — 동명 학교 차단**
  - 문제: 학교알리미 검색 결과가 여러 학교면 Java 이식본이 **첫 학교를 조용히 골라** 현재 학교 슬롯에 등록했다. PR Python 도구는 이 경우 `SCHOOL_AMBIGUOUS` 경고를 냈는데 Java 이식본에서 빠졌다. 다른 학교의 평가계획서가 섞일 수 있다.
  - 수정: 검색 결과가 2곳 이상이면 `409 SCHOOLINFO_SCHOOL_AMBIGUOUS`, 아무 문서도 등록하지 않는다. 계약 §38-11 오류 표에 먼저 추가했다.
  - 파일: `api-contract.md`, `AssessmentErrorCode`, `SchoolInfoImportService`, IT `SchoolInfoImportApiTest`(문서 수 불변 단언 추가).
  - 한계: 전국에 같은 정식 이름의 학교(예: 여러 지역의 같은 이름)는 이 경로로 불러올 수 없다(수동 업로드는 가능). 지역·주소 선택 계약은 결정 필요(D10).
- **남은 한계** (문서화, 코드 변경 없음)
  - 학년도: 학교알리미가 보여 주는 최신 공시 연도의 파일을 받아 **요청 학년도 슬롯에 등록**한다. 학년도가 다른지 서버가 확인하지 않는다. 학교알리미 `JG_YEAR`와 학년도의 관계를 실측하지 않아 차단을 넣지 않았다(D10).
  - 작업 상태는 서버 메모리(최근 50개) — 재시작하면 404. 취소·재시도 API 없음. 작업 1개가 차례로 분석.
  - 실제 학교알리미 접속 시험은 하지 않았다(Client를 시험 대역으로 교체). ZIP 안 여러 파일·확장자 불일치·학기 표기는 단위 시험(`SchoolInfoGradesTest`)과 IT로만 확인했다.

## D7. DB Migration

| Migration | 성격 | 일회용 DB | 사용자 DB `lh_local_run` |
|---|---|---|---|
| `V202611180100__assessment_review_tables_merge.sql` (PR) | `assessment_plan_teaching_plan_review`·`assessment_plan_review_draft_event` **DROP** + 이관 | 1세션: 사용자 DB 덤프 복제본에 적용·검증 | **미적용 · 저장소에 넣지 않음** |
| `V202611190100__assessment_student_ux.sql` (승인) | 열 1 + 표 3 추가만 | 1세션: 덤프 복제 DB `lh_g4`(33349)에서 `202611170300 → 202611190100` 성공(`g4-bootrun.log`). Testcontainers·E2E DB에서도 매번 적용 | **미적용** |

- **PR Migration 무손실 검증 (1세션, 사용자 DB 덤프 복제본)**
  - 초안 4건: `payload_json` 해시 이관 전후 **4/4 동일**.
  - 저장 이력 20건 → `history_json` 20건: 초안별 8·6·2·4건, 버전·저장자·시각·변경 수·변경 경로 해시와 **최신순 순서까지 20/20 동일**(2세션에서 `g3-*.txt`를 다시 대조).
  - 월별 운영계획 확정: 사용자 DB에 `assessment_plan_teaching_plan_review` 0행, `assessment_plan_review` 0행, `teaching_plan_row` 0행(덤프 기준) — 이관할 데이터가 없어 **행 이관은 실데이터로 검증되지 않았다**. 표 구조·FK 교체만 적용 성공.
  - 위험: SQL 주석은 '최근 20건'이라고 하지만 `LIMIT`이 없어 전부 옮긴다. `TEXT`(64KiB) 초과 시 오류 가능 — 현재 최대 8건이라 문제 없음.
  - PR의 엔티티·Service(병합 모델)는 채택하지 않았으므로, 이 Migration을 지금 사용자 DB에 적용하면 **현재 코드가 DROP된 표를 찾다가 실패한다**. 즉 Migration만 따로 적용할 수 없고, 검토 테이블 병합 코드(D2 보류 묶음)와 함께 통합해야 한다.
- **순서 문제**: `180100` < `190100`. `190100`을 먼저 적용하면 나중에 `180100`을 넣을 때 Flyway가 순서 위반으로 거부한다(`outOfOrder`를 켜는 우회는 하지 않음).
- **사용자 결정이 필요한 선택지**
  - A. 검토 테이블 병합을 받아들인다: 병합 코드 통합 → 일회용 DB 재검증 → 사용자 DB 백업 → `180100` → `190100` 적용(별도 명시 승인 필요).
  - B. 병합을 받지 않는다(권장, 비파괴): PR #18 쪽에서 `V202611180100`을 빼거나 보류하도록 조율하고, 사용자 DB에는 `190100`만 적용한다. 테이블 삭제 없음.
  - 어느 쪽이든 결정 전에는 사용자 Backend(8080)를 재시작하지 않는다 — 현재 Worktree 코드로 재시작하면 `190100`이 자동 적용된다.
- **복구안**: `lh_local_run-dump.sql`(1세션, 완료 표식 확인)을 일회용 DB에 복원해 검증한 이력이 있다. 사용자 DB 복원은 하지 않았다.
- 1세션 시작 당시 지시서는 '사용자 DB에 `V202611190100` 적용 가능'이었지만, 순서 문제 때문에 적용하지 않았다(§2-2).

## D8. 승인 사항 반영

- **DRAFT 5건**(§12-a·§9-1-a·§12-b·§12-c·§30-a): `api-contract.md` 'A27-UX 학생 화면 개선 추가 계약' 머리말과 `domain.md` §30-A에 **사용자 승인 2026-11-19**를 기록했다. 공유 계약이라 **팀(다른 담당자) 승인은 별도**다. 코드 동작은 바꾸지 않았다.
- **평가 기준 연결 규칙**: 넓히지 않았다. 이름이 정확히 같고 그 이름이 하나뿐일 때만 '이 수행평가'로 연결한다. 같은 이름이 여럿이면 자동으로 고르지 않고 '확인 필요'를 보인다(1세션 `officialCriteria.ts` 보강 + E2E `a27-pr18` 3번). 같은 학기 확정 문서가 여럿이면 모두 찾는다. `itemKey` 명시 계약은 제안만.
- **미사용 파일 6개 — 6개 모두 삭제**

| 파일 | 런타임 참조 (2세션 `rg`, frontend·e2e) | 대체 | 복구 |
|---|---|---|---|
| `detail/NoticeAttachments.tsx` | 0 | `DetailSections` + 서버 안내문 API | HEAD에 있음(SHA 일치) |
| `model/assessmentNoticeStore.ts` | 0 | 서버 `notice-files` | HEAD |
| `detail/CriteriaTab.tsx` | 0 | `DetailSections` + `officialCriteria` | HEAD |
| `home/HomeCalendar.tsx` | 0 | `HomeMonthCalendar` | 1세션 `untracked.tar`(SHA 일치) |
| `routes/PdfImportReviewRoute.tsx` | 0 (라우트는 목록으로 이동) | 학생 목록 | HEAD |
| `routes/AnalysisPreviewResultRoute.tsx` | 0 (CSS 주석 1줄만) | 관리자 분석 탭 | HEAD |

  - 공용 Helper·Fixture·Storage·Student Care 파일은 지우지 않았다. 삭제 뒤 typecheck·build·E2E 통과(D9).

## D9. 검증 (KST)

| 항목 | 결과 | 세션 · 시각 |
|---|---|---|
| Backend Unit + ArchUnit (`gradlew test --rerun`) | **413 tests, 0 failed, 1 skipped** (수정 전 15:15, 동명 학교 수정 후 다시 16:40 — 둘 다 같음) | 2세션 15:15~15:16 · 16:40~16:41 |
| Backend Integration 전체 1차 (`gradlew integrationTest --rerun`, 45클래스) | 229 tests 중 **145 통과 · 84 실패**. Assessment 31클래스 **128/128 통과**. 실패 84건은 후반 11클래스(common 3·migration 1·studentcare 7)로, 모두 Testcontainers MySQL이 기동 직후 종료(`InnoDB io_setup() failed with EAGAIN` — Docker VM의 AIO 한도 소진)해 Spring Context를 못 띄운 **환경 실패**다. 코드 단언 실패는 0건 | 2세션 15:43~16:29 |
| 위 실패 11클래스 + `SchoolInfoImportApiTest` 재실행 (새 Gradle 프로세스, 동명 학교 수정 코드로 컴파일) | **91/91 통과** (Student Care 7클래스 79건 포함) | 2세션 16:30~16:33 |
| `SchoolInfoImportApiTest` (동명 학교 409 · 문서 수 불변 포함) | **2/2** (위 재실행에 포함) | 2세션 16:30~16:33 |
| `scripts/verify-frontend.ps1` (student·admin typecheck·oxlint `--deny-warnings`·build) | **PASS** | 2세션 15:16~15:18 |
| Node 모델 Unit — Assessment(student 5 + admin 2 파일) | **28/28** | 2세션 15:18 |
| Node 테스트 — frontend 전체 `*.test.mjs` 32파일 | **141/141** | 2세션 15:18 |
| Assessment Playwright 전체 (`npm run test:assessment`, 14파일) | **53/53 통과** (5.2m). 1차 시도는 셸 환경 변수 `NoDefaultCurrentDirectoryInExePath=1` 때문에 `gradlew.bat`을 찾지 못해 Backend 기동 전 종료 → 그 변수만 빼고 재실행. 시험·설정 변경 없음 | 2세션 16:34~16:40 |
| 합성 문서 11종 시나리오 | D5 표 | 1세션 13:13 · 2세션 Unit에 포함 |
| PR Migration 무손실(덤프 복제) | 초안 4/4 · 이력 20/20 | 1세션 13:07 |
| 학생 Migration 적용(덤프 복제 `lh_g4`) | 성공 | 1세션 13:08 |

- **1세션 기록(참고, 이번 수치 아님)**: E2E 전체 1차 52/53(학생 홈 문구 기대값 1건 실패 → `AssessmentHomeRoute` 수정) → 2차 **53/53**(13:23~13:28), 관리자·PR 묶음 **13/13**(13:33), IT 관련 클래스 개별 실행, 전체 IT는 Docker 엔진 정지로 결과 없음.
- **시험 변경**: 새 IT `SchoolInfoImportApiTest`·`LocalAnalyzerApiTest`·`LocalAnalyzerScenarioTest`, 새 E2E `a27-pr18.spec.ts`(3건). 기존 단언 완화·skip 없음. Railway E2E 4파일은 퇴역으로 삭제.

## D10. 화면 · 환경

- **사용자 서버(5173·5174·8080)는 사용하지 않았다.** 사용자 Backend는 실사용 DB에 연결돼 있고, 재시작하면 Flyway가 `190100`을 적용하기 때문이다(D7).
- 화면 검증 환경: Playwright가 띄우는 **일회용 MySQL(tmpfs, 33340) + Backend 18090(loopback-stub) + 학생 5191 · 관리자 5192**. 사용자 데이터 아님.
- 해상도 1366×768 · 1600×900 · 1920×1080 · 800×600: 가로 넘침 0을 E2E가 단언한다(`a27-ux` 해상도·Modal, `evaluation-flow` Stepper 1920·820·390).
- 캡처(1세션): `screenshots\` 8장 — 학교알리미 Dialog·결과(1600), 채점기준 목록 1366 전후, 관리자 결과·추가 화면, 학생 홈·상세(1600).
- **NOT RUN**
  - 사용자 DB 기반 학생·관리자 화면 직접 조작
  - 한글 IME 실제 키보드 조합(Playwright는 조합 이벤트를 흉내 내지 못함)
  - 실제 학교알리미 접속, 실제 학교 문서(PDF·HWP·HWPX·스캔본) 분석 정확도
  - Student Care Playwright (변경 0건, IT는 D9에서 통과)

## D11. 남은 것 · 결정 필요

| 등급 | 내용 | 다음 행동 |
|---|---|---|
| 결정 | **PR `V202611180100` 처리** (D7 A/B) | 사용자 결정. 결정 전 사용자 Backend 재시작 금지 |
| 결정 | 사용자 DB에 `V202611190100` 적용 시점 | 위 결정 뒤 백업 → 적용 → 화면 확인 |
| P1 (PR 분석기) | 같은 과목·같은 이름 수행평가 1차·2차가 하나로 합쳐짐 (D5 #10) | PR 담당자에게 전달. 관리자 원문 대조로 보완 중 |
| P1 (PR 분석기) | 합성 HWPX에서 과목 0 (같은 내용 HWP는 읽힘) (D5 #9b) | PR 담당자에게 전달. 실제 HWPX 표본으로 재측정 |
| P1 (수집) | 학교알리미 최신 공시 연도를 요청 학년도 슬롯에 그대로 등록 | `JG_YEAR` 의미 실측 뒤 서버 검사 추가 여부 결정 |
| 결정 | 동명 학교: 지금은 409 차단. 지역·주소 선택 계약 추가 여부 | PR 담당자와 조율 |
| P2 | 관리자 업로드 분석 동시 실행 상한·큰 PDF 메모리 미측정 | 부하 시험 또는 학교알리미처럼 단일 작업 대기열 |
| P2 | 분석 프로필 이름이 Railway 시절과 같음 | `LOCAL` 채널로 구분 가능. 이름을 바꾸면 계약 값 변경이라 결정 필요 |
| 보류 | `scripts/perf-assess-extract/**`·`docs/design/perf-assess-*` 77파일 | 필요 시 별도 반영 |
| 승인 | DRAFT 5건·§38-11 오류 추가의 팀 승인 | OWNERSHIP 절차 |
| 별도 승인 | Railway 원격 서비스 종료·비밀값 폐기 | 하지 않음 |

- **이번 통합에서 바뀐 파일**(시작 221건 대비 증가분 요약)
  - Backend 신규: 분석기 `LocalPlanAnalyzer`·`PlanTableReader`·`extract/*`, 학교알리미 `integration/schoolinfo/*`·`SchoolInfoImportService`·`AdminSchoolInfoImportController`·DTO 2, `assessment/ocr_win.ps1`
  - Backend 수정: `PlanAnalyzerConfig`, `HttpPlanAnalyzerClient`(주석), `AssessmentErrorCode`, `application.yml`
  - Backend 삭제: `AnalyzerTokenSource`
  - Backend 시험: 신규 `extract/*Test`·`SchoolInfoGradesTest`·`StubPlanAnalyzer`·`SchoolInfoImportApiTest`·`LocalAnalyzerApiTest`·`LocalAnalyzerScenarioTest`, 수정 `PlanAnalyzerYamlConfigTest` 외 분석기 관련 IT, 삭제 `AnalyzerTokenSourceTest`·`PlanAnalyzerEnvBindingTest`, 시험 `config/application.yml`
  - Admin: `SchoolInfoImportModal`(신규), `PlanSlotsRoute`, `PerformanceStep`, `ReviewWorkspace`, `review.module.css`, API 3파일
  - Student: `officialCriteria.ts`, `DetailSections.tsx`, `AssessmentHomeRoute.tsx`, 미사용 6파일 삭제
  - E2E: `a27-pr18.spec.ts`(신규), `playwright.assessment.config.ts`, `tsconfig.json`, Railway 4파일 삭제
  - 문서: `api-contract.md`, `domain.md`, `assessment-analyzer-setup.md`, `README.md`, 이 부록
- **Git**: Commit·Push·Merge·PR 갱신·stash·reset 하지 않았다. staged 0.


# 부록 E. 학생 Shell/홈 및 학교알리미 최근 3개년 자동 등록 (2026-11-19)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_3Year_AutoSync_Integrated_ClaudeCode_20261119.md`(통합 최종본, 이전 2개 프롬프트는 따로 실행하지 않음)
- 목표: S1 학생 메뉴 전체 접기 · S2 학생 홈만 연회색 · A1 학교알리미 최근 3개 학년도 × 고1~3 × 1·2학기(18개 구간) 자동 확인·검증된 원본 등록
- **실제 학교알리미 접속은 하지 않았다.** 연도 지정 조회는 가상 학교알리미(127.0.0.1)로만 시험했다 → **Fixture PASS / 실학교 NOT RUN**.
- 사용자 DB Migration 적용·사용자 서버 재시작·Git Commit·Push·Merge·PR 갱신: **0건**.

## E0. 기준 상태 · 보존

| 항목 | 값 |
|---|---|
| Branch · HEAD | `integration/assessment-studentcare-20261116` · `9755581`(변동 없음) · staged 0 |
| 시작 Git 상태 (부록 D 마감과 같음) | M 140 · D 14 · ?? 107항목(untracked 파일 124개) |
| 마감 Git 상태 | M 143 · D 14 · ?? 134항목 — 이번 작업으로 신규 28파일, 수정 20파일(E8) |
| 백업 | `C:\learnershigh-A27-UX-3year-autosync-backup-20261119\` — `git-status.txt`·`tracked.diff`·`untracked.tar`(124)·`modified-snapshot.tar`(140)·`report-before.md`·`hwp6.sha256`·`original-folder-status.txt` + `backup.sha256`(검증 OK) · 시험 로그 |
| 기존 백업 폴더 | 부록 D 백업·`session2-1510\`은 건드리지 않음 |
| HWP/HWPX 변환기 6파일 | **SHA-256 6/6 동일** (마감 시 재확인) |
| 원본 폴더 `C:\learnershigh-extension` | 68건 그대로 |
| 사용자 DB `lh_local_run` | 읽기 전용 조회도 이번 작업에서는 하지 않음. 부록 D 기준 `202611170300` |
| 사용자 프로세스 8080·5173·5174·33307 | 종료·재시작 없음(마감 시 LISTENING 확인) |

## E1. 학생 Shell — 메뉴 전체 접기 (S1)

- **바꾼 파일**: `routes/AssessmentLayout.tsx`, `routes/AssessmentLayout.module.css`, 신규 `model/sidebarPreference.ts`(+test)
- **메뉴·경로**: 11개 그대로 — 홈 · 학교 수행평가 · 학교 평가 정보 · 월별 운영계획 · 심화 탐구 · 선생님 피드백 · 자료함 · 참고자료 · **성장 기록**(실제 화면 이름. 지시서 표기 '성장기록'과 띄어쓰기만 다름) · 보관함 · 수행평가 꿀팁. 과목 목록·학교·학업 정보·학기 선택도 그대로다. Route 변경 0건.
- **펼침**: 기존 폭(213px)·글자·그룹·스크롤 그대로. 위에 작은 '메뉴 접기' 단추만 더했다.
- **접힘 (데스크톱 ≥960px만)**
  - Sidebar 열을 60px로 줄여 본문이 실제로 넓어진다(E2E: 본문 폭 +120px 이상 단언).
  - 학기 선택·과목 그룹 제목·과목 검색은 숨기고 아이콘만 남긴다. 과목 그룹의 기존 접기 상태(`groupToggle`)와는 별개다.
  - 글자는 화면에서만 숨긴다(읽기 이름·건수는 그대로). `title`(마우스 툴팁)·`aria-current="page"` 유지.
  - 단추: `aria-expanded`·`aria-controls="assessment-sidebar-menu"`·'Assessment 메뉴 접기/펼치기', 눌러도 Focus가 그대로다.
- **상태 기억**: `localStorage` `lh.assessment.student.sidebarCollapsed`(이 브라우저만). 저장소가 막혀도 오류 없이 '펼침'.
- **좁은 화면(≤959px)**: 기존 Drawer를 그대로 쓰고 접힘 상태를 적용하지 않는다. 이번에 더한 것:
  - 열면 첫 항목으로 Focus, Tab 가두기, 배경 스크롤 잠금
  - Esc·바깥 클릭으로 닫기, 닫으면 메뉴 단추로 Focus 복귀
  - 열 때는 `visibility`를 바로 보이게 했다(닫을 때만 전환). 처음 구현(그리기 뒤 Focus 이동)은 E2E에서 Focus가 옮겨지지 않아 실패했고, 이 방식으로 고쳤다.
- **움직임**: 폭 전환 0.18s, `prefers-reduced-motion: reduce`면 0s(E2E 단언).
- `frontend/shared`·Student Care·상단 Student Navigation 변경 0건.
- 아이콘 위 hover 툴팁은 브라우저 기본 `title`이다. 키보드 Focus 때 보이는 별도 툴팁은 만들지 않았다(Sidebar가 스크롤 영역이라 잘린다) — 읽기 이름은 제공된다.

## E2. 학생 홈 — 연회색 캔버스 + 흰 카드 (S2)

- 새 토큰 `--as-color-canvas`는 **새 색이 아니라 기존 `--as-color-fill`(#f3f4f7) 값**이다. Dark는 `--as-color-bg`(카드보다 어두운 바탕).
- `home/homeDashboard.module.css` `.page`만 바꿨다: 배경 → canvas, 최소 높이 → 화면 높이(콘텐츠가 짧아도 아래 흰 띠 없음).
- 흰 카드 유지 (E2E 단언): 요약(KPI)·바로가기·공식 원본 3개년·달력·다가오는 수행평가·피드백·최근 기록·메모 = `rgb(255,255,255)`
- 메뉴를 접어도 회색 유지. 목록 화면 바탕은 회색이 아니다(단언). 관리자 테마 변경 0건.
- KPI·3개년 '확인되지 않음'·달력 주차 임시 표시·메모 등 기능 코드는 건드리지 않았다.
- 캡처: `e2e/test-results/a27-home-canvas-1600.png`(전체), `a27-home-canvas-collapsed-1600.png`

## E3. 3개년 자동 확인 API · DB (A1)

- **계약 먼저**: `api-contract.md` §38-12(신규)·§38-11 변경 메모, `domain.md` §30-B(신규). 모두 DRAFT · 사용자 지시 · **팀 승인 별도**.
- **Endpoint**
  - `POST /api/admin/assessment/evaluation-plans/schoolinfo-sync` → 202(작업 진행) / 200(기록으로 답함)
  - `GET …/schoolinfo-sync/{jobId}` → 읽기 전용(외부 요청·DB 쓰기 없음 — IT 단언)
- **기준 학년도**: 서버 `Clock`(KST) 달력 연도 Y → `[Y, Y-1, Y-2]`. 요청이 다르면 `409 SCHOOLINFO_SYNC_YEARS_MISMATCH` + `details.expectedAcademicYears`. 화면은 그 값으로 한 번만 다시 보낸다. 2027 경계는 IT(`AdjustableClock` 2027-01-05 → `[2027,2026,2025]`)와 Node(UTC 2026-12-31 15:30 = KST 2027)로 확인했다.
- **세 층 상태**
  - 작업 `state`: RUNNING · COMPLETED · PARTIAL · FAILED
  - 학년도 `status` 12종
  - 슬롯 18개 `status`(수집) + `analysisStatus`(분석) — 응답은 **항상 18개**
- **중복 방지 (메모리에 기대지 않음)**
  - 원본: (학교, 조회 학년도, SHA) Unique
  - 슬롯 연결: (학교, 학년도, 학년, 학기, 원본) Unique — 문서 등록과 연결이 한 트랜잭션
  - 같은 학교 진행 작업 재사용, TTL(기본 24h) 안이면 외부 요청 없이 답한다(실패 학년도만 다시 받음)
  - 서버 재시작 뒤에는 DB 기록으로 답한다(IT: 새 서비스 인스턴스로 확인)
- **원본 변경**: 같은 슬롯·같은 파일 이름에 다른 SHA → **기존 문서의 새 Revision**. 이전 Revision·검토 상태는 그대로다(IT). 파일 이름만으로 같은 원본으로 보지 않는다.
- **관리자 삭제 존중**: 자동 등록 문서를 관리자가 지우면 다시 등록하지 않는다. 칸은 `REMOVED_BY_ADMIN`으로 보인다(부록 E 중 자체 점검에서 발견해 계약 → 코드 → IT 순서로 추가).
- **Migration** `V202611190200__assessment_schoolinfo_sync.sql`
  - 추가만: 표 3개(`assessment_schoolinfo_source_file`·`_slot_link`·`_sync_year`), `utf8mb4_unicode_ci` 명시
  - **Testcontainers·E2E 일회용 DB에서만 적용. 사용자 DB 미적용.**
  - 발견: 처음엔 collation을 적지 않아 Testcontainers 기본 `utf8mb4_0900_ai_ci`와 기존 표가 섞여 조인 오류(1267)가 났다 → 고침. **같은 문제가 A27 학생 Migration `V202611190100`(collation 미기재)에도 잠재한다** — 기존 Migration은 수정 금지라 보고만 한다(사용자 DB 서버가 `unicode_ci` 기본이면 영향 없음, 적용 전 확인 필요).
- **인증·권한**
  - 관리자 Actor만. 학생·미인증·모르는 관리자 → 4xx(IT).
  - '학교 A 관리자 → 학교 B 작업 금지'는 현재 모델에 없다. OD-A08(2026-11-13 사용자 결정: 운영 권한 관리자는 모든 학교 운영)이라 바꾸지 않았다.
- **외부 안전 (`SchoolInfoClient` 재작성)**
  - 공식 주소만 허용(시험은 `allow-loopback`일 때 루프백만)
  - Redirect 수동 처리 — 같은 호스트 3번까지, 다른 호스트면 즉시 중단·재시도 없음
  - 30MB 상한(스트림으로 읽음)
  - ZIP: 항목 50·합계 100MB, `../`·ZIP 안 ZIP 거부, 손상 ZIP 구분
  - 429·5xx·연결 오류: 최대 3번 재시도 후 그 학년도만 `FAILED`(미공시로 보지 않음)
  - 요청 사이 0.5초, 작업 1개가 차례로 처리
- **수동 불러오기(§38-11)도 같은 규칙으로 바꿨다**: 요청 학년도 지정 조회 + 분류. `defaultGrade`로 학년을 임의로 붙이던 동작을 없앴다(받지만 쓰지 않음). 화면의 '학교알리미에서 불러오기' 주 버튼은 없앴고 '다시 확인' 보조 단추만 둔다. `SchoolInfoImportModal.tsx`는 쓰이지 않게 됐지만 지우지 않았다(삭제 승인 범위 밖).

## E4. 학교알리미 출처 연도 · 동명 학교

- **`JG_YEAR` 의미 실측: NOT RUN**(실접속 미승인).
- 구현 근거
  - `fetchYear(shl, year)`가 `JG_YEAR`·`JG_YEAR2`·`CHOSEN_JG_YEAR`=요청 학년도, `PRE_JG_YEAR`=학교 상세 기본연도로 보낸다.
  - 학교알리미가 되돌려 준 공시연도(`resolvedSourceYear` = 내려받기 Form의 `JG_YEAR`)를 따로 기록한다.
  - 학교 상세에 학년도 option이 있는데 요청 연도가 없으면 `YEAR_UNAVAILABLE`.
- **안전 장치 — `assessment.schoolinfo.year-query-verified`(기본 false)**: 실측 전에는 받은 파일을 모두 `NEEDS_SOURCE_VERIFICATION`(사유 `YEAR_QUERY_UNVERIFIED`)으로 두고 **등록 0건**이다(IT). 즉 **현재 기본 설정으로는 실서비스에서 자동 등록이 일어나지 않는다.** 실측 뒤 켜는 결정이 필요하다.
- **등록 조건 (모두 충족해야 VERIFIED)**
  1. 연도 조회 신뢰
  2. 되돌려 준 공시연도 = 요청 학년도
  3. 파일 이름(YYYY) 또는 원문 앞부분의 첫 'YYYY학년도' = 요청 학년도(파일 이름에 연도가 여럿이면 보류)
  4. 학년·학기 근거(파일 이름 → 없으면 원문 제목줄)
  - 숫자 사이 공백('2026 1학년')이 붙어 학년을 놓치던 문제를 시험 중 발견해 고쳤다.
- **금지 시나리오 (IT, 모두 등록 0건)**
  - 2024 요청 → 학교알리미가 2026 공시를 돌려줌 → 6칸 모두 `YEAR_MISMATCH`
  - 파일 이름 2026 · 요청 2024 → `FILE_YEAR_DIFFERS`
  - 연도 근거 없는 파일 → `NEEDS_SOURCE_VERIFICATION`
  - 학년·학기 근거 없음 → `UNCLASSIFIED`(임의 고1·1학기 없음)
  - 미공시 학년도를 다른 학년도로 채우지 않음
- **학교 식별**
  - 학교 이름은 요청에서 받지 않고 서버가 학업 Context에서 찾는다. 없으면 외부 요청 없이 `SCHOOL_IDENTITY_REQUIRED`.
  - 검색 2곳 이상 → `SCHOOL_AMBIGUOUS`(항목 요청 0건)
  - 1곳이어도 학교알리미 이름(공백 무시)이 다르면 항목·첨부를 받기 전에 멈춤
  - 지역·주소·학교알리미 고유 ID 저장소가 없어 그 이상 맞추지 못한다(결정 필요).
- **학생 공개**: 수집 기록·연결은 관리자 응답에만 있다. 학생 §10-1-3 공식 원본 공급자와 연결하지 않았다. 학생 홈 '공식 원본이 아직 확인되지 않았어요' 그대로(E2E 2곳).

## E5. 원본 다양성 — 수집 · 분류 · 분석 따로 (Fixture)

| 문서 | 수집 | 분류·슬롯 | 분석 | 근거 |
|---|---|---|---|---|
| 한 학년 전 과목 합본(PDF) | PASS | 2026 고1-1 | 빈 합성 PDF라 분석 결과 별도 | IT |
| 과학과·수학과·사회과 합본 3개 | PASS | 2026 고2-1에 3문서 | 별도 | IT |
| 과목별 PDF·HWP·HWPX 3개 | PASS | 2026 고3-2에 3문서 | HWPX(과목 0, 부록 D P1)도 등록은 성공 — 슬롯 REGISTERED, analysisStatus 별도 | IT |
| 한 파일에 양 학기(1·2학기) | PASS | 고1-1·고1-2 두 칸(원본 1) | 별도 | IT·E2E |
| 전 학년 합본(1,2,3학년 2학기) | PASS | 2025 고1~3-2 세 칸, 원본 1개(IT 단언) | 별도 | IT·E2E |
| 원문에만 학년도·학년·학기(HWPX 제목줄) | PASS | 원문 제목줄 근거로 VERIFIED | — | Unit |
| 연도·학년·학기 표기 없음 | PASS(원본 보관) | `NEEDS_SOURCE_VERIFICATION`/`UNCLASSIFIED`, '분류 확인 필요' 목록에 남김 | — | IT·E2E |
| ZIP 안 여러 파일 | PASS | 각 파일 따로, 순번/이름 출처 | — | IT·Unit |
| ZIP 안 ZIP·`../` 경로·손상·항목 초과 | 거부(사유 기록) | 등록 안 함 | — | Unit·IT |
| 스캔 PDF(글자 없음) | PASS | 파일 이름 근거로 등록 | OCR 끔(IT) → 분석은 별도 상태 | IT |
| 채점기준 없음·복잡한 채점기준·동명 1·2차 | 수집 경로는 같음 | — | 분석 정확도는 부록 D D5 그대로(동명 1·2차 오병합 P1) | 부록 D |
| 실제 학교 문서 | **NOT RUN** | **NOT RUN** | **NOT RUN** | — |

## E6. 검증 (이번 작업에서 실제 실행, KST)

| 항목 | 결과 | 시각 |
|---|---|---|
| 신규 Unit `SchoolInfoClientTest` 8 · `SchoolInfoSourceClassifierTest` 7 · 기존 `SchoolInfoGradesTest` 3 | 18/18 | 17:51 |
| 학교알리미 IT `SchoolInfoSyncApiTest` 8 + `SchoolInfoImportApiTest` 2 | 1차 8/10 → **10/10**. 1차 실패: 시험 필터 오류 1, **collation 결함 1**(고침) | 17:52 → 17:53 |
| Backend Unit + ArchUnit 전체 (`test --rerun`) | **428 tests, 0 failed, 1 skipped** | 18:14 |
| `scripts/verify-frontend.ps1` (student·admin typecheck·oxlint `--deny-warnings`·build) | **PASS** (2회) | 17:5x · 18:15~18:17 |
| Node 시험 — frontend 전체 | **147/147**(Assessment 모델 34/34) | 18:17 |
| E2E `a27-pr18`(3, 1번은 자동 확인 화면으로 교체) + `z-a27-autosync`(1, 실제 Backend + 가상 학교알리미) | **4/4** | 18:04~18:06 |
| E2E `a27-student-shell`(4) | 1차 1/4 → 2차 3/4 → **4/4**. 1차: 실제 메뉴 이름 '성장 기록'·카드 단언 방식(시험 수정), Drawer Focus(코드 수정) | 18:05 → 18:07 → 18:1x |
| Backend IT 전체 | **NOT RUN — 시스템 메모리 부족으로 실행 도중 강제 종료**(결과 XML 0건). 자동으로 다시 시작하지 않았다 | 18:16~ |
| 마지막 수정(관리자 삭제 존중 `REMOVED_BY_ADMIN` + IT 1건 추가) | 컴파일·admin typecheck·Node 4/4만. **해당 IT 미실행** | 18:2x |
| Assessment E2E 전체(17파일) | **NOT RUN**(위 메모리 상황) | — |
| Student Care IT·Playwright | **NOT RUN**(Student Care 변경 0건. 부록 D의 Student Care IT 통과 기록은 이번 수치가 아니다) | — |

- 4개 해상도(1366×768·1600×900·1920×1080·800×600) 가로 넘침 0: 학생 Shell(펼침·접힘·Drawer), 관리자 자동 확인 화면(대역 1600·800, 실제 Backend 1366·1600·1920·800)을 E2E가 단언했다.
- 시험 환경 실패(비코드)
  - E2E 실행 셸의 `NoDefaultCurrentDirectoryInExePath=1` → 그 변수만 빼고 실행(부록 D와 같음)
  - Docker CLI가 메모리 압박 중 다시 응답하지 않음(마감 시)
- 캡처(`e2e/test-results/`): `a27-autosync-summary-1600.png`, `a27-autosync-real-1600.png`·`-1366.png`·`-previous-year-1600.png`, `a27-shell-expanded-1600.png`·`-collapsed-1600.png`·`-drawer-800.png`, `a27-home-canvas-1600.png`·`-collapsed-1600.png`
- 이전 수치(413 Unit, E2E 53/53 등)는 회귀 기준일 뿐 이번 결과가 아니다.

### 학년도별 검수표 (Fixture = IT 표준 Fixture, 기준일 2026-09-30 KST)

| 항목 | 2026(현재) | 2025(직전) | 2024(전전) |
|---|---|---|---|
| 실제 학교알리미 공시연도 선택 검증 | Fixture PASS / 실학교 **NOT RUN** | Fixture PASS / 실학교 **NOT RUN** | Fixture PASS / 실학교 **NOT RUN** |
| 6칸 (고1-1/고1-2/고2-1/고2-2/고3-1/고3-2) | 등록 / 등록 / 등록 / 이 칸 파일 없음 / 이 칸 파일 없음 / 등록 | 출처 확인 필요 / 등록 / 출처 확인 필요 / 등록 / 등록(ZIP) / 등록 | 6칸 모두 학년도 불일치 |
| 받은 파일 / 등록 문서 / 슬롯 연결 | 9 / 10 / 10 | 4(ZIP 안 1 포함) / 4 / 4 | 1 / 0 / 0 |
| 형식·합본 | 전 과목·교과군 3·과목별(PDF·HWP·HWPX)·양 학기·스캔 | 전 학년 합본·ZIP·근거 없음 2 | 다른 학년도 공시 |
| 미공시·미분류·불일치·실패 | 없음(COMPLETED) | 미분류 2 + ZIP 안 ZIP 1 → PARTIAL | `DISCLOSURE_YEAR_DIFFERS` → YEAR_MISMATCH(등록 0) |
| 중복 방지 / 기존 초안·확정 보존 | 재실행·TTL 재수집 문서·Revision 증가 0 PASS · SHA 변경 시 Revision 추가·이전 Revision 상태 그대로 PASS | 같음 PASS | 등록 0 PASS |
| 다운로드 / 재사용 / 소요시간 | TTL 재수집: 14 / 14(세 학년도 합계) · 소요시간은 응답 `elapsedMillis`로 주지만 이번 실행에서 따로 기록하지 않음 | 〃 | 〃 |

- 18개 중 등록 칸 8개 → 화면 '18개 구간 중 원본 등록 8개', 작업 상태 PARTIAL(18/18 아님).
- 미공시 칸(`NO_SOURCE_FOR_SLOT`·`NOT_PUBLISHED`)은 '확인 완료'이지 '원본 등록 완료'가 아니다.

## E7. 남은 것 · 결정 필요

| 등급 | 내용 | 다음 행동 |
|---|---|---|
| **P0 (차단 중)** | 실서비스 학교알리미의 학년도 지정 조회 의미 미실측 → 기본 설정(false)에서 자동 등록 0건으로 막아 둠 | 실접속 승인 → 일회용 DB로 띄운 Backend에서 2~3개 학교 실측 → `year-query-verified` 켜기 결정 |
| P1 | 동명 학교·이름 불일치는 막기만 한다(지역·주소·학교알리미 ID 없음) | 학교 Master/식별 계약 결정 |
| P1 | 분류 못 한 원본은 보관만 하고, 관리자가 학년·학기를 정하는 API·화면이 없다 | 분류 확정 정책 결정 |
| P1 | 분석기 정확도(합성 HWPX 과목 0, 동명 1·2차 오병합) — 부록 D 그대로, 수집과 분리해 표시 | PR 담당자 |
| P1 | 마지막 수정(`REMOVED_BY_ADMIN`)의 IT, Backend IT 전체, Assessment E2E 전체 **미실행**(메모리) | 메모리 여유 확보 뒤 실행 승인 |
| P2 | `V202611190100`(A27 학생 Migration) collation 미기재 | 사용자 DB 적용 전 서버 기본 collation 확인 |
| P2 | 여러 학년·두 학기 합본은 슬롯마다 원본 바이트를 Storage에 다시 저장한다(§38 등록 구조). 출처 SHA는 하나 | 필요 시 저장 공유 설계 |
| P2 | 작업·진행 상태는 메모리(최근 50개), 결과는 DB | — |
| P2 | `SchoolInfoImportModal.tsx` 미사용 | 삭제 여부 결정 |
| 결정 | PR `V202611180100` A/B — 부록 D 그대로(이번에 넣지도 적용하지도 않음) | 팀·담당자 협의 |
| 승인 | §38-12·§38-11 변경·`REMOVED_BY_ADMIN`·Migration `V202611190200`의 팀 승인, 사용자 DB 적용 시점 | OWNERSHIP 절차 |

## E8. 전달물 · 완료 판정

- **신규 (28)**
  - Backend main 13: `controller/AdminSchoolInfoSyncController`, `dto/plan/SchoolInfoSyncRequest`·`SchoolInfoSyncResponse`, `entity/SchoolInfoSourceFile`·`SchoolInfoSlotLink`·`SchoolInfoSyncYear`, `repository/SchoolInfoSourceFileRepository`·`SchoolInfoSlotLinkRepository`·`SchoolInfoSyncYearRepository`, `service/plan/SchoolInfoSyncService`·`SchoolInfoSyncWriter`·`SchoolInfoSourceClassifier`·`SourceTextProbe`
  - Backend test 5: `SchoolInfoFakeSupport`, `SchoolInfoSyncApiTest`, `FakeSchoolInfoServer`, `SchoolInfoClientTest`, `SchoolInfoSourceClassifierTest`
  - Migration 1: `database/migrations/V202611190200__assessment_schoolinfo_sync.sql`
  - Admin 4: `model/schoolInfoSync.ts`(+test), `model/useSchoolInfoSync.ts`, `routes/SchoolInfoSyncSummary.tsx`
  - Student 2: `model/sidebarPreference.ts`(+test)
  - E2E 3: `assessment/stub-schoolinfo.mjs`, `tests/a27-student-shell.spec.ts`, `tests/z-a27-autosync.spec.ts`
- **수정 (20)**
  - Backend: `SchoolInfoClient`, `SchoolInfoConfig`, `SchoolInfoImportService`, `AssessmentErrorCode`, `PlanRevisionRepository`
  - Backend test: `SchoolInfoImportApiTest`
  - Admin: `PlanSlotsRoute`, `planSlots.module.css`, `api/assessmentAdminApi.ts`·`http/assessmentAdminHttp.ts`·`types.ts`
  - Student: `AssessmentLayout.tsx`·`.module.css`, `styles/assessmentTheme.css`, `home/homeDashboard.module.css`
  - E2E: `playwright.assessment.config.ts`, `tests/a27-pr18.spec.ts`
  - 문서: `api-contract.md`, `domain.md`, `assessment-analyzer-setup.md`, 이 부록
- **삭제 0건.** 기존 Migration 수정 0건. Student Care·`frontend/shared`·`backend/common` 변경 0건.

| DoD | 판정 |
|---|---|
| S1 메뉴 전체 접기·11개 메뉴/Route·아이콘·접근 이름·키보드·상태 기억·Drawer·4해상도 가로 넘침 0 | **PASS**(E2E 4/4) — 전체 E2E 회귀는 NOT RUN |
| S2 홈만 연회색·흰 카드·다른 화면 불변 | **PASS**(E2E) |
| A1 클릭 없이 3개 학년도를 서버로 보내고 학년도별로 따로 조회 | **Fixture PASS / 실학교 NOT RUN** |
| 18개 구간 상태 · 관리자 학년도별 6칸 유지 | **PASS**(IT·E2E) |
| 문서 다양성 · 원본 보존 | **Fixture PASS**(E5) / 실제 학교 문서 NOT RUN |
| 다른 학년도·학교 오등록 0 · 같은 출처 중복 0 · 기존 원본·초안·확정·이력 덮어쓰기 0 | **Fixture PASS**(IT) — 관리자 삭제 존중 IT는 미실행 |
| 자동 확정·학생 자동 공개 0 | **PASS**(IT: 확정 0 · E2E: 학생 비노출) |
| 사용자 DB·서버·Git 작업 0 · HWP 6/6 | **PASS** |
| 실측 못 한 부분을 '완전 동작'으로 쓰지 않음 | 이 부록 전체 |
| **종합** | **PARTIAL** — 구현과 주요 독립 시험은 통과. 실제 학교알리미 실측, 마지막 수정의 IT, Backend IT 전체·E2E 전체 회귀가 남았다 |


# 부록 F. 학교 식별·미분류 원본·메모리 안정화 및 전체 검증 (2026-11-19)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_AppendixF_Recovery_SchoolInfo_ClaudeCode_Prompt_20261119.md`
- 기준: 부록 E §E0~E8. S1·S2·A1(3개년 18구간)은 그대로 두고 보완했다(재구현 없음).
- **실제 학교알리미 접속 0건.** 사용자 DB 쓰기·Migration 적용 0건, 사용자 서버 종료·재시작 0건, Git 작업 0건.
- 이번 실행 결과만 적는다. 부록 D·E 수치는 비교용이다.

## F0. 시작·마감 상태

| 항목 | 시작 (21:5x) | 마감 (22:5x) |
|---|---|---|
| Branch · HEAD · staged | `integration/assessment-studentcare-20261116` · `9755581` · 0 | 같음 · 같음 · 0 |
| Git (porcelain) | M 143 · D 14 · ?? 134항목(untracked 파일 152) | M 144 · D 14 · ?? 146항목 — 신규 12파일·수정 23파일(F9) |
| HWP/HWPX 변환기 6파일 | SHA 6/6 일치 | **6/6 일치** |
| 원본 폴더 `C:\learnershigh-extension` | 68건 | 68건 |
| 사용자 DB `lh_local_run` | Flyway `202611170300` | `202611170300`(읽기 전용 조회, 변경 없음) |
| 백업 | `C:\learnershigh-A27-UX-appendixF-backup-20261119\` — `tracked.diff`(`--binary`)·`untracked.tar`·`modified-snapshot.tar`·`report-before.md`·`hwp6.sha256`·`git-status.txt` + `backup.sha256` 검증 OK, 시험 로그·메모리 기록 | — |

- **사용자 서비스 포트(관찰 사실)**: 부록 E 마감 때는 8080·5173·5174·33307이 모두 LISTENING이었다. 이번 시작(21:51) 때는 **33307만 LISTENING이고 8080·5173·5174는 없었다.** Docker Desktop도 약 21:49에 재시작된 흔적이 있다(실사용 DB 컨테이너 'Up 2 minutes').
  - 이 작업은 그 프로세스들을 종료하지 않았다. 지시대로 다시 띄우지도 않았다(마감 때도 같은 상태).
  - 원인은 확인하지 않았다(사용자 조작 또는 메모리 압박 중 종료 가능성 — 추측으로 적지 않는다).

## F1. 메모리 진단 (G1-A, 읽기 전용)

| 지표 (21:52) | 값 |
|---|---|
| 물리 RAM · 가용 | 15.6GB · **1.0GB** |
| Commit · 한도 | 31.9GB · 55.6GB (페이지 파일 의존이 큼) |
| 상위 사용 | `vmmemWSL` 2.87GB(Docker VM) · Chrome 21개 2.68GB · Notion 0.96GB · svchost 0.81GB · Claude 0.61GB · Docker Desktop 0.57GB · VS Code 0.43GB · Discord 0.31GB |
| WSL | `docker-desktop` 1개, `.wslconfig` 없음 → WSL 기본 한도(물리 RAM 50%) — Docker `MemTotal` 8.09GB · CPU 16 |
| Docker 컨테이너 (21:52 직전) | `docker info`: **실행 19개 / 전체 52개** — 실사용 DB 1개를 빼면 모두 Testcontainers MySQL(`org.testcontainers=true`) |
| Java | 사용자 8080 Backend 없음. 이 작업 계열의 Gradle daemon 1개(0.08GB) |

- **직접 증거**: 부록 E의 IT 전체 실행(18:15~18:23)이 거의 1분마다 MySQL 컨테이너를 만들었다. 그 컨테이너들이 실행 중으로 남아 있었다(컨테이너 이름·생성 시각·라벨로 확인).
- **원인 분류**
  - **Testcontainers 기동 누적(주원인, 직접 증거)**: `integrationTest`는 이미 JVM 1개였다(병렬 fork 없음, 확인). 그런데 Spring 테스트 Context 캐시(기본 최대 32개)가 설정이 다른 Context마다 자기 MySQL 컨테이너를 띄운 채로 보관했다 → Docker VM 8GB 고갈 → InnoDB `io_setup() EAGAIN`(부록 D)과 호스트 메모리 압박.
  - **호스트 여유 부족(배경)**: 가용 1GB, Chrome·Notion 등 사용자 앱(종료하지 않음).
  - **Gradle worker 과다·Playwright 동시 실행**: 해당 없음(각각 1개, 순차).
  - **Docker 엔진 문제**: 고갈 결과로 CLI가 응답하지 않았다(원인이 아니라 결과).
  - **OOM 강제 종료 근거**: Windows 이벤트 로그는 조사하지 않았다.
- **적용한 조치 (이 작업이 띄운 시험에만)**
  - 시험 JVM에 `JAVA_TOOL_OPTIONS=-Dspring.test.context.cache.maxSize=2` — 밀려난 Context가 닫히면서 컨테이너도 멈춘다. 코드·빌드 설정 변경 없음.
  - `--no-daemon --max-workers=1`
  - Unit → IT(배치) → E2E → Frontend를 **동시에 돌리지 않고 차례로** 실행
- **정리**: 이 작업 계열이 오늘 남긴 **종료된** Testcontainers 컨테이너 41개만 `docker rm`(라벨 `org.testcontainers=true` + 2026-11-19 생성으로 식별). 9일 전 Testcontainers 5개·사용자 컨테이너(`lh-local-run-mysql`·`learnershigh-mysql` 등)는 그대로 뒀다.
- **하지 않은 것**: `docker system/volume prune`, `wsl --shutdown`, 전역 프로세스 종료, 사용자 앱 종료, WSL/Docker 메모리 설정 변경.
- **결과**
  - 배치마다 실행 중 컨테이너는 최대 2개(실사용 DB + Testcontainers 정리 컨테이너 Ryuk)였다.
  - 가용 RAM은 1.7~3.8GB 사이를 유지했고, 시험 도중 강제 종료는 0건이었다.
  - 이전(부록 E)에는 컨테이너가 쌓이며 시험이 강제 종료됐다.
- **권장(사용자 결정, 이번에 적용하지 않음)**
  - `.wslconfig`에 `memory=6GB` 정도로 Docker VM 상한을 명시한다 — 호스트 페이지 파일 압박이 줄지만 Docker 작업 한도도 같이 정해진다.
  - 또는 시험 전용 `spring.test.context.cache.maxSize`를 `backend/src/test/resources/spring.properties`에 고정한다(팀 합의 필요).

## F2. 시험 재실행 (G1-B · G6, 이번 실행)

| 단계 | 명령(요약) | 결과 | 시각 |
|---|---|---|---|
| T1 `REMOVED_BY_ADMIN` 포함 학교알리미 IT | `integrationTest --tests *SchoolInfoSyncApiTest *SchoolInfoImportApiTest` (저자원) | **11/11** — 관리자 삭제 → 재확인 → 재등록 0 · `REMOVED_BY_ADMIN` · Revision 1개 유지 | 21:51~21:52 |
| T2 IT 전체(변경 전 기준선) | 46클래스 → 배치 3개 | **BATCH-COMPLETE 46/46 · 243건 · 실패 0 · skip 0** (48+73+122) | 21:53~22:07 |
| T3 Assessment E2E 전체(변경 전 기준선) | `npm run test:assessment`(workers 1) | **16파일 58/58** | 22:07~22:12 |
| 부록 F 신규 IT (구현 중) | 학교알리미 3클래스 | 1차 17/18(시험 격리: 앞 시험의 선택 후 작업이 진행 중이었음 → 시험에서 끝날 때까지 기다리게 수정) → **18/18** → `force` 시험 추가 | 22:22~22:24 |
| 부록 F 신규 E2E (구현 중) | `z-a27-autosync` | 1차 1/2 → 원인 2개(아래) 수정 → **2/2**(3회) | 22:29~22:3x |
| **최종 Backend Unit + ArchUnit** | `test --rerun --no-daemon --max-workers=1` | **429 tests · 0 fail · 1 skip**(60클래스) | 22:35 |
| **최종 IT 전체** | 47클래스 → 배치 3개(합집합 = 전체 47, 중복 0 확인) | **BATCH-COMPLETE 47/47 · 251건 · 실패 0 · skip 0** (48+81+122) | 22:35~22:49 |
| **최종 Assessment E2E 전체** | `npm run test:assessment` | **16파일 59/59** (4.3m) | 22:49~22:54 |
| **최종 Frontend** | `scripts/verify-frontend.ps1` | **PASS** (student·admin typecheck · oxlint `--deny-warnings` · build) | 22:54 |
| **최종 Node 시험** | frontend 전체 `*.test.mjs` | **147/147** | 22:55 |
| Student Care Playwright | — | **NOT RUN** — 이미 떠 있는 앱(4174)과 **API 8080(사용자 Backend 포트)**에 붙고 시험 리셋 API를 부르는 구성이라 사용자 서비스·DB 보호 원칙상 실행하지 않음. Student Care IT 7클래스는 최종 IT 배치에 포함돼 통과 | — |

- 지시서의 'E2E 17개 Spec'은 실제 파일 수가 **16개**였다(14 + 부록 E 신규 2).
- IT는 단일 전체 실행이 아니라 **배치 실행(BATCH-COMPLETE)**이다. 배치 목록·결과 XML: 백업 폴더 `itf-batch-00~02`·`itf0~2-results\`·`itf*.mem`(전후 가용 RAM·컨테이너 수).
- E2E 1차 실패 원인 2개(둘 다 시험 측)
  1. E2E 공용 합성 PDF(`synthetic-e2e.pdf`)에 본문(학년도·학년·학기)이 있어, 분류기가 원문 제목줄 근거로 판정했다(정상 동작). 그래서 '미분류' 원본을 만들 수 없었다 → 본문 없는 합성 PDF 도우미 `blankPdf` 추가.
  2. 좁은 Modal에서 원본 이름 칸이 0폭으로 눌림(화면 결함) → 한 열 배치로 수정.

## F3. 학교알리미 실제 접속 (G2) — 승인 게이트

- **이번 상태: 승인 없음 → 접속 0건 → `LIVE` 결과 전부 NOT RUN.** `assessment.schoolinfo.year-query-verified=false`(기본) 유지. 운영 자동 등록은 지금도 0건이다(정상 fail-closed).
- **실측 제안 (승인 요청)**

| 항목 | 제안 |
|---|---|
| 대상 | 공개 평가계획서가 있는 학교 2~3곳. 학교는 승인 때 사용자가 지정하거나, 승인 뒤 공개 검색 결과에서 고른 후보를 실측 전에 먼저 보고한다. 가능하면 1곳은 동명 학교가 있는 이름 |
| 범위 | 2026·2025·2024 학년도 평가계획 공시 화면과 그 공개 첨부만 |
| 요청량 | 학교당 검색 1 + 상세 1~(동명 후보 수) + 학년도 항목 3 + 첨부 내려받기(학년도당 최대 3개). 요청 사이 0.5초 이상, 429·5xx면 그 학교 중단. 로그인·차단 우회·대량 스캔 없음 |
| 실행 | 일회용 MySQL + 전용 포트 Backend(사용자 8080·DB 아님). 원본은 서버 안 분석기만, 외부 AI·Railway로 보내지 않음 |
| 기록 | 학교별 ① 검색 결과 수 ② 상세의 학교 이름·**주소가 실제로 읽히는지**(F4의 `<th>주소</th><td>` 가정 검증) ③ 학년도 요청마다 되돌려 준 `JG_YEAR` ④ 첨부 파일 이름·형식·원문 첫 'YYYY학년도' ⑤ 분류 결과 — 민감정보 없는 표로 부록에 |
| 판정 | 세 학년도 모두에서 '요청 학년도 = 되돌려 준 공시연도 = 원문 학년도'가 확인된 경우에만 근거로 삼는다. 2~3곳 결과로 전국 정확도를 주장하지 않는다 |
| 안전 | 실측 뒤에도 `year-query-verified`를 스스로 켜지 않는다. 운영에서 켜는 것은 결과를 본 뒤 별도 결정 |

- 승인 문구 예: "학교알리미 실측 승인: 학교 ○○·△△(·□□), 2024~2026, 위 요청량·기록 형식". 승인이 오면 그대로만 실행한다.

## F4. 동명 학교 — 지역·주소로 학교 선택 (G3)

- **확보 가능성 조사 (코드 수준)**
  - 현재 학교 검색 응답 파서는 학교알리미 학교 ID(`SHL_IDF_CD`)만 읽고, 이름·지역·주소는 읽지 않았다.
  - 학교 상세 화면은 이미 받고 있었다(이름 `HG_NM`·기본 공시연도).
  - **실제 학교알리미 화면에 주소가 어떤 모양으로 있는지는 실측하지 않았다 → 실학교 지원 `UNVERIFIED`.**
- **구현**
  - 상세 화면의 `<th>주소</th><td>…</td>`에서 주소를 읽는다. 시도·시군구는 그 주소의 첫 두 낱말에서만 나눈다(지역 목록·하드코딩 없음).
  - 읽지 못하면 `ADDRESS_MISSING`으로 그 후보는 고를 수 없다(거짓 지역 없음). 실제 화면이 이 모양이 아니면 모든 후보가 선택 불가가 되고 수동 등록을 안내한다(추측 연결 없음).
- **흐름**
  1. 검색 1곳 → 기존 자동 경로 그대로(선택 창 없음)
  2. 검색 여러 곳 → 각 상세(최대 10곳)의 이름·주소를 읽어 **이름이 같은 학교만** 후보로 둔다. 하나면 자동, 여럿이면 `schoolSelection.required`, 학년도 `SCHOOL_AMBIGUOUS`, 등록 0. 10곳 초과는 `TOO_MANY_CANDIDATES`.
  3. 관리자 선택 → 서버가 작업·학교·후보·`selectable`·이름을 확인 → 선택 저장(`version`) → **그 학교 하나만** 세 학년도를 TTL과 무관하게 다시 확인
  4. 다음 확인부터는 검색 없이 선택한 학교를 확인한다. 이름·주소가 바뀌면 선택 무효(`INVALIDATED`, `MAPPING_CHANGED`) → 다시 선택, 등록 0
- **선택 가능 조건**: 주소가 있고 다른 후보와 주소가 다를 것. 주소가 같은 후보끼리는 `ADDRESS_DUPLICATE`.
- **화면에 학교알리미 학교 ID를 주지 않는다** — 작업 안에서만 쓰는 `candidateId`(서버 값)를 쓴다. 클라이언트가 ID를 바꿔 보내도 409(IT).
- **API·DB**
  - `POST …/schoolinfo-sync/school-selection` (§38-13)
  - §38-12 응답에 `schoolSelection`(`required`·`reason`·`candidates[]`·`selected`·`mappingVersion`) 추가
  - 표 `assessment_schoolinfo_school_mapping`
- **화면**: 자동 확인 요약에 '같은 이름의 학교가 여러 곳 검색됐어요' + '학교 선택'(중립 outline) → Modal(지역 선택 → 이름·지역·주소 후보 → 선택 확인). 닫으면 수집이 멈춘 채 그대로다(다른 학교로 대체하지 않음). 선택 뒤 '학교알리미 학교: 이름 · 주소'를 한 줄로 보인다.
- **시험 (Fixture = 가상 학교·가상 주소)**

| 시나리오 | 결과 |
|---|---|
| 동명 2곳(다른 시도) → 고르기 전 등록 0·항목 요청 0 → 가상광역시 학교 선택 → 그 학교 원본만 등록, 다른 후보 파일 0 | Fixture PASS (IT·E2E) |
| 동명 4곳: 같은 시도·다른 시군구, 주소 없음 1, 주소 같음 2 → 선택 가능 1곳만 | Fixture PASS (IT) |
| 주소 없는 후보 · 위조 candidateId · 학교알리미 ID 직접 전송 · 다른 학교 작업 · 없는 작업 | 409·409·409·409·404, 등록 0·선택 저장 0 (IT) |
| 같은 후보 동시 2회 → 선택 version 1 · 다른 후보로 바꾸기(옛 버전) → 409 | Fixture PASS (IT) |
| 고른 학교 주소 변경 → `MAPPING_CHANGED`·`INVALIDATED`·등록 증가 0 | Fixture PASS (IT) |
| 여러 곳 검색 중 이름이 같은 학교가 하나 → 선택 창 없이 자동 | Fixture PASS (IT) |
| 선택 뒤 TTL 지나 재확인 → 검색 요청 0, 중복 0 · 서버 재시작 뒤 → DB의 선택으로 동작 | Fixture PASS (IT, 새 서비스 인스턴스) |
| 실제 학교알리미 후보의 지역·주소 확보 | **NOT RUN** |

## F5. 분류하지 못한 원본 — 관리자 학년·학기 분류 (G4)

- **두 단계를 분리했다.**
  - ① 출처·학교·학년도 확인은 받을 때 서버가 정한 `verification`을 그대로 쓰고, 이 기능이 바꾸지 않는다.
  - ② **`UNCLASSIFIED`(출처·학년도 확인됨, 학년·학기 근거만 없음)만** 관리자가 분류한다.
  - `NEEDS_SOURCE_VERIFICATION`·`YEAR_MISMATCH`(`YEAR_QUERY_UNVERIFIED`·`DISCLOSURE_YEAR_DIFFERS`·`FILE_YEAR_DIFFERS`·`FILE_YEAR_CONFLICT`·`NO_FILE_YEAR_EVIDENCE`)와 학교 식별 실패는 학년·학기를 골라도 **409, 등록 0**.
- **API**
  - `GET …/schoolinfo-sources` — 그룹 `CLASSIFICATION`/`SOURCE_VERIFICATION`/`OTHER`, 근거, 현재 분류, 이력, 연결 칸
  - `GET …/schoolinfo-sources/{id}/file` — 원본 내려받기(관리자, 학교 다르면 404)
  - `PUT …/schoolinfo-sources/{id}/classification` (§38-14)
- **저장**: 표 `assessment_schoolinfo_classification`(Revision, 지우지 않음 — 관리자·시각·학년들·학기들·메모). 분류 Revision과 칸 연결(§38 등록 + 슬롯 연결)은 **한 트랜잭션**이다. 분석은 커밋 뒤 서버 작업 줄에 넣는다.
- **규칙**
  - 원본의 조회 학년도 칸에만 넣는다(2025 원본 → 2026 칸 409 `ACADEMIC_YEAR_DIFFERS`).
  - 여러 학년 × 학기 칸에 연결하고 원본 SHA는 하나다.
  - 이미 연결된 칸은 그대로(중복 0). 연결된 칸 빼기는 409(문서 삭제 §38-9로만). 칸을 더하는 것은 된다.
  - `expectedVersion` 충돌은 409(먼저 저장한 분류 보존). 관리자가 지운 문서는 되살리지 않는다.
- **화면**: 자동 확인 요약의 '원본 분류' → Modal
  - '학년·학기 미분류 n개 — 출처·학년도 확인됨' 카드: 파일·형식·크기·학년도·공시연도·사유, 원문 내려받기, 고1~3·1·2학기 체크(연결된 칸은 잠김), 근거 메모(200자), '연결될 칸' 미리보기, '이 원본 분류 확정'(새로 더할 칸이 없으면 비활성), 분류 이력
  - '출처·학년도 확인 필요 n개 — 학년·학기를 골라도 등록되지 않아요' 목록(사유)
  - '등록 대상이 아닌 파일'
  - 분류해도 분석·검토 4단계·과목 제외·확정 이력은 그대로다(분석 결과 확정·학생 공개 아님).
- **시험**

| 시나리오 | 결과 |
|---|---|
| 미분류 1개를 고1·고2 × 1학기 → 두 칸 등록(원본 1) → 다시 고1·2 × 1·2학기 → 네 칸, 이력 2 | Fixture PASS (IT) |
| 같은 버전 재요청 409 · 칸 빼기 409 · 2026 칸 409 · `grades:[4]`·빈 학기 400 · 다른 학교 404 | Fixture PASS (IT) |
| `NEEDS_SOURCE_VERIFICATION`·`YEAR_MISMATCH` 원본 분류 시도 → 409, 등록 0 | Fixture PASS (IT) |
| 관리자 삭제 칸 → 재분류해도 되살리지 않음(삭제 표식 유지) | Fixture PASS (IT) |
| 다시 읽기(DB 기준) → 분류 v3·이력 3·연결 유지, 슬롯 상태 REGISTERED, 확정 0 | Fixture PASS (IT) |
| 원본 내려받기 SHA = 기록 SHA | Fixture PASS (IT) |
| 화면: 동명 학교 선택 → 미분류 카드 체크 → 미리보기 → 확정 → 이력·잠김 → 지난 학년도 6칸에 표시, 학생 화면 비노출, 800px 가로 넘침 0 | Fixture PASS (E2E) |
| 원문 미리보기(앱 안 PDF/HWP 보기) | **미구현** — 내려받기만. 기존 원본 보기 컴포넌트는 등록된 Revision 기준이라 미등록 원본에 쓰지 못함(P2) |

## F6. 계약 · Migration (G5)

- **팀 승인 기록**: 2026-11-19 사용자 전달 — §38-11 변경(부록 E)·§38-12·`REMOVED_BY_ADMIN`·`V202611190200` **팀 승인 완료**. `api-contract.md` §38-11·§38-12 제목과 §38-12 확장 메모, `domain.md` §30-B에 적었다.
  - 승인 주체·회의록·시각은 전달받지 않아 적지 않았다.
  - 팀 승인 ≠ 사용자 DB 적용 승인 ≠ 실학교 접속 승인 ≠ Git 승인.
  - `V202611190200` 파일 자체는 수정하지 않았다(체크섬 보존).
- **이번에 새로 만든 계약(팀 승인 별도, DRAFT)**
  - §38-12 요청 `force`(관리자 '다시 확인'만 TTL 무시)와 응답 `schoolSelection`·`unresolvedFiles[].sourceFileId/group` — 하위 호환 추가
  - §38-13 학교 선택
  - §38-14 원본 분류
  - `domain.md` §30-C
- **신규 Migration**: `V202611190300__assessment_schoolinfo_selection_classification.sql`
  - 추가만: 표 2개, FK는 `source_file` 참조, `utf8mb4_unicode_ci` 명시
  - **Testcontainers·E2E 일회용 DB에만 적용. 사용자 DB 미적용.**
  - 기존 `190100`·`190200` 수정 0. 버전 충돌 없음(최신 `190200` 다음).
- **`V202611190100` collation 점검 (읽기 전용)**
  - 사용자 DB `collation_server=utf8mb4_unicode_ci`, 스키마 기본 `utf8mb4_unicode_ci`, 기존 Assessment 표 21개 모두 `utf8mb4_unicode_ci`.
  - `CREATE TABLE`이 스키마 기본을 따르므로 **이 DB에 적용하면 같은 collation으로 만들어진다**(조인·FK 문제 없을 것으로 판단). 일회용 DB 재현 시험은 하지 않았다.
  - 위험은 기본값이 다른 DB(Testcontainers 기본 `0900_ai_ci` 등)에만 있다. 보완 Migration은 만들지 않았다(필요하면 새 버전으로 제안).
- **`V202611180100`**(PR 파괴적 병합): 미채택·미적용 그대로. A/B 결정 없음.

## F7. 기존 기능 보존

- 관리자 8탭·6칸·원본 보기·Revision·검토 4단계·결과 2패널·과목 검색·제외·월별 운영계획·참고자료실, 학생 11개 메뉴(접기)·홈 회색+흰 카드·개인 수행평가·메모·안내문·공식 원본 '확인되지 않음' 경계: **최종 E2E 59/59에 포함돼 통과**.
- 3개년 18구간·TTL·중복 방지·SHA 변경 Revision·`REMOVED_BY_ADMIN`·학년도 불일치 차단: 학교알리미 IT(`SchoolInfoSyncApiTest` 9 등)가 최종 배치에서 통과.
- Spring Boot 내부 분석기 `local`·`http` 모드 없음: 변경 0.
- Student Care: 코드 변경 0, IT 통과, Playwright NOT RUN(F2).
- **사람이 직접 확인해야 할 것**: 한글 IME 실제 키보드 입력, 사용자 DB로 띄운 8080·5173·5174 화면(현재 서버 꺼짐), 실제 학교알리미 화면.

## F8. 남은 것 · 승인 필요

| 등급 | 내용 | 필요한 것 |
|---|---|---|
| **P0 (차단 유지)** | 실학교 학년도 조회 의미·주소 표기 미실측 → 운영 자동 등록 0건·동명 학교 주소 확보 UNVERIFIED | F3 실측 **승인** |
| P1 | 실측 뒤 `year-query-verified` 운영 활성화 | 사용자 결정 |
| P1 | 사용자 DB에 `190100`·`190200`·`190300` 적용(+ 사용자 Backend 재시작 시 자동 Flyway) | **별도 승인**. `180100` A/B 결정과 함께 |
| P1 | 사용자 서비스 8080·5173·5174가 꺼져 있음(이 작업과 무관) | 사용자 확인 |
| P2 | 미등록 원본의 앱 안 미리보기 없음(내려받기만) | 필요 시 |
| P2 | 시험 메모리 정책(Context 캐시 2)이 실행 옵션에만 있음 | `spring.properties` 고정 여부 팀 합의 |
| P2 | `.wslconfig` Docker VM 상한 | 사용자 결정 |
| P2 | Student Care Playwright를 사용자 포트 밖에서 돌리는 설정 없음 | 별도 작업 |
| 승인 | §38-12 확장·§38-13·§38-14·`V202611190300` 팀 승인 | OWNERSHIP 절차 |
| 별도 | Git Commit·Push·Merge·PR 갱신, Railway 정리 | 별도 승인 |

## F9. 변경 파일 · 완료 판정

- **신규 (12)**
  - Backend 8: `dto/plan/SchoolInfoSelectionRequest`·`SchoolInfoClassificationRequest`·`SchoolInfoSourcesResponse`, `entity/SchoolInfoSchoolMapping`·`SchoolInfoClassification`, `repository/SchoolInfoSchoolMappingRepository`·`SchoolInfoClassificationRepository`, `service/plan/SchoolInfoClassificationService`
  - Backend test 1: `SchoolInfoSelectionClassificationApiTest`(8)
  - Migration 1: `V202611190300__assessment_schoolinfo_selection_classification.sql`
  - Admin 2: `routes/SchoolInfoSchoolSelectModal.tsx`, `routes/SchoolInfoClassifyModal.tsx`
- **수정 (23)**
  - Backend: `SchoolInfoClient`(`describe`·`address`·`region`), `SchoolInfoSyncService`(`start(force)`·`selectSchool`·`queueAnalysis`·선택 확인/무효·후보·`groupOf`·`selectionOf`), `SchoolInfoSyncWriter`(`saveMapping`·`invalidateMapping`), `AdminSchoolInfoSyncController`(Endpoint 4), `SchoolInfoSyncRequest`(`force`), `SchoolInfoSyncResponse`, `AssessmentErrorCode`(6개)
  - Backend test: `SchoolInfoSyncApiTest`(정리·생성자), `FakeSchoolInfoServer`(학교별 이름·주소·자료), `SchoolInfoClientTest`(+1)
  - Admin: `api/types.ts`·`assessmentAdminApi.ts`·`http/assessmentAdminHttp.ts`, `model/schoolInfoSync.ts`(사유 라벨), `model/useSchoolInfoSync.ts`(`retry(force)`), `routes/SchoolInfoSyncSummary.tsx`, `routes/PlanSlotsRoute.tsx`, `routes/planSlots.module.css`
  - E2E: `assessment/stub-schoolinfo.mjs`(여러 학교), `assessment/support.ts`(`blankPdf`), `tests/z-a27-autosync.spec.ts`(+1)
  - 문서: `api-contract.md`, `domain.md`, 이 부록
- **캡처**(`e2e/test-results/`): `a27-schoolinfo-select-1600.png`, `a27-schoolinfo-classify-1600.png`, `a27-schoolinfo-classified-slots-1600.png` (직접 열어 확인: 선택 창·분류 창 한 열 배치)

| DoD | 판정 |
|---|---|
| S1·S2·관리자 8탭·6칸·검토·확정·학생 공개 경계 유지 | **PASS** (E2E 59/59) |
| 메모리 병목을 수치로 진단, 사용자 서비스 중단 0·임의 정리 0 | **PASS** (이 작업 계열 종료 컨테이너만 제거) |
| 최신 코드 `REMOVED_BY_ADMIN` IT 실제 통과 | **PASS** (T1 + 최종 배치) |
| Backend IT 전체 | **BATCH-COMPLETE 47/47 · 251** |
| Assessment E2E 전체 | **PASS 16파일 59/59** |
| 동명 학교 검증된 후보 선택·다른 학교 등록 0 | **Fixture PASS / 실사이트 NOT RUN** |
| 확인된 미분류 원본의 여러 칸 분류·이력 · 미확인/다른 학년도 등록 0 | **Fixture PASS** |
| 팀 승인 통지 반영 · 사용자 DB 0 · 재시작 0 · Git 0 | **PASS** |
| 18슬롯·TTL·중복 방지·Revision·불일치 차단 유지 | **PASS** (IT) |
| 실학교 미승인 상태에서 운영 자동 등록 0(fail-closed) | **PASS** — 완전 구현으로 주장하지 않음 |
| **종합** | **PARTIAL** — 구현·자동 시험은 통과. 실제 학교알리미 실측(승인 필요)과 사용자 환경 직접 확인이 남았다 |


# 부록 G. 실학교 3개년 실측 및 학년 공통 적용·Migration 검증 (2026-11-19)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_AppendixG_LiveSchoolInfo_Migrations_ClaudeCode_Prompt_20261119.md`
- 사용자 승인(이번 메시지)
  - 학교알리미 실측 — 한빛고·가좌고·상산고, 2024~2026
  - 학년 미표기 → 고1·고2·고3, 공시월 4월 → 1학기 · 9월 → 2학기
  - `V202611190100`·`190200`·`190300` 사용자 DB 적용(백업·복제 검증 뒤)
  - `V202611180100`은 비파괴 구조 유지
- 결과를 세 범주로 구분한다: **LIVE**(실제 학교알리미·실제 공개 원본) · **FIXTURE**(가상 학교알리미·가상 문서) · **DB APPLIED**(사용자 DB 적용).
- Git 작업 0건. `year-query-verified`는 **false 그대로**(운영 활성화는 사용자 결정).

## G0. 시작·마감 상태

| 항목 | 시작 (23:3x) | 마감 (00:1x) |
|---|---|---|
| Branch · HEAD · staged | `integration/assessment-studentcare-20261116` · `9755581` · 0 | 같음 |
| Git | M 144 · D 14 · ?? 146항목 | M 144 · D 14 · ?? 150항목 — 신규 4파일·수정 15파일(G8) |
| HWP/HWPX 변환기 6파일 | 6/6 | **6/6** |
| 원본 폴더 | 68건 | 68건 |
| 사용자 DB | Flyway `202611170300` | **`202611190300`** (DB APPLIED, G5) |
| 사용자 서비스 | 33307만 LISTENING, 8080·5173·5174 꺼짐(부록 F와 같음) | 같음(이 작업이 띄운 18191·18192·33361은 모두 정리) |
| 백업 | `C:\learnershigh-A27-UX-appendixG-backup-20261119\` — 작업 트리(`tracked.diff --binary`·`untracked.tar`·`modified-snapshot.tar`)·문서 사본·`hwp6.sha256` / DB(`lh_local_run-before.sql` 7.8MB 완료 표식, `flyway-before.txt`, `tables-before.txt` 30표, `rowcounts-before.txt` 7,656행, `db-backup.sha256`) / 실측(`live\`) | — |
| 실측 실행 | 저장소 밖 Python 탐침(`scratchpad\live_probe.py`), Java Client와 같은 요청 순서·파라미터. 원본 HTML·첨부는 `live\`에만(저장소·Git 밖) | — |

## G1. 실측 승인 범위 준수 (LIVE)

| 학교 | 요청(검색·상세·항목·내려받기 + 첫 화면) | HTTP | 시각(KST) | 비고 |
|---|---|---|---|---|
| 한빛고 | 1 · 2 · 0 · 0 + 1 = 4 | 200 ×4 | 23:43:01~05 | 이름이 정확히 같은 후보 0 → 항목 조회 안 함 |
| 가좌고 | 1 · 2 · 3 · 9 + 1 = 16 | 200 ×16 | 23:43:06~25 | 같은 이름 2곳 중 첫 정확 일치 1곳만 항목 조회(요청 상한) |
| 상산고 | 1 · 1 · 3 · 9 + 1 = 15 | 200 ×15 | 23:43:26~45 | — |

- 총 35요청. 요청 간격 1초 이상. 429·403·5xx·캡차·다른 호스트 Redirect 0건.
- 첨부: 학년도당 최대 3개만 내려받음(서로 다른 확장자 우선). 목록 전체 건수는 따로 기록했다 — 가좌고 11·11·11, 상산고 70·4·4. 나머지는 `LISTED_NOT_DOWNLOADED`.
- 사이트 구조는 Java Client 가정과 같았다(검색·상세·`loadGongSi`·`getEiFile`·`eiFileDownForm`). 다른 점 2가지는 G2에 적었다.

## G2. 학교별 실측 결과 (LIVE)

| 학교 | 검색 결과 | 실제 학교·주소 | 해석 |
|---|---|---|---|
| 한빛고 | 2 | **대전한빛고등학교**(대전광역시 중구 대둔산로 …) · **위례한빛고등학교**(경기도 성남시 수정구 위례동로 …) | **동명 학교가 아님**(이름이 다름) — 사용자 가설은 확인되지 않음. 학업 Context 이름이 '한빛고등학교'면 정확 일치 0 → 등록 0. 둘 중 하나라면 그 이름으로 자동 |
| 가좌고 | 2 | **가좌고등학교**(인천광역시 서해구 장고개로287번길 …) · **가좌고등학교**(경기도 고양시 일산서구 가좌1로 …) | **실제 동명 사례.** 시도·주소가 달라 §38-13 선택 화면에서 구별 가능(파서 확인) |
| 상산고 | 1 | 상산고등학교(전북특별자치도 전주시 완산구 거마평로 …) | 단일 |

- **실측으로 고친 파서 (실제 HTML 근거)**
  1. **주소**: 실제 화면은 `<span class="mt">주소 :</span>값</span>`이었다. 부록 F의 `<th>주소</th><td>` 가정은 실제와 **달랐다**(실측 6/6 실패 → 수정 뒤 6/6 성공, 재현 시험).
  2. **공시 차수**: 항목 화면 '자료기준일'(`select_trans_dt`)의 값 `YYYY1` = '(1차) YYYY년 04월', `YYYY3` = '(3차) YYYY년 09월', 그리고 Form `JG_CHASU`. **기본 응답은 최신 차수(3차 = 9월)뿐이다** — 세 학교 세 학년도 모두 받은 파일은 2학기 파일이었다.
     - 이제 Client가 같은 학년도의 다른 차수(1차)를 `JG_CHASU`로 한 번 더 요청한다. 서버가 차수를 무시하면 그 화면 파일을 쓰지 않는다(`CHASU_IGNORED`).
     - **실제 1차(4월) 요청은 이번 상한 밖이라 하지 않았다 → `JG_CHASU=1` 동작은 LIVE NOT RUN.**
- **학년도 파라미터 (LIVE 확인)**: 요청 2026·2025·2024마다 ① 선택된 공시 차수의 학년도, ② 내려받기 Form `JG_YEAR`, ③ 첨부 이름의 학년도가 모두 요청 학년도와 같았다(가좌고·상산고 각 3학년도). 즉 `JG_YEAR` 계열 파라미터가 학년도를 정한다는 근거다. 단, 9월 차수에서만 확인했다.
- **문서 구조 (LIVE 관찰)**
  - 가좌고: 학년도·학기마다 **교과군별 파일**(국어과·수학과·영어과·사회과·과학과·체육과·예술과·생활교양과·고시외 + 꿈두레 공동교육과정 + 학업성적관리규정). 파일 이름에 학년 표기가 없다. HWP·HWPX.
  - 상산고 2026: **과목별 개별 파일 70개**(이름에 학기·학년·과목, 예 `2026_2학기_1학년_공통국어2_…`). HWP·HWPX.
  - 상산고 2025·2024: **학년별 ZIP 3개 + 규정**. ZIP 안은 과목별 HWP·HWPX(+ DOCX 일부).
  - 가좌고를 '학년 통합 합본'으로 가정했던 것과 달리, 실제로는 교과군 합본(학년 미표기)이었다.

## G3. 학교 × 학년도 × 학기 × 학년 (LIVE 재현 분류 — 받은 표본 기준)

받은 원본(ZIP 풀어 상산고 2025 66개·2024 64개 포함)을 새 분류 규칙으로 다시 분류한 결과다(`SchoolInfoLiveReplayTest`, 네트워크 없음, 실측 격리 평가로만 연도 조회 신뢰를 가정). 공시월은 실제 화면의 선택 차수(9월). **사용자 DB에는 아무것도 등록하지 않았다.**

| 학교·학년도 | 공시 차수(실측) | 목록 / 분류한 원본 | VERIFIED | 보류·제외 | 칸 연결 (학년-학기: 문서 수) |
|---|---|---|---|---|---|
| 가좌고 2026 | 3차 9월 | 11 / 3 | 2 | `GRADE_SCOPE_CONFLICT` 1(꿈두레) | 1-2: 2 · 2-2: 2 · 3-2: 2 |
| 가좌고 2025 | 3차 9월 | 11 / 3 | 2 | `GRADE_SCOPE_CONFLICT` 1 | 1-2: 2 · 2-2: 2 · 3-2: 2 |
| 가좌고 2024 | 3차 9월 | 11 / 3 | 2 | `GRADE_SCOPE_CONFLICT` 1 | 1-2: 2 · 2-2: 2 · 3-2: 2 |
| 상산고 2026 | 3차 9월 | 70 / 3 | 3 | — | 1-2: 1 · 3-2: 2 |
| 상산고 2025 | 3차 9월 | 4(ZIP 3) / 66 | 63 | `NOT_PLAN` 1(최소 성취수준 보장지도) · `UNSUPPORTED` 2(DOCX) | 1-2: 15 · 2-2: 20 · 3-2: 28 |
| 상산고 2024 | 3차 9월 | 4(ZIP 3) / 64 | 63 | `UNSUPPORTED` 1(DOCX) | 1-2: 14 · 2-2: 21 · 3-2: 28 |
| 한빛고 | — | 항목 조회 안 함 | — | 정확 일치 학교 없음 | 0 |

- 18구간 중 1학기 9칸(학년도 3 × 학년 3)은 **모두 미확인**이다. 1차(4월) 공시를 요청하지 않았기 때문이다(LIVE NOT RUN). 미공시로 기록하지 않는다.
- 학년도 불일치·학교 미확인으로 연결된 원본은 0이다.
- **실측으로 찾아 고친 결함 2건**
  - ① ZIP 서명만 보고 **DOCX를 HWPX로 오인** → HWPX `mimetype` 확인 후 `UNSUPPORTED`
  - ② '최소 성취수준 보장지도 운영 계획'을 평가계획으로 오인 → `NOT_PLAN`
  - 두 결함 모두 단위 시험으로 고정했다.

## G4. 학년 미표기 → 전 학년 · 공시월 → 학기 (사용자 승인 규칙)

- **규칙** (계약 §38-12 '부록 G 변경')
  - 학기: 원문 명시 > 공시월(4 → 1학기, 9 → 2학기). 다르면 `SEMESTER_CONFLICT` 보류. 원문이 1·2학기 둘 다면 두 학기.
  - 학년: 이름·제목 학년 > 본문 앞부분 — 표기 없음이면 고1·2·3(`GRADE_UNSPECIFIED_ALL_GRADES_APPLIED`), 1·2·3 모두면 모두(`GRADES_FROM_BODY_ALL`), 일부만이면 `GRADE_SCOPE_CONFLICT` 보류.
  - 학기를 못 정하면 전 학년 연결도 없다.
- **LIVE 사례**
  - 가좌고 2026 국어과(이름·제목·본문 학년 없음) → 2학기 고1·고2·고3 **세 칸, 원본 하나**
  - 수학과·과학과 등 → 본문 앞부분에 1·2·3학년이 모두 있어 세 칸
  - 꿈두레 공동교육과정 → 본문에 일부 학년만 있어 보류
  - 상산고 → 이름의 학년 한 칸씩
- **FIXTURE IT** (`SchoolInfoDisclosureMonthApiTest` 2건)
  - 2026 4월 미표기 → 1학기 세 칸·원본 1
  - 9월 명시 2학년 → 고2-2만
  - 4월인데 원문 '2학기' → 보류
  - 2025 9월 미표기 → 2학기 세 칸
  - 2024 1·3학년 → 두 칸
  - 관리자 목록 `AUTO_ALL_GRADES` 2건
  - force 재실행 → 연결·Revision 증가 0
  - 확정 0
  - 차수 무시 서버 → 4월 파일 0건 등록·`CHASU_IGNORED`
- **단위**(`SchoolInfoDisclosureRulesTest` 8건): 위 규칙 + 공시월 없음·5월·11월 → 학기 미정 · 연도 불일치·연도 조회 미신뢰·다른 학년도 파일 → 등록 안 됨 · DOCX·최소 성취수준.
- **기존 규칙 변경 1건**(승인 반영): '학기 확인 + 학년 미표기'는 이전에 `NO_GRADE_EVIDENCE` 보류였으나 이제 전 학년 적용이다(`SchoolInfoSourceClassifierTest` 단언을 그 규칙으로 갱신, 약화 아님).
- **잘못 붙은 칸 처리**: 그 칸의 문서를 평가계획서 칸에서 삭제(§38-9)하면 자동 확인이 되살리지 않는다(`REMOVED_BY_ADMIN`, 부록 F IT). DB 직접 수정 없음.
- **관리자 화면**: 원본 분류 창에 '학년 미표기 → 고1·고2·고3 공통 적용 n개 — 공시 4월/9월 근거' 묶음(사유·연결 칸·삭제 안내)과 새 사유 라벨을 추가했다. **이 묶음의 E2E는 없다**(typecheck·lint만).

## G5. Migration (DB APPLIED)

| Migration | 결과 | 사유·근거 |
|---|---|---|
| `V202611180100` (PR 검토 테이블 병합) | **NOT APPLIED · 미도입** | 기존 표 2개 DROP, 현재 코드(엔티티·Service)와 호환 안 됨 → B안 유지. `outOfOrder`·repair·baseline 사용 0 |
| `V202611190100` 학생 UX | **APPLIED** (23:41:14) | 사용자 승인 |
| `V202611190200` 학교알리미 동기화 | **APPLIED** (23:41:14) | 사용자 승인 |
| `V202611190300` 학교 선택·분류 | **APPLIED** (23:41:15) | 사용자 승인 |
| 부록 G 신규 | 없음 | 공시월·사유는 기존 `evidence_json`에 저장 |

- **절차**
  1. 사용자 DB 전체 덤프 → 일회용 MySQL(같은 서버 collation `utf8mb4_unicode_ci`, 포트 33361)에 복원, 30표 행 수 일치
  2. 복제 DB에 전용 Backend(18191)로 Flyway `190100 → 190200 → 190300` 적용, 기동·smoke 200
  3. 기존 29표 **행 수·`CHECKSUM TABLE` 전후 동일**, 신규 표 8개 모두 `utf8mb4_unicode_ci`
  4. 일회용 DB에서 Unit·IT·E2E가 이미 통과(부록 F 최종 22:35~22:55, 이후 Migration 변경 없음)
  5. 사용자 Backend(8080)가 꺼져 있어 **재시작 없이** 전용 Backend(18192, 앱 계정)로 사용자 DB에 적용, smoke 200, 이 작업이 띄운 프로세스만 종료
- **사용자 DB 적용 후 검증**
  - Flyway 24건(신규 3건 success)
  - 기존 29표 행 수·체크섬이 **적용 전 데이터와 동일**
  - 신규 표 8개 `utf8mb4_unicode_ci`
  - 별도 관찰: 11-16에 만들어진 `demo_care_*` 표 3개가 `0900_ai_ci`이다(이번 Migration과 무관, 그대로 둠)
- **복구안**: `lh_local_run-before.sql`(SHA는 `db-backup.sha256`)을 복원하면 적용 전으로 돌아간다(복원 검증 완료). 사용자 DB에서 복원·DROP은 하지 않았다.
- **주의**: 사용자가 8080 Backend를 현재 Worktree 코드로 다시 띄우면 Migration은 이미 적용돼 있어 추가 적용은 없다.

## G6. 시험 (이번 최종 실행, 저메모리 — `JAVA_TOOL_OPTIONS=-Dspring.test.context.cache.maxSize=2`, `--no-daemon --max-workers=1`, 순차)

| 항목 | 결과 | 시각 |
|---|---|---|
| Backend Unit + ArchUnit | **440 tests · 0 fail · skip 2**(기존 1 + LIVE 재현 시험 1 — 실측 폴더가 있을 때만 돈다) | 23:57~23:58 |
| LIVE 재현 시험(`-Dlive.dir`) | **1/1** — 실제 HTML 6건 주소·실제 화면 공시 차수 파싱, 받은 원본 분류·분석 | 23:5x |
| Backend IT 전체 | **BATCH-COMPLETE 48/48 클래스 · 253건 · 실패 0 · skip 0** (48+78+127, 합집합 = 전체, 중복 0) | 23:58~00:13 |
| Assessment E2E 전체 | **16파일 59/59** (5.2m) | 00:13~00:18 |
| `scripts/verify-frontend.ps1` | **PASS** | 00:18~00:19 |
| Node 전체 | **147/147** | 00:19 |
| Student Care Playwright | **NOT RUN** — 사용자 8080 API·리셋 Endpoint 구성(부록 F와 같음). Student Care IT는 IT 배치에 포함돼 통과 | — |

- 신규 시험: 단위 `SchoolInfoDisclosureRulesTest` 8 · `SchoolInfoClientTest` +2(실측 구조 주소·차수 파싱, 차수별 요청·차수 무시) · `SchoolInfoLiveReplayTest` 1 / IT `SchoolInfoDisclosureMonthApiTest` 2.
- **신규 E2E 없음**: 지시서 G8의 실측 기반 E2E(가좌고 동명 선택·학년 미표기 세 칸 표시)는 추가하지 못했다. 동명 선택 흐름은 부록 F E2E(가상 학교)가 계속 통과한다 → **PARTIAL**.
- 메모리: 배치마다 가용 RAM 1.6~2.3GB, 실행 중 컨테이너 최대 3개(실사용 DB + Ryuk + 복제 DB — 복제 DB는 배치 1 뒤 정리). 강제 종료 0건.

## G7. 기능 상태

- `assessment.schoolinfo.year-query-verified`: **false**(설정 파일에 없음 → 코드 기본값). 운영 자동 등록은 지금도 0건(fail-closed).
- 실측 근거로 보면 9월 차수에서는 '요청 학년도 = 공시 학년도 = 파일 학년도'가 세 학년도 모두 성립했다. 4월 차수(`JG_CHASU=1`)는 확인하지 않았다.
- 관리자 확정·학생 공개: 자동 확정 0, 학생 공식 원본 '확인되지 않음' 그대로(E2E).
- A27 관리자 8탭·6칸·4단계·과목 제외·월별 운영계획, 학생 11개 메뉴·홈, Student Care, 내부 분석기 `local`: 변경 없음, E2E·IT 통과.
- **분석 정확도 (LIVE 표본, 수집과 별개)**
  - 상산고 과목별 파일에서 '파일 이름 과목 = 분석기 첫 과목'이 61/62(1건은 파일 '수학적사고와통계'를 '수학적 사고와 적분'으로 추출 — 원문 대조 필요).
  - 분석 시도 표본 중 과목 0(`FAILED`)이 상산고 2025 8/38·2024 10/39였다(미술사·논술·보건·체육 등).
  - 가좌고 교과군 파일은 과목 여러 개를 추출했다(수학과 7·과학과 11 등).
  - 수행평가 이름·비율·채점기준의 원문 대조 truth는 하지 않았다(**NOT VERIFIED**). 합성 HWPX 과목 0·동명 1·2차 오병합(부록 D)은 이번 표본으로 재현을 판단하지 않았다.

## G8. 남은 것 · 결정 필요 · 변경 파일

| 등급 | 내용 | 다음 행동 |
|---|---|---|
| **P0 (차단 유지)** | 4월 차수(`JG_CHASU=1`) 실측 0 → 1학기 9칸 근거 없음 | 승인 시 학교 2~3곳 × 학년도 3개 × 차수 1개 = 항목 요청 6~9개 추가 실측 |
| 결정 | `year-query-verified` 운영 활성화 | 위 4월 확인 뒤 판단 권장(9월은 근거 있음). 켜면 전 학교 자동 등록이 시작된다 |
| P1 | 분석기 과목 0·과목명 불일치(상산고 표본) | PR 분석기 담당. 원문 대조 truth 표본 작성 |
| P1 | 한빛고: 동명 아님. 학업 Context 이름이 '한빛고등학교'면 학교알리미와 정확 일치 0 → 자동 수집 불가 | 학교 이름(대전한빛·위례한빛) 확인 |
| P2 | 학년 미표기 자동 적용 묶음의 E2E 없음 | 다음 작업 |
| P2 | 8080·5173·5174 꺼짐(이 작업과 무관) | 사용자 확인 |
| 보류 | `V202611180100` | 검토 계층 재설계 때 별도 작업 |
| 승인 | §38-12 '부록 G 변경' 팀 승인 | OWNERSHIP 절차 |

- **신규 (4)**: 시험 `service/plan/SchoolInfoDisclosureRulesTest`·`SchoolInfoLiveReplayTest`·`SchoolInfoClientAccess`(시험 전용 접근 도우미), `controller/SchoolInfoDisclosureMonthApiTest`
- **수정 (15)**
  - Backend: `SchoolInfoClient`(차수별 항목 화면 `itemPage`·`collect`·`disclosures`, `PlanFile.disclosureMonth`, 실측 주소 파서), `SchoolInfoSourceClassifier`(공시월 학기·학년 범위·`looksHwpx`·NOT_PLAN 확장), `SourceTextProbe`(본문 범위 읽기), `SchoolInfoSyncService`·`SchoolInfoImportService`(공시월 전달, `groupOf`), `SchoolInfoClassificationService`(`AUTO_ALL_GRADES` 목록)
  - 시험: `FakeSchoolInfoServer`(실측 구조 차수·주소), `SchoolInfoClientTest`, `SchoolInfoSourceClassifierTest`
  - Admin: `api/types.ts`, `model/schoolInfoSync.ts`, `routes/SchoolInfoClassifyModal.tsx`, `routes/SchoolInfoSyncSummary.tsx`
  - 문서: `api-contract.md`, `domain.md`, 이 부록
- 저장소 밖: 실측 탐침 `scratchpad\live_probe.py`, 실측 원본·요약 `live\`(`summary.json`·`obs-utf8.txt`·`replay.json`·`replay-summary.txt`·`replay-table.txt`), DB 백업·검증 기록, 시험 로그.

| DoD | 판정 |
|---|---|
| 승인된 3개 학교 실제 조회 시도·결과 공개 | **LIVE PASS** (35요청, 차단 0) |
| 학교 이름만으로 다른 학교 등록 0 · 동명 미선택 등록 0 | **FIXTURE PASS** + LIVE 구조 확인(가좌고 동명·주소 파싱) |
| 확인 안 된 학년도 등록 0 · 공시월 규칙은 공식 공시 차수 근거일 때만 | **FIXTURE PASS** · 9월 LIVE 근거 / 4월 LIVE NOT RUN |
| 학년 미표기 → 세 칸(원본 하나), 명시 학년은 그 칸만, 검토·공개 경계 유지 | **FIXTURE PASS** + LIVE 재현(가좌고) |
| `190100`·`190200`·`190300` 사용자 DB 적용·검증 · `180100` 미적용 | **DB APPLIED** |
| 최신 IT·E2E·Frontend 전체 재실행 | **PASS** (신규 E2E 미추가 → 그 항목만 PARTIAL) |
| 원본 폴더·HWP 6파일·기존 데이터·Git 보존 | **PASS** |
| **종합** | **PARTIAL** — 실측·규칙·Migration은 완료. 4월 차수 실측·`year-query-verified` 결정·신규 E2E가 남음 |


# 부록 H. 4월 공시 실측 · 파주 한빛고 식별 · 연도 조회 신뢰 운영 활성화 (2026-11-20)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_AppendixH_AprilVerification_ProductionEnable_ClaudeCode_20261120.md`
- 사용자 승인(이번 메시지)
  1. 가좌고·상산고·파주 한빛고의 2024~2026학년도 4월 공시 추가 실측
  2. 실측과 회귀 시험이 통과하면 `assessment.schoolinfo.year-query-verified=true`를 실제 운영 설정에 적용
  3. 한빛고 = **경기도 파주시 한빛로 36 한빛고등학교** — 대전·위례 학교로 대체하지 말고 검색 누락 원인을 확인
  4. 부록 G에서 못 한 실측 기반 E2E 추가와 전체 회귀
- 결과는 **LIVE**(실제 학교알리미) · **LIVE-derived Fixture**(실측 구조를 본뜬 가상 서버) · **CONFIG**(설정) · **USER SERVER**(사용자 DB에 띄운 8080) · **E2E**로 나눠 적는다. Git 쓰기·Railway 작업 0건.

## H0. 시작 상태 · 백업

| 항목 | 시작 (05:0x) | 마감 (06:0x) |
|---|---|---|
| Branch · HEAD · staged | `integration/assessment-studentcare-20261116` · `9755581` · 0 | 같음 |
| Git | M 144 · D 14 · ?? 150 (부록 G 마감과 같음) | M 144 · D 14 · ?? 152 (신규 3파일, H6) |
| HWP/HWPX 변환기 6파일 | 6/6 | **6/6** |
| 원본 폴더 `C:\learnershigh-extension` | 68건 | 68건 |
| 사용자 DB Flyway | `202611190300`(24건, 190100·190200·190300 success) — **재적용·repair·baseline·outOfOrder 0** | 같음 |
| 사용자 DB 30표 | `CHECKSUM TABLE`이 부록 G 마감 기록과 같음 | **시작과 같음**(학교알리미 표 3개 0행) |
| 포트 | 33307만 LISTENING · 8080·5173·5174 꺼짐 | 같음(이 작업이 smoke 로 띄운 8080 은 종료, H4) |
| Docker | `lh-local-run-mysql`만 | 같음(시험 컨테이너는 실행기·Ryuk 가 정리) |
| 백업 | `C:\learnershigh-A27-UX-appendixH-backup-20261120\` — `tracked.diff --binary`·`untracked.tar`·`modified-snapshot.tar`·보고서·`application.yml` 사본·`backup.sha256`(검증 OK)·`hwp6.sha256`·`checksum-before.txt`·`flyway-before.txt` | `checksum-after.txt`·`flyway-after.txt` |

- PR `V202611180100`: **미도입·미적용 유지**(B안).

## H1. 파주 한빛고 식별 (LIVE)

| 단계 | 요청 | 결과 |
|---|---|---|
| ① 정식 이름 검색 `한빛고등학교` | 검색 1 · 상세 2 | 화면에 보인 고등학교 2곳: 대전한빛고등학교(대전 중구) · 위례한빛고등학교(경기 성남 수정구) — 부록 G 와 같음 |
| ② 학교 홈페이지 `https://hanbit-h.goepj.kr/` | 1 | 200. 첫 화면 HTML 에 학교알리미 링크·도로명 주소 없음(단서 없음) |
| ③ 키워드 `한빛` 검색 | 검색 1 · 상세 3 | 화면 탭 표기 '전체(16) 초등학교(5) 중학교(5) 고등학교(5) 기타학교(1)' 인데 학교급마다 **2곳만 보이고 '더보기+'** — 상세 3건은 원인 확인 전 본 다른 학교(한빛맹학교·용인한빛초·용인한빛중, 불필요했던 요청) |
| ④ ①과 같은 검색어로 **고등학교 더보기**(`SEARCH_TYPE=2`, `SEARCH_MODE=3`) | 검색 1 · 상세 2 | **고등학교 4곳 모두** — 숨어 있던 2곳이 **한빛고등학교(경기도 파주시 한빛로 36)** · **한빛고등학교(전남광주통합특별시 담양군 …)** |

- **누락 원인 (실제 응답 근거)**: 학교알리미 검색 첫 화면은 학교급마다 2곳만 보여 준다. ①의 탭은 '고등학교(4)'였지만 화면에는 대전한빛·위례한빛 2곳뿐이었다. Java Client는 첫 화면만 읽어서 정확히 같은 이름 2곳(파주·담양)을 놓쳤다. 이름 정규화·지역 필터·학교 유형 문제가 아니었다.
- **식별**: 이름 `한빛고등학교` 정확 일치 + 주소 `경기도 파주시 한빛로 36` 일치. 학교알리미 학교 ID는 `4674a469-…`(전체 값은 백업 `live-april\hanbit3.json`). 파주와 **담양에 같은 이름의 학교가 있는 실제 동명 사례**다. 대전·위례·담양 학교의 평가계획 조회·내려받기는 **0건**.
- 지역 조건(시도·시군구) 검색은 하지 않았다 — 시군구 코드표가 첫 화면에 없었고, ④로 원인과 대상이 확인됐다.
- **코드 수정 (H5)**: 첫 화면에 '고등학교(N)'이 있으면 고등학교 목록을 한 번 더 받는다. N곳을 다 읽지 못하면 학교를 고르지 않는다(`SEARCH_TRUNCATED`). 수정 뒤 '한빛고등학교'는 동명 2곳(파주·담양) 선택 화면으로 가고, 관리자가 파주(경기도)를 고르면 그 학교만 수집한다(LIVE-derived IT·E2E).

## H2. 4월(1차) 공시 실측 (LIVE)

| 학교 · 학교알리미 ID | 학년도 | 요청 | 응답 선택 차수 | Form `JG_YEAR` · `JG_CHASU` | 첨부 목록 / 내려받음 | 첨부 이름의 학년도·학기 |
|---|---|---|---|---|---|---|
| 가좌고(경기 고양 일산서구) `159bfc38-…` | 2026 | `JG_YEAR=2026`·`JG_CHASU=1` | `20261` (1차) 2026년 04월 | 2026 · 1 | 5 / 3 | 2026학년도 1학기 1·2·3학년 계획 |
| 〃 | 2025 | 2025 · 1 | `20251` 04월 | 2025 · 1 | 5 / 3 | 2025학년도 1학기 |
| 〃 | 2024 | 2024 · 1 | `20241` 04월 | 2024 · 1 | 5 / 3 | 2024학년도 1학기 |
| 상산고(전주 완산구) `ddda6440-…` | 2026 | 2026 · 1 | `20261` 04월 | 2026 · 1 | 67 / 3 | `2026_1학기_n학년_과목_…` |
| 〃 | 2025 | 2025 · 1 | `20251` 04월 | 2025 · 1 | 4(학년별 ZIP 3 + 규정) / 3 | 2025학년도 n학년 1학기 |
| 〃 | 2024 | 2024 · 1 | `20241` 04월 | 2024 · 1 | 2(전과목 ZIP + 규정) / 2 | 2024_1학기 |
| 한빛고(경기 파주) `4674a469-…` | 2026 | 2026 · 1 | `20261` 04월 | 2026 · 1 | 4 / 3 | 2026학년도 n학년 1학기 (HWPX) |
| 〃 | 2025 | 2025 · 1 | `20251` 04월 | 2025 · 1 | 4 / 3 | 2025학년도 n학년 1학기 (PDF) |
| 〃 | 2024 | 2024 · 1 | `20241` 04월 | 2024 · 1 | 4 / 3 | 2024 1학기 (n학년) (HWP) |

- **9건 모두 PASS**: 응답 학년도 = 요청 학년도, 응답 차수 = 1차(04월), 첨부 이름의 학년도 = 요청 학년도, 첨부 이름의 학기는 모두 1학기. `CHASU_IGNORED`·`YEAR_MISMATCH`·`SEMESTER_CONFLICT`·`NOT_PUBLISHED`·`FETCH_FAILED` 모두 0건.
- **9월과 분리**: 4월 원본 SHA 25개 중 부록 G 9월 원본과 같은 것은 **0개**. 상산고 9월 목록(2026 70개 · 2024 학년별 ZIP 3개)과 4월 목록(67개 · 전과목 ZIP 1개)은 서로 다른 첨부다.
- **가좌고 주의**: 부록 G의 9월 실측은 **인천 가좌고**(`dc84a61c-…`, 당시 '첫 정확 일치')였다. 이번 4월은 지시대로 **경기 고양 가좌고**다. 그래서 **고양 가좌고의 9월 차수는 실측하지 않았다**. 4월·9월을 같은 학교로 대조한 것은 상산고뿐이다(파주 한빛고 9월도 미실측).
- **요청량**: 총 52요청이 모두 200이었다(05:09:44~05:12:58, 간격 1초 이상). 403·429·5xx·캡차·다른 호스트 Redirect는 0건이다. 내역:

  | 구분 | 학교알리미 | 학교 홈페이지 |
  |---|---|---|
  | 첫 화면 | 5 | — |
  | 검색 | 3 | — |
  | 상세 | 7 | — |
  | 항목(4월) | **9**(승인 상한 9) | — |
  | 내려받기 | 26(학년도당 최대 3) | — |
  | 합계 | 51 | 1 |

  가좌고·상산고 상세는 부록 G 원본을 재사용해 다시 요청하지 않았다. 9월 재요청도 0건이다.
- **탐침 결함 1건(저장소 밖)**: 실측 스크립트가 저장 파일 이름의 한글을 `_`로 바꾼 탓에 가좌고·상산고 이름이 겹쳤다. 그 결과 **가좌고 2024 첨부 3번('1학기 공동교육과정 교수학습 및 평가 운영 계획', SHA `4304afad…` 기록) 사본을 상산고 2024 첨부 3번(규정)이 덮어썼다**. 내려받기 자체는 정상이었다. 재요청하지 않고 이 파일을 재분류에서 뺐다(**NOT RUN**). 덮어쓴 바이트로 낸 첫 재분류 결과는 버렸다.

## H3. 분류 · 슬롯 (LIVE 원본 재분류 — 사용자 DB 등록 아님)

공시월 = 실제 선택 차수(4월), 연도 조회 신뢰를 켠 상태로 `SchoolInfoLiveReplayTest`를 실행했다(네트워크 없음).

| 학교 · 학년도 | 분류한 원본 | VERIFIED | 보류·제외 | 1학기 칸 연결 (학년: 원본 수) |
|---|---|---|---|---|
| 가좌고 2026 | 3 | 3 | — | 1: 1 · 2: 1 · 3: 1 |
| 가좌고 2025 | 3 | 3 | — | 1: 2 · 2: 2 · 3: 1 (소인수교과·공동교육과정 원본 1개는 본문 1·2·3학년 → 세 칸, `GRADES_FROM_BODY_ALL`) |
| 가좌고 2024 | 2 (+1 NOT RUN) | 2 | — | 2: 1 · 3: 1 |
| 상산고 2026 | 3 | 3 | — | 2: 3 (받은 3개가 모두 2학년 과목) |
| 상산고 2025 | ZIP 3개 → 64 | 63 | DOCX 1(`UNSUPPORTED`) | 1: 15 · 2: 19 · 3: 29 |
| 상산고 2024 | 전과목 ZIP → 64 + 규정 | 62 | DOCX 1 · 규정 1(`NOT_PLAN`) | 1: 14 · 2: 20 · 3: 28 |
| 한빛고(파주) 2026·2025·2024 | 각 3 | 각 3 | — | 각 1: 1 · 2: 1 · 3: 1 |

- 4월 원본은 모두 **1학기 칸에만** 연결됐고 2학기 연결은 0이다. 학년 표기가 있는 원본은 그 학년에만 연결됐다. 원본 수와 칸 연결 수는 따로 셌다(18구간은 문서 수가 아니다).
- **실측으로 고친 결함**: 상산고 2024 '전과목' ZIP은 항목이 63개였다. Client 한도는 50개라 13개가 빠지고 `ZIP_TOO_MANY_ENTRIES`만 남았다. 한도를 100개로 올렸고, 풀린 합계 100MB 한도는 그대로 두었다. 수정 뒤 64개를 모두 분류했다.
- **18구간 근거 (LIVE 기준)**:
  - 1학기 9칸: 4월 근거 — 가좌고(고양)·상산고·한빛고(파주)
  - 2학기 9칸: 9월 근거 — 부록 G의 상산고·인천 가좌고
  - 고양 가좌고 9월·파주 한빛고 9월은 미실측
- 기존 확정값·개정 이력·관리자 삭제(`REMOVED_BY_ADMIN`)·자동 확정 없음 규칙은 IT·E2E로 다시 확인했다(H5). 사용자 DB에 실측 문서를 등록하지 않았다.

## H4. 운영 활성화 (CONFIG · USER SERVER)

| 구분 | 상태 |
|---|---|
| 사용자 승인 | **승인됨**(이번 메시지 2번) |
| 기술 게이트 | **통과** — 4월 LIVE 9/9, 9월 LIVE(부록 G), 학교 식별 fail-closed(동명 선택·목록 잘림 보류), 회귀 전체 통과(H5) |
| 설정 위치 (CONFIG) | `backend/src/main/resources/application.yml` 맨 끝 프로필 문서 `on-profile: local-run` → `assessment.schoolinfo.year-query-verified: true`. 기본 문서·`e2e` 프로필에는 없다 → 코드 기본값 `false`(Unit·IT·기본 기동 fail-closed). `SchoolInfoYearQueryProfileTest`가 'true는 local-run 문서 한 곳에만'을 고정한다 |
| '운영' 판정 | 사용자 로컬 8080 + `lh_local_run`(지시 H4-2). 저장소·로컬에 이 조합을 띄우는 고정 설정 파일은 없다(부록 G도 환경 변수로 기동). 원격 배포는 범위 밖 |
| 실제 런타임 확인 (USER SERVER) | **적용 확인 · 현재 미실행**. 06:00:54~06:01:26 에 8080(비어 있음 확인)을 `SPRING_PROFILES_ACTIVE=local-run`·사용자 DB 앱 계정으로 띄웠다. 로그: `The following 1 profile is active: "local-run"`, `schoolinfo year-query-verified=true`(새 진단 로그), Flyway `Current version 202611190300`(적용 0). smoke `/schools` 200 · `/schoolinfo-sources` 200 확인 뒤 **이 작업이 띄운 프로세스만 종료** |
| 외부 호출 · DB 쓰기 | 기동·smoke 중 학교알리미 요청 **0**(학교알리미 조회는 관리자 화면 진입·'다시 확인'에서만 시작, 스케줄러 없음). 사용자 DB 30표 체크섬 **변화 0**, 학교알리미 표 0행 |
| 사용자가 켤 때 | 8080을 `--spring.profiles.active=local-run`(또는 `SPRING_PROFILES_ACTIVE=local-run`)로 띄워야 true다. 프로필 없이 띄우면 false로 동작(등록 0) |

- 켜진 상태에서도 파일마다 다음 조건을 모두 통과해야 등록된다(IT·E2E로 확인).
  - 학교: 이름 정확 일치, 동명이면 관리자 선택, 목록이 잘리면 보류
  - 학년도·차수: 응답 학년도·차수 일치, 차수 무시 시 미사용
  - 학기·학년: 원문 학기 ↔ 공시월 충돌 보류, 학년 범위 충돌 보류
  - 형식·종류: 형식 시그니처 확인, `NOT_PLAN` 제외
  - 중복·삭제: 중복 0, 관리자 삭제 존중
- 자동 확정과 학생 공개는 0이다.
- 전국 백필은 없다. 학교별 24시간 기록·순차 처리·요청 간격·크기 한도는 그대로다.

## H5. 시험 (저메모리 · 순차: `JAVA_TOOL_OPTIONS=-Dspring.test.context.cache.maxSize=2`, `--no-daemon --max-workers=1`, Playwright workers 1)

| 항목 | 결과 | 시각 |
|---|---|---|
| Backend Unit + ArchUnit | **442 tests · 0 fail · skip 2**(기존 1 + LIVE 재현 1) — 부록 G 440 → +2 | 05:35~05:36 |
| LIVE 재현(`-Dlive.dir=…\live-april`) | **1/1**(4월 원본 재분류·주소·차수 파싱) | 06:0x |
| Backend IT 전체 | **BATCH-COMPLETE 49/49 클래스 · 255건 · 실패 0 · skip 0** (53+75+127, 합집합 = 전체, 중복 0) — 부록 G 48·253 → +1 클래스·+2건. Student Care IT 8클래스 포함 | 05:36~05:52 |
| Assessment E2E 전체 | **17파일 60/60** (6.5m) — 부록 G 16·59 → +1 파일·+1건 | 05:52~05:58 |
| `scripts/verify-frontend.ps1` | **PASS** | 05:58~06:00 |
| Node 전체 | **147/147** | 06:00 |
| Student Care Playwright | **NOT RUN** — 사용자 8080 API·리셋 Endpoint 구성(부록 F·G와 같음) | — |

- **신규 시험**
  - Unit: `SchoolInfoClientTest` +1 — 더보기 목록 읽기, 목록 잘림 `SEARCH_TRUNCATED`, 고등학교 0곳이면 재요청 없음
  - Unit: `SchoolInfoYearQueryProfileTest` 1
  - IT: `SchoolInfoLiveDerivedSearchApiTest` 2 — 첫 화면 2곳 + 더보기 → 동명 파주·담양만 후보, 파주 선택 → 그 학교 4월 원본만 고1-1, 다른 후보 내려받기 0 / 목록 잘림 → 상세·항목 0, 등록 0
  - E2E: `z-a27-live-derived.spec.ts` 1
- **LIVE-derived E2E 범위** (`z-a27-live-derived.spec.ts`)
  - 학교 선택: 숨은 동명 학교 찾기 → 지역 '경기도' 선택(다른 후보 내려받기 0)
  - 4월·9월 연결: 4월 학년 미표기 → 고1·2·3-1 세 칸(원본 하나) · 9월 미표기 → 2학기 세 칸 · 9월 명시 2학년 → 고2-2만
  - 보류: 4월 공시 ↔ 원문 2학기 → 등록 0·분류 대상
  - 관리자 분류 창: `AUTO_ALL_GRADES` 묶음(사유·연결 칸)
  - 새로고침 후 유지, 학생 비공개
  - 화면 폭: 800·1366·1600·1920 가로 넘침 0
- **Fixture 근거**: 검색 첫 화면 2곳·'고등학교(N)'·`SEARCH_MODE=3`, 주소 표기, '자료기준일'·`JG_CHASU` 구조는 실측 HTML(`live-april\한빛고-search-*.html`, 부록 G·H 항목 화면)에서 가져왔다. 학교 이름은 Mock 학업 Context(예시고등학교)에 맞췄고, 시군구 외 주소 번지·학교 ID·파일은 가상 값이다.
- **시험 작성 중 실패와 수정**
  1. E2E가 '같은 이름의 학교가 여러 곳' 문구를 기대했는데, 앞 시험이 고른 학교 기록 때문에 화면은 '다시 골라야'(MAPPING_CHANGED)를 보였다. 정상 동작이라 두 문구를 모두 받도록 고쳤다.
  2. E2E 가상 서버가 차수 자료에서 Form `JG_YEAR`를 빠뜨려 '출처 확인 필요'가 나왔다. 실측 응답과 같게 고쳤다.
  3. E2E 공용 PDF 본문에 '1학기'가 있어 9월 문서가 `SEMESTER_CONFLICT`로 보류됐다. 분류기는 맞게 동작한 것이다. 시험 자료를 표기 없는 PDF로 바꿨다.
  - 기존 단언은 약화하지 않았다. skip·xfail은 0이다.
- **이번에 하지 않은 것**
  - 18구간 요약 전용 E2E 단언: 기존 `z-a27-autosync` 첫 시험의 '18개 구간' 단언이 계속 통과한다. 이번 E2E에서는 같은 학교의 앞선 등록과 섞여 개수를 단언하지 않았다.
  - 상산고 ZIP·DOCX·`NOT_PLAN`은 Unit·LIVE 재현으로만 확인했고 E2E로는 하지 않았다.
  - 4월 응답에 9월 파일이 섞이는 경우(차수 무시)는 IT(부록 G)로만 확인했다.

## H6. 데이터 · Git 보존

- Flyway: 최신 `202611190300` 재확인, 이번 적용 0. `V202611180100`: 미도입.
- HWP 6파일 SHA 6/6, 원본 폴더 68건, staged 0.
- 사용자 DB: 30표 `CHECKSUM TABLE` 작업 전후 동일, 학교알리미 원본·연결·학교 선택 표 0행.
- 사용자 프로세스: 사용하지 않았다(8080은 비어 있을 때 이 작업이 smoke 용으로 띄우고 종료).
- **신규 (3)**: `controller/SchoolInfoLiveDerivedSearchApiTest`, `integration/schoolinfo/SchoolInfoYearQueryProfileTest`, `e2e/assessment/tests/z-a27-live-derived.spec.ts`
- **수정 (9)**
  - Backend: `SchoolInfoClient`(고등학교 더보기 검색·`SEARCH_TRUNCATED`·ZIP 100), `SchoolInfoSyncService`(목록 잘림 → 선택 보류, 진단 로그), `SchoolInfoImportService`(목록 잘림 → 409 AMBIGUOUS), `application.yml`(`local-run` 프로필)
  - 시험: `FakeSchoolInfoServer`(실측 검색 화면 모양), `SchoolInfoClientTest`
  - E2E: `stub-schoolinfo.mjs`(실측 검색·주소·차수 구조)
  - 문서: `api-contract.md`(§38-12 '부록 H 변경', ZIP 한도 문구), `domain.md` §30-E, 이 부록
- 저장소 밖
  - 탐침: `scratchpad\live_probe_april.py`·`live_probe_hanbit2/3/4.py`
  - 실측 원본·요약: `live-april\`(`summary-probe.json`·`hanbit2/3.json`·`hanbit-paju.json`·`replay.json`·`replay-table.txt`)
  - 로그: `unit-final.log`·`ith*.log`·`e2e-final.log`·`boot-8080-localrun.log` 등

## H7. 남은 위험 · 결정

| 등급 | 내용 | 다음 행동 |
|---|---|---|
| P1 | 같은 학교 4월·9월 대조는 상산고만 했다. 고양 가좌고·파주 한빛고의 9월은 미실측(부록 G 9월 가좌고는 인천) | 필요하면 학교 2곳 × 3학년도 9월 항목 6건 추가 실측 승인 |
| P1 | 분석기(PR, 수집과 별개): 상산고 4월 표본 중 과목 0이 2025 8/40 · 2024 9/39. 과목명 오추출·동명 수행평가 오병합 판단은 하지 않음(**NOT VERIFIED**) | PR 분석기 담당 · 원문 대조 truth |
| P2 | 가좌고 2024 공동교육과정 원본 1개 재분류 NOT RUN(탐침 저장 이름 충돌) | 다음 실측 때 1건 재확인 |
| P2 | 검색 목록이 한 화면을 넘으면(고등학교 더보기도 잘림) 자동 선택하지 않고 보류만 한다(페이지 넘김 미구현) | 실제 사례가 나오면 페이지 넘김 실측 |
| P2 | 학생 공식 원본 공급자(§10-1-3)에는 여전히 연결하지 않음 — 학생 화면 '공식 원본이 아직 확인되지 않았어요' | 별도 계약·Migration |
| 한계 | 실측 학교 4곳(인천·고양 가좌고, 상산고, 파주 한빛고)이 전 학교를 대표하지 않는다. 다른 학교도 같은 조건을 파일마다 검사하고 어긋나면 보류한다 | — |
| 운영 | 사용자 8080은 꺼져 있다. 켤 때 `local-run` 프로필을 주어야 true다 | 사용자 기동 |

| DoD | 근거 | 판정 |
|---|---|---|
| 파주 한빛고 식별 | LIVE — 이름·파주 한빛로 36 주소 일치, 누락 원인(검색 더보기) 확인, 다른 후보 내려받기 0 | **PASS** |
| 4월 공시 | LIVE — 3학교 × 2024~2026 `JG_CHASU=1` 9/9 일치, 9월과 SHA 겹침 0 | **PASS**(같은 학교 9월 대조는 상산고만 → 그 부분 PARTIAL) |
| 학기·학년 분류 | LIVE 재현 + LIVE-derived IT·E2E — 4월 → 1학기, 미표기 → 세 칸, 명시 학년만, 충돌 보류, 중복 0 | **PASS**(1건 NOT RUN) |
| 운영 활성화 | CONFIG(`local-run`) + USER SERVER(8080 smoke에서 true 확인) | **PASS · 현재 미실행** |
| E2E | 신규 1건 포함 60/60, skip·단언 약화 0 | **PASS** |
| 기존 데이터 | 190100·200·300 유지, 180100 미적용, 30표 체크섬 동일 | **PASS** |
| 기능 보존 | A27·Student Care IT·HWP6·`local` 분석기·학생 비공개 | **PASS**(Student Care Playwright NOT RUN) |
| 금지 작업 | Git 쓰기·Railway·대량 수집·사용자 컨테이너 삭제 0 | **PASS** |
| **종합** | | **PASS(일부 PARTIAL)** — 남은 것: 고양 가좌고·파주 한빛고 9월 대조, 공동교육과정 1건, 분석기 정확도 |


# 부록 I. 고양 가좌고·파주 한빛고 9월 6건 실측 및 동일 학교 4월·9월 대조 (2026-11-20)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_AppendixI_September6_LiveVerification_ClaudeCode_20261120.md`
- 표기 구분:

  | 표기 | 의미 |
  |---|---|
  | **LIVE** | 실제 학교알리미 접속 |
  | **REPLAY** | 저장한 실측 HTML·원본으로 네트워크 없이 다시 실행 |
  | **LIVE-derived Fixture** | 실측 구조를 본뜬 가상 서버 |
  | **CONFIG** | 설정 확인 |
  | **USER SERVER** | 사용자 서비스 접근 |
  | **E2E** | 화면 인수 시험 |

- Git 쓰기·Railway·사용자 DB 쓰기·사용자 서비스 기동은 0건이다.

## I0. 승인 범위 · 시작 상태

| 순번 | 학교 | 학년도 | 공시 차수 |
|---|---|---|---|
| 1~3 | 가좌고등학교 — 경기도 고양시 일산서구 | 2026 · 2025 · 2024 | 9월 · 3차 (`JG_CHASU=3`) |
| 4~6 | 한빛고등학교 — 경기도 파주시 한빛로 36 | 2026 · 2025 · 2024 | 9월 · 3차 |

- 승인하지 않은 범위: 인천 가좌고·대전한빛·위례한빛·담양 한빛·상산고 새 조회, 4월 재요청·재다운로드, 다른 학년도·차수, 검색·상세 재요청.
- 시작 상태는 부록 H 마감과 같았다.
  - Git: Branch `integration/assessment-studentcare-20261116`, HEAD `9755581`, staged 0, M 144 · D 14 · ?? 152
  - 보존물: HWP 6/6, 원본 폴더 68건
  - 사용자 DB: Flyway `202611190300`(24건), 30표 `CHECKSUM TABLE`이 부록 H 마감값과 같음
  - 프로세스: 33307만 LISTENING, 8080·5173·5174 꺼짐, Docker `lh-local-run-mysql`만
- 백업 `C:\learnershigh-A27-UX-appendixI-backup-20261120\`: `tracked.diff --binary`·`untracked.tar`·`modified-snapshot.tar`·보고서·`application.yml` 사본, `backup.sha256`(검증 OK), `hwp6.sha256`, `checksum-before/after.txt`, `flyway-before.txt`. 부록 G·H 백업은 읽기만 했다(쓰기 0).

## I1. 학교 식별 (기존 LIVE 원본 근거 · 이번 검색·상세 요청 0)

| 학교 | 학교알리미 전체 ID | 정식 이름 · 주소 (상세 화면 원본) | 근거 파일 |
|---|---|---|---|
| 고양 가좌고 | `159bfc38-e79f-4b65-8b71-4d86557aa6f6` | 가좌고등학교 · 경기도 고양시 일산서구 가좌1로 43 | 부록 G `live\가좌고-detail-1.html` (= 부록 H `live-april\가좌고-detail-0.html` 사본, 내용 SHA 같음) |
| 파주 한빛고 | `4674a469-46ff-47af-b1ef-fdf2aa3e7f1f` | 한빛고등학교 · 경기도 파주시 한빛로 36 | 부록 H `live-april\한빛고-detail-more-0.html` |

- 탐침은 실측 전에 상세 원본 안의 ID·이름·주소가 위 값과 모두 같은지 확인했다. 원본 안에 제외 학교 ID가 있는지도 확인했다. 하나라도 어긋나면 그 학교는 요청 없이 멈추게 했고, 두 학교 모두 통과했다.
- 9월 항목 응답의 내려받기 Form `SHL_IDF_CD`도 6건 모두 대상 학교 ID와 같았다.
- **인천 가좌고 제외 확인**: 부록 G 9월 항목 3건(2026·2025·2024)의 Form `SHL_IDF_CD`는 모두 `dc84a61c-705a-44dc-bff1-592efdf7118b`였다(인천광역시 서해구 장고개로287번길 24). 이 자료는 이번 대조에 쓰지 않았다.
- 제외 ID: 인천 가좌고 `dc84a61c-…`, 대전한빛 `f4d658d9-…`, 위례한빛 `0b715b78-…`, 담양 한빛 `2cf7a711-…`. 이 학교들로는 요청·내려받기·등록을 하지 않았다(0건).

## I2. 9월 LIVE 결과 6행

| 학교 | 학년도 | 요청 `JG_YEAR/JG_CHASU` | 응답 선택 차수 | Form 연도·차수 | 첨부 목록 / 내려받음 | 첨부 이름의 학년도·학기 (REPLAY 분류) | 판정 |
|---|---|---|---|---|---|---|---|
| 고양 가좌고 | 2026 | 2026/3 | `20263` (3차) 2026년 09월 | 2026 · 3 | 5 / 3 | '2026 2학기 1학년', '…3학년', '2026학년도 2학기 소인수교과 및 공동교육과정' | **PASS** |
| 고양 가좌고 | 2025 | 2025/3 | `20253` 09월 | 2025 · 3 | 5 / 3 | '2025학년도 2학기 1학년', '…공동교육과정, 소인수교과', '…2학년(수정)' | **PASS** |
| 고양 가좌고 | 2024 | 2024/3 | `20243` 09월 | 2024 · 3 | 6 / 3 | '2024학년도 2학기 1·2·3학년' | **PASS** |
| 파주 한빛고 | 2026 | 2026/3 | `20263` 09월 | 2026 · 3 | 4 / 3 | '2026학년도 1·2·3학년 2학기' (HWPX) | **PASS** |
| 파주 한빛고 | 2025 | 2025/3 | `20253` 09월 | 2025 · 3 | 4 / 3 | '2025학년도 한빛고 2학기 (1·2·3학년)' (PDF) | **PASS** |
| 파주 한빛고 | 2024 | 2024/3 | `20243` 09월 | 2024 · 3 | 4 / 3 | '2024_2학기_1·2·3학년' (HWP) | **PASS** |

- PASS 근거: 요청 학년도 = 응답 선택 공시 학년도 = Form `JG_YEAR` = 첨부 이름의 학년도, 차수 3(09월), 첨부 학기 2학기, 원문 학기 충돌 0, `CHASU_IGNORED` 0.
- **요청량**: 학교마다 첫 화면 1 + 항목 3 + 내려받기 9로 총 26요청이 모두 200이었다(06:35:48~06:36:27, 간격 1초 이상). 내역:
  - 9월 항목 요청 **6건**(승인 상한 6)
  - 내려받기 18건(학년도당 3, 상한 18)
  - 검색·상세 0, 재시도 0
  - 403·429·5xx·캡차·다른 호스트 0
- 내려받지 않은 첨부는 각 학년도의 나머지 1~3개다(예: 학업성적관리규정, 가좌고 2024 '공동교육과정'·'3학년 인공지능기초'). 이 첨부들의 SHA·분류는 **NOT VERIFIED**다.
- **저장 충돌 방지 (부록 H 결함 재발 방지)**
  - 경로: `live-september\<전체 학교 ID>\<학년도>\09\<순번>-<SHA 앞 8자>-<원래 이름>.bin`
  - 임시 파일 → SHA 재확인 → 원자적 이름 변경, 같은 경로에 다른 SHA가 오면 저장 거부, 경로 탈출 검사
  - 결과: 18건 모두 `OK`(충돌 0)
- 실측 원본·HTML·요약은 백업 `live-september-run\`(저장소 밖)에 있다(`summary-probe.json`·`i-summary.txt`·`replay.json`·`replay-files.txt`·`client-replay.json`·`pairs.txt`). 탐침은 `scratchpad\live_probe_september.py`다.

## I3. 같은 학교 4월 · 9월 6쌍 대조 (REPLAY — 제품 Client 로 다시 읽음)

새 재현 시험 `SchoolInfoLiveClientReplayTest`는 실측 폴더가 있을 때만 돈다(네트워크 없음).
- 저장한 **실제 상세·항목 HTML과 실제 원본**을 루프백 서버로 돌려주고, 제품 `SchoolInfoClient.fetchYear`를 그대로 실행한다.
- 기본 항목 화면은 9월(3차) 실측 HTML이다. Client가 스스로 요청하는 `JG_CHASU=1`에는 같은 학교·같은 학년도의 부록 H 4월 실측 HTML을 준다.
- 실측 표본에 없는 첨부와 SHA가 기록과 다른 사본에는 404를 준다.
- 단언: Client가 받은 모든 원본의 바이트 SHA가 **그 학교·학년도·차수의 실측 기록 SHA**와 같아야 하고, 공시월(1차 = 4월, 3차 = 9월)과 분류 학기가 일치해야 한다.

| 학교 (ID · 주소) | 학년도 | 4월 차수·연도 | 9월 차수·연도 | 4월 표본 | 9월 표본 | SHA 비교 (표본끼리) | 학기 연결 (학년-학기: 원본 수) | 보류 | 판정 |
|---|---|---|---|---|---|---|---|---|---|
| 고양 가좌고 `159bfc38-…` · 가좌1로 43 | 2026 | 1차 · 2026 | 3차 · 2026 | 3 | 3 | 6개, 4월↔9월 겹침 0 | 4월 → 1-1 · 2-1 · 3-1 각 1 / 9월 → 1-2 1 · 3-2 1 | 9월 '소인수교과 및 공동교육과정' `GRADE_SCOPE_CONFLICT`(본문 학년 [2]) | **PASS** |
| 〃 | 2025 | 1차 · 2025 | 3차 · 2025 | 3 | 3 | 6개, 겹침 0 | 4월 → 1-1 2 · 2-1 2 · 3-1 1 (4월 공동교육과정은 본문 1·2·3학년 → 세 칸) / 9월 → 1-2 · 2-2 각 1 | 9월 '공동교육과정, 소인수교과' `GRADE_SCOPE_CONFLICT`(본문 [1,2]) | **PASS** |
| 〃 | 2024 | 1차 · 2024 | 3차 · 2024 | 2 (+1 NOT RECOVERED, I4) | 3 | 5개, 겹침 0 | 4월 → 2-1 · 3-1 각 1 / 9월 → 1-2 · 2-2 · 3-2 각 1 | — | **PASS**(4월 1건 미검증) |
| 파주 한빛고 `4674a469-…` · 한빛로 36 | 2026 | 1차 · 2026 | 3차 · 2026 | 3 | 3 | 6개, 겹침 0 | 4월 → n-1 / 9월 → n-2 (학년마다 1) | — | **PASS** |
| 〃 | 2025 | 1차 · 2025 | 3차 · 2025 | 3 | 3 | 6개, 겹침 0 | 〃 | — | **PASS** |
| 〃 | 2024 | 1차 · 2024 | 3차 · 2024 | 3 | 3 | 6개, 겹침 0 | 〃 | — | **PASS** |

- **교차 학교·교차 학년도·교차 학기 오연결 0**:
  - 6쌍 모두 Form 학년도 = 요청 학년도(`resolvedYear`)였다.
  - 4월 원본은 1학기 칸에만, 9월 원본은 2학기 칸에만 연결됐다.
  - 받은 원본 33개의 SHA가 모두 그 학교·학년도·차수의 실측 기록과 같았다.
  - 학년이 명시된 원본은 그 학년에만 연결됐다.
- **학년 범위가 4월과 9월에서 다르게 나온 이유**: 가좌고 공동교육과정 원본이 4월에는 세 칸, 9월에는 보류됐다. 결함이 아니라 원문 근거가 달랐기 때문이다. 본문 앞부분에서 찾은 학년이 4월 2025는 [1,2,3], 9월 2026은 [2], 9월 2025는 [1,2]였다(부록 G 규칙: 일부 학년만 → 보류).
- **이번 표본에서 시험하지 못한 규칙**:
  - '학년 미표기 → 고1·2·3': 고양 가좌고·파주 한빛고 9월 원본은 모두 이름에 학년이 있었다. 이 규칙은 부록 G의 인천 가좌고 LIVE와 Fixture IT·E2E로만 확인됐다.
  - 같은 원본 재조회 시 중복·Revision 0, `REMOVED_BY_ADMIN` 유지: 일회용 DB IT로 확인했고(부록 F·G·H 시험이 이번에도 통과), 실측 원본을 사용자 DB에 넣어 확인하지는 않았다.
- **18구간 근거 (LIVE)**: 고양 가좌고·파주 한빛고는 2024~2026 × 1·2학기 근거가 이번에 모두 같은 학교로 갖춰졌다. 이것은 슬롯 근거이지 문서 수가 아니다. 학년마다 표본 1개 이상이라는 뜻도 아니다(가좌고 2026 고2 2학기 원본은 내려받지 않았다). 4개 학교 표본이 전국을 대표하지는 않는다.

## I4. 가좌고 2024 4월 '공동교육과정' 원본 (부록 H 사본 손실)

- 기록 SHA `4304afad86ec…`(497,106 bytes)와 같은 파일을 부록 F·G·H 백업과 Downloads 폴더에서 크기 400~600KB 파일을 대상으로 찾았다. **없었다**.
- 결과: **NOT RECOVERED / NOT RUN — 4월 원본 재다운로드는 별도 승인이 필요하다.**
- 9월 원본이나 다른 학교 파일로 대신하지 않았다. REPLAY 서버도 이 첨부에는 404를 줬다(SHA 불일치 사본은 내주지 않음).

## I5. 발견 결함 · 수정 · 시험

**결함 (REPLAY로 발견, LIVE에서 실제로 일어난 것은 아님)**
- `SchoolInfoClient.download()`는 HTTP 상태를 보지 않았다.
- 첨부 응답이 404 오류 페이지면 그 HTML이 `file_<순번>`이라는 이름의 원본으로 받아들여졌다. 서비스는 이것을 원본 파일로 저장·분류할 수 있었다.
- 실측 학교 목록에는 표본으로 받지 않은 첨부(매 학년도 1~3개)가 있었고, REPLAY에서 이 첨부에 404를 주자 결함이 드러났다.
- 수정 전 `SchoolInfoLiveClientReplayTest`가 '가좌고고양 2026 `c3:5`는 실측 표본에 있는 원본만'에서 실패했고(`client-replay-before.txt`), 수정 후 통과했다(`client-replay-after.txt`).

**최소 수정**
- `SchoolInfoClient`: 내려받기 응답 상태를 기록한다. 2xx가 아니면 그 첨부만 문제 목록 `FILE_DOWNLOAD_FAILED`에 넣고 원본으로 쓰지 않는다.
- 서비스 기존 규칙에 따라 학년도는 일부 실패면 `PARTIAL`, 전부 실패면 `FAILED`가 된다. `NOT_PUBLISHED`(공시 없음)와 구분된다.
- 관리자 사유 라벨 `FILE_DOWNLOAD_FAILED: '첨부를 받지 못함(오류 응답)'`을 추가했다.
- 계약 §38-12 '부록 I 변경'과 `domain.md` §30-F에 기록했다. 새 API·표·열·Migration은 없다.

**신규 시험**

| 종류 | 시험 | 내용 |
|---|---|---|
| Unit | `SchoolInfoClientTest` +1 | 첨부 하나만 404면 그 첨부만 문제, 오류 HTML이 원본에 없음 / 모두 403이면 파일 0 + 문제 3 |
| IT | `SchoolInfoDisclosureMonthApiTest` +1 | 404 첨부는 원본·연결 0, `file_*` 원본 0, 2026 `PARTIAL` · 2025 `FAILED` |
| REPLAY | `SchoolInfoLiveClientReplayTest` 1 (실측 폴더 없으면 skip) | I3 내용 |

- LIVE-derived Fixture: `FakeSchoolInfoServer.missingSeqs`(첨부별 404)를 추가했다. 실측 HTML·원본은 저장소에 넣지 않았다.
- 기존 단언은 바꾸지 않았다.

**이번 실행 결과** (저메모리·순차: `JAVA_TOOL_OPTIONS=-Dspring.test.context.cache.maxSize=2`, `--no-daemon --max-workers=1`, Playwright workers 1)

| 항목 | 결과 | 시각 |
|---|---|---|
| REPLAY `SchoolInfoLiveReplayTest`(9월 원본 18개 분류·분석) | 1/1 | 06:3x |
| REPLAY `SchoolInfoLiveClientReplayTest` | 수정 전 FAIL → 수정 후 **1/1** | 06:4x |
| Backend Unit + ArchUnit | **64클래스 · 444 tests · 0 fail · skip 3**(기존 1 + 실측 폴더 의존 REPLAY 2) | 06:43~06:44 |
| Backend IT 전체 | **BATCH-COMPLETE 49/49 클래스 · 256건 · 실패 0 · skip 0** (53+76+127, 합집합 = 전체, 중복 0) | 06:44~06:59 |
| Assessment E2E 전체 | **17파일 60/60** (6.0m) — 실측 기반 `z-a27-live-derived` 포함, 신규 E2E 없음(화면 변경은 사유 라벨 1개) | 06:59~07:06 |
| `scripts/verify-frontend.ps1` | **PASS** | 07:06~07:07 |
| Node 전체 | **147/147** | 07:07 |
| Student Care Playwright | **NOT RUN** — 사용자 8080·리셋 API 구성. Student Care IT는 IT 배치에 포함돼 통과 | — |

- 가용 RAM은 배치마다 1.5~2.0GB였고, 실행 중 컨테이너는 최대 2개(사용자 DB + 시험 DB)였다. 강제 종료는 0건이다.

## I6. 운영 · 데이터 안전

| 항목 | 상태 |
|---|---|
| CONFIG | `application.yml`의 `local-run` 프로필에만 `assessment.schoolinfo.year-query-verified: true` — **변경 없음**. 기본·시험 프로필은 false(`SchoolInfoYearQueryProfileTest` 통과) |
| USER SERVER | 8080·5173·5174는 꺼진 그대로이고 이번에 기동하지 않았다. 사용자가 켤 때 `--spring.profiles.active=local-run` |
| 사용자 DB | Flyway `202611190300`(24건), 재적용 0. 30표 체크섬 작업 전후 동일, 학교알리미 원본 표 0행 — 실측 원본 등록 0 |
| Migration | `V202611190100/200/300` 유지, `V202611180100` 미도입 |
| 보존 | HWP 6/6, 원본 폴더 68건, staged 0, A27 관리자·학생·Student Care·`local` 분석기(시험으로 확인) |
| 학교알리미 실제 요청 | 26건(I2) |

- **신규 (1)**: `backend/src/test/.../service/plan/SchoolInfoLiveClientReplayTest.java`
- **수정 (7)**
  - Backend: `SchoolInfoClient.java`
  - 시험: `FakeSchoolInfoServer.java`, `SchoolInfoClientTest.java`, `SchoolInfoDisclosureMonthApiTest.java`
  - Admin: `model/schoolInfoSync.ts`
  - 문서: `api-contract.md`, `domain.md`, 이 부록

## I7. 최종 판정 · 남은 것

| DoD | 근거 | 판정 |
|---|---|---|
| 정확한 학교 식별 · 다른 학교 첨부 조회·등록 0 | I1 | **PASS** |
| 9월 항목 6건 (`JG_CHASU=3`) | LIVE I2 — 6/6 연도·차수·학교 일치 | **PASS** (6건 각각 PASS) |
| 같은 학교 4월·9월 6쌍 | REPLAY I3 — 오연결 0, 표본 SHA 일치, 겹침 0 | **PASS** (가좌고 2024 4월 1건 미검증) |
| 분류 규칙 (4월 → 1학기, 9월 → 2학기, 명시 학년만, 충돌 보류) | REPLAY | **PASS** — 학년 미표기 → 세 칸은 이번 표본에 해당 원본이 없어 Fixture(IT·E2E)로만 확인 |
| 저장 충돌 방지 · SHA 증빙 | I2 (18/18 OK) | **PASS** |
| 손실 4월 원본 | I4 | **NOT RECOVERED** |
| `local-run` true 유지 · 기본 false | CONFIG | **PASS** |
| 사용자 DB·서버·Git·Railway 무변경 | I6 | **PASS** |
| 회귀 | I5, 이번 실행 수치 | **PASS** (Student Care Playwright NOT RUN) |
| **종합** | | **PASS (일부 PARTIAL)** |

남은 것:
1. 가좌고 2024 4월 '공동교육과정' 원본 1건 — 재다운로드에는 별도 승인이 필요하다(4월 항목 1 + 첨부 1).
2. 내려받지 않은 첨부(학년도마다 1~3개)의 SHA·분류는 미검증이다. 운영 수집은 목록 전체를 받으므로 첫 운영 실행 때 관리자 화면에서 확인해야 한다.
3. 분석기(PR, 수집과 별개): 과목 0·HWPX·동명 수행평가 오병합 위험은 **미해결**이다. 이번 9월 표본 18개는 모두 과목을 1개 이상 추출했지만, 원문 대조 truth는 하지 않았다(NOT VERIFIED).
4. 학생 공식 원본 공급자는 여전히 미연결이고, 학교알리미 원본을 학생에게 자동으로 공개하지 않는다.


# 부록 J. 미검증 평가계획서 5건 실측 및 일회용 DB 전 구간 자동 등록 검증 (2026-11-20)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_AppendixJ_Missing5_CompleteAutoRegistration_ClaudeCode_20261120.md`
- 표기 구분:

  | 표기 | 의미 |
  |---|---|
  | **LIVE** | 실제 학교알리미 접속 |
  | **REPLAY** | 저장한 실측 HTML·원본을 루프백 서버로 재실행 |
  | **FIXTURE** | 가상 자료·치환 |
  | **EPHEMERAL DB** | 일회용 MySQL 실제 저장 |
  | **E2E** | 관리자 화면 자동화 |
  | **USER DB** | 사용자 DB 읽기 |
  | **NOT RUN** | 실행하지 않음 |

## J0. 승인 범위 · 시작 상태

- 승인 범위:
  - 고양 가좌고 9월 평가계획서 4개(S1~S4)와 2024년 4월 공동교육과정 1개(A1)를 실제로 내려받기
  - A1 순번 확인용 2024년 4월 항목 1회
  - 실측 원본으로 일회용 DB 전 구간 검증
- 승인하지 않은 범위: 그 밖의 학교·학년도·차수·첨부, 규정 6개 내려받기, 사용자 DB 쓰기, 8080·5173·5174 기동, Git 쓰기, Railway.
- 시작 상태는 부록 I 마감과 같았다.
  - Git: Branch `integration/assessment-studentcare-20261116`, HEAD `9755581`, staged 0, M 144 · D 14 · ?? 153
  - 보존물: HWP 6/6, 원본 폴더 68건
  - USER DB: Flyway `202611190300`(24건), 30표 `CHECKSUM TABLE`이 부록 I 마감값과 같음
  - 프로세스: 33307만 LISTENING, 8080·5173·5174 꺼짐
- 백업 `C:\learnershigh-A27-UX-appendixJ-backup-20261120\s073242\`: `tracked.diff --binary`·`untracked.tar`·`modified-snapshot.tar`·보고서·`application.yml` 사본, `backup.sha256`(검증 OK), `hwp6.sha256`, `checksum-before/after.txt`. 부록 G·H·I 백업은 읽기만 했다.

## J1. LIVE 5건 (2026-11-20 07:33:39~07:33:52)

| 번호 | 학교 ID · 주소 | 요청 학년도·차수 | 응답 학년도·공시월 (근거) | 첨부 제목 · FILE_SEQ | HTTP · 형식 · 크기 · SHA-256 | 원문 근거 → EPHEMERAL DB 분류 | 상태 |
|---|---|---|---|---|---|---|---|
| S1 | `159bfc38-e79f-4b65-8b71-4d86557aa6f6` · 경기도 고양시 일산서구 가좌1로 43 | 2026 · 3 | 2026 · 09월 (부록 I 실측 항목 HTML `20263`, Form 2026·3) | `2026 2학기 2학년 평가계획.pdf` · 5 | 200 · `%PDF-` · 3,049,234 · `f7a6eb8a45ff…` | 이름 2학기·2학년 → `VERIFIED` 고2-2 | DOWNLOADED · IDENTITY_VERIFIED · CLASSIFIED · REGISTERED_IN_EPHEMERAL_DB |
| S2 | 〃 | 2025 · 3 | 2025 · 09월 (`20253`) | `2025학년도 2학기 3학년 교수학습 및 평가 운영계획(수정).pdf` · 7 | 200 · PDF · 4,284,920 · `037a006af79f…` | 2학기·3학년 → `VERIFIED` 고3-2 | 〃 |
| S3 | 〃 | 2024 · 3 | 2024 · 09월 (`20243`) | `2024학년도 2학기 공동교육과정 교수학습 및 평가운영계획.pdf` · 3 | 200 · PDF · 342,735 · `672fb82419b8…` | 이름에 학년 없음, 본문 일부 학년만 → `UNCLASSIFIED` `GRADE_SCOPE_CONFLICT` | DOWNLOADED · IDENTITY_VERIFIED · CLASSIFIED · **HELD** |
| S4 | 〃 | 2024 · 3 | 2024 · 09월 (`20243`) | `2024학년도 2학기 3학년 인공지능기초 교수학습 및 평가 운영 계획.pdf` · 6 | 200 · PDF · 257,556 · `3c78d82d4646…` | 2학기·3학년 → `VERIFIED` 고3-2 (같은 칸의 3학년 종합 계획서와 **공존 2개**) | REGISTERED_IN_EPHEMERAL_DB |
| A1 | 〃 | 2024 · 1 | 2024 · 04월 (이번 항목 조회 `20241`, Form 2024·1) | `2024학년도 1학기 공동교육과정 교수학습 및 평가 운영 계획.pdf` · 3 | 200 · PDF · 497,106 · `4304afad86ec6549437a0039cdae282b39a0d0faad6f3891be314d1cdcca1baf` | 본문 1·2·3학년 모두 → `VERIFIED` `GRADES_FROM_BODY_ALL` 고1·2·3-1 | **RECOVERED** · REGISTERED_IN_EPHEMERAL_DB |

- 전체 SHA는 백업 `live-five-summary.json`에 있다.
- **게이트**: 요청 전에 다음을 모두 확인했다. 하나라도 다르면 그 건은 보내지 않게 했다.
  - 학교 상세 원본의 ID·이름·주소, 인천 가좌고 ID 부재
  - 부록 I 실측 9월 항목 HTML의 선택 차수(`YYYY3`)·Form `SHL_IDF_CD`·`JG_YEAR`·`JG_CHASU`
  - 대상 제목이 정확히 1개 순번에 대응하는지
- **응답 검증**: HTTP 2xx, `%PDF-` 서명, HTML 아님, 크기 > 0. 저장은 `live-five\<학교 ID>\<학년도>\<04|09>\<순번>--<SHA 12자>--<원래 이름>.bin`(임시 파일 → SHA 재확인 → 원자적 이름 변경, 한글 이름 유지)로 했고, 5/5 OK였다.
- **요청 수**: 첫 화면 1 + 4월 항목 1 + 내려받기 5 = **7건, 모두 200**. 9월 항목 재요청 0, 검색·상세 0, 재시도 0. 403·429·캡차·다른 호스트 0.
- **S2 '(수정)'**: 이 학년도 9월 목록에 같은 제목의 수정 전 원본은 없다. 그래서 별도 원본 1개로 등록됐다(개정 연결 없음). 기존 확정·검토 데이터와 관계없다.

## J2. A1 (2024 4월 공동교육과정) 복구

- 부록 H 기록: SHA `4304afad86ec6549437a0039cdae282b39a0d0faad6f3891be314d1cdcca1baf`, 497,106 bytes. 이번 다운로드도 **SHA 전체 일치, 크기 일치 → RECOVERED**.
- 2024년 4월 목록(순번 3·4·5·7·8과 제목)도 부록 H 때와 같았다.
- 분류(REPLAY → EPHEMERAL DB): 본문 앞부분에서 찾은 학년 [1,2,3] → `GRADES_FROM_BODY_ALL` → 고1·고2·고3 1학기 세 칸. 원본 1개에 칸 연결 3개다.
- 같은 종류의 9월 문서(S3, 2025·2026 9월 공동교육과정)는 본문 학년이 일부만 나와 보류됐다. 학년 범위는 원문 근거로만 정했다.
- 판정: **PASS**(복구). 부록 H~I의 'NOT RECOVERED'는 이번에 해소됐다.

## J3. 9월 목록 28건 집계

| 구분 | 고양 가좌고 | 파주 한빛고 | 합계 | 근거 |
|---|---|---|---|---|
| 9월 목록 첨부 | 5 + 5 + 6 = 16 | 4 + 4 + 4 = 12 | **28** | 부록 I 실측 항목 HTML |
| 부록 I에서 받은 평가계획서 | 9 | 9 | 18 | 부록 I |
| 이번에 받은 평가계획서 (S1~S4) | 4 | 0 | 4 | J1 |
| **실측 원본으로 확보한 9월 평가계획서** | **13** | **9** | **22** | EPHEMERAL DB 원본 행·SHA로 확인 |
| 학업성적관리규정 (받지 않음) | 3 (순번 4·4·4) | 3 (순번 3·3·3) | 6 | 목록 제목 |

- 22 + 6 = 28로 누락이 없다.
- 규정 6개는 **이름(메타데이터)으로만 제외**했다(FIXTURE Unit: 실제 이름 6개 + 가상 PDF 바이트 → `NOT_PLAN`). **원문 내용은 NOT VERIFIED.**
- REPLAY에서 규정 첨부는 404로 응답했다. 수집기는 이를 `FILE_DOWNLOAD_FAILED`(학년도 `PARTIAL`)로 기록했고 `NOT_PUBLISHED`로 오인하지 않았다.
- 이 수치는 두 학교의 9월 항목 6개에 대한 값이다. 4월 목록이나 전국에 대한 보증이 아니다.

## J4. 일회용 DB · 서버 구성

- 기존 Assessment E2E 실행기(`e2e/assessment/run.mjs`)를 그대로 쓴다.
  - Docker `mysql:8.4`, `--rm`·`--tmpfs`·라벨 `lh.owner=assessment-e2e`(이번 추가), DB `lh_e2e_assessment`, 사용자 `lhe2e`, 실행마다 새 임의 암호
  - 포트 127.0.0.1:**33340**: 사용자 DB 33307과 다르다
  - 설정 파일은 DB 이름이 `lh_e2e_assessment*`가 아니면 실행을 거부한다(기존 보호)
  - 실행 뒤 컨테이너 자동 삭제
- Flyway: 일회용 DB에만 전체 Migration을 적용했다(`V202611180100` 미도입 — 저장소에 없음).
- Backend는 **18090**에서 기본 E2E와 같은 환경 변수로 뜬다.
  - `ASSESSMENT_SCHOOLINFO_YEAR_QUERY_VERIFIED=true`는 이 시험 Backend에서만 켠다
  - `ASSESSMENT_SCHOOLINFO_BASE_URL=http://127.0.0.1:18769`(루프백 가상 서버만, 실제 학교알리미 접속 0)
  - 관리자 화면은 **5192**, 학생 화면은 **5191**
- 실측 재현 전용 설정 `e2e/playwright.assessment-live.config.ts`(신규):
  - 기본 설정을 그대로 가져온다. 바꾼 것은 둘뿐이다:
    1. 시험 폴더 `assessment/live-replay`
    2. 시험 Backend에 `ASSESSMENT_DEMO_ROSTER_ENABLED=true` — 합성 학교 2곳을 서로 다른 학교 ID로 격리하려는 것
  - 기본 `npm run test:assessment`에는 포함되지 않는다(기본 실행 로그에 live-replay 0건).
- 가상 학교알리미 '재현 모드'(`stub-schoolinfo.mjs`, `PUT /__fixture {replay:{manifest, group}}`):
  - 저장소 밖 manifest(`replay-manifest.json`)의 **실측 상세·항목 HTML과 원본 40개**를 SHA를 매번 확인하며 그대로 돌려준다.
  - 표본 밖 첨부와 SHA가 다른 사본에는 404를 준다. 부록 H에서 덮어써진 사본 1개는 SHA 불일치로 빠졌고, A1이 대신한다.
  - 실측 자료는 저장소·Git에 넣지 않았다.
- **학교 매핑 (FIXTURE)**
  - 고양 가좌고 → 합성 학교 `sch_demo_gajwa`(시연 명단 이름이 실제와 같은 '가좌고등학교', 치환 없음). 같은 이름 후보는 인천 가좌고 실측 상세.
  - 파주 한빛고 → `sch_demo_hansol`. 시연 명단에 '한빛고등학교'가 없어 **상세 HTML의 학교 이름만 '한솔고등학교'로 치환**했다. 같은 이름 후보는 담양 한빛고 실측 상세(같은 치환). ID·주소·항목·원본은 실측 그대로다.
- 사용자 DB·8080 접근 0: 시험 환경 변수에 33307·8080이 없다(설정 파일 고정값). 작업 전후 USER DB 체크섬이 같다(J10).

## J5. 학교별 18칸 (EPHEMERAL DB · E2E)

E2E `assessment/live-replay/a27-live-replay.spec.ts`(신규) 흐름:
1. 화면 진입만으로 자동 확인이 시작된다(**별도 '불러오기' 버튼 없음**). 같은 이름 2곳이라 선택이 필요하며, 선택 전 항목·원본 요청 0.
2. 지역 '경기도' 후보를 고른다(주소 확인). 서버가 2026·2025·2024 × 4월·9월을 수집한다.
3. 일회용 DB를 직접 조회하고, 3개 학년도 × 6칸 화면 문서 수 = DB 칸 연결 수를 단언한다.

같은 결과가 2회 실행(07:38~07:40, 08:07~08:09)에서 동일했다(원본 SHA·칸 연결).

**고양 가좌고** (`sch_demo_gajwa` ↔ `159bfc38-…`):

| 학년도 | 학년 | 1학기 상태 / 원본 | 2학기 상태 / 원본 | 비고 |
|---|---|---|---|---|
| 2026 | 고1 | 등록 / 1 | 등록 / 1 | 4월 소인수교과·공동교육과정 원본은 표본 밖(404) — 미검증 |
| 2026 | 고2 | 등록 / 1 | 등록 / 1 (S1) | |
| 2026 | 고3 | 등록 / 1 | 등록 / 1 | 9월 소인수교과·공동교육과정은 보류(`GRADE_SCOPE_CONFLICT`) |
| 2025 | 고1 | 등록 / 2 | 등록 / 1 | 1학기: 1학년 + 공동교육과정(본문 전 학년) |
| 2025 | 고2 | 등록 / 2 | 등록 / 1 | |
| 2025 | 고3 | 등록 / 1 | 등록 / 1 (S2) | **1학기는 공동교육과정 원본뿐. 4월 '3학년' 계획서는 표본 밖(404)이라 미보유** |
| 2024 | 고1 | 등록 / 1 | 등록 / 1 | **1학기는 A1(공동교육과정)뿐. 4월 '1학년' 계획서(순번 7)는 미보유** |
| 2024 | 고2 | 등록 / 2 | 등록 / 1 | 9월 공동교육과정(S3)은 보류 |
| 2024 | 고3 | 등록 / 2 | 등록 / 2 (3학년 + S4 인공지능기초) | |

- 집계 (첫 수집):

  | 항목 | 값 |
  |---|---|
  | 원본 | **22** (서로 다른 SHA 22, 4월 9 + 9월 13) |
  | 검증 · 보류 | `VERIFIED` 19 · `UNCLASSIFIED` 3 (9월 공동교육과정 3) |
  | 칸 연결 · 문서 · Revision | **23** · 23 · 23 |
  | 받지 못한 첨부 | 9 (`FILE_DOWNLOAD_FAILED`: 9월 규정 3 · 4월 표본 밖 평가계획서 3 · 4월 규정 3) |
  | 학년도 상태 | 3개 모두 `PARTIAL` (받지 못한 첨부 때문, 실패를 '공시 없음'으로 표시하지 않음) |
  | 확정 · 다른 학교 원본 | 0 · 0 |

**파주 한빛고** (`sch_demo_hansol` ↔ `4674a469-…`): 2026·2025·2024 × 고1~3 × 1·2학기 **18칸 모두 등록 / 원본 1개씩**.

| 항목 | 값 |
|---|---|
| 원본 · 검증 | **18** · 모두 `VERIFIED` (4월 9 + 9월 9, 형식: 2026 HWPX · 2025 PDF · 2024 HWP) |
| 칸 연결 · 문서 · Revision | 18 · 18 · 18 |
| 받지 못한 첨부 | 6 (규정 3 + 4월 규정 3) |
| 학년도 상태 | `PARTIAL` |
| 확정 · 다른 학교 원본 | 0 · 0 |

- '등록' 칸은 그 칸에 연결된 원본이 1개 이상이라는 뜻이다. **그 학년의 모든 계획서를 받았다는 뜻은 아니다**(가좌고 2025 고3-1·2024 고1-1). 4월 목록의 표본 밖 평가계획서 3개(2026 소인수교과·공동교육과정, 2025 3학년, 2024 1학년)는 이번 승인 밖이라 **NOT VERIFIED**다. 운영 수집은 목록 전체를 받는다.
- 화면: 3개 학년도 × 6칸 문서 수가 DB 연결 수와 같았다(36칸 × 2회). 캡처는 `e2e/test-results/a27j-*.png`(1600)이고, 800·1366·1920 가로 넘침은 0이었다.

## J6. 실패 · 경계 검증

| 항목 | 결과 | 근거 |
|---|---|---|
| 다른 학교 (같은 이름) | 선택 전 수집 0. 인천 가좌고·담양 한빛고의 항목·원본 요청 0(상세만), 다른 학교 ID 원본 0 | E2E 가상 서버 로그·DB |
| 학년도 · 차수 | 원본 40개 모두 실측 SHA. 4월 → 1학기, 9월 → 2학기만 | DB `attachment_seq` `c1:`/`c3:` · 칸 |
| 학년 범위 | 공동교육과정 4월 2건 → 세 칸, 9월 3건 → 보류 (원문 근거 차이) | DB `evidence_json.reason` |
| 404 (규정 · 표본 밖) | 원본 0 · 문제 목록 `FILE_DOWNLOAD_FAILED` · `PARTIAL` | E2E · 부록 I IT |
| 규정 제외 | 이름 6개 → `NOT_PLAN` (Unit, 원문 미검증) | `SchoolInfoDisclosureRulesTest` +1 |
| 재확인 (force) 2회 | 원본 · 연결 · 문서 · Revision 증가 **0** (가좌고 22/23/23/23, 한빛 18/18/18/18 유지) | E2E·DB |
| 관리자 삭제 | 2026 고1-1 문서 삭제(§38-9) → 다시 확인 → 새 문서·Revision 0, 칸 상태 `REMOVED_BY_ADMIN`(원본 0), 다른 원본 유지 | E2E·DB |
| 원본 SHA 변경 → 새 Revision · 확정 보존 | 합성 FIXTURE IT(부록 E·F `SchoolInfoSyncApiTest` 등)가 이번 IT 전체에서 통과. 실측 원본으로는 하지 않음(학교알리미 원본 변경 없음) | IT |
| 동시 실행 | 기존 IT(동시 선택·동시 확인)가 이번 IT 전체에서 통과 | IT |
| 학생 비공개 | 일회용 DB 확정 0 → 학생 공개 0. 학생 공식 원본 공급자 미연결은 그대로. 학생 화면 단언은 기본 E2E(`z-a27-*`)가 통과 | DB·E2E |

## J7. 분석 정확도 (수집과 별개)

- 이 E2E의 분석기는 **loopback Stub**(기본 E2E와 같음)이다. 일회용 DB의 분석 결과는 화면 흐름용 합성 결과라서 분석 정확도의 근거가 아니다.
- Spring 내부 `local` 분석기의 실측 원본 분석은 부록 G~I REPLAY 수치 그대로다(이번 5건은 분석하지 않음). 과목 0·HWPX·동명 수행평가 오병합 위험은 **미해결**이고, 원문 대조 truth는 NOT VERIFIED다.
- 자동 확정 0, 외부(Railway·Python) 폴백 0.

## J8. 수량 정정 (부록 I '33' vs 표 '35')

- 부록 I I3 표의 행별 표본은 4월 3 + 3 + 2 + 3 + 3 + 3 = **17**, 9월 3 × 6 = **18**, 합계 **35**다.
- 재현 산출물 `C:\learnershigh-A27-UX-appendixI-backup-20261120\live-september-run\client-replay.json`을 다시 세면 원본 35개, 서로 다른 SHA 35개다(집계 스크립트 출력 `count-reconcile.txt`).
- **부록 I 본문의 '받은 원본 33개'는 오기다. 정확한 값은 35개.** 부록 I는 수정하지 않고 여기서 정정한다.
- 이번 단위별 수치(EPHEMERAL DB):

  | 단위 | 고양 가좌고 | 파주 한빛고 | 합계 |
  |---|---|---|---|
  | 원본 파일(고유 SHA) | 22 (4월 9 · 9월 13) | 18 | **40** (= manifest 원본 40) |
  | 칸 연결 | 23 | 18 | 41 |
  | 보류 | 3 | 0 | 3 |
  | 규정(받지 않음, 9월 + 4월) | 3 + 3 | 3 + 3 | 12 |
  | 받지 못한 첨부(404) | 9 | 6 | 15 |

- 4월 가좌고가 원본 9개인 것은 부록 H 표본 8개(덮어써진 1개 제외) + 복구한 A1 1개이기 때문이다.

## J9. 시험 (이번 실행, 저메모리·순차: `JAVA_TOOL_OPTIONS=-Dspring.test.context.cache.maxSize=2`, `--no-daemon --max-workers=1`, Playwright workers 1)

| 항목 | 결과 | 시각 |
|---|---|---|
| REPLAY E2E `live-replay`(일회용 DB, 실측 원본 40) | **2/2** × 2회 (결과 동일) | 07:38~07:40 · 08:07~08:09 |
| Backend Unit + ArchUnit | **64클래스 · 445 tests · 0 fail · skip 3**(기존 1 + 실측 폴더 의존 REPLAY 2) | 07:42~07:43 |
| Backend IT 전체 | **BATCH-COMPLETE 49/49 클래스 · 256건 · 실패 0 · skip 0** (53+76+127, 합집합 = 전체, 중복 0, Student Care IT 포함) | 07:43~08:00 |
| Assessment E2E 전체(기본) | **17파일 60/60** (6.3m) | 08:00~08:07 |
| `scripts/verify-frontend.ps1` (typecheck·oxlint·build) | **PASS** | 08:09~08:10 |
| Node 전체 | **147/147** | 08:10 |
| Student Care Playwright | **NOT RUN** — 사용자 8080·리셋 API 구성 | — |

- 신규: E2E `live-replay` 1파일(학교 2건), Unit `SchoolInfoDisclosureRulesTest` +1(규정 6개). 기존 단언 변경 0, skip 추가 0. 실측 재현 E2E는 별도 설정으로만 돌고 기본 실행에 섞이지 않는다.
- 가용 RAM은 배치마다 1.7~3.5GB, 컨테이너는 최대 2개였다. 강제 종료 0.
- HWP 6/6, 원본 폴더 68건.

## J10. 보존 · 남은 것 · 최종 판정

- USER DB: Flyway `202611190300`(24건), 30표 체크섬 작업 전후 동일, 학교알리미 원본 0행. 실측 등록 0, 쓰기 0.
- 8080·5173·5174는 기동하지 않았다. 시험 포트(18090·5191·5192·18768·18769·33340)는 종료 확인했다.
- CONFIG: `local-run`에만 `year-query-verified: true`(변경 없음). `V202611180100` 미적용.
- Git 쓰기·Railway 0. staged 0.
- **신규 (2)**: `e2e/playwright.assessment-live.config.ts`, `e2e/assessment/live-replay/a27-live-replay.spec.ts`
- **수정 (3 + 이 부록)**: `e2e/assessment/run.mjs`(설정 선택·컨테이너 이름 전달·소유 라벨), `e2e/assessment/stub-schoolinfo.mjs`(재현 모드), `SchoolInfoDisclosureRulesTest.java`(+1). 제품 코드 변경 0, API·DB·Migration 변경 0.

| DoD | 판정 |
|---|---|
| (a) 5개 LIVE 요청·파일 검증 | **PASS** (5/5, A1 RECOVERED) |
| (b) 올바른 학교·학년도·차수·학년·학기만 일회용 DB 등록 | **PASS** (원본 40, 다른 학교 0, 공시월 ↔ 학기 일치) |
| (c) 버튼 없는 3개년 수집·학교별 18칸 화면 E2E | **PASS** (2학교 × 18칸, 2회) |
| (d) 9월 평가계획서 22개 미누락 · 규정 6개 제외 근거 | **PASS** (22 확보) / 규정 원문 **NOT VERIFIED** |
| (e) 재실행 중복 0 · 관리자 삭제 보호 · 확정 0 · 학생 공개 0 | **PASS** |
| (f) 기존 시험·자원·데이터 보존 | **PASS** (Student Care Playwright NOT RUN) |
| 4월 전체 목록 포괄성 | **NOT VERIFIED** (가좌고 4월 표본 밖 평가계획서 3개·규정 원문) |
| **종합** | **PASS(수집·등록 흐름) · 운영 수집 포괄성은 PARTIAL** |

남은 것:
1. 고양 가좌고 4월 표본 밖 평가계획서 3개(2026 소인수교과·공동교육과정, 2025 3학년, 2024 1학년)는 미보유다. 받으려면 별도 승인이 필요하다.
2. 학업성적관리규정 6개(9월)와 4월 규정은 원문 내용을 확인하지 않았다.
3. 분석기 정확도(J7)는 미해결이다.
4. 학생 공식 원본 공급자는 미연결이고, 학교알리미 원본을 학생에게 자동으로 공개하지 않는다.


# 부록 K. 가좌고 4월 미확보 3건 실측 · 학생 공식 원본 자동 연동 · 관리자↔학생 통합 검증 (2026-11-20)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_AppendixK_April3_StudentOfficialAutoLink_FinalE2E_ClaudeCode_20261120.md`
- 표기 구분:

  | 표기 | 의미 |
  |---|---|
  | **LIVE** | 실제 학교알리미 |
  | **REPLAY** | 저장한 실측 HTML·원본을 루프백 서버가 그대로 제공 |
  | **FIXTURE** | 가상 학교·자료·이름 치환·Stub |
  | **EPHEMERAL DB** | 일회용 MySQL |
  | **USER DB** | 사용자 DB(읽기만) |
  | **NOT RUN** | 실행하지 않음 |

- 분석기 정확도(완규님 담당)는 범위 밖이다(K6).

## K0. 시작 상태 · 범위

- 승인 범위:
  1. 고양 가좌고 4월 미확보 평가계획서 3개 LIVE
  2. 학생 홈·학교 평가 정보·수행평가 상세에 학교알리미 공식 원본 자동 등록·표시·열람·내려받기
  3. 학생이 먼저 진입해도 서버가 기존 자동 수집으로 확보
  4. 일회용 DB 관리자↔학생 E2E와 시연 화면
- 금지 범위: 분석기 정확도, 사용자 DB 쓰기, 사용자 서버 기동·종료, Git 쓰기, Railway.
- 시작 상태는 부록 J 마감과 같았다.
  - Git: Branch `integration/assessment-studentcare-20261116`, HEAD `9755581`, staged 0, M 145 · D 14 · ?? 155
  - 보존물: HWP 6/6, 원본 폴더 68건
  - USER DB: Flyway `202611190300`(24건), 30표 체크섬이 부록 J 마감과 같음
  - 프로세스: 33307만 LISTENING
- 백업 `C:\learnershigh-A27-UX-appendixK-backup-20261120\s111351\`: `tracked.diff --binary`·`untracked.tar`·`modified-snapshot.tar`·보고서·`application.yml`, `backup.sha256`(검증 OK), `hwp6.sha256`, `checksum-before/after.txt`.

## K1. LIVE 3건 (2026-11-20 11:14:54~11:15:02)

| 대상 | 학교 ID · 주소 | 학년도·차수 (근거) | 첨부 · FILE_SEQ | HTTP · 형식 · 바이트 · SHA-256 | 분류 (EPHEMERAL DB, 제품 분류기) | 칸 연결 |
|---|---|---|---|---|---|---|
| K-A1 | `159bfc38-e79f-4b65-8b71-4d86557aa6f6` · 경기도 고양시 일산서구 가좌1로 43 | 2026 · 1(4월) — 부록 H 실측 항목 HTML `20261`, Form 2026·1·같은 학교 ID | `2026학년도 1학기 소인수교과 및 공동교육과정 교수학습 및 평가운영 계획.pdf` · 3 | 200 · `%PDF-` · 613,352 · `be6fd5a47922994409b5f4177260552985fbcdb2ea6ae718ecba2a3d4e7c9c50` | 이름에 학년 없음, 본문 학년 [2]만 → `UNCLASSIFIED` `GRADE_SCOPE_CONFLICT` | **보류(0칸)** — 일부 학년 문서를 전 학년으로 펼치지 않음 |
| K-A2 | 〃 | 2025 · 1(4월) (`20251`) | `2025학년도 1학기 3학년 교수학습 및 평가 운영계획 (수정).pdf` · 23 | 200 · PDF · 4,424,023 · `4104d34914058e1d5d9e5583dd0a98c796bcc88e5945ed70fd604648f659e019` | 1학기·3학년 → `VERIFIED` | 2025 고3-1 (공동교육과정 원본과 **공존 2개**) |
| K-A3 | 〃 | 2024 · 1(4월) (`20241`) | `2024학년도 1학기 1학년 교수학습 및 평가 운영계획.pdf` · 7 | 200 · PDF · 2,027,849 · `0502de0ca5512bce0b14c0cb59ca3bba29208ce5dd1c75fbff1e83899e7934db` | 1학기·1학년 → `VERIFIED` | 2024 고1-1 (부록 J에서 복구한 A1 공동교육과정과 공존 2개, 별개 원본) |

- 순번은 부록 H 실측 4월 항목 HTML에서 확정했고, **목록 재요청은 0**이다(제목·Form 학교 ID·학년도·차수 게이트 통과).
- 요청: 첫 화면 1 + 내려받기 3 = **4건, 모두 200**. 검색·상세·항목 0, 재시도 0, 차단 0.
- 응답 검증: 2xx, `%PDF-` 서명, HTML 아님. 저장은 `live-k\<학교 ID>\<학년도>\04\<순번>--<SHA 12자>--<원래 이름>.bin`(임시 → SHA 확인 → 원자적 이름 변경)으로 했다.
- 기존 원본과 중복 여부: 부록 G·H·I·J 백업의 원본 65개와 SHA가 겹치지 않는다(새 원본 3개). '(수정)'은 같은 칸의 다른 원본을 덮지 않았다(공존).

## K2. 원본 포괄성 재집계 (EPHEMERAL DB · REPLAY manifest 43개)

| 학교 | 원본(고유 SHA) | VERIFIED · UNCLASSIFIED | 칸 연결 | 확정 | 부록 J 대비 |
|---|---|---|---|---|---|
| 고양 가좌고 (`sch_demo_gajwa`) | **25** (= 25) | 21 · 4 | 25 | 0 | 22 → 25 (+K-A1~A3). 보류 4 = K-A1 + 9월 공동교육과정 3 |
| 파주 한빛고 (`sch_demo_hansol`, FIXTURE 이름) | 18 (= 18) | 18 · 0 | 18 | 0 | 변화 없음 |
| 학생 먼저 진입 학교 (`sch_demo_hanlim`, FIXTURE) | 18 (= 18) | 18 · 0 | 18 | 0 | 신규(학생이 수집, K5) |

- 4월 가좌고의 표본 밖 평가계획서는 이제 **0**이다(K-A1~A3 확보). 받지 않은 것은 규정 문서(4월 3·9월 3)뿐이고, 원문은 **NOT VERIFIED**다.
- 18칸에 원본이 있다는 것이 '모든 과목 파일 확보'를 뜻하지는 않는다(목록 기준 포괄성만).
- 4월 → 1학기, 9월 → 2학기만 연결됐다(교차 0). 다른 학교 원본은 0이다.

## K3. 학생 공식 원본 연동 구조

- **원인 기록**: §10-1-3 GET은 있었지만 구현체가 `UnconnectedOfficialPlanSourceProvider`(항상 '연결 안 됨 · 문서 0')였다. 그래서 학생 화면은 언제나 '공식 원본이 아직 확인되지 않았어요'를 보였다.
- **계약** (`api-contract.md` §10-1-3 '부록 K 변경', `domain.md` §30-G):

  | 구분 | 내용 |
  |---|---|
  | 공급자 | `SchoolInfoOfficialPlanSource`(@Primary) = 학교알리미 수집 원본(학교 단위 `SchoolInfoSourceFile`·`SchoolInfoSlotLink`, 읽기만) |
  | 포함 조건 | 학생 본인 학적 슬롯 + 삭제되지 않은 문서 + `VERIFIED`(또는 관리자가 분류한 `UNCLASSIFIED`) + 원본 바이트 있음 + 학교알리미 학교 선택이 있으면 같은 학교 ID |
  | 제외 | 관리자 직접 업로드·`sourceUrl` 문자열·분석 결과 |
  | `documents[]` 추가 필드 | `sizeBytes`·`disclosureMonth` |
  | 신규 | `GET .../official/files/{id}`(attachment) · `.../preview`(PDF만) — 서버가 그 학생 그 칸의 목록을 다시 계산해 그 안의 ID만 준다(그 밖 404, 크기·SHA 재확인 409) |
  | 신규 | `POST .../official/ensure`(본문 없음) — 서버가 학생 학적에서 학교를 정한다 |

- **자동 확보 동작**
  - 학생 진입 확인은 관리자 화면 진입과 **같은 `start(..., force=false)`** 를 시스템 주체(`system_schoolinfo_auto`)로 호출한다.
    - 학교당 작업 1개, 학교·학년도별 24시간 기록, 순차·요청 간격·크기·ZIP 한도
    - 같은 이름 학교는 관리자 선택 전 등록 0, 학생에게 후보·주소 비노출
  - 상태: `RUNNING`(학년도 수집 진행 중일 때만 — 서버 분석만 남으면 `READY`) · `READY` · `SCHOOL_CONFIRMATION_REQUIRED` · `SCHOOL_IDENTITY_REQUIRED` · `NO_CONTEXT` · `FAILED`.
- **이번에 찾아 고친 결함 (IT·E2E로 재현)**
  - 학년도 기록이 `FAILED`면 `start()`가 매번 새 작업을 만든다(관리자 '다시 확인'용 설계).
  - 학생 화면은 같은 POST를 반복해 부르므로, 실패한 학교에서는 POST마다 새 작업이 생겨 **영원히 `RUNNING`이고 학교알리미 재요청이 반복될 수 있었다**.
  - **실패 캐시**를 넣었다: 학생 경로는 같은 학교 작업이 `FAILED` 학년도를 남기고 끝난 지 5분 안이면 그 결과를 돌려준다(외부 요청 0, 다음 진입 때 다시 시도). 관리자 '다시 확인'은 그대로다.
- **학적**: 학년도별 학년은 그 학년도 학적으로만 정한다. 시연 명단 학생은 2026학년도 학적만 있어 2025·2024는 '해당 학년도 학적 정보 없음'이다(다른 학년 원본 추측 0).
- **DB·Migration**: 새 표·열·Migration **없음**. 사용자 DB 적용할 것 없음.
- **확정 경계**: 원본 열람은 확정과 무관하다. §10-1 확정 평가 정보·채점기준·운영계획은 그대로 **관리자 확정분만** 공개된다(학생 화면은 분석 API를 부르지 않음 — 기존 E2E `a27-student-ux` [10·11] 통과).

## K4. 학생 화면

| 화면 | 변경 | 근거 캡처 (REPLAY · EPHEMERAL DB, 1600×900) |
|---|---|---|
| 홈 '학교 평가계획서 원본 · 3개년' | 진입만 하면 자동 확보, 끝나면 목록 자동 갱신. 원본 이름·형식·공시월·열기(PDF)/내려받기. 빈 칸 이유 구분: 확인 중 / 학교 확인 필요 / 가져오지 못함 / 이 학기 공시 원본 없음 / 학적 없음 | `a27k-student-home-gajwa-1600.png`(가좌고 2학년: `2026 2학기 2학년 평가계획.pdf` · PDF · 9월 공시), `a27k-student-first-hanlim-1600.png`(학생 먼저, HWPX 내려받기만) |
| 학교 평가 정보 | '학교알리미 평가계획서 원본' Section(원본 수·학교·학년·학기)을 '확정된 평가 정보'와 **분리** | `a27k-student-plans-gajwa-1600.png`(원본 1개 + '아직 확정된 평가계획서가 없어요') |
| 수행평가 상세 '평가계획서 원본' | 같은 학년·학기 **공개 원본 전체**임을 명시(과목별로 단정하지 않음) | `a27k-student-detail-gajwa-1600.png` |
| 같은 이름 학교 확인 필요 | '같은 이름의 학교가 있어 학교 확인이 필요해요…'(후보·주소 없음) | `a27k-student-school-confirm-1600.png` |
| 관리자 6칸 | 2025 고3-1에 3학년 본 계획서 + 공동교육과정 | `a27k-admin-2025-gajwa-1600.png` |

- 캡처 원본은 `…\s111351\screens\`에 있다.
- 첫 캡처에서 홈 카드 원본 이름이 좁은 칸에서 0폭으로 사라지는 결함을 발견해, 좁은 칸은 2줄 배치로 고친 뒤 다시 캡처했다.
- 800·1366·1920 가로 넘침 0(E2E 단언).
- 관리자 '학생 화면 보기'(읽기 전용)에서는 자동 확보 POST를 보내지 않는다.

## K5. 관리자↔학생 통합 E2E (실제 제품 Backend + EPHEMERAL DB 33340 + 가상 학교알리미 18769)

`e2e/assessment/live-replay/z-student-official.spec.ts`(신규, 실측 재현 설정 `playwright.assessment-live.config.ts`):

| 시나리오 | 증거 | 결과 |
|---|---|---|
| 1. 관리자 수집 후 학생(가좌고 2학년 `stu_demo_038`, 실제 이름 일치 '가좌고등학교') | REPLAY | 홈 2026 고2 2학기 원본 수 = DB(1개). 2025·2024 학적 없음. 학생 진입 시 항목·원본 요청 **0**(기록 재사용). 학교 평가 정보에서 내려받은 바이트 SHA `f7a6eb8a…` = 실측 S1. 상세 Section 원본 = DB. 2025 고3-1·2024 고1-1 본 계획서 DB + 관리자 화면 확인. 확정 0 |
| 2. 학생 먼저(한빛고 실측 자료 → `sch_demo_hanlim` '한림고등학교') | REPLAY + **FIXTURE**(상세 학교 이름 치환·같은 이름 후보 제외) | 관리자 방문 없이 두 탭 동시 진입 → 학교 검색 **1회**(작업 1개), 항목 6(3학년도 × 4월·9월), 원본 18(SHA 중복 0). ensure 응답 202×4 → 200 뒤 목록 자동 갱신. HWPX 내려받기 SHA 일치(열기 버튼 없음). 확정 0 |
| 3. 경계 | REPLAY + FIXTURE | 다른 학교 원본 ID 직접 요청 404(양방향), 같은 학교 다른 학년(고1) 404, 인증 없음 401. 같은 이름 학교(가좌고 2곳 실측 상세 → '대신고등학교' 치환): 학생 `SCHOOL_CONFIRMATION_REQUIRED`, 칸 연결 0, 항목·원본 요청 0, 주소 비노출. 관리자 삭제(§38-9) → 학생 목록·내려받기에서 사라짐(404) |

- 실학교 이름 연결 PASS는 시나리오 1(가좌고)만이다. 2·3은 FIXTURE 치환으로 표기한다.
- 같은 실행에서 관리자 실측 재현(부록 J `a27-live-replay`, 2학교 × 18칸·force 2회·관리자 삭제)도 함께 통과했다(원본 43개 manifest).
- **IT** `StudentOfficialPlanApiTest`(FIXTURE, 신규 4건):
  1. 학생 먼저 → 1학년 학생은 9월 1학년 + 학년 미표기 공통만, 4월 1학년만. 2학년 원본 404, 다른 학기 404, 401. 다시 진입 외부 요청 0. 확정 평가 정보 0
  2. 관리자 삭제 → 학생 비노출, force 뒤 재등장 0. 관리자 직접 업로드는 공식 원본 아님
  3. 학생 6명 동시 진입 → 학교 검색 1회, 중복 0. 같은 이름 학교 → `SCHOOL_CONFIRMATION_REQUIRED`, 0건
  4. 연결 실패 → `FAILED`(공시 없음 아님) → 5분 안 재진입 요청 0 → 그 뒤 다시 시도 성공
- USER DB 미접근(쓰기 0). 시험 Backend는 33340 일회용 DB만 쓴다(설정 파일 DB 이름 게이트).

## K6. 분석기 범위 제외

- 분석기 코드(`local` 분석기·HWP/HWPX 변환기·Railway·Python)는 **변경 0**이다.
- E2E의 분석은 loopback Stub이다. 일회용 DB의 분석 결과는 정확도 근거가 아니다.
- 과목 0·HWPX 오추출·같은 이름 1·2차 수행평가 병합은 **미해결(완규님 담당)**이다.

## K7. 회귀 (이번 실행, 저메모리·순차: `JAVA_TOOL_OPTIONS=-Dspring.test.context.cache.maxSize=2`, `--no-daemon --max-workers=1`, Playwright workers 1)

| 항목 | 결과 | 시각 |
|---|---|---|
| Backend Unit + ArchUnit | **64클래스 · 445 · 0 fail · skip 3**(실측 폴더 의존 REPLAY 2 + 기존 1) | 12:12~12:13 |
| Backend IT 전체 | **BATCH-COMPLETE 50/50 클래스 · 260건 · 실패 0 · skip 0** (53+77+130, 합집합 = 전체, 중복 0, Student Care IT 포함) | 12:13~12:32 |
| Assessment E2E 전체(기본, FIXTURE) | **17파일 60/60** | 12:32~12:39 |
| 학생 원본 카드 CSS 수정 뒤 관련 기본 E2E 5파일 | **24/24** | 12:48~12:51 |
| 실측 재현 E2E(관리자 2 + 학생 3, REPLAY) | **5/5** × 3회(최종 코드 12:44~12:46) | 12:09 · 12:39 · 12:44 |
| `scripts/verify-frontend.ps1` | **PASS**(최종 CSS 수정 뒤 12:47~12:48) | — |
| Node 전체 | **147/147** | 12:43 |
| Student Care Playwright | **NOT RUN** — 실행기가 사용자 8080·리셋 API를 쓴다(격리 실행기 없음) | — |

- **기존 E2E 단언 변경(사용자 승인 계약 변경에 따른 것)**: '학생 공식 원본 = 확인되지 않음'을 확인하던 6곳을 바꿨다.
  - 새 단언: '화면 원본 수 = 서버 §10-1-3 문서 수 + 미연결 문구 0'(공용 도우미 `expectOfficialSlotMatchesServer`).
  - 자료가 정해진 z- 시험은 '본인 학년·학기 원본만 보임(학년 미표기 9월 원본 표시, 4월·다른 학년 원본 없음)'과 '학적 없는 학년도는 추측 표시 없음', '확정 평가 정보에는 이 문서 없음'으로 구체화했다.
  - skip·xfail은 0이다.
- 시험 작성 중 실패와 원인:
  - ① 가상 PDF 기대값 계산 오류(시험)
  - ② 앞 시험의 분석 중 작업 재사용(시험 간 대기 추가 — 학교당 작업 1개는 의도대로)
  - ③ `FAILED` 학교 무한 `RUNNING`(**제품 결함 → 실패 캐시로 수정**)
  - ④ 지난 학년도 학적 없는 Mock 학생에게 원본을 기대한 시험 오류(정책대로 시험 교정)

## K8. 안전 · 운영 · 시연 절차

- **변경 파일** (제품 코드 변경은 Assessment 영역만, Student Care·공유 Shell·HWP 변환기 변경 0)
  - 신규 Backend 2: `SchoolInfoOfficialPlanSource`, `StudentOfficialEnsureResponse`
  - 수정 Backend 5: `OfficialPlanLookup`(필드 2), `UnconnectedOfficialPlanSourceProvider`(주석), `SchoolInfoSyncService`(학생 진입점·실패 캐시·`finishedAt`), `OfficialPlanQueryService`, `StudentEvaluationPlanController`
  - Frontend 학생: 신규 4(`useOfficialEnsure`, `officialEmptyText`, `OfficialDocuments.tsx/.module.css`), 수정 `types.ts`·`evaluationPlansHttp.ts`·`evaluationPlansApi.ts`·`OfficialPlansCard.tsx`·`DetailSections.tsx`·`EvaluationPlansRoute.tsx/.module.css`
  - 시험: 신규 `StudentOfficialPlanApiTest`·`z-student-official.spec.ts`, 수정 `support.ts`·기본 E2E 5파일·`stub-schoolinfo.mjs`(Fixture 덮어쓰기 옵션)
  - 문서: `api-contract.md` §10-1-3, `domain.md` §30-G, 이 부록
- **Migration**: 신규 없음. `V202611190100/200/300` 유지, `V202611180100` 미적용. 사용자 DB에 추가로 적용할 것 없음.
- **운영**: `local-run`에만 `year-query-verified: true`(변경 없음). 사용자 8080·5173·5174는 기동하지 않았다. 사용자가 켤 때 `--spring.profiles.active=local-run`. 그 뒤 학생이 Assessment에 들어오면 학생 학교의 학교알리미 원본 확인이 자동으로 시작된다(학교당 1개 작업, 24시간 기록). 같은 이름 학교는 관리자가 평가계획서 탭에서 먼저 학교를 골라야 한다.
- **재현 가능한 시연 절차** (일회용 DB, 사용자 서비스와 무관)

  ```powershell
  cd C:\learnershigh-assessment-integration\e2e
  $env:ASSESSMENT_PW_CONFIG = "playwright.assessment-live.config.ts"
  $env:A27_LIVE_MANIFEST = "C:\learnershigh-A27-UX-appendixK-backup-20261120\s111351\replay-manifest.json"
  node assessment\run.mjs --headed     # 일회용 MySQL 33340 + Backend 18090 + 학생 5191 + 관리자 5192 + 가상 학교알리미 18769
  ```

  1. 관리자 흐름: 관리자 → 평가계획서(가좌고) → 같은 이름 2곳 중 '경기도' 선택 → 3개 학년도 6칸 자동 연결
  2. 학생 흐름 A: `http://localhost:5191/assessment?devStudent=stu_demo_038` → 홈 원본 자동 표시 → 학교 평가 정보 → 내려받기 → 수행평가 상세
  3. 학생 흐름 B: `stu_demo_026` → 학생 먼저 자동 수집
  4. 경계 흐름 C: `stu_demo_022` → 학교 확인 필요
  - 실행이 끝나면 실행기가 일회용 DB를 지운다.
- **남은 PARTIAL · NOT RUN**
  - Student Care Playwright NOT RUN.
  - 관리자 '학생 화면 보기'(읽기 전용 iframe)의 원본 목록 조회 경로는 이번에 시험하지 않았다.
  - 한빛고 학생 연결은 FIXTURE 이름 치환이다(시연 명단에 '한빛고등학교' 없음).
  - 규정 원문 NOT VERIFIED.
  - 분석기 정확도 범위 밖.
  - 학교알리미 작업 줄이 서버에 하나라, 다른 학교 작업(수집 + 서버 분석)이 길면 학생 '확인 중'이 길어질 수 있다. 화면은 최대 5분까지 다시 확인한다.

## K9. 최종 DoD

| DoD | 근거 | 판정 |
|---|---|---|
| 1. LIVE 3건 | K1 — 3/3 다운로드·검증, K-A1 보류 사유 명시 | **PASS** |
| 2. 학생 실제 학교·학년도·학년·학기 원본 자동 표시, 바이트 = 원본 | K5 시나리오 1(REPLAY, 실제 이름) + IT | **PASS** |
| 3. 학생 먼저 방문 자동 동기화, 중복 수집·저장 0 | K5 시나리오 2(FIXTURE 이름) + IT 6명 동시 | **PASS(FIXTURE 학교 이름)** |
| 4. 다른 학교·학년·학기·보류·삭제·직접 업로드 혼입 0 | K5 시나리오 3 + IT | **PASS** |
| 5. 원본 열람 ↔ 미확정 AI 비공개 분리 | IT·E2E(확정 평가 정보 0, 분석 API 미호출) | **PASS** |
| 6. 관리자 18칸 ↔ 학생 원본 수·SHA 일치, 4월·9월 구분 | K2·K5 | **PASS** |
| 7. 전체 회귀 · 보존 | K7·K8, USER DB 체크섬 동일, HWP 6/6, 원본 폴더 68, staged 0 | **PASS**(Student Care Playwright NOT RUN) |
| 8. 캡처·시연 절차 | K4·K8 | **PASS** |
| **종합** | | **PASS(범위)** — PARTIAL: 한빛고 학생 연결 이름 치환 · Student Care Playwright · 관리자 학생 화면 보기 미시험 |


# 부록 L. 학생 홈 흰 바탕 · 한빛고 실명 학생 원본 · 관리자 학생 화면 보기 · Student Care 격리 회귀 (2026-11-20)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_AppendixL_WhiteHome_Integration_Closure_ClaudeCode_20261120.md`
- 표기 구분:

  | 표기 | 의미 |
  |---|---|
  | **REPLAY** | 부록 K manifest의 실측 HTML·원본 재실행 |
  | **FIXTURE** | 합성 학생·가상 자료 |
  | **EPHEMERAL DB** | 일회용 MySQL |
  | **USER DB** | 읽기만 |
  | **NOT RUN** | 실행하지 않음 |

- 이번 작업에서 학교알리미 LIVE 요청은 **0건**이다. 분석기(완규님 담당)는 범위 밖이다.

## L0. 시작 · 종료 상태

| 항목 | 시작 (13:10) | 종료 (14:16) |
|---|---|---|
| Branch · HEAD · staged | `integration/assessment-studentcare-20261116` · `9755581` · 0 | 같음 |
| Git | M 146 · D 14 · ?? 161 | M 149 · D 14 · ?? 163(신규 3, L8) |
| HWP/HWPX 6 · 원본 폴더 | 6/6 · 68 | 6/6 · 68 |
| USER DB | Flyway `202611190300`(24) · 30표 체크섬 = 부록 K 마감 | 같음(체크섬 동일, 학교알리미 원본 0행) |
| 포트 | 33307만 LISTENING | 같음(시험 포트 18090·18095·18096·5191·5192·18768·18769·33340·33350 모두 종료) |
| REPLAY 입력 | 부록 K `replay-manifest.json` SHA `1802759c…` | L 세션 사본도 같은 SHA(결과 파일만 L 폴더에 기록) |

- 백업 `C:\learnershigh-A27-UX-appendixL-backup-20261120\s131058\`: `tracked.diff --binary`·`untracked.tar`·`modified-snapshot.tar`·보고서·`application.yml`, `backup.sha256`(검증 OK), `hwp6.sha256`, `checksum-before/after.txt`, 로그, 캡처 `screens\`.

## L1. 학생 Assessment 홈 흰 바탕 (필수)

| 구분 | 내용 |
|---|---|
| 변경 전 | 홈 `.page` `background: var(--as-color-canvas)` = `#f3f4f7` → computed `rgb(243, 244, 247)`(부록 E S2) |
| 변경 후 | 홈 `.page` `background: var(--as-color-bg)` → Light computed **`rgb(255, 255, 255)`**. Dark는 기존 `--as-color-bg`(#17181b) 그대로 |
| 수정 CSS | `frontend/student/src/features/assessment/components/home/homeDashboard.module.css`(`.page` 바탕, 카드 3종 그림자 `0 1px 3px rgb(29 31 35 / 0.06)`), `components/home/dashboard.module.css`(원본 3개년 카드 그림자, 홈에서만 쓰임) |
| 바꾸지 않은 것 | 공용 토큰(`--as-color-canvas` 포함), 다른 학생 화면·관리자·Student Care 바탕, 카드 흰색, 사이드바 접기·Drawer, 레이아웃 |

- E2E `a27-student-shell.spec.ts` [S2·부록 L]은 회색 단언 3곳만 흰색으로 바꿨다. 이름과 설명도 갱신했다. 단언은 오히려 늘렸다.
  - 홈 바탕 흰색, 화면 끝까지 이어짐, 부모 요소 회색 0
  - 카드 8종 흰색 + 1px 테두리
  - 1920·1600·1366·800 흰색·가로 넘침 0
  - 접힌 메뉴에서도 흰색
  - 목록 화면 바탕 불변
- 캡처: `screens\a27l-home-white-{1600,1920,1366,800}.png`, `a27l-home-white-collapsed-1600.png`. 전체 페이지 캡처에서 상단 고정 메뉴가 중간에 찍히는 것은 Playwright 이어 붙이기 방식 때문이고, 화면 결함이 아니다.

## L2. 파주 한빛고 실명 학생 원본 (REPLAY + 정확한 학교 이름 FIXTURE)

- **학교**: `4674a469-46ff-47af-b1ef-fdf2aa3e7f1f` · 한빛고등학교 · 경기도 파주시 한빛로 36(부록 H 상세 원본). 이번 시험은 manifest의 기본 이름 치환('한솔고등학교')을 **끄고** 실측 HTML을 그대로 썼다. 같은 이름 후보는 담양 한빛고 실측 상세다.
- **합성 학생**: `stu_demo_e2e_hanbit2`. 학교 `sch_e2e_hanbit_paju` '한빛고등학교', 2026학년도 2학년(1·2학기 과목은 카탈로그 값), 지점 `br_demo_c`. 실존 학생이 아니다.
  - 명단 파일: `e2e/assessment/fixtures/e2e-roster-hanbit-paju.json`
  - 시험 전용 설정 `assessment.demo-roster.e2e-extra-file`(기본 비어 있음)로 일회용 E2E에서만 더했다. `DemoRoster`가 같은 무결성 검사(ID 접두·지점·좌석·카탈로그)를 하며, Unit `DemoRosterTest` +1로 확인했다. 운영 시연 명단 파일은 그대로다.
- **결과** (`z2-hanbit-realname.spec.ts`, EPHEMERAL DB)

  | 단계 | 결과 |
  |---|---|
  | 학생 먼저 진입 | `SCHOOL_CONFIRMATION_REQUIRED`, '학교 확인이 필요해요'. 칸 연결 **0**, 항목·원본 요청 **0**(파주 실측 상세는 읽음) |
  | 관리자 학교 선택 | 평가계획서 탭에서 같은 이름 2곳 중 '경기도' → 요약 '경기도 파주시 한빛로 36' → 확정. 학교 매핑 = `4674a469-…` |
  | 학생 화면 갱신 | **다시 들어가지 않아도**(15초 간격 확인) 2026 고2 2학기 원본 1개 표시: `2. 2026학년도 2학년 2학기 교수학습 및 평가운영계획(정보공시).hwpx`. 2025·2024는 '해당 학년도 학적 정보 없음' |
  | 내려받기 | SHA `b3a09e2ad5d4…`(실측 원본과 같음) |
  | 경계 | 같은 학교 고1 원본 404, 다른 학교(가좌고) 원본 404 |
  | 수량 | 원본 18(고유 SHA 18), 칸 연결 18, 항목 요청 6(3학년도 × 4월·9월), 담양 항목·원본 요청 0, 확정 0 |

- 이것은 실학교 이름과 실측 원본으로 연결한 시험이다. 학생은 합성 FIXTURE이고, 실제 운영 학생·실서비스 시연이 아니다.

## L3. 관리자 '학생 화면 보기' 공식 원본

- **발견**: 학생 화면 보기의 읽기 전용 경로(`/api/admin/assessment/students/{id}/student-view/…`)에 `/evaluation-plans/official`이 없었다. 그래서 부록 K 이후 관리자 미리보기의 원본 카드는 조회에 실패했을 것이다(부록 K는 미시험).
- **최소 수정**: `AdminStudentViewController`에 읽기 경로 3개를 더했다.
  - 원본 목록, 파일(attachment), 미리보기(PDF만)
  - 기존 `access.readOnlyContext`(담당 지점 범위, 밖이면 404)를 거쳐 학생과 같은 `OfficialPlanQueryService`를 부른다.
  - 학생 결과물 파일 내려받기와 같은 읽기 전용 정책이다.
  - 자동 확보 POST는 두지 않았다. 화면도 읽기 전용 모드에서 POST를 보내지 않는다(부록 K 규칙 유지).
  - 계약 §10-1-3 '부록 L 변경'에 기록했다.
- **검증**
  - IT `StudentOfficialPlanApiTest` +1(FIXTURE):
    - 학생과 같은 원본 ID 목록, 바이트 SHA 일치
    - 다른 칸 404, 담당 밖 관리자(`adm_bundang`) 404
    - ensure 경로 없음(404/405)
    - 학교알리미 요청 0, 원본·연결 수 불변
  - E2E(`z2-hanbit-realname` 2번째, REPLAY + FIXTURE, `adm_demo_c01`):
    - iframe 홈 원본 = DB 1개, 내려받기 SHA 일치, 새로고침 뒤 유지
    - `/official/ensure` POST 0, 학생 API 쓰기 0, 학교알리미 요청 0
    - DB(원본·연결·Revision·학년도 기록) 79/79/79/15 전후 동일
    - 담당 밖 `adm_demo_a01` 목록·파일 404
  - 캡처 `screens\a27l-admin-student-view-1600.png`('읽기 전용 · 차단한 쓰기 시도 0건').
- 학생 개인 메모·안내문 파일 비노출은 기존 정책·시험(`a27-student-ux`) 그대로다(이번에 바꾸지 않음).

## L4. Student Care Playwright 격리 실행

- **기존 의존 (읽기 추적)**
  - `e2e/playwright.config.ts`: `E2E_BASE_URL`(기본 4174, 관리자 미리보기), `testMatch` = `student-care-x2.spec.ts`·`admin-shell.spec.ts`
  - `tests/support.ts`: `E2E_API_URL`(기본 **8080**) `/api/test/reset`·`/clock`·`/integration`
  - Backend 조건: `care-demo,e2e` 프로필 + `learnershigh.test-endpoints.enabled=true` + 합성 시드(210명, AS_OF 2026-11-11, 화면 오늘 11-12)
- **격리 실행기 (신규, 기존 설정 변경 0)**: `e2e/student-care/run-isolated.mjs`
  - 시작 전 시험 포트 사용 여부와 사용자 포트·DB 겹침을 확인하고, 어긋나면 멈춘다(fail-closed).
  - 일회용 MySQL `127.0.0.1:33350`(`--rm`·tmpfs·라벨 `lh.owner=student-care-e2e`, DB `lh_e2e_care`)
  - 시험 Backend 18095: `care-demo,e2e`, `APP_FIXED_DATE=2026-11-12`, `LEARNERSHIGH_MOCK_ANCHOR_DATE=2026-11-11`, DB 예시 켬, 시험 Endpoint 켬. 학교알리미는 닫힌 루프백(`127.0.0.1:9`)이라 외부 0.
  - 합성 시드: 생성기를 임시 폴더에 새로 실행했다. 사용자 `scripts/demo/care-demo.generated.sql`은 건드리지 않았다.
  - 관리자 build → `vite preview` 18096(Proxy → 18095)
  - `playwright.config.ts`를 `E2E_BASE_URL=http://localhost:18096`·`E2E_API_URL=http://127.0.0.1:18095`·`--workers=1`로 실행
  - 끝나면 이 실행기가 만든 프로세스·컨테이너·임시 폴더만 정리한다.
  - 실행 로그에 DB 주소(암호 가림)·포트를 남겼다.
- **결과 (2회, 13:24·14:12)**
  - 22건 = **통과 21 + 기대 실패 1**
  - 기대 실패는 `test.fail()`로 표시된 기존 제품 결함 '상담 양식 첫 글자 사라짐'이다. 2026-11-16 A22에서 발견해 Student Care 담당자 확인을 요청한 것으로, 이번에 바꾸지 않았다.
  - skip 0. 두 번 모두 종료 뒤 18095·18096·33350 정리를 확인했고, 8080 사용 0이다.
- Student Care 화면 캡처는 따로 남기지 않았다(실패 시에만 찍는 기존 설정).

## L5. 회귀 (이번 실행, 저메모리·순차)

| 항목 | 결과 | 시각 |
|---|---|---|
| Backend Unit + ArchUnit | **64클래스 · 446 · 0 fail · skip 3**(실측 폴더 의존 REPLAY 2 + 기존 1) | 13:26~13:27 |
| Backend IT 전체 | **BATCH-COMPLETE 50/50 클래스 · 261건 · 실패 0 · skip 0** (53+78+130, 합집합 = 전체, 중복 0, Student Care IT 포함) | 13:27~13:43 |
| Assessment E2E 전체(기본) | 1회차 **56/60**(a27-ux 4건 실패) → 2회차 **59/60**(a12-flows 1건 실패) → 3회차 **60/60** | 13:43 · 13:54 · 14:02 |
| 실패 파일 단독 재실행 | a27-ux 13/13, a12-flows 5/5 | 13:51 · 14:01 |
| 실측 재현 E2E(관리자 2 + 학생 3 + 한빛고 실명 1 + 학생 화면 보기 1) | **7/7** × 2회 | 13:19 · 14:08 |
| Student Care Playwright(격리) | **21 통과 + 기대 실패 1** × 2회 | 13:24 · 14:12 |
| `scripts/verify-frontend.ps1` (typecheck·oxlint `--deny-warnings`·build) | **PASS** | 14:14 |
| Node 전체 | **147/147** | 14:15 |

- **간헐 실패 (정직 기록)**: 기본 E2E 1·2회차 실패 5건은 모두 관리자 검토·확정 흐름의 시간 초과였다(`a27-ux` '확정 완료' 표시·학생 공개 목록 15초, `a12-flows` 관리자 보완 초안 10초).
  - 실패한 시험은 매번 달랐고, 그 파일만 다시 돌리면 통과했다. 3회차 전체도 60/60이었다.
  - 이번 변경(학생 홈 CSS·학생 자동 확보 화면 대기·학생 화면 보기 읽기 경로·E2E 명단)은 관리자 검토·확정 경로를 바꾸지 않았다.
  - 실행 중 가용 RAM은 1.4~1.7GB였다. **재현되지 않는 간헐 실패로 남기고**, 원인(시간 한도 대비 부하)은 확정하지 않았다.
- 신규 시험: IT +1(학생 화면 보기), Unit +1(E2E 명단), E2E `z2-hanbit-realname.spec.ts` 2건, 실행기 1. 기존 단언 변경은 홈 회색 → 흰색 3곳뿐이다. skip·xfail 추가 0.
- 읽기 전용 확인:
  - PDF만 미리보기(HWP·HWPX 415)와 원본 SHA는 IT·E2E로 확인했다.
  - `local-run`의 `year-query-verified: true`는 1곳 그대로다.
  - 사용자 서비스는 켜지 않았다.

## L6. 보존

- USER DB: 30표 체크섬 동일, Flyway `202611190300`(24건), 학교알리미 원본 0행. 쓰기 0, Migration 신규 0. `V202611180100` 미적용.
- 사용자 8080·5173·5174는 기동하지 않았다. Git 쓰기·Railway 0, staged 0. HWP 6/6, 원본 폴더 68.
- 분석기·HWP 변환기·Student Care 제품 코드 변경 0. Student Care는 시험 실행기만 추가했다.
- **신규 (3)**: `e2e/student-care/run-isolated.mjs`, `e2e/assessment/live-replay/z2-hanbit-realname.spec.ts`, `e2e/assessment/fixtures/e2e-roster-hanbit-paju.json`
- **수정**

  | 영역 | 파일 |
  |---|---|
  | Backend | `AdminStudentViewController`(읽기 경로 3), `DemoRoster`(E2E 추가 명단 설정) |
  | Frontend 학생 | `homeDashboard.module.css`, `dashboard.module.css`, `useOfficialEnsure.ts`(학교 확인 대기 중 15초 확인·상태가 바뀔 때만 다시 읽기) |
  | 시험 | `StudentOfficialPlanApiTest`(+1), `DemoRosterTest`(+1), `a27-student-shell.spec.ts`, `playwright.assessment-live.config.ts`(추가 명단 환경 변수) |
  | 문서 | `api-contract.md` §10-1-3 '부록 L 변경', `domain.md` §30-H, 이 부록 |

## L7. 최종 판정

| 검증 | 근거 | 판정 |
|---|---|---|
| 흰색 홈 | computed `rgb(255,255,255)`, 카드 8종 흰색 + 테두리, 4해상도 가로 넘침 0, 접힘 동일, 다른 화면 불변 | **PASS** |
| 한빛고 실명 | 실측 이름·주소·ID 치환 없음, 합성 학생 학적대로 표시, 다른 후보 0, 학생 먼저 → 관리자 선택 → 자동 갱신 | **PASS** (학생은 합성 FIXTURE) |
| 관리자 학생 화면 보기 | 읽기 전용·원본 목록 일치·ensure 0·외부 0·DB 쓰기 0·담당 밖 404 | **PASS** (읽기 경로 3 최소 추가) |
| Student Care | 격리 포트·일회용 DB, 21 통과 + 기대 실패 1, 8080 사용 0 | **PASS** (기대 실패는 기존 결함) |
| 회귀 | Unit·IT 전체·REPLAY·Frontend·Node 통과, 기본 E2E 3회차 60/60 (1·2회차 간헐 실패 5건) | **PARTIAL** — 간헐 실패 원인 미확정 |
| 보존 | USER DB·포트·Git·원본 폴더·HWP6·분석기 | **PASS** |
| **종합** | | **PASS(요청 4건) · 회귀 PARTIAL(간헐 실패 기록)** |

남은 것:
1. 기본 E2E 관리자 검토·확정 흐름의 간헐 시간 초과(부하 시)는 원인을 확인하지 못했다.
2. Student Care 기존 결함(상담 양식 첫 글자)은 담당자 확인이 필요하다.
3. Student Care 화면 캡처는 남기지 않았다.
4. 분석기 정확도는 범위 밖이다.


---

# 부록 N. 운영 환경 전환 준비 · Assessment 기능 개선 (2026-11-21)

- 지시: `LearnersHigh_A27_UX_AppendixN_References_20261121.zip`
  - 압축 해제 위치: scratchpad `appendixN\`
  - 지시서 236줄, README, 참고 화면 4장, 보고서 2부를 모두 읽었다.
- 작업 위치: `C:\learnershigh-assessment-integration`(branch `integration/assessment-studentcare-20261116`, HEAD `9755581`).
- 하지 않은 일:
  - Git Commit·Push·PR·CI 실행, staged 변경
  - 원본 Worktree, Railway, 분석기(완규), Student Care, HWP/HWPX 변환기 수정
- 증거 폴더: `C:\learnershigh-local-run\appendixN-20261121\`(로그·캡처·JSON).
  - E2E 캡처는 `e2e\test-results\a27n-*.png`이며, 실행할 때마다 다시 만들어진다.
- 표기:
  - **USER DB**: 사용자 DB `lh_local_run`, 실제 화면 5173/5174
  - **EPHEMERAL**: 일회용 MySQL과 E2E 18090/5191/5192
  - **REPLAY**: 저장된 학교알리미 실측 자료로 재현

## N-1. 총괄 판정

| ID | 항목 | 판정 | 근거 요약 |
|---|---|---|---|
| N-01 | 운영 Mock 제거 | **PARTIAL** | 기본 데이터 출처를 HTTP로 바꿨다(개발 서버 포함). Backend 오류가 나도 Mock으로 바꾸지 않는다(E2E). 운영 빌드에 개발용 Header 0. **Backend 인증은 아직 개발용 Header 인증(`integration.mode=mock`)뿐이라 운영 배포 차단** |
| N-02 | 학교 검색 확장(6교) | **PARTIAL** | 6개 검색어를 학교알리미 공식 검색으로 식별했다(동명 2곳). 관리자 화면에서 등록 안 된 학교를 검색·선택하는 기능은 **학교 Master(Open Decision)가 없어 미구현** |
| N-03 | 관리 학생 추가 | **NOT RUN (Blocker)** | CLAUDE.md §1이 '기존 Admin Student / Branch Management' 중복 구현을 금지한다. 기존 LearnersHigh 학생 연동은 Open Decision(API-OD-07)이다 |
| N-04 | 학교알리미 자동 확인 | **PASS(EPHEMERAL·REPLAY) / USER DB 실측 확인** | REPLAY 7/7. USER DB에서는 사용자가 화면으로 실행한 수집 결과를 확인했다(4개 학교·12학년도 기록·원본 116) |
| N-05 | 관리자 학년도 3개 | **PASS** | EPHEMERAL E2E, USER DB 화면 '2026(올해)·2025(작년)·2024(재작년)', 2025 선택 시 문서 49개 |
| N-06 | 삭제 Toast 자동 닫힘 | **PASS(EPHEMERAL)** | 실측 5,036ms 뒤 사라짐. 실패하면 성공 Toast 0, 닫기 버튼, `aria-live=polite`. USER DB에서는 삭제를 하지 않았다(사용자 데이터) |
| N-07 | 간편 검토 | **PARTIAL** | 보기 필터, '먼저 볼 항목', 다음 칸 이동을 구현했다(결정·저장 0). '후보 기본 포함 후 일괄 확정'은 **CONTRACT CHANGE REQUIRED**로 미구현 |
| N-08 | 실제 분석기 | **PASS(연결) / 정확도 결함은 완규님 전달** | `local` 분석기로 연결돼 있다. 가좌고 152건 중 150건 `REVIEW_REQUIRED`/`PARTIAL`, 실패 1건은 과목 0 추출 |
| N-09 | 학생 동명 학교 | **NOT RUN (설계·승인 필요)** | 학생별 열람 대상 학교를 두려면 새 API·DB(Migration)·저장 구조가 필요하다. 설계안은 N-7에 |
| N-10 | 상세 구분선 1개 | **PASS** | 4개 해상도에서 계산된 가로선 1개(E2E) |
| N-11 | 회귀 | **PARTIAL** | Frontend·E2E 전부 통과. Backend IT 3분할 중 1분할이 메모리 부족 강제 중단으로 NOT RUN(N-9) |
| N-12 | 배포 | **staging NOT RUN · production 미실시(차단)** | 저장소에 배포 대상·staging 환경이 없다. 운영 인증 없음 |

## N-2. 현재 데이터 흐름 실측 (N1, 읽기 전용)

| 질문 | 실측 |
|---|---|
| 화면 데이터 출처 | 5173/5174: `start-*.ps1`이 `VITE_ASSESSMENT_DATA_SOURCE=http`로 실행. 사용자 DB 화면 GET 16종 모두 200, Mock 배지 0 |
| Mock 개입 경로 | 학생 `api/dataSource.ts`, 관리자 `api/mock/adminMockRuntime.ts`(데이터 출처 스위치) → 각 `assessmentApi.ts`/`assessmentAdminApi.ts`가 `useMock`으로 Mock Adapter와 HTTP Adapter 중 하나를 고른다. 개발 로그인은 `dev/devContext.ts`(`import.meta.env.DEV`일 때만)와 Backend `MockHeaderAssessmentActorProvider`(`learnershigh.integration.mode=mock`일 때만) |
| Backend 인증 | `application.yml`의 `learnershigh.integration.mode: mock`이 고정이다. 실제 로그인과 기존 LearnersHigh 학생 연동은 Open Decision(API-OD-07, API-OD-A01) |
| 시연 명단 | `ASSESSMENT_DEMO_ROSTER_ENABLED`(기본 false, local-run 스크립트만 true). 학교 15곳×4명 합성 학생(`demo-roster-2026.json`, DB가 아닌 resource 파일) |
| 학교 목록 범위 | `coverage=REGISTERED_PLANS_ONLY`, `masterConnected=false`: 담당 학생 학교와 평가계획서가 있는 학교만 |
| USER DB 학교알리미 | 사용자가 화면에서 실행한 수집이 있다. 매핑 1(가좌고 → **인천광역시 서해구**, 사용자 선택). 학년도 기록 12: 가좌 `PARTIAL`×3, 한림·운정 `COMPLETED`×3, 대신 `SCHOOL_AMBIGUOUS`×3. 원본 116 |
| USER DB 평가계획서 | 가좌 2024 52 / 2025 49 / 2026 51(삭제 2), 한림 20, 운정 20(삭제 2). Flyway `202611190300`(24건), `V202611180100` 미적용 |
| 분석기 경계 | `PlanAnalyzerConfig: plan analyzer: local (ocr=windows)`. 학교알리미 수집 Thread(`schoolinfo-sync`)가 등록 직후 `LocalPlanAnalyzer`를 부른다. Railway·Stub 사용 0 |
| 배포 대상 | 저장소에 앱 Dockerfile·staging/production 설정·배포 Workflow가 없다(`ci.yml`은 검증만, `docker-compose.yml`은 로컬 MySQL) |

## N-3. 참고 화면 4장 Before / After

| 화면 | Before(원본 그대로) | 원인 | After | 바뀐 코드 |
|---|---|---|---|---|
| 01 삭제 Toast | `screens/01-admin-delete-toast.png` | 공용 `Toast`는 3.5초 타이머가 있었다. 그런데 평가계획서 화면이 `onDismiss={() => setToast(null)}`를 매 렌더 새 함수로 넘겼고, 학교알리미 '확인 중' 조회가 화면을 계속 다시 그려서 타이머가 계속 처음부터 다시 시작됐다 | 5초(오류 6초) 뒤 자동 닫힘. 타이머는 메시지 id가 바뀔 때만 건다. 닫기(×), 마우스·Focus 동안 멈춤. `a27n-delete-toast-1600.png` → `-gone-1600.png` | `student/.../components/Toast.tsx`, `Toast.module.css`(관리자도 같은 Component) |
| 02 학년도 | `screens/02-admin-year-dropdown.png` | 학년도 선택지 = 평가계획서가 등록된 해(`listPlanYears`)뿐 | KST 기준 `[Y, Y-1, Y-2]` ∪ 등록 해, 큰 해부터. '(올해)/(작년)/(재작년)' 표시. USER DB `userdb-admin-plans-gajwa-2025-1600.png` | `admin/.../model/schoolInfoSync.ts`(`planYearOptions`, `relativeYearLabel`), `planSchoolContext.ts`, `components/SchoolYearFilters.tsx`, `routes/EvaluationPlansRoute.tsx` |
| 03 학생 동명 학교 | `screens/03-student-school-confirm.png` | 학생 선택 계약이 없다(관리자 `school-selection`만 있음) | **변경 없음**(N-7 설계안·승인 필요) | — |
| 04 구분선 | `screens/04-student-detail-divider.png` | 탐구 노트를 감싼 상세 Section(`detailSections.section`)과 그 안의 `NoteEditor` Section(`.noteSection`)이 둘 다 `border-top` | 바깥 선만 남겼다(`.noteWrap > section { border-top:0; margin-top:0; padding-top:0 }`). `a27n-detail-divider-1600.png` | `student/.../components/detail/detailSections.module.css`, `routes/SchoolAssessmentDetailRoute.tsx` |

## N-4. 관리자 기능 실제 동작

### N-4-1. 삭제 Toast와 학년도
- **삭제 Toast**(EPHEMERAL `[N5-2·N5-1]`):
  - 삭제 성공 뒤 5,036ms에 사라졌다(기준 4초 이상, 9초 이내).
  - DELETE가 500이면 대화상자 안에 '삭제하지 못했어요'가 뜨고 성공 Toast는 0개다.
  - 800px 폭에서 가로 넘침 0.
- **학년도**(EPHEMERAL 같은 시험):
  - 문서가 2026에만 있어도 선택지는 2026·2025·2024다.
  - 2024를 고르면 URL에 `year=2024`, `school=school_001`이 유지되고 6칸이 보인다. 새로고침해도 2024가 유지된다.
  - 연도 경계(2026-12-31 15:30 UTC → 2027 기준)는 Node 시험으로 확인했다.
  - 3개년 수집 요약(18구간)은 그대로 별도 표시다.
- **USER DB 가좌고:**
  - 학년도 선택지는 `2026학년도 (올해)`, `2025학년도 (작년)`, `2024학년도 (재작년)`이다.
  - 2025를 고르면 문서 49개(`userdb-admin-plans-gajwa-2025-1600.png`)가 보인다.
  - 이 확인에서 자동 수집 POST 2건은 안전장치로 막았다. 그래서 캡처의 '자동 확인 실패' 문구는 차단 때문이다.

### N-4-2. 간편 검토 (N5-3)

**상태를 서로 구분한다:**

| 상태 | 뜻 | 누가 만드나 |
|---|---|---|
| AI 후보(기본 표시) | 분석기가 뽑은 값. 처음부터 모두 화면에 보인다 | 분석기 |
| 미확인 | 관리자가 아직 고르지 않음 | — |
| 확인·수정함 / 원문에 없음 | 관리자가 값마다 고른 결정(서버 초안에 저장) | 관리자 클릭 |
| 확정 | §39 PUT review(원문 대조 확인, 해시 일치, 근거 쪽 등 기존 조건 그대로) | 관리자 '최종 확정' |
| 학생 공개 | 확정된 값만 | 서버 |

**구현한 것(화면만, 서버 계약 변경 0):**
- 수행평가 단계에 문서 전체 보기 필터를 넣었다: '전체 N · 먼저 볼 항목 N · 미확인 N · 확인·수정함 N · 원문에 없음 N'.
- '먼저 볼 항목'은 미확인 값 중 '값 없음'이나 '근거 없음'인 것이다. 분석 결과에 있는 정보만 쓰고 추정하지 않는다.
- 그런 필드에는 '먼저 확인 · 값 없음 · 근거 없음' 표시를 붙였다.
- 지금 칸에 해당 항목이 없으면 '다음 먼저 볼 칸으로' 버튼이 그 과목·수행평가를 연다.

**계량:**
- USER DB 가좌고 2026 고1 1학기 문서: 전체 39 중 먼저 볼 항목 10. 처음 확인 대상을 74% 줄였다.
- 나머지 29개도 확정 전 대조는 여전히 필요하다.

**검증:** EPHEMERAL `[N5-3]`에서 필터를 눌러도 '확인·수정함 0'이 유지됐다. 검토 초안·확정 쓰기 요청 0, 일괄 승인 버튼 0.

**CONTRACT CHANGE REQUIRED(미구현):**
- '후보를 그대로 둔 채 한 번에 확정'은 A27의 '후보 그대로 일괄 확인 미채택' 정책과 §39 확정 조건(값마다 근거 쪽)을 완화해야 한다. 그래서 만들지 않았다.
- 필요하면 다음 두 가지를 계약으로 합의해야 한다:
  - '변경·제외 내역 요약 + 단일 최종 확인' 요청 모양
  - 후보 값의 근거 쪽을 서버가 채우는 규칙

### N-4-3. 가좌고 분석기 연결 (N5-4, 읽기 전용)
- **연결 경로:**
  - 학교알리미 수집(`SchoolInfoSyncService`, Thread `schoolinfo-sync`) → 분석 대기열 → `LocalPlanAnalyzer`.
  - 로그 예: `plan extract done format=HWP tables=76 subjects=6 elapsedMs=693`.
  - 실행 기록 `assessment_plan_analysis_run`: 분석기 `learnershigh-plan-extract`, profile `rules-0.3`, origin `SERVER_ANALYZER`.
  - 원본 저장 위치: `ASSESSMENT_STORAGE_ROOT=…\local-run-storage`. 저장 경로가 틀려 생겼던 409 `FILE_INTEGRITY_FAILED`는 2026-11-21 복구 보고서에서 고쳤다.
- **가좌고 상태:**

  | 학년도 | REVIEW_REQUIRED | PARTIAL | FAILED |
  |---|---|---|---|
  | 2026 | 47 | 2 | 0 |
  | 2025 | 48 | 0 | 1 |
  | 2024 | 52 | 0 | 0 |

  - PARTIAL 2건은 예전 원격 분석기(`curriculum-analysis v21.10-b16-dev`, 2026-11-12) 결과다.
- **FAILED 1건:** `(가좌고등학교-11831) 2025학년도 2학기 고시외 교과목 교수학습 및 평가 운영 계획.hwp`
  - HWP, 927,744B, SHA `b3722446feb4…`
  - 로그: `tables=27 subjects=0 elapsedMs=54`. 표는 읽었지만 과목을 0개 찾았다 → **분석 알고리즘 정확도 문제**.
  - 고시외(학교 자체 개설) 과목명 인식으로 보인다. 원인 추정은 완규님 확인이 필요하다.
  - 한림고 HWPX 3건도 같은 FAILED다.
  - **소스를 바꾸지 않았고 재분석도 하지 않았다.**
- **결론:** '분석이 진행되지 않음'은 연결 문제가 아니다. 연결·저장 경로·분석기 모드는 정상이다.
  - 문서 수가 많아(가좌고 3개년 152건) 수집 직후 '분석 중/대기'가 보이는 시간이 있다.
  - 과목 0인 문서는 FAILED가 된다.
  - 그 밖에 화면에서 재현되는 멈춤이 있으면 해당 문서 이름을 알려 주시면 추적하겠다.

## N-5. 6개 학교 식별 (N3)

- 방법: 공식 학교알리미(`SchoolInfoClient.search`/`describe`, 기존 Adapter 그대로)로 **학교 검색·상세만** 조회했다.
- 평가계획서 파일 다운로드 0, DB 쓰기 0. 원자료: scratchpad `schoolid\six-schools.tsv`.

| 입력 | 정식 학교명 | 시도/시군구 | 주소 | 학교알리미 ID | 동명 후보 | 선택 상태 | 합성 학생 | 2026·2025·2024 공시 | 원본 표시 |
|---|---|---|---|---|---|---|---|---|---|
| 서강고 | 서강고등학교 | 전남광주통합특별시 북구 | 서강로 1 | `0ba67f00-…2892` | 1 | 단일 | 없음 | 미조회 | — |
| 한영고 | 한영고등학교 | 서울 강동구 / 전남광주통합특별시 여수시 | 동남로 832 / 장군산길 18-43 | `b0e4de76-…` / `6e91a80c-…` | **2** | 관리자 선택 필요 | 없음 | 미조회 | — |
| 현일고 | 현일고등학교 | 경북 구미시 | 고아읍 선산대로 656 | `88b88a87-…` | 1 | 단일 | 없음 | 미조회 | — |
| 김천고 | 김천고등학교 | 경북 김천시 | 송설로 90 | `e881c7b4-…` | 1 | 단일 | 없음 | 미조회 | — |
| 보라고 | 보라고등학교 | 경기 용인시(기흥구) | 한보라1로43번길 7 | `499aa21f-…` | 1 | 단일 | 없음 | 미조회 | — |
| 한솔고 | 한솔고등학교 | 세종 / 경기 성남시(분당구) | 누리로 34 / 내정로 70 | `efb9924c-…` / `0925c336-…` | **2** | 관리자 선택 필요 | 시연 명단 `sch_demo_hansol` 4명(합성, resource 파일) | 미조회 | — |

- 서강고와 한영고(여수)의 시도는 학교알리미 주소 그대로 '전남광주통합특별시'다.
- 세종 한솔고는 시군구가 없어 `sigungu=null`이다. 기존 선택 창은 주소만 있으면 고를 수 있지만, **세종 후보 선택은 E2E로 확인하지 않았다**.
- **6개 학교 3개년 공시 실측(파일 다운로드)은 하지 않았다.** 지시서 '대량 다운로드 무조건 금지'와 승인 범위 때문이다.
  - 실행하려면 학교당 3개 학년도 × 4월·9월(최대 6회 조회와 첨부 다운로드)이 필요하다.
  - 이 실측은 사용자 승인을 받은 뒤 관리자 화면에서 학교를 선택해 시작해야 한다.
- 서강·한영·현일·김천·보라는 시스템 학교 ID(학교 Master·학생 학적)가 없어 관리자 화면에서 고를 수 없다(N-8 Blocker).

## N-6. Runtime Mock 제거와 남긴 시험 자료 (N2)

**바꾼 것:**
- 학생 `dataSource.ts`와 관리자 `adminMockRuntime.ts`: 값이 없으면 개발 서버에서도 `http`.
- `mock`은 개발 서버에서 명시할 때만 쓴다. Production Build는 `mock`을 지정해도 `http`다.
- 명세 `assessment-frontend-mock.md` §3에 변경을 기록했다.

**확인:**
- E2E `[N2]`: 관리자 학교 목록 500, 학생 학적 500이어도 Mock 대체 0, 시연 배지 0, 학생 오류 문구 표시.
- 운영 빌드(`verify-frontend`가 만든 `dist`) 정적 검사(`prod-bundle-scan.txt`):
  - `X-Assessment-Student-Id`·`X-Assessment-Admin-Id`·`devStudent`·`stu_demo_`·`adm_plan_operator`·`/api/test/`·`/e2e/reset` → 0개 파일.
  - `mockScenario`·'시연 데이터' 문구는 학생 1개, 관리자 1~2개 파일에 남아 있다. Mock Adapter 코드가 번들에 들어 있지만 `DEV=false`라 실행되지 않는다. **완전 제거(코드 분리)는 하지 않았다.**

**남긴 시험 자료(삭제 0):**
- Frontend Mock Adapter·Canonical Fixture(개발·Node 시험용)
- E2E `fixtures/`, `loopback-stub`
- `E2eTestSupport`(`@Profile("e2e")`)
- `DemoRoster`(`integration.mode=mock` AND 시연 명단 켬)
- REPLAY 자료

**USER DB의 `sch_demo_*`:**
- 평가계획서 행은 사용자가 학교알리미에서 수집했거나 직접 올린 **실제 공개 원본**이다. 합성 데이터가 아니다.
- 학생 `stu_demo_*`는 DB가 아니라 resource 파일(시연 명단)에 있다.
- 그래서 정리(삭제) 대상 dry run은 0건이다. 정리 SQL을 만들지 않았다.

## N-7. 학생 동명 학교 선택 — 설계안 (N6, 승인 필요)

**막힌 이유:**
- 공식 원본은 '시스템 학교 ID ↔ 학교알리미 학교' 매핑 한 개(관리자 선택, `assessment_schoolinfo_school_mapping`)에 묶여 저장·공유된다.
- 학생 선택으로 이 매핑을 정하면, 잘못 고른 경우 같은 학교 다른 학생에게도 다른 학교 원본이 보인다. 지시서 N6이 금지한 '학생 선택으로 조직 단위 매핑 변경'이 된다.
- 학생별 열람 대상을 따로 두려면 새 저장 구조(학교알리미 학교 ID 기준 원본 공유)와 새 표(학생 열람 선택)가 필요하다.

**최소 설계(제안):**
1. `GET /api/student/assessment/evaluation-plans/official/school-candidates`
   - 서버가 이미 검증한 동명 후보만 돌려준다(`candidateId`=서버 발급 불투명 ID, 학교명, 시도, 시군구, 주소).
   - 검색이 잘렸거나 주소가 없으면 후보를 비우고 사유를 준다.
2. `PUT …/official/view-selection { candidateId }`
   - 학생 본인의 '열람 대상'만 저장한다(새 표 `assessment_student_official_view`: studentId, schoolId, schoolinfoId, selectedAt).
   - 학적·관리자 매핑은 바꾸지 않는다. 다시 고르기와 철회(DELETE)를 지원한다. 감사 기록을 남기고, 조회 남용 상한(분당 N회)을 둔다.
3. 원본 저장 키를 `schoolinfoId` 단위로 공유한다. 같은 후보를 고른 학생과 관리자 매핑이 같은 다운로드를 다시 쓴다(학생마다 재다운로드 0).
4. 학생 화면 표시 규칙:
   - 관리자 매핑이 있으면 그것을 우선한다.
   - 매핑이 없고 학생 열람 선택만 있으면 원본만 보이고 '학교 확인 전(선생님 확인 필요)'을 표시한다.
   - 확정 평가 정보는 관리자 매핑과 학적이 일치할 때만 보인다.

**필요한 승인:**
- `api-contract.md`·`domain.md` 변경
- Flyway 새 Migration(USER DB 적용은 별도 승인)
- 기존 slot-link 저장 구조 변경 범위

## N-8. 배포 (N8)

| Gate | 결과 |
|---|---|
| A 소스·계약 | 이번 변경은 화면·명세 문서만 바꿨다. API·DB·Backend 코드 변경 0, 다른 담당자 영역 변경 0 |
| B 빌드·시험 | **PARTIAL** — Backend IT 일부 NOT RUN(메모리), 나머지 PASS(N-9) |
| C staging | **NOT RUN — 대상 없음.** 저장소에 staging 서비스·URL·배포 설정이 없다. 새로 만들거나 Railway를 덮어쓰지 않았다 |
| D production | **미실시 — 차단.** ① 실제 인증 없음(개발용 Header 인증만, `integration.mode=mock` 고정) ② 기존 LearnersHigh 학생·학교 연동 없음(API-OD-07) ③ 배포 대상·승인자·롤백 계획 미정 |

**배포 준비 체크리스트(값 비노출):**
- Backend 환경 변수 이름:
  - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
  - `ASSESSMENT_STORAGE_ROOT`
  - `ASSESSMENT_ANALYZER_MODE`(기본 `local`), `ASSESSMENT_ANALYZER_OCR`
  - `ASSESSMENT_PREVIEW_CONVERTER`(+`_AUTO_PROVISION`, 운영은 false와 미리 만든 이미지 권장)
  - `ASSESSMENT_DEMO_ROSTER_ENABLED`(운영 false)
- 학교알리미 `year-query-verified`: `local-run`만 true다. 다른 환경에 복제하지 않았다.
- Frontend: `VITE_ASSESSMENT_DATA_SOURCE` 생략(= http), `VITE_ASSESSMENT_DEV_*` 미설정.
- Flyway: 운영 적용 전 백업과 dry run이 필요하다. `V202611180100` 금지.
- 롤백: 이전 빌드 Artifact와 DB 백업 복원(일회용 DB에서 복원 검증한 절차 재사용).

## N-9. 시험 (이번 실행 수치만)

| 시험 | 결과 | 로그 |
|---|---|---|
| `scripts/verify-frontend.ps1`(typecheck·oxlint·build) | PASS | `verify-frontend.log` |
| Node 시험 전체 | 150/150 | — |
| 부록 N E2E `a27n-ui`(EPHEMERAL) | 1회차 3/4: 연도 시험의 `goBack`이 replaceState 주소에서 `about:blank`로 가는 **시험 코드 결함**이었다. 시험을 새로고침 확인으로 고친 뒤 2회차 4/4. '다음 칸 이동' 확인을 더한 최종 3회차 4/4(Toast 5,068ms) | `e2e-a27n-1~3.log` |
| Assessment 기본 E2E 전체(EPHEMERAL) | **64/64 1회차 통과**(간헐 실패 0, 6.4분) | `e2e-full-1.log` |
| REPLAY E2E(부록 L manifest SHA `1802759c…`) | 7/7(3.1분) | `e2e-replay.log` |
| Student Care 격리 E2E | 22/22 | `e2e-studentcare.log` |
| Backend 단위 | 446건(실패 0, skip 3). **Gradle up-to-date 재사용**(Backend 코드 변경 없음) | `backend-unit.log` |
| Backend MySQL IT(45개 클래스, 3분할, 저메모리) | **PARTIAL** — 1·2분할 29개 클래스 110건 통과(실패 0)였다(1분할 15/15 클래스 45건, 2분할 14/15 클래스 65건, 빠진 `SchoolInfoFakeSupport`는 시험 보조 클래스로 결과 파일 없음). 3분할(15개 클래스)은 시스템 메모리 부족으로 Claude Code가 백그라운드 작업을 강제 중단했다. 남은 Gradle 시험 JVM(이 작업 소유, 약 740MB)은 사용자 서버 보호를 위해 종료했고, 다시 실행하지 않았다(**NOT RUN**). Backend 코드 변경은 없다 | `it-0*.summary` |
| 사용자 DB 화면(HTTP, 쓰기 차단) | GET 16종 모두 200, Mock 배지 0, 학년도 3개, 검토 필터 표시. 차단: 관리자 자동 수집 POST 2, 학생 ensure 1 | `userdb-n-check.json`, `userdb-*.png` |

## N-10. 보존

- USER DB:
  - 이 작업의 접근은 SELECT와 GET(쓰기 차단)뿐이다. INSERT/UPDATE/DELETE·Migration·시드 0.
  - Flyway `202611190300`(24건).
  - 사용자가 화면에서 계속 수집 중이라 전후 체크섬 비교는 의미가 없어 하지 않았다.
- 서버:
  - 8080(java 20340), 5173(node 25636), 5174(node 45748)를 재시작하지 않았다.
  - Frontend 변경은 Vite hot reload로 반영됐다(사용자 DB 화면에서 확인).
- Git: staged 0, Commit 0.

**이번 부록 N에서 바꾼 파일:**
- 학생:
  - `frontend/student/src/features/assessment/components/Toast.tsx`, `Toast.module.css`
  - `api/dataSource.ts`
  - `components/detail/detailSections.module.css`
  - `routes/SchoolAssessmentDetailRoute.tsx`
- 관리자:
  - `frontend/admin/src/features/assessment/api/mock/adminMockRuntime.ts`
  - `model/schoolInfoSync.ts`(+`.test.mjs`)
  - `model/planSchoolContext.ts`
  - `components/SchoolYearFilters.tsx`
  - `routes/EvaluationPlansRoute.tsx`
  - `review/PerformanceStep.tsx`, `review/reviewFilter.ts`(+`.test.mjs`), `review/review.module.css`
- 시험: `e2e/assessment/tests/a27n-ui.spec.ts`(신규)
- 문서: `docs/specs/suyeon/assessment-frontend-mock.md` §3, 이 부록

## N-11. 남은 Blocker · 필요한 승인

1. **운영 인증·기존 LearnersHigh 연동(API-OD-07·API-OD-A01)**: production 배포와 관리자 학생 추가의 전제다. 팀 결정이 필요하다.
2. **학교 Master**: 평가계획서가 없는 학교(서강·한영·현일·김천·보라) 검색·선택. 기존 Master·NEIS 연동 여부를 결정해야 한다.
3. **학생 동명 학교 열람 선택(N-7)**: API·domain·Migration 승인이 필요하다.
4. **간편 검토 일괄 확정**: §39 확정 조건 변경 합의(CONTRACT CHANGE REQUIRED)가 필요하다.
5. **staging 환경**: 대상(서비스·URL·DB·Storage·비밀값 관리)과 권한을 지정해야 한다.
6. **분석 정확도**(완규님): 고시외 과목 HWP 과목 0(가좌 2025), 한림 HWPX 3건 실패.
7. **6개 학교 3개년 공시 실측**: 다운로드 승인이 필요하다(학교당 최대 6회 조회).
8. **Backend IT 3분할(15개 클래스) 재실행**: 메모리 여유가 있을 때(사용자 서버 3개를 끄거나 다른 PC) 다시 돌려야 한다.
9. **USER DB 가좌고 매핑이 인천광역시 서해구다.**
   - 사용자가 직접 선택했고 수집 문서도 이 학교 기준이다.
   - 이전 부록 J~L 시험은 경기 고양 가좌고였다. 의도한 학교인지 확인이 필요하다.


---

# 부록 O. Assessment 기능 완성도 개선 (2026-11-21)

- 지시: `LearnersHigh_A27_UX_AppendixO_FirstExecution_AssessmentOnly_ClaudeCode_20261121.md`(258줄, 전부 읽음). 부록 N 최종 상태에서 처음 시작했다.
- 1팀 연동·인증·배포·인계 문서는 만들지 않았다.
- 증거 폴더: `C:\learnershigh-local-run\appendixO-20261121\`
- 표기:
  - **EPHEMERAL**: 일회용 MySQL(Testcontainers·E2E 33340·실측 33350)
  - **USER DB**: `lh_local_run`
  - **LIVE**: 공식 학교알리미 실측

## O-1. 기능 판정

| 기능 | 판정 | 증거 |
|---|---|---|
| 관리자 학교 검색·선택(§38-15, 평가계획서 0건 학교) | **PASS(EPHEMERAL·LIVE)** | IT 4건 통과(0건 학교 → 18구간, 잘림·주소 없음·같은 주소·위조·연결 실패 502, 기존 매핑 재사용). E2E O-1 2/2. LIVE: 서강·현일·김천·보라를 검색 → 선택 → 3개년 수집 |
| 학생 개인 동명 학교 열람 선택(§38-16, 새 표 2개) | **PASS(EPHEMERAL)** / USER DB 미적용 | IT 2건 통과(학생 2명 독립, 다른 학교 원본 404, 같은 학교 재다운로드 0, 위조·오래된 version 409, 철회, 관리자 매핑 우선). E2E O-2 1/1(시연 명단 합성 학생, 가상 주소) |
| 한 번에 확정(§39-13) | **PASS(EPHEMERAL)** | IT(초안 version 다름 → 409 확정 0건, 근거 쪽 없음 거절, 최신이면 확정·학생 공개). E2E O-3: 먼저 볼 항목만 고치고 1회 클릭 → 확정 요청 1건, 관리자 수정값 보존, 재확정 409 |
| 현재 학기 서버화(§9-2) | **PASS** | 단위(경계: 3월·8월·9월·1~2월·KST/UTC 경계). E2E 설정에서 `VITE_ASSESSMENT_DEV_CURRENT_TERM` 제거 뒤 E2E 통과 |
| 운영 Profile 개발 Header 거부 | **PASS(단위)** | `prod`·`production`·`staging` → 401, `local-run` 허용 |
| 학교알리미 학년도 조회 기본 true | **PASS** | 기본 Profile LIVE 실측에서 `year-query-verified=true`. 파일별 연도 불일치 보류 유지(김천고 YEAR_MISMATCH 3건) |
| 실측에서 찾은 결함 수정: ZIP 첨부 번호 길이 | **PASS** | `attachment_seq` VARCHAR(40) → 300(V202611210200). 재현 IT 통과. 김천고 FAILED×3 → 수정 후 18/18 |
| 운영 번들 Mock 제거 | **PARTIAL** | 개발 인증 Header·시연 ID·시험 Endpoint 0. Mock 문구가 남아 있어 학생 데이터 출처를 빌드 상수식으로 바꿨으나 **재빌드 검사는 메모리 부족으로 미실행** |
| Backend IT 3배치 | **PARTIAL** | 44개 클래스 → 15/15/14, 합집합=전체, 교집합 0. 1배치 15개 클래스 76건 통과. 2·3배치는 메모리 부족 강제 중단으로 **NOT RUN**(신규·변경 IT 클래스는 따로 실행해 통과) |

## O-2. 구현

**학교 검색 (§38-15)**
- `GET /api/admin/assessment/schools/directory?query=`, `POST …/directory/selection {candidateId}`
- 기존 `SchoolInfoClient` 검색·상세만 쓴다. 학적·학생·전역 Master는 만들지 않는다.
- 학교 키: 같은 학교알리미 학교를 쓰는 매핑이 있으면 그 키를 재사용한다(인천 가좌고 = `sch_demo_gajwa`). 없으면 `si_<ID>`.
- 화면: 평가계획서 탭의 '학교 검색' 패널(지역·주소·고를 수 없는 이유 표시). 고르면 그 학교·올해로 이동한다.

**학생 열람 선택 (§38-16)**
- `GET …/official/school-candidates`, `PUT|DELETE …/official/view-selection`
- 원본 조회·내려받기·ensure는 요청마다 '학적 학교 → (관리자 매핑 없음 + 동명 + 본인 선택) 열람 학교'로 다시 계산한다.
- 화면: 공식 원본 안내 아래 '지역·주소로 우리 학교 고르기' Modal. 고른 뒤에는 '고른 학교 바꾸기'와 '선생님 확인 전' 표시가 나온다. 관리자 '학생 화면 보기'에서는 숨긴다.

**한 번에 확정 (§39-13)**
- `PUT …/review`에 선택 필드 `expectedDraftVersion`·`bulk`를 더했다.
- 화면 '검증 가능한 후보 한 번에 확정' 패널: 확정될 값, 기본 포함, 수정, 원문에 없음, 먼저 해결할 항목, 원본 SHA를 보여 준다.
- 값·근거가 없는 항목이 남아 있거나 기존 확정 조건(원문 대조·확인)이 안 맞으면 버튼을 막고 이유를 보여 준다.

**현재 학기 (§9-2)**
- `GET /api/{student|admin}/assessment/current-term`
- 서버 응답이 없으면 화면이 같은 규칙의 KST 달력 값을 쓴다.

**Migration(추가·비파괴, 일회용 DB에서만 적용)**
- `V202611210100`(학생 열람 선택 + 감사 기록 표)
- `V202611210200`(첨부 번호 열 확장)

**작업 중 IT가 찾은 결함과 수정**
- 같은 시각(고정 시계)에 학생 선택·철회 감사 기록 순서가 뒤바뀌었다. 같은 학생의 다음 기록은 1µs 뒤가 되게 고쳤고, 이후 2회 반복 통과했다.

**계약·도메인 문서:** `api-contract.md` §9-2·§38-15·§38-16·§39-13, `domain.md` §30-I

## O-3. 6개 학교 LIVE 실측

- 일회용 DB와 별도 Backend(18190, 기본 Profile)를 공식 학교알리미에 붙였다. 요청 간격 1초, 분석기 `local`(OCR 끔).
- 공개 공시·첨부만 받았다. 외부 AI·Railway 전송 0.
- 원자료: `six-live-report.json`, `two-live-report.json`, 원본 `live-storage*\`.

| 입력 | 정식 이름·지역·주소 | 학교알리미 ID | 동명 | 결과 | 3개년 | 18구간 | 원본(확인·보류) |
|---|---|---|---|---|---|---|---|
| 서강고 | 서강고등학교 · 전남광주통합특별시 북구 · 서강로 1 | `0ba67f00…` | 1 | 선택 | 2026·2025·2024 COMPLETED | **18/18** | 21개: 평가계획 18, 학업성적관리규정 3(NOT_PLAN) |
| 한영고 | 서울 강동구 동남로 832 / 여수 장군산길 18-43 | `b0e4de76…` / `6e91a80c…` | **2** | **IDENTITY_PENDING** | — | — | 지역 근거가 없어 고르지 않음 |
| 현일고 | 현일고등학교 · 경북 구미시 · 고아읍 선산대로 656 | `88b88a87…` | 1 | 선택 | PARTIAL ×3 | **18/18**(1차 실행 2026 FAILED → 수정 후) | 85개, 등록 76. 공동교육과정 등 GRADE_SCOPE_CONFLICT 보류 |
| 김천고 | 김천고등학교 · 경북 김천시 · 송설로 90 | `e881c7b4…` | 1 | 선택 | 2026·2025 PARTIAL, 2024 COMPLETED | **18/18**(1차 실행 FAILED ×3 → 수정 후) | 371개, 등록 367. 다른 학년도 파일 YEAR_MISMATCH 3, 미지원 형식 1 |
| 보라고 | 보라고등학교 · 경기 용인시(기흥구) · 한보라1로43번길 7 | `499aa21f…` | 1 | 선택 | 2026 COMPLETED, 2025·2024 PARTIAL | **18/18** | 42개, 등록 38. 교과군 합본 다학년 GRADE_SCOPE_CONFLICT 보류 |
| 한솔고 | 세종 누리로 34 / 성남 분당구 내정로 70 | `efb9924c…` / `0925c336…` | **2** | **IDENTITY_PENDING** | — | — | 지역 근거가 없어 고르지 않음 |

- 18구간은 파일 수가 아니다. 칸마다 여러 문서가 있다(김천고는 칸당 11~30개).
- 보류 문서는 등록하지 않고 '분류 확인 필요'로 남는다.
- 시도 표기는 학교알리미 원문 그대로다(예: '전남광주통합특별시').
- **REPLAY 매니페스트로 만들지는 않았다**(원본은 보관함). USER DB에는 등록하지 않았다.

## O-4. 실제 화면

**EPHEMERAL**(`e2e-screens\`)
- 학생 동명 선택 전·후: `a27o-student-same-name-before/after-1600` 보관
- 학교 검색·한 번에 확정 캡처는 E2E 실행 때 만들어졌으나 다음 E2E 실행이 `test-results`를 비워 **보관하지 못했다**(시험 단언은 통과)
- 800/1366/1600/1920에서 가로 넘침 0(시험 단언)

**USER DB**(읽기 전용, 쓰기 요청 차단, `userdb\`)
- Mock 배지 0, 학년도 3개, 검토 필터 동작.
- 학생 홈: 인천 가좌고 2026 고1 2학기 원본 8개.
- 8080은 옛 코드라 `current-term`이 404다. 화면은 KST 달력 값으로 대체돼 학적 조회 200을 확인했다.
- 학교 검색·학생 선택·한 번에 확정은 **8080 재시작 전에는 USER 화면에서 동작하지 않는다**(아래 O-8).

## O-5. 시험 (이번 실행)

| 시험 | 결과 |
|---|---|
| `verify-frontend` | PASS |
| Node | PASS(전체) |
| Backend 단위 + ArchUnit | 448건(실패 0, skip 3), `--rerun` |
| 신규·변경 IT | `SchoolDirectoryOfficialViewApiTest` 6/6(감사 순서 수정 전 1회 실패 → 수정 후 2회 연속 통과), `PlanReviewDraftApiTest` 8/8 |
| IT 3배치 | 1배치 15클래스·76건 통과. 2·3배치 **NOT RUN**(메모리 부족 강제 중단, 남은 JVM 정리) |
| 부록 O E2E | `a27o-ui` 3/3(1회차는 시험 코드 locator 결함으로 1 실패 → 수정 후 통과), 학생 동명 1/1(1회차 응답 필드명 시험 결함 → 수정 후 통과) |
| Assessment 기본 E2E 전체 · REPLAY 전체 · Student Care | 이번 회귀에서 **NOT RUN**(같은 강제 중단). 부록 N 수치(64/7/22)는 이번 결과가 아니다 |

## O-6. 설정 정리

| 설정 | 이전 | 지금 | 근거 |
|---|---|---|---|
| `VITE_ASSESSMENT_DATA_SOURCE` | 없으면 Mock | 생략 = http(운영 빌드는 늘 http) | 부록 N, E2E·스크립트에서 제거 |
| `VITE_API_TARGET` | 스크립트에서 지정 | 생략 = 개발 Proxy `localhost:8080` | 스크립트에서 제거 |
| `VITE_ASSESSMENT_DEV_CURRENT_TERM` | 학생 필수(C-2 오류) | **삭제**, 서버 `current-term` | 단위·E2E |
| `assessment.schoolinfo.year-query-verified` | 기본 false = 모든 파일 보류 | **기본 true**, false = 긴급 차단 | 부록 H~K 실측 + 파일별 연도 검증 유지 |
| `VITE_ASSESSMENT_DEV_ADMIN_ID`·`_STUDENT_ID` | 유지 | 유지(개발 인증 ID, 운영 빌드에서는 무시) | 실제 인증은 1팀 |
| `ASSESSMENT_DEMO_ROSTER_ENABLED` | 기본 false | 유지 | 로컬 시연 전용 |
| `DB_URL/USERNAME/PASSWORD`, `ASSESSMENT_STORAGE_ROOT` | 필수 | 필수(비밀·환경 값) | — |
| 개발 Header 인증 | 모든 Profile | `prod`·`production`·`staging`에서 거부 | 단위 |

- 로컬 실행 스크립트(`start-admin/student.ps1`)에서 위 세 변수를 지웠다. 원본은 `*.before-appendixO`.
- 테스트 Fixture·Mock Adapter 코드는 삭제하지 않았다.

## O-7. 보존

- **USER DB:** 읽기만 했다.
  - Flyway `202611190300`(24건) 그대로, 새 표 0.
  - 인천 가좌고 매핑(인천광역시 서해구, version 1) 불변.
  - 학교알리미 원본 116개 불변.
- **Git:** staged 0, Commit 0, HEAD `9755581`.
- **변경 없음:** 분석기·Student Care·HWP 변환기·원본 Worktree.
- **서버:** 8080(20340)·5173(25636)·5174(45748)를 재시작하지 않았다. Frontend 변경은 자동 반영됐다.

## O-8. 남은 Assessment 문제

1. **USER 화면에서 새 기능을 쓰려면 8080 재시작이 필요하다.**
   - 재시작하면 Flyway가 `V202611210100`·`V202611210200`을 USER DB에 자동 적용한다(새 표 2개 + 열 확장, 데이터 삭제 0).
   - 백업 후 적용 승인이 필요하다.
2. **회귀 미완료:** IT 2·3배치(29개 클래스), Assessment E2E 전체, REPLAY 전체, Student Care, 운영 번들 재검사.
   - 사용자 서버를 끄거나 메모리 여유가 있을 때 `run-all.sh`로 다시 실행해야 한다.
3. **한영고·한솔고:** 지역 근거(학적·관리자 선택)가 없어 IDENTITY_PENDING이다.
4. **보류 원본 처리:** 교과군 합본·공동교육과정처럼 일부 학년만 언급한 문서는 GRADE_SCOPE_CONFLICT 보류다(보라고 2024·2025, 현일고). 관리자 수동 분류(§38-14)로 처리해야 한다.
5. **한 번에 확정의 표시:** `bulk` 표시는 별도 열로 저장하지 않는다. 확정 기록은 개별 확정과 같다.
6. **분석 정확도(완규님):** 가좌고 2025 고시외 HWP 과목 0, 한림 HWPX 실패 — 변경 없음.


---

# 부록 P. 메모리/디스크 정리 및 전체 회귀 재검증 (2026-11-21)

- 지시: `LearnersHigh_A27_UX_AppendixP_SafeCleanup_FullRegression_ClaudeCode_20261121.md`(225줄, 전부 읽음)
- 증거: `C:\learnershigh-local-run\appendixP-20261121\`
  - `measure-*.txt`, `docker-*.txt`, `folders-size-before.tsv`, `backup-dup.txt`, `cleanup-plan.md`, `steps.txt`
  - 시험 로그·JUnit XML(`unit-results\`, `it-1~3-results\`)
  - 캡처 `screens\`
- 하지 않은 일: Git Commit·Push, 배포, 사용자 서버 재시작, 사용자 DB Migration 적용

## P-1. 백업 폴더와 메모리 부족의 관계 (측정 결론)

**백업 폴더는 RAM 부족의 원인이 아니다.**
- 백업 폴더는 디스크 파일이라 실행 중 메모리를 차지하지 않는다.
- 백업 20개를 합쳐도 약 0.43GB이고, 정리 전 C: 여유는 95.9GB였다. 디스크 부족도 없다.

**정리 전 메모리 측정** (11:57)
- 물리 RAM 15.57GB 중 가용 1.68GB, 확보(Committed) 35.75GB / 한도 55.57GB
- 페이지 파일 사용 4.4GB(최대 7.6GB)
- 프로세스별 확보 메모리:

| 프로세스 | 확보 메모리 |
|---|---:|
| Chrome ×20 | 6.77GB |
| Docker WSL VM(vmmemWSL) | 2.93GB |
| explorer | 2.51GB |
| Claude ×4 | 2.12GB |
| Notion ×10 | 1.60GB |
| 사용자 서버 Java ×3 | 1.45GB |
| CCleaner | 1.37GB |
| Node ×5 | 0.79GB |
| MySQL | 0.60GB |

**부록 O 회귀가 끊긴 직접 원인**
- 시험 자체의 메모리 부족 오류가 아니었다.
- 시스템 가용 메모리가 낮을 때 Claude Code가 **대기 중인 백그라운드 명령을 강제 종료**한 것이다(알림: "stopped because the system is running low on memory while the session was idle").
- 종료 뒤에도 남은 Gradle 시험 JVM(약 0.7GB)이 메모리를 더 압박했다.

**부록 F에서 본 원인(Testcontainers MySQL 누적)의 재검증**
- 이번에는 재발하지 않았다.
- 배치 시작마다 실행 중 컨테이너는 사용자 MySQL 1개였다. 배치가 끝나면 시험 MySQL과 ryuk가 정리됐다.
- `JAVA_TOOL_OPTIONS=-Dspring.test.context.cache.maxSize=2`, `--no-daemon --max-workers=1`이 적용됐다(실행 스크립트·로그 기준).

## P-2. 정리 (삭제 vs 보존)

**삭제(정확한 경로만)**

| 대상 | 크기 | 근거 |
|---|---:|---|
| `%TEMP%\lh-e2e-assessment-storage` | 2.42GB · 3,647개 | E2E 시험 Backend 파일 저장소. 실행마다 쌓이고, E2E DB가 tmpfs라 이전 파일은 참조가 없다. 시험이 다시 만든다 |
| `%TEMP%\learnershigh-it-plan-storage`, `-preview` | 0.09GB | IT 파일 저장소(시험이 다시 만듦) |
| `%TEMP%\lh-artifact-test-*` 116 · `lh-plan-original-test-*` 44 · `lh-plan-structure-test-*` 37 | 약 1MB | 단위 시험 임시 폴더(목록 `delete-temp-list.txt`) |
| Docker `412939ed2f4b`·`4b3646fa9020`·`5b5ba1c52099`·`96b903c198e1`·`90d4b07a19aa` | RAM 0 | `org.testcontainers=true`, 2026-11-10 생성, 10일 전 종료(Exited 255). `docker rm <id>`만 했고 볼륨은 유지 |

**보존**
- **백업 폴더 20개 전부(삭제 0):** SHA-256 분석에서 모든 폴더에 다른 곳에 없는 파일이 있었다(완전 중복 폴더 0, `backup-dup.txt`).
- 작업·원본 저장소: `assessment-integration`, `extension` 3.8GB, `main-baseline`, `original-analysis` 7.96GB, `local-run`
- 부록 O LIVE 원본 `live-storage*`(0.62GB, 유일)
- 사용자 MySQL과 볼륨 51개
- 소유가 확인되지 않은 종료 컨테이너 5개
- 이미지·빌드 캐시(prune 하지 않음)

**정리 전후**

| 측정 | 정리 전(11:57) | 정리 후(12:17) | 전체 시험 중 | 시험 후(13:00) | 해석 |
|---|---|---|---|---|---|
| 가용 RAM | 1.68GB | 2.23GB | 최저 1.87GB(IT 1배치 직후) | 3.62GB | 사용자 앱 사용량에 따라 변동. **삭제로 RAM이 늘지 않음** |
| C: 여유 | 95.9GB | 98.0GB | — | 97.3GB | 임시 저장소 삭제로 +2.1GB(시험이 일부 다시 만듦) |
| Docker | MySQL 609MB / VM 8.1GB | 같음 | 시험 MySQL은 배치 중에만 | 607MB | 누적 0 |
| 실행 중 시험 컨테이너 | 0 | 0 | 배치 중 1(+ryuk) | 0 | — |
| 사용자 서비스 PID | 8080=20340 · 5173=25636 · 5174=45748 · 33307=22204 | 같음 | 같음 | 같음 | 재시작 0 |

**메모리 조치(시험 환경 한정)**
1. 모든 시험을 **포그라운드로 순차 실행**했다(단계마다 10분 이내). 메모리 압박 때 백그라운드 명령이 강제 종료되던 경로를 피했다.
2. 단계 전후로 가용 RAM·컨테이너 수를 기록했다(`steps.txt`).
3. Spring Context 캐시 2개 상한, Gradle 데몬 없음·작업자 1개를 유지했다.
4. 단계 사이에 잔여 컨테이너가 없는지 확인했다.
5. 사용자 앱(Chrome·Notion 등)과 사용자 서버는 건드리지 않았다.

## P-3. 시험 결과 (이번 실행)

| 실행 항목 | 건수 | PASS | FAIL | SKIP / 예상 실패 | 환경 | 증거 | 판정 |
|---|---:|---:|---:|---:|---|---|---|
| Backend Unit + ArchUnit(`--rerun-tasks`) | 448(65 클래스, ArchitectureTest·RulesTest 포함) | 445 | 0 | skip 3 | 로컬 | `backend-unit.log`, `unit-results\` | **PASS** |
| Backend IT 배치 1 | 76(15 클래스) | 76 | 0 | 0 | Testcontainers | `it-1.log`, `summary-it-1.txt` | **PASS** |
| Backend IT 배치 2 | 91(15 클래스) | 91 | 0 | 0 | 〃 | `it-2.log` | **PASS** |
| Backend IT 배치 3 | 66(14 클래스) | 66 | 0 | 0 | 〃 | `it-3.log` | **PASS** |
| Backend IT 합집합 | 233(44 클래스) | 233 | 0 | 0 | 〃 | `summary-it-plan.txt` | **PASS** |
| Frontend typecheck · oxlint · build | 학생·관리자 | PASS | 0 | — | 로컬 | `verify-frontend-2.log`(최종 코드) | **PASS** |
| Node 전체 | 152 | 152 | 0 | 0 | 로컬 | `node-tests-2.log` | **PASS** |
| Assessment 기본 E2E 전체(19개 spec) | 67 | 67 | 0(2회차) | 0 | 일회용 DB | `e2e-default.log`(1회차 66/1 실패) · `e2e-default-2.log` | **PASS**(1회차 실패 아래) |
| 부록 O 확장 E2E | `a27o-ui` 3(기본 67에 포함) + 학생 동명 1(REPLAY 8에 포함) | 4 | 0 | 0 | 〃 | 위 로그 | **PASS** |
| 실측 REPLAY E2E | 8(기존 7 + 부록 O 1), manifest SHA `1802759c…` | 8 | 0 | 0 | 일회용 DB·가상 학교알리미 | `e2e-replay.log` | **PASS** |
| 6개 학교(부록 O) 실측 REPLAY | 0 | — | — | — | — | — | **NOT RUN** — 학교알리미 상세·항목 HTML을 저장하지 않아 manifest를 만들 근거가 없다(추측 manifest 금지) |
| Student Care 격리 E2E | 22 | 21 | 0 | **예상 실패 1**(상담 양식 첫 글자 누락, 알려진 결함 `test.fail`) | 일회용 DB 33350·18095·18096 | `e2e-studentcare.log` | **PASS** |
| 일회용 DB 브라우저 확인 | E2E 안의 캡처·단언 | — | — | — | 일회용 DB | `screens\`(18장) | **PARTIAL** — 아래 |

**skip 3**(모두 환경 조건)
- `SchoolInfoLiveReplayTest`·`SchoolInfoLiveClientReplayTest`: 로컬 실측 원본 폴더 환경 변수가 없으면 건너뜀
- `StructureCorpusDumpTest#dump`: 환경 변수로만 켜는 덤프 도구

**기본 E2E 1회차 실패와 수정**
- 실패: `z-a27-autosync`(2026 조회 0건, 1회 이상 기대)
- 원인: 부록 O에서 추가한 `a27o-ui` 학교 검색 시험이 학교 지정 없이 평가계획서 탭을 열었다. 그래서 기본 학교 `school_001`의 자동 확인이 그 시험의 가상 학교알리미 Fixture로 돌았다.
  - 제품은 이름 불일치로 등록 없이 보류했다(안전).
  - 하지만 그 2026 확인 기록이 24시간 유효해서, 뒤의 시험이 2026을 다시 조회하지 않았다. → **시험 격리 결함**
- 수정: `a27o-ui`가 학적·매핑이 없는 시험 전용 학교 키(외부 조회 0)로 탭을 열게 했다. 단언은 바꾸지 않았다.
- 2회차 67/67

**운영 번들 Mock 검사**(최종 코드로 다시 빌드)
- 0건 확인: Mock 시나리오(`mockScenario`), 개발 Header(`X-Assessment-*`), `devStudent/devAdmin`, 시연 ID, `/api/test/`, `VITE_ASSESSMENT`
- 이번에 고친 것: HTTP 운영 화면에서도 보일 수 있던 '시연 데이터' 문구 2곳(학생 결과물 미리보기 없음, 관리자 원문 정보 없음)을 모드별 문구로 나눴다.
- 남은 것: 관리자 번들의 버튼 설명 문자열 1개. 운영 빌드에서 조건이 늘 '연결됨'이라 화면에 나오지 않는 분기다.

**일회용 DB 브라우저 확인(PARTIAL)**
- E2E 안에서 확인하고 캡처했다:
  - 관리자 학교 검색 → 선택 → 18구간
  - 간편 검토 → 1회 확정 → 학생 공개(1600)
  - 학생 동명 지역 선택 → 본인 원본, 다른 학교 원본 404(1600)
  - 가로 넘침 0: 학교 검색(1366·1920·800), 학생(1920·1366·800), 학생 Shell·흰 홈(4개 해상도)
- **한 번에 확정 화면은 1600만 캡처했다.** 4개 해상도 전체를 위한 별도 Smoke는 실행하지 않았다.

## P-4. 보존 확인

- **USER DB**(13:00 읽기 전용 조회)
  - Flyway `202611190300`(24건) 그대로 — 새 Migration 미적용
  - 인천 가좌고 매핑(인천광역시 서해구, ACTIVE, version 1) 그대로
  - 학교알리미 원본 116개 그대로
- **사용자 서버:** 8080·5173·5174·33307 PID 불변
- **Git:** staged 0, Commit 0
- **변경 없음:** 분석기, Student Care 제품 코드, 1팀 영역

**이번에 바꾼 코드(시험·문구만)**
- `e2e/assessment/tests/a27o-ui.spec.ts`(시험 격리)
- `frontend/student/.../detail/ArtifactSection.tsx`, `frontend/admin/.../components/PlanOriginalViewer.tsx`(운영 문구)

## P-5. 남은 문제와 추가 검증

1. 6개 학교 실측 자료의 REPLAY manifest 작성은 NOT RUN이다. 다음 실측 때 학교알리미 상세·항목 HTML까지 저장하도록 실측 도구를 보완해야 한다.
2. 4개 해상도 전체 브라우저 Smoke(특히 한 번에 확정 화면) 추가 확인이 필요하다.
3. 사용자 화면에서 부록 O 기능을 쓰려면 8080 재시작과 USER DB Migration 2건 적용 승인이 필요하다(이번에도 하지 않음).
4. 메모리: 사용자 앱(Chrome 6.8GB 등)과 사용자 서버가 함께 돌면 가용 RAM이 1.5~2GB로 떨어진다. 긴 시험은 포그라운드로 나눠 실행하는 방식을 유지해야 한다.
5. Student Care 상담 양식 첫 글자 누락은 알려진 결함이다(담당자 확인 필요, 변경 없음).

---

# 부록 Q. 사용자 로컬 DB Migration 적용 및 Assessment 실제 화면 최종 검증 (2026-11-21)

- 원본 보고서: `C:\learnershigh-local-runppendixQ-20261121
eport\APPENDIX-Q-USERDB-MIGRATION-UI-20261121.md` · 증거: `C:\learnershigh-local-runppendixQ-20261121\`

## 요약

**DB APPLIED: 예.** 사용자 DB `lh_local_run`에 `V202611210100`·`V202611210200` 두 건만 적용했다.
- 적용 순서: 백업 → 복제 복원 검증 → 복제 모의 적용 → 적용
- 적용 결과: Flyway 26건 모두 성공, 실패 0, 대기 0
- 보존: 기존 데이터·원본 116개·인천 가좌고 매핑·원본 파일 303개를 확인했다

**실제 USER DB UI: 기본 화면 PASS.** 관리자·학생 화면 × 4개 해상도, 36개 화면 모두 다음을 만족했다(쓰기 요청 차단 상태).
- 가로 넘침 0, Mock 배지 0, GET 오류 0
- 800px 분석 표 넘침 결함 1건을 발견해 고쳤다

**핵심 잔여 이슈**
- USER DB에서 쓰기가 필요한 흐름은 실행하지 않았다(**NOT RUN**). 일회용 DB E2E로만 검증했다.
  - 학교 선택 → 수집
  - 학생 동명 선택(가좌고는 관리자 매핑이 있어 대상 아님)
  - 한 번에 확정
- 6개 학교 REPLAY는 NOT RUN이다(학교알리미 HTML 미보관).

## 1. 기준 환경

- **Git:** branch `integration/assessment-studentcare-20261116`, HEAD `9755581`, staged 0, unstaged 179, untracked 212(시작 시)
- **DB:** 로컬 Docker `lh-local-run-mysql`(hostname = 컨테이너 ID) · `lh_local_run` · 127.0.0.1:33307
  - 앱 계정은 컨테이너 환경에서 읽어 쓰며, 값은 출력하지 않았다.
- **원본 파일 저장소:** `%USERPROFILE%\.learnershigh-extension\local-run-storage`(361MB, 303개)
- **사용자 서버**

| 서버 | 시작 시 | 종료 시 |
|---|---|---|
| 8080 | java 20340 → 계보 `start-backend.ps1` 창 39308, `local-run` | **java 29400**(새 창 20120) |
| 5173 | node 25636 | 25636(유지) |
| 5174 | node 45748 | 45748(유지) |
| 33307 | 22204 | 22204(유지) |

## 2. 백업

**덤프**
- 경로: `db-backup\lh_local_run-full-20261121-134311.sql`
- 크기 34,823,620B, SHA-256 `855bd3ac86dfb0cb39af914fa266a75fd92125fb810e1418cb2107dd2963b6bd`
- `mysqldump --single-transaction --routines --triggers --events --hex-blob --databases lh_local_run`, 종료 코드 0
- `flyway_schema_history` 포함, CREATE TABLE 38개

**원본 파일**
- `db-backup\storage-sha256.txt`(303개)를 만들었다.
- Revision 192건의 SHA가 모두 저장소에 있다.
- 학교알리미 원본 99/116은 파일이 있고, 나머지 17건은 `NOT_PLAN`(학업성적관리규정)이라 설계상 바이트를 저장하지 않는다.

**복제 복원 검증(PASS)**
- 일회용 MySQL `lh-q-clone`(127.0.0.1:33360, tmpfs)에 실제로 복원했다.
- 일치 항목: 표별 행 수(38개 · 8,541행), 원본 SHA 116, Revision SHA 192, 매핑, Flyway 이력 24, 열·인덱스 정의

**복구 절차**(실행하지 않음, 사용자 확인 필요)
1. 8080 중지
2. `docker exec -i lh-local-run-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < <덤프>`
3. 새 표 2개 확인 뒤 8080 재시작
- 주의: 이 덤프는 Migration 이전 상태다. 복원 후 새 코드로 기동하면 Migration이 다시 적용된다.

## 3. Migration

**SQL**
- `V202611210100__assessment_student_official_view.sql`(SHA `3174715a…`): 학생 열람 선택 표와 감사 표 2개(PK, CHECK)
- `V202611210200__assessment_schoolinfo_attachment_seq_length.sql`(SHA `3c7946d5…`): `attachment_seq` VARCHAR(40) → 300

**사전 점검**
- 대기 Migration은 위 2건뿐이었다. 실패 이력 0, DB에만 있는 버전 0, `V202611180100` 없음.

**복제 모의 적용**(현재 코드 Backend, `local-run`, 포트 18290)
- 'Successfully applied 2 migrations … v202611210200'
- 신규 API 200, 인증 없으면 401
- 데이터·예전 이력은 그대로였다.
- 재기동하자 'Schema is up to date. No migration necessary.'(재적용 0)

**사용자 DB 적용**
- 적용 직전 기준값을 다시 확인했다(사전 점검 이후 변화 없음).
- 8080 프로세스 트리만 종료하고 `start-backend.ps1`로 새 코드를 기동했다(동시 기동 Backend 없음).
- 로그: 'Migrating … 202611210100', '… 202611210200', 'Successfully applied 2 migrations … (00:00.470s)'

**적용 후**

| 항목 | 결과 |
|---|---|
| Flyway | 26건, 실패 0. 신규 checksum `526702866` · `1041331618`(복제와 동일). 예전 24건 동일 |
| 스키마 | `attachment_seq` varchar(300), 새 표 2개(0행) |
| 행 수 | 기존 38표 동일. 변화는 새 표 2개(+0행)와 `flyway_schema_history` +2뿐 |
| 원본 | 116 SHA · Revision 192 SHA · 가좌고 매핑(인천광역시 서해구, version 1) · 저장소 303개 SHA 모두 동일 |
| UI 확인과 회귀 후 | 행 수 변화 0(`runtime\rowcounts-final.tsv`) |

## 4. Backend · Frontend

- **8080 신규 API**(`runtime\api-8080.txt`)

| API | 결과 |
|---|---|
| `current-term` 학생·관리자 | 200 `{2026, 2, KST_CALENDAR…}`, 인증 없으면 401 |
| `schools` | 200(가좌 150 등) |
| 학생 `school-candidates` | 200 `ADMIN_CONFIRMED`(가좌고 관리자 매핑) |
| `schools/directory?query=한솔고` | 200 · 세종/성남 2곳 |
| 1글자 검색어 | 400 |
| 검색 뒤 매핑 수 | 1(쓰기 0) |

- **Frontend:** 5173·5174는 재시작하지 않았다(Vite 자동 반영). 데이터 출처는 http이고, Mock fallback은 0이다.
- **인증:** 개발 Header 인증은 `local-run` 전용이다. 운영 인증 완료가 아니다.

## 5·6. 실제 USER DB 화면

- 방법: Chromium, `/api`의 GET이 아닌 요청을 모두 차단했다(자동 수집 POST 8회, 학생 ensure 8회 차단 — 새 외부 수집·DB 쓰기 0).
- 증거: `screens\userdb-*.png`(36장), `userdb-q-check.json`

| 기능 | 출처 | 결과 |
|---|---|---|
| 관리자 전체 현황 · 8개 탭 | USER DB | 화면 표시 PASS(탭은 링크 구조라 role=tab 집계 0 — 캡처로 확인) |
| 평가계획서 가좌고 2026 · 학년도 3개(올해·작년·재작년) · 문서 49 | USER DB | PASS |
| 학교 검색 '한솔고'(동명 2곳 지역·주소 구분, 선택 버튼 표시) | USER DB(검색만) | PASS. **선택·18구간 수집: NOT RUN(USER DB 쓰기)** → 일회용 DB E2E `a27o-ui` PASS |
| 분석 목록 · 검토(원문 Viewer · 수행평가 필터 '먼저 볼 항목 10/39' · 최종 확정 단계) | USER DB | PASS(읽기). **확정 클릭: NOT RUN(사용자 문서)** → 일회용 DB E2E PASS(1회 요청, 수정 보존, stale 409) |
| 학생 홈(흰 바탕 rgb(255,255,255), 접기 버튼 0) · 학교 평가 정보 | USER DB | PASS |
| 공식 원본 8개 · 내려받기 3건 SHA = DB SHA | USER DB | PASS |
| 다른 ID 내려받기 404 · 인증 없음 401 | USER DB | PASS |
| 학생 동명 학교 선택·교체·철회·감사·409 | 일회용 DB(REPLAY 설정 `a0-student-official-view`) | PASS. **USER DB: NOT RUN**(가좌고는 관리자 매핑이 있어 대상 아님. 대신고 학생 후보 조회는 서버가 학교알리미 재확인 = DB 쓰기를 일으켜 하지 않음) |
| 확정 전 학생 비공개 / 확정 후 공개 | 일회용 DB E2E | PASS |

## 7. 4개 해상도 매트릭스

- 해상도: 800×900 · 1366×768 · 1600×900 · 1920×1080, DPR 1(Playwright 기본)

| 화면 | 800 | 1366 | 1600 | 1920 |
|---|---|---|---|---|
| 관리자 전체 현황 | PASS | PASS | PASS | PASS |
| 관리자 평가계획서 6칸 | PASS | PASS | PASS | PASS |
| 관리자 학교 검색 결과 | PASS | PASS | PASS | PASS |
| 관리자 분석 목록 | **1차 FAIL(가로 30px) → 수정 후 PASS** | PASS | PASS | PASS |
| 관리자 검토 원문·수행평가·최종 확정 | PASS | PASS | PASS | PASS |
| 학생 홈 | PASS | PASS | PASS | PASS |
| 학생 학교 평가 정보 | PASS | PASS | PASS | PASS |
| 학생 동명 선택 Modal | NOT RUN(USER DB) | — | 일회용 DB PASS | — |
| 한 번에 확정 패널(값 채운 상태) | — | — | 일회용 DB PASS | — |

**발견한 결함과 수정**
- 증상: 관리자 분석 목록 표가 800px에서 페이지를 가로로 넘겼다. 화면 판독기용 숨김 글자(절대 위치)가 원인이었다.
- 수정: 표를 가로 스크롤 영역(`position: relative`)으로 감쌌다.
- 변경 파일: `frontend/admin/.../routes/EvaluationPlansRoute.tsx`, `review/review.module.css`
- 수정 뒤 Frontend 검증과 E2E 전체를 다시 실행했다.

## 8. 회귀 (이번 실행, 사용자 DB와 격리)

| 항목 | 이번 결과 | 부록 P(비교) |
|---|---|---|
| Backend Unit + ArchUnit | 448건(PASS 445, skip 3, 실패 0) | 같음 |
| IT 배치 1/2/3 | 76/91/66 PASS(15/15/14 클래스). 합 233, 합집합=전체, 교집합 0 | 같음 |
| Frontend typecheck·lint·build | PASS | PASS |
| Node | 152/152 | 152 |
| Assessment 기본 E2E 전체 | **67/67**(1회차 통과) | 67 |
| REPLAY(manifest SHA `1802759c…`) | **8/8**(부록 O 학생 동명 포함) | 8 |
| Student Care 격리 | 22: 통과 21 + 예상 실패 1(상담 양식 첫 글자, 완규님 영역) | 같음 |
| 6개 학교 REPLAY | NOT RUN(HTML 미보관) | NOT RUN |
| 운영 번들 | Mock 시나리오·개발 Header·시연 ID·시험 API 0 | — |

- 실행 중 가용 RAM 최저 1.54GB(IT 2배치 직후)다. 모두 포그라운드·순차로 실행했다.

## 9. 변경 · 보존

**변경**
- 사용자 DB: Migration 2건(새 표 2개, 열 확장)
- 8080 재시작(새 코드)
- 코드: `EvaluationPlansRoute.tsx`, `review.module.css`(800px 넘침 수정)
- 이 증거 폴더의 스크립트·로그

**보존**
- Git staged 0, Commit 0
- 5173·5174·33307 프로세스 유지
- 분석기·Student Care·HWP 변환기·1팀 영역 변경 0

**정리**
- 이 작업이 만든 복제 DB 컨테이너·복제 Backend는 종료·삭제했다.
- 복제용 원본 사본 `clone\storage`(361MB)는 증거로 남겼다(삭제해도 됨).

## 10. 남은 이슈 · 다음 조치

1. USER DB에서 쓰기 흐름(학교 선택 → 수집, 한 번에 확정, 학생 동명 선택)을 실제로 쓸 때는 대상 학교·QA 문서를 정해야 한다. 지금은 일회용 DB에서만 PASS다.
2. 6개 학교 REPLAY는 실측 도구가 학교알리미 상세·항목 HTML을 보관하도록 보완해야 한다.
3. Student Care 상담 양식 첫 글자 누락(완규님), 분석 정확도(완규님)는 보고만 했다.
4. 이 PC는 사용자 앱이 함께 돌면 가용 RAM이 1.5~2GB다. 긴 시험은 포그라운드로 나눠 순차 실행해야 한다.

---

# 부록 R. Assessment 최종 사용자 수동 검증 QA 환경 (2026-11-21)

- 안내서: `C:\learnershigh-qa\QA-검증-안내서.md`
- QA 폴더: `C:\learnershigh-qa\`(seed·storage·fixtures·logs·report·스크립트)

## R-1. 구성 (사용자 환경과 분리)

| 구성 | QA | 사용자(불변) |
|---|---|---|
| MySQL | `lh-qa-mysql` · 127.0.0.1:33370 · 볼륨 `lh-qa-mysql-data` · 메모리 상한 768MB | `lh-local-run-mysql` · 33307 |
| DB | 부록 Q 덤프(SHA `855bd3ac…`) 복원 → 표 38·8,541행 기준값 일치 → QA Backend 가 Migration 2건 적용(26건, 실패 0) | 26건(부록 Q) |
| Storage | `C:\learnershigh-qa\storage`(303 파일 복제) + 초기화용 `seed\storage-seed` | `%USERPROFILE%\.learnershigh-extension\local-run-storage`(303, 변화 0) |
| Backend | 18080 · `local-run` | 8080 |
| Frontend | 학생 5273 · 관리자 5274(`/api` → 18080) | 5173 · 5174 |
| 학교알리미 | 가상 서버 127.0.0.1:18779(`e2e/assessment/stub-schoolinfo.mjs` + QA Fixture) — 외부 요청 0 | 공식(사용자 조작 시) |
| 테스트 학생 | 시연 명단 보조 파일 `fixtures\qa-roster.json`: `stu_demo_qa01~03`(표시 이름 'QA합성학생', 반 'QA 합성 반') | — |
| 테스트 학교·문서 | 'QA검증고등학교'(같은 이름 2곳, 가상 주소) · 'QA단일고등학교', 학년도별 7개 합성 PDF('QA 합성') | — |

- 저장소 코드 변경: 없음(QA 전용 파일은 모두 저장소 밖).

**연결 검증**
- QA Backend 기동 스크립트가 fail-closed로 검사한다: DB URL 33307 금지, Storage 경로가 QA 폴더인지, 포트가 비어 있는지.
- 실측: QA API로 저장한 메모가 **QA DB 1행 / 사용자 DB 0행**이었다(`logs\connection-proof.txt`).
- 작업 전후 사용자 DB 행 수·사용자 Storage 파일 수 불변.

## R-2. 실제 검증 결과 (QA 환경, 이번 실행)

| 기능 | 결과 | 근거 |
|---|---|---|
| 학교 검색 · 동명 2곳(지역·주소) · 선택 → 3개년 18구간 수집 | **PASS** | `qa-admin-school-search.png`, `qa-admin-school-selected-18slots.png` |
| QA단일고 자동 수집 18/18 · 분석 `REVIEW_REQUIRED` 6/6(2026) | **PASS** | sync 응답 counts |
| 원문 열람(내려받기·미리보기 200) | **PASS** | smoke |
| 검토 → 과목 연결 → 한 번에 확정(13개, 기본 포함 13) → 학생 공개 13 | **PASS** | `qa-admin-bulk-confirm.png`, `qa-admin-plan-result.png` |
| 학생 공식 원본(본인 학적 칸) · 내려받기 | **PASS** | `qa-student-qa03-home.png` |
| 학생 동명 학교 선택(qa02 → QA모의도 → QA검증고B 원본) | **PASS** | `qa-student-same-name-modal/selected.png`. qa01 로 1회차 실패 — 15:14 사용자 선택 기록이 이미 있어 '학교 확인 필요' 단계가 아니었음(결함 아님, 기록 보존) |
| 개인 수행평가 등록 · 탐구 노트 한글 저장 · 결과물 업로드 · 피드백 요청 → 관리자 답변 → 학생 목록 | **PASS(API)** | smoke 5단계 |
| 탐구 노트 **실제 한글 IME 입력**(조합 중 입력) | **NOT RUN** | 자동화로 IME 조합을 재현하지 않았다 → 사용자 수동 확인 항목 |
| 개인 수행평가 수정·휴지통 화면 조작 | **NOT RUN(QA 화면)** | 기존 E2E 범위. 사용자 수동 확인 권장 |
| QA 초기화 스크립트 실행 | **NOT RUN** | 사용자 QA 조작 기록을 지우게 되어 실행하지 않았다(안전장치 검사만 작성) |

## R-3. 발생한 문제와 조치

1. **사용자 서버 8080·5173·5174 가 종료됐다**(15시경 발견. 사용자 MySQL 은 정상).
   - 종료 기록·시스템 이벤트가 없어 원인은 미확정이다.
   - 세 서버 모두 이 작업 세션의 셸에서 띄운 프로세스였다. 그래서 15시 직전 멈춘 백그라운드 작업(QA 가상 학교알리미 기동 명령)을 TaskStop 으로 정리할 때 함께 종료됐을 가능성이 가장 높다.
   - **조치:** 원래 스크립트 그대로 재기동했다(8080=43720 `local-run`, 'Schema is up to date' — Migration 재적용·데이터 변경 0 / 5173=31048 / 5174=22404).
   - 재발을 막기 위해 Windows 프로세스 생성(WMI)으로 세션과 분리했다. QA 프로세스도 같은 방식(`qa-up.ps1`)으로 띄웠다.
2. **QA Backend 첫 기동 실패 두 건**
   - PowerShell `ErrorActionPreference=Stop` 이 Gradle stderr 안내를 오류로 처리했다 → Gradle 실행 직전 `Continue` 로 바꿨다(`qa-start-backend.ps1`).
   - 시연 명단 학생 ID 는 `stu_demo_` 로 시작해야 한다 → `stu_demo_qa01~03` 로 바꿨다.
3. **가상 학교알리미 기동 명령이 멈춤** — 백그라운드 node 가 셸 출력 핸들을 물었다 → 별도 창·WMI 기동으로 바꿨다.
4. **PowerShell 5.1 한글 깨짐 방지** — QA 스크립트를 UTF-8 BOM 으로 저장했다.

## R-4. 보존

- 사용자 DB: 행 수 불변(40표·8,543행), Flyway 26 불변.
- 사용자 Storage: 303개 불변.
- Git: staged 0, Commit 0. 저장소 파일 변경 0(QA 파일은 저장소 밖).
- 다른 담당자 영역 변경 0.
