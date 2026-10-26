# LearnersHigh Extension — Suyeon Domain

> 위치: `docs/specs/suyeon/domain.md`  
> 목적: LearnersHigh Assessment에서 사용하는 **Entity, 관계, 상태 전이, 핵심 불변조건, Cross-Surface 전파, Seed/Fixture 기준**을 정의한다.  
> 화면별 행동은 Assessment Feature Spec, HTTP Request/Response는 `docs/api/api-contract.md`를 따른다. 이 문서의 개념 이름을 실제 테이블·컬럼·Enum 이름으로 자동 확정하지 않는다.

---

# 1. 문서 역할

현재 Suyeon의 신규 영역은 **Student Assessment + Admin Assessment 관리**다.

```text
School Assessment  ──┐
                     ├─ Assessment Note / Resources / Artifact
Enrichment Task   ───┘                    │
                                         ├─ Feedback Request / Reply
                                         └─ Growth Record / Archive

School Evaluation Plan ──> Subject Evaluation Facts
Admin Content Catalog ───> Enrichment / Passage / University Resources
```

원칙:

1. Student와 Admin 화면은 같은 Assessment Record와 Version Identity를 사용한다.
2. 기존 LearnersHigh의 학습계획·공부시간·관리자 기본 기능을 중복 구현하지 않는다.
3. 기존 Suyeon Mentor/Parent/Interview 기능을 새 Entity에 재편입하지 않는다.
4. Wangyu Student Care / Counseling Entity와 개인정보 경계를 침범하지 않는다.
5. 화면 UI 상태와 Domain 상태, AI 제안값과 사람이 확인한 값을 분리한다.
6. 파일 내용·학생 노트·피드백 요청 당시 Snapshot을 임의로 덮어쓰지 않는다.

---

# 2. 관련 Source of Truth

```text
docs/SOURCE_OF_TRUTH.md
docs/OWNERSHIP.md
docs/specs/suyeon/README.md
docs/architecture/overview.md
docs/architecture/integration-boundary.md
docs/architecture/shared-conventions.md
docs/api/api-contract.md
```

신규 Assessment Feature Spec 4종(`features/assessment-student.md`, `features/assessment-inquiry.md`, `features/assessment-feedback.md`, `features/assessment-admin.md`)은 **현재 저장소의 작성본**으로 존재한다. 상세 행동은 각 Feature Spec을 참고하되 Open Decision 및 `docs/api/api-contract.md`의 미확정 계약을 실제 구현 확정으로 해석하지 않는다.

```text
Entity / Relationship / State  → domain.md
Behavior / Acceptance        → 관련 Feature Spec
HTTP / JSON / Error          → api-contract.md
Legacy Integration           → integration-boundary.md
Ownership / Permission 경계  → OWNERSHIP.md + 인증·인가 계약
```

---

# 3. Ownership Boundary

| 구분 | 책임 |
|---|---|
| Suyeon | Assessment 수행평가 확장기록, 심화 탐구, 노트, 자료, 파일 버전, 선택형 피드백, 콘텐츠 관리 |
| Wangyu | Student Care, 상담, 관련 케어 신호·상담 메모와 API·DB |
| Existing LearnersHigh | 기존 Student / Admin 인증·공통 관리, 기존 학교 수행평가·학습 자료 등 실제 확인된 원본 |
| Shared | API 계약, 공통 Identity / 인가, DB Migration, Shell/Router, 공용 파일 연동 등 다영역 영향 변경 |

`Admin`과 `Teacher`를 별도 Assessment Actor로 만들지 않는다. 화면의 `선생님께 피드백 요청`은 사용자에게 보이는 문구이며 **업무 수신자는 기존 권한 체계의 관리자**다.

Admin이 피드백 없이 학생 기록을 열람할 수 있는 범위는 역할명만으로 무제한 확장되지 않는다. 기관·담당 학생·운영 범위를 통과한 경우에만 조회한다.

---

# 4. Domain Map

> 다음은 업무상의 개념 Entity/Value/Read Model 목록이다. DB 테이블 개수와 일대일 대응시키지 않는다.

| 개념 | 책임 | 주요 연결 |
|---|---|---|
| `Student` / `SchoolContext` | 학업 소속·학년·학기·수강과목 Context | 학교 평가계획, 학생 수행평가 |
| `SchoolEvaluationPlan` | 학교별 공식 PDF 원본·개정본 | 학교·학년도·학년·학기 |
| `SubjectEvaluation` | 지필/수행 평가 비율·세부 기준 | 계획서, 과목, 원본 페이지 |
| `SchoolAssessment` | 학생 개인의 실제 학교 수행평가 | Student, Subject, Note, Artifact |
| `EnrichmentTask` | 자율 심화 탐구 | 학생 작성 또는 Admin 공통 Task, 선택적 출처(모의고사·대학 자료) 참조 |
| `AssessmentNote` / `NoteRevision` | 학생 과정 기록·블록·수정 이력 | Assessment 또는 Enrichment Task |
| `NoteTemplate` | 선택형 초기 문서 본문 | Note 생성 또는 본문 추가 |
| `ResourceReference` / `Scrap` | URL·출처·메모·추천 관계 | Student, Admin, Note, Task |
| `Artifact` / `ArtifactVersion` | 실제 결과물 종류와 파일별 버전 | Assessment/Task, Feedback |
| `FeedbackRequest` / `FeedbackSnapshot` | 피드백 요청 및 당시 고정된 자료 | Note Revision, Artifact Version |
| `FeedbackReply` / `FeedbackComment` | 관리자 답변·문서 내 위치별 의견 | Request, 대상 버전 |
| `EnrichmentContent` | 관리자 제공 심화 Task / 모의고사 탐구 카드 | 과목, 출처, 공개 상태 |
| `UniversityPublicResource` | 대학 공개자료 메타데이터·원문 링크 | 대학, 문서/학년도, Task |
| `GrowthRecord` / `ArchiveView` | 활동·기여·성찰, 보관 목록 | 학생, 노트·파일·피드백 |

같은 외부 Reference(학교, 학생, Staff 등)를 새로운 내부 기본정보 원본으로 복제하지 않는다.

---

# 5. Existing LearnersHigh와 Extension 구분

기존 LearnersHigh가 Source System일 수 있는 정보:

```text
Student / Organization / Branch / Staff / Auth
기존 Performance Task 기본정보
Existing Library / Plan / Study Time / Learning History
기존 관리자 학생·지점 관리
```

신규 Assessment가 업무적으로 책임지는 확장 정보:

```text
학생의 Assessment별 개인 메모 / 공식 기준의 확인·수정 내역
과정 노트·수정 이력, 결과물 파일별 버전
선택형 Feedback Request Snapshot / Reply
관리자 콘텐츠 카탈로그 및 Reference Scrap
심화 Task와 성장·성찰 기록
```

실제 기존 Performance Task와의 매핑, `existingTaskId` 유무, Write Owner, DB Schema는 **기존 API/DB 확인 전 미확정**이다. 기존 데이터의 존재를 추정하여 신규 Task를 무조건 생성하거나 자동 연결하지 않는다.

---

# 6. Canonical Identity와 View Model

```text
Student S001
├─ SchoolAssessment A001
│  ├─ AssessmentNote N001
│  │  └─ NoteRevision NR001 / NR002
│  ├─ Artifact R001 (보고서)
│  │  └─ ArtifactVersion v1 / v2 / v3
│  ├─ Artifact R002 (발표자료)
│  │  └─ ArtifactVersion v1 / v2
│  └─ FeedbackRequest F001
│     ├─ Note Snapshot
│     ├─ 선택된 ArtifactVersion Snapshot
│     └─ FeedbackReply
└─ EnrichmentTask E001
   └─ AssessmentNote / Resource / Artifact / GrowthRecord
```

위 ID는 **설명용 샘플**이다. Surface 별로 `StudentAssessmentTask`와 `AdminAssessmentTask`처럼 같은 실체를 분리된 Domain Entity로 만들지 않는다.

```text
SchoolAssessment / FeedbackRequest
├─ Student View Model
└─ Admin Read Model
```

Admin의 집계·Dashboard는 가능한 한 실제 Source Entity의 State에서 계산한다.

---

# 7. UI State와 Domain State 구분

UI State:

```text
selectedTab / currentPanel / isModalOpen / searchKeyword
selectedArtifactVersionPair / previewPage / scrollPosition
loading / uploadProgress / toastVisible
```

Domain State:

```text
SchoolAssessment 진행 상태
FeedbackRequest 답변 상태
ArtifactVersion 보관 이력
SchoolEvaluationPlan 분석·검토 상태
EnrichmentContent 공개 상태
```

단순 탭 이동이나 모달 열기 때문에 DB Status를 새로 만들지 않는다.

---

# 8. School / Academic Context (ST-01)

학생 학교·학년·학기·수강과목이 평가계획서와 수행평가를 선택하는 Context다.

```text
Student
└─ SchoolContext (학교 / 학년도 / 학년 / 학기 / Subject[])
   └─ SchoolEvaluationPlan 참조 가능
```

초기 과목 예시는 공통국어2, 통합과학2, 통합사회2, 과학탐구실험2지만 과목명·개수는 고정 Enum으로 가정하지 않는다. `SchoolContext`가 기존 LearnersHigh 또는 신규 Extension 중 어디에 저장되는지 통합 경계를 확인한다.

---

# 9. School Evaluation Plan (ST-02, AD-03~05)

공식 학교 평가계획서의 관리 단위:

```text
학교
└─ 학년도
   └─ 학년
      └─ 학기
         └─ PDF Document Revision[]
             └─ SubjectEvaluation[]
```

학교·학년도·학년·학기별 슬롯을 지원하며, 슬롯마다 **복수 원본 / 개정본**이 올 수 있다. 학교에서 한 PDF에 여러 과목을 넣는 경우와 과목별 PDF로 나누는 경우를 모두 고려한다.

파일 원본과 AI 추출 결과는 서로 다른 데이터다. AI 값은 원문 페이지와 연결하고 사람이 비교·수정할 수 있어야 한다. 학생 개인 수정정보가 학교 전체 공식 평가정보를 자동 덮어쓰지 않는다.

### 9-1. 지필·수행평가 데이터

| 영역 | 필요한 정보 |
|---|---|
| 교수·학습 계획 | 단원, 성취기준, 교수·학습 방법, 평가 방법 |
| 총괄 | 지필·수행 반영비율, 학기·학년·과목 |
| 지필평가 | 차수(1·2차), 선택형/논술형, 배점·반영비율 |
| 수행평가 | 영역/과제명, 유형·시기, 만점·반영비율 |
| 세부 채점기준 | 평가요소, 수준별 기준, 배점 |
| 성취수준 | 성취기준, 성취도 체계, 기준 성취율 |
| 근거 | 원본 PDF 페이지 + 문서 인쇄 쪽 번호(가능한 경우) |

숫자 합산의 검증이 가능하더라도 실제 학교 문서와 다른 비율을 자동 수정하지 않는다. 자료를 찾지 못했을 때는 `미확인`과 `0`을 구분한다.

### 9-2. PDF 분석 상태

```text
분석 중 → 완료 / 확인 필요 / 실패
```

위는 사용자 표시 상태이며 실제 Enum/재처리 전략은 API 계약에서 확정한다. 실패를 빈 평가정보로 표시하지 않는다.

---

# 10. SchoolAssessment (ST-03~06)

`SchoolAssessment`는 **학교에서 실제로 부여한 수행평가**를 학생이 관리하는 단위다.

주요 의미:

```text
student / subject / title / school context
과제 공지 / 평가기준 참조 / 시기·마감
학생이 확인한 개인 정보 / 상태
Note[] / Artifact[] / ResourceReference[] / FeedbackRequest[]
```

등록 방법은 학교 평가계획서 활용(PDF 원본 확인 후 학생 검토·수정) 또는 직접 입력이다. AI 추천 제목은 실제 학교 과제 정보가 아니므로 자동 확정하지 않는다.

### 10-1. 진행 상태

| 표시 상태 | 의미 |
|---|---|
| 시작 전 | 학생이 아직 시작하지 않은 학교 평가 |
| 진행 중 | 준비 또는 작성 중 |
| 완료 | 학생이 완료로 기록한 학교 평가 |

```text
시작 전 → 진행 중 → 완료
```

화살표는 일반적인 동작 설명이고 역전이·삭제·복원 정책, 정확한 Enum은 Feature Spec과 Contract에서 정의한다. **기존 8단계, 단계별 필수 Evidence/AI 분석/관리자 승인 조건을 적용하지 않는다.**

평가기준 AI 설명·수행평가 꿀팁·교과 기반 주제 추천은 `SchoolAssessment`의 공식 사실을 바꾸는 명령이 아니라 **보조 분석/제안**이다.

---

# 11. EnrichmentTask (ST-07, ST-16~18, AD-06, AD-09~10)

자율 심화 탐구는 학교 수행평가와 별개다.

```text
EnrichmentTask
├─ source: 관리자 공통 콘텐츠(catalogTaskId) | 학생 직접 생성
├─ sourceReference?: 모의고사 탐구 카드 / 학생 개인 모의고사 자료 / 대학 공개 자료 (선택적)
├─ subject / theme / inquiryMethod / optionalDeadline
├─ AssessmentNote / Artifact / Resource
└─ relatedSchoolAssessment? (선택적)
```

자율 Task는 학교 성적으로 자동 변환되지 않는다. 대학·진로와 억지로 연결하지 않고 교과 개념, 관심 주제, 모의고사 지문, 실제 자료에서 출발할 수 있다. **특정 모의고사 소재·대학 공개 자료에서 시작한 경우 그 출처 식별자와 유형을 Task에 추적 가능하게 연결**해야 한다. 현행 API §18 초안은 두 참조를 구분한다.

- `catalogTaskId`: 관리자 **공통 심화 Task**에서 시작한 경우의 참조
- `sourceReference { type, sourceId }`: 모의고사 탐구 카드·학생 개인 모의고사 자료·대학 공개 자료 등 **출발 자료**의 참조. `type` 후보는 API §18의 `MOCK_EXAM_MATERIAL` / `PERSONAL_MOCK_EXAM_MATERIAL` / `UNIVERSITY_RESOURCE`를 따르며 이 문서에서 새 값을 추가하지 않는다.
- 학생 직접 생성 Task는 출처 없이(`sourceReference = null`) 만들 수 있다.

서버는 출처 자료의 존재·공개 범위·학생 소유권을 검증한다. 출처 원본이 이후 수정·비공개·보관되어도 학생 `EnrichmentTask`와 그 노트·파일·피드백은 자동 변경되지 않으며, 원문 파일을 Task에 자동 복제하지 않는다. `catalogTaskId`와의 동시 사용 규칙, 출처 ID의 장기 보존 방식, 최종 DTO/DB Enum은 API-OD-A12에서 확정한다.

기본 진행 상태: **시작 전 / 진행 중 / 완료**. 과제 등록·수정·공개 권한과 학생 개인 작성 권한은 분리한다.

### 11-1. 모의고사 탐구 소재

원문 출처(시험·연도·과목·지문 위치)와 자체 작성 탐구 카드(교과 개념·탐구 주제·방법·확장 질문)를 구분한다. 공개 여부와 저작권을 검토하고 지문 전문을 무단 복제하지 않는다.

### 11-2. 대학 공개 자료

대학·공식 게시처·문서 제목·학년도·원본 URL·분류·확인일 등을 기록할 수 있다. 예: 서울대·연세대·고려대·KAIST의 공개 PDF. 자료는 **탐구의 출처·소재**이지 별도의 면접 질문 생성·답변 채점 기능이 아니다.

---

# 12. AssessmentNote (ST-08~09, AD-11)

`AssessmentNote`는 학생이 작성하는 **탐구·수행평가 과정 기록**이다. 학교에 제출하는 원본 보고서·PPT와는 별개로 보존한다.

지원 개념:

```text
Note
├─ Body Blocks (제목 / 문단 / 표 / 목록 / 체크리스트 등)
├─ Images / PDF / Resource Link Cards
├─ Auto-save / 수정 이력
└─ NoteRevision[]
```

학생의 문서 구조와 이모지 소제목은 **본문 내용**이므로 수정·삭제할 수 있다. 관리자 열람은 원본을 보존하는 읽기 전용이며, 관리자의 의견은 Feedback으로 저장한다.

### 12-1. 템플릿 10종

1. 자유 탐구·수행평가 통합 노트
2. 실험 보고서
3. 주제 탐구 보고서
4. 발표·PPT 준비
5. 독서·문학 비평
6. 토론·논증
7. 통계·데이터 분석
8. 사회문제 해결 제안서
9. 프로젝트·제작 활동
10. 모둠·협업 활동

템플릿은 Note의 **초기 본문**을 제공한다. 이미 내용이 있는 노트에 적용할 때는 기존 내용을 무단 덮어쓰지 않는다. 상세 이모지 제목·블록 구조는 기능 명세에서 정의한다.

### 12-2. 노트 수정 이력

```text
Note N001
├─ Revision r1 (보존)
├─ Revision r2 (보존)
└─ Current Revision r3
```

사용자가 계속 편집하더라도 피드백 요청 당시 `r2`가 존재했다면 해당 요청의 `r2` Snapshot은 고정한다. 자동저장 간격·충돌 해결 전략·수정 이력 보존 단위는 Open Decision이다.

---

# 13. ResourceReference / Scrap (ST-10~11, AD-07~08)

참고자료의 메타데이터와 실제 원문을 구분한다.

```text
ResourceReference
├─ 원본 URL / 제목 / 게시처·채널 / 작성자·발행일(확인 가능 시)
├─ 유형: 뉴스·영상·논문·통계·공공데이터·공식자료
└─ 활용 관계: Note Block / Assessment / EnrichmentTask

Scrap
└─ Student 또는 Admin의 개인 메모·보관 Context
```

추천 자료원 예시: 뉴닉, 크랩(KLAB), ScienceON, RISS, DBpia, KCI, KOSIS, 공공데이터포털, EBS, 국립국어원, 국사편찬위원회 등. **자료원 브랜드와 실제 기사/논문 목록은 별개의 데이터**다. 존재하지 않는 자료 제목·발행일을 생성하지 않는다.

`노트에 추가`는 출처 정보가 있는 편집 가능한 링크 카드/블록을 만드는 기능이지 원본 저작물 전문을 복제하는 기능이 아니다.

---

# 14. Artifact / ArtifactVersion (ST-12~13, AD-12~13)

`Artifact`는 보고서·발표자료·조사 데이터 등 **실제 결과물 종류**를 나타내고, `ArtifactVersion`은 해당 결과물의 업로드 이력이다.

```text
SchoolAssessment A001
├─ Artifact R001 (실험 보고서)
│  ├─ Version v1 (DOCX)
│  ├─ Version v2 (DOCX)
│  └─ Version v3 (PDF)
└─ Artifact R002 (발표자료)
   ├─ Version v1 (PPTX)
   └─ Version v2 (PPTX)
```

불변조건:

- 새로운 Version이 이전 파일·메모·작성 시각을 덮어쓰지 않는다.
- 보고서와 발표자료를 하나의 연속 버전으로 합치지 않는다.
- 다운로드 원본·미리보기 가능한 변환 결과·파일 메타데이터를 구분한다.
- 피드백이 연결된 Version을 새 Version으로 자동 교체하지 않는다.
- 학생·관리자는 허용된 파일만 열람한다. 화면 미리보기 미지원은 데이터 부재나 권한 없음과 구별한다.

기본 고려 형식: PDF, DOC/DOCX, HWP/HWPX, PPT/PPTX. 확장 후보: 이미지, XLSX, Google Docs 링크.

### 14-1. File Upload Status

```text
업로드 중 → 업로드 완료 / 실패
```

이는 저장 작업 상태다. 영구적인 Artifact 업무 상태와 분리한다. 실제 File Storage Provider·제한 크기·변환 기능은 별도 계약이다.

### 14-2. Version Compare

**설계 목표는 학생과 관리자가 동일한 Artifact의 두 Version을 선택하여 비교하는 것**이다. 텍스트·페이지 차이 비교는 실제 변환기/뷰어가 지원하는 경우에만 제공한다. 지원하지 않는 형식에는 **두 개별 원본 열람과 파일 정보·메모 비교**를 제공하며 가짜 내용 비교를 표시하지 않는다.

현행 API 초안은 학생 비교(§25-1, ST-13)와 관리자 비교(§37, AD-13)를 각각 정의하며 같은 버전 무결성 원칙을 사용한다.

- 학생은 **본인 소유 Artifact**만, 관리자는 권한 범위 내 학생의 Artifact만 비교한다.
- **동일 Artifact에 속한 업로드 완료 Version 두 개**만 선택할 수 있다. 다른 Artifact의 Version, 미완성 업로드는 비교하지 않는다.
- 비교는 읽기 동작이며 과거 `ArtifactVersion`과 이를 참조하는 `FeedbackSnapshot`을 변경하지 않는다.
- 파일 내용 Diff의 실제 지원 형식과 응답 스키마 고정은 변환 Provider 검증 후 API-OD-A12에서 확정한다.

계약 초안이 있다는 사실은 Viewer·Backend 구현 완료를 뜻하지 않는다.

---

# 15. FeedbackRequest / FeedbackSnapshot (ST-14, AD-14)

학생은 질문 작성 없이 `선생님께 피드백 요청`을 누를 수 있다.

```text
Student Request
→ Note Revision Snapshot
+ 선택한 ArtifactVersion[]
+ 관련 Reference / Assessment Context
→ Immutable FeedbackSnapshot
→ Admin Request Inbox
```

스냅샷의 목적은 **요청 당시 무엇을 검토하도록 보냈는가**를 보존하는 것이다. 요청 후 학생이 Note를 편집하거나 v3를 올려도 요청 당시 Note 및 v2 파일이 달라지지 않는다.

- 모든 첨부 버전을 자동으로 최신본으로 교체하지 않는다.
- 파일은 선택된 Version별 권한 확인·미리보기/다운로드를 따른다.
- 원본 노트와 Snapshot 저장 방식(복사, Revision Reference, 파일 해시 등)은 기술 설계에서 확정한다.
- 요청은 학교 수행평가뿐 아니라 명세된 심화 Task에도 연결될 수 있다.

---

# 16. FeedbackReply / FeedbackComment (ST-15, AD-15~16)

관리자는 피드백 요청의 고정 Snapshot과 권한 내 학생 기록을 열람하고 자유 의견을 작성한다.

```text
FeedbackRequest
└─ FeedbackReply (작성 관리자 / 작성 시각)
   ├─ Document 전체 의견
   ├─ Location-specific Comment[]
   │  ├─ Note block / section
   │  ├─ PDF page
   │  ├─ PPT slide
   │  └─ 지원 가능한 문서 section
   └─ Recommendation[] (자료·후속 심화 Task)
```

Location Comment는 대상 Document ID와 **대상 Version**에 고정되어야 한다. 지원하지 않는 문서 형식은 전체 의견을 제공한다. Admin은 학생 Note/Artifact 원본을 직접 수정하지 않는다.

### 16-1. Feedback Status

| 구분 | 표시 상태 | API 초안의 표현·의미 | 전이 및 학생 노출 |
|---|---|---|---|
| `FeedbackRequest` | 답변 대기 | `PENDING`: 요청 접수·Snapshot 고정 | 요청 생성 시. 관리자의 답변 임시저장만으로 완료되지 않음 |
| `FeedbackRequest` | 답변 완료 | `DELIVERED`: 관리자 답변이 학생에게 전달됨 | 전달 성공 시 `PENDING → DELIVERED` |
| `FeedbackReply` | 작성 중/임시 저장 | `DRAFT_SAVED`: 관리자 답변 초안 보존 | 관리자 내부에서만 조회·편집 가능, 학생에게 미노출 |
| `FeedbackReply` | 전달 완료 | `DELIVERED`: 답변 최종 전달 | 전송 성공 시에만 학생에게 공개·요청 상태 갱신 |
| 취소 정책 후보 | 요청 취소 | 상태명·허용 조건 미확정 | 임의 Enum·삭제 API를 만들지 않음 |

위 영문 표기는 현행 `api-contract.md` §31·32·45에서 **제안한 응답·초안 상태**를 설명하며, 실제 Java/DB Enum을 여기서 확정하지 않는다. 답변 초안 저장 실패·전달 실패 시 `FeedbackRequest`는 답변 대기를 유지하고, 요청 Snapshot과 학생 원본은 변경되지 않는다. 학생의 `읽음` 여부는 요청·Reply의 업무 상태와 별개다. 승인/반려/필수 재제출/학생 질문 필수 입력 상태를 추가하지 않는다. 취소·중복 요청·전달 후 답변 수정 가능 여부는 미결정이다.

```text
SchoolAssessment = 완료
FeedbackRequest = 답변 대기
```

는 동시에 유효하다. 관리자 답변만으로 과제를 자동 완료시키지 않는다.

---

# 17. Admin Read Boundary (AD-01~02, AD-11~17)

관리자 화면은 기존 LearnersHigh Admin Shell 내부의 `Assessment 관리`에 추가한다.

```text
Authorized Admin
→ Organization / Student Access Check
→ Student Assessment List / Detail
   ├─ SchoolAssessment / EnrichmentTask
   ├─ AssessmentNote (read-only)
   ├─ ArtifactVersion / Preview
   ├─ Resource / GrowthRecord
   └─ FeedbackRequest / Reply
```

**피드백 요청 여부는 전체 학생 기록 조회의 선행조건이 아니다.** 그러나 권한 없는 다른 학생·지점 기록은 조회할 수 없다. 권한 검사를 Frontend 숨김만으로 대체하지 않는다.

같은 학생 기록에 대한 수연 Admin Assessment의 열람과 완규 Student Care의 열람은 별도 목적/접근 정책이며, 상담 메모 등을 자동 합치지 않는다.

---

# 18. Admin Content Publishing (AD-06~10)

관리자는 다음을 운영한다.

```text
EnrichmentTask Catalog
Mock-exam Inquiry Card Catalog
University Public Resource Catalog
Admin Reference Library / Scrap
SchoolEvaluationPlan Registry
```

콘텐츠의 `임시 저장 / 공개 / 비공개 / 보관`은 사용자 표시 상태다. 각 콘텐츠 종류의 공개·비공개 전이, 버전 정책, 담당자 권한은 별도 기능 명세가 정한다.

학생이 관리자 공통 Task를 선택해 자기 탐구를 시작할 때 **학생의 기록은 관리자 원본 콘텐츠와 분리**한다. 이후 공통 원본의 편집이 이미 생성된 학생 기록을 의도치 않게 덮어쓰지 않는다. 학교 평가계획서, 심화 Task, 탐구 소재, 대학 자료, 관리자 참고자료의 **생성·수정·공개·보관 운영 권한(전체/기관/지점/담당자)**은 학생 기록 조회 권한과 별도 정책이다. 현행 OD-A08 범위에서 확정 전까지 전체 운영 권한을 임의 부여하지 않는다.

---

# 19. GrowthRecord / Archive (ST-19~20, AD-17)

`GrowthRecord`는 학생의 실제 활동·역할·과정·문제 해결·결과·성찰을 기록한다. 활동 기록을 **공식 학교생활기록부·확정 세특으로 자동 표시하지 않는다.**

```text
Student
├─ SchoolAssessment / EnrichmentTask
├─ GrowthRecord (과정 / 역할 / 결과 / Reflection / Evidence Reference)
└─ ArchiveView
   ├─ 최근
   ├─ 즐겨찾기
   ├─ 완료
   ├─ 지난 학기
   └─ 휴지통
```

Archive는 **조회/보관 관점**이다. 별도 테이블인지 Source Record에서 생성하는 Projection인지는 확정되지 않았다. 휴지통·복원·영구 삭제는 기록·파일·피드백 무결성과 보존 정책을 함께 검토한다.

### 19-1. 휴지통 적용 범위 및 계약 차이 (OD-A11)

| 후보 대상 | 현재 `api-contract.md`의 관련 명령 | 문서 단계 판단 |
|---|---|---|
| `SchoolAssessment` | §12 `DELETE` 후보, §30 복원(유형 예시) | Soft Delete/복원 의미는 미확정. 연쇄 삭제 금지 |
| `EnrichmentTask` / `AssessmentNote` | 등록·수정·조회 중심, 삭제/복원 없음 | 삭제·보관 API 보완 필요 |
| `Artifact` / `ArtifactVersion` | 업로드·열람·버전 이력, 삭제/복원 없음 | 과거 버전·FeedbackSnapshot 보존 우선. 삭제 정책 미정 |
| `ResourceReference` / 개인 모의고사 자료 | 저장·조회 중심, 삭제/복원 없음 | 자료 삭제·보관 범위 결정 필요 |
| `GrowthRecord` | 생성·조회 중심, 삭제/복원 없음 | 삭제·복원 계약 보완 필요 |

현행 §30은 **보관함 5개 탭 조회와 일부 복원 동작을 제안할 뿐**, 모든 대상의 삭제·복원 기능을 완성하지 않는다. 각 대상의 휴지통 진입 방식, 복원 권한·기간, 영구 삭제·개인정보 삭제 의무, 피드백 불변 참조 보존은 OD-A11 및 API-OD-A08에서 확정한다. 결정 전 모든 유형의 삭제/복구를 구현 가능하다고 표기하지 않는다.

학생의 Reflection은 학생이 직접 작성한다. AI는 누락 확인·질문·초안 제안까지 지원할 수 있지만, 학생이 하지 않은 일을 만들어 기록하지 않는다.

---

# 20. AI Domain Boundary (ST-02, ST-04~07, ST-18, AD-04~05)

AI의 역할은 다음으로 제한한다.

```text
Analysis / Explanation / Suggestion / Draft / Candidate
```

- 공식 평가계획서 원문·관리자 확인 정보·학생 개인 기록을 구분한다.
- AI가 추출한 점수나 평가기준은 원본 페이지를 검토하기 전 확정 정보가 아니다.
- AI 주제명 추천은 학생 선택 후보이며 실제 학교 수행평가나 학교 기록으로 자동 등록되지 않는다.
- AI는 학생의 원문·성찰을 동의 없이 자동 교체하지 않는다.
- 실패 시 Retry 가능 범위와 상태를 정의하되, AI 실패가 학생의 모든 수동 작성 기능을 막지 않게 한다.
- 외부 제공자·호출 방식·비용·개인정보 전송 정책은 아직 확인되지 않았다.

---

# 21. Cross-Surface Flow — 평가계획서

```text
Admin 공식 PDF Upload
→ SchoolEvaluationPlan Revision 생성
→ AI Extract Candidate
→ Admin 원본 대조·수정
→ SubjectEvaluation 공개/활용
→ 권한·학교 Context가 일치하는 Student에게 노출
→ Student가 자신의 수행평가 정보로 확인·선택·보완
```

개인 정보 수정은 공유 학교 공식 원본을 조용히 변경하지 않는다.

---

# 22. Cross-Surface Flow — 피드백

```text
Student Note 작성 / Artifact Upload
→ Student Request (질문 필수 없음)
→ FeedbackSnapshot 고정
→ Admin 목록 / Note·File Version 열람
→ 문서 전체·위치별 Feedback 작성
→ Reply 전달
→ Student Feedback 확인
→ 학생이 필요 시 자율 수정 / 새 Artifact Version 등록
```

`Request → Reply`는 학생 과제의 강제 승인·재제출 흐름이 아니다.

---

# 23. Cross-Surface Flow — 심화 콘텐츠

```text
Admin EnrichmentTask / Mock-exam Card / University Resource 등록
→ 권한 및 출처 확인 / 공개
→ Student 소재 탐색
→ Student 개인 EnrichmentTask 시작
→ Note / Resource / Artifact 작성
→ 선택형 Feedback / GrowthRecord / Archive
```

Content 원본과 Student 작성 기록의 Identity를 분리한다.

---

# 24. Derived State / KPI

예:

```text
Feedback Pending Count = 접근 가능한 미답변 FeedbackRequest 수
Assessment Complete Count = 해당 Context의 완료 SchoolAssessment 수
Enrichment Active Count = 해당 학생의 진행 중 EnrichmentTask 수
Recent Upload = 실제 ArtifactVersion Upload Event 기준
```

Dashboard 표시값을 수동 Fixture Counter를 영구 Source로 삼아 유지하지 않는다. **자료가 없다는 상태와 API 오류 상태를 구분**한다.

---

# 25. Canonical Fixture / Seed

목업 시연용 Fixture는 실제 데이터와 분리하고 다음 조건을 만족해야 한다.

1. Student와 Admin이 동일 Student / Assessment / Note / ArtifactVersion ID를 참조한다.
2. 요청 Snapshot은 요청 시점 Revision/Version에 고정된다.
3. 학교 평가계획서 학교·학년·학기·과목이 학생 Context와 일치한다.
4. 관리자 공통 콘텐츠와 학생 개인 Task를 구분한다.
5. 현재 등록되지 않은 공식 PDF·논문·뉴스 항목을 실제 확인된 자료처럼 만들지 않는다.
6. 완규 Student Care Fixture나 상담 데이터는 변경·재사용하지 않는다.
7. 예전 Mentor/Parent/School Fixture가 신규 Assessment의 근거 데이터로 유입되지 않는다.

Fixture의 위치·Mock Adapter·지속성·시나리오 제어는 `assessment-frontend-mock.md`(DRAFT)를 따른다. 공통 Fixture는 **같은 ID와 시나리오 정의**를 보장할 뿐, 별도 Origin인 Student/Admin 앱 사이의 런타임 상태를 동기화하지 않는다. 런타임 동기화는 Stage 2 Backend로 검증한다.

---

# 26. Privacy / Permissions

| 작업 | Student | Authorized Admin |
|---|---|---|
| 본인 수행평가·노트·결과물 편집 | 가능 | 원본 편집 금지 |
| 본인 피드백 요청·답변 확인 | 가능 | 요청 열람·의견 작성 |
| 다른 학생 기록 열람 | 불가 | 담당·기관 권한에 한해 가능 |
| 공통 PDF·심화 콘텐츠 등록 | 개인 자료/Task 생성 범위 | 운영 권한 범위 |
| Wangyu Student Care / 상담 | Assessment 범위 아님 | 기존 Wangyu 기능·정책을 따름 |

첨부 파일 원본의 저장 위치·서명 URL·다운로드 권한은 서버 측에서 확인한다. 학생 원문과 피드백 스냅샷의 보관·삭제 정책은 기존 개인정보 관리 체계와 충돌 없이 정의한다.

---

# 27. Domain Commands (개념)

아래는 업무 유스케이스의 예시이며 **API Endpoint 또는 구현 Class 명칭이 아니다.**

```text
RegisterSchoolEvaluationPlan / ReviewExtractedEvaluation
CreateSchoolAssessment / ChangeAssessmentStatus
CreateEnrichmentTask / StartCatalogTask
CreateNote / ApplyTemplate / SaveNoteRevision
AttachResource / UploadArtifactVersion / CompareArtifactVersions
RequestFeedback / CancelFeedbackRequest / DeliverFeedback
PublishEnrichmentContent / ScrapReference
WriteGrowthRecord / ArchivePersonalRecord
```

---

# 28. Transaction / Snapshot Boundary

원자성을 검토해야 할 변경:

```text
FeedbackRequest 생성
→ 요청 메타데이터 + 선택한 파일 버전 + Note Snapshot 기준 확정

FeedbackReply 전달
→ 작성자·시각·대상 Version·학생 공개 상태 일관성 유지

ArtifactVersion 추가
→ 파일 저장 결과 + 해당 Artifact의 Version 이력 일관성 유지
```

파일 스토리지와 DB가 완전한 단일 Transaction을 보장하는지는 확인 전 가정하지 않는다. 실패·재시도·중복 제출·정리 작업 정책이 필요하다.

---

# 29. DB 설계와 Domain 문서의 관계

```text
Entity ≠ 반드시 Table 1개
Value / State ≠ 반드시 Column 1개
Note Revision / Snapshot ≠ 반드시 Blob 복사 1개
```

실제 Schema, FK, Unique Constraint, 낙관적 잠금, 이력 보존 방식은 Domain 의미를 보존하면서 설계한다. Flyway Migration은 기존 Shared Database와 충돌하지 않게 관리한다.

---

# 30. API Contract와 Domain 문서의 관계

```text
SchoolAssessment Domain → Student Assessment DTO / Admin Assessment DTO
FeedbackRequest Domain  → Student Request View / Admin Inbox Item
ArtifactVersion Domain  → 권한별 File Metadata / Preview DTO
```

JSON Naming, Enum, Endpoint, Error Code를 `domain.md`에서 독자적으로 확정하지 않는다. 현재 `docs/api/api-contract.md`는 신규 Assessment 계약 **초안**을 담고 있으며, 기존 Mentor/Parent/School API는 활성 Assessment 계약으로 자동 승계하지 않는다. 학생 비교(§37), Task 출처(§18), 삭제·복원(§12·30), 상태 전이(§31·32·45)와의 차이는 수정 전까지 명시된 계약 공백으로 관리한다.

---

# 31. Open Decisions

| ID | 내용 | 확인 대상 |
|---|---|---|
| OD-A01 | 기존 수행평가 원본과 신규 SchoolAssessment 매핑 / Write Owner | Existing API/DB·ADR-0002 |
| OD-A02 | 학교·학년도·학년·학기 PDF Revision·승인 정보의 저장 구조 | API/DB |
| OD-A03 | PDF 추출 분석 Provider·원본 페이지 매핑·정정 정책 | AI/File Storage |
| OD-A04 | 학생 학교/학년/과목 Context의 실제 소유 원본 | Existing Integration |
| OD-A05 | Note Editor 포맷·자동 저장·수정 이력 전략 | Frontend/DB |
| OD-A06 | 피드백 요청 Snapshot 생성·보존·취소 정책 | API/DB/Privacy |
| OD-A07 | 파일 저장·미리보기·HWP/PPT 변환 및 포맷별 Version Compare | File Storage |
| OD-A08 | 관리자 학생·기관 Scope 인가 및 **학교 PDF·심화 Task·모의고사·대학/참고자료 운영 권한(전체/기관/지점)** | Auth / Shared / 콘텐츠 공개 |
| OD-A09 | **문서상 ADR-0009로 결정:** 기존 ADR-0003 대체, Assessment 공용 요청함·자동 Staff/과목 배정 없음(API-OD-A09에도 동일 반영). **남은 것: 실제 팀 승인 여부, 기존 Queue 코드/데이터의 물리적 재사용 여부** | ADR-0009 / Shared API / 팀 확인 |
| OD-A10 | 구형 Mentor Surface Scaffold / ADR-0001, Parent ADR-0004 정리 | Shared Architecture |
| OD-A11 | 아카이브·휴지통 삭제/복원/보존 정책 | Persistence/Privacy |
| OD-A12 | 참조자료 검색·외부 출처 사용 정책과 공개 콘텐츠 검수 | External Providers / Copyright |

**OD-A09는 더 이상 피드백 Queue 방식 자체가 미결정이라는 의미가 아니다.** 신규 Assessment 문서 기준은 ADR-0009이고(API-OD-A09 표기 정리 완료), 남은 것은 팀 승인 확인과 기존 Queue 코드/데이터의 물리적 재사용 여부다. 다른 OD는 확정되지 않은 세부 정책이며, `progress.md`는 이 ID 목록을 그대로 참조한다.

Open Decision은 개발 편의로 임의 종결하지 않는다. 구형 기능의 미결정(`ParentReport`, Mentor Q&A 등)은 신규 Assessment 결정 목록에 섞지 않는다.

---

# 32. Domain Invariants 요약

```text
1. Student/Admin은 동일 Assessment·Note·ArtifactVersion Identity를 사용한다.
2. SchoolAssessment와 EnrichmentTask는 서로 다른 업무 객체다.
3. 공식 평가계획서 원본, AI 추출 후보, 관리자 검토값, 학생 개인 수정정보를 구분한다.
4. 수행평가 단계는 시작 전 / 진행 중 / 완료이고 필수 8단계가 아니다.
5. NoteRevision과 ArtifactVersion은 과거 기록을 덮어쓰지 않는다.
6. FeedbackRequest는 요청 당시 Note·파일 Version을 고정한다.
7. Feedback은 승인/반려/재제출 없이 선택적으로 주고받는다.
8. 학생 원문·성찰을 관리자/AI가 몰래 수정하거나 대신 작성하지 않는다.
9. 미지원 Preview/Compare를 동작하는 것처럼 표시하지 않는다.
10. 관리자는 권한 있는 학생 기록을 요청 여부와 무관하게 열람하되 타인 데이터는 볼 수 없다.
11. Admin Shell·Wangyu Student Care/상담·기존 LearnersHigh 공통 기능은 보호한다.
12. 확인되지 않은 외부 자료·평가정보를 사실처럼 만들지 않는다.
13. Derived KPI는 실제 상태를 기준으로 계산한다.
14. UI State와 Domain State를 혼합하지 않는다.
```

---

# 33. Cross-Surface Propagation Matrix

| 변경 | Student | Admin | 다른 기능 영향 |
|---|---|---|---|
| 학교 평가계획서 검토·등록 | 관련 학교·과목 평가정보 조회 | PDF/분석 이력 변경 | 기존 공식 원본을 덮어쓰지 않음 |
| 학생 수행평가 상태 변경 | 목록·상세 상태 반영 | 권한 내 활동 현황 갱신 | 피드백 상태 자동 변경 없음 |
| 노트 수정 | 최신 노트 반영 | 최신 기록 열람 | 과거 피드백 Snapshot 유지 |
| 결과 파일 v3 추가 | 새 Version 열람 | 전체 이력·비교 | v2 피드백 위치 불변 |
| 피드백 요청 | 답변 대기 표시 | 요청 목록 진입 | Assessment 강제 상태 전이 없음 |
| 관리자 답변 전달 | 의견·추천 표시 | 답변 완료 표시 | 학생 본문은 변경되지 않음 |
| 심화 콘텐츠 공개 | 학생 탐구 소재에서 노출 | 콘텐츠 공개 상태 갱신 | 기존 학생 개인 기록 자동 변경 없음 |
| 성장 기록 작성 | 본인 아카이브 갱신 | 권한 내 학생 기록 열람 | 공식 세특 자동 생성 없음 |

---

# 34. Feature별 Domain 책임

| 기능 영역 | 주요 개념 |
|---|---|
| 학교·학업정보 | SchoolContext, SchoolEvaluationPlan, SubjectEvaluation |
| 학교 수행평가 | SchoolAssessment, AI Explanation Candidate |
| 심화 탐구 / 참고자료 | EnrichmentTask, EnrichmentContent, ResourceReference, Scrap, UniversityPublicResource |
| 노트·결과물 | AssessmentNote, NoteRevision, Artifact, ArtifactVersion, NoteTemplate |
| 피드백 | FeedbackRequest, FeedbackSnapshot, FeedbackReply, FeedbackComment |
| 성장·보관 | GrowthRecord, ArchiveView |
| 관리자 운영 | Authorized Student Read Model, Plan/Content Management, Derived Counts |

---

# 35. 개발 순서

전체 순서의 기준은 `CLAUDE.md` §18(설계 게이트 + 구현 Stage)이다. 이 절은 **Domain 관점의 설계 게이트**만 정의한다.

```text
Feature Requirement / Ownership
→ Existing Integration 확인
→ Canonical Identity / Entity / State
→ Snapshot & Version Invariant
→ API Contract / Permission
```

이 게이트를 통과한 Entity·State만 Stage 1 Frontend Mock에 사용한다. Stage 1에서 Mock으로 재현한 Invariant(Snapshot 고정, Artifact별 Version 독립, Admin 읽기 전용 등)는 **화면 표현 검증**일 뿐이다. 실제 보장은 Stage 2 Backend / Persistence / Cross-Surface·Privacy Test로만 확인한다.

기존 Suyeon 기능의 삭제는 **다른 담당자와 공유 코드 참조를 먼저 확인**한 다음 실시한다 (`legacy-cleanup-plan.md`).

---

# 36. Domain 변경 및 완료 판단

```text
[ ] 관련 Feature Spec의 실제 존재·최신성 확인
[ ] Existing LearnersHigh Identity / Write Owner 확인
[ ] 상태 전이·불변조건 정의
[ ] API / DB / Cross-Surface 영향 확인
[ ] Wangyu Student Care·Counseling 영향 없음 확인
[ ] Note/Artifact/Feedback Snapshot 무결성 테스트
[ ] 파일 형식별 Preview·Error Fallback 테스트
[ ] 권한·학생별 자료 분리 테스트
[ ] 테스트 실행 결과를 progress.md에 기록
```

화면이 보인다는 사실만으로 Domain 구현 완료로 보지 않는다. 이 문서는 **설계 기준**이고 실제 구현은 Source Code 및 관련 Test로 검증한다.

---

# 37. 핵심 요약

```text
SchoolEvaluationPlan → SubjectEvaluation → SchoolAssessment
SchoolAssessment / EnrichmentTask → Note + ArtifactVersion
NoteRevision + 선택된 ArtifactVersion → FeedbackSnapshot
FeedbackSnapshot → Admin FeedbackReply → Student 확인
Resource / EnrichmentTask / GrowthRecord → Archive

기존 LearnersHigh의 Source System을 존중한다.
Wangyu Student Care / Counseling은 별도 Domain이다.
학생 기록과 AI 후보를 구분하고, 과거 Version과 Snapshot을 보존한다.
강제 8단계 / 승인·반려 / 필수 재제출은 신규 Assessment에 없다.
```
