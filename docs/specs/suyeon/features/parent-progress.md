# parent-progress

> 위치: `docs/specs/suyeon/features/parent-progress.md`  
> 이 문서는 기존 `learnershigh-suyeon-feature-spec.md`에서 해당 기능 영역을 분리한 구현용 Feature Spec이다.  
> 공통 Entity / State / Cross-Surface 규칙은 `docs/specs/suyeon/domain.md`를 우선 확인한다.

## 1. Scope

별도 Parent App/Web을 만들지 않고, Admin이 검토된 월간 Student Snapshot을 기반으로 Parent Report를 생성·검토·출력·전달하는 기능을 다룬다.

포함 범위:

```text
Report List
Report Editor
Monthly Aggregation
AI Draft
Task Result
Final Artifact Share
School Record / Activity
Validation
PDF / Image Generate
Kakao Delivery
Operations Update
```

## 2. 반드시 함께 확인할 문서

- `docs/SOURCE_OF_TRUTH.md`
- `docs/OWNERSHIP.md`
- `docs/specs/suyeon/domain.md`
- `docs/architecture/integration-boundary.md`
- `docs/design/tds-web-guidelines.md`
- `docs/api/api-contract.md`

## 3. 공통 경계

- 기존 LearnersHigh 기능을 편의를 위해 중복 구현하지 않는다.
- 기존 기능 연결은 `docs/architecture/integration-boundary.md`를 따른다.
- 신규 Visual은 `docs/design/tds-web-guidelines.md`와 해당 Claude Design Mockup을 따른다.
- Frontend ↔ Backend 형식은 `docs/api/api-contract.md`를 따른다.
- 상담 관련 Entity / API / DB / 화면 / 비즈니스 로직은 이 Spec 범위에 포함하지 않는다.
- 문서 또는 Mockup이 충돌하면 임의로 추측하지 않고 `docs/SOURCE_OF_TRUTH.md`를 따른다.

---

# 4. Feature Requirements

Parent용 별도 App/Web은 만들지 않는다.

Admin이 월간 Report를 생성하고 PDF/Image로 전달한다.

## 정보 우선순위

1. 이번 달 전체 상태
2. 공부시간 / Plan
3. 학교시험 / 모의고사 / 학원 Test
4. 수행평가 결과
5. 잘한 점 / 관리할 점
6. School Record / 활동
7. Mentor 활용
8. 다음 달 Plan
9. Admin 종합 Comment

서비스 내부 사용량은 메인 KPI로 쓰지 않는다.

---

## Report List

Filter:

- Student Search
- Month
- Status

Status:

- Draft
- Reviewing
- Ready
- Sent

Row:

- Student
- Grade
- Period
- Status
- Warning
- Updated At
- Send State
- Action

---

## Report Editor

Desktop 2-column.

```text
LEFT   Content Editor
RIGHT  PDF/Image Preview
```

Section:

1. Monthly Summary
2. Study / Plan
3. Test Result
4. Task Result
5. Strength / Attention
6. School Record / Activity
7. Mentor
8. Next Plan
9. Admin Comment
10. Final Artifact

수정은 Preview에 즉시 반영한다.

---

## Monthly Aggregation

사용:

- Study Time
- Plan Execution
- TestResult
- Task / Final Result
- TaskFinalArtifact
- SchoolRecordSnapshot
- Growth Activity
- Mentor Application

Report는 실시간 Raw Data 화면이 아니라 검토된 월간 Snapshot이다.

---

## AI Draft

AI 후보:

- Monthly Summary
- Strength
- Attention
- Meaningful Change
- Next Plan Candidate

AI는 Draft까지만 만든다.

Admin 확인 후 공개한다.

---

## 수행평가 결과

Parent Report에서는 전체 8단계 과정보다 결과 중심으로 표현한다.

- 수행평가명
- 과목
- 최종 제출 상태
- 학교 평가 결과
- 초안 → 최종 개선점
- Student 동의 Final Artifact

AI Raw와 내부 Feedback 원문은 공개하지 않는다.

---

## Final Artifact Share

Default:

`공유 안 함`

학생이 직접 공유를 허용한다.

가능:

- PDF
- Image
- Presentation
- Document
- Video
- Safe Link

State:

```text
not_shared
→ consented
→ attached
→ shared
```

학생이 발송 전 동의를 해제하면 첨부에서 제거한다.

---

## School Record / Activity

SchoolRecordSnapshot은 반드시:

- confirmed
- candidate

를 구분한다.

candidate를 학교에 실제 반영된 기록처럼 표현하지 않는다.

---

## Validation

발송 전 검사:

### 감소 지표

하락한 점수/학습지표가 있는데 대응 Plan이 없으면:

`Send Disabled`

### School Record

candidate를 confirmed처럼 표현하면 발송 불가.

### Artifact

Student 공유 동의가 없으면 첨부 불가.

---

## Generate / Delivery

```text
Monthly Aggregation
→ AI Draft
→ Admin Review
→ Artifact Consent Check
→ Validation
→ Preview
→ PDF/Image Generate
→ Kakao Delivery
→ Operations Update
```

Generate:

- `ParentReport.status=generated`
- `exportFileRef`

Send:

- `status=sent`
- `sentAt`
- Artifact `parentShareStatus=shared`
- Operations 미발송 Count 감소

Read Status는 신뢰 가능한 외부 정보가 있을 때만 반영한다.

---

---

# 5. Cross-Surface Flow

## 11-8. Parent Report

```text
Study
+ Plan
+ TestResult
+ Task Result
+ SchoolRecord
+ Activity
+ Mentor
+ Artifact Consent
→ ParentReport Draft
→ Validation
→ PDF/Image
→ Kakao Delivery
```

---

---

# 6. Canonical Snapshot / 집계 기준

## 12-3. 시간 기준

화면 Snapshot 시점이 다르면 `snapshotDate`를 구분한다.

예:

- 10/03 V2 검토 대기
- 10/31 최종 결과 완료

## 12-4. 집계 기간

- Today Board Plan = 최근 7일
- Parent Report Plan = 해당 월 전체

기간이 다른 수치를 같은 값처럼 사용하지 않는다.

---

# 7. Guardrail

## 13-2. AI

AI는:

- Analysis
- Suggestion
- Draft

까지만 한다.

최종 판단과 공개 여부는 Admin이 결정한다.

---

# 8. Screen Inventory

- Parent Report List
- Parent Report Editor
- Parent Report Preview
- Generate Result
- Kakao Delivery State

---

# 9. Acceptance Checklist

- [ ] 별도 Parent App/Web을 만들지 않는다.
- [ ] Report List → Editor → Preview → Generate → Delivery가 연결된다.
- [ ] Shared Entity의 검토된 Snapshot을 사용한다.
- [ ] 시험/Plan/Task 결과/활동/Mentor/다음 계획을 포함할 수 있다.
- [ ] 내부 사용량을 메인 KPI로 사용하지 않는다.
- [ ] 감소 지표에 대응 Plan이 없으면 Send가 Disabled 된다.
- [ ] candidate Record를 confirmed로 표현하지 않는다.
- [ ] Student 미동의 Artifact는 첨부되지 않는다.
- [ ] AI Raw와 내부 Feedback 원문을 전달하지 않는다.
- [ ] PDF/Image를 생성할 수 있다.
- [ ] Send 후 ParentReport/Operations 상태가 갱신된다.

---

# 10. 완료 기준

## 구현 완료 기준

Feature가 완료되었다고 판단하려면 화면 존재 여부만 확인하지 않는다.

```text
Requirement
+ Shared Entity
+ Interaction
+ Cross-Surface State
+ Loading/Empty/Error
+ Back Context
+ Permission/Privacy
+ Test
```

새 Visual polish보다 Interaction과 데이터 연결 오류를 우선 수정한다.
