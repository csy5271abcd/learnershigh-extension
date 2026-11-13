# Assessment DB 현황 (2026-11-09)

## 1. 적용한 Migration (사용자 승인: Assessment 전용 신규 파일 추가)

| 파일 | 내용 | 적용 확인 |
|---|---|---|
| `database/migrations/V202611090300__create_assessment_school_assessment.sql` | `assessment_school_assessment` | Testcontainers MySQL 8.4, 로컬 Docker MySQL 8.4(빈 Schema) |
| `database/migrations/V202611090310__create_assessment_evaluation_plan.sql` | 평가계획서 5개 Table | 위와 같음 |

기존 Migration(`V202610131200`, `V202610141000`)은 수정하지 않았다. 두 파일은 아직 커밋 전이다. main에 들어간 뒤에는 수정하지 않고 새 Migration으로 변경한다.

## 2. Table · Entity · Repository

| Table | Entity | Repository | 비고 |
|---|---|---|---|
| `assessment_school_assessment` | `SchoolAssessment` | `SchoolAssessmentRepository` | 학생 개인 관리 정보. `status` CHECK(3값), `evaluationItemRef` 3개 Column은 모두 있거나 모두 없음(CHECK). `@Version` |
| `assessment_evaluation_plan` | `EvaluationPlan` | `EvaluationPlanRepository` | 학교·학년도·학년·학기 슬롯의 문서. 슬롯당 여러 문서 허용. `revision_count` + `@Version` |
| `assessment_plan_revision` | `PlanRevision` | `PlanRevisionRepository` | 파일 메타·SHA-256·쪽수. `UNIQUE(plan_id, revision_number)`. `review_status` CHECK(UNREVIEWED/CONFIRMED) |
| `assessment_plan_analysis_run` | `PlanAnalysisRun` | `PlanAnalysisRunRepository` | AI 후보(불변). `UNIQUE(revision_id, payload_sha256)`로 재전송 중복 방지 |
| `assessment_plan_review` | `PlanReview` | `PlanReviewRepository` | 사람의 검토 기록(불변). decision CHECK(CONFIRM) |
| `assessment_plan_confirmed_value` | `PlanReview.PlanConfirmedValue` | (PlanReview Cascade) | 확정값(불변). `value_json` null = 원문에 없음 |

## 3. 일부러 넣지 않은 것

| 항목 | 이유 |
|---|---|
| `student_id` FK / 기존 학생 Table 참조 | 기존 LearnersHigh 학생 PK·Table 미확정(API-OD-A01). 문자열 ID만 저장 |
| `existingTaskId` 등 기존 수행평가 매핑 Column | OD-A01 미결. 추측하지 않음 |
| Soft Delete(`deleted_at`) | OD-A11 미결 |
| PDF 바이트(BLOB) / Storage Key | File Storage 미결(API-OD-A03, database.md §13) |
| 학생 개인 PDF·개인 정정 Table | §10-2·§11 미구현(OD-A13) |
| "검토 중"·"대체됨" 상태값 | domain.md §9-2 Enum 미확정 |
| `evaluationItemRef` Unique 제약 | 중복은 알림 대상이며 차단·병합하지 않음(domain.md §9-3) |
| Note / Artifact / Feedback Table | P1 미착수 |

## 4. 승인 대기 변경 (제안, 미적용)

- 기존 수행평가(Existing Performance Task)와의 매핑 Column: OD-A01 해결 후 별도 Migration
- Soft Delete Column: OD-A11 해결 후
- `assessment_plan_revision.file_ref`에 실제 Storage Key 기록: Storage 결정 후 (Column은 이미 있음, NULL 허용)
- 값 단위 presence(있음/없음/판독 불가) 저장: 계약 결정 후 `result_json` 구조 또는 별도 Column

## 5. Seed

신규 Seed는 만들지 않았다. Mock 학생·지점 ID는 기존 `MockExistingStudentClient`(stu_001 등)를, 학교·과목 ID는 Frontend Canonical Fixture(`school_001`, `subj_01~04`, `subj_11~14`)를 그대로 쓴다. Wangyu Student Care Seed·Fixture는 바꾸지 않았다.
