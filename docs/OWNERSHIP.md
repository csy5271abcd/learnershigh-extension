# LearnersHigh Extension — Ownership

> 이 문서는 `learnershigh-extension` 프로젝트에서 **누가 어떤 기능과 코드 영역을 담당하는지**, 그리고 **공통 영역을 어떤 절차로 변경할지** 정의한다.  
> Claude Code와 모든 개발자는 구현 전 이 문서를 확인한다.  
> 목적은 병렬 개발 중 **담당 기능 침범, 중복 구현, 공통 코드 충돌, API/DB 불일치**를 방지하는 것이다.

---

# 1. 기본 원칙

프로젝트는 두 명이 병렬 개발한다.

- **최수연 (Suyeon)**
- **유완규 (Wangyu)**

실제 Source Code는 사람 이름이 아니라 **기능 / Domain 기준**으로 구성한다.

좋은 예:

```text
frontend/student/src/features/mentor-hub/
frontend/student/src/features/school-admissions/
frontend/admin/src/features/student-management/
backend/.../school/
backend/.../mentor/
```

피해야 할 예:

```text
frontend/src/features/suyeon/
frontend/src/features/wangyu/
backend/suyeon/
backend/wangyu/
```

담당자 구분은 다음에서 관리한다.

```text
docs/OWNERSHIP.md
.github/CODEOWNERS
```

---

# 2. Ownership 분류

모든 파일과 기능은 다음 세 종류 중 하나로 본다.

```text
1. Suyeon-owned
2. Wangyu-owned
3. Shared
```

각 분류의 의미:

### Suyeon-owned

최수연이 기능 요구사항, 구현, 수정, 검증을 주도한다.

### Wangyu-owned

유완규가 기능 요구사항, 구현, 수정, 검증을 주도한다.

### Shared

두 사람의 기능에 동시에 영향을 주기 때문에
한 사람이 독단적으로 구조를 변경하지 않는다.

---

# 3. Suyeon 담당 범위

최수연 담당 확장 기능:

```text
Mentor Hub
School & Admissions
Admin Student Management
Parent Progress
Mentor Surface
```

---

## 3-1. Mentor Hub

Student가 Mentor 경험과 콘텐츠를 탐색하고 활용하는 기능.

포함:

- Student Mentor Hub Home
- Mentor Recommendation
- Mentor List
- Mentor Profile
- Plan
- Routine
- Story
- Student Q&A
- Record
- Activity Case
- Mentor Case Recommendation 연결
- Mentor Content 저장 / 적용
- Mentor Plan 적용
- Mentor Routine 적용

관련 Spec:

```text
docs/specs/suyeon/features/mentor-hub.md
```

주요 Frontend:

```text
frontend/student/src/features/mentor-hub/**
frontend/admin/src/features/mentor-management/**
```

주요 Backend Domain:

```text
backend/.../mentor/**
```

---

## 3-2. Mentor Surface

Mentor 본인이 사용하는 Surface.

포함:

- My Content
- Content Detail
- Content Edit
- Q&A Inbox
- Question Detail
- Answer
- Create Post
- Preview
- Review Pending
- Mentor Profile

주요 Frontend:

```text
frontend/mentor/**
```

Mentor Surface는 기본적으로 **Suyeon 단독 소유 영역**으로 본다.

단, Mentor 기능이 Wangyu 담당 기능과 직접 연결되는 경우
공통 API / Entity 변경은 Shared 변경 절차를 따른다.

---

## 3-3. School & Admissions

Student의 수행평가 / 성장활동 / Evidence / Archive / Interview 확장 기능.

포함:

- School Home
- Task
- 수행평가 8단계
- Student Task Detail
- Topic
- Evidence
- Version
- AI Analysis
- Feedback 표시
- Revision History
- Growth Activities
- Student Reflection
- Activity Feedback 연결
- Archive
- Cross-subject Connection
- Interview Bridge
- Final Artifact 공유 상태

관련 Spec:

```text
docs/specs/suyeon/features/school-admissions.md
```

주요 Frontend:

```text
frontend/student/src/features/school-admissions/**
frontend/admin/src/features/feedback/**
```

주요 Backend Domain:

```text
backend/.../school/**
```

---

## 3-4. Admin Student Management

관리자가 학생의 학습 / 과제 / 활동 / Feedback / 운영 상태를 확인하는 확장 기능.

포함:

- Feedback Dashboard
- Feedback Queue
- Feedback Review
- Topic Review
- Activity Feedback
- Mentor Case Recommendation
- Today Board
- Student 360
- TestResult
- SchoolRecordSnapshot
- Operations Dashboard
- Admin Settings Integration

관련 Spec:

```text
docs/specs/suyeon/features/student-management.md
```

주요 Frontend:

```text
frontend/admin/src/features/feedback/**
frontend/admin/src/features/student-management/**
```

주요 Backend Domain:

```text
backend/.../studentmanagement/**
```

---

## 3-5. Parent Progress

Parent 전용 App/Web을 새로 만들지 않고,
Admin이 학생의 월간 Progress Report를 생성하고 전달하는 기능.

포함:

- Parent Report List
- Parent Report Editor
- Parent Report Preview
- Monthly Aggregation
- AI Draft
- Task Result
- School Record / Activity
- Final Artifact Share
- Validation
- PDF / Image Generate
- Kakao Delivery State
- Operations Update

관련 Spec:

```text
docs/specs/suyeon/features/parent-progress.md
```

주요 Frontend:

```text
frontend/admin/src/features/parent-progress/**
```

주요 Backend Domain:

```text
backend/.../parentprogress/**
```

---

# 4. Wangyu 담당 범위

유완규는 **상담 관련 기능 전체**를 담당한다.

상담 관련 기능은 Suyeon Feature에 포함하지 않는다.

Wangyu 담당 범위에는 상담 기능의 Student / Parent / Admin / CRM / Backend / DB 흐름 전체가 포함될 수 있다.

예:

```text
Counseling
Parent Counseling
Student Counseling
Joint Counseling
Counseling CRM
Counseling Brief
Counseling Follow-up
Counseling Privacy
Admissions Counseling
Counseling-derived Parent Summary
Counseling-related Today Board Action
Counseling-related Operations KPI
```

상담 기능의 실제 세부 범위는:

```text
docs/specs/wangyu/
```

에서 정의한다.

---

# 5. 상담 기능 경계

이 프로젝트에서 특히 중요한 Ownership 규칙이다.

Suyeon은 다음을 구현하지 않는다.

```text
- Counseling Entity
- Counseling API
- Counseling DB Table
- Counseling CRM
- Parent Counseling
- Student Counseling
- Joint Counseling
- Counseling Brief
- Counseling Follow-up
- Counseling Note
- Counseling Privacy Rule
- Admissions Counseling
- 상담 전용 화면
- 상담 기반 Parent Report Section
- 상담 기반 Today Board Action
- 상담 기반 Operations KPI
```

Suyeon Feature에서 상담 데이터가 나중에 필요해질 가능성이 있더라도,
상담 기능 자체를 Mock으로 만들어 넣지 않는다.

필요한 경우:

```text
Integration Boundary
또는
Shared Contract Placeholder
```

만 정의하고,
실제 Counseling 구현은 Wangyu 담당 영역에 둔다.

예:

```text
Parent Report에서 향후 상담 요약을 받을 수 있음

→ Suyeon이 CounselingSummary Entity를 새로 구현하지 않음
→ Integration Boundary에 외부 입력 가능성을 명시
→ Wangyu 기능이 준비된 후 연결
```

---

# 6. Shared 영역

다음 영역은 특정 개인의 단독 소유로 보지 않는다.

```text
docs/SOURCE_OF_TRUTH.md
docs/OWNERSHIP.md
docs/architecture/**
docs/design/**
docs/api/api-contract.md
docs/adr/**
frontend/shared/**
backend/.../common/**
database/**
scripts/**
e2e/**
.github/**
```

단, Shared라고 해서 누구나 자유롭게 구조를 바꾸는 것은 아니다.

Shared 영역 변경 시 영향 범위를 확인한다.

---

# 7. Shared Entity

다음 Entity는 여러 Surface / Feature에서 함께 사용할 가능성이 높다.

예:

```text
Organization
Staff
Student
Task
Version
Feedback
Evidence
Activity
ActivityFeedback
TestResult
SchoolRecordSnapshot
TaskFinalArtifact
MentorProfile
MentorContent
ParentReport
InterviewQuestion
Connection
```

이 Entity들은 화면마다 별도 Mock Data로 복제하지 않는다.

예:

```text
Student Task Detail의 Task
Admin Feedback Review의 Task
Student 360의 Task

→ 동일 Task Entity를 참조
```

Shared Entity 변경이 필요한 경우:

```text
1. 관련 Feature Spec 확인
2. 양쪽 Domain 영향 확인
3. API Contract 영향 확인
4. DB 영향 확인
5. Frontend Type 영향 확인
6. Backend Domain 영향 확인
7. 필요 시 ADR 작성
8. 합의 후 변경
```

---

# 8. Shared API

다음과 같은 API는 여러 담당 기능에서 사용할 수 있으므로 Shared Contract로 본다.

예:

```text
Student 조회
Task 조회
Feedback 상태
Mentor Content 조회
Parent Report 집계용 Student Data
Common File / Evidence Metadata
```

API Contract의 최종 기준:

```text
docs/api/api-contract.md
```

한 담당자가 API 구조를 변경할 때
다른 담당 기능에 영향이 있다면 독단적으로 변경하지 않는다.

---

# 9. Database Ownership

Database는 기본적으로 Shared 영역이다.

위치:

```text
database/migrations/
database/seed/
```

원칙:

```text
- 이미 존재하는 Table을 임의로 Rename하지 않는다.
- 다른 담당자가 만든 Column을 임의로 삭제하지 않는다.
- Shared Entity 구조를 개인 Feature 편의로 변경하지 않는다.
- Migration 번호 충돌을 방지한다.
- Seed 데이터가 서로 다른 Student/Mentor를 같은 ID로 덮어쓰지 않게 한다.
```

Migration 번호 범위를 분리할 경우 팀 합의 후 사용한다.

예:

```text
Suyeon: V100 ~ V199
Wangyu: V200 ~ V299
Shared: 별도 합의
```

이 범위는 실제 팀에서 확정되기 전까지 임의 적용하지 않는다.

---

# 10. Frontend Ownership

Frontend는 Surface + Feature 기준으로 관리한다.

---

## 10-1. Student

예:

```text
frontend/student/src/features/
├─ mentor-hub/            # Suyeon
├─ school-admissions/     # Suyeon
└─ <wangyu-feature>/      # Wangyu
```

공통 Student Layout, Router, Theme, 공통 API Client는 Shared 영향 영역으로 본다.

---

## 10-2. Admin

예:

```text
frontend/admin/src/features/
├─ feedback/              # Suyeon
├─ student-management/    # Suyeon
├─ parent-progress/       # Suyeon
├─ mentor-management/     # Suyeon
└─ <wangyu-feature>/      # Wangyu
```

Admin Sidebar / Header / Router 등 공통 Shell은 Shared 영향 영역이다.

---

## 10-3. Mentor

```text
frontend/mentor/**
```

기본 소유자:

```text
Suyeon
```

공통 Authentication, Shared API Client, Theme 등은 Shared로 본다.

---

## 10-4. Frontend Shared

```text
frontend/shared/
├─ ui/
├─ theme/
├─ api/
├─ types/
└─ utils/
```

공통 사용 코드만 둔다.

Feature 전용 코드를 편의상 `shared`로 올리지 않는다.

Shared로 이동하기 전 다음 조건을 확인한다.

```text
- 실제로 2개 이상 Surface/Feature에서 사용되는가?
- Business Logic이 Feature-specific하지 않은가?
- 공개 API가 안정적인가?
```

---

# 11. Backend Ownership

Backend는 사람 기준이 아니라 Domain 기준으로 구성한다.

예:

```text
backend/.../
├─ mentor/                 # Suyeon
├─ school/                 # Suyeon
├─ studentmanagement/      # Suyeon
├─ parentprogress/         # Suyeon
├─ <wangyu-domain>/        # Wangyu
└─ common/                 # Shared
```

각 Domain 내부는 Layered MVC로 구성한다. (ADR-0005)

예:

```text
school/
├─ controller/
├─ service/
├─ entity/
├─ repository/
├─ dto/
└─ exception/
```

Student/Admin/Mentor API가 다르더라도
같은 Business Entity라면 Domain을 복제하지 않는다.

---

# 12. Reference Ownership

Reference는 구현 코드와 별도로 관리한다.

```text
references/
├─ existing-runners-high/
└─ claude-design-mockup/
```

원칙:

```text
- Reference는 기본 Read-only
- 담당자가 다르다고 이미지를 별도 복제하지 않음
- 파일명을 임의 변경하지 않음
- 경로 변경 시 관련 Feature Spec도 함께 수정
```

---

# 13. Feature Spec Ownership

각 담당자는 자신의 Spec을 관리한다.

```text
docs/specs/
├─ suyeon/
└─ wangyu/
```

Suyeon:

```text
docs/specs/suyeon/**
```

Wangyu:

```text
docs/specs/wangyu/**
```

다른 담당자의 Feature Spec은
명시적 합의 없이 직접 변경하지 않는다.

오류를 발견하면 먼저 변경 제안을 남긴다.

---

# 14. ADR Ownership

ADR은 개인 문서가 아니라 프로젝트 공통 결정 기록이다.

위치:

```text
docs/adr/
```

다음 경우 ADR을 작성하거나 갱신한다.

```text
- 두 담당자 모두에게 영향을 주는 Architecture 변경
- API 구조의 중요한 변경
- Shared Entity 구조 변경
- 기존 LearnersHigh Integration 전략 변경
- Surface 구조 변경
- DB 구조에 장기 영향이 있는 결정
```

Feature 내부의 작은 UI 결정은 ADR 대상이 아니다.

---

# 15. 변경 권한 규칙

## 15-1. 자신의 Feature

자신의 Feature 내부에서는 다음 작업을 할 수 있다.

```text
- Component 추가/수정
- Feature-local Hook 추가/수정
- Feature-local State 수정
- Feature-local Test 추가
- Feature Spec 업데이트
```

단, Shared 영역에 영향을 주면 Shared 변경 절차로 전환한다.

---

## 15-2. 다른 담당자의 Feature

다른 담당자 소유 영역은 임의 수정하지 않는다.

필요할 경우:

```text
1. 왜 수정이 필요한지 설명
2. 영향 파일 목록 제시
3. Shared Contract로 해결 가능한지 검토
4. 담당자 확인
5. 승인 후 수정
```

---

## 15-3. Shared 영역

Shared 변경은 최소 범위로 한다.

변경 전 확인:

```text
- 어느 Feature가 영향을 받는가?
- API가 바뀌는가?
- DB가 바뀌는가?
- Type이 바뀌는가?
- 기존 테스트가 깨지는가?
```

---

# 16. Claude Code의 Ownership 판단 규칙

Claude Code는 작업 시작 전에:

```text
1. docs/SOURCE_OF_TRUTH.md
2. docs/OWNERSHIP.md
3. 관련 Feature Spec
```

을 확인한다.

Claude는 파일 위치만 보고 소유자를 추측하지 않는다.

예:

```text
backend/common/Student.java
```

이 파일이 Suyeon Feature에서 사용된다고 해서
Suyeon 단독 소유라고 판단하지 않는다.

Shared Entity일 수 있으므로 Ownership과 Domain을 확인한다.

---

# 17. Cross-owner 변경 요청 Template

다른 담당자 영역 수정이 필요하면 다음 형식으로 보고한다.

```text
[CROSS-OWNER CHANGE]

현재 작업:
<Feature / Task>

요청 소유자:
Suyeon | Wangyu

영향받는 담당자:
Suyeon | Wangyu

변경이 필요한 이유:
<설명>

영향 파일:
- ...
- ...

영향 영역:
Frontend:
Backend:
Database:
API:
Docs:

Shared Contract로 해결 가능 여부:
YES | NO

제안:
<최소 변경안>

상태:
WAITING FOR CONFIRMATION
```

확인 전에는 해당 담당자 영역을 수정하지 않는다.

---

# 18. Shared 변경 Template

공통 영역 변경이 필요한 경우:

```text
[SHARED CHANGE]

현재 작업:
<Feature>

변경 대상:
<Shared Entity / API / UI / DB / Architecture>

현재 구조:
<현재 상태>

필요한 변경:
<변경 내용>

영향받는 Feature:
- ...
- ...

영향받는 Surface:
- Student
- Admin
- Mentor

API 영향:
YES | NO

DB 영향:
YES | NO

ADR 필요:
YES | NO

제안:
<최소 변경안>
```

---

# 19. Merge / PR 원칙

각 담당자는 가능하면 자신의 Feature 단위로 Commit / PR을 만든다.

좋은 예:

```text
feat(school): add student task overview
feat(mentor): add mentor plan apply flow
feat(admin): add feedback dashboard
```

피해야 할 예:

```text
feat: update many things
fix: changes
```

PR에서는 최소한 다음을 확인한다.

```text
- Ownership 침범 여부
- Feature Spec 일치 여부
- API Contract 변경 여부
- DB Migration 포함 여부
- Shared 변경 여부
- Test 결과
```

---

# 20. CODEOWNERS와의 관계

`OWNERSHIP.md`는 사람과 Claude가 읽는 **의미적 소유권 문서**다.

`.github/CODEOWNERS`는 GitHub Review 흐름을 위한 **경로 기반 소유권 설정**이다.

둘은 함께 사용한다.

예:

```text
/docs/specs/suyeon/              @suyeon
/frontend/mentor/                @suyeon
/frontend/student/src/features/mentor-hub/ @suyeon
```

단, 실제 GitHub 계정명은 팀에서 확정한 값을 사용한다.

Shared 경로는 필요하면 두 사람 모두 Review 대상으로 둔다.

예:

```text
/docs/api/                       @suyeon @wangyu
/docs/architecture/              @suyeon @wangyu
/frontend/shared/                @suyeon @wangyu
/database/                       @suyeon @wangyu
```

---

# 21. 완료 기준과 Ownership

자신의 Feature를 완료했다고 판단하기 전에:

```text
- 자신의 담당 범위만 수정했는가?
- 다른 담당자의 Feature를 임의 변경하지 않았는가?
- Shared 영역 변경이 있었다면 영향 검토를 했는가?
- API Contract를 맞췄는가?
- DB 변경이 있다면 Migration이 있는가?
- 관련 Test가 통과하는가?
```

를 확인한다.

---

# 22. Ownership 변경

프로젝트 진행 중 담당 범위가 바뀔 수 있다.

담당 변경 시:

```text
1. OWNERSHIP.md 수정
2. CODEOWNERS 수정
3. 관련 specs README 수정
4. progress.md 수정
5. 필요한 경우 API / Domain 책임 범위 확인
```

한다.

과거 Git 작성자나 파일 생성자를 기준으로 새 소유권을 추측하지 않는다.

---

# 23. 핵심 요약

```text
Suyeon
→ Mentor Hub
→ Mentor Surface
→ School & Admissions
→ Admin Student Management
→ Parent Progress

Wangyu
→ 상담 관련 전체 기능
→ 기타 Wangyu 담당 확장 기능

Shared
→ Architecture
→ API Contract
→ Shared Entity
→ frontend/shared
→ backend/common
→ Database
→ Test / CI
→ ADR
```

가장 중요한 규칙:

```text
사람 이름으로 Source Code를 나누지 않는다.
실제 코드는 Feature / Domain 기준으로 나눈다.

다른 담당자의 Feature를 임의로 수정하지 않는다.

Shared 영역은 한 사람의 편의를 위해 독단적으로 변경하지 않는다.

상담 기능은 Wangyu 담당이며
Suyeon Feature에 상담 Entity/API/DB/Mock 기능을 구현하지 않는다.

필요한 경우 Integration Boundary만 정의하고
실제 구현은 담당자 영역에 둔다.
```
