# LearnersHigh Extension — Integration Boundary

> 이 문서는 기존 LearnersHigh와 `learnershigh-extension` 사이의 **통합 경계(Integration Boundary)** 를 정의한다.  
> 목적은 기존 기능을 확장 프로젝트 안에서 중복 구현하지 않고, 필요한 데이터와 기능만 명시적인 Contract를 통해 연결하는 것이다.  
> 구현 중 기존 LearnersHigh와 Extension의 책임이 애매해질 경우 이 문서를 먼저 확인한다.

---

# 1. 목적

`learnershigh-extension`은 기존 LearnersHigh를 새로 만드는 프로젝트가 아니다.

기존 LearnersHigh에는 이미 다음과 같은 기능과 데이터가 존재한다.

```text
Student
├─ Study Timer
├─ Plan
├─ Library
├─ Learning History
├─ Report
├─ Statistics
├─ Performance Task
├─ Diagnosis
└─ Reward

Admin
├─ Branch / Student Management
├─ Study Status
├─ Student Plan
├─ Student Library
├─ Report Center
├─ Study Room
└─ Existing Performance Task
```

Extension은 이 기능을 재구현하지 않고,
필요한 기존 데이터에 연결하여 다음 확장 기능을 제공한다.

```text
Mentor Hub
School & Admissions
Admin Student Management
Parent Progress
+ Wangyu-owned Features
```

---

# 2. 핵심 원칙

## 2-1. Existing First

기존 LearnersHigh에 이미 있는 기능은 가능한 한 재사용한다.

```text
기존 기능 존재
→ 재구현 금지
→ 기존 데이터 / 기능 연결 방법 정의
```

예:

```text
Study Time 필요
→ 신규 Timer 작성 X
→ 기존 Study Session / Study Time 데이터 사용

Plan 필요
→ 신규 Plan 시스템 작성 X
→ 기존 Plan과 연결

Library 필요
→ 신규 Library 작성 X
→ 기존 Library ID / Item을 참조
```

---

## 2-2. Explicit Boundary

기존 시스템과 Extension 사이의 연결은 코드 곳곳에서 직접 접근하지 않는다.

다음과 같은 명시적 경계를 사용한다.

```text
Existing LearnersHigh
        │
        ▼
Integration Adapter / Contract
        │
        ▼
Extension Application / Domain
```

Extension Domain은 기존 LearnersHigh의 내부 구현 세부사항을 가능한 한 알지 않도록 한다.

---

## 2-3. No Hidden Dependency

다음과 같은 숨은 의존성을 만들지 않는다.

```text
Extension Service
→ 기존 DB Table 직접 조회
→ 기존 Column 이름에 강하게 의존
→ 기존 서비스가 바뀌면 Extension 전체가 깨짐
```

대신:

```text
Existing Adapter
→ 필요한 데이터 변환
→ Extension Contract 반환
```

구조를 사용한다.

---

## 2-4. No Duplicate Source of Truth

같은 의미의 데이터를 Extension DB에 복제해서 별도 정답으로 관리하지 않는다.

예:

```text
기존 LearnersHigh Student
+
Extension Student
```

를 별도 Identity로 만들지 않는다.

Extension은 기존 Student Identity를 참조하거나,
통합용 Mapping을 사용한다.

---

# 3. 통합 구조

개념 구조:

```text
┌─────────────────────────────────────┐
│       Existing LearnersHigh         │
│                                     │
│ Student / Plan / Library            │
│ Study Session / Report              │
│ Statistics / Existing Task          │
│ Branch / Admin                      │
└──────────────────┬──────────────────┘
                   │
                   │ Integration Contract
                   ▼
┌─────────────────────────────────────┐
│         Integration Layer           │
│                                     │
│ ExistingStudentAdapter              │
│ ExistingPlanAdapter                 │
│ ExistingLibraryAdapter              │
│ ExistingStudyAdapter                │
│ ExistingReportAdapter               │
│ ExistingTaskAdapter                 │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│      LearnersHigh Extension         │
│                                     │
│ Mentor                              │
│ School                              │
│ Student Management                  │
│ Parent Progress                     │
│ Other Extension Domains             │
└─────────────────────────────────────┘
```

---

# 4. Integration Layer의 역할

Integration Layer는 기존 LearnersHigh의 데이터를 Extension이 사용할 수 있는 형태로 변환한다.

주요 책임:

```text
- 기존 Identifier 수신
- 기존 데이터 조회
- 기존 데이터 구조 → Extension Contract 변환
- Null / Missing Value 처리
- Enum / Status Mapping
- Date / Time 정규화
- 기존 기능 오류를 Extension Error로 변환
```

Integration Layer가 하지 않는 일:

```text
- Extension Business Rule 결정
- Mentor 추천 Logic
- Task Revision Logic
- Parent Report Validation
- Activity Reflection Rule
- Counseling Logic
```

---

# 5. Integration Contract

Extension은 기존 시스템 내부 DTO나 Entity를 직접 사용하지 않는다.

예:

```text
ExistingLearnersHighStudentEntity
```

를 Extension Domain 전체에 전달하지 않는다.

대신 통합 Contract를 사용한다.

예:

```text
ExistingStudentSnapshot
ExistingPlanSnapshot
ExistingLibraryItem
ExistingStudySummary
ExistingReportSummary
```

이 Contract는 Extension이 실제로 필요한 필드만 가진다.

---

# 6. Student Integration

기존 Student는 Extension 전체에서 중요한 기준 Identity다.

Extension이 필요로 할 수 있는 Student 정보 예:

```text
studentId
organizationId
branchId
grade
displayName
status
```

실제 필드는 통합 시 기존 LearnersHigh에서 제공 가능한 값에 맞춰 확정한다.

Extension이 기존 Student에 대해 독립적으로 다음을 생성하지 않는다.

```text
새로운 학생 Account
새로운 학생 식별 체계
별도의 Grade Source
별도의 Organization Source
```

---

# 7. Student Identity

가능하면 기존 LearnersHigh의 Student Identifier를 Extension에서도 Canonical Identifier로 사용한다.

예:

```text
existingStudentId
```

새로운 내부 ID가 기술적으로 필요하다면 Mapping을 명시한다.

예:

```text
ExtensionStudent
├─ id
└─ existingStudentId
```

이 경우:

```text
existingStudentId
```

에 Unique Constraint 또는 동등한 중복 방지 규칙을 둔다.

---

# 8. Organization / Branch Integration

기존 LearnersHigh의 Organization / Branch 정보는 Extension에서 새로 만들지 않는다.

사용 예:

```text
Admin 권한 범위
Student 조회 범위
Today Board 대상
Parent Report 대상
Operations 집계
```

Extension은 기존 Organization / Branch 식별자를 참조한다.

새로운 Institution 관리 시스템을 Extension에서 중복 구현하지 않는다.

---

# 9. Plan Integration

기존 LearnersHigh의 Plan은 Extension에서 여러 기능과 연결될 수 있다.

사용 예:

```text
Mentor Plan Apply
Student 360
Today Board
Parent Progress
```

---

## 9-1. Read

Extension은 필요한 경우 기존 Plan을 읽는다.

예:

```text
최근 7일 Plan 실행률
해당 월 Plan 실행률
기존 일정
과목 / Library 연결
```

---

## 9-2. Mentor Plan Apply

Mentor Plan을 학생 계획에 적용할 때 기존 Plan 기능과 연결한다.

개념:

```text
Mentor Plan
        │
        ▼
Apply Mapping
        │
        ▼
Existing LearnersHigh Plan
```

Extension 안에서 별도 Student Weekly Plan 시스템을 만들지 않는다.

---

## 9-3. Source Metadata

Mentor Plan에서 생성된 기존 Plan Item을 추적할 필요가 있다면
통합 가능한 범위에서 Source Metadata를 유지한다.

예:

```text
sourceType = mentor_plan
sourceId = mentorPlanId
```

기존 LearnersHigh Schema에 직접 Column을 추가하기 전에
Integration 방식 또는 Extension-side Mapping을 먼저 검토한다.

---

# 10. Library Integration

Mentor Plan 또는 School 기능에서 기존 Library를 참조할 수 있다.

예:

```text
Mentor Plan Item
→ Student Existing Library Item Mapping
```

Extension은 기존 Library 전체 기능을 다시 구현하지 않는다.

필요 기능:

```text
Library Item Search
Library Item Select
Library Item ID Reference
```

정도로 제한한다.

---

# 11. Study Time / Study Session Integration

기존 LearnersHigh의 Study Timer가 생성하는 데이터는
Extension의 관리 / Report 기능에서 재사용한다.

사용 예:

```text
Today Board
Student 360
Parent Progress
Operations
```

필요할 수 있는 값:

```text
Today Study Time
Pure Study Time
Recent 7-day Study Trend
Monthly Study Summary
Subject Study Time
```

이 값은 기존 Session 데이터를 기반으로 한다.

Extension에서 신규 Timer 또는 Session 기록 시스템을 만들지 않는다.

---

# 12. Learning History Integration

기존 Learning History는 Extension에서 새로운 원천 데이터로 다시 저장하지 않는다.

사용 예:

```text
Student 360 Study
Today Board change detection
Parent Progress monthly summary
```

필요한 범위의 Summary Contract를 통해 참조한다.

---

# 13. Existing Report Integration

기존 Report 데이터는 Parent Progress 등에서 참고할 수 있다.

그러나 기존 Report 전체를 그대로 Parent Report로 전달하지 않는다.

개념:

```text
Existing Report / Study Data
            │
            ▼
Extension Monthly Aggregation
            │
            ▼
Parent Progress Report
```

Parent Progress는 Extension의 검토된 Snapshot을 만든다.

---

# 14. Existing Statistics Integration

기존 Statistics는 Extension에서 필요한 값만 조회한다.

예:

```text
Study Trend
Plan Completion
Subject Distribution
```

Extension이 동일 통계를 별도 계산해야 한다면
기존 계산 정의와 의미가 같은지 먼저 확인한다.

같은 이름의 KPI를 다른 방식으로 계산하지 않는다.

---

# 15. Existing Performance Task Integration

기존 LearnersHigh에는 수행평가 등록/관리 기능이 이미 존재한다.

Extension의 School & Admissions는 이 기능을 완전히 별개 시스템으로 복제하는 것이 아니라
기존 수행평가 데이터를 확장하는 방향을 우선한다.

---

## 15-1. Existing Task

기존 수행평가에서 이미 존재할 수 있는 정보:

```text
학생
학년
학기
과목
제목
마감일
설명
첨부파일
기존 초안 / 상태
```

실제 제공 가능한 Field는 통합 단계에서 기존 시스템을 확인한 뒤 확정한다.

---

## 15-2. Extension Task Data

School & Admissions에서 새롭게 필요한 정보 예:

```text
Stage
Version
AI Analysis
Feedback
Evidence
Revision
Final Artifact
Archive
```

이 데이터는 Extension Domain에서 관리할 수 있다.

개념:

```text
Existing Performance Task
          │
          │ existingTaskId
          ▼
Extension Task Process
├─ Stage
├─ Version
├─ Feedback
├─ Evidence
└─ Archive
```

---

## 15-3. Duplicate Task 금지

같은 수행평가를:

```text
기존 수행평가
+
Extension 수행평가
```

두 개의 서로 다른 과제로 취급하지 않는다.

Extension Task가 기존 Task를 확장한다면 Mapping을 유지한다.

예:

```text
extensionTask.existingTaskId
```

정확한 DB 구조는 Domain / DB 설계 단계에서 확정한다.

---

# 16. Admin Integration

기존 Admin Account / Organization / Branch 구조를 Extension에서 재생성하지 않는다.

Admin Extension은 기존 Admin Context를 사용한다.

예:

```text
로그인한 Admin
→ organization / branch Context
→ Extension 권한 범위
```

Extension 전용 Admin 계정 시스템을 새로 만들지 않는다.

---

# 17. Authentication Boundary

현재 이 문서는 인증 구현 방식을 확정하지 않는다.

통합 시 원칙:

```text
기존 LearnersHigh 인증이 존재한다면
→ 재사용 가능성을 우선 검토
```

임의로 다음을 추가하지 않는다.

```text
별도 Student Login System
별도 Admin Login System
별도 JWT 정책
별도 User Table
```

인증 구현 방식은 실제 기존 시스템 구조를 확인한 뒤 결정한다.

필요하면 ADR을 작성한다.

---

# 18. Mentor Authentication

Mentor는 기존 LearnersHigh에 존재하지 않을 가능성이 있는 신규 Surface다.

따라서 Mentor Account / Authentication은 별도 설계가 필요할 수 있다.

현재 단계에서는 다음만 확정한다.

```text
Mentor
→ Student/Admin과 별도 Actor
→ Student 관리 권한 없음
→ 자신의 Content / Q&A만 접근
```

실제 로그인 방식은 추측하지 않는다.

---

# 19. Parent Boundary

Parent 전용 App / Web은 Extension 범위에 포함하지 않는다.

현재 Parent Progress의 경계:

```text
Admin
→ Parent Report 생성
→ PDF / Image
→ Delivery
```

Parent가 기존 LearnersHigh 계정을 통해 직접 로그인하는 흐름은
현재 확정된 범위가 아니다.

---

# 20. Counseling Boundary

상담 기능 전체는 Wangyu 담당이다.

Suyeon 담당 Extension은 다음을 구현하지 않는다.

```text
Counseling Entity
Counseling API
Counseling Table
Counseling CRM
Student Counseling
Parent Counseling
Joint Counseling
Counseling Brief
Counseling Follow-up
Counseling Privacy
Admissions Counseling
```

Suyeon Feature가 향후 상담 정보를 필요로 하는 경우에도
상담 구현을 복제하지 않는다.

개념:

```text
Wangyu Counseling Domain
           │
           ▼
Shared / Integration Contract
           │
           ▼
Suyeon Feature
```

필요 시 Contract만 정의하고,
실제 상담 데이터 생성 / 수정 / 비즈니스 로직은 Wangyu Domain이 소유한다.

---

# 21. Frontend Integration Boundary

Extension Frontend에서 기존 LearnersHigh 화면 전체를 복사하지 않는다.

기존 기능과 연결할 때 가능한 방식:

```text
1. Existing Route로 이동
2. Existing Component를 재사용
3. Existing API를 Adapter로 호출
4. Extension에서 Summary만 표시
```

실제 방식은 기존 Frontend 구조 확인 후 결정한다.

---

# 22. Navigation Integration

신규 Navigation은 기존 LearnersHigh Context를 깨지 않도록 추가한다.

Student:

```text
기존 Student Navigation
├─ 기존 기능
├─ Mentor
└─ School
```

Admin:

기존 Sidebar Context 안에 Extension Entry를 연결한다.

Mentor:

신규 Surface로 별도 Navigation을 가진다.

기존 Navigation 전체를 Extension에서 다시 만들지 않는다.

---

# 23. Visual Integration

기존 LearnersHigh 화면은 다음을 유지하기 위한 참고다.

```text
Existing Context
Navigation
Information Density
Interaction Pattern
```

신규 Extension Visual은:

```text
TDS Web Guidelines
+
Claude Design Mockup
```

을 기준으로 한다.

따라서 기존 화면과 신규 화면의 Visual이 완전히 동일할 필요는 없다.

---

# 24. Backend Integration Boundary

Extension Backend가 기존 LearnersHigh Backend와 통합될 때
다음 세 가지 방식을 고려할 수 있다.

```text
A. Existing API 호출
B. Shared Service / Module 사용
C. Approved DB Read Adapter
```

어떤 방식을 사용할지는 기존 시스템 실제 구조를 확인한 뒤 결정한다.

기본 우선순위:

```text
1. 안정적인 Existing API
2. 명확한 Shared Service / Module
3. 제한적 DB Adapter
```

직접 DB 접근은 마지막 선택지로 본다.

---

# 25. Direct DB Access Rule

기존 LearnersHigh DB Table을 Extension이 직접 읽어야 한다면
다음 조건을 만족해야 한다.

```text
- Read 목적이 명확함
- 필요한 Column이 최소화되어 있음
- 기존 Schema 변경에 대한 영향이 문서화됨
- Adapter 안에서 접근함
- Domain 전체에 기존 Table 구조가 노출되지 않음
```

다음은 금지한다.

```text
Controller에서 기존 Table 직접 Query
Frontend에서 DB 구조 추측
여러 Domain에서 각각 동일 Table 직접 Query
```

---

# 26. Write Boundary

기존 LearnersHigh 데이터를 Extension이 수정해야 하는 경우
Read보다 더 엄격하게 관리한다.

예:

```text
Mentor Plan Apply
→ 기존 Student Plan 생성
```

이 경우:

```text
Approved Existing API
또는
명시적인 Integration Service
```

를 우선 사용한다.

기존 Table 직접 INSERT / UPDATE는
기존 시스템의 정합성을 깨뜨릴 수 있으므로 임의 사용하지 않는다.

---

# 27. Integration Adapter 위치

Backend 구조 예:

```text
backend/.../
├─ school/
├─ mentor/
├─ studentmanagement/
├─ parentprogress/
└─ common/
   └─ integration/
      └─ learnershigh/
         ├─ ExistingStudentAdapter
         ├─ ExistingPlanAdapter
         ├─ ExistingLibraryAdapter
         ├─ ExistingStudyAdapter
         └─ ExistingTaskAdapter
```

실제 Package 위치는 코드베이스에 맞게 조정할 수 있다.

핵심은:

```text
Existing-specific code
```

가 Domain 곳곳에 퍼지지 않도록 한 곳에 모으는 것이다.

---

# 28. Anti-Corruption Layer

기존 LearnersHigh의 Naming / Status / Data Shape가
Extension Domain과 다를 수 있다.

이 경우 기존 표현을 Extension Domain에 그대로 퍼뜨리지 않는다.

예:

```text
Existing Status
"DOING"

Extension Domain
IN_PROGRESS
```

Integration Layer에서 변환한다.

```text
Existing
→ Mapper
→ Extension Contract
```

이 역할을 Anti-Corruption Layer로 본다.

---

# 29. Enum / Status Mapping

기존 Status를 Extension Status와 자동으로 동일하다고 가정하지 않는다.

반드시 Mapping을 명시한다.

예:

```text
existingTaskStatus
→ extensionTaskStage
```

두 값이 의미적으로 다른 경우
1:1 Mapping을 억지로 만들지 않는다.

---

# 30. Date / Time Boundary

기존 시스템과 Extension에서 날짜 / 시간 표현이 다를 수 있다.

통합 시:

```text
timezone
date format
datetime precision
period boundary
```

를 명시적으로 정규화한다.

특히:

```text
Today
최근 7일
해당 월
Deadline
Snapshot Date
```

는 동일한 기준으로 계산해야 한다.

공통 Convention은:

```text
docs/architecture/shared-conventions.md
```

에서 정의한다.

---

# 31. File Boundary

기존 LearnersHigh에서 이미 첨부파일을 관리하는 경우
Extension이 별도 File Storage를 무조건 만들지 않는다.

먼저 확인:

```text
기존 File Storage 사용 가능?
기존 fileRef 재사용 가능?
기존 다운로드 API 존재?
```

Extension-specific Evidence / Artifact는 별도 저장이 필요할 수 있으나,
기존 파일과의 연결 방식을 명확히 한다.

---

# 32. Failure Boundary

기존 LearnersHigh 연동이 실패하더라도
Extension이 전체적으로 깨지지 않도록 한다.

예:

```text
Existing Plan API Failure
→ Mentor Plan Apply 실패
→ 명확한 Error
→ Retry 가능
```

금지:

```text
기존 API 실패
→ 빈 배열 반환
→ 사용자가 데이터가 없는 것으로 오해
```

Integration Failure와 Empty Data를 구분한다.

---

# 33. Error Mapping

기존 시스템 Error를 그대로 UI까지 전달하지 않는다.

예:

```text
Existing Error
STUDYPLAN_404_001
```

을:

```text
Extension Error
EXISTING_PLAN_NOT_FOUND
```

처럼 의미 있는 Contract로 변환할 수 있다.

실제 Error Code는 `api-contract.md`에서 정의한다.

---

# 34. Read Model / Snapshot

Extension Dashboard나 Report가 여러 기존 데이터를 조합할 경우
화면마다 기존 API를 무작정 반복 호출하지 않는다.

필요하면 Backend Service에서 Read Model을 조합한다.

예:

```text
Today Board
        │
        ├─ Existing Study Data
        ├─ Existing Plan Data
        ├─ Extension Task Data
        └─ Extension TestResult
              │
              ▼
        TodayBoardView
```

Parent Report:

```text
Existing Study / Plan
+
Extension Task / Activity / Mentor
        │
        ▼
Monthly Snapshot
```

---

# 35. Caching

Caching은 Integration 복잡도를 줄이기 위한 기본 해결책으로 사용하지 않는다.

필요 시:

```text
데이터 Freshness
TTL
Invalidation
Source of Truth
```

을 명확히 한 뒤 도입한다.

실시간성이 필요한 값과
월간 Snapshot은 같은 Cache 전략을 사용하지 않는다.

---

# 36. Synchronization

기존 LearnersHigh와 Extension 사이에 동일 데이터를 양쪽에서 수정하도록 만들지 않는다.

가능하면:

```text
한 시스템 = 한 데이터의 Write Owner
```

원칙을 따른다.

예:

```text
Study Time
Write Owner = Existing LearnersHigh

Extension
= Read Consumer
```

```text
Mentor Content
Write Owner = Extension

Existing LearnersHigh
= 필요 시 Consumer
```

---

# 37. Data Ownership Matrix

초기 기준:

| 데이터 | Write Owner | Extension 역할 |
|---|---|---|
| Student 기본정보 | Existing LearnersHigh | Read / Reference |
| Organization / Branch | Existing LearnersHigh | Read / Reference |
| Study Session / Study Time | Existing LearnersHigh | Read |
| Existing Plan | Existing LearnersHigh | Read / 승인된 방식으로 Create |
| Library | Existing LearnersHigh | Read / Reference |
| Existing Report | Existing LearnersHigh | Read |
| Existing Performance Task 기본정보 | Existing LearnersHigh 우선 | Read / Mapping |
| Task Extension Stage / Version | Extension | Read / Write |
| Feedback | Extension | Read / Write |
| Evidence | Extension 또는 통합 Storage | Read / Write |
| Growth Activity | Extension | Read / Write |
| Mentor Content | Extension | Read / Write |
| Parent Report | Extension | Read / Write |
| Counseling | Wangyu-owned Domain | 해당 Contract를 통해서만 사용 |

실제 기존 시스템 확인 결과에 따라 일부 항목은 ADR로 조정할 수 있다.

---

# 38. Mock Integration During Development

실제 기존 LearnersHigh와 아직 연결할 수 없는 개발 단계에서는
Mock Integration Adapter를 사용할 수 있다.

예:

```text
ExistingPlanClient
├─ MockExistingPlanClient
└─ RealExistingPlanClient
```

중요:

```text
Mock이 Domain에 직접 박히지 않는다.
```

Domain은 동일한 Interface를 사용하고,
실제 통합 시 Adapter만 교체할 수 있어야 한다.

---

# 39. Mock Data Rule

Mock Data는 실제 통합 Contract와 동일한 Shape을 사용한다.

피해야 할 예:

```text
Prototype에서는:
student.name
student.studyHours

실제 Integration에서는:
memberInfo.userNm
studyData.totalPureTime
```

이 차이를 Feature 코드가 직접 처리하지 않는다.

Mock Adapter도 최종 Integration Contract를 반환한다.

---

# 40. Fixture Consistency

Mock Integration에서도 동일 Student Context를 유지한다.

예:

```text
Student S001
→ Existing Plan Mock
→ Existing Study Mock
→ Extension Task
→ Parent Report
```

화면마다 다른 Student 정보나 기간을 임의로 사용하지 않는다.

---

# 41. Migration to Real Integration

Mock → 실제 기존 LearnersHigh 통합 전환 순서:

```text
1. Integration Contract 확인
2. Existing 실제 API / DB 구조 확인
3. Real Adapter 구현
4. Mapping Test
5. Contract Test
6. Feature Integration Test
7. E2E
8. Mock Adapter 제거 여부 판단
```

Mock을 삭제하기 전에 테스트에서 필요한 Fixture Adapter인지 확인한다.

---

# 42. Integration Test

Integration Boundary는 반드시 테스트한다.

우선 테스트 대상:

```text
Existing Student Mapping
Existing Plan Mapping
Existing Library Mapping
Existing Study Summary Mapping
Existing Performance Task Mapping
Existing Error Mapping
```

---

# 43. Contract Test

가능하면 다음을 검증한다.

```text
Existing Adapter Input
→ Expected Extension Contract
```

예:

```text
기존 Plan Response
→ ExistingPlanSnapshot
```

Mapping이 깨지면 Feature 코드가 아니라 Integration Test에서 먼저 발견되게 한다.

---

# 44. Cross-System E2E

실제 통합 이후 중요한 Flow:

```text
Existing Student
→ Extension Student Context
→ School Task
→ Admin Feedback
→ Student Feedback
```

```text
Mentor Plan
→ Existing Student Plan
→ Existing Plan에서 확인
```

```text
Existing Study / Plan
→ Parent Progress
→ Report
```

---

# 45. Observability

실제 Integration에서는 기존 시스템 오류와 Extension 오류를 구분할 수 있어야 한다.

로그 예:

```text
integration=learnershigh
adapter=ExistingPlanAdapter
studentId=S001
operation=getWeeklyPlan
result=failed
```

PII 또는 민감 정보를 불필요하게 로그에 남기지 않는다.

---

# 46. Performance Boundary

기존 LearnersHigh API를 화면마다 반복 호출하는 N+1 형태를 피한다.

예:

```text
Today Board 학생 30명
→ 학생별 Study API 30회
→ Plan API 30회
```

와 같은 구조를 그대로 만들지 않는다.

필요하면:

```text
Batch API
Backend Aggregation
Read Model
```

을 검토한다.

---

# 47. Security Boundary

Extension은 기존 시스템의 권한 검사를 무시하고
더 넓은 데이터 범위를 조회하지 않는다.

특히:

```text
Admin organization scope
Student own-data scope
Mentor privacy scope
```

를 유지한다.

Integration Adapter가 Service Account를 사용하게 되더라도
Service에서 실제 Actor 권한 범위를 검증해야 한다.

---

# 48. PII Boundary

기존 LearnersHigh에 존재하는 개인정보가
Extension에 필요하다는 이유만으로 모두 전달하지 않는다.

최소 정보 원칙:

```text
Feature가 실제 사용하는 값만 Contract에 포함
```

Mentor Surface에는 특히 Student PII를 전달하지 않는다.

---

# 49. Parent Data Boundary

Parent Report에 포함될 수 있는 값과
내부 운영 데이터는 구분한다.

가능:

```text
검토된 Study Summary
Plan Summary
Test Result
Task Result
Confirmed School Record
Approved Activity
Allowed Mentor Usage Summary
Consented Artifact
```

금지:

```text
Raw AI Analysis
Internal Admin Note
Draft Feedback
Unconfirmed Candidate를 확정 정보처럼 표시
Student 미동의 Artifact
```

---

# 50. Counseling Integration Rule

상담 데이터와 Suyeon Feature가 연결될 필요가 생기면
다음 구조를 사용한다.

```text
Wangyu Counseling Domain
        │
        ▼
Published Contract
        │
        ▼
Consumer Feature
```

금지:

```text
Suyeon Feature
→ Counseling Table 직접 조회

Suyeon Feature
→ Counseling Entity 자체 구현

Suyeon Feature
→ Counseling Mock Business Logic 작성
```

---

# 51. Integration Change Procedure

기존 LearnersHigh 연결 방식을 변경할 때:

```text
1. 현재 Integration Contract 확인
2. 변경 이유 정리
3. 영향 Feature 확인
4. api-contract 영향 확인
5. DB 영향 확인
6. 기존 시스템 영향 확인
7. ADR 필요 여부 판단
8. 합의
9. Adapter 수정
10. Integration Test
11. E2E
```

---

# 52. Integration Conflict Template

통합 과정에서 기존 시스템과 Extension 요구가 충돌할 경우:

```text
[INTEGRATION CONFLICT]

현재 작업:
<Feature>

기존 LearnersHigh:
<현재 제공되는 기능 / 데이터>

Extension 요구:
<필요 기능 / 데이터>

충돌:
<무엇이 맞지 않는지>

현재 Source of Truth:
<관련 문서>

가능한 선택:
A.
B.

영향:
Frontend:
Backend:
Database:
API:
Existing System:

권장 최소 변경안:
<제안>

상태:
WAITING FOR CONFIRMATION
```

확인 전 임의로 기존 시스템을 수정하지 않는다.

---

# 53. Integration Boundary Checklist

기존 기능을 연결하는 모든 Feature에서 확인한다.

```text
[ ] 기존 LearnersHigh에 이미 같은 기능이 있는가?
[ ] 재구현하고 있지 않은가?
[ ] 기존 데이터의 Write Owner는 누구인가?
[ ] Extension은 Read만 필요한가?
[ ] Write가 필요하다면 승인된 Interface가 있는가?
[ ] Identifier Mapping이 명확한가?
[ ] Status Mapping이 명확한가?
[ ] Empty와 Integration Error를 구분하는가?
[ ] Adapter를 통해 접근하는가?
[ ] 기존 Schema가 Domain에 노출되지 않는가?
[ ] Mock과 Real Adapter가 같은 Contract를 사용하는가?
[ ] PII를 최소화했는가?
[ ] 다른 Surface / Feature에 영향이 있는가?
[ ] Integration Test가 있는가?
```

---

# 54. 초기 Integration 우선순위

실제 기존 LearnersHigh 연결을 시작할 때
우선 확인할 대상:

```text
1. Student Identity
2. Organization / Branch
3. Authentication Context
4. Plan
5. Library
6. Study Time / Session
7. Existing Performance Task
8. Report / Statistics
```

이 순서는 기술적으로 반드시 강제되는 Migration 순서가 아니라,
Extension의 여러 기능에 영향을 많이 주는 Integration Risk 기준의 권장 순서다.

---

# 55. 현재 확정하지 않는 사항

실제 기존 LearnersHigh 코드 / API / DB를 확인하기 전에는
다음을 임의로 확정하지 않는다.

```text
- 기존 API Endpoint
- 기존 DB Table 이름
- 기존 Column 이름
- 인증 Token 방식
- 기존 파일 저장 방식
- 기존 Plan 생성 API
- 기존 User PK 타입
- 기존 Enum 값
- 기존 Backend Module 구조
```

관련 정보가 확인된 후
`api-contract.md`, Domain, ADR 또는 이 문서를 업데이트한다.

---

# 56. 관련 문서

```text
docs/SOURCE_OF_TRUTH.md
→ 어떤 문서가 최종 기준인지

docs/OWNERSHIP.md
→ 누가 어떤 Feature를 소유하는지

docs/architecture/overview.md
→ 전체 Architecture

docs/architecture/integration-boundary.md
→ 기존 LearnersHigh ↔ Extension 연결

docs/architecture/shared-conventions.md
→ ID / Date / Naming / Status 공통 규약

docs/api/api-contract.md
→ Frontend ↔ Backend API 계약

docs/specs/<owner>/domain.md
→ Entity / State / Data Propagation

docs/specs/<owner>/features/*.md
→ 실제 Feature Behavior

docs/adr/
→ Integration 전략 변경 등의 중요한 결정
```

---

# 57. 핵심 요약

```text
기존 LearnersHigh는 Source System이다.

Extension은 기존 기능을 복제하지 않는다.

기존 데이터를 사용할 때는
Integration Adapter / Contract를 거친다.

한 데이터의 Write Owner를 명확히 한다.

기존 데이터 구조를 Extension Domain에 그대로 퍼뜨리지 않는다.

Mock 개발 단계에서도
실제 Integration Contract와 같은 Interface를 사용한다.

기존 시스템과 요구사항이 충돌하면
추측해서 우회 구현하지 않고 먼저 보고한다.
```

최종 구조:

```text
Existing LearnersHigh
        │
        ▼
Integration Boundary
        │
        ├─ Mapping
        ├─ Error Translation
        ├─ Identity Translation
        └─ Contract
        │
        ▼
LearnersHigh Extension
        │
        ├─ Mentor
        ├─ School
        ├─ Student Management
        ├─ Parent Progress
        └─ Other Domains
```

가장 중요한 규칙:

```text
Reuse before Rebuild.
Reference before Duplicate.
Contract before Coupling.
Adapter before Direct Access.
Confirm before Guessing.
```
