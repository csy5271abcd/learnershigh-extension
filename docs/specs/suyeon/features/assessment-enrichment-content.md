# assessment-enrichment-content — 읽기 전용 심화 탐구 콘텐츠

> 위치: `docs/specs/suyeon/features/assessment-enrichment-content.md`  
> 대상 Surface: 기존 LearnersHigh **Student** `Assessment > 심화 탐구`, **Admin** `Assessment 관리 > 심화 탐구 콘텐츠`  
> 담당 기능: **ST-07, ST-16, ST-17 (Student 열람)**, **AD-06, AD-09, AD-10 (Admin 열람)** — 기능 ID는 유지하고 의미를 "읽기 전용 열람"으로 재정의한다(2026-11-03 범위 변경).  
> 목적: 심화 탐구를 **Frontend 정적 예시 콘텐츠**로 정의하고, 콘텐츠 구조·원문/자체 작성 구분·출처·품질 기준을 한 곳에서 관리한다.  
> 상태: **Feature Spec 작성본(DRAFT, 2026-11-03).** 2026-11-11 Student 화면을 이 명세에 맞게 바꿨다(정적 콘텐츠·작성 기능 제거, `assessment-ui-analysis-connection-202611/REPORT.md`). 2026-11-12 Admin 화면도 같은 정적 원천의 읽기 전용 열람으로 바꿨다(`assessment-seed-and-ui-verification-202611/ADMIN-ENRICHMENT-STATIC.md`). §10의 코드 삭제·Type 축소는 아직이다. 범위 변경 ADR은 Shared 승인 대기(`harness-change-proposals.md` P-34).

## 1. 범위 변경 요약 (2026-11-03)

| 구분 | 내용 |
|---|---|
| 유지 | 콘텐츠 목록, 검색, 과목·분야 필터, 콘텐츠 선택·상세 열람, 교과 개념 설명, 구체 탐구 사례, 관련 자료·출처 열람, 모의고사 60선 기반 학습 콘텐츠, 대학 공개자료 목록·PDF 뷰어 |
| 제거 | 개인 심화 Task 생성·시작·상태 변경, 내 심화 탐구, Task 전용 노트·결과물·피드백, Task ↔ 학교 수행평가 연결, 개인 모의고사 지문 등록·스크린샷 영역, 모의고사·대학 문항에서 Task 생성, 심화 콘텐츠 즐겨찾기, 심화 활동 KPI, Admin 콘텐츠 CRUD·공개 상태 관리 |
| 범위 밖 | 대학 기출·모의고사 **AI 분석**(신규 개발 제외, 기존 코드는 사용처 조사 후 정리 — `assessment-admin.md` §7) |
| 보호 | 학교 수행평가의 노트·NoteRevision·ArtifactVersion·FeedbackSnapshot, 노트 `EXAM_SOURCE` 출처 블록, 대학 PDF 뷰어, 자료함·참고자료, 학교 수행평가·보관함의 즐겨찾기 |

심화 콘텐츠는 **Domain Entity가 아니다.** Backend·DB·API를 새로 만들지 않고, 학생 개인 데이터도 만들지 않는다. 따라서 `api-contract.md`의 Contract Mock 규칙(`assessment-frontend-mock.md` §1)이 아니라 이 문서의 **정적 콘텐츠 규칙**(§6)을 따른다.

## 2. 기능 ID 재정의

| ID | 이전 의미 (Historical) | 현재 의미 |
|---|---|---|
| ST-07 | 모의고사 지문 탐구 카드 + 학생 개인 지문 등록·Task 시작 | 모의고사 60선 기반 학습 콘텐츠 **열람** (원문은 로컬 전용, §7) |
| ST-16 | 심화 Task 탐색·시작·직접 생성 | 심화 탐구 콘텐츠 **목록·검색·필터·상세 열람** |
| ST-17 | 대학 공개 PDF 자료실 + 자료에서 Task 시작 | 대학 공개자료 **목록·PDF 뷰어·문항 탐색** |
| AD-06 | 모의고사 탐구 소재 등록·편집·공개 | 모의고사 콘텐츠 **읽기 전용 열람** (Student와 같은 콘텐츠) |
| AD-09 | 공통 심화 Task 생성·편집·공개 | 심화 탐구 콘텐츠 **읽기 전용 열람** |
| AD-10 | 대학 공개 PDF 메타데이터 운영·공개 | 대학 공개자료 **읽기 전용 열람·PDF 뷰어** |

ID를 지우거나 다시 매기지 않는다. 코드 주석(`MockExamMaterialsRoute.tsx`, Admin `CatalogTaskRoutes.tsx`·`MockExamRoutes.tsx`·`UniversityRoutes.tsx`)이 이 ID를 참조한다.

## 3. Student 화면과 흐름

```text
Assessment → 심화 탐구
→ [탐구 콘텐츠 | 모의고사 60선 | 대학별 자료] 탭
→ 검색어 · 과목 · 분야 필터
→ 카드 선택 → 오른쪽 미리보기(핵심 주제·과목·분야)
→ 상세 열람(배경 → 개념 → 사례 → 과정 → 결과 → 질문 → 출처)
→ (선택) 출처 원문 링크 열기 / 대학 PDF 뷰어로 이동
```

| 화면 | Route (현행 코드) | 비고 |
|---|---|---|
| 탐구 콘텐츠 목록·미리보기 | `/assessment/enrichment` (`?subject=&q=&selected=`) | "새 탐구 만들기"·"이 탐구 시작하기" 제거 |
| 모의고사 60선 목록·상세 | `/assessment/enrichment/mock-exams`, `/:materialId` | "내 지문 등록"·"이 지문으로 탐구 시작" 제거 |
| 대학별 자료 목록 | `/assessment/enrichment/universities` | 유지 |
| 대학 기출 PDF 원문 보기 | `/assessment/enrichment/universities/:documentId?page=` | `task=` Query 제거, PDF 뷰어·문항 탐색 유지 |
| ~~내 심화 탐구~~ | ~~`/assessment/enrichment/my`~~ | 폐기 |
| ~~심화 탐구 상세(개인 Task)~~ | ~~`/assessment/enrichment/tasks/:taskId`~~ | 폐기 |

- 목록에서 다른 카드를 고르면 미리보기가 그 카드와 같아야 한다. 데이터가 없는 상세 ID는 "콘텐츠를 찾을 수 없음"으로 표시하고, 다른 카드 내용을 보여주지 않는다.
- 즐겨찾기·진행 상태·"시작함" 표시는 두지 않는다(학생 데이터가 생기지 않음).
- 학교 수행평가 노트에서 대학 기출 문항을 **출처 카드(`EXAM_SOURCE` 블록)**로 넣는 기능은 학교 수행평가 기능으로 유지한다(`assessment-inquiry.md` §5). 심화 콘텐츠 화면에서 노트로 보내는 진입은 Task와 무관한 경우에만 유지 여부를 구현 단계에서 확인한다.

## 4. Admin 화면

```text
Assessment 관리 → 심화 탐구 콘텐츠
→ [탐구 콘텐츠 | 모의고사 | 대학 공개 자료] → 목록·검색·필터 → 상세(학생과 같은 내용)
```

- 등록·수정·삭제·공개/비공개·관리자 원문 입력(P-30) 화면은 제거한다. 콘텐츠 변경은 Repository의 정적 데이터 수정(§6, 코드 리뷰)으로 한다.
- 학생 상세의 "심화 탐구" 탭, 활동 현황의 심화 KPI는 제거한다(`assessment-admin.md` §4·§14).
- 관리자 참고자료실(AD-07·08)은 그대로 유지한다. 참고자료 ↔ 콘텐츠 연결 필드(P-32 `relatedCatalogTaskIds`)는 §10의 정리 대상이다.

## 5. 콘텐츠 구조 (정적 데이터 Schema 제안)

```ts
// 제안 — 정적 콘텐츠 형식. API DTO·DB Schema가 아니다.
interface EnrichmentArticle {
  contentId: string                       // 기존 ID 재사용: catalog_00N, EN-NN/KO-NN, 대학 documentId/questionId
  kind: 'TOPIC' | 'MOCK_EXAM' | 'UNIVERSITY'
  title: string
  keyIdea: string                         // 핵심 주제 한두 문장 (제목 반복 금지)
  subjects: string[]                      // 교과명 (고정 Enum 아님)
  fields: string[]                        // 학문 분야
  origin: null
    | { type: 'MOCK_EXAM'; materialId: string }                            // 원문 메타데이터는 기존 60선 Fixture
    | { type: 'UNIVERSITY'; documentId: string; questionId: string | null } // 원문은 대학 PDF Manifest
  sections: {
    kind: 'BACKGROUND' | 'CONCEPT' | 'CASE' | 'PROCESS' | 'RESULT' | 'QUESTIONS'
    heading: string
    body: string                          // LearnersHigh 작성 설명
  }[]
  sources: { title: string; publisher: string; url: string | null; verifiedAt: string | null }[]
  authoredBy: 'LEARNERSHIGH'
  reviewedAt: string | null               // 사람 검토 날짜. null이면 노출 금지(§8-4)
}
```

| 화면 섹션 | 데이터 | 구분 |
|---|---|---|
| 제목·핵심 주제 | `title`, `keyIdea` | LH 작성 |
| 배경 | `sections[BACKGROUND]` | LH 작성 |
| 관련 교과·개념 | `subjects`, `fields`, `sections[CONCEPT]` | LH 작성 |
| 원문 정보 | `origin` → 시험·문항·쪽 / 대학·문서·쪽 | **원문 메타데이터** (수정 금지 영역) |
| 사례 | `sections[CASE]` | LH 작성 |
| 탐구 과정 | `sections[PROCESS]` | LH 작성 |
| 결과 해석·한계 | `sections[RESULT]` | LH 작성 |
| 더 생각할 질문 | `sections[QUESTIONS]` | LH 작성 |
| 출처 | `sources[]` | 실제 확인한 자료만 |

원문 영역과 LH 작성 영역은 **화면과 데이터 모두에서** 구분한다. 원문 지문·대학 문항 본문을 `sections`에 옮겨 적지 않는다.

## 6. 정적 콘텐츠 규칙과 단일 원본

1. **단일 원본:** Student와 Admin은 같은 콘텐츠 데이터를 읽는다. Surface별 복제 금지.
2. **위치 제안:**
   - 권장: `frontend/shared/assessment/content/` (P-07 공유 위치 승인 후, `harness-change-proposals.md` P-38)
   - 승인 전 임시: `frontend/student/src/features/assessment/content/`에 두고 Admin은 기존 `api/canonicalSource.ts` 경로로 읽는다(현행 4-2 B 방식 유지, 새 복제 금지).
   - 현재 위치인 `api/mock/`는 Contract Mock 폴더이므로 정적 콘텐츠의 최종 위치로 쓰지 않는다.
3. **읽기 함수:** 화면은 콘텐츠 모듈의 동기 조회 함수만 쓴다. `dataSource`(mock|http) 스위치와 무관하다. http 모드에서도 503을 내지 않는다.
4. **생성 데이터:** 모의고사 60선처럼 원본 Markdown에서 자동 생성한 Fixture는 생성 Script와 원본 SHA를 유지하고, LH 보강 설명은 생성 파일이 아닌 별도 파일에 둔다(다시 생성할 때 덮어쓰지 않기 위해).
5. **변경 절차:** 콘텐츠 수정 = 코드 변경 PR. 출처 확인 날짜(`verifiedAt`)와 검토 날짜(`reviewedAt`)를 함께 갱신한다.

## 7. 저작권·원문 처리

- 모의고사 원문 지문은 Git에 넣지 않는다. 현행 `api/mock/mockExamPassages.local.json`(Git 제외)이 있을 때만 로컬에서 보인다(P-24).
- `references/mock-exam/**`, `references/previous-exam-questions/**`는 현재 **Untracked이며 .gitignore 대상이 아니다**. 실수로 커밋될 수 있으므로 `.gitignore` 보호 규칙이 필요하다(Shared 승인 대기, P-33).
- 대학 PDF는 개발 서버 전용 경로(`/__dev/university-exams`)로만 제공한다. 운영 배포에서 PDF 제공 방식은 재배포 권한 확인 후 정한다(API-OD-A11).
- 원문 요약이라도 원문 문장을 거의 그대로 옮긴 것은 LH 작성 설명으로 쓰지 않는다.
- 원문을 외부 AI Provider로 보내지 않는다.

## 8. 콘텐츠 품질 기준

### 8-1. 현황 (2026-11-03 조사)

| 종류 | 수량 | 현재 구조 | 문제 |
|---|---|---|---|
| 탐구 콘텐츠 (`enrichmentFixture.ts` `fixtureCatalog`) | 9개 (공개 8, 비공개 1) | 제목·과목·목표 1문장·방법 3개 | 개념 설명·사례·출처 없음 |
| 모의고사 60선 (`mockExamResearchFixture.ts`) | 60개 | 출처 메타 + 선정 이유·방법 3·질문 3 | 60개 모두 `goal` = 제목 반복, `sourceUrl` 0건 |
| 대학 문항 (`universityExamManifest.json`) | 27문서·123문항 | 원문 개념 칩·쪽 범위 | LH 설명(`studyExamples`) 4문항뿐 |

### 8-2. 기준

1. 콘텐츠마다 **구체 사례 1개 이상**, **확인한 출처 1개 이상**. 출처를 확인하지 못하면 `verifiedAt=null`과 "출처 확인 필요" 표시.
2. 제목을 반복하거나 추상적으로 요약한 문장 금지. 각 섹션은 학생이 바로 쓸 수 있는 정보(개념 정의, 데이터 출처, 절차, 해석 방법)를 담는다.
3. 결과 섹션에는 한계·통제하지 못한 변수를 함께 적는다.
4. 확인하지 않은 논문 제목·통계 수치·URL을 만들지 않는다.
5. 정답·채점 기준·합격 관련 해석을 만들지 않는다(대학 자료).
6. 진로 연결은 선택. 강제하지 않는다.

### 8-3. 예시 (형식 예시 — 출처 URL은 작성 시 확인)

**탐구 콘텐츠 `catalog_004` 열섬 현상**
- 핵심 주제: 같은 날, 같은 지역 안에서도 도심이 외곽보다 따뜻한 이유를 공개 기온 자료로 확인한다.
- 배경: 포장면·건물이 많고 식생과 증발이 적으며 인공 열이 더해지는 도시는 주변보다 기온이 높게 나타나는 경향이 있다. 맑고 바람이 약한 밤에 차이가 커지는 것으로 알려져 있다.
- 개념: 알베도, 비열·열용량, 증발산과 잠열
- 과정: 고도가 비슷한 도심·외곽 관측소 1쌍 선택 → 같은 기간 시간별 기온 → "도심 − 외곽" 차이 → 낮/밤·맑음/흐림 비교 → 주변 토지 이용과 연결
- 결과·한계: 관측소 위치·센서 환경 차이도 원인이 될 수 있으므로 "원인 후보"와 "통제하지 못한 변수"를 함께 적는다.
- 출처 유형: 기상청 기상자료개방포털(관측 자료) — URL·이용 조건 확인 후 `verifiedAt` 기록

**모의고사 `EN-06` 낮은 확률의 과대평가**
- 원문 정보(원문 영역): 시험·문항·쪽은 60선 Fixture 그대로. 지문은 로컬 파일이 있을 때만 표시.
- 배경(LH 작성): 사람은 아주 낮은 확률을 실제보다 크게 체감하는 경향이 있으며 행동경제학에서 "확률 가중"이라고 부른다.
- 개념: 객관적 확률·주관적 확률, 프레이밍 효과
- 출처 예: Kahneman·Tversky, "Prospect Theory: An Analysis of Decision under Risk", *Econometrica* (1979) — 서지 정보 확인 후 기록
- 수정 사항: `goal`의 제목 반복 제거, 개념·사례·출처 섹션 추가

**대학 문항 `snu-2026-oral-q2` (구조 예시)**
- 원문 영역: 문서명·문항 쪽·출제 의도 쪽 링크(PDF 뷰어 이동)·원문 개념 칩
- LH 영역: 개념 해설, 고등 교과 연계, 심화 사례 1건, 질문 2~3개
- 금지: 정답·채점 기준 생성

### 8-4. 노출 조건

`reviewedAt`이 없는 콘텐츠(AI 초안 포함)는 학생 화면에 노출하지 않는다. 검토 후에만 날짜를 기록한다.

## 9. Loading / Empty / Error

| 상황 | 동작 |
|---|---|
| 검색·필터 결과 없음 | 조건 초기화 안내 (오류와 구분) |
| 없는 콘텐츠 ID | "콘텐츠를 찾을 수 없음" + 목록으로 돌아가기 |
| 원문 지문 로컬 파일 없음 | "원문은 이 화면에 포함되지 않아요" + 출처 정보 |
| 대학 PDF 파일 없음·해시 불일치 | 기존 `universityExamPdfDevServer` 상태(404 / CHANGED) 그대로 안내 |
| 외부 출처 링크 깨짐 | 링크 오류 표시, 콘텐츠 본문은 유지 |

정적 데이터이므로 Loading 상태는 PDF 뷰어·로컬 원문 로드에만 둔다.

## 10. 현재 코드와의 차이 (구현 단계 작업 목록)

이번 단계는 문서만 바꿨다. 아래는 다음 구현 단계에서 처리하며 **이번에 삭제하지 않았다.**

| 코드 | 현재 | 목표 |
|---|---|---|
| `student/.../api/enrichmentApi.ts`, `mock/enrichmentMock.ts` | §16~18·27 Contract Mock(쓰기 포함) | 정적 콘텐츠 읽기 함수로 교체, 쓰기 함수 제거 |
| `routes/MyEnrichmentTasksRoute.tsx`, `EnrichmentTaskDetailRoute.tsx`, `assessmentRoutes.tsx`·`paths.ts`의 Task 경로 | 존재 | 제거 |
| `components/enrichment/CreateEnrichmentModal.tsx`, `PersonalMaterialModal.tsx`, `ScreenshotRegionsModal.tsx`, `model/mockExamScreenshotStore.ts` | 존재 | 제거 |
| `components/university/examTaskPrefill.ts`, `TaskExamSource.tsx`, `?task=` 처리 | 존재 | 제거. **`ExamSourcePickerModal`·`EXAM_SOURCE` 블록·`PdfViewer`는 보호** |
| `SchoolAssessmentDetailRoute.tsx`의 연결된 심화 탐구, `AssessmentLayout.tsx` 진행 중 탐구 수 | 존재 | 제거 |
| `api/types.ts` `AssessmentSourceType`의 `'ENRICHMENT_TASK'`, `ArchiveSourceType`의 `'ENRICHMENT_CATALOG'` | 존재 | 소비자 정리 후 **마지막에** 값 축소 (필드 자체는 유지) |
| Admin `CatalogTaskRoutes.tsx`·`MockExamRoutes.tsx`·`UniversityRoutes.tsx`, `assessmentAdminMock.ts` 콘텐츠 CRUD | 편집·공개 | 목록·상세만 |
| Admin `ai/UniversityExamAiRoute.tsx`, `ai/MockExamAiPanel.tsx`, Backend `/ai/university-exam-analyses`·`/ai/mock-exam-analyses` | 존재(Untracked) | 메뉴 비노출 → 사용처 확인 후 제거 범위 결정 |

## 11. Acceptance Checklist

- [ ] Student 세 탭의 목록·검색·필터·선택·상세가 쓰기 동작 없이 동작한다.
- [ ] Admin이 Student와 **같은 콘텐츠 데이터**를 읽기 전용으로 본다.
- [ ] 원문 영역과 LH 작성 영역이 화면에서 구분된다.
- [ ] 원문 지문·대학 PDF가 Git에 추가되지 않는다.
- [ ] 학교 수행평가 노트의 `EXAM_SOURCE` 블록·대학 PDF 뷰어·즐겨찾기(학교 수행평가)가 회귀 없이 동작한다.
- [ ] `reviewedAt` 없는 콘텐츠가 노출되지 않는다.

## 12. Open Decisions

- 정적 콘텐츠 공유 위치(`frontend/shared/assessment/content/`) 승인 — P-07·P-38
- 운영 배포에서 대학 PDF·모의고사 원문 제공 방식(재배포 권한) — API-OD-A11
- 피드백 추천의 콘텐츠 링크 형식(`ENRICHMENT_CONTENT {contentId}`) — `assessment-feedback.md` §7, P-35
- 콘텐츠 검토 담당과 검토 기록 방식
