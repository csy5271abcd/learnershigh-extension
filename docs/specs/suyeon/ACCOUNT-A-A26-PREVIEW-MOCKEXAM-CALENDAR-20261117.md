# [계정 A] A26 — HWP/HWPX 자동 PDF 변환 · 모의고사 원문 텍스트 · 주차 기반 달력 (2026-11-17)

> 작업 위치: 통합 Worktree `C:\learnershigh-assessment-integration` · `integration/assessment-studentcare-20261116` · Draft PR #17.
> 원본 `C:\learnershigh-extension`은 읽기만 했다(미Commit 68건 변경 0). 모의고사 원문·실제 학교 문서는 Git에 넣지 않았고 Railway로 보내지 않았다.

## 최종 판정 — **PARTIAL**

세 목표는 모두 실제 코드로 구현했고 화면에서 확인했다. PARTIAL인 이유는 하나다. **모의고사 원문 데이터에는 지문만 있고 발문·선택지가 없다**(§10). 그래서 "문제·지문·선택지 구조 표시"는 지문까지만 가능하다. 없는 문제·선택지는 만들지 않았다.

| 목표 | 판정 | 요약 |
|---|---|---|
| 1. HWP/HWPX 자동 PDF 변환 | **PASS** | 기본값 켬. 이미지가 없으면 Backend가 자동 Build(실측). 준비 중 503 → 자동 변환 200, 재시작 후에도 캐시. 환경 변수·`docker build` 입력 없음 |
| 2. 모의고사 원문 텍스트 | **PARTIAL** | 지문 60개를 관리자·학생 화면에 텍스트로 표시(PDF 없음). 발문·선택지는 데이터에 없음 → 그 사실을 화면에 표시 |
| 3. 주차 기반 달력 | **PASS** | 'n월 m주' → 그 달 m번째 줄 날짜에 임시 배치, 하루 4개(좁은 화면 3개)·`+N개`·상세 모달·원문 시기/표시 날짜 구분, 관리자·학생 공용 |

## 1~2. 시작 상태 · A25 기준선

- 통합 Worktree HEAD `890a5f0`(= 원격, 깨끗). 원격 `main`은 `c03a1a4`. 다른 담당자의 새 변경은 없었다. PR #17은 Draft.
- A25 기준선:
  - HWP/HWPX 변환은 기본 꺼짐이었고, 수동으로 `docker build`와 환경 변수 설정이 필요했다.
  - 모의고사 원문은 원본 폴더의 Git 제외 파일에서만 읽었다.
  - 달력은 주차 계획을 날짜 칸에 두지 않았다(당시 계약).

## 3. 변경 파일

| 영역 | 파일 |
|---|---|
| 변환기 | `integration/preview/ConverterImageProvisioner.java`(신규), `ProcessPlanPreviewConverter`, `PlanPreviewConverterConfig`, `PlanPreviewRenditionService`, `AssessmentErrorCode`(`PLAN_PREVIEW_PREPARING`), `application.yml`, 시험 설정, Dockerfile 이동(`tools/…` → `backend/src/main/resources/assessment/preview-converter/Dockerfile`), 단위 시험 2개 |
| 모의고사 | `frontend/student/tools/mockExamPassagesPlugin.ts`(신규), `api/mock/mockExamPassages.ts`, `components/enrichment/MockExamPassage.tsx`·`.module.css`(신규), 학생 `MockExamMaterialDetailRoute.tsx`, 관리자 `StaticContentRoutes.tsx`·`MockExamRoutes.tsx`·`canonicalUi.ts`, 두 `vite.config.ts`, `src/vite-env.d.ts`(관리자·학생 신규) |
| 달력 | `teaching-plan/teachingPlanPlacement.ts`·`MonthlyPlanner.tsx`·`monthlyPlanner.module.css`, `teachingPlanPlacement.test.mjs`(신규) |
| 시험·CI | `e2e/assessment/tests/teaching-plan.spec.ts`, `e2e/playwright.assessment.config.ts`, `.github/workflows/ci.yml`(E2E Job에서 변환기 끔 — 아래 §31) |
| 문서 | `docs/api/api-contract.md`(§10-1-2 주차 임시 배치, §38-10 변환기 기본값), 실행 가이드, 이 보고서 |

## 4~9. HWP/HWPX 자동 변환

**기본 활성화**
- `assessment.preview.converter.mode: ${ASSESSMENT_PREVIEW_CONVERTER:docker}`, `auto-provision: true`. 기존 `assessment.preview` 블록에 병합했다.
- 시험 클래스패스는 `none` + 자동 준비 끔. Stub E2E와 CI E2E Job도 `none` → 시험 중 이미지 Build는 없다.

**이미지 자동 준비** (`ConverterImageProvisioner`)
1. Backend 기동 완료(ApplicationReadyEvent) 후 가상 Thread에서 실행한다. 기동을 막지 않는다.
2. `docker version`으로 Docker를 확인하고, `docker image inspect`로 이미지를 확인한다.
3. 이미지가 없으면 `docker build --pull=false -t <tag> -`로 Dockerfile을 **표준 입력**으로 넘긴다. Build Context가 없어 작업 폴더가 Docker로 가지 않는다.
- Tag는 `lh-plan-preview-converter:<Dockerfile SHA-256 앞 12자>`. Dockerfile이 바뀌면 새 Tag라 다시 만든다.
- 한 번에 하나만 만든다. Docker 꺼짐·Build 실패는 원인을 기록하고 60초 뒤 다음 요청에서 다시 시도한다.
- 설정으로 이미지를 지정하면(운영) Build하지 않는다. 운영은 `auto-provision=false` + 미리 만든 이미지 또는 `soffice` 모드를 쓴다. Docker 소켓을 Spring Boot 컨테이너에 연결하는 방식은 쓰지 않는다.
- 준비 전 미리보기 요청은 `503 PLAN_PREVIEW_PREPARING`이다(일시 원인이라 실패로 캐시하지 않음). 화면은 "준비하고 있어요" + 다시 시도.

**실측** (일회용 DB, 변환기 환경 변수 없이 기본값으로 실행)

| 항목 | 결과 |
|---|---|
| 이미지 없음 → 자동 준비 | 기동 12초(차단 없음) → 로그 `image missing — building lh-plan-preview-converter:ead2fca6de58` → `image built`. 이 PC는 Docker Layer 캐시가 있어 수 초 만에 끝났다. 캐시 없는 PC는 수 분(내려받기 약 1.5GB) |
| Build 중 요청 | 첫 요청 `503 PLAN_PREVIEW_PREPARING`("처음 준비하고 있어요…") → 10초 뒤 200 |
| HWP 변환 | 합성 HWP → 200 `converted-pdf` `%PDF-` 2.7초 |
| HWPX 변환 | 로컬 실제 문서 1건(원격 전송 없음) → 200 `converted-pdf` 2.4초 |
| 원본 다운로드 | 두 문서 모두 업로드 바이트와 동일 |
| Backend 재시작 후 | `image ready`(재Build 없음), 미리보기 316ms·46ms(캐시, 변환 컨테이너 실행 0) |
| 화면 | 관리자 HWP 검토의 'PDF 미리보기' Canvas, 3해상도 가로 스크롤 0 |
| 변환 실패·캐시 | A25 IT(`PlanPreviewRenditionApiTest` 3) 유지: 실패 422 기록, 재시도 없음, PDF 원문 미변환 |
| 단위 시험 | `ConverterImageProvisionerTest` 5: 이미지 재사용, Build 1회 + Dockerfile 표준 입력, Docker 꺼짐 + 60초 대기 후 재확인, Build 실패 원인, 지정 이미지 미Build. `ProcessPlanPreviewConverterTest` 4: 명령 제한, 해시 Tag, 준비 전 거절 |
| Docker Desktop 실제 종료 상태 | **로컬 실측 안 함**(사용자 Docker를 끄지 않았음). 단위 시험으로만 확인 |

## 10~17. 모의고사 원문 텍스트

**데이터 구조 조사** (실제 코드·파일 기준)

| 항목 | 결과 |
|---|---|
| 목록·메타 | `mockExamResearchFixture.ts` — 60개(영어 30·국어 30). Git에 있다. 원본은 `references/mock-exam/LearnersHigh_Mock_Exam_60_Research_Materials.md`(원본 폴더, 미추적) |
| ID | `materialId`(EN-01~30, KO-01~30) |
| 제목·연도·과목·유형 | `idea.coreMaterial`, `source.academicYear/examMonth/grade`, `subjectId`(mock_eng/kor), `research.examTitle/examKind` |
| 문항 번호 | `research.questionLabel`(예: "20번", "1~3번 지문") — 데이터에 있다 |
| **지문 원문** | `research.passage` — Git에는 빈 문자열. 원문은 Git 제외 파일 `mockExamPassages.local.json`(60개, 663~3,093자, 줄바꿈 있음, HTML 없음)에만 있다 |
| **발문·선택지·정답·해설** | **데이터에 없다**(원본 Markdown에도 선택지 기호 1회뿐). 주관식·수식·표 데이터도 없다 |
| 관리자·학생 모델 | 같은 Fixture + 같은 원문 함수(`withLocalMockExamPassages`). Backend 저장이 아니라 Frontend 정적 콘텐츠다. 관리자는 별도로 '관리자 원문 입력(ADMIN_INPUT)' 기능이 있다 |
| **원문이 안 보이던 원인** | 데이터 공급 문제. 원문 파일을 **저장소 안 위치**에서만 빌드 시점에 읽었다 → 통합 Worktree에는 파일이 없음 → 빈 문자열 → "원문 미포함". API·상태·렌더링 문제는 아니었다 |

**구현**
- 개발 서버 가상 모듈(`virtual:lh-mock-exam-passages`)이 `ASSESSMENT_MOCK_EXAM_PASSAGES_FILE`(절대 경로)을 읽는다. 없으면 저장소 안 Git 제외 파일을 읽는다. 관리자·학생 Vite가 같은 Plugin을 쓴다.
- 형식 검사: 객체, 키는 EN-nn/KO-nn, 값은 문자열 2만 자 이하. 어긋나면 싣지 않는다.
- 공급 상태(설정 파일/저장소 파일/없음)를 화면 안내에 쓴다.
- **Build 결과물에는 원문을 넣지 않는다**(실측: dist에 원문 문장 0건). 재배포 권한이 확인되지 않았기 때문이다.
- 공용 `MockExamPassage`(학생 상세, 관리자 콘텐츠 상세, 관리자 모의고사 관리):
  - 문항 번호 Badge, 시험 이름, 글자 수.
  - 지문은 **텍스트로만** 렌더링한다(HTML 실행 없음). 글자·줄바꿈은 그대로 두고 빈 줄은 문단 간격으로 쓴다.
  - 긴 지문은 스크롤 + '원문 전체 펼치기'.
  - "등록된 원문은 지문이며 발문·선택지는 데이터에 없음 — 원본 시험지 n번에서 확인" 안내.
  - 원문이 없으면 이유별 Empty State("이 실행 환경에 원문 파일이 연결되지 않았어요" / "이 자료에는 등록된 원문 지문이 없어요"). 원문을 만들어 채우지 않는다.
- PDF 경로·PDF Viewer·문서 변환은 쓰지 않는다.

**실측**

| 화면 | 1366·1600·1920 결과 |
|---|---|
| 학생 EN-01 | 983자 |
| 학생 KO-02 | 2,337자, 4문단, 펼치면 높이 2,164px(잘림 없음) |
| 관리자 KO-02 | 2,337자 |
| Empty | 원문 파일 미설정 개발 서버에서 공급 상태 `NONE`, 0개(정확히 구분) |

가로 스크롤은 3해상도 모두 0이다.

**보존**
- 대학별 자료 PDF(27건, `ASSESSMENT_UNIVERSITY_EXAM_ROOT`)는 별개 기능으로 그대로 둔다.
- 모의고사 AI 패널(`MockExamAiPanel`)과 관리자 원문 입력 기능은 변경하지 않았다.
- 정답·해설 공개 정책은 해당 데이터가 없어 변화가 없다. 학생 자료 접근 범위도 그대로다(정적 콘텐츠, 학생별 데이터 아님).

## 18~28. 월별 운영계획 달력

**규칙** (사용자 결정, `teachingPlanPlacement.tentativeWeekDates`, 계약 §10-1-2에 기록)
- 'n월 m주'(WEEK_IN_MONTH, 학기 누적 주차 아님 / 기준 미확인이라도 월·주가 있으면)는 그 달 달력(일요일 시작)의 **m번째 줄 안의 이 달 날짜**에만 둔다. 다른 달 날짜는 제외한다.
- 줄 안에서는 월~금을 우선한다(없으면 그 줄의 이 달 날짜). (과목명, id) 순 정렬 후 차례로 분산하므로 난수가 없고, 새로고침해도 같다.
- 'm~k주'는 m~k번째 줄마다 한 번 표시한다(원문 행은 하나).
- 정확한 날짜는 그대로. 월만 → '이 달 전체' 줄. 학기 n주차·시기 없음·연도 미확정 달·없는 줄(예: 6주)은 배치하지 않는다.
- **표시 날짜는 저장·전송하지 않는다.** 원문 시기 값은 바뀌지 않는다(시험으로 확인).

**2026년 3월 2주**: 3/8~3/14 줄 → 월~금 3/9~3/13에만 놓인다.
실측: 3학년 확정 HWPX의 '3월 1주' → 3/2, '3월 2주' → 3/9.

**UI**
- 칸마다 최대 4개(폭 1280px 이하 3개), 넘치면 `+N개` → 그날 전체 목록 모달 → 항목을 누르면 상세 모달.
- 일정 카드는 '과목 · 단원'. 임시 배치는 점선 테두리.
- 달력 위 안내: "m번째 줄에 **임시로** … 학사력·실제 수업일과 다를 수 있고 저장하지 않아요". 범례도 갱신했다.
- 상세 모달: 과목, 단원, 운영 시기(원문), **달력 표시 날짜 + '주차 기준 임시 배치 · 실제 수업일 미확정 · 저장되지 않는 표시용 날짜'**, 학습 내용·성취기준·수업/평가 방법·특별 일정·비고(있는 값만), 관리자에게는 확정 상태, '원문 근거 보기'.
- Esc·바깥 클릭·X로 닫고, 초점은 기존 Modal 규칙을 따른다.
- 관리자 검토 '월별 운영 계획' 단계와 학생 Planner가 같은 함수·컴포넌트를 쓴다. 학생은 확정 행만 받는다(서버 그대로). 학교·학년·학기는 슬롯별 조회라 섞이지 않는다.

**시험**

| 시험 | 결과 |
|---|---|
| `node --test` | 8/8 — Case 1·2(3월 2주 9~13일, 3주 16~20일), Case 3(4월 2주 6~10일, 3월에 안 나옴), Case 4·5(20개가 월~금 4개씩·전부 칸에 있음·입력 순서 무관 결정적), Case 6(정확한 날짜 그대로·임시 아님), Case 7(2~3주 두 줄), Case 8(4월 수요일 시작·5월 금요일 시작), 주말뿐인 첫 줄(8/1)·연도 미확정 2월·없는 6주·학기 주차, 원문 불변 |
| E2E `teaching-plan.spec` | 관리자 확정 → 학생 10월 달력 칸의 임시 배치 일정, 상세 모달 원문 시기·임시 배치, Esc |
| 화면 확인(1366·1600·1920) | 모달·버튼 잘림 없음(버튼 줄바꿈 결함 수정 `0a6efef`), 가로 스크롤 0 |

## 29~30. Student Care · Assessment 보존

Student Care 제품 코드 변경은 0이다.

| 시험 | 결과 |
|---|---|
| Node | 92/92 |
| Assessment Stub E2E | **23/23** |
| Railway 합성 E2E | **4/4** |
| Backend Unit | 398/398 |
| Assessment 평가계획서·미리보기·다중 형식·구조·운영계획 IT | 38/38 |
| 전체 IT·Student Care 인수 E2E | GitHub CI(§38) |

## 31~35. 테스트 · 연동 · DB

- Backend: Unit **398/398**(생략 1, 신규 9 포함, ArchUnit 포함), IT 38/38(대상 클래스). 전체 IT는 CI에서 확인한다(A25 로컬 전체 실행에서 Testcontainers 동시 기동 환경 실패가 있었음).
- Frontend: typecheck·lint·build·e2e typecheck·Harness 통과, Node 92/92 + 배치 8/8.
- CI 변경: `.github/workflows/ci.yml` E2E Job env에 `ASSESSMENT_PREVIEW_CONVERTER: none`, `…AUTO_PROVISION: "false"`. 이유는 변환기 기본값이 docker가 되면서 CI Backend가 이미지 Build를 시작하지 않게 하기 위함이다. 다른 Job은 변경하지 않았다.
- 배치 시험(`teachingPlanPlacement.test.mjs`)은 CI Node 단계에 넣지 않았다(Student Care 전용 단계) — 후속.
- Railway: A24 설정 그대로, 로그 토큰 0.
- 기존 시연 DB 접근 없음. 일회용 DB(`lh_a26`, 33472)는 삭제했다. 사용자 `lh-local-run-mysql`은 건드리지 않았다(새 Migration 없음 — A26은 DB 변경 없음).

## 36. 실행 가이드

`assessment-studentcare-local-run-guide.md`:
- §4: 변환기 환경 변수 제거(남아 있으면 지우는 명령).
- §4-1: 자동 준비 설명, 상태별 화면 표, 확인 명령(실행해 확인함).
- §7·§8: `ASSESSMENT_MOCK_EXAM_PASSAGES_FILE`.
- §9-6: A26 확인 순서(모의고사 URL, 달력 주차 기준·2026년 3월 예시, 모달).

사용자 Windows 환경 변수에는 `ASSESSMENT_ANALYZER_TOKEN`만 있다(A24로 무시됨). 변환기 설정을 덮어쓰는 값은 없다.

## 37. Git Commit

| Commit | 내용 |
|---|---|
| `c8f9689` | 모의고사 원문 텍스트 공급·표시 |
| `db561c4` | 주차 임시 배치·`+N개`·상세 모달·시험·계약 |
| `52d2b22` | 변환기 기본 켬·이미지 자동 준비·503 준비 중·CI/시험 끔 |
| `0a6efef` | 모달 버튼·범례 수정 |
| `1c47240` | 실행 가이드 |
| (이 보고서) | A26 보고서 |

## 38~39. Push · CI · PR

(Push·CI·PR 갱신 후 기록)

## 40. 사용자 직접 확인 항목

1. Docker Desktop을 켠 채 Backend만 실행하세요. 로그의 `image ready` 또는 `building … built`를 확인한 뒤 HWP/HWPX 원문을 열어 보세요. 처음 PC에서는 몇 분간 "준비하고 있어요"가 보입니다.
2. 관리자·학생 Vite 창에 `ASSESSMENT_MOCK_EXAM_PASSAGES_FILE`을 넣고 모의고사 KO-02·EN-01 원문을 확인하세요.
3. 학생 `stu_demo_003` 월별 운영계획(확정 운영계획이 있을 때)에서 주차 임시 배치, `+N개`, 상세 모달을 확인하세요.
4. 모의고사 발문·선택지를 보여 줘야 한다면, 그 텍스트 데이터를 등록할 방법(데이터 제공 또는 관리자 입력 확장)을 결정해 주세요.

## 41. 남은 문제

- **모의고사 발문·선택지·정답·해설 데이터 없음** → 지문만 표시. 등록 구조 확장은 결정이 필요하다(관리자 '원문 입력'은 지문만).
- 변환기: Docker Desktop 실제 종료 상태는 로컬 미실측(단위 시험만). 캐시 없는 PC의 첫 Build 시간은 미실측(수 분 예상). A25의 변환 충실도 한계(실패 약 17%, 글꼴 대체)는 그대로다.
- 배치 시험이 CI에 없다(로컬 node 실행).
- 달력 임시 배치는 학사력과 다를 수 있다(안내함). 학사력 연동은 미결.
- 이전부터 남은 것: 상담 첫 글자 유실(완규님), 기존 시연 DB Migration(승인 필요), Daglo 전면 재디자인(후속).
