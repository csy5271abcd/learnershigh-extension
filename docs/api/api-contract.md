# LearnersHigh Extension — API Contract

> 위치: `docs/api/api-contract.md`  
> 목적: LearnersHigh Extension의 **Frontend ↔ Spring Boot Backend API 계약**을 정의한다.  
> 이 문서는 Endpoint, Actor, Request, Response, Error, State Change의 기준 문서다.  
> Entity / State 의미는 `docs/specs/<owner>/domain.md`, 기능 동작은 각 Feature Spec을 우선 확인한다.

---

# 1. 문서 상태

이 문서는 작성된 Feature Spec과 Domain을 기반으로 정비 중인 **팀 공통 API Contract**다. 신규 Assessment §9~64는 **구현 전 계약 초안(DRAFT)**이며, 문서에 적힌 Endpoint·상태·DTO가 이미 승인·구현·배포되었다는 뜻이 아니다. 기존 공통 규칙과 Wangyu Student Care §65는 계속 유효하다.

다음 항목은 아직 실제 기존 LearnersHigh API / DB / 인증 구조를 확인하지 않았으므로
임의로 확정하지 않는다.

```text
- 기존 Student/Admin 인증 방식
- 기존 User PK 타입
- 기존 Plan API Endpoint
- 기존 Library API Endpoint
- 기존 Study Session API Endpoint
- 기존 Performance Task API Endpoint
- 실제 File Storage Provider
- Assessment PDF 분석 제공자 / 실제 OCR·파싱 지원 범위
- Assessment 파일 미리보기 변환/Storage Provider
```

이러한 항목은 `docs/architecture/integration-boundary.md`를 따른다.

이번 개정은 **기존 수연 담당 Mentor / School & Admissions / Parent Progress / 구형 Admin Management 계약을 신규 Assessment 기능 계약으로 대체**한다. 팀 전체 API 문서의 기본 규칙과 완규님 `§65 Student Care` 계약은 유지한다.

- 학생 기능 `ST-01~ST-20`, 관리자 기능 `AD-01~AD-17`의 계약을 정의한다.
- `/api/student/assessment/**`, `/api/admin/assessment/**`는 신규 설계된 Namespace이며 배포·Controller 구현을 의미하지 않는다.
- 실제 연동·Provider·관리자 운영 권한·삭제/복원 정책·구현 전 검증이 필요한 필드는 §61의 Open Decision으로 관리한다. 학생 비교와 탐구 출처 연결은 본 문서에 **제안 계약**으로 기록하며, 실제 서비스 구현 시 해당 계약 합의를 확인한다.
- 상태 예시에 쓰이는 대문자 영문은 **본 문서가 제안한 API 표현**이다. 기존 DB Enum과 자동 동일시하지 않고, 관련 Domain/Frontend 타입과 합의해 고정한다.


---

# 2. 관련 Source of Truth

```text
docs/SOURCE_OF_TRUTH.md
docs/OWNERSHIP.md
docs/architecture/overview.md
docs/architecture/integration-boundary.md
docs/architecture/shared-conventions.md

docs/specs/suyeon/domain.md
docs/specs/suyeon/features/assessment-student.md
docs/specs/suyeon/features/assessment-inquiry.md
docs/specs/suyeon/features/assessment-feedback.md
docs/specs/suyeon/features/assessment-admin.md
docs/specs/wangyu/features/student-care.md
docs/specs/wangyu/domain.md
```

우선순위:

```text
HTTP Method / Path / Request / Response / Error
→ api-contract.md

Entity / Relationship / State
→ domain.md

사용자 Flow / Interaction
→ Feature Spec

기존 LearnersHigh 연결
→ integration-boundary.md
```

---

# 3. API 기본 원칙

## 3-1. Base Path

```text
/api
```

Actor별 Namespace:

```text
/api/student/**
/api/admin/**
/api/mentor/**  (구형 수연 기능 폐기 대상. 신규 Assessment Endpoint 없음)
```

기존 LearnersHigh Integration API가 따로 필요하다면
Frontend가 직접 호출하지 않고 Backend Integration Layer를 거친다.

---

## 3-2. JSON

기본 Content-Type:

```http
Content-Type: application/json
Accept: application/json
```

파일 업로드가 포함되는 경우:

```http
multipart/form-data
```

또는 Storage Upload Contract 확정 후 `fileRef` 기반 방식을 사용할 수 있다.

---

## 3-3. Naming

JSON Field:

```text
camelCase
```

URL Resource:

```text
kebab-case
```

예:

```text
/api/admin/assessment/evaluation-plans
/api/student/assessment/school-assessments
```

---

## 3-4. ID

ID는 Frontend에서 숫자라고 가정하지 않는다.

```json
{
  "assessmentId": "assessment_001"
}
```

Frontend Type:

```text
string
```

기존 LearnersHigh ID와 Extension ID Mapping은
Integration Layer가 책임진다.

---

## 3-5. Date / Time

날짜:

```text
YYYY-MM-DD
```

시간이 포함된 값:

```text
ISO 8601
```

예:

```json
{
  "deadlineDate": "2026-10-20",
  "submittedAt": "2026-10-09T14:30:00+09:00"
}
```

Timezone 기준은 `shared-conventions.md`에서 최종 정의한다.

---

# 4. 공통 Response 원칙

성공 Response는 불필요한 Wrapper를 여러 단계 만들지 않는다.

단일 Resource 예:

```json
{
  "assessmentId": "assessment_001",
  "title": "AI 윤리 발표"
}
```

목록은 다음 구조를 기본으로 한다.

```json
{
  "items": [],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

Pagination이 필요 없는 소규모 목록은 단순 `items`만 사용할 수 있다.

---

# 5. 공통 Error Format

```json
{
  "code": "ASSESSMENT_NOT_FOUND",
  "message": "수행평가를 찾을 수 없습니다.",
  "details": {},
  "traceId": "optional-trace-id"
}
```

필드:

| Field | 의미 |
|---|---|
| `code` | Frontend가 분기 가능한 안정적인 Error Code |
| `message` | 사용자 또는 개발자에게 전달할 Message |
| `details` | Validation 등 추가 정보 |
| `traceId` | 서버 추적용 Optional 값 |

---

## 5-1. HTTP Status

기본 규칙:

```text
200 OK
201 Created
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
502/503 Integration Failure
```

공통 Error Code (모든 Endpoint):

| Status | Code | 상황 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 필수값 누락, 길이 / 형식 / Enum 오류, 정수 필드에 소수. `details.fields[].field`는 JSON 경로(`plan.goal`) |
| 404 | `NOT_FOUND` | 없는 경로 |
| 405 | `METHOD_NOT_ALLOWED` | 지원하지 않는 Method |
| 406 | `NOT_ACCEPTABLE` | `Accept`가 JSON을 허용하지 않음 |
| 409 | `CONCURRENT_MODIFICATION` | 일반적인 동시 변경 충돌(특정 버전 토큰을 사용하지 않는 공통 API). 다시 조회 후 재시도 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | 해당 Endpoint에서 허용하지 않는 요청 미디어 타입. JSON Endpoint는 `application/json`, 파일 업로드 Endpoint는 명시된 `multipart/form-data` 등을 허용 |
| 500 | `INTERNAL_ERROR` | 예상하지 못한 서버 오류 |

`RESOURCE_VERSION_CONFLICT`(§52~53)는 `expectedRevisionId`/`expectedVersion` 등 **명시적 버전 전제조건 불일치**에 쓰는 Assessment 전용 409 코드다. 공통 `CONCURRENT_MODIFICATION`과 상태 코드는 같지만 적용 조건을 구분한다. 파일 업로드의 `multipart/form-data`는 §10·§25·§38에서 선언된 정상 요청이며 415 대상이 아니다.

---

## 5-2. Validation Error

```json
{
  "code": "VALIDATION_ERROR",
  "message": "입력값을 확인해주세요.",
  "details": {
    "fields": [
      {
        "field": "title",
        "reason": "required"
      }
    ]
  }
}
```

---

# 6. 공통 Integration Error

기존 LearnersHigh 연동 실패와 Empty를 구분한다.

금지:

```text
기존 Plan API 실패
→ items: []
```

권장:

```json
{
  "code": "EXISTING_PLAN_UNAVAILABLE",
  "message": "기존 학습계획 정보를 불러오지 못했습니다.",
  "details": {}
}
```

---

# 7. Actor / Permission 표기

각 Endpoint는 다음 Actor 중 하나를 가진다.

```text
STUDENT
ADMIN
MENTOR  (신규 Assessment에는 사용하지 않음)
```

현재 인증 Token / Session 방식은 미확정이다.

Endpoint의 Actor는 **접근 가능한 사용자 Surface**를 의미한다.

---

# 8. Common Query Convention

검색:

```text
?query=
```

Pagination:

```text
?page=0&size=20
```

정렬:

```text
?sort=updatedAt,desc
```

필터 예:

```text
?status=
?grade=
?type=
?month=
```

실제 허용 Filter는 각 Endpoint에서 명시한다.

---

# 9. Student — Assessment 학업 정보 (ST-01)

Base는 `/api/student/assessment`다. 신규 Assessment는 기존 Student 내비게이션에서만 진입한다. 기존 학적 정보가 있는 경우 Integration Boundary로 조회하며 학생 계정 전체를 별도로 복제하지 않는다.

## 9-0. 현재 학생 표시 정보 (A28-12, 2026-11-22)

```http
GET /api/student/assessment/me
```

```json
{ "studentId": "stu_demo_061", "displayName": "서예린" }
```

- 인증된 학생 본인(`StudentActor`)의 표시 이름. 원천은 기존 LearnersHigh 학생 정보(Integration Boundary — `AssessmentStudentDirectory`; 시연 명단은 플래그 ON 일 때만). 다른 학생 ID 를 받지 않는다(Query·Path 없음 → IDOR 없음).
- 학생 정보에서 찾지 못하면 `displayName: null`(200). 화면은 이름 대신 '학생'을 보이고 다른 학생 이름이나 고정값을 쓰지 않는다. 인증 없음 401.
- 학교·학적·연락처 등 다른 개인정보는 넣지 않는다. 학생 상단 머리글(Global Navigation) 이름 표시에만 쓴다.

## 9-1. 학업 정보 조회

```http
GET /api/student/assessment/academic-context?academicYear=2026&semester=2
```

Actor: `STUDENT`. 소유 학생은 인증 정보에서 결정한다. 다른 학생의 `studentId`를 Query로 받지 않는다.

```json
{
  "school": { "schoolId": "school_001", "name": "예시고등학교" },
  "academicYear": 2026,
  "grade": 1,
  "semester": 2,
  "subjects": [{ "subjectId": "subj_01", "name": "공통국어2" }],
  "source": "EXISTING_LEARNERSHIGH"
}
```

`source`는 원천 출처를 알려주는 응답 메타데이터 후보이며 기존 시스템 확인 후 확정한다. 과목명은 고정 Enum이 아니다.

> **DRAFT 추가 필드 (2026-11-12, Shared 변경 — 팀 승인 대기)**. 근거: `docs/specs/suyeon/assessment-15schools-60students-seed-202611/ACADEMIC-CONTEXT-CHANGES.md`. 원천 확정(OD-A04)은 여전히 미결이다. 기존 필드의 의미는 바꾸지 않는다(추가만).

```json
{
  "schoolClassNumber": 3,
  "schoolStudentNumber": 12,
  "catalogSubjects": [
    { "subjectId": "subj_01", "name": "공통국어2", "subjectGroup": "국어", "curriculumVersion": "2022", "enrolled": true },
    { "subjectId": "subj26_g1s2_02", "name": "공통수학2", "subjectGroup": "수학", "curriculumVersion": "2022", "enrolled": false }
  ]
}
```

| 필드 | 의미 | 비고 |
|---|---|---|
| `schoolClassNumber` / `schoolStudentNumber` | **학교** 반·번호. 학원 반(기존 학생 정보의 반 이름)과 다른 값이다. | 모르면 `null`. 정수. 학교·학년도·학년·반·번호 조합은 한 학생만 가진다. |
| `catalogSubjects[]` | 같은 학년도·학년·학기의 **공통 과목 후보**. 학교별로 다르게 주지 않는다. 공식 개설·필수 과목 목록이 아니다. | 후보가 없는 학기는 `[]`(오류 아님). `curriculumVersion`은 `"2022"`/`"2015"` 문자열(고정 Enum 아님). |
| `catalogSubjects[].enrolled` | 이 학생의 수강 과목(`subjects[]`)에 같은 `subjectId`가 있는지 | **수행평가 등록(§12)은 `subjects[]` 기준 검증 그대로**다. `enrolled=false` 후보로 등록하면 기존과 같은 `400 VALIDATION_ERROR (subjectId: unknown)`. |

- `subjects[]`는 계속 학생 수강 과목이다. 화면은 `catalogSubjects`로 학년·학기 후보 전체를 보여 주되, 수강하지 않는 과목은 선택할 수 없게 구분한다.
- 과목 ID는 학년·학기 슬롯 단위다(같은 이름이라도 학기 슬롯이 다르면 다른 ID일 수 있다).
- Admin 학생 상세의 `academicContexts[]`(§9-1 Shape)도 같은 필드를 가진다.

### 9-1-c. 학적이 있는 학기 목록 (A28-29, 2026-11-23 · DRAFT — 사용자 요청, 팀 승인 별도)

```http
GET /api/student/assessment/academic-terms
```

Actor: `STUDENT`(인증된 본인만). 학기 선택 목록용. 현재 학년도(§9-2 `current-term`, KST)와 앞 두 학년도 × 1·2학기 중 §9-1 학업 정보(원천 학적)가 **있는** 학기만, 최신 학기 먼저.

```json
{
  "currentTerm": { "academicYear": 2026, "semester": 2 },
  "terms": [
    { "academicYear": 2026, "semester": 2 },
    { "academicYear": 2026, "semester": 1 }
  ]
}
```

- 서버는 §9-1 과 같은 원천(`AcademicContextProvider`)으로 학기마다 확인할 뿐 학적을 만들거나 추측하지 않는다. 원천에 없는 학기는 목록에 없다(오류 아님). 학교·학년은 §9-1 로 학기마다 조회한다(전학·학년 변화가 그대로 보인다).
- 원천 조회 자체가 실패하면 §5 오류(5xx) — 빈 목록으로 바꾸지 않는다. 화면은 이 목록이 없을 때(이전 서버) 현재 학년도 1·2학기를 §9-1 로 직접 조회하던 기존 방식으로 동작한다.
- 학기 선택은 조회 필터다(§9-1·assessment-student.md §4). 다른 학기의 개인 기록을 옮기거나 새로 만들지 않는다.

## 9-2. 학업 정보 변경

```http
PUT /api/student/assessment/academic-context
```

```json
{ "schoolId": "school_001", "academicYear": 2026, "grade": 1, "semester": 2, "subjectIds": ["subj_01"] }
```

State Change: **허용된 범위에서** 학업 Context 갱신. 학교·학년 자체의 Write Owner가 기존 LearnersHigh라면 이 API는 해당 쓰기 연동이 확인된 경우에만 활성화한다. 조회 학기만 바꾸는 경우에는 Server Mutation 대신 목록 Query를 사용한다. 과거 노트·파일을 이동시키지 않는다. 미승인 수정: `403 FORBIDDEN` 또는 `409 ACADEMIC_CONTEXT_LOCKED`.

---

# 10. Student — 평가계획서 원본 조회·개인 업로드 (ST-02)

## 10-1. 공통 등록 문서 조회

```http
GET /api/student/assessment/evaluation-plans?schoolId=school_001&academicYear=2026&grade=1&semester=2
GET /api/student/assessment/evaluation-plans/{planId}
```

반환 목록은 문서 이름·출처·학교·학기·개정번호·파일 참조·관리자 검토 상태를 포함한다. 권한 없는 타 학교 문서 또는 비공개 후보는 반환하지 않는다.

**상세 확정값 (A3.5, 2026-11-14 DRAFT — 구현됨)**: `GET .../evaluation-plans/{planId}` 상세에만 공개 Revision의 관리자 확정값 `confirmedFields[]`가 붙는다(목록에는 없음). 항목은 `{ "subjectId": "subj_02", "fieldPath": "performanceEvaluation.weightPercent", "value": 55, "pdfPageNumber": 1 }`이며 `value=null`은 "원문에 없음을 관리자가 확인"이다(0으로 바꾸지 않는다). `pdfPageNumber`는 PDF 근거 쪽이고 HWP·HWPX 근거 위치(`documentLocator`)는 학생에게 보내지 않는다(M-5). AI 후보·분석 상태·경고는 포함하지 않는다. 검토 기록이 없으면 빈 배열.

**A8 보강 (2026-11-15 DRAFT, 승인 대기)**: 평가 정보가 확정된 Revision이 **하나도 없는** 문서(예: 운영계획만 있는 문서)는 운영계획이 확정(§39-6)된 가장 최근 Revision을 공개한다(상세 `confirmedFields = []`, 운영계획은 §10-1-2). 평가 확정본이 있으면 그것이 우선이다.

**학생 공개 범위 (2026-11-13 사용자 결정, OD-A08 관련)**: 관리자가 확정(`PUT .../review`, `reviewStatus=CONFIRMED`)한 Revision이 있는 문서만 반환한다. 업로드·분석만 된 문서는 목록·상세·원문 모두 학생에게 보이지 않는다(상세·원문은 존재를 드러내지 않도록 `404`). 문서마다 **가장 최근에 확정된 Revision**을 보여 주며, 확정 뒤 올라온 미확정 개정본은 확정될 때까지 보이지 않는다. 확정이 곧 학생 공유다(별도 "공유" 상태는 두지 않는다).

### 10-1-1. 원문 열람 (S-4, 2026-11-13 승인)

```http
GET /api/student/assessment/evaluation-plans/{planId}/file      # 원문 내려받기 (형식 그대로, attachment)
GET /api/student/assessment/evaluation-plans/{planId}/preview   # 앱 안 미리보기 (inline, 현재 PDF만)
```

- 대상: 학생 자기 학교·학년도·학년·학기 슬롯 문서의 **공개(최근 확정) Revision**. 그 외는 `404 NOT_FOUND`.
- 서버는 보관한 원문의 크기·SHA-256을 등록 당시 값과 다시 대조한 뒤 내보낸다. 다르면 `409 FILE_INTEGRITY_FAILED`.
- `preview`: PDF 원문만 `200 application/pdf`(inline). HWP·HWPX는 변환 Rendition이 없어 `415 PREVIEW_UNAVAILABLE`(원문 내려받기는 가능). 원문을 보관하지 않은 이전 등록분은 `404`.
- 응답 Header: 정확한 `Content-Type`, `Content-Disposition`(UTF-8 파일명), `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`.

목록·상세 항목에는 원문 정보 `file`(§48 모양)이 붙는다:

```json
{ "file": { "fileRef": "plan_file_plan_rev_002", "fileName": "교과별_평가계획서.pdf", "contentType": "application/pdf",
            "sizeBytes": 245000, "checksum": "<sha256 hex>", "documentFormat": "PDF", "pageCount": 12,
            "available": true, "previewAvailable": true } }
```

```json
{
  "items": [
    { "planId": "plan_001", "documentRevisionId": "plan_rev_002", "schoolId": "school_001", "academicYear": 2026,
      "grade": 1, "semester": 2, "fileName": "교과별_평가계획서.pdf", "sourceUrl": null,
      "reviewStatus": "CONFIRMED", "uploadedAt": "2026-10-20T10:00:00+09:00" }
  ]
}
```

### 10-1-2. 월별 교수·학습 운영계획 (A6, 2026-11-15 DRAFT — 구현됨)

```http
GET /api/student/assessment/evaluation-plans/{planId}/teaching-plan
```

- 대상: §10-1과 같다(학생 자기 슬롯 문서의 **공개(최근 확정) Revision**, 그 외 `404`).
- 그 Revision에 운영계획 확정(§39-6)이 있으면 `CONFIRMED`·`EDITED` 행만, 확정값 그대로 보낸다(`EXCLUDED`·분석 후보·초안·issue는 보내지 않음).
- 응답: `{ planId, documentRevisionId, academicYear, grade, semester, status: CONFIRMED|NOT_CONFIRMED, confirmedAt, rows:[{ subjectId, rowKey, month, monthTo, weekLabel, weekFrom, weekTo, unit, content, note, achievementStandards, teachingMethods, assessmentMethods, specialSchedule, schedule, pdfPageNumber }] }`. 확정 전이면 `status = NOT_CONFIRMED`, `rows = []`(문서는 보이지만 운영계획은 아직 없음 — 오류가 아니다).
- `pdfPageNumber`: 행 근거의 첫 PDF 쪽(Viewer 이동용). HWP·HWPX 근거 위치는 보내지 않는다(M-5).
- 날짜: 원문에 적힌 만큼만(`schedule.precision`). 화면은 연도를 추정하지 않는다(학년도 3~12월 = 그 해, 1~2월은 날짜 칸 없음). 운영계획 행을 공식 수행평가 일정으로 바꾸지 않는다.
- **주차 임시 배치 (A26, 2026-11-17 사용자 결정 — 화면 전용, 계약 Shape 변경 없음)**: `n월 m주`(WEEK_IN_MONTH, 학기 누적 주차 아님) 행은 그 달 달력(일요일 시작)의 m번째 줄 안의 날짜(월~금 우선, 과목명·id 순 결정적 분산)에 '임시 배치'로 표시한다. m~k주는 줄마다 한 번. 줄이 없거나 연도 미확정 달·학기 주차·시기 미정은 배치하지 않는다. 표시 날짜는 **저장·전송하지 않으며** 수행평가 마감·시험일·알림의 근거가 아니다. 화면은 원문 시기와 표시 날짜를 구분해 보여 준다(관리자·학생 같은 함수 `teachingPlanPlacement.tentativeWeekDates`).

## 10-2. 개인 문서 업로드

```http
POST /api/student/assessment/evaluation-plans/uploads
Content-Type: multipart/form-data
```

Parts: `file`(PDF), `academicYear`, `grade`, `semester`, `schoolId`(기존 Context 참조). `201`:

```json
{
  "uploadId": "student_plan_upload_001", "documentRevisionId": "private_rev_001",
  "fileRef": "file_001", "visibility": "PRIVATE", "analysisStatus": "NOT_REQUESTED"
}
```

학생 PDF는 **개인 문서**다. 관리자 공통 평가계획서로 자동 공개하지 않는다. 파일 포맷·크기·악성 파일 차단 실패는 별도 오류로 전달한다. 요청 시 서버는 소유 학생과 학교 Context를 확인한다.

---

# 11. Student — 평가계획서 분석·개인 검토 (ST-02)

```http
POST /api/student/assessment/evaluation-plans/{documentRevisionId}/analysis
GET  /api/student/assessment/evaluation-plans/{documentRevisionId}/analysis
PUT  /api/student/assessment/evaluation-plans/{documentRevisionId}/personal-review
```

분석 요청은 비동기 작업일 수 있다. AI 추출은 **원본과 구별되는 후보 데이터**이고 학생의 수정은 개인 검토본만 변경한다.

```json
{
  "analysisId": "analysis_001", "documentRevisionId": "private_rev_001",
  "status": "PROCESSING", "startedAt": "2026-10-20T10:03:00+09:00"
}
```

완료된 결과 형식의 최소 예(일부만 예시; 원본의 없는 값은 `null`):

```json
{
  "analysisId": "analysis_001", "status": "REVIEW_REQUIRED",
  "subjects": [{
    "subjectName": "통합과학2", "writtenEvaluation": { "weightPercent": 50, "exams": [{ "round": 1, "weightPercent": 25, "questionTypes": ["선택형"] }] },
    "performanceEvaluation": { "weightPercent": 50, "items": [{ "label": "탐구 발표", "weightPercent": 25, "maxScore": null, "timing": null, "rubric": [] }] },
    "achievement": { "standards": [], "levels": [], "thresholds": [] },
    "teachingPlan": [],
    "sources": [{ "pdfPageNumber": 9, "printedPageLabel": "7", "extractedText": "..." }]
  }]
}
```

`writtenEvaluation`과 `performanceEvaluation`을 분리한다. 시험 차수, 평가 비율, 수행 항목·배점·채점기준, 성취수준·기준 성취율, 단원·성취기준·교수학습계획을 **문서에 실제 적힌 범위**에서 반환한다. 위 수치는 JSON 형식 예시이며 공식 학교 기록이 아니다. `pdfPageNumber`는 1-based 표시값이며 변환 엔진의 내부 인덱스와 혼동하지 않는다.

개인 검토 요청 예:

```json
{
  "analysisId": "analysis_001", "corrections": [
    { "fieldPath": "subjects[0].performanceEvaluation.items[0].label", "value": "탐구 발표", "sourcePdfPageNumber": 9 }
  ]
}
```

`fieldPath` 기반 임의 필드 수정은 **허용된 평가 필드 경로 화이트리스트**와 원본 Revision을 서버에서 검증한다. 전체 DTO 및 분석 신뢰도 계산 방식은 파서 기술 결정 후 확정한다. 학생의 개인 정정은 공통 문서의 관리자 확인값을 변경하지 않는다. 분석 실패는 빈 배열이 아닌 `status=FAILED` 또는 명시적 Error.

---

# 12. Student — 학교 수행평가 목록·등록·수정 (ST-03)

```http
GET    /api/student/assessment/school-assessments?academicYear=2026&semester=2&subjectId=subj_01&status=IN_PROGRESS&page=0&size=20
POST   /api/student/assessment/school-assessments
GET    /api/student/assessment/school-assessments/{assessmentId}
PATCH  /api/student/assessment/school-assessments/{assessmentId}
DELETE /api/student/assessment/school-assessments/{assessmentId}
```

Actor `STUDENT`, 소유권 필수. 목록/상세의 상태(`BEFORE_START` / `IN_PROGRESS` / `COMPLETED`)는 **학생 자기 관리 상태**다. 공식 학교 제출 여부나 점수 확정이 아니다.

직접 등록:

```json
{
  "title": "지역 하천 수질 조사", "subjectId": "subj_01", "academicYear": 2026,
  "semester": 2, "deadlineDate": null, "description": "현장 조사 및 발표",
  "status": "BEFORE_START", "evaluationItemRef": null
}
```

PDF로부터 선택 등록 시 `evaluationItemRef`에 확인된 `documentRevisionId`, `subjectId`, `itemKey`의 조합을 사용할 수 있다. **지필평가 항목을 수행평가로 생성하지 않는다.** 확정되지 않은 자동 매핑 ID/필드 조합은 DB 구현 전 Integration과 합의한다.

```json
{
  "assessmentId": "assessment_001", "title": "지역 하천 수질 조사", "subjectId": "subj_01",
  "status": "BEFORE_START", "deadlineDate": null,
  "createdAt": "2026-10-20T10:10:00+09:00", "evaluationItemRef": null
}
```

`PATCH`는 학생이 편집 가능한 필드만 받으며 공식 학교 PDF 공통 정보를 수정하지 않는다. `DELETE`는 보관함의 복원 정책이 확정되기 전에는 **연쇄 영구 삭제가 아님**. Soft Delete/Trash 처리 계약 후보이며 삭제/복구 의미는 §30·§61을 확인한다. 요청 중복 감지는 알림을 우선 제공하며 자동 병합하지 않는다.

### 12-c. 학교 확정 수행평가 자동 등록 (A28-20, 2026-11-22 사용자 지시 · 구현됨 · Migration `V202611220644`)

- **무엇**: 관리자가 평가 정보를 최종 확정(§39·§39-14·§39-15, 재확정 포함)하면, 그 문서 슬롯(학교 키·학년도·학년·학기) 학적이고 그 과목을 수강하는 학생의 **학교 수행평가(§12) 행**으로 확정 수행평가를 등록한다. 학생은 직접 등록 항목과 같은 방법으로 상태·중요·메모·내 평가일·마감·탐구 노트·파일·피드백을 관리한다.
- **원천**: 학생 공개 확정 Revision(평가 정보 확정본 중 최신)의 최신 확정 기록에서 `performanceEvaluation.items[n].label`(필수)·`weightPercent`·`maxScore`·`timing`. 학생 학적의 수강 과목(학업 과목 ID)만. **지필평가·운영계획 행은 만들지 않는다.** 이름이 확정되지 않은 항목은 만들지 않는다.
- **식별자·중복 방지**: `official_key = 문서ID|학업 과목ID|분석 항목 Key`(없으면 `items[n]`), DB UNIQUE(학생, official_key). Revision·확정 기록이 바뀌어도 같은 행. 학교명·제목 유사도로 맞추지 않는다. 학생 직접 등록 항목과 병합하지 않는다(비슷한 이름이어도 별개).
- **응답**: §12 항목에 `official`(학생 직접 등록이면 `null`): `{ planId, status: "ACTIVE"|"WITHDRAWN", timing, weightPercent, maxScore }`. `evaluationItemRef`는 최신 확정 Revision·과목·항목 Key. 날짜(`evaluationDate`·`deadlineDate`)는 **학생 개인 값**이며 자동으로 만들지 않는다(공식 시기는 `official.timing` 문자열). `weightPercent`(개인)는 비어 있으면 화면이 `official.weightPercent`를 보인다.
- **학생 편집**: 학교 확정 행의 `title`은 바꿀 수 없다(다른 값이면 `400 title official_field`). 그 밖의 개인 필드·상태는 직접 등록과 같다. 다른 학생 404, 인증 없음 401.
- **재확정**: 같은 행의 공식 값(이름·반영·만점·시기·확정 출처)만 갱신, 학생 상태·메모·날짜·첨부·피드백 보존. 최신 확정본에서 빠진 항목은 `official.status = WITHDRAWN`(행·기록 보존). 학생이 휴지통으로 보낸 학교 확정 행은 다시 만들지 않는다.
- **시점**: ① 확정 Transaction 안 — 승인한 관리자 담당 지점 학생 중 슬롯 학적 학생(실패하면 확정도 0건). ② `GET /api/student/assessment/school-assessments` 조회 직전 — 그 학생·학기 보완 동기화(별도 Transaction, 멱등, 이미 있으면 쓰기 0, 실패해도 목록은 그대로 응답). **이 GET 은 첫 조회 때 학생 수행평가 행을 만들 수 있다**(학적·확정본에서 정해지는 값만). 관리자 '학생 화면 보기'(읽기 전용)는 동기화하지 않는다. ③ 기존 확정본 1회성 보정: `assessment.school-assessment.official-backfill=dry-run|apply`(기본 꺼짐, 같은 규칙, 재실행 0건).

---

# 13. Student — 수행평가 상태 변경 (ST-03)

```http
PATCH /api/student/assessment/school-assessments/{assessmentId}/status
```

```json
{ "status": "COMPLETED" }
```

```json
{ "assessmentId": "assessment_001", "status": "COMPLETED", "updatedAt": "2026-10-20T10:30:00+09:00" }
```

`BEFORE_START`, `IN_PROGRESS`, `COMPLETED`만 사용한다. 평가기준 미첨부, AI 미사용, 피드백 대기 중에도 완료 처리 가능하다. 구형 8단계·승인·반려·필수 수정 제출을 강제하지 않는다. 역전이 정책이 확정되지 않으면 임의 허용하지 않는다.

**A27-UX 갱신 (2026-11-17, 사용자 결정 · DRAFT):** 학생 자기 관리 상태이므로 **되돌리기(완료 → 진행 중 → 시작 전 등)를 허용**한다. 같은 상태 요청은 변경 없음(재시도 안전). 실제로 바뀐 경우마다 `assessment_school_assessment_status_event`(from·to·시각)에 불변 이력을 남긴다. 교사 평가·공식 제출 상태가 아니므로 관리자 승인 정책과 무관하다. 응답 Shape은 그대로다.

---

# 14. Student — 공식 평가기준 AI 설명·주제 추천 (ST-04·06)

```http
POST /api/student/assessment/school-assessments/{assessmentId}/criteria-explanations
POST /api/student/assessment/school-assessments/{assessmentId}/topic-suggestions
```

공통 Actor: `STUDENT`. 원본 기준이 없을 때 임의 기준을 생성하지 않는다. 응답은 공식 원본에서 분리된 **AI Suggestion**이며 저장할 때도 학생의 명시적 선택 없이 원본 제목/공식 평가값을 덮어쓰지 않는다.

평가기준 설명 요청:

```json
{ "criteriaSourceId": "criteria_001", "question": "이 기준을 구체적인 예시로 설명해줘" }
```

```json
{
  "explanationId": "explain_001", "sourceCriteriaId": "criteria_001",
  "items": [{ "original": "근거의 타당성", "plainExplanation": "자료가 주장과 관련되는지 확인해요.", "example": "공식 통계의 조사연도를 함께 적기" }],
  "disclaimer": "AI 보조 설명이며 학교의 공식 평가기준을 변경하지 않습니다."
}
```

주제명 추천 요청/응답:

```json
{ "subjectId": "subj_01", "curriculumConcept": "생태계", "currentTopic": "하천 조사", "purpose": "관찰 후 발표", "interest": null }
```

```json
{
  "suggestionId": "suggest_001", "items": [
    { "title": "하천 수질 지표와 수생 생물 분포의 관계 분석", "reason": "관측 가능한 변수를 구체화", "inquiryDirection": "측정값 비교" }
  ], "isOfficialSchoolTitle": false
}
```

권장 후보 3~5개는 **정상 생성 시 목표**이고 AI 실패/소재 부족 시 건수 강제하지 않는다. 추천 적용은 `PATCH school-assessments/{id}`의 학생 수정 허용 필드에서만 처리하며 공식 평가 제목은 별도 보존해야 한다. AI Provider/재시도 Rate Limit은 미확정.

---

# 15. Student — 수행평가 꿀팁 (ST-05)

```http
GET /api/student/assessment/tips
GET /api/student/assessment/tips/{tipId}
```

읽기 전용 콘텐츠. 고정 카테고리 여섯 가지: 교과 연계, 진로 연계 선택, 주제 구체화, 과정 기록, 참고자료 출처, 후속 탐구. 이것이 **필수 단계·DB 상태 전이**는 아니다.

```json
{ "items": [{ "tipId": "TIP01", "title": "교과 개념과 연결하기", "body": "...", "relatedActions": ["NOTE", "TOPIC_SUGGESTION"] }] }
```

실제 저장 방식은 코드의 정적 콘텐츠와 DB 중 선택 가능하다. 정적 콘텐츠라면 별도 서버 Endpoint를 구현하지 않아도 되므로 이 절의 GET는 **서버 제공 시 계약**이다.

---

# 16. Student — 심화 탐구 공개 콘텐츠 (ST-16)

```http
GET /api/student/assessment/enrichment/catalog?subjectId=subj_01&query=&page=0&size=20
GET /api/student/assessment/enrichment/catalog/{catalogTaskId}
```

관리자 공개 Task만 반환한다. 미공개, 삭제, 내부 메모는 제외한다. Student 개인 Task와 다른 ID이다.

```json
{
  "items": [{ "catalogTaskId": "catalog_001", "title": "지역 교통 흐름 관찰", "subjectId": "subj_01",
    "goal": "통행량과 시간대의 관계를 조사", "methods": ["관찰", "비교"], "published": true }],
  "page": { "number": 0, "size": 20, "totalElements": 1, "totalPages": 1 }
}
```

---

# 17. Student — 모의고사 탐구 소재·개인 자료 (ST-07)

```http
GET  /api/student/assessment/mock-exam-materials?subjectId=subj_01&query=&page=0&size=20
GET  /api/student/assessment/mock-exam-materials/{materialId}
POST /api/student/assessment/my-mock-exam-materials
GET  /api/student/assessment/my-mock-exam-materials
```

개인 등록은 원문 파일/URL 및 학년·연도·과목·문항 정보와 학생 작성 탐구 메모를 포함한다. 관리자 공개 자료로 자동 전환하지 않는다.

```json
{
  "academicYear": 2026, "examMonth": 9, "grade": 1, "subjectId": "subj_01",
  "questionNumber": "15", "sourceUrl": "https://example.org/official", "sourceFileRef": null,
  "personalNote": "교통 표지와 이동 동선의 관련성 조사"
}
```

예시 URL은 형식 설명용으로만 사용한다. 실제 공식 시험 URL로 간주하지 않는다. 저작권 정책/원본 URL 유효성·PDF 업로드 Provider는 §61에서 결정한다. 공개 카드 안의 출처/탐구 아이디어를 별개 필드로 보존한다.

---

# 18. Student — 개인 심화 Task (ST-16)

> **A12(2026-11-16 사용자 결정): 사용하지 않음.** 학생 자율 심화탐구는 준비된 콘텐츠 열람 전용(Frontend 정적 콘텐츠, `assessment-enrichment-content.md`)이다. 아래 Endpoint는 구현하지 않으며 화면도 호출하지 않는다(Frontend의 Task 생성·수정·상태 변경 함수와 생성·진행 화면 제거). 이미 만들어진 데이터·Migration은 지우지 않는다. 성장 기록의 예전 `ENRICHMENT_TASK` 연결은 이름 없이 '이전 자율 심화탐구 기록'으로만 보인다.

```http
GET    /api/student/assessment/enrichment/tasks?status=IN_PROGRESS&page=0&size=20
POST   /api/student/assessment/enrichment/tasks
GET    /api/student/assessment/enrichment/tasks/{taskId}
PATCH  /api/student/assessment/enrichment/tasks/{taskId}
PATCH  /api/student/assessment/enrichment/tasks/{taskId}/status
```

직접 생성 또는 공개 콘텐츠에서 시작한다.

```json
{
  "title": "시간대별 교통 혼잡 원인 비교", "subjectId": "subj_01", "goal": "교통량과 대기시간 비교",
  "relatedAssessmentId": null, "catalogTaskId": "catalog_001", "status": "BEFORE_START", "deadlineDate": null,
  "sourceReference": null
}
```

`catalogTaskId`는 선택적이며, 학생 개인 `taskId`를 새로 발급한다. 관리자 원본 변경/비공개로 이미 시작한 학생 노트·파일을 덮어쓰지 않는다. 수행평가와 동일한 3개 상태를 사용하되 동일 Entity로 합치지 않는다. 업데이트는 학생 소유자만 가능.

**ST-07·ST-17 출처 연결 — 제안 계약:** 모의고사 탐구 카드나 대학 공개 자료를 보고 개인 Task를 시작하는 경우, 출발한 **자료의 종류와 기존 자료 ID**를 함께 전달할 수 있어야 한다. 다음 형태는 Domain §11 및 `assessment-inquiry.md` §4·§9를 만족하기 위한 **Request 필드 초안**으로, 실제 DTO/DB Enum 확정 전 §61의 검토를 거친다.

```json
{
  "title": "교통시설의 이동 동선 탐구", "subjectId": "subj_01", "goal": "관찰 자료를 비교한다",
  "relatedAssessmentId": null, "catalogTaskId": null,
  "sourceReference": { "type": "MOCK_EXAM_MATERIAL", "sourceId": "material_001" },
  "status": "BEFORE_START", "deadlineDate": null
}
```

`sourceReference.type` 후보는 `MOCK_EXAM_MATERIAL`(관리자 공개 카드), `PERSONAL_MOCK_EXAM_MATERIAL`(학생 개인 자료), `UNIVERSITY_RESOURCE`(공개 대학 자료)다. `sourceId`는 각각 실제 목록·상세 API가 반환한 자료 ID를 참조한다. 출처 없이 학생이 직접 생성하면 `null`을 허용한다. 서버는 자료의 존재·공개 범위·학생 소유권을 검증하고, 관련 출처를 추후 조회할 수 있는 참조로 보존한다. 원문 파일이나 저작권 제한 콘텐츠를 Task에 자동 복제하지 않는다. `catalogTaskId`와의 동시 사용 검증·출처 ID의 장기 보존 방식은 API-OD-A12에 남긴다.

---

# 19. Student — 탐구 노트 템플릿 (ST-09)

```http
GET /api/student/assessment/note-templates
GET /api/student/assessment/note-templates/{templateId}
```

템플릿 10종은 `assessment-inquiry.md` §6의 소제목·이모지를 **노트 본문 블록**으로 제공한다. 기존 본문에 적용할 때는 **새 노트 생성 또는 기존 본문 뒤에 추가**를 명시적으로 선택하게 한다. 기존 내용을 덮어쓰는 ‘교체’를 기본 기능으로 해석하지 않는다.

```json
{
  "templateId": "TPL-02", "name": "실험 보고서",
  "blocks": [{ "type": "HEADING", "text": "🧪 실험 주제와 목적" }, { "type": "PARAGRAPH", "text": "" }]
}
```

템플릿을 정적 Frontend 데이터로 제공한다면 GET를 구현하지 않아도 된다. `templateId`는 표시/문서 추적용 식별자이며 DB PK로 강제하지 않는다.

---

# 20. Student — 탐구 노트 조회·저장 (ST-08)

```http
GET /api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=assessment_001
PUT /api/student/assessment/notes/{noteId}
```

첫 진입 시 노트 미생성이라면 `items: []`로 응답하고 편집기에서 노트 생성을 제공한다. 노트 생성:

```http
POST /api/student/assessment/notes
```

```json
{
  "sourceType": "SCHOOL_ASSESSMENT", "sourceId": "assessment_001", "title": "탐구 과정",
  "blocks": [{ "blockId": "block_001", "type": "HEADING", "text": "🔍 조사 내용" }]
}
```

저장 응답:

```json
{
  "noteId": "note_001", "revisionId": "rev_002", "revisionNumber": 2,
  "savedAt": "2026-10-20T10:15:00+09:00", "updatedAt": "2026-10-20T10:15:00+09:00"
}
```

`PUT /notes/{noteId}` Request 예:

```json
{
  "expectedRevisionId": "rev_001", "title": "탐구 과정",
  "blocks": [{ "blockId": "block_001", "type": "HEADING", "text": "🔍 조사 내용" }]
}
```

업데이트는 `expectedRevisionId`와 **전체 본문 `blocks`**를 사용해 변경 충돌을 검출하는 계약을 기본으로 한다. `blockId`는 노트 내 앵커 안정성을 위한 문자열 ID. Rich-text 중첩 포맷, Editor 버전 관리 및 부분 PATCH 여부는 에디터 선정 후 확정한다. `409 RESOURCE_VERSION_CONFLICT`면 입력 내용 보존·비교/재시도.

---

# 21. Student — 탐구 노트 Revision (ST-08·14)

```http
GET /api/student/assessment/notes/{noteId}/revisions
GET /api/student/assessment/notes/{noteId}/revisions/{revisionId}
```

```json
{
  "items": [{ "revisionId": "rev_001", "revisionNumber": 1, "savedAt": "2026-10-20T10:00:00+09:00" }]
}
```

과거 Revision은 **immutable**이며 학생이 과거 본문을 편집하기 시작하더라도 새 Revision을 생성한다. 피드백 요청이 참조하는 `revisionId`를 현재 최신 Revision으로 자동 치환하지 않는다. 버전 보존 범위/압축/복원 명령은 §61 미확정.

---

# 22. Student — 참고자료 추천·자료함 (ST-10·11)

```http
GET  /api/student/assessment/resources/recommendations?subjectId=subj_01&query=
GET  /api/student/assessment/resources?query=&type=&page=0&size=20
POST /api/student/assessment/resources
GET  /api/student/assessment/resources/{resourceId}
PATCH /api/student/assessment/resources/{resourceId}
```

예시 등록:

```json
{
  "type": "ARTICLE", "title": "도시 생태계 변화 기사", "sourceName": "예시 출처",
  "sourceUrl": "https://example.org/article", "author": null, "publishedDate": null,
  "memo": "통합과학2 발표 참고", "tags": ["환경"], "fileRef": null
}
```

외부 자료원(뉴닉, 크랩, ScienceON, RISS, DBpia, KCI, KOSIS 등)은 **탐색 후보 출처**일 뿐 시스템이 해당 서비스 전체 DB에 접근한다는 뜻은 아니다. 유료·로그인 필요·삭제된 링크와 Provider 실패를 구분한다. 학생 스크랩은 본인 비공개가 기본. 관리자 내부 스크랩은 자동 공개되지 않는다.

---

# 23. Student — 자료를 노트에 삽입 (ST-11)

```http
POST /api/student/assessment/notes/{noteId}/resource-links
```

```json
{ "resourceId": "resource_001", "afterBlockId": "block_001", "expectedRevisionId": "rev_002" }
```

서버가 원본 URL과 제목·출처 메타데이터를 포함하는 편집 가능한 링크 블록을 만들어 새 NoteRevision으로 저장하는 경우에만 이 별도 Endpoint를 구현한다. 클라이언트 에디터에서 블록을 생성해 `PUT notes/{noteId}`로 저장한다면 **이 Endpoint는 구현하지 않고 §20 계약을 재사용**해도 된다. 링크 삽입은 원문 전문 복제·다운로드 승인이 아니다.

---

# 24. Student — 결과물(Artifact) 생성·조회 (ST-12)

```http
GET  /api/student/assessment/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=assessment_001
POST /api/student/assessment/artifacts
GET  /api/student/assessment/artifacts/{artifactId}
PATCH /api/student/assessment/artifacts/{artifactId}
```

```json
{
  "sourceType": "SCHOOL_ASSESSMENT", "sourceId": "assessment_001",
  "title": "실험 보고서", "kind": "REPORT"
}
```

결과물 종류마다 독립 `artifactId`를 생성한다. 노트 자동저장과 결과 파일 업로드는 서로 다른 사용 사례다. `kind` 목록은 실제 UI에서 필요한 유형 확인 후 Enum 확정. 관리자 원본 수정 금지.

---

# 25. Student — ArtifactVersion 업로드·이력 (ST-13)

```http
GET  /api/student/assessment/artifacts/{artifactId}/versions
POST /api/student/assessment/artifacts/{artifactId}/versions
GET  /api/student/assessment/artifacts/{artifactId}/versions/{versionId}
```

업로드:

```http
POST /api/student/assessment/artifacts/{artifactId}/versions
Content-Type: multipart/form-data
```

Parts: `file`, `changeNote`(선택), `expectedLatestVersionId`(동시 업로드 방지용 선택). 응답 `201`:

```json
{
  "versionId": "version_003", "artifactId": "artifact_001", "versionNumber": 3,
  "file": { "fileRef": "file_003", "fileName": "수질보고서_최종.pdf", "contentType": "application/pdf", "sizeBytes": 245000 },
  "changeNote": "그래프 수정", "uploadedAt": "2026-10-20T11:00:00+09:00"
}
```

이전 Version은 변경·삭제·덮어쓰기하지 않는다. 버전 번호는 **각 Artifact 안에서** 증가한다. 동일 보고서의 형식 변경(DOCX → PDF)을 새로운 Artifact로 강제하지 않는다. 파일 업로드 실패 시 Version 성공 상태를 반환하지 않는다.

## 25-1. Student — 본인 결과물 두 버전 비교 (ST-13, 계약 초안)

```http
GET /api/student/assessment/artifacts/{artifactId}/compare?fromVersionId=version_001&toVersionId=version_002
```

Actor `STUDENT`. **인증한 학생 본인 소유 Artifact**에 대해 동일 `artifactId`에 속하는 업로드 완료 버전 두 개만 선택할 수 있다. 다른 학생 파일 ID, 서로 다른 Artifact의 Version 쌍, 미완성 업로드는 접근·비교하지 않는다. 응답 구조와 `METADATA_ONLY` / `STRUCTURED_DIFF` 구분은 위 §37을 재사용한다. 미지원 형식은 두 개별 원본 열람과 변경 메모·파일 메타데이터 비교를 제공하며 가짜 Diff를 생성하지 않는다.

이는 Domain §14-2 및 `assessment-inquiry.md` §8에 명시된 **학생 비교 요구사항을 위한 추가 계약 초안**이다. 실제 변환기 지원 포맷과 응답 스키마의 최종 고정은 API-OD-A12에 남겨둔다.


---

# 26. Student / Admin — 파일 원본·미리보기 (ST-12·13, AD-12)

```http
GET /api/student/assessment/artifacts/{artifactId}/versions/{versionId}/file
GET /api/admin/assessment/artifacts/{artifactId}/versions/{versionId}/file
GET /api/student/assessment/artifacts/{artifactId}/versions/{versionId}/preview
GET /api/admin/assessment/artifacts/{artifactId}/versions/{versionId}/preview
```

`file` 반환은 Backend Stream 또는 짧은 수명의 접근 제한 URL을 사용할 수 있으며 실제 방식은 Storage Provider 확인 후 결정한다. 어떤 경우든 서버가 소유권/관리자 담당 학생 권한을 검사한다. 원본·변환 Preview는 **별개 자원**, 변환 실패는 `PREVIEW_UNAVAILABLE`이지 `ARTIFACT_NOT_FOUND`가 아니다. DOCX/HWP/PPT 미리보기 미지원 시 파일명·MIME·원본 다운로드 가능 여부를 알린다.

---

# 27. Student — 대학 공식 공개 자료 (ST-17)

```http
GET /api/student/assessment/university-resources?university=&academicYear=&query=&page=0&size=20
GET /api/student/assessment/university-resources/{resourceId}
```

학생은 **공개된** 대학 공식 자료 메타데이터/허용된 링크·PDF만 조회한다. 서울대·연세대·고려대·KAIST는 예시 범위이고 대학명은 고정 Enum 아님. 외부 사이트의 이용조건이 허락하지 않는 원문을 임의 미러링하지 않는다. 이 API는 면접 연습/답변 채점 Endpoint가 아니다.

---

# 28. Student — AI 학습 도우미 (ST-18)

```http
POST /api/student/assessment/ai-assistant/messages
```

```json
{
  "sourceType": "ENRICHMENT_TASK", "sourceId": "task_001",
  "question": "이 자료의 주장과 근거를 쉽게 설명해줘", "referenceIds": ["resource_001"],
  "noteRevisionId": "rev_002"
}
```

```json
{
  "messageId": "ai_msg_001", "answer": "핵심 주장은 ...", "citations": [],
  "kind": "SUGGESTION", "savedToNote": false
}
```

학생은 AI 대답을 직접 선택·수정한 뒤 **별도 노트 저장**으로 반영한다. AI 메시지는 학교 공식 사실이나 원본 노트 수정 명령이 아니다. 개인정보·외부 전송 원문 범위는 최소화. 저장/대화 지속성 정책은 별도 합의.

---

# 29. Student — 성장 기록 (ST-19)

```http
GET   /api/student/assessment/growth-records?academicYear=2026&query=&page=0&size=20
POST  /api/student/assessment/growth-records
GET   /api/student/assessment/growth-records/{recordId}
PATCH /api/student/assessment/growth-records/{recordId}
```

```json
{
  "title": "환경 동아리 하천 조사", "subjectId": "subj_01", "activityStartDate": "2026-09-10",
  "role": "수질 측정", "motivation": "지역 환경 관찰", "process": "측정·분석",
  "contribution": "수집한 자료 정리", "difficulty": "측정 오차", "solution": "반복 측정",
  "outcome": "발표 진행", "reflection": "배운 점 ...", "followUp": null,
  "relatedSourceType": "ENRICHMENT_TASK", "relatedSourceId": "task_001", "artifactIds": []
}
```

**학생 개인 성장 기록**이지 공식 세특이나 학교생활기록부가 아니다. 관리자는 읽기 전용으로, AI는 참고 질문/제안까지만 제공한다. 저장 필드의 필수 여부/세부 입력 제약은 검증 규칙 확정 후 적용.

---

# 30. Student — 보관함·즐겨찾기·휴지통 (ST-20)

```http
GET /api/student/assessment/archive?tab=recent&academicYear=2026&query=&page=0&size=20
PUT /api/student/assessment/archive/favorites
POST /api/student/assessment/archive/restore
```

탭: `recent`, `favorites`, `completed`, `previous-semesters`, `trash`. 조회용 Projection이며 각 데이터 소유 원천이 별도의 Archive Core Table을 필요로 한다고 가정하지 않는다.

즐겨찾기/복구 요청 예:

```json
{ "sourceType": "SCHOOL_ASSESSMENT", "sourceId": "assessment_001", "favorite": true }
```

```json
{ "sourceType": "SCHOOL_ASSESSMENT", "sourceId": "assessment_001" }
```

복구 성공의 의미·보존 기간·연쇄 참조·영구 삭제는 정책 확정 대상이다. **복구가 가능한 항목에만** 해당 버튼을 표시한다. `DELETE` 호출이 연결 FeedbackSnapshot/Version을 훼손해서는 안 된다.

**ST-20 삭제·휴지통 대상별 계약 공백(API-OD-A08):**

| 대상 | 현재 초안 | 미확정/추가 계약이 필요한 점 |
|---|---|---|
| `SchoolAssessment` | §12 `DELETE`는 Soft Delete/Trash **후보** | 휴지통 이동 결과·연결 노트/파일 보존·복원 후 상태 |
| `EnrichmentTask` | §18은 조회·수정·상태 변경만 | 보관/휴지통 이동 및 복원 명령 |
| `AssessmentNote` 및 `NoteRevision` | §20~21은 생성·수정·이력만 | 노트 삭제·복원 시 불변 Revision과 Snapshot 참조 보호 |
| `Artifact` / `ArtifactVersion` | §24~26은 결과물·버전 조회/등록만 | 결과물 보관/삭제 범위, 개별 버전 영구 보존 의무 |
| `ResourceReference` / 개인 모의고사 자료 | §17·22는 등록·조회 중심 | 자료 삭제/보관 및 원본 링크 처리 |
| `GrowthRecord` | §29는 등록·수정·조회만 | 휴지통 이동/복원 및 근거 연결 보존 |

위 표는 **삭제 Endpoint가 이미 구현되었다는 뜻이 아니다**. 각 자원별 `DELETE` 또는 Archive Command를 선택하고 복원 가능 기간·접근 권한·영구 삭제·개인정보 삭제 의무를 정할 때까지, 관련 UI는 정책 미확정/미지원으로 명시한다. 신규 삭제·복구 URL을 지금 임의로 늘리지 않는다.

---

# 31. Student — 선택형 피드백 요청 (ST-14)

```http
POST /api/student/assessment/feedback-requests
GET  /api/student/assessment/feedback-requests?status=PENDING&page=0&size=20
GET  /api/student/assessment/feedback-requests/{requestId}
```

요청 시 이미 저장된 NoteRevision/ArtifactVersion만 지정한다. **질문 입력 필수 없음**. 파일 선택은 선택적이고, 노트만으로 요청 가능하다.

```json
{
  "sourceType": "SCHOOL_ASSESSMENT", "sourceId": "assessment_001",
  "noteRevisionId": "rev_002", "artifactVersionIds": ["version_002"]
}
```

`201`:

```json
{
  "requestId": "fbr_001", "status": "PENDING", "requestedAt": "2026-10-20T12:00:00+09:00",
  "snapshot": { "noteRevisionId": "rev_002", "artifactVersionIds": ["version_002"], "locked": true }
}
```

**원자성**: NoteRevision이 실제 저장·확정됐고 선택 파일이 동일 학생/Task의 업로드 완료 버전인지 서버에서 확인한 뒤 Snapshot을 불변 참조로 고정한다. AI 설명·태그 수정/추가 파일 업로드로 기존 Snapshot을 바꾸지 않는다. 같은 요청 중복 전송은 `Idempotency-Key` 권장(§51). 답변 전 취소/재요청 조건은 §61 Open Decision.

---

# 32. Student — 피드백 답변 및 위치별 의견 (ST-15)

```http
GET /api/student/assessment/feedback-requests/{requestId}/reply
```

```json
{
  "requestId": "fbr_001", "status": "DELIVERED", "deliveredAt": "2026-10-21T10:00:00+09:00",
  "reply": { "overallComment": "자료 출처를 명시하면 더 좋아요.", "comments": [
    { "commentId": "comment_001", "targetType": "PDF", "artifactVersionId": "version_002", "location": { "type": "PDF_PAGE", "pageNumber": 3 }, "text": "도표 출처 보완" }
  ], "recommendations": [] }
}
```

답변 대기 중이면 `200 {"requestId":"fbr_001","status":"PENDING","reply":null}`. 관리자 `DRAFT_SAVED`는 학생 조회 응답에 노출하지 않는다. **요청 `PENDING → DELIVERED`는 관리자 답변 전달 성공 때만** 일어나며 임시저장만으로 바뀌지 않는다. 전체 `FeedbackRequest` 상태와 학생의 읽음/확인 UI는 별개다. Reply를 조회하거나 읽었다고 학교 수행평가가 자동 완료되지 않는다. 요청에 없는 파일 버전 코멘트는 반환되지 않아야 한다.

---

# 33. Admin — Assessment 현황 (AD-01·17)

Base: `/api/admin/assessment`. 기존 Admin Shell을 대체하지 않고 메뉴만 확장한다.

```http
GET /api/admin/assessment/overview?schoolId=&academicYear=2026&grade=&semester=
```

```json
{
  "kpi": { "registeredStudents": 24, "schoolAssessments": 58, "enrichmentTasks": 37,
    "feedbackPending": 9, "feedbackDelivered": 18 },
  "recentItems": [], "asOf": "2026-10-20T12:00:00+09:00"
}
```

수치는 전부 **형식 예시**이며 실제 DB 조회의 Derived 결과만 운영에서 사용한다. 기존 Admin 운영 KPI·Student Care 데이터를 신규 Assessment 집계에 합치지 않는다.

**A12 구현 (2026-11-16):** `GET /api/admin/assessment/overview?schoolId=&academicYear=&semester=&grade=` — 요청 시점 DB 계산(저장 Counter 없음). 학생·피드백 수치는 관리자 담당 범위 + 학교·학년(학업 Context) 필터, 평가계획서 수치는 운영 범위(OD-A08)와 학교·학년도·학년 필터, 문서마다 최신 Revision 기준. 응답(위 모양 + 추가, 하위 호환):

```json
{
  "kpi": { "registeredStudents": 1, "schoolAssessments": 3, "enrichmentTasks": 0, "feedbackPending": 1, "feedbackDelivered": 2 },
  "evaluationPlans": { "schools": 1, "documents": 4, "revisions": 5,
    "analysis": { "notRequested": 0, "reviewRequired": 2, "partial": 1, "completed": 0, "failed": 1 },
    "reviewPending": 2, "evaluationConfirmed": 1, "teachingPlanConfirmed": 1, "reReviewInProgress": 0 },
  "oldestPendingRequestedAt": "2026-11-15T10:00:00+09:00",
  "contentCounts": { "mockExamMaterials": null, "scraps": 3 },
  "recentActivity": [{ "type": "PLAN_CONFIRMED", "planId": "plan_…", "revisionId": "plan_rev_…", "title": "파일명.pdf", "detail": "5개 값", "actor": "adm_…", "at": "…" }],
  "asOf": "…"
}
```

- `enrichmentTasks`는 개인 탐구 Task를 만들지 않으므로(§18) 항상 0. `mockExamMaterials`는 학생 정적 콘텐츠라 서버 집계가 아니어서 `null`(화면은 스크랩 수만 표시). `academicYear`·`semester`가 없으면 서버 오늘 날짜로 학기를 정한다(3~8월 1학기).
- `recentActivity.type`: `PLAN_UPLOADED`·`PLAN_ANALYZED`(detail = 분석 상태)·`PLAN_CONFIRMED`·`TEACHING_PLAN_CONFIRMED`·`FEEDBACK_REQUESTED`·`FEEDBACK_DELIVERED`(actor = 학생 ID). 최근 10건.
- 권한: 관리자 인증 필수(없음·학생 `401`).

---

## 33-1. 관리자 담당 학교 (A13, 2026-11-16 사용자 결정 · DRAFT — 구현됨)

```http
GET /api/admin/assessment/managed-schools?academicYear=2026&semester=2
```

- 응답: `{ academicYear, semester, coverage: "ASSIGNED_STUDENTS", items: [{ schoolId, name, studentCount }], studentsWithoutSchool }`.
- 관리자 담당 학생(지점 범위, §17)의 그 학기 학업 Context에서 학교를 **학교 ID 기준으로** 중복 없이 모은다(같은 이름의 다른 학교는 따로). 학생 수 많은 순 → 이름순. 학업 Context가 없는 담당 학생 수는 `studentsWithoutSchool`. 다른 지점 학생의 학교는 나오지 않는다.
- **전체 학교 Master가 아니다**(1팀, API-OD-A01). 새 학교 테이블·전역 학교 검색을 만들지 않았다.
- 화면: 학교별 평가계획서의 학교 선택이 '담당 학생 학교'를 먼저, '평가계획서가 등록된 다른 학교'를 다음으로 보여 준다. 평가계획서 운영 권한(OD-A08: 정상 관리자는 모든 학교)은 줄이지 않았다 — 담당 학생이 없는 학교의 등록 문서도 열 수 있고 학교 코드 직접 입력도 그대로다(사용자 결정 '담당 학교 우선 표시'와의 차이, A13 보고).
- 권한: 관리자 인증 필수(없음·학생 `401`). 지점이 없는 관리자(평가계획서 운영자)는 빈 목록.

# 34. Admin — 학생 Assessment 목록·상세 (AD-02)

```http
GET /api/admin/assessment/students?schoolId=&grade=&query=&page=0&size=20
GET /api/admin/assessment/students/{studentId}
GET /api/admin/assessment/students/{studentId}/school-assessments?academicYear=2026&semester=2
GET /api/admin/assessment/students/{studentId}/enrichment-tasks?academicYear=2026&semester=2
GET /api/admin/assessment/students/{studentId}/growth-records
```

Admin은 **피드백 요청이 없어도** 담당 학생 범위의 Assessment 기록을 읽을 수 있다. 단, 학교·기관·지점·담당 범위 인가는 서버에서 검증한다. `branchId`를 Query에 넣었다고 해당 지점 접근권이 생기는 것은 아니다. 다른 학생의 ID 직접 입력 시에도 접근 거부.

응답 Student Context/과제 목록의 원본 소유자는 기존 LearnersHigh 연동을 준수한다. 학생 Note/Artifact 원문을 이 경로로 수정하는 API는 없다.

---

# 35. Admin — 학생 탐구 노트 읽기 전용 (AD-11)

```http
GET /api/admin/assessment/students/{studentId}/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=assessment_001
GET /api/admin/assessment/students/{studentId}/notes/{noteId}
GET /api/admin/assessment/students/{studentId}/notes/{noteId}/revisions
GET /api/admin/assessment/students/{studentId}/notes/{noteId}/revisions/{revisionId}
```

`200` 응답에 학생의 원본 `blocks`, 이모지 소제목, 표·이미지·링크카드, Revision 메타데이터를 유지한다. 조회 경로는 **GET만** 제공하고 Admin `PATCH/DELETE`는 금지한다. 피드백 의견은 §45를 통해 저장한다. 과거 Snapshot과 최신 Revision 구분 표시.

---

# 36. Admin — 학생 결과물 버전 읽기 (AD-12)

```http
GET /api/admin/assessment/students/{studentId}/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=assessment_001
GET /api/admin/assessment/artifacts/{artifactId}/versions
GET /api/admin/assessment/artifacts/{artifactId}/versions/{versionId}
```

응답에는 `artifactId`, 타입, 제목, `versionId`, 순번, 파일명·MIME·크기·업로드시각·변경메모·Preview 지원여부를 포함한다. 문서 원본 보기/다운로드는 §26. Admin은 다른 담당 학생의 `artifactId`를 추측해도 열 수 없어야 한다. 실제 콘텐츠·파일 수정 명령은 없다.

---

# 37. Admin — 결과물 두 버전 비교 (AD-13)

```http
GET /api/admin/assessment/artifacts/{artifactId}/compare?fromVersionId=version_001&toVersionId=version_002
```

```json
{
  "artifactId": "artifact_001", "fromVersionId": "version_001", "toVersionId": "version_002",
  "comparison": { "mode": "METADATA_ONLY", "changes": [], "reason": "해당 형식의 구조화 비교를 지원하지 않습니다." },
  "versions": []
}
```

같은 `artifactId`의 실제 두 버전인지 검사한다. 변환기 지원 시 `mode=STRUCTURED_DIFF` 형태를 제공할 수 있으나 실제 지원하지 않으면 **원본 두 개 + 변경 메모·파일 메타데이터 비교**로 대체한다. 없는 차이를 생성하지 않는다.


---

# 38. Admin — 평가계획서 등록·개정 (AD-03)

```http
GET  /api/admin/assessment/evaluation-plans?schoolId=school_001&academicYear=2026&grade=1&semester=2
POST /api/admin/assessment/evaluation-plans
GET  /api/admin/assessment/evaluation-plans/{planId}
POST /api/admin/assessment/evaluation-plans/{planId}/revisions
```

```http
POST /api/admin/assessment/evaluation-plans
Content-Type: multipart/form-data
```

Parts: `file`(PDF), `schoolId`, `academicYear`, `grade`, `semester`, `sourceUrl`(선택). `201`:

```json
{
  "planId": "plan_001", "documentRevisionId": "plan_rev_001", "schoolId": "school_001",
  "academicYear": 2026, "grade": 1, "semester": 2,
  "fileRef": "file_plan_001", "analysisStatus": "NOT_REQUESTED", "reviewStatus": "UNREVIEWED"
}
```

한 학년·학기 슬롯에 **여러 PDF/개정본**을 허용한다. 기존 파일 원본을 덮어쓰지 않는다. 관리자가 공통 원본을 바꾸더라도 학생 개인 정정·노트·피드백 Snapshot은 자동 갱신하지 않는다.

### 38-1. 원문 저장·열람 (S-4·S-5, 2026-11-13 승인)

- 허용 형식: `file`은 PDF·HWP·HWPX. 확장자·Content-Type이 아니라 실제 바이트로 판별한다(HWP 5.x 서명·암호/배포용 거절, HWPX 패키지 검사). 20MB 초과 `413`, 그 외 형식 `415 UNSUPPORTED_FILE_TYPE`.
- 서버는 원문 바이트를 형식 그대로 개발용 로컬 격리 Storage(결과물 Storage와 같은 방식, 별도 Root)에 보관하고 Revision에 연결한다. 응답 `fileRef`는 불투명 참조(`plan_file_<revisionId>`)이며 저장 키·경로·외부 URL이 아니다. 2026-11-13 이전 등록분은 원문이 없어 `fileRef=null`, `file.available=false`이다(다른 파일로 채우지 않는다).
- **중복**: 같은 문서(`planId`)에 SHA-256이 같은 파일을 다시 올리면 `409 PLAN_FILE_DUPLICATE`(`details.fields[0] = {field: "file", reason: "duplicate_revision"}`), 파일·Revision이 남지 않는다. 슬롯 단위 Unique는 두지 않는다(같은 슬롯의 여러 문서, 다른 문서의 같은 파일은 허용).
- DB 저장이 실패하면 방금 쓴 원문 파일을 지운다(보상).
- `GET /api/admin/assessment/evaluation-plans/{planId}` 응답의 각 Revision에 `file`(§10-1-1 모양)이 붙는다.

```http
GET /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/file      # 원문 내려받기 (attachment)
GET /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/preview   # 미리보기 (inline, PDF만)
```

오류·Header 규칙은 §10-1-1과 같다(무결성 `409 FILE_INTEGRITY_FAILED`, HWP·HWPX 미리보기 `415 PREVIEW_UNAVAILABLE`, 원문 없음 `404`).
HWP·HWPX 원문은 A10부터 §38-6 구조 미리보기(`.../structure`, 관리자 전용)로 연다. `/preview`의 PDF 전용 동작은 바뀌지 않는다.

### 38-2. 평가계획서 운영 권한 (OD-A08, 2026-11-13 사용자 결정)

**정상 인증된 관리자는 모두 모든 학교의 평가계획서를 등록·개정·분석 수신·검토·확정(학생 공유)한다.** 학교별 운영 목록은 두지 않는다. 이 정책은 평가계획서(§10-1 학생 공개 범위 포함, §38·§39)에만 적용하며, 학생 기록·노트·피드백 조회(§17 지점 범위)와 Student Care 권한은 바뀌지 않는다. 인증이 없거나 알 수 없는 관리자는 `401`. 운영 권한 판단은 인증 경계(Actor Provider)가 관리자에게 부여하는 값으로 분리되어 있어, 실제 LearnersHigh 인증 연동 시 그 Adapter가 같은 값을 채운다(API-OD-A01). 등록자(`uploadedBy`)·확정자(`reviewedBy`)·시각은 Revision·Review 기록으로 추적한다.

### 38-3. 학교 검색 (A5, 2026-11-14 DRAFT — 구현됨)

```http
GET /api/admin/assessment/schools?query=예시&limit=50
```

- **전체 학교 목록이 아니다.** 검증된 학교 Master 원천이 없어(API-OD-A01, 1팀 통합) 평가계획서가 등록된 학교만 돌려준다: `coverage = "REGISTERED_PLANS_ONLY"`, `masterConnected = false`.
- `query`: 학교 코드(`schoolId`) 또는 확인된 이름 부분 일치(대소문자 무시). `limit` 1~100(기본 50), 넘치면 `truncated = true`.
- 항목: `{ schoolId, name, nameSource, planCount, latestAcademicYear }`. `name`은 그 학교 최근 문서 슬롯의 학업 Context에서 확인될 때만(`nameSource = "ACADEMIC_CONTEXT"`), 아니면 `null` — 이름을 지어내지 않는다. 동명 학교 구분은 `schoolId`로 한다(지역·학교급은 Master 연결 후 추가).
- 권한: 평가계획서 운영과 같다(OD-A08). 목록에 없는 학교도 `schoolId`로 등록·운영할 수 있다. 학생 기록·Student Care 권한과 무관하다. 인증 없음·학생 `401`.
- Master 연결 시(1팀): `coverage = "MASTER"`, `masterConnected = true`로 바꾸고 `region`·`schoolKind`를 추가한다(하위 호환).
- **A28-10 (2026-11-22) 같은 학교 한 번만**: 학교알리미 검색으로 만든 `si_` 학교 키가 **같은 학교알리미 고유 ID** 를 쓰는 담당·시연 학교 키(ACTIVE 관리자 매핑 → 시연 명단 고정 순)의 별칭이면 목록에서 빼고 대표 학교 하나만 보인다(문서 수를 합치거나 두 번 세지 않음). 학교 이름만 같고 고유 ID 가 다르면 각각 남는다. 별칭 키의 문서·원본·기록은 지우거나 옮기지 않는다(직접 `schoolId` 조회는 그대로 가능). 이후 학교알리미 검색으로 같은 학교를 고르면 새 `si_` 키를 만들지 않고 대표 학교 키를 쓴다(§38-13).

### 38-4. 문서 슬롯 학업 과목 (A6, 2026-11-15 DRAFT — 구현됨)

```http
GET /api/admin/assessment/evaluation-plans/{planId}/subjects
```

- 응답: `{ planId, schoolId, academicYear, grade, semester, available, source, items:[{ subjectId, name }] }`. 원천은 §39 확정 검증과 같은 학업 Context 슬롯이다(지금은 개발용 Mock, 실제 원천은 API-OD-A01·1팀).
- `available = false`: 그 슬롯의 학업 정보를 찾지 못함(오류 아님, `items = []`) — 화면은 과목 코드 직접 입력으로 대신한다. 과목명으로 ID를 추측해 고르지 않는다.
- 권한: 평가계획서 운영(OD-A08). 인증 없음·학생 `401`.

**학년별 개발용 시연 슬롯 (A18, 2026-11-16 사용자 지시 · DRAFT — 개발용 Mock 전용)**

- 개발용 시연 명단이 켜졌을 때만(`learnershigh.integration.mode=mock` + `assessment.demo-roster.enabled=true`, 기본 OFF) 명단의 **합성 학교**(`sch_demo_*`)마다 과목 카탈로그(§9-1 `catalogSubjects`, 2026학년도)가 있는 **1~3학년 × 1·2학기** 슬롯을 제공한다. `items`는 그 학년·학기의 카탈로그 과목이고, `source = "DEV_DEMO_CATALOG"`다. 이것은 학교별 실제 개설 과목이 아니라 학교 공통 후보다(실제 원천은 API-OD-A01·OD-A04·1팀).
- 기존 슬롯(`school_001` 2026 1학년 1·2학기, 2025·2024 1학년 2학기 — `source = "EXISTING_LEARNERSHIGH"` Mock)은 바뀌지 않는다. 명단이 꺼지면 시연 슬롯도 없다(`available = false`).
- 같은 슬롯 규칙이 §39 평가 정보 확정·§39-6 운영계획 확정(`subjectId` 검사)과 학생 공개(§10-1: 학생 학업 Context의 학교·학년도·학년·학기 = 문서 슬롯)에 그대로 쓰인다. 학년 문맥 충돌(§39-12 `grade_conflict`)은 그대로다 — 슬롯 학년을 바꿔 다른 학년 과목을 확정하지 않는다.
- 학기는 관리자가 등록한 문서 슬롯의 학기다. 원문에서 학기를 추론하지 않는다.
- 학년도는 카탈로그가 있는 2026만이다(다른 학년도 시연 슬롯 없음).

### 38-5. 학년도별 평가계획서 열람 (A9, 2026-11-15 DRAFT — 구현됨, 새 Endpoint 없음)

> A7의 학년도 비교(`GET .../evaluation-plans/comparison`, 연도 간 반영비율 증감·항목 추가/삭제·이름 변경 추정)는 **사용자 요구에서 제외되어 A9에서 제거**했다(Backend Controller·Service·DTO·시험, Frontend 화면·Type·Adapter, E2E). 그 경로는 이제 처리기가 없어 `GET .../evaluation-plans/{planId}`(`planId = "comparison"`)로 해석되어 `404`다. 학년도별 원문·분석 Run·Revision·확정값 데이터는 그대로 보존한다(비교 전용 DB 객체는 없었다).

관리자 화면 흐름: 학교 → 학년도 → 학년·학기 → 문서(원문 파일) → 과목 → 수행평가·세부 채점기준 → 월별 운영계획 → 평가 구성(그 학년도 설명, 비교 없음). **학년도는 독립된 열람 단위**이며 한 번에 한 학년도의 문서만 보여 준다. 기존 API만 조합한다.

| 단계 | API (기존) |
|---|---|
| 학교 목록 | §38-3 `GET /api/admin/assessment/schools` |
| 학년도 목록 | §38 `GET .../evaluation-plans?schoolId=` 의 `academicYear` 집합(실제 등록 문서가 있는 학년도만, 최신순) |
| 그 학년도 문서 | §38 `GET .../evaluation-plans?schoolId=&academicYear=` (학년·학기는 응답의 `grade`·`semester`로 거른다) |
| 원문 열람·내려받기 | §38-1 `.../revisions/{revisionId}/preview` · `.../file` |
| 과목·수행평가·채점기준·운영계획 후보 | §39 `GET .../revisions/{revisionId}/analysis` 의 `subjects[]`(저장된 분석 결과 그대로) |
| 관리자 확정값 | 같은 응답의 `confirmedFields[]` |
| 분석 과목 ↔ 학업 과목 연결 | §39-4 `GET .../review-draft` 의 `draft.subjectLinks[]`. 없고 분석 과목·확정 과목이 각각 하나뿐이면 그 둘을 같은 과목으로 본다(그 밖에는 추정하지 않음) |
| 운영계획 확정 | §39-6 `GET .../teaching-plan-review` (확정 전 `review = null` → 분석 후보 표시) |

- 값 표시 상태(화면 규칙, 새 필드 없음): **관리자 확정**(`confirmedFields` 값) / **원문에 없음(관리자 확정)**(`value = null`) / **원문에 없음(분석)**(0.3 issue `FIELD_NOT_PROVIDED`) / **분석하지 못함**(issue `FIELD_EXTRACTION_FAILED`) / **미확정 후보**(분석값) / **정보 없음**. 값을 만들지 않는다. 채점기준·내용·제출물·조건은 확정 대상이 아니므로 항상 후보로 표시한다.
- 운영계획: 기존 8종 날짜 정밀도를 그대로 쓰고, 그 학기 달 밖 행과 시기를 정할 수 없는 행도 별도 묶음으로 모두 보인다. 0.2 결과(운영계획 필드 없음)는 '원문에 없음'이 아니라 '이전 분석 형식이라 담기지 않음'으로 안내한다.
- HWP·HWPX: 원문은 §38-6 구조 미리보기로 연다(A10, `file.structurePreviewAvailable`). 근거 버튼은 분석 결과 `documentLocator`의 `section`·`path`와 **정확히 같은** 위치만 강조한다(없으면 강조하지 않고 안내). PDF로 변환하지 않으므로 쪽 번호 이동은 없다.
- 분석 과목 ↔ 학업 과목 연결 우선순위(A10): ① 확정값의 `analysisSubjectIndex`(§39-7) ② 초안 `subjectLinks`(①에 없는 번호·과목만) ③ 분석 과목 1개 + 확정 과목 1개. 그 밖에는 추정하지 않는다.
- 권한: 평가계획서 운영(OD-A08). 관리자 전용 화면이며 학생 공개 범위(§10-1)는 바뀌지 않는다.

### 38-6. HWP·HWPX 원문 구조 미리보기 (A10, 2026-11-15 DRAFT — 구현됨)

```http
GET /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/structure
```

- **PDF로 변환하지 않는다.** 서버가 보관한 원본 바이트(크기·SHA-256 재확인)를 메모리에서 직접 읽어 문단·표(병합 칸 포함)·캡션·글상자 글을 JSON으로 돌려준다. 외부 프로그램·외부 서버·유료 SDK를 쓰지 않는다(JDK 표준 기능만). 원본·Revision·Storage에 쓰지 않고 파생 파일·임시 파일을 만들지 않으며 결과를 저장하지 않는다.
- 응답: `{ planId, revisionId, documentFormat: "HWP"|"HWPX", sha256, renderer:{name, version}, sectionCount, stats:{paragraphs, tables, cells, textChars}, notices[], blocks[] }`.
  - `blocks[]`: `{ type: "PARAGRAPH", section, path, kind, text, control?, blocks? }` 또는 `{ type: "TABLE", section, path, table, rows, cols, cells[], caption? }`. `cells[]` = `{ row, col, rowSpan, colSpan, path, paragraphs[] }`(row·col 0부터, 화면 배치용).
  - `kind` = `HWP_PARAGRAPH`·`HWP_TABLE_CELL`·`HWPX_PARAGRAPH`·`HWPX_TABLE_CELL`·`CONTROL_TEXT`(캡션·글상자, `control`에 개체 이름).
  - `section`·`path`는 분석 결과 `documentLocator`와 **같은 위치 규칙**이다(최상위 `p<n>`, 문단 안 n번째 개체 `.c<k>`, 칸 `.r<row>c<col>`, 칸 문단 `.p<m>`, 캡션 `.cap.p<m>`, 개체 안 문단 `.x<m>`). 공개 평가계획서 4,192건(HWP 3,283·HWPX 909, 확장자 `.hwp`인 HWPX 5건 포함)을 계정 B DocumentModel 판독과 대조해 위치·글자가 모두 같음을 확인했다. HWPX 칸 안에 표가 있으면 분석기는 안쪽 표의 병합 값을 읽는데, 이 응답의 `rowSpan`·`colSpan`은 그 칸의 직계 값이다(위치 `path`는 같다).
  - 쪽 나눔·글꼴·그림·도형·수식 배치는 담지 않는다(조판 결과가 아니라 문서 구조다).
- 관리자 상세(§38) `revisions[].file.structurePreviewAvailable`: 원문을 보관한 HWP·HWPX면 `true`, PDF·원문 없음은 `false`. 학생 응답에는 없다.
- 오류: PDF `415 PREVIEW_UNAVAILABLE`(기존 `/preview` 사용), 원문 없음 `404`, 무결성 `409 FILE_INTEGRITY_FAILED`, 판독 실패 `422 PLAN_PREVIEW_FAILED` + `details.fields[0] = { field: "file", reason }` — `parse_failed`(손상·지원하지 않는 구조) · `limit_exceeded`(위치 250,000개·글자 8,000,000자·중첩 16단계·압축 해제 128MB(HWPX ZIP 100MB·항목 2,000개) 초과) · `timeout`(기본 10초, `assessment.plan-preview.structure-timeout-ms`) · `protected`(암호·배포용).
- 보안: HWPX XML은 DOCTYPE 금지·외부 엔터티/DTD/스키마 접근 금지·Secure Processing, ZIP 경로 이탈 이름 거절. 글자는 화면이 문자열로만 넣는다(HTML로 해석하지 않음). `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`.
- 권한: 평가계획서 운영(OD-A08). 인증 없음·학생·알 수 없는 관리자 `401`, 다른 문서의 Revision `404`.
---

### 38-9. 평가계획서 문서 삭제 (A25, 2026-11-17 DRAFT — 구현됨)

```http
DELETE /api/admin/assessment/evaluation-plans/{planId}?schoolId=school_001&confirmPublished=false
```

- **논리 삭제**: 문서에 `deleted_at`·`deleted_by`만 남긴다(Migration `V202611170100`). Revision·원문 파일·분석 Run·검토·확정 기록·운영계획 검토는 지우지 않는다(감사·무결성). 영구 삭제·복원·보존 기간은 정하지 않았다(OD-A11과 같은 미결).
- 삭제된 문서는 모든 조회에서 빠진다: §38 관리자 목록·상세·원문·검토 경로 `404`, §38-3 학교 검색 수, §10-1 학생 목록·상세·원문, Monthly Planner(§10-1 운영계획) — **학생 공개도 함께 해제**된다.
- `schoolId`(필수): 문서의 학교와 다르면 `404`(잘못된 대상 삭제 방지). 운영 권한은 §38-2(OD-A08) 그대로 — 인증 없음·학생 `401`, 운영 권한 없음 `403`.
- 학생 공개 중(확정된 Revision이 있음)인데 `confirmPublished=true`가 없으면 `409 PLAN_DELETE_CONFIRMATION_REQUIRED`, 아무것도 바뀌지 않는다. 화면이 영향을 알리고 확인받은 뒤 `true`로 다시 보낸다.
- 그 문서의 Revision을 서버가 분석 중이면 `409 PLAN_ANALYSIS_IN_PROGRESS`.
- 이미 삭제된 문서를 다시 지우면 `404`(보이지 않는 문서). 동시 개정 등록과 겹치면 낙관적 잠금으로 한쪽이 `409`.
- 같은 학생이 이미 만든 학교 수행평가(§12 `evaluationItemRef`)는 학생 자료이므로 지우지 않는다. 삭제된 문서의 항목을 새로 참조하는 등록은 `unknown`으로 거절된다.

`200`:

```json
{ "planId": "plan_…", "schoolId": "school_001", "deletedAt": "2026-11-17T03:00:00Z", "wasPublished": true, "revisionCount": 2 }
```

### 38-10. HWP·HWPX 원문 PDF 변환 미리보기 (A25, 2026-11-17 DRAFT — 구현됨, 새 Endpoint 없음)

- 기존 `GET .../revisions/{revisionId}/preview`(관리자)·`GET /api/student/assessment/evaluation-plans/{planId}/preview`(학생, 공개 Revision만)가 HWP·HWPX에서도 동작한다: 서버에 변환기가 설정되어 있으면(`assessment.preview.converter.mode=docker|soffice`) **미리보기용 변환 PDF**를 `application/pdf`·`inline`으로 주고 헤더 `X-Preview-Rendition: converted-pdf`를 붙인다. 파일 이름은 `<원본 이름> (미리보기 변환).pdf`.
- 변환 PDF는 **원본이 아니다**: 원본 크기·SHA-256 확인(§38-1) 뒤 변환하고, 원본 Revision 파일은 바꾸지 않는다. `/file` 다운로드는 계속 원본 HWP·HWPX다. 변환본은 (Revision ID, 원본 SHA-256, 변환기 ID) 키로 캐시한다.
- 변환기 미설정(`none`): `415 PREVIEW_UNAVAILABLE`. **A26: 기본값은 `docker`** — Backend 기동 직후 이미지(Dockerfile 해시 Tag)가 없으면 백그라운드로 만든다(기동을 막지 않음, 한 번에 하나, 실패 시 60초 뒤 재시도). 준비 전·Docker 꺼짐·이미지 준비 실패는 `503 PLAN_PREVIEW_PREPARING`(일시 원인, 실패로 기록하지 않음). 시험·CI는 `none`, 운영은 `auto-provision=false` + 미리 만든 이미지(`docker-image`) 또는 `soffice`. 변환 실패·시간 초과·출력 이상: `422 PLAN_PREVIEW_FAILED`(메시지에 원인 코드만). 같은 원본의 확정 실패는 기록해 다시 변환하지 않는다(일시 원인 — 변환기 실행 불가·바쁨 — 은 기록하지 않음).
- 변환기: LibreOffice headless + H2Orestart(HWP 5.x·HWPX), 네트워크 없는 일회용 컨테이너(이미지: `backend/src/main/resources/assessment/preview-converter/Dockerfile`). 문서를 외부 서비스로 보내지 않는다. 글꼴 대체로 줄바꿈·쪽 나눔이 원본과 다를 수 있다.
- **근거 위치**: HWP·HWPX 분석 근거는 `documentLocator`(구역·표·행·열)이고 변환 PDF 쪽과 대응 정보가 없다. 화면은 근거를 변환 PDF 쪽으로 옮기지 않고, §38-6 구조 미리보기('분석용 구조')에서 강조한다. `previewAvailable`(PDF 원문 미리보기 여부)의 의미는 바꾸지 않는다.

# 39. Admin — 지필·수행 추출·원본 검토 (AD-04·05)

```http
POST /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/analysis
GET  /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/analysis
PUT  /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/review
```

공통 분석 결과 스키마는 §11의 `subjects[].writtenEvaluation`, `performanceEvaluation`, `achievement`, `teachingPlan`, `sources[]`를 사용한다. Admin의 수정/확인본은 학생 개인 정정값과 별도 버전이다.

```json
{
  "analysisId": "analysis_001", "reviewedSubjects": [
    { "subjectId": "subj_01", "confirmedFields": [
      { "fieldPath": "performanceEvaluation.weightPercent", "value": 50, "pdfPageNumber": 9 }
    ] }
  ], "decision": "CONFIRM"
}
```

### 39-7. 다과목 PDF 확정값의 분석 과목 연결 (A10, 2026-11-15 DRAFT — 구현됨)

- PDF 요청의 `reviewedSubjects[].analysisSubjectIndex`를 **선택 항목**으로 받는다(§62-2의 PDF `not_allowed` 규칙을 이 항목에 한해 대체). 값은 그 분석 결과 `subjects[]` 안의 번호(0부터)이며, 관리자 화면이 고른 분석 과목이다. 과목명·배열 순서로 서버가 추측하지 않는다.
- 검증: 범위 밖 `unknown`, 두 검토 과목이 같은 번호 `duplicate`(HWP·HWPX와 같은 사유 코드). 없으면 이전처럼 연결 정보 없이 저장한다(하위 호환).
- 저장: 확정값 행의 `analysis_subject_index`(Migration `V202611151300` — CHECK 제약만 교체, 데이터 변경 없음). 확정과 함께 남으므로 검토 초안이 닫혀도 과목 연결이 보존된다.
- 응답: 관리자 `confirmedFields[].analysisSubjectIndex`(값이 있을 때만, NON_NULL — 이전 PDF 확정값 응답은 그대로). **학생 응답에는 내보내지 않는다**(학생은 자기 학업 과목 `subjectId`별 확정값만 본다).
- 이전 확정값: 보정하지 않는다(기존 Revision·확정값 불변). 열람 화면은 §38-5의 우선순위로 연결하고, 근거가 없으면 '후보'로 둔다.
- 한 분석 결과 안에 같은 과목명이 두 번 나오면 수신(§39 analysis-imports·서버 분석)이 기존 규칙대로 `subjects[n].subjectName: duplicate`로 거절한다(과목을 구분할 근거가 없어 저장하지 않음).

`decision=CONFIRM`은 **공통 평가정보 확인**이지 학생 과제 승인/반려가 아니다. PDF 비율 합계가 원본과 다르면 경고하며 자동 재배분하지 않는다. 확인 결과의 공개 범위는 학교·학년도·학년·학기로 제한된다. 추출 실패/부분 성공/수동 정정·확인 상태를 구분한다.

### 38-11. 학교알리미에서 평가계획서 불러오기 (2026-11-18 DRAFT — 구현됨, 2026-11-19 A27-UX Worktree 통합 · 부록 E 변경분 **팀 승인 완료(2026-11-19 사용자 전달)**)

`POST /api/admin/assessment/evaluation-plans/import-from-schoolinfo` (평가계획서 운영 권한, §38-2)

```json
{ "schoolId": "school_001", "schoolName": "신원고등학교", "academicYear": 2026, "semester": 2, "defaultGrade": 1 }
```

- Backend가 학교알리미(schoolinfo.go.kr) 공시 항목 '교과별 교수·학습 및 평가 계획'의 첨부 파일을 받아(zip 이면 풀어서) 파일마다 §38 등록을 요청 안에서 끝내고 `202`로 작업 번호를 준다. §39-1 서버 분석은 서버 작업 1개가 차례로 돌린다(서버 사양 고려, 여러 관리자의 작업도 한 줄로). 화면은 `GET …/import-from-schoolinfo/{jobId}`를 다시 읽어 진행바(`done`/`total`)를 그린다.
- 학년: 파일 이름의 학년 표기('3학년'·'1,2,3학년'·'1~3학년'·'전학년'). 여러 학년 공통 문서는 **학년마다 따로 등록·분석**해 `files[]`에 학년별로 한 줄씩 나온다(같은 파일 이름, 다른 `grade`). 학년 표기가 없으면 `defaultGrade`(없으면 1). '2023학년도'의 숫자는 학년으로 보지 않는다. 다른 학기 파일('1학기'만 있는 이름)·평가계획이 아닌 파일(성적관리규정·부록 등)·PDF/HWP/HWPX 가 아닌 파일은 등록하지 않고 `skipped=true`·`message`로 알린다.
- `sourceUrl`은 `https://www.schoolinfo.go.kr`로 남는다. 등록한 문서는 일반 업로드와 같다(검토·확정·삭제 동일).

```json
{ "jobId": "schoolinfo_job_…", "state": "RUNNING", "schoolName": "신원고등학교", "done": 1, "total": 3,
  "files": [ { "fileName": "1학년 평가계획.pdf", "grade": 1, "planId": "plan_…", "documentRevisionId": "rev_…",
               "analysisStatus": "REVIEW_REQUIRED", "subjects": 12, "skipped": false, "message": null },
             { "fileName": "2학년 평가계획.pdf", "grade": 2, "planId": "plan_…", "documentRevisionId": "rev_…",
               "analysisStatus": "ANALYZING", "subjects": null, "skipped": false, "message": null } ] }
```

- `analysisStatus`: `QUEUED`(대기) → `ANALYZING` → §39 분석 상태(`REVIEW_REQUIRED`·`PARTIAL`·`FAILED`), 분석 오류는 `FAILED` + `message`. `state`: 모든 등록 문서가 끝나면 `DONE`.
- `GET /api/admin/assessment/evaluation-plans/import-from-schoolinfo/{jobId}` → 같은 모양. 작업을 시작한 관리자만 본다. 작업 기록은 서버 메모리(최근 50개)라 서버를 다시 켜면 `404 SCHOOLINFO_JOB_NOT_FOUND` — 분석 결과는 각 문서(§39)에 남는다.

| 상황 | 응답 |
|---|---|
| 학교를 못 찾음 | `404 SCHOOLINFO_SCHOOL_NOT_FOUND` |
| 같은 이름으로 학교가 2곳 이상 검색됨 (2026-11-19 A27-UX 부록 D 추가 — 첫 학교를 임의로 고르지 않음, 아무 문서도 등록하지 않음) | `409 SCHOOLINFO_SCHOOL_AMBIGUOUS` |
| 평가계획 공시·첨부 없음 | `404 SCHOOLINFO_PLAN_NOT_PUBLISHED` |
| 학교알리미 연결 실패(일시 오류 3번 재시도 후) | `503 SCHOOLINFO_UNAVAILABLE` |
| 파일 하나의 등록·분석 실패 | 202/200, 그 파일만 `message`에 사유 (다른 파일은 계속) |
| 모르는 작업 번호 · 다른 관리자의 작업 | `404 SCHOOLINFO_JOB_NOT_FOUND` |

- **A27-UX 통합 메모(2026-11-19)**: `sourceUrl=https://www.schoolinfo.go.kr`은 관리자 등록 문서의 참고 표시일 뿐이다. 학생 §10-1-3 공식 원본 공급자(`OfficialPlanSourceProvider`)에는 **연결하지 않았다** — 서버가 수집 경로를 증명하는 출처 메타데이터(별도 계약·Migration 필요)가 생기기 전까지 학생 화면은 '공식 원본이 아직 확인되지 않았어요'를 그대로 보인다. 작업 상태는 서버 메모리(최근 50개)라 재시작 시 사라지고, 취소·재시도 API는 없다(파일별 결과는 각 문서 §39에 남는다).

- **A27-UX 부록 E 변경(2026-11-19, 사용자 지시)**: 이 Endpoint도 아래 §38-12의 **연도별 조회 + 출처 분류**를 거친다. 요청 `academicYear`로 학교알리미를 연도 지정 조회하고, 분류가 `VERIFIED`인 파일만 그 학년도 슬롯에 등록한다. 학년·학기 근거가 없는 파일에 `defaultGrade`(또는 1학년)를 붙이던 동작과 다른 학기 파일을 이름만 보고 거르던 동작은 **없앴다** — `skipped=true`, `message`에 분류 사유(`NEEDS_SOURCE_VERIFICATION`·`YEAR_MISMATCH`·`UNCLASSIFIED`)가 나온다. `defaultGrade`는 받지만 쓰지 않는다(하위 호환). 관리자 화면은 이 Endpoint 대신 §38-12를 쓴다.

### 38-12. 학교알리미 최근 3개 학년도 자동 확인 (A27-UX 부록 E, 2026-11-19 DRAFT · 사용자 지시 · **팀 승인 완료(2026-11-19 사용자 전달)**)

관리자가 평가계획서 탭에서 학교를 고르면 화면이 **버튼 없이** 아래 명령을 보낸다. 서버는 최근 3개 학년도 × 1~3학년 × 1·2학기 = **18개 구간**의 학교알리미 공시 원본을 **학년도마다 따로** 조회하고, 출처가 확인된 파일만 그 학년도·학년·학기 슬롯에 일반 문서(§38)로 등록한 뒤 서버 분석(§39-1)을 차례로 돌린다. **검토·확정은 관리자만 한다**(자동 확정 없음). 학생 공개 범위(확정 Revision만)는 바뀌지 않고, 학생 §10-1-3 공식 원본 공급자에는 연결하지 않는다.

`POST /api/admin/assessment/evaluation-plans/schoolinfo-sync` (평가계획서 운영 권한, §38-2)

```json
{ "schoolId": "school_001", "requestedAcademicYears": [2026, 2025, 2024], "grades": [1, 2, 3], "semesters": [1, 2] }
```

- **기준 학년도** = 서버 시계(`Asia/Seoul`)의 달력 연도 Y. 기대 배열은 `[Y, Y-1, Y-2]`(이 순서, 중복 없음). 학교알리미 공시연도와 같다는 가정이 아니다(사용자 정책). 요청 배열이 다르면 `409 SCHOOLINFO_SYNC_YEARS_MISMATCH`, `details.expectedAcademicYears`에 서버 기대값 — 화면은 그 값으로 다시 보낸다. `grades`는 `[1,2,3]`, `semesters`는 `[1,2]`만 허용(그 밖은 같은 409).
- **학교 식별**: 학교 이름은 요청에서 받지 않는다. 서버가 학업 Context(§38-3과 같은 원천)에서 그 학교의 이름을 찾는다. 이름이 없으면 외부 요청 없이 모든 학년도 `SCHOOL_IDENTITY_REQUIRED`. 학교알리미 검색 결과가 2곳 이상이면 `SCHOOL_AMBIGUOUS`(첫 학교를 고르지 않음), 1곳이어도 학교알리미의 학교 이름이 공백을 뺀 값으로 정확히 같지 않으면 `SCHOOL_AMBIGUOUS`. 지역·주소·학교알리미 고유 ID 저장소가 없어 그 이상 맞출 수 없다(결정 필요).
- **같은 학교 작업 재사용**: 진행 중인 작업이 있으면 그 작업을 돌려준다. 끝난 작업이어도 세 학년도의 마지막 확인이 TTL(`assessment.schoolinfo.sync-ttl-hours`, 기본 24시간) 안이고 `FAILED`가 아니면 외부 요청 없이 같은 결과를 돌려준다. `FAILED`·확인 기록 없음·TTL 지남인 학년도만 다시 조회한다. 서버를 다시 켜도 확인 기록·원본·슬롯 연결은 DB에 남아 다시 등록하지 않는다.
- 응답 `202 Accepted` (작업 시작·진행 중) 또는 `200 OK` (외부 조회 없이 기록으로 답함). 같은 모양:

```json
{ "jobId": "schoolinfo_sync_…", "schoolId": "school_001", "requestedAcademicYears": [2026, 2025, 2024],
  "state": "RUNNING",
  "yearStatuses": [ { "academicYear": 2026, "status": "COMPLETED", "resolvedSourceYear": 2026, "checkedAt": "…", "message": null },
                    { "academicYear": 2025, "status": "NOT_PUBLISHED", "resolvedSourceYear": null, "checkedAt": "…", "message": "…" },
                    { "academicYear": 2024, "status": "FETCHING", "resolvedSourceYear": null, "checkedAt": null, "message": null } ],
  "slotStatuses": [ { "academicYear": 2026, "grade": 1, "semester": 1, "status": "REGISTERED", "sourceFileCount": 2,
                      "registeredPlanCount": 2, "analysisStatus": "ANALYZING" } ],
  "counts": { "expectedSlots": 18, "verifiedSlots": 1, "uniqueSourceFiles": 3, "registeredPlans": 2, "slotLinks": 2,
              "downloads": 3, "reused": 0, "analysisCompleted": 0 },
  "unresolvedFiles": [ { "academicYear": 2026, "fileName": "평가계획(전체).pdf", "sha256": "…", "status": "UNCLASSIFIED", "reason": "NO_SEMESTER_EVIDENCE" } ] }
```

- `slotStatuses`는 **항상 18개**(학년도 내림차순 → 학년 → 학기). 성공을 가정해 채우지 않는다.
- **상태 (세 층을 섞지 않는다)**
  - 작업 `state`: `RUNNING` · `COMPLETED`(세 학년도 모두 `COMPLETED`) · `PARTIAL`(그 밖에 하나라도 끝난 결과가 있음) · `FAILED`(세 학년도 모두 `FAILED`·`SCHOOL_*`).
  - 학년도 `status`: `QUEUED` · `FETCHING` · `COMPLETED`(받은 공시 파일이 모두 확인·등록됨) · `PARTIAL`(일부만 확인) · `NEEDS_SOURCE_VERIFICATION`(받은 파일 중 확인된 것 없음) · `YEAR_MISMATCH`(학교알리미가 다른 학년도 공시를 돌려줌) · `NOT_PUBLISHED`(그 학년도 공시·첨부 없음) · `YEAR_UNAVAILABLE`(학교알리미가 그 학년도를 고를 수 없게 함) · `SCHOOL_AMBIGUOUS` · `SCHOOL_NOT_FOUND` · `SCHOOL_IDENTITY_REQUIRED` · `FAILED`(연결 실패·429·5xx·시간 초과 — **미공시로 보지 않는다**. 다음 POST에서 다시 확인).
  - 슬롯 `status`(수집): 학년도 상태가 끝나지 않았으면 그 값, 연결된 원본의 문서가 남아 있으면 `REGISTERED`, 연결 문서를 관리자가 모두 삭제했으면 `REMOVED_BY_ADMIN`(자동 확인이 **다시 등록하지 않는다**), 없으면 학년도 결과에 따라 `NO_SOURCE_FOR_SLOT`(확인했지만 이 칸 원본 없음 — 오류 아님) · `NEEDS_SOURCE_VERIFICATION`(그 학년도에 분류 못 한 원본이 있음) · 학년도 상태 그대로.
  - 슬롯 `analysisStatus`(분석, 수집과 별개): `NONE` · `QUEUED` · `ANALYZING` · `ANALYZED`(§39-2 `REVIEW_REQUIRED`·`PARTIAL`) · `FAILED`. 검토·확정 상태는 기존 §38·§39 응답이 그대로 알려 준다.
- **출처 분류 (파일마다)**: 아래를 **모두** 만족해야 `VERIFIED`이고, 그때만 슬롯에 등록한다.
  1. 학교알리미 연도 지정 조회가 신뢰된 설정(`assessment.schoolinfo.year-query-verified=true`)이다. **기본값 false** — 실제 학교알리미에서 `JG_YEAR` 등 연도 파라미터 의미를 실측하기 전에는 받은 파일을 모두 `NEEDS_SOURCE_VERIFICATION`(사유 `YEAR_QUERY_UNVERIFIED`)으로 두고 등록하지 않는다.
  2. 학교알리미 응답이 되돌려 준 공시연도(`resolvedSourceYear`)가 요청 학년도와 같다. 다르면 `YEAR_MISMATCH`, 없으면 `NEEDS_SOURCE_VERIFICATION`.
  3. 파일 이름 또는 원문 앞부분에 'YYYY학년도'(파일 이름은 'YYYY'도) 근거가 있고 그 값이 요청 학년도다. 다른 학년도만 있으면 `YEAR_MISMATCH`, 근거가 없으면 `NEEDS_SOURCE_VERIFICATION`.
  4. 파일 이름(없으면 원문 제목줄)에 학년 근거('1학년'·'1,2학년'·'1~3학년'·'전학년')와 학기 근거('1학기'·'2학기'·'1,2학기'·'1·2학기')가 있다. 없으면 `UNCLASSIFIED` — **임의 1학년·최신 학기로 넣지 않는다.** 여러 학년·두 학기가 확인되면 그 슬롯마다 등록한다(원본 SHA·출처는 하나).
  - PDF·HWP·HWPX가 아니면 `UNSUPPORTED`, 성적관리규정 등은 `NOT_PLAN`(둘 다 등록 안 함, 목록에는 남음).
- **중복·개정**: 원본은 (학교, 조회 학년도, SHA-256)로 한 번만 기록한다. 슬롯 연결은 (학교, 학년도, 학년, 학기, 원본)마다 하나(DB Unique). 같은 SHA를 다시 받으면 문서·Revision을 만들지 않는다(`reused`). 같은 슬롯·같은 파일 이름의 원본 SHA가 바뀌면 **새 문서가 아니라 기존 문서의 새 Revision**(§38 개정)으로 넣는다 — 이전 Revision·확정값·초안·확정 이력·`subjectExclusions`는 그대로다. 파일 이름이 같다는 이유만으로 같은 원본으로 보지 않는다. 관리자 수동 업로드 문서와는 합치지 않는다.
- 분류하지 못한 원본은 바이트를 격리 Storage에 보관하고 `unresolvedFiles`에 남긴다(삭제·숨김 없음). 관리자가 분류를 정하는 API는 아직 없다(결정 필요).
- 등록 문서의 `sourceUrl`은 학교알리미 학교·학년도 공시 주소(`…/ei/ss/Pneiss_b01_s0.do?SHL_IDF_CD=…&JG_YEAR=…`)다. 출처 상세(학교알리미 학교 ID·조회 학년도·되돌려 준 공시연도·첨부 순번·파일 이름·SHA·크기·형식·받은 시각·분류 근거)는 관리자 응답에만 있다.
- **외부 안전**: 주소는 `https://www.schoolinfo.go.kr`만(시험은 루프백 주소를 설정으로만 허용). Redirect는 같은 호스트로 3번까지만. 한 파일 30MB, ZIP은 항목 100개(부록 H, 이전 50개)·풀린 합계 100MB까지, ZIP 안 ZIP·경로(`../`)는 받지 않는다. 429·5xx·연결 오류는 한 요청에 최대 3번 다시 시도(지수 대기) 후 그 학년도만 `FAILED`. 요청 사이 0.5초 대기, 학교·학년도 조회와 분석은 서버 작업 1개가 차례로 돈다.

`GET /api/admin/assessment/evaluation-plans/schoolinfo-sync/{jobId}` → 같은 모양 `200`. **읽기만 한다**(외부 요청·DB 쓰기 없음). 운영 권한 관리자면 학교와 무관하게 본다(OD-A08). 모르는 작업 → `404 SCHOOLINFO_JOB_NOT_FOUND`(서버 재시작 뒤에는 POST를 다시 보내면 기록으로 답한다).

| 상황 | 응답 |
|---|---|
| 요청 학년도·학년·학기가 서버 기대값과 다름 | `409 SCHOOLINFO_SYNC_YEARS_MISMATCH` + `details.expectedAcademicYears` |
| `schoolId` 빈칸·길이 초과 | `400` |
| 운영 권한 없음 | `403` · 학생 인증 | `401`/`403` (관리자 Actor 아님) |


- **§38-12 요청 확장 (A27-UX 부록 F, 2026-11-19, 하위 호환 추가)**: 선택 필드 `force`(기본 false). 관리자가 화면의 '다시 확인'을 직접 눌렀을 때만 true — 진행 중 작업이 없으면 TTL과 무관하게 세 학년도를 모두 다시 확인한다. 화면 진입·탭 왕복·새로고침은 false(기존 TTL 재사용 그대로).
- **§38-12 응답 확장 (A27-UX 부록 F, 2026-11-19, 하위 호환 추가)**
  - `schoolSelection`: 학교 식별 상태. `null`이면 선택이 필요 없다(이름이 하나뿐인 학교 · 이미 선택한 학교).
    ```json
    { "required": true, "reason": "SAME_NAME_CANDIDATES",
      "candidates": [ { "candidateId": "cand_…", "schoolName": "예시고등학교", "sido": "서울특별시", "sigungu": "강남구",
                        "address": "서울특별시 강남구 …", "selectable": true, "unselectableReason": null } ],
      "selected": { "schoolName": "예시고등학교", "sido": "서울특별시", "sigungu": "강남구", "address": "…", "selectedAt": "…", "version": 1 },
      "mappingVersion": 1 }
    ```
    - `reason`: `SAME_NAME_CANDIDATES`(이름이 같은 학교가 2곳 이상) · `MAPPING_CHANGED`(선택해 둔 학교의 이름·주소가 학교알리미에서 바뀜 → 선택 무효, 다시 선택) · `TOO_MANY_CANDIDATES`(10곳 초과 — 선택 불가, 수동 등록 안내).
    - 후보의 이름·주소는 **학교알리미 학교 상세 화면에서 읽은 값**이다. `sido`·`sigungu`는 그 주소의 첫 두 낱말에서만 나눈다(지역 목록을 따로 두지 않는다). 주소를 읽지 못하면 `address=null`, `selectable=false`, `unselectableReason=ADDRESS_MISSING`. 주소가 같은 후보끼리는 `ADDRESS_DUPLICATE`로 둘 다 선택 불가.
    - `candidateId`는 서버가 이 작업 안에서만 만든 값이다(학교알리미 학교 ID를 화면에 주지 않는다).
    - `mappingVersion`: 저장된 학교 선택의 현재 version(무효가 된 선택 포함, 없으면 0). §38-13 `expectedVersion`으로 보낸다.
  - `unresolvedFiles[]`에 `sourceFileId`·`group`(`SOURCE_VERIFICATION` · `CLASSIFICATION` · `OTHER`) 추가. `CLASSIFICATION`만 §38-14로 분류할 수 있다.
  - 슬롯 상태는 그대로다. 학교 선택이 필요한 학년도는 `SCHOOL_AMBIGUOUS`.
- **팀 승인 기록**: 2026-11-19 사용자 전달 — §38-11 변경(부록 E)·§38-12·`REMOVED_BY_ADMIN`·Migration `V202611190200__assessment_schoolinfo_sync.sql` **팀 승인 완료**. 승인 주체·회의록·시각은 전달받지 않았다. 이 승인은 사용자 DB 적용·실제 학교알리미 접속·Git 작업 승인이 아니다. 부록 F에서 새로 만든 §38-13·§38-14·`V202611190300`은 이 통지에 포함되지 않았다(팀 승인 별도).

- **부록 G 변경 (2026-11-19 사용자 승인 · 실측 근거)**
  - **공시 차수**: 학교알리미 항목 화면은 학년도마다 공시 차수(실측: 1차 = 4월, 3차 = 9월)가 따로 있고 기본 화면은 최신 차수만 준다. 서버는 기본 화면 뒤 같은 학년도의 다른 차수를 `JG_CHASU`로 한 번 더 요청한다. 서버가 그 차수를 돌려주지 않으면(선택된 차수가 다름) 그 화면 파일은 쓰지 않는다(`CHASU_IGNORED`, 문제 목록에만 남김). 파일마다 그 차수의 공시월을 기록한다(증거 `disclosureMonth`).
  - **학기**: ① 원문(파일 이름·제목)의 명시 학기 → ② 공식 공시월(4월 = 1학기, 9월 = 2학기) → ③ 보류. ①과 ②가 다르면 `UNCLASSIFIED`·`SEMESTER_CONFLICT`(원문이 1·2학기 둘 다 명시하면 두 학기). 4·9월이 아닌 공시월·공시월 없음은 학기를 정하지 않는다(`NO_SEMESTER_EVIDENCE`). 문서 안의 '4월 평가'처럼 시행월은 쓰지 않는다.
  - **학년**: 이름·제목의 학년이 있으면 그 학년만. 없고 학기가 정해졌으면 본문 앞부분(약 4만 자)을 본다 — 학년 표기가 없으면 고1·고2·고3 모두(`VERIFIED`, 사유 `GRADE_UNSPECIFIED_ALL_GRADES_APPLIED`), 1·2·3학년을 모두 가리키면 모두(`GRADES_FROM_BODY_ALL`), 일부만 가리키면 `UNCLASSIFIED`·`GRADE_SCOPE_CONFLICT`(관리자 분류 §38-14). 전 학년 연결은 **문서의 관리 슬롯 분류**이지 학생 공식 개설 과목 선언이 아니다. 원본 SHA·출처는 하나이고 칸 연결만 여럿이다.
  - **A28-09 (2026-11-22) 과별 공시**: 파일 이름에 학년이 없고 '…과 교수학습/평가' 형태(교과 단위 공시)인데 제목 첫머리에서 학년이 **하나만**(첫 단원 표의 학년) 보이면, 본문이 1·2·3학년을 모두 다룰 때 같은 학년도·같은 학기의 고1·고2·고3 공용 원본으로 본다(`VERIFIED`, 사유·`gradeFrom` = `GRADES_FROM_BODY_ALL`, 근거 `titleGrades`·`bodyGrades`). 제목에 학년이 둘 이상 명시되거나, 본문이 일부 학년만 더 가리키거나, 과별 공시 이름이 아니면 이전 규칙 그대로(넓히지 않음). 다른 학기·학년도·학교로 복제하지 않는다. 확정된 평가 정보는 그 문서(칸)의 확정이며 다른 학년 칸으로 복사하지 않는다.
  - **A28-24 (2026-11-22) 과별 통합 공시 — 원문 전체의 과목 단원 학년**: 과별 공시(제목 학년 하나)는 본문 4만 자만 보면 2·3학년 과목 단원이 뒤에 있어 고1 로 잘못 고정됐다. 원문 전체(HWP·HWPX, PDF 는 앞 20쪽)에서 **과목 계획 머리글 `[과목](과) 교수학습 및 평가 (운영) 계획` 뒤 80자 안의 `N학년`** 만 모아(`sectionGrades`) 1·2·3 모두면 전 학년(`GRADES_FROM_BODY_ALL`, `gradeFrom = SECTION_GRADES`), 둘 이상 일부면 그 학년만(`GRADES_FROM_SECTIONS`), 아니면 이전 규칙. 학년 낱말 단순 출현은 근거가 아니다. 파일 이름에 학년이 있으면 적용하지 않는다. 같은 학년도·학기만.
  - **보정 범위 제한**: `assessment.schoolinfo.grade-scope-repair-scope=학교키:학년도[,…]`. `apply` 는 범위가 없으면 거절(광범위 일괄 보정 방지), `dry-run` 은 범위 없이 전체 보고 가능. 새 판정이 제목 학년보다 넓을 때 빠진 학년 칸 연결만 더한다(멱등).
  - **기존 데이터 보정(1회성, 기본 꺼짐)**: `assessment.schoolinfo.grade-scope-repair=dry-run|apply`(+ `…-report` 경로). 이미 '제목 학년' 한 칸에만 연결된 원본을 보관 원본(SHA 재확인)으로 위 규칙으로 다시 판정해 **빠진 학년 칸 연결만** 기존 연결 경로로 더한다. 기존 연결·문서·Revision·검토·확정은 바꾸지 않고, 다시 실행하면 0건(멱등). 학교알리미에 다시 접속하지 않는다.
  - 학년도·출처·학교 식별 규칙(조건 1~3)은 그대로다 — 연도 불일치·출처 미확인·학교 미선택이면 전 학년 연결도 하지 않는다.
  - 학년 미표기 → 전 학년으로 자동 연결된 원본은 §38-14 목록에 `group=AUTO_ALL_GRADES`로 따로 보인다(사유·공시월·연결 칸). 실제로 그 학년 문서가 아닌 칸은 평가계획서 칸의 문서 삭제(§38-9)로 뺀다 — 자동 확인이 다시 넣지 않는다(`REMOVED_BY_ADMIN`).
  - **형식**: ZIP 서명만 보고 HWPX로 보지 않는다(첫 항목 `mimetype = application/hwp+zip` 확인). DOCX 등은 `UNSUPPORTED`. '최소 성취수준 보장지도 운영 계획'은 `NOT_PLAN`.
  - **학교 상세 주소**: 실측 구조 `<span class="mt">주소 :</span>값</span>`을 먼저 읽는다(예전 `<th>주소</th><td>` 가정도 남김).
- **부록 H 변경 (2026-11-20 사용자 승인 · 실측 근거)**
  - **학교 검색 더보기**: 학교알리미 검색 첫 화면은 학교급마다 2곳만 보이고 '고등학교(N) 더보기'로 나머지를 숨긴다(실측: '한빛고등학교' 고등학교 4곳 중 대전한빛·위례한빛만 보임 → 파주·담양 한빛고등학교 누락). 서버는 첫 화면에 '고등학교(N)'이 있으면 고등학교 목록(`SEARCH_TYPE=2`, `SEARCH_MODE=3`)을 한 번 더 받아 그 목록을 후보로 쓴다. 목록에서 N곳을 다 읽지 못하면 학교를 고르지 않는다(동기화 `SCHOOL_AMBIGUOUS`·`selection.reason=TOO_MANY_CANDIDATES`, 단건 가져오기 `409 SCHOOLINFO_SCHOOL_AMBIGUOUS`). 표시가 없는 예전 모양은 첫 화면 목록 그대로.
  - **ZIP 항목 수**: 50 → 100(실측: 상산고 2024 1학기 '전과목' ZIP 63항목, 풀린 합계 7.4MB). 풀린 합계 100MB·한 파일 30MB·ZIP 안 ZIP·경로 규칙은 그대로.
  - **4월 공시 LIVE**: 가좌고(경기 고양)·상산고·한빛고(경기 파주) × 2024~2026, `JG_CHASU=1` 요청 9건 모두 선택 차수 `YYYY1`(1차 04월)·Form `JG_YEAR`=요청 학년도·`JG_CHASU=1` 로 돌아왔다(부록 H2).
  - **운영 설정**: `assessment.schoolinfo.year-query-verified=true`는 Spring 프로필 `local-run`(사용자 로컬 운영 8080 + `lh_local_run`)에만 둔다. 기본·Unit·IT·e2e 는 false. 켜져도 위 조건 1~3·부록 G 규칙·형식·`NOT_PLAN`·중복·관리자 삭제 존중은 파일마다 그대로이고, 설정만으로 조회하지 않는다(관리자 화면 진입·'다시 확인'만).
- **부록 I 변경 (2026-11-20 · 실측 재현 근거)**: 첨부 내려받기 응답이 2xx 가 아니면(만료·삭제 첨부의 404 오류 페이지 등) 그 본문을 원본으로 쓰지 않고 그 첨부만 문제 목록에 남긴다(`reason=FILE_DOWNLOAD_FAILED`, `group=OTHER`). 일부 첨부만 실패하면 학년도 `PARTIAL`, 전부 실패하면 `FAILED`(공시 없음 `NOT_PUBLISHED`과 구분). 9월(3차) 공시 LIVE: 고양 가좌고·파주 한빛고 × 2024~2026 `JG_CHASU=3` 6건 모두 선택 차수 `YYYY3`(09월)·Form `JG_YEAR`=요청 학년도(부록 I).
- **Migration 적용 기록 (2026-11-19)**: `V202611190100`·`V202611190200`·`V202611190300`을 사용자 DB(`lh_local_run`)에 **적용 완료**(사용자 승인 · 백업·복제 DB 검증 뒤, 부록 G). `V202611180100`(PR 검토 테이블 병합, DROP 포함)은 현재 코드와 호환되지 않아 **도입·적용하지 않음**(B안 유지).

### 38-13. 학교알리미 동명 학교 선택 (A27-UX 부록 F, 2026-11-19 DRAFT · 사용자 지시 · 팀 승인 별도 · 부록 G 실측: 가좌고등학교 2곳(인천·경기 고양)에서 실제 동명 확인)

§38-12 응답이 `schoolSelection.required=true`이면 관리자가 지역·주소를 대조해 후보 하나를 고른다. 고르기 전에는 그 학교의 자동 수집이 멈춰 있다(다른 후보로 자동 전환하지 않음).

`POST /api/admin/assessment/evaluation-plans/schoolinfo-sync/school-selection` (평가계획서 운영 권한)

```json
{ "schoolId": "school_001", "jobId": "schoolinfo_sync_…", "candidateId": "cand_…", "expectedVersion": 0 }
```

- 서버가 확인하는 것: 작업이 이 학교 것인가 · 후보가 그 작업이 보여 준 후보인가 · `selectable`인가 · 학교 이름이 이 학교(학업 Context)와 같은가. 하나라도 아니면 `409 SCHOOLINFO_SELECTION_INVALID`(등록 0건).
- 저장: 학교마다 선택 하나(`assessment_schoolinfo_school_mapping`, 학교알리미 학교 ID·이름·주소·시도·시군구·선택한 관리자·시각·`version`). `expectedVersion`이 현재 선택 `version`(없으면 0)과 다르면 `409 SCHOOLINFO_SELECTION_CONFLICT`. 같은 후보를 다시 보내면 그대로(멱등).
- 선택 직후 **그 학교 하나만** 세 학년도를 TTL과 무관하게 다시 확인하는 작업을 시작한다. 응답은 §38-12와 같은 모양(`202`).
- 다음 확인부터는 검색 대신 선택한 학교를 바로 확인한다. 그때 학교알리미 이름·주소가 선택 때와 다르면 선택을 무효로 하고(`status=INVALIDATED`) 다시 고르게 한다(`reason=MAPPING_CHANGED`, 등록 0건).
- 한계: 실제 학교알리미의 학교 상세에 주소가 어떤 모양으로 있는지 **실측하지 않았다**. 가상 학교알리미에서만 확인했다. 실제 화면에서 주소를 읽지 못하면 모든 후보가 `ADDRESS_MISSING`으로 선택 불가가 되고 수동 등록을 안내한다(추측 연결 없음).

| 상황 | 응답 |
|---|---|
| 작업·후보가 맞지 않음 · 선택 불가 후보 · 이름 불일치 | `409 SCHOOLINFO_SELECTION_INVALID` |
| 다른 관리자가 먼저 다른 학교를 골랐음 | `409 SCHOOLINFO_SELECTION_CONFLICT` |
| 서버 재시작 등으로 작업이 없음 | `404 SCHOOLINFO_JOB_NOT_FOUND` → §38-12 POST 다시 |

### 38-14. 분류하지 못한 학교알리미 원본의 학년·학기 분류 (A27-UX 부록 F, 2026-11-19 DRAFT · 사용자 지시 · 팀 승인 별도)

두 단계를 섞지 않는다.

1. **출처·학교·학년도 확인** — 서버가 받을 때 정한다(§38-12 분류). `NEEDS_SOURCE_VERIFICATION`·`YEAR_MISMATCH`(사유 `YEAR_QUERY_UNVERIFIED`·`DISCLOSURE_YEAR_DIFFERS`·`FILE_YEAR_DIFFERS`·`FILE_YEAR_CONFLICT`·`NO_FILE_YEAR_EVIDENCE` 등)는 **관리자가 학년·학기를 골라도 등록할 수 없다**(`group=SOURCE_VERIFICATION`).
2. **학년·학기 분류** — 출처·학년도가 확인됐지만 학년·학기 근거만 없는 원본(`UNCLASSIFIED`, `group=CLASSIFICATION`)만 관리자가 정한다. 분석 결과 확정·학생 공개가 아니다 — 분류 뒤에는 기존 분석(§39-1)·검토·확정(§39) 흐름 그대로다.

`GET /api/admin/assessment/evaluation-plans/schoolinfo-sources?schoolId=` → 최근 3개 학년도(§38-12 기준)의 확인되지 않은 원본, 분류한 원본, 학년 미표기로 전 학년에 자동 연결된 원본(`group=AUTO_ALL_GRADES`, 부록 G)

```json
{ "schoolId": "school_001", "academicYears": [2026, 2025, 2024],
  "items": [ { "sourceFileId": "si_src_…", "academicYear": 2025, "resolvedSourceYear": 2025, "fileName": "…", "format": "PDF",
               "sizeBytes": 12345, "sha256": "…", "verification": "UNCLASSIFIED", "reason": "NO_SEMESTER_EVIDENCE",
               "group": "CLASSIFICATION", "classifiable": true, "evidence": { "grades": [2], "semesters": [] },
               "classification": { "version": 1, "grades": [1, 2], "semesters": [1], "note": "목차 3쪽", "decidedBy": "adm_…", "decidedAt": "…" },
               "history": [ { "version": 1, "grades": [1, 2], "semesters": [1], "note": "…", "decidedBy": "…", "decidedAt": "…" } ],
               "linkedSlots": [ { "grade": 1, "semester": 1, "planId": "plan_…" } ], "originalAvailable": true } ] }
```

`GET …/schoolinfo-sources/{sourceFileId}/file?schoolId=` → 원본 바이트(관리자만, 형식 확인된 Content-Type, 첨부 내려받기). 학교가 다르면 `404`.

`PUT …/schoolinfo-sources/{sourceFileId}/classification`

```json
{ "schoolId": "school_001", "academicYear": 2025, "grades": [1, 2], "semesters": [1], "note": "목차 3쪽 '1학기'", "expectedVersion": 0 }
```

- `academicYear`는 그 원본의 조회 학년도와 같아야 한다(2025 원본을 2026 칸에 넣을 수 없음). `grades` ⊂ {1,2,3}·`semesters` ⊂ {1,2}, 각각 1개 이상, `note` ≤ 200.
- 고른 학년 × 학기마다 §38 문서로 등록하고 슬롯에 연결한다(원본 SHA·출처 하나). 이미 연결된 칸은 그대로(중복 0). 관리자가 삭제한 문서(`REMOVED_BY_ADMIN`)는 되살리지 않는다.
- 분류는 Revision으로 쌓인다(`assessment_schoolinfo_classification`, 지우지 않음). `expectedVersion`이 최신 `version`(없으면 0)과 다르면 `409 SCHOOLINFO_CLASSIFICATION_CONFLICT`.
- 이미 연결된 칸을 빼는 재분류는 `409 SCHOOLINFO_CLASSIFICATION_SLOT_REMOVAL` — 그 칸의 문서는 검토·확정 이력이 걸릴 수 있으므로 평가계획서 칸에서 문서 삭제(§38-9)로만 뺀다. 칸을 더하는 재분류는 된다.
- 응답: 위 `items[]` 한 줄 모양(`200`). 분석은 서버 작업이 차례로 돌린다.

| 상황 | 응답 |
|---|---|
| 출처·학년도 확인 안 된 원본(`group≠CLASSIFICATION`) | `409 SCHOOLINFO_SOURCE_NOT_CLASSIFIABLE` (`details.reason`) |
| 학년도가 원본과 다름 | `409 SCHOOLINFO_SOURCE_NOT_CLASSIFIABLE` (`details.reason=ACADEMIC_YEAR_DIFFERS`) |
| 버전 충돌 | `409 SCHOOLINFO_CLASSIFICATION_CONFLICT` |
| 연결된 칸 빼기 | `409 SCHOOLINFO_CLASSIFICATION_SLOT_REMOVAL` |
| 없는 원본 · 다른 학교 원본 | `404 SCHOOLINFO_SOURCE_NOT_FOUND` |
| 입력 범위 밖 | `400` |

### 38-15. 학교알리미 공식 학교 검색·선택 — 평가계획서 0건 학교 포함 (A27-UX 부록 O, 2026-11-21 · 사용자 승인 '학교 Master 검색 연결' · 구현됨)

```
GET  /api/admin/assessment/schools/directory?query=<2~40자>
POST /api/admin/assessment/schools/directory/selection   { "candidateId": "dir_…" }
```

- Assessment 전용 **읽기 전용** 학교 검색이다. 공식 학교알리미 검색·상세(기존 `SchoolInfoClient`)만 쓴다. 전역 학교 Master·학생 등록·학적을 만들지 않는다.
- 검색 응답: `{ query, complete, incompleteReason, items[{ candidateId, officialName, sido, sigungu, address, schoolinfoSchoolId, schoolId, selectable, unselectableReason }] }`
  - `complete=false`: 검색 결과를 모두 읽지 못했다(`SEARCH_TRUNCATED` 더보기 잘림 · `TOO_MANY_RESULTS` 15곳 초과 · `DETAIL_FAILED`). 그 검색의 후보는 모두 `selectable=false`(`SEARCH_INCOMPLETE`)다.
  - `unselectableReason`: `ADDRESS_MISSING` · `ADDRESS_DUPLICATE`(같은 정식 이름·같은 주소) · `SEARCH_INCOMPLETE`.
  - `schoolId`: 이 학교알리미 학교를 이미 쓰는(ACTIVE 매핑) 학교 키. 없으면 null.
  - `candidateId`는 서버가 이 검색에서 발급한 값이며 10분 동안 유효하다. 같은 검색어는 10분 캐시, 관리자당 1분 20회 외부 검색 상한이 있다.
- 선택: 서버가 발급한 `candidateId`만 받는다. 학교 키는 서버가 정한다.
  - 같은 학교알리미 학교를 쓰는 ACTIVE 매핑이 있으면 그 키를 쓴다(예: 인천 가좌고 = `sch_demo_gajwa`, 기존 매핑 불변).
  - 없으면 `si_<학교알리미 학교 ID>`를 공식 이름·주소로 매핑한다.
  - 선택하면 그 학교 하나만 §38-12와 같은 3개 학년도 자동 확인을 시작한다. 응답: `{ schoolId, schoolName, sido, sigungu, address, schoolinfoSchoolId, sync: §38-12 응답 }`. 진행 중이면 202, 아니면 200.
- §38-3 등록 학교 목록은 `si_` 학교를 평가계획서 0건이어도 남기고, 이름 출처를 `nameSource=SCHOOLINFO_MAPPING`으로 표시한다.
- 오류:

| 경우 | 응답 |
|---|---|
| 검색어 2자 미만·40자 초과 | `400 SCHOOL_DIRECTORY_QUERY_INVALID` |
| 학교알리미 연결 실패 | `502 SCHOOL_DIRECTORY_UNAVAILABLE` (빈 목록으로 숨기지 않음) |
| 검색 상한 초과 | `429 SCHOOL_DIRECTORY_RATE_LIMITED` |
| 위조·만료·고를 수 없는 후보 | `409 SCHOOL_DIRECTORY_CANDIDATE_INVALID` |

### 38-16. 학생 개인 동명 학교 열람 선택 (A27-UX 부록 O, 2026-11-21 · 사용자 승인 부록 N-7 · 구현됨 · 새 표 V202611210100)

```
GET    /api/student/assessment/evaluation-plans/official/school-candidates
PUT    /api/student/assessment/evaluation-plans/official/view-selection   { "candidateId": "cand_…", "expectedVersion": 0 }
DELETE /api/student/assessment/evaluation-plans/official/view-selection?expectedVersion=1
```

- 학생 **본인**의 '공식 공개 원본 열람 대상'만 정한다. 학적(학교·학년도·학년·학기), 관리자 공통 매핑(§38-13), 확정 평가 정보는 바뀌지 않는다.
- 고를 수 있는 조건: 학적 학교에 저장된 확인 기록이 `SCHOOL_AMBIGUOUS`이고 관리자 매핑이 없을 때.
  - 관리자 매핑이 생기면 늘 그것이 먼저다(학생 선택은 쓰이지 않음).
- 응답: `{ state, schoolName, candidates[{ candidateId, schoolName, sido, sigungu, address, selectable, unselectableReason }], selection, message }`
  - `state`: `NO_CONTEXT` · `NOT_REQUIRED` · `ADMIN_CONFIRMED` · `RUNNING` · `SELECT_REQUIRED` · `SELECTED` · `UNAVAILABLE`
  - 후보는 학적 학교와 정식 이름이 같은, 서버가 검증한 것만 담는다. 학교알리미 학교 ID는 주지 않는다.
  - `selection={ schoolName, sido, sigungu, address, selectedAt, version, teacherConfirmed=false }`
- 원본은 학교알리미 학교 단위 키(§38-15와 같은 규칙: 기존 키 재사용 또는 `si_`)에 한 번만 저장·공유한다(학생마다 재다운로드 0).
- §10-1-3 학생 원본 조회·내려받기·ensure는 요청마다 본인 학적 학교 → (관리자 매핑 없음 + 동명 + 본인 선택) 열람 학교로 다시 계산한다. 학년·학기는 학적 그대로다.
  - 응답 추가 필드: `GET official`의 `officialView`(학생 선택, 없으면 null), `POST official/ensure`의 `viewSelected`.
- 학적 학교가 바뀌면 예전 선택은 쓰지 않는다(보류). 선택·변경·철회는 `assessment_student_official_view_event`에 남는다.
- 오류:

| 경우 | 응답 |
|---|---|
| 관리자 매핑 있음 · 동명 아님 · 학적 없음 | `409 OFFICIAL_VIEW_NOT_ALLOWED` |
| 위조·다른 이름·고를 수 없는 후보 | `409 OFFICIAL_VIEW_CANDIDATE_INVALID` |
| `expectedVersion`이 현재 선택 version과 다름 · 동시 선택 | `409 OFFICIAL_VIEW_VERSION_CONFLICT` |
| 다른 학교·다른 칸 원본 내려받기 | `404 SCHOOLINFO_SOURCE_NOT_FOUND` |

### 9-2. 현재 학년도·학기 (A27-UX 부록 O, 2026-11-21 · 사용자 지시 'Backend가 KST Clock으로' · 구현됨)

```
GET /api/student/assessment/current-term
GET /api/admin/assessment/current-term
→ { "academicYear": 2026, "semester": 2, "basis": "KST_CALENDAR_MARCH_SEPTEMBER" }
```

- 서버 KST 달력 기준: 3~8월 = 1학기, 9~12월 = 2학기, 1·2월 = 전년도 학년도 2학기.
- 화면은 학기를 고르지 않았을 때 이 값으로 §9-1 학적을 조회한다(`VITE_ASSESSMENT_DEV_CURRENT_TERM` 불필요). 학적이 없으면 §9-1이 '정보 없음'을 돌려준다(추측 없음).

### 39-13. 검증 가능한 후보 한 번에 확정 (A27-UX 부록 O, 2026-11-21 · 사용자 승인 '명시적 한 번에 확정' · 구현됨, 새 Endpoint 없음)

- §39 `PUT …/review` 요청에 선택 필드 2개를 더한다(기존 요청 모양은 그대로 동작).
  - `expectedDraftVersion`: 화면이 결정을 합칠 때 읽은 공유 초안(§39-4) version이다. 서버 현재 version과 다르거나 초안이 없으면 `409 BULK_CONFIRM_STALE`(확정 0건).
  - `bulk`: 관리자가 '한 번에 확정'으로 보냈다는 표시다. 검사 규칙은 개별 확정과 같다. 별도 열로 저장하지 않고 요청 기록만 남는다.
- 화면 규칙(관리자 1회 명시적 동작):
  - 관리자가 이미 고른 결정(수정·원문에 없음·확인)과 과목 제외는 그대로 둔다.
  - 아직 고르지 않은 AI 후보 중 **값과 원문 근거 쪽이 모두 있는 것만** 후보 그대로 넣는다.
  - 값이나 근거가 없는 항목이 하나라도 있으면 버튼을 막고 그 항목 목록을 보여 준다(확정 0건).
- 서버 검사는 개별 확정과 같다: 권한, 원본 Revision·SHA 대조, 과목 연결, 학년 충돌, 과목 제외, 근거 쪽 범위, 중복, 재확정 조건.
  - 한 번의 Transaction으로 처리해 일부만 확정되는 경우가 없다. 확정 전 학생 응답은 이전 확정값만, 확정 뒤에는 이번 확정값만 보인다.
- 문서 여러 개·학년도 전체 일괄 확정은 없다.

### 39-14. 원클릭 최종 승인 — 학교알리미 공식 원본 서버 검증 (A28-05, 2026-11-22 사용자 지시 · 구현됨 · Migration `V202611212328`)

- §39 `PUT …/review`의 `sourceCheck.method`에 `SERVER_STORED_ORIGINAL`을 더한다. **PDF·HWP·HWPX 공통.** `localFileSha256`·`manualComparisonConfirmed`는 보내지 않는다(보내면 `400 not_allowed`).
- 서버 검증(모두 만족해야 함, 아니면 확정 0건):
  1. 그 Revision 이 학교알리미 자동 수집 슬롯 연결(`SchoolInfoSlotLink`)에서 왔다 — 관리자 직접 업로드는 대상 아님 → `400 sourceCheck.method: not_official_original`
  2. 연결의 학교·학년도·학년·학기 = 문서 슬롯(같은 조건 아니면 `not_official_original`)
  3. 학교알리미 원본 기록 SHA = Revision SHA → 아니면 `official_source_mismatch`
  4. Storage 보관 바이트를 다시 읽어 계산한 크기·SHA-256 = Revision → 아니면 `409 FILE_INTEGRITY_FAILED`, 원본 없음 `original_missing`
- 이 검증을 통과하면 HWP·HWPX 도 `assessment.plan-review.structured-confirm-dev`(기본 false) 없이 확정할 수 있다. 관리자 로컬 파일 대조(`LOCAL_FILE_EXTERNAL_VIEWER`) 경로의 기존 보호(`verified_auth_required`)는 그대로다. 관리자 인증 규칙도 그대로다(개발 Header 는 운영 이름 Profile 에서 401).
- 권한·분석 결과 소속·과목 연결(문서 슬롯 학업 과목)·학년 충돌·제외 과목·근거 위치(PDF 쪽 / HWP·HWPX documentLocator)·`expectedDraftVersion`(409 `BULK_CONFIRM_STALE`)·재확정 조건 검사는 기존과 같다.
- 확정 기록: `source_check_method = SERVER_STORED_ORIGINAL`, `source_check_sha256 = 서버 계산 SHA`, `manual_comparison_confirmed = false`(수동 대조로 기록하지 않음). 기존 LOCAL 기록은 그대로다.
- 화면 규칙(관리자 1회 명시적 동작): 학교알리미 수집 원본이면 단계별 확정 대신 '최종 승인' 하나. AI 추출값은 기본 승인으로 넣고 관리자 결정이 우선이다. 값이나 원문 근거가 없는 항목·이름이 맞는 학업 과목이 없는 과목·다른 학년 과목·제외 과목은 확정 요청에 넣지 않고 경고로 알린다(값을 만들지 않음). 과목 기본 연결은 '분석 과목명 = 문서 슬롯 학업 과목명'이 정확히 하나일 때만이다.

### 39-15. 통합 최종 승인 — 수행평가·지필평가·월별 운영계획 한 번에 (A28-08, 2026-11-22 사용자 지시 · 구현됨 · Migration 없음)

- §39 `PUT …/review` 요청에 선택 필드 `teachingPlan`(§39-6 `TeachingPlanReviewRequest` 와 같은 모양: `analysisId`·`rows[]`·`manualRows[]`)을 더한다. 기존 요청은 그대로 동작한다(필드 없음 = 이전 동작).
- 받는 조건: `sourceCheck.method = SERVER_STORED_ORIGINAL` **그리고** `bulk = true`(원클릭 최종 승인). 아니면 `400 teachingPlan not_allowed`. `teachingPlan.analysisId` ≠ 요청 `analysisId` → `400 teachingPlan.analysisId conflict`.
- 처리: 평가 정보 확정(§39·§39-14 검증 그대로) 뒤 **같은 Transaction** 에서 §39-6 운영계획 확정 규칙(후보 행 키·과목 연결·학년 충돌·제외 과목·이미 확정 409·재검토)을 그대로 적용한다. 운영계획이 거절되면 평가 정보 확정도 되돌린다(부분 성공 없음). 거절 사유의 `field` 는 `teachingPlan.` 접두어가 붙는다(예: `teachingPlan.rows[1].rowKey unknown`).
- 응답은 §39 와 같다(`PlanAnalysisResponse`). 운영계획 확정 결과는 §39-6 `GET …/teaching-plan-review` 로 본다(같은 확정 기록).
- 화면(관리자 '최종 승인'): 유형별 승인 예정·확정에서 빠짐 수를 보인다(수행 = `performanceEvaluation.*`, 지필 = `writtenEvaluation.*`, 월별 운영계획 = 행). 운영계획은 확정할 수 있는 과목(과목 연결·학년·제외 규칙)의 **원문 근거가 있는 행만** 기본 승인하고, 운영계획 초안의 관리자 결정(수정·제외)이 우선이다. 운영계획이 이미 확정(재검토 안 열림)이면 이번 요청에 넣지 않는다. 운영계획 확정 상태를 읽지 못하면 최종 승인을 막는다.
- 평가 정보만 이미 확정되고 운영계획이 남은 문서(예: A28-05 최종 승인으로 평가 정보만 확정된 문서)는 같은 화면에서 '월별 운영계획 최종 승인' 하나로 §39-6 `PUT …/teaching-plan-review` 만 보낸다(평가 정보 재확정 없음). 사용자 문서를 서버가 자동 승인하지 않는다.

- **A28-22 (2026-11-22, 화면 규칙 · API 변경 없음)**: ① 확정 API(`PUT …/review`, `PUT …/teaching-plan-review`)가 성공(서버 commit 후 응답)하면 관리자 화면이 같은 브라우저의 관리자 탭들에 '확정됨' 신호(문서 ID·학교·학년도·학년·학기만, 학생 정보·확정값 없음)를 보내고, 전체 현황·월별 운영계획은 같은 슬롯이면 즉시 다시 조회한다(BroadcastChannel, 같은 origin 범위). 학생 화면·다른 브라우저는 재진입·창 복귀 때 갱신. ② 관리자 운영계획 조회는 문서마다 **가장 최근에 운영계획이 확정된 개정본**을 쓴다(새 원본 개정본이 미확정이어도 이전 확정본 유지 — 학생 공개 규칙과 같음). ③ 운영계획 빈 상태는 '평가계획서 없음 / 운영계획 후보 있음·미확정(검토·최종 승인 링크) / 분석 결과에 운영계획 행 없음(§39-6 확정 불가 `no_teaching_plan`, 가짜 행 없음)'으로 나눠 보인다. ④ 최종 승인 패널은 분석 결과에 운영계획 행이 없으면 '이번 승인으로 운영계획은 확정되지 않아요'를 경고로 보인다.

### 39-1. 서버 분석 실행 (A3, 2026-11-13 구현)

**2026-11-18: 분석 방식 `assessment.analyzer.mode`** — `local`(기본): Backend 안에서 원문 표를 읽어(PDF·HWP·HWPX) 과목·지필/수행 비율·수행 항목·항목별 채점 기준을 뽑고 아래와 같은 payload(근거: PDF 쪽 번호, HWP·HWPX 표 칸 `documentLocator`)로 같은 검증기를 거쳐 저장한다. 외부 분석기·토큰이 필요 없고 원문이 서버 밖으로 나가지 않는다. `analyzer.name = "learnershigh-plan-extract"`, 채널 `LOCAL`. `none`: 분석기 미설정(503). **2026-11-19: 외부 분석기(`http`, `/analyze-preview`) 연결은 걷어 냈다** — 아래 외부 분석기 관련 서술(토큰·재시도·시간 제한 두 단계)은 기록으로만 남는다. 응답·오류 모양은 그대로다. `local`은 정기시험 회차(`writtenEvaluation.exams`, 회차 비율 합이 지필 비율과 맞을 때만)와 월별 운영 계획(`teachingPlan`)도 채운다. 글자 정보가 없는 스캔 PDF 쪽은 `assessment.analyzer.ocr`(auto·tesseract·windows·none)로 OCR 해 같은 규칙으로 읽는다(엔진이 없으면 그 쪽은 건너뜀). 응답 Shape은 바뀌지 않는다.

- **A27-UX 통합 메모(2026-11-19)**: 이 Worktree의 모드는 `local`(기본)·`none`(Backend 시험 기본)·`loopback-stub`(Playwright E2E 전용, 127.0.0.1·localhost Stub만 — 원격 주소면 기동 거부)이다. 외부(Railway) `http` 모드는 없다.

`POST .../analysis`: 본문 없음. Backend가 보관 원문(§38-1)을 SHA-256 재검증 뒤 분석기(`POST /analyze-preview`, `X-Analysis-Token`, 환경 변수 설정)로 보내고, `backendImport.payload`를 외부 수신과 같은 검증기(backend-adapter-0.2, 알 수 없는 필드 거절)로 검사해 AnalysisRun으로 저장한다. 응답은 `GET .../analysis`와 같은 모양(`analyzer.origin = "SERVER_ANALYZER"`). `201` 새 Run / `200` 같은 내용의 Run이 이미 있음(새 Run 없음).

| 상황 | 응답 (`details.fields[0]` = `{field: "analyzer", reason}`) | Run |
|---|---|---|
| 분석기 미설정 | `503 PLAN_ANALYZER_NOT_CONFIGURED` | 없음 |
| 연결 실패·BUSY(연결 실패·503만 최대 2회 재시도)·Timeout·토큰 불일치 | `503 PLAN_ANALYZER_UNAVAILABLE` (`connection_failed`·`busy`·`timeout`·`analyzer_auth_failed`) | 없음 |
| 분석기 4xx | `422 PLAN_ANALYSIS_UNSUPPORTED` (`analyzer_rejected:<code>`) | 없음 |
| 분석기 5xx·JSON 아님·필수값 없음 / 원문 SHA 불일치 / `importable=false` / payload 계약 위반 / 판정 모순 | `502 PLAN_ANALYZER_BAD_RESPONSE` (`analyzer_error:<code>`·`invalid_response`·`sha_mismatch`·`not_importable:<blocker>`·`payload_invalid`·`status_conflict`) | 없음 |
| HWP·HWPX(실험 기능 꺼짐) / 원문 없는 이전 등록분 | `422 PLAN_ANALYSIS_UNSUPPORTED` (`format_contract_pending` / `original_missing`) | 없음 |
| 분석기가 '결과 없음'으로 응답(Envelope `NO_ASSESSMENTS_EXTRACTED`·`NO_SEGMENTS`·`NEEDS_OCR`·`UNSUPPORTED_FORMAT` + payload `FAILED`) — A7 2026-11-15 DRAFT | `422 PLAN_ANALYSIS_NO_RESULT` (`no_assessments_extracted`·`no_segments`·`needs_ocr`·`unsupported_format`). 장애·계약 불일치(502)와 구분. payload가 FAILED가 아니면 `502 status_conflict` | 없음 (FAILED Run 저장은 합의 대기 D-A6-3) |
| 같은 개정본 동시 요청 | `409 PLAN_ANALYSIS_IN_PROGRESS` | — |
| 보관 원문 변조 | `409 FILE_INTEGRITY_FAILED` | 없음 |

실패해도 기존 Revision·이전 Run·검토 상태는 바뀌지 않는다.

**시간 제한 두 단계 (A18, 2026-11-16 사용자 결정 · 응답 모양 변경 없음)**: 시연·원격 환경은 분석기 처리 제한 `ANALYZER_TIMEOUT_SEC=120`(계정 B 배포 진입점, 비우면 180), Backend 대기 `ASSESSMENT_ANALYZER_TIMEOUT_MILLIS=150000`(기본값 130000은 그대로)으로 둔다. 분석기가 먼저 멈추면 분석기 `504 ANALYSIS_TIMEOUT` → 위 표대로 `502 PLAN_ANALYZER_BAD_RESPONSE (analyzer_error:analysis_timeout)`, Backend가 먼저 끊으면 `503 PLAN_ANALYZER_UNAVAILABLE (timeout)` — 둘 다 Run 없음, 재시도 없음, 다른 분석 프로필로 대체하지 않음. 관리자 화면은 `analyzer_error:analysis_timeout`을 계약 불일치가 아닌 **시간 초과**로 안내한다.

### 39-2. 분석 상태 `analysisStatus` (A3.5, 2026-11-14 사용자 승인)

`NOT_REQUESTED`(Run 없음) · `REVIEW_REQUIRED` · `PARTIAL` · `FAILED`. 저장 규칙(분석기 Envelope `status` → Run):

| Envelope | payload `status` | Run `status` |
|---|---|---|
| `OK_REVIEW_REQUIRED` | `REVIEW_REQUIRED` / `FAILED` | 그대로 |
| `PARTIAL` | `REVIEW_REQUIRED` | **`PARTIAL`** (REVIEW_REQUIRED로 바꾸지 않음) |
| `PARTIAL` | `FAILED` | 저장 안 함 — `502 status_conflict` |
| `PARSE_FAILED` | `FAILED` | `FAILED` (그 외 `502 status_conflict`) |
| `NO_ASSESSMENTS_EXTRACTED`·`NO_SEGMENTS`·`NEEDS_OCR`·`UNSUPPORTED_FORMAT` (A7 DRAFT) | `FAILED` | 저장 안 함 — `422 PLAN_ANALYSIS_NO_RESULT`(사유 = 상태 소문자). 관리자에게 '평가항목을 찾지 못함'으로 안내(평가계획서가 아니라고 단정하지 않음) |
| 그 밖 | — | 저장 안 함 — `502 unknown_status` |

- payload `status`는 backend-adapter-0.2 그대로 `REVIEW_REQUIRED | FAILED`만 받는다(payload `PARTIAL`은 0.3 합의 대기, §39-3). 외부 수신(`analysis-imports`, PROPOSED)은 PARTIAL Run을 만들지 않는다.
- `warnings[]` `source` 값: `ANALYZER`(분석기 경고 문장) · `ANALYZER_ERROR`(분석기 Envelope `errors[].code`, 부분 결과의 누락 사유 — A3.5 추가) · `SERVER`(서버 검사). 값은 고치지 않고 보존한다.
- `PUT .../review`: `REVIEW_REQUIRED`·`PARTIAL` Run에 확정할 수 있고 `FAILED`는 `400 analysisId: analysis_failed`. PARTIAL 확정 시 관리자 확인 체크는 화면 안전장치이며 요청 필드가 아니다. 확정해도 Run(후보)은 바뀌지 않는다.
- A3 시점의 `422 PLAN_ANALYSIS_PARTIAL_NOT_STORABLE`은 A3.5에서 없앴다(더 이상 내지 않음).

### 39-4. 공유 검토 초안 (A5, 2026-11-14 사용자 승인 · DRAFT — 구현됨)

```http
GET /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/review-draft
PUT /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/review-draft
```

- **초안은 학생 공개가 아니다.** 분석 후보(Run) · 검토 초안(이 API) · 확정값(§39 PUT review) · 학생 공개값(§10-1 상세 confirmedFields)은 서로 다른 데이터다. 확정은 PUT review로만 한다.
- 같은 분석 결과(`analysisId`)를 검토하는 관리자들이 **하나의 초안**을 쓴다. 저장 기록(누가·언제·바꾼 필드)은 따로 남는다.
- PUT 본문: `{ analysisId, baseVersion, decisions:[{subjectIndex, fieldPath, decision: CONFIRMED|EDITED|ABSENT, value, pdfPageNumber}], subjectLinks:[{subjectIndex, subjectId}] }`. 전체 교체. `baseVersion`은 마지막으로 읽은 초안 version(초안이 없으면 `null`). `value`는 화면 입력 문자열, ABSENT면 `null`. `fieldPath`는 §11 화이트리스트(PUT review와 같음). 후보값(`candidate`)은 서버가 분석 결과에서 읽어 저장한다(요청 필드 아님).
- 응답(GET·PUT 같음): `{ planId, revisionId, latestAnalysisId, reviewStatus, draft:{draftId, analysisId, status: ACTIVE|CLOSED, closedReason, version, decisions[…, candidate], subjectLinks, decisionCount, analyzerVersion, createdBy, createdAt, updatedBy, updatedAt} | null, history:[{version, savedBy, savedAt, changedCount, changedFields}], previousDrafts:[{draftId, analysisId, status, version, decisionCount, updatedBy, updatedAt}] }`. `draft`는 **최신 분석 결과**의 초안이다. 예전 결과의 초안은 `previousDrafts`로 보존만 하고 새 결과에 적용하지 않는다.

| 상황 | 응답 |
|---|---|
| `baseVersion` ≠ 현재 version, 또는 초안이 있는데 `baseVersion=null` | `409 PLAN_REVIEW_DRAFT_CONFLICT` (`details: {currentVersion, updatedBy, updatedAt}`) — 덮어쓰지 않음 |
| 같은 version으로 동시에 저장 | 하나만 반영, 나머지 `409` (`PLAN_REVIEW_DRAFT_CONFLICT` 또는 `CONCURRENT_MODIFICATION`) |
| `analysisId`가 이 Revision의 최신 결과가 아님(재분석됨) | `409 PLAN_REVIEW_DRAFT_STALE` (`details.latestAnalysisId`) |
| `analysisId`가 이 Revision의 결과가 아님 / FAILED 결과 | `400 analysisId: unknown / analysis_failed` |
| 확정된 Revision | `409 INVALID_STATE_TRANSITION` (`revision: already_confirmed`) — 재검토 정책 미결, 기존 동작 유지 |
| 닫힌 초안 | `409 INVALID_STATE_TRANSITION` (`draft: closed`) |
| 경로 밖·범위 밖 과목·쪽 수 초과·ABSENT에 값·중복 | `400 VALIDATION_ERROR` (`decisions[i].fieldPath: not_allowed`·`subjectIndex: out_of_range`·`pdfPageNumber: out_of_range`·`value: not_allowed`·`duplicate`) |
| 인증 없음·학생 | `401` |

- **과목 제외 (A27-UX 관리자 추가 수정, 2026-11-19 DRAFT · 팀 승인 전)**: PUT 본문에 선택 필드 `subjectExclusions:[{subjectIndex, reason: OTHER_GRADE|DUPLICATE|NOT_THIS_TERM|OTHER, note(≤200, 선택)}]`(≤50)를 둘 수 있다. **필드를 보내지 않으면(null) 기존 제외를 그대로 둔다**(이전 클라이언트 호환), `[]`는 모두 복원이다. 응답 `draft.subjectExclusions`. 저장은 기존 `payload_json`에 함께 둔다(**새 Migration 없음**). 범위 밖 `subjectIndex: out_of_range`, 중복 `duplicate`, 모르는 사유 400, 운영계획 초안(§39-6)에 보내면 `not_allowed`. 변경 기록 `changedFields`에 `"{index}|excluded"`.
  - 의미: **삭제가 아니다.** 원문·AI 원본 추출값·근거 위치·결정(decisions)·확정 이력은 그대로 두고, 이 문서·학년·학기 검토 대상과 확정·학생 공개에서만 뺀다. 복원하면 기존 결정이 그대로 돌아온다.
  - 확정: §39 PUT review의 `reviewedSubjects[].analysisSubjectIndex`, §39-6 운영계획 확정의 `rows[].subjectIndex`가 그 분석 결과 평가 정보 초안의 제외 과목이면 `400 VALIDATION_ERROR (subject_excluded)` — 아무것도 저장하지 않는다.
  - 재검토 시작(`reopen`)으로 새로 만든 초안은 제외 목록이 비어 있다(최신 확정값으로만 채운다).
- PUT review(CONFIRM) 성공 시 같은 Transaction에서 그 분석 결과의 초안을 `CLOSED(CONFIRMED)`로 닫는다.
- 크기: decisions ≤ 600, subjectLinks ≤ 50, value ≤ 4000자(A12: 채점표 전체를 한 결정으로 담기 위해 1000 → 4000, 확정값 한도와 같음). 저장 기록 응답은 최근 20건.

### 39-3. 분석 결과 계약 `analysis-import-0.3` (A6, 2026-11-15 DRAFT — 계정 B 합의 전 · 기본 꺼짐)

**상태**: 계정 B 제안(`CONTRACT-HANDOFF-4`·`CONTRACT-HANDOFF-B4`·`MONTHLY-PLANNER-CONTRACT`, 2026-11-14)을 기준으로 Backend가 받을 수 있게 구현했다. **합의 전이라 운영 기본 경로가 아니다.**
- 활성화: Backend 설정 `assessment.analysis-import.contract03-enabled`(환경 변수 `ASSESSMENT_ANALYSIS_IMPORT_CONTRACT03_ENABLED`, 기본 `false`). 꺼져 있으면 0.3 필드는 지금처럼 `unknown_field`로 거절한다(0.2 엄격 검증 유지).
- 판별: payload `contractVersion`이 없으면 0.2, `"0.3"`이면 0.3 규칙. 그 밖 값은 `format`.
- 서버 분석(§39-1) 연결 (A8, 2026-11-15 — 계정 B B6 개발 계약): Gate가 켜지면 multipart에 `contract=0.3` + `analyzerVersion=v21.4-dev`(설정 `assessment.analyzer.contract03-version`)를 보낸다. 꺼지면 이전과 같이 `v21.1`만(`contract` 미전송). 두 프로필이 같거나 0.2 프로필이 `-dev`면 기동하지 않는다. 0.3 요청에 0.2 결과가 오거나(반대도) Envelope `contractVersion`과 payload가 다르면 `502 contract_mismatch` — **0.2로 대체하지 않는다**. 분석기가 0.3 요청을 거절하면(`400 CONTRACT03_DISABLED`·`CONTRACT_PROFILE_MISMATCH` 등) `422 PLAN_ANALYSIS_UNSUPPORTED (analyzer_rejected:<code>)`, 저장 없음.
- HTTP 코드와 분석 상태를 따로 다룬다: 0.3에서 분석기는 `PARSE_FAILED`·`UNSUPPORTED_FORMAT`을 **HTTP 422 본문의 Envelope**로 보낸다 → 본문에 Envelope(status·source.sha256·backendImport.payload)가 있으면 결과로 읽어 아래 표대로 판정한다(FAILED Run 저장, 확정 불가). 0.2 요청의 4xx는 이전처럼 거절이다. HTTP 200이어도 payload가 FAILED면 FAILED Run이다(정상 후보 아님).

0.2에 더해지는 필드 (모두 0.3에서만 허용):

| 필드 | 규칙 |
|---|---|
| `contractVersion` | `"0.3"` |
| `analyzer.profile` | 선택, ≤50자 |
| `status` | `REVIEW_REQUIRED` · `PARTIAL` · `FAILED` (0.3은 payload에 PARTIAL을 쓴다 — 계정 B 조정 ③) |
| `failureReason` | `FAILED`면 필수, 코드 `NEEDS_OCR`·`NO_ASSESSMENTS_EXTRACTED`·`NO_SEGMENTS`·`PARSE_FAILED`·`UNSUPPORTED_FORMAT`. `FAILED`가 아니면 `null`. `FAILED`면 `subjects=[]` |
| `subjects[].extraction` | 선택 `{ status: COMPLETE|PARTIAL|MISSING_SECTION, issues:[{ code, severity, fieldPath, basis, message, sources }] }` |
| `issues[].code` | 형식 `[A-Z][A-Z0-9_]{1,59}`. 알려진 코드 목록은 계정 B §6 제안(미합의) — **모르는 코드도 거절하지 않고 보존**한다 |
| `issues[].severity` | `BLOCKING`·`REVIEW`·`INFO`, 없으면 `REVIEW`로 본다(값은 받은 그대로 저장) |
| `issues[].fieldPath` | 같은 과목 안 실제 경로(`writtenEvaluation.weightPercent`, `performanceEvaluation.items[n].<필드>`, `teachingPlan`, `teachingPlan[n]` 등, 색인 범위 확인) |
| 필드 상태 issue | `FIELD_NOT_PROVIDED`(그 값은 `null` + `sources` 1개 이상 — 근거 없는 "원문에 없음" 금지) · `FIELD_EXTRACTION_FAILED`(값 `null`) · `FIELD_REVIEW_REQUIRED`(값 허용). 같은 `fieldPath`에 상태 issue 2개 → `duplicate_field_status` |
| `subjects[].teachingPlan[]` | 선택. 행 구조 아래. **수행평가 항목과 별도**(행으로 수행평가를 만들지 않음). 빈 배열이면 `TEACHING_PLAN_*` issue 1개 필수 |

`teachingPlan[]` 행 (계정 B 제안 그대로, ≤400행/과목):

```jsonc
{ "rowKey": "S01.T001",                       // 과목 안 유일, ≤50
  "month": 3, "monthTo": 3,                    // 1–12 | null
  "weekLabel": "1", "weekFrom": 1, "weekTo": 1, // 원문 주 표기 그대로 · 1–25, weekFrom ≤ weekTo
  "unit": "…", "content": "…", "note": null,
  "achievementStandards": [{ "code": "…", "text": "…" }],
  "inquiryProcess": null, "teachingMethods": ["토의"], "assessmentMethods": [], "linkageFocus": null,
  "specialSchedule": null,                     // 정기시험·방학 등 일정 문구
  "schedule": {                                // 선택(Planner 확장). 원문이 준 만큼만
    "precision": "WEEK_IN_MONTH",              // EXACT_DATE · DATE_RANGE · WEEK_IN_MONTH · TERM_WEEK · MONTH · MONTH_RANGE · WEEK_UNRESOLVED · UNKNOWN
    "monthFrom": 3, "monthTo": 3, "monthBasis": "MONTH",           // MONTH · DATE · MONTH_WEEK_LABEL
    "weekLabel": "1", "weekFrom": 1, "weekTo": 1,
    "weekScope": "IN_MONTH", "weekScopeBasis": "TABLE_PATTERN",     // IN_MONTH · TERM_SEQUENCE · UNKNOWN / LABEL · TABLE_PATTERN
    "dateFrom": null, "dateTo": null,          // { year|null, month, day } — 원문에 적힌 날짜만
    "dateAsWritten": null, "calendarYear": null, "calendarYearBasis": null },
  "sources": [{ "pdfPageNumber": 2, "extractedText": "3" }] }   // 1개 이상
```

- 정밀도 8종을 줄이거나 다른 값으로 바꾸지 않고 그대로 저장한다(계정 A 초기 5종 제안은 폐기).
- `schedule` 불변 규칙: `calendarYear`는 `calendarYearBasis = EXPLICIT_IN_CELL`일 때만(학년도로 연도 계산 금지) · `precision ∈ {EXACT_DATE, DATE_RANGE}` ⇔ `dateFrom` 있음 · `monthFrom ≤ monthTo`가 아니어도 됨(2학기 12→1월) · `UNKNOWN`·`WEEK_UNRESOLVED` 행도 버리지 않는다.
- 받지 않는 것(0.3에서도 `unknown_field`): `document{}`·`source.sectionCount`(모양 미합의), 행의 `relatedItemKeys`·`linkageNotes`(계정 B도 제외), `extensions`.
- **A28-27 (2026-11-22, 서버 분석기 규칙 · 계약 모양 변경 없음)**: 월이 표 밖 제목(`■ 8월`·`8월`·`2026년 8월`·`[9월] 교수·학습 운영 계획`)에 있고 표에는 `주` 열만 있는 진도표도 행으로 읽는다. 월 제목은 표 바로 앞 마지막 본문 줄이 월 제목 하나뿐일 때만 인정(본문 문장 속 월·날짜는 근거 아님). 쪽을 넘긴 같은 과목·같은 머리 줄 표만 앞 표 월을 이어받는다(과목 전환·새 과목 머리 표·쪽 건너뜀·사이 다른 표·다른 월 표시가 있으면 이어받지 않음). 행 결과: 한 달 제목 = `month`·`weekFrom/To`(`WEEK_IN_MONTH`, `monthBasis = MONTH`), 주 칸이 월로 시작(`9월 1주`)하면 그 월, 두 달 제목(`■ 12월, 1월`)이나 다음 달로 넘어가는 주 칸(`5 - 1월 2주`)은 `month`~`monthTo` 범위(`MONTH_RANGE`, 주 위치 없음·원문 `weekLabel` 유지). 날짜·연도는 만들지 않는다. 월 열이 있는 기존 진도표 결과는 바뀌지 않는다. 근거 `sources[0].pdfPageNumber` = 그 표의 쪽.

**PDF 원문 근거 쪽 범위 규칙** (A16, 2026-11-16 사용자 승인 · DRAFT — 구현됨, 0.2·0.3 공통)

| 근거 | 문서 쪽 수(1~`source.pageCount`) | 과목 `pageRange` 안 |
|---|---|---|
| `subjects[].pageRange` 자체 | `from ≤ to ≤ pageCount` (아니면 `subjects[n].pageRange: out_of_range`) | — |
| `subjects[].sources[]` (과목 확인 근거) | 필수 | **요구하지 않음** — 공통 머리글·과목 요약표 쪽은 과목 본문 범위 밖일 수 있다 |
| `writtenEvaluation`·`exams[]`·`performanceEvaluation`·`items[]`·`rubric[]`의 `sources` | 필수 | 필수 (`pageRange`가 있을 때) — 변경 없음 |
| 0.3 `extraction.issues[].sources`·`teachingPlan[].sources` | 필수 | 요구하지 않음 — 변경 없음 |

- `pageRange`는 과목 **본문**이 있는 쪽이고, `subjects[].sources`는 그 과목을 원문에서 확인할 수 있는 근거다. 계정 A는 근거를 지우거나 `pageRange`를 넓혀 맞추지 않고 받은 그대로 저장한다.
- 문서 쪽 수를 넘는 근거는 어느 위치든 `…pdfPageNumber: out_of_range`, 1 미만은 형식 오류다. HWP·HWPX `documentLocator` 규칙은 변경 없음.
- 이전(A15까지)에는 과목 근거에도 `pageRange`를 적용해, 실제 분석기 결과(F01664, 40과목 중 22과목이 1쪽 머리글을 과목 근거로 보냄)가 `502 PLAN_ANALYZER_BAD_RESPONSE`로 거절됐다.

Envelope ↔ payload (0.3만):

| Envelope `status` | payload `status` | Run |
|---|---|---|
| `OK_REVIEW_REQUIRED` | `REVIEW_REQUIRED` | `REVIEW_REQUIRED` |
| `PARTIAL` | `PARTIAL` | `PARTIAL` |
| `PARSE_FAILED`·`NO_ASSESSMENTS_EXTRACTED`·`NO_SEGMENTS`·`UNSUPPORTED_FORMAT`·`NEEDS_OCR` | `FAILED` | `FAILED` |
| 그 밖·조합 불일치 | — | 저장 안 함 `502 status_conflict`/`unknown_status` |

0.2 표(§39-2)는 바뀌지 않는다 — 실제 분석기 v21.1은 평가 목록이 없는 문서에 Envelope `NO_ASSESSMENTS_EXTRACTED` + payload `FAILED`를 보내며, 0.2 경로에서는 지금도 `502 unknown_status`다(2026-11-15 실분석기 확인, 결정 대기 D-A6-3).

저장·응답: Run에 `contract_version`·`analyzer_profile`을 기록하고 과목 JSON(`extraction`·`teachingPlan` 포함)을 받은 그대로 저장한다. `GET .../analysis` 응답 `analyzer`에 `contractVersion`·`profile`(있을 때만)이 붙고, `subjects[]`는 받은 그대로다. 학생 응답에는 어느 것도 나가지 않는다.

### 39-8. 재검토·재확정·확정 이력 (A12, 2026-11-16 사용자 결정 · DRAFT — 구현됨, 평가 정보만)

```http
POST /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/review-draft/reopen   # 재검토 시작
GET  /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/reviews               # 확정 이력
```

- 규칙(사용자 결정): 이전 확정 기록 불변 · 재검토는 초안으로 · 재확정은 **새 확정 기록** · 학생은 최신 확정 기록만 · 이전 기록은 관리자만 · 재검토 중 학생 공개값 불변 · 평가 정보와 운영계획은 따로.
- `reopen`: 확정된 Revision만(아니면 `409 revision: not_confirmed`). 최신 분석 결과의 평가 정보 초안이 확정으로 닫혀 있으면 다시 열고, 초안이 없으면(API 확정 등) 그 분석 결과로 한 최신 확정값으로 채운 새 초안을 만든다(과목 번호 `analysisSubjectIndex`가 있는 값만, 과목 연결 포함). 이미 열려 있으면 `409 draft: already_open`. 응답은 §39-4 GET과 같다.
- 재검토 중에는 §39-4 초안 저장이 허용된다(아니면 기존대로 `409 revision: already_confirmed`). `PUT .../review`는 확정된 Revision이면 재검토가 열려 있어야 한다(아니면 `409 INVALID_STATE_TRANSITION revision: re_review_not_started`). 확정하면 초안을 다시 닫는다.
- 확정 기록 순서: 고정 시계(시연·시험)나 같은 순간의 재확정에서도 새 기록이 이전 기록보다 1µs 이상 뒤가 되도록 서버가 정한다(DATETIME(6)).
- `reviews` 응답: `{ planId, revisionId, reReviewOpen, items: [{ reviewId, analysisId, reviewedBy, reviewedAt, current, confirmedFieldCount, confirmedFields[] }] }` 최신 → 과거, `current` = 학생 공개 중. 관리자 전용(학생 응답 없음).
- 운영계획(§39-6) 재검토·재확정은 A13에서 별도 범위로 구현했다(§39-10). 두 확정 범위는 서로의 초안·이력에 영향을 주지 않는다.

### 39-9. 채점기준 수동 보완 (A12 · DRAFT — 구현됨)

- 확정값 `fieldPath = performanceEvaluation.items[n].rubric`, `value` = 그 항목 채점표 전체 `[{ element, levels: [{ description, score|null }] }]`(요소 1~30, 수준 0~10, element 1~200자, description 1~500자, score 0~1000). 모양이 다르면 `400 …value: rubric_shape`. PDF는 근거 쪽(`pdfPageNumber`) 필수(기존 `evidence_required`).
- 분석 후보(`subjects[].performanceEvaluation.items[n].rubric`)는 바뀌지 않는다. 관리자 값은 초안(§39-4, 결정 `EDITED`, value = JSON 글자)에 저장되고 확정 때 확정값이 된다.
- 학생 §10-1 상세 `confirmedFields`에 같은 경로·값으로 나온다(학생 화면 '세부 채점기준' 표).

### 39-10. 운영계획 재검토·재확정·확정 이력 (A13, 2026-11-16 사용자 승인 · DRAFT — 구현됨)

```http
POST /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/teaching-plan-draft/reopen   # 운영계획 재검토 시작
GET  /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/teaching-plan-reviews        # 운영계획 확정 이력
```

- 규칙: 확정 버전 불변 · 재검토 중 학생은 이전(최신) 확정 버전 · 재확정 = 새 버전 · 이전 버전은 관리자만 · 평가 정보 확정·재검토(§39-8)와 독립 · 제외 행 비공개 · 정밀도·시기 불명·학기 밖 행 보존(행 모양 §39-3 그대로).
- 저장: Migration `V202611160100` — `assessment_plan_teaching_plan_review.version_no`(기존 행 = 1), `UNIQUE(revision_id, version_no)`(옛 `UNIQUE(revision_id)` 제거). 최신 = 가장 큰 `version_no`(시각과 무관하게 안정). 같은 버전을 두 번 저장하면 DB가 거절 → `409 teaching_plan_already_confirmed`(동시 재확정 방지). 새 버전의 확정 시각도 이전 버전보다 항상 뒤.
- `reopen`: 운영계획이 확정된 Revision만(아니면 `409 revision: teaching_plan_not_confirmed`). 확정으로 닫힌 운영계획 초안을 다시 열거나, 없으면(API 확정 등) 같은 분석 결과의 최신 확정 행으로 새 초안을 채운다(CONFIRMED → CONFIRMED, EXCLUDED → ABSENT, EDITED → 고친 칸만 edits JSON, 과목 연결 포함). 이미 열려 있으면 `409 draft: already_open`. 응답은 §39-6 운영계획 초안 GET과 같다.
- 재검토 중에는 운영계획 초안 저장·`PUT .../teaching-plan-review`(다시 확정)가 허용된다. 응답 `review.versionNo` = 그 버전.
- `teaching-plan-reviews`: `{ planId, revisionId, reReviewOpen, items: [{ reviewId, versionNo, analysisId, reviewedBy, reviewedAt, current, publishedRowCount, excludedRowCount, rows[] }] }` 최신 → 과거(rows는 §39-6 RowView). 관리자 전용 — 학생 응답(§10-1-2)에는 버전·이력·제외 행이 없다.
- 분석 후보에 없는 **새 행 추가**는 A14 §39-11(관리자 직접 추가 행).

### 39-11. 운영계획 관리자 직접 추가 행 (A14, 2026-11-16 사용자 지시 · DRAFT — 구현됨)

```http
POST /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/teaching-plan-draft/manual-rows             # 새 행
PUT  /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/teaching-plan-draft/manual-rows/{rowKey}    # 수정·제외·복원
```

- 의미: 분석 결과(Run)에 없던 운영계획 행을 관리자가 원문을 보고 **운영계획 초안**에 직접 추가한다. 분석 후보 행과 출처가 다르며(`origin: "MANUAL"`), 분석 결과(Run)는 바꾸지 않는다. 학생에게는 운영계획 확정(§39-6·§39-10) 뒤에만 보인다.
- 요청(둘 다): `{ analysisId, baseVersion, row: { subjectIndex, status: "INCLUDED"|"EXCLUDED", unit?, content?, note?, specialSchedule?, achievementStandards?: [{code?, text?}], teachingMethods?: [string], assessmentMethods?: [string], schedule: Schedule(§39-3), pdfPageNumber? } }`. 응답은 §39-6 운영계획 초안 GET과 같고 `draft.manualRows[]`가 추가된다.
- `draft.manualRows[]`: `{ rowKey, origin: "MANUAL", subjectIndex, status, unit, content, note, specialSchedule, achievementStandards, teachingMethods, assessmentMethods, schedule, pdfPageNumber, createdBy, createdAt, updatedBy, updatedAt }`. 평가 정보 초안·이전 초안은 빈 목록.
- 행 키: **서버 발급** `manual_` + 16자리(같은 과목의 분석 후보 `rowKey`·기존 추가 행 키와 겹치지 않음). 재검토·재확정에서도 같은 키가 같은 행을 가리킨다. 요청으로 키를 정할 수 없다.
- 저장 규칙(운영계획 초안 저장과 같음): 최신 분석 결과만(`analysisId: unknown` 400 · 바뀜 409 `PLAN_REVIEW_DRAFT_STALE`) · 분석 실패·운영계획 후보 0행 문서는 `400 analysisId: analysis_failed | no_teaching_plan`(분석 결과가 전혀 없는 문서의 수동 전체 작성은 범위 밖) · 확정된 운영계획은 재검토(§39-10) 중에만(아니면 `409 revision: teaching_plan_already_confirmed`) · `baseVersion` 낙관적 잠금(초안이 없으면 `null` → 새 초안, 다르면 `409 PLAN_REVIEW_DRAFT_CONFLICT`) — **같은 생성 요청을 다시 보내면 409라 행이 두 번 생기지 않는다**.
- 입력 검증: 단원·학습 내용·특별 일정 중 하나 필수(`row.content: required`) · 월 1~12·주차 1~25(요청 형식 400) · §39-3 일정 규칙(주차 거꾸로 `row.schedule.weekTo: out_of_range`, 날짜 정밀도의 날짜) · 정밀도별 최소 값(`MONTH`·`MONTH_RANGE`·`WEEK_IN_MONTH` → `monthFrom`, `MONTH_RANGE` → `monthTo`, `WEEK_IN_MONTH`·`TERM_WEEK` → `weekFrom`, `DATE_RANGE` → `dateTo`: `required`) · 연도(`calendarYear`) 금지(`not_allowed` — 원문 칸 근거를 관리자 입력으로 만들지 않음) · `pdfPageNumber`는 PDF 쪽 수 안(`out_of_range`), HWP·HWPX는 `not_allowed` · 분석 결과에 없는 과목 슬롯 `row.subjectIndex: out_of_range`. 서버는 월·주차를 추정하지 않는다(분석기 주차 해석 규칙과 무관).
- 수정(PUT): 이 초안에 있는 키만(없으면 `404 NOT_FOUND` — 다른 Revision·다른 분석 결과·위조 키 포함), 과목 슬롯은 바꿀 수 없다(`row.subjectIndex: conflict`). 제외 = `status: EXCLUDED`, 복원 = `INCLUDED`(내용 그대로).
- `PUT .../teaching-plan-draft`(행 결정 자동 저장)는 `manualRows`를 받지 않고 **그대로 보존**한다(기존 요청 모양 그대로).
- 확정(`PUT .../teaching-plan-review`)에 선택 필드 `manualRows: [{ rowKey, subjectIndex, subjectId, decision: "CONFIRMED"|"EXCLUDED" }]` 추가. 내용은 서버가 **열려 있는 운영계획 초안의 행**에서 가져온다(요청으로 내용을 바꿀 수 없음). 검증: 초안에 없는 키 `manualRows[n].rowKey: unknown` · 초안과 다른 과목 슬롯 `subjectIndex: conflict` · 초안 상태와 다른 결정(화면이 오래됨) `decision: conflict` · 문서 슬롯 밖 과목 `subjectId: unknown` · 같은 과목 슬롯의 후보 행과 다른 과목 `subjectId: conflict` · 중복 `rowKey: duplicate`. `rows`는 이제 0행 허용(후보 행 + 추가 행 합이 0이면 `rows: required`). 기존 요청(`manualRows` 없음)은 그대로 동작한다.
- 확정 행 저장: `assessment_plan_teaching_plan_row.row_origin` = `ANALYSIS`(기존 행 전부) | `MANUAL`, 관리자 추가 행은 `candidate_json = NULL`·결정 `CONFIRMED`/`EXCLUDED`만(DB CHECK, Migration `V202611160200`). 행 JSON은 §39-3 행 모양 + `origin: "MANUAL"`·`manualPdfPageNumber`, `sources: []`(분석 근거로 위장하지 않음). 월·주차 칸은 관리자가 고른 `schedule` 값 그대로 옮긴다. 버전마다 새로 INSERT(이전 버전의 추가 행 불변).
- 관리자 응답: 확정 행 `RowView`에 `origin` 추가(`candidate`는 추가 행이면 `null`) — §39-6 GET·§39-10 이력. 학생(§10-1-2): 응답 모양 변경 없음. 추가 행도 같은 `rows[]`에 나오고, `pdfPageNumber`는 관리자 확인 쪽(없으면 `null`). 버전·출처·제외 행은 보내지 않는다. 운영계획 행으로 수행평가 과제를 만들지 않는다.


### 39-12. analysis-import-0.3 선택 확장 필드 (A15, 2026-11-16 사용자 지시 · DRAFT — 계정 A 수신 구현됨, 계정 B 실험 프로필 `v21.10-b16-dev` 실제 HTTP 수신 확인(A17), 운영 기본값 아님)

**실제 출력 확인 (A17, 2026-11-16)**: 계정 B B16(`aa58cb0`) 분석기를 세 Flag(`--enable-contract03 --enable-contract03-b13 --enable-contract03-ext`)로 실행하고 계정 A `assessment.analyzer.contract03-version=v21.10-b16-dev`로 요청 — 요청 모양은 같다. 확장 필드를 뺀 응답은 같은 문서의 `v21.9-b13-dev`와 같았다(9/9). 확장 Flag가 꺼진 분석기에 B16을 요청하면 `422 PLAN_ANALYSIS_UNSUPPORTED (analyzer_rejected:contract03_experimental_disabled)`, 저장 없음 — B13으로 대체하지 않는다. 계약 변경 없음.

계정 B `contract03-ext-0.1`(B13 변경 요청서·B14 인수인계)의 선택 필드 3종을 **0.3에서만** 받는다. 모두 생략 가능(생략 = 기존 0.3과 같음, 저장 JSON에 키가 생기지 않음). 0.2(`contractVersion` 없음)에 오면 지금처럼 `unknown_field`. 그 밖의 새 필드(예: `rubric[].confidence`, `subjects[].semester`)도 계속 `unknown_field`.

| 필드 | 형태 | 계정 A 처리 |
|---|---|---|
| `subjects[].performanceEvaluation.items[].rubric[].maxScore?` | 0~1000 숫자 | 요소 배점. 수준 점수(`levels[].score`)와 별개로 저장·표시. Wizard 후보 표 '요소 배점 N점', 채점기준 수동 보완(§39-9)에서 수정·입력, 확정 채점표 값(`performanceEvaluation.items[n].rubric`)의 기준마다 선택 `maxScore`(0~1000 또는 null, 그 밖 키는 `rubric_shape`) → 학생 확정 채점표 '배점 N점'. Migration 없음(확정값은 기존 JSON 값) |
| `…rubric[].linkReview?` | `"REVIEW_REQUIRED"`만 | 분석 후보에만 저장. Wizard 채점 요소에 '연결 확인 필요 · 간접 근거' 배지(원문 근거 버튼 그대로). 확정값·학생 응답에는 나가지 않는다 |
| `subjects[].grades?` | 정수 1~6 배열(1~6개, 중복 `grades: duplicate`) | 원문 근거 학년만(추정 금지 — 계정 A도 만들지 않음). Wizard 과목 카드·운영계획 과목 머리에 '원문 N학년'. 학생 응답에 나가지 않는다 |

**과목 중복 판정(§39-7 `duplicate` 개정)**: 같은 과목명(앞뒤 공백 제거)이 다시 나오면 거절. 단 **양쪽 모두 `grades`가 있고 학년이 겹치지 않으면** 다른 학년의 같은 과목으로 둘 다 받는다(과목 번호 `analysisSubjectIndex`로 구분 — 이름으로 합치지 않음).

| 경우 | 판정 |
|---|---|
| 다른 학년(양쪽 근거, 겹침 없음) | 둘 다 받음 |
| 같은 학년 반복·학년 일부 겹침 | `subjects[n].subjectName: duplicate` |
| 한쪽이라도 학년 근거 없음 | `duplicate`(같은 과목인지 판단 불가) |
| 같은 학년·다른 학기 | 받지 않음(학기 필드 없음, 문서 단위 학기와 충돌 가능 — 별도 결정) |

계정 A는 계정 B가 보내지 않은 과목을 만들지 않는다(B14 표본: 중복 탈락 287과목 중 다른 학년 근거 7과목, 2%).

**학년 문맥 충돌(학생 노출 방지)**: 분석 과목에 `grades`가 있고 문서 학년(평가계획서 슬롯의 학년)이 그 안에 없으면 그 과목은 확정할 수 없다 — 평가 정보 `reviewedSubjects[n].analysisSubjectIndex: grade_conflict`, 운영계획 `rows[n].subjectIndex`·`manualRows[n].subjectIndex: grade_conflict`(400, 아무것도 저장 안 함). `grades`가 없으면 판단하지 않는다(기존과 같음).

**계정 B 출력 활성화 조건(제안)**: ① 이 절의 계정 A 구현이 공유 Branch에 들어감 ② B가 실험 Flag(예: `--enable-contract03-ext`)·실험 버전에서만 출력 ③ 계정 A 개발 환경에서 실제 HTTP 응답으로 수신 확인 ④ 합의 후 기본값. 되돌리기 = B Flag OFF(계정 A는 생략을 그대로 받는다).

**과목 수 상한 40(검토만, 변경 안 함)**: `subjects` `@Size(max=40)`, 확정값 `analysis_subject_index` CHECK 0~39(V202611111600), 초안·운영계획 요청 `subjectIndex` `@Max(49)`, 업로드 101MB·요청 본문 한도 충분, 80과목 예상 payload 약 3.1MB(p95 5.1MB, B14). 상향하려면 DTO 상한·CHECK 교체 Migration·Wizard 과목 목록(검색·학년 묶음) 함께 필요 — A15 보고서의 제안대로 사용자 결정 후 진행.

### 39-6. 월별 교수·학습 운영계획 검토·확정 (A6, 2026-11-15 DRAFT — 구현됨)

```http
GET /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/teaching-plan-review
PUT /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/teaching-plan-review
```

- 평가 정보 확정(§39 PUT review)과 **별도**다. 순서 제약 없음. 운영계획 행은 수행평가 확정값이 아니다.
- PUT 본문: `{ analysisId, rows:[{ subjectIndex, rowKey, subjectId, decision: CONFIRMED|EDITED|EXCLUDED, edits }] }`.
  - `analysisId`: 그 Revision의 **최신** 분석 결과, `REVIEW_REQUIRED`·`PARTIAL`이고 운영계획 행이 있어야 한다(아니면 `400 analysisId: stale|analysis_failed|no_teaching_plan`).
  - `(subjectIndex, rowKey)`는 그 분석 결과에 있어야 한다(`unknown`), 중복 `duplicate`. 요청에 없는 후보 행은 공개되지 않는다.
  - `subjectId`: 그 슬롯 학업 Context 과목(§39 review와 같은 검사, `unknown`). 같은 `subjectIndex`는 같은 `subjectId`.
  - `edits`: `EDITED`일 때만 필수 — `unit`·`content`·`note`·`specialSchedule`(문자열 — `null`이면 후보 그대로, 빈 문자열이면 값 지움)·`schedule`(`null`이면 후보 그대로)(§39-3 모양·규칙. `calendarYear`는 후보 값과 같을 때만 허용 — 연도를 새로 만들지 않음). 그 밖 필드는 후보 그대로.
  - `EXCLUDED`: 학생에게 보이지 않는다(기록은 남김).
- 같은 Revision에 이미 확정된 운영계획이 있으면 `409 INVALID_STATE_TRANSITION (teaching_plan_already_confirmed)` — 단 A13부터 운영계획 재검토를 시작(§39-10)한 분석 결과로는 다시 확정할 수 있다(새 확정 버전).
- 저장: 확정 기록 1건 + 행별 결과(최종 값·원래 후보·결정·확정자·시각). 후보(Run)는 바뀌지 않는다.
- 응답(GET·PUT 같음): `{ planId, revisionId, latestAnalysisId, candidateRowCount, review: null | { analysisId, reviewedBy, reviewedAt, rows:[{ subjectIndex, rowKey, subjectId, decision, row, candidate }] } }` — `row`는 확정된 최종 행(§39-3 행 모양), `candidate`는 원래 후보 행.
- 검토 중 결정은 **운영계획 전용 공유 초안**에 저장한다 (A7, 2026-11-15 — 평가 정보 초안과 수명주기 분리):

```http
GET /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/teaching-plan-draft
PUT /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/teaching-plan-draft
```

  요청·응답·충돌(409 CONFLICT / STALE)은 §39-4와 같다. 차이: `fieldPath`는 행 결정 `teachingPlan[n]`만(CONFIRMED · EDITED · ABSENT=제외, EDITED의 `value`는 `edits` JSON 문자열 ≤1000자), 평가 정보가 **확정된 뒤에도 저장**된다, 운영계획 확정(PUT teaching-plan-review)이 이 초안을 닫고 그 뒤 저장은 `409 INVALID_STATE_TRANSITION (teaching_plan_already_confirmed)`. 반대로 §39-4 평가 정보 초안은 `teachingPlan` 경로를 받지 않는다(`400 fieldPath: not_allowed`). 평가 정보 확정은 평가 정보 초안만 닫는다. 초안은 학생에게 공개되지 않는다. 저장: `assessment_plan_review_draft.scope = TEACHING_PLAN` (V202611150200).

---
---

# 40. Admin — 모의고사 탐구 소재 콘텐츠 (AD-06)

```http
GET    /api/admin/assessment/mock-exam-materials?query=&status=&page=0&size=20
POST   /api/admin/assessment/mock-exam-materials
GET    /api/admin/assessment/mock-exam-materials/{materialId}
PATCH  /api/admin/assessment/mock-exam-materials/{materialId}
POST   /api/admin/assessment/mock-exam-materials/{materialId}/publish
POST   /api/admin/assessment/mock-exam-materials/{materialId}/unpublish
```

요청 예:

```json
{
  "title": "도시 교통 흐름", "academicYear": 2026, "examMonth": 9, "grade": 1,
  "subjectId": "subj_01", "questionNumber": "15", "sourceUrl": null,
  "mainConcepts": ["이동 동선", "혼잡"], "inquiryGoals": ["혼잡 시간대 분석"],
  "methods": ["관찰", "비교"], "suggestedTitles": [], "sourceLicenseNote": null,
  "internalMemo": "학생 공개 제외"
}
```

공개 DTO에서 `internalMemo` 제외. 원문 이용조건을 확인하지 않은 저작물 전문을 무단 배포하지 않는다. 수정/비공개가 이미 시작된 학생 개인 Task를 자동 삭제하지 않는다.

---

# 41. Admin — 공통 심화 Task 콘텐츠 (AD-09)

```http
GET    /api/admin/assessment/enrichment/catalog?query=&status=&page=0&size=20
POST   /api/admin/assessment/enrichment/catalog
GET    /api/admin/assessment/enrichment/catalog/{catalogTaskId}
PATCH  /api/admin/assessment/enrichment/catalog/{catalogTaskId}
POST   /api/admin/assessment/enrichment/catalog/{catalogTaskId}/publish
POST   /api/admin/assessment/enrichment/catalog/{catalogTaskId}/unpublish
```

```json
{
  "title": "하천 수질 데이터 조사", "subjectId": "subj_01", "curriculumConcept": "생태계",
  "problem": "지역 하천 변화를 어떻게 확인할까?", "goal": "지표를 직접 비교",
  "methods": ["관찰", "자료 분석"], "resources": [], "expectedArtifacts": ["보고서"],
  "selfCheckItems": [], "relatedMaterialIds": []
}
```

공개/비공개는 공통 콘텐츠 노출만 변경하며 학생 `EnrichmentTask` 데이터를 변경하지 않는다. 관리자 콘텐츠는 학생의 학교 수행평가가 아니다.

---

# 42. Admin — 대학 공식 공개 자료 (AD-10)

```http
GET    /api/admin/assessment/university-resources?query=&university=&page=0&size=20
POST   /api/admin/assessment/university-resources
GET    /api/admin/assessment/university-resources/{resourceId}
PATCH  /api/admin/assessment/university-resources/{resourceId}
POST   /api/admin/assessment/university-resources/{resourceId}/publish
POST   /api/admin/assessment/university-resources/{resourceId}/unpublish
```

```json
{
  "university": "서울대학교", "title": "공개 안내 자료", "academicYear": 2026,
  "category": "공식 자료", "sourceUrl": "https://example.org/official", "fileRef": null,
  "publisher": "대학 공식 게시처", "checkedDate": "2026-10-20", "licenseNote": null,
  "relatedSubjectIds": [], "relatedCatalogTaskIds": []
}
```

공개는 공식 URL·이용조건 확인을 전제로 한다. 면접 시뮬레이션 API를 생성하지 않는다.

---

# 43. Admin — 내부 참고자료실·스크랩 (AD-07·08)

```http
GET    /api/admin/assessment/reference-library?query=&type=&page=0&size=20
POST   /api/admin/assessment/reference-library
GET    /api/admin/assessment/reference-library/{scrapId}
PATCH  /api/admin/assessment/reference-library/{scrapId}
DELETE /api/admin/assessment/reference-library/{scrapId}
```

```json
{
  "title": "환경 관련 기사", "sourceUrl": "https://example.org/article", "sourceName": "예시 출처",
  "type": "ARTICLE", "memo": "활동 추천용", "tags": ["환경"], "subjectIds": ["subj_01"]
}
```

모든 내부 스크랩은 **기본 비공개**이며, 학생 대상 FeedbackRecommendation/공개 Task에서 선택한 자료만 외부 노출한다. 삭제로 이미 전달한 피드백의 참조 스냅샷이 무결성을 잃지 않도록 보존 정책 검토.

---

# 44. Admin — Assessment 피드백 요청 목록 (AD-14)

```http
GET /api/admin/assessment/feedback-requests?status=PENDING&schoolId=&subjectId=&query=&page=0&size=20
GET /api/admin/assessment/feedback-requests/{requestId}
```

```json
{
  "requestId": "fbr_001", "student": { "studentId": "student_001", "displayName": "예시 학생" },
  "sourceType": "SCHOOL_ASSESSMENT", "sourceId": "assessment_001", "requestedAt": "2026-10-20T12:00:00+09:00",
  "status": "PENDING", "snapshot": {
    "noteRevisionId": "rev_002", "artifactVersionIds": ["version_002"], "locked": true
  }
}
```

관리자 상세는 요청 당시 버전·노트 본문·파일 Metadata에 접근하되, **현재 최신 노트**로 갈아끼우지 않는다. 권한 있는 관리자 담당 학생인지 서버에서 확인한다. 요청이 없어도 볼 수 있는 전체 학생 기록은 §34~36이 소유한다.

---

# 45. Admin — 피드백 임시 저장·전달 (AD-15)

```http
PUT  /api/admin/assessment/feedback-requests/{requestId}/reply-draft
POST /api/admin/assessment/feedback-requests/{requestId}/deliver
```

Request draft:

```json
{
  "overallComment": "주장에 근거를 더 연결해 주세요.",
  "comments": [
    { "targetType": "PDF", "artifactVersionId": "version_002", "location": { "type": "PDF_PAGE", "pageNumber": 3 }, "text": "출처를 추가해 주세요." },
    { "targetType": "NOTE", "noteRevisionId": "rev_002", "location": { "type": "NOTE_BLOCK", "blockId": "block_001" }, "text": "선정 이유 구체화" }
  ], "recommendations": []
}
```

`PUT`는 관리자 내부 답변 초안의 `DRAFT_SAVED` 상태를 만들거나 갱신하며 **요청은 계속 `PENDING`**이다. `POST deliver`가 성공했을 때에만 Reply와 FeedbackRequest를 `DELIVERED`로 함께 반영하고 학생에게 공개한다. 실패하면 전달 완료로 표시하지 않는다. **관리자는 학생 작성 본문을 수정할 수 없고** Reply/Comment에만 쓰기 권한이 있다. 전달 직전에 Snapshot과 코멘트 대상의 버전 소속 여부/위치 형식 검증한다. 비교 불가 문서는 전체 의견(`location=null`)만 허용한다.

요청별 단일 Reply/재답변/수정 정책이 미정이면 전달 후 덮어쓰기·삭제를 허용하지 않는다. `409 INVALID_STATE_TRANSITION` 또는 `409 FEEDBACK_ALREADY_DELIVERED`.

---

# 46. Admin — 피드백 후속 추천 (AD-16)

후속 제안은 §45의 `recommendations[]`에 포함된다. 별도 Endpoint를 기본값으로 만들지 않는다.

```json
{
  "recommendations": [
    { "type": "RESOURCE", "resourceId": "scrap_001", "note": "공식 통계 기준을 확인해보세요." },
    { "type": "ENRICHMENT_TASK", "catalogTaskId": "catalog_001", "note": "추가 조사를 해볼 수 있어요." }
  ]
}
```

관리자 내부 `scrapId` 자체를 학생에게 노출하는 방식이 아닌 **공개 가능한 원본 링크/메타데이터 Projection**으로 전달한다. 상담 기록, 관리자 개인 메모, 승인/반려/의무 재제출은 포함하지 않는다.

---

# 47. Admin — 활동 현황 파생 집계 (AD-17)

```http
GET /api/admin/assessment/activity-summary?studentId=&subjectId=&academicYear=2026&semester=2
```

```json
{
  "schoolAssessment": { "beforeStart": 0, "inProgress": 0, "completed": 0 },
  "enrichmentTask": { "beforeStart": 0, "inProgress": 0, "completed": 0 },
  "feedback": { "pending": 0, "delivered": 0 }
}
```

카운터는 실제 Entity 상태에서 계산한다. 기존 Student Care/운영 대시보드 통계와 구분하여 표시한다. 승인 없는 전 지점 조회 불가.

---

# 47-A. Admin — Assessment AI 분석 (PROPOSED, P-31)

> **PROPOSED — 팀 승인 전.** API-OD-A10(AI Provider·비용·재시도)·Existing Authentication이 미결이다. 이 절은 구현과 같은 Shape을 기록한 초안이며 계약 확정이 아니다.
> Actor: ADMIN. 인증 연동 전이므로 운영 환경에서 Provider를 켜지 않는다. 결과는 저장·공개하지 않는다 (AI 결과 = Candidate).

```http
GET  /api/admin/assessment/ai/status
POST /api/admin/assessment/ai/evaluation-plan-analyses   (multipart: file=PDF, hint?)
POST /api/admin/assessment/ai/university-exam-analyses   (multipart: file=PDF, hint?)
POST /api/admin/assessment/ai/mock-exam-analyses         (JSON)
Idempotency-Key: <선택, 같은 Key·같은 원본 → 같은 결과 / 같은 Key·다른 원본 → 409>
```

```json
{
  "analysisId": "ai_...",
  "kind": "EVALUATION_PLAN",
  "status": "REVIEW_REQUIRED",
  "provider": "anthropic",
  "model": "claude-opus-5-5",
  "source": { "fileName": "plan.pdf", "sha256": "...", "pageCount": 12, "textPageCount": 11, "characterCount": 18340 },
  "result": { "schoolName": { "found": true, "value": "...", "pdfPage": 1, "printedPage": "", "evidenceQuote": "..." }, "subjects": [] },
  "evidenceChecks": [ { "path": "subjects[0].performanceTotalRatio", "pdfPage": 3, "verified": false, "reason": "숫자 값을 근거 쪽에서 찾지 못했어요" } ],
  "warnings": [ "..." ],
  "createdAt": "2026-10-29T10:00:00+09:00"
}
```

- `pdfPage`는 PDF 물리 쪽(1부터), `printedPage`는 문서에 인쇄된 쪽. 원문에 없으면 `found=false`(0으로 바꾸지 않음).
- 서버는 AI 출력을 원문 텍스트와 다시 대조한다(근거 문장·쪽 범위·숫자). 합계 불일치는 자동 보정하지 않고 `warnings`.
- 모의고사 요청: `{subjectName, academicYear?, examMonth?, grade?, questionNumber?, fieldHint?, passageText(50~20000자), aiTransferConfirmed}`. `aiTransferConfirmed=false`면 Provider로 보내지 않고 422.
- Error: `503 AI_PROVIDER_NOT_CONFIGURED`, `502 ASSESSMENT_AI_UNAVAILABLE`, `502 AI_OUTPUT_INVALID`, `422 AI_REFUSED`, `415 UNSUPPORTED_FILE_TYPE`, `413 FILE_TOO_LARGE`, `422 PDF_EXTRACTION_FAILED`, `422 PDF_TEXT_NOT_FOUND`(이미지형 PDF, OCR 미연결), `422 PDF_TOO_MANY_PAGES`, `422 AI_TRANSFER_NOT_ALLOWED`, `409 IDEMPOTENCY_KEY_REUSED`, `400 VALIDATION_ERROR`.
- 관리자 검토 기록 저장 Endpoint는 아직 없다 (Stage 1 Admin Mock Store에만 기록). 공식 평가계획서·학생 기록·대학 자료 Manifest에 자동 반영하지 않는다.

---

# 48. File Contract

현재 파일 사용: 평가계획서 PDF(공통/개인), 학생 개인 모의고사 파일, AssessmentNote 링크/이미지, 실제 ArtifactVersion, 대학 공개 자료(권리 확인 시). `fileRef`는 **ID**이며 외부 공개 URL이 아니다.

```json
{
  "fileRef": "file_003", "fileName": "수질보고서_최종.pdf", "contentType": "application/pdf",
  "sizeBytes": 245000, "checksum": null, "previewAvailable": false
}
```

파일명·확장자만으로 유형을 신뢰하지 않는다. Student/Admin 모두 서버에서 소유권·기관 범위를 확인한다. Provider, 업로드 제한, 바이러스 검사, 미리보기 변환, Signed URL 만료·철회 정책은 Open Decision.

---

# 49. Pagination Contract

기존 §4 응답(`items`, `page.number`, `page.size`, `page.totalElements`, `page.totalPages`) 유지. `page`는 0-based. `?page=0&size=20`을 기본 예시로 사용한다. 실제 최대 size와 정렬 허용 필드는 Endpoint에서 검증한다.

---

# 50. Sort Contract

```text
?sort=updatedAt,desc
?sort=title,asc&sort=updatedAt,desc
```

허용 필드 외 Sort는 `400 VALIDATION_ERROR`; Admin 범위 밖 데이터에 대한 정렬·검색도 인증/인가를 통과한 행에서만 수행한다.

---

# 51. Idempotency

중복 요청 주의: 노트 자동저장, ArtifactVersion Upload, PDF Analysis 시작, FeedbackRequest Submit, Admin Feedback Deliver, 공통 자료 Publish. `Idempotency-Key` Header 사용은 서버 지원 시 결정하며 **피드백 요청·파일 업로드의 중복 방지 전략**은 필수로 구현한다. Key 저장 기간/요청 재사용 범위는 §61에 명시.

---

# 52. Optimistic Concurrency

Note 저장에는 `expectedRevisionId`, 콘텐츠 편집에는 `updatedAt`/Version Field, 피드백 임시 작성에는 `expectedVersion`을 검토한다. 충돌:

```http
409 Conflict
```

```json
{ "code": "RESOURCE_VERSION_CONFLICT", "message": "다른 변경사항이 먼저 저장되었습니다.", "details": { "currentRevisionId": "rev_003" } }
```

노트 클라이언트는 저장 실패 시 학생의 미저장 본문을 잃지 않아야 한다.

---

# 53. Common Error Codes — Assessment

| Status | Code | 의미 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 요청 구조·필수값·타입 오류 |
| 401 | `UNAUTHORIZED` | 인증 누락/만료 |
| 403 | `FORBIDDEN` | 접근 권한 부족 |
| 404 | `ASSESSMENT_NOT_FOUND` | 과제 없음 또는 허가되지 않은 자원에 대한 비노출 정책 |
| 404 | `ENRICHMENT_TASK_NOT_FOUND` | 개인 탐구 없음 |
| 404 | `NOTE_NOT_FOUND` / `NOTE_REVISION_NOT_FOUND` | 노트/Revision 없음 |
| 404 | `ARTIFACT_NOT_FOUND` / `ARTIFACT_VERSION_NOT_FOUND` | 결과물/버전 없음 |
| 404 | `FEEDBACK_REQUEST_NOT_FOUND` | 요청 없음 또는 권한 밖 |
| 409 | `RESOURCE_VERSION_CONFLICT` | 동시 수정 충돌 |
| 409 | `INVALID_STATE_TRANSITION` | 허용되지 않은 상태 전이 |
| 409 | `FEEDBACK_ALREADY_DELIVERED` | 완료된 답변의 중복 전달 |
| 409 | `FEEDBACK_SNAPSHOT_NOT_READY` | 미저장 노트/미완성 업로드 포함 |
| 409 | `FILE_VERSION_MISMATCH` | 다른 Artifact/과제에 속한 버전 |
| 409 | `PLAN_FILE_DUPLICATE` | 같은 평가계획서 문서에 같은 원문(SHA-256)을 다시 등록 (§38-1) |
| 409 | `FILE_INTEGRITY_FAILED` | 보관된 파일이 등록 당시 크기·SHA-256과 다름 (§26, §38-1) |
| 413 | `FILE_TOO_LARGE` | 업로드 정책 초과 |
| 415 | `UNSUPPORTED_FILE_TYPE` | 허용되지 않은 파일 형식 |
| 422 | `PDF_EXTRACTION_FAILED` | 분석 결과 생성 불가(상태 응답과 병행 가능) |
| 422 | `PREVIEW_UNAVAILABLE` | 지원 형식/변환 불가 |
| 422 | `PLAN_PREVIEW_FAILED` | HWP·HWPX 원문 구조를 읽지 못함(§38-6, `details.fields[file].reason`) |
| 502/503 | `ASSESSMENT_AI_UNAVAILABLE` | 분석/설명 Provider 장애 |
| 503 | `EXISTING_STUDENT_UNAVAILABLE` | 기존 학생 컨텍스트 연동 장애 |

공통 Error 목록과 HTTP Status는 §5 기준을 따른다. `NOT_FOUND`(경로 미존재)와 자원별 Not Found를 구분한다. AI 실패와 목록 0건을 혼동하지 않는다. Code 목록은 계약 초안이며 실제 Controller 검증/Domain 합의 없이 임의로 새 값을 배포하지 않는다.

---

# 54. State Transition Error

```json
{ "code": "INVALID_STATE_TRANSITION", "message": "현재 상태에서 해당 동작을 할 수 없습니다.", "details": { "currentState": "DELIVERED", "requestedAction": "DELIVER_AGAIN" } }
```

요청/답변 상태와 수행평가 상태는 독립이다. `SchoolAssessment.COMPLETED + FeedbackRequest.PENDING`는 유효하며, `DELIVERED` 답변을 기존 Approval/Reject로 해석하지 않는다.

---

# 55. Privacy Contract

- Student API는 인증한 학생 자료만 반환한다.
- Admin Assessment API는 **담당 기관·학생 범위**를 서버에서 검사한다. 피드백 미요청 학생의 노트 열람도 같은 검사 대상이다.
- Admin 학생 Note/Artifact는 **읽기 전용**이고 피드백은 별도 테이블/명령으로 저장한다.
- 타 지점 학생 ID/파일 ID를 직접 입력해도 접근이 불가능해야 한다.
- 개인 PDF·성장 기록·내부 스크랩·미공개 콘텐츠·공식 원본과 AI 추출 후보는 각기 다른 공개 범위를 갖는다.
- Wangyu Student Care/상담 데이터는 Assessment API에 자동 병합하지 않는다.

---

# 56. Owner / 공유 API 경계

본 API 문서는 **팀 공통 Contract**다. Assessment 영역 변경은 `docs/specs/suyeon/` 및 `docs/OWNERSHIP.md`를 따르고, 학생 케어는 `docs/specs/wangyu/`를 따른다. `§65` 기존 Wangyu Student Care 계약은 이번 작업에서 원문 보존한다.

구형 수연 기능의 `/api/mentor/**`, `/api/student/mentor-*/**`, `/api/admin/parent-reports/**`, 구형 8단계/면접/운영 API는 **신규 Assessment 계약이 아니다**. 실제 코드 삭제는 호출자/공유 의존성 검증 후 실행한다. 기존 LearnersHigh 연동의 실체가 확인되지 않으면 Backend Integration Layer에서 추측 구현하지 않는다.

**Wangyu Counseling / Student Care 보호 경계:** Assessment 계약 변경을 이유로 다음을 생성·교체·삭제하거나 Assessment 데이터에 자동 통합하지 않는다.

```text
Counseling Entity / API / DB / UI 및 Counseling CRM
Student / Parent / Joint Counseling, Admissions Counseling
Counseling Brief / Follow-up / Privacy 및 상담 메모
Student Care Signals / Cases / Recheck / Settings / Test Fixture
기존 Student Care 개인정보·기관·지점별 접근 경계
```

Assessment 피드백은 상담 업무가 아니며, 공통 인증·학생 ID·Admin Shell을 변경할 때에는 Owner 동의와 Shared 변경 절차가 선행되어야 한다. 기존 §65 계약의 요청·응답·오류·설명을 신규 Assessment 편의상 바꾸지 않는다.

---

# 57. API 변경 절차

```text
1. Feature Spec 확인
2. domain.md (Entity/State) 확인
3. docs/OWNERSHIP.md의 공동 영향 확인
4. api-contract.md 수정
5. Backend DTO/Controller/Service
6. Frontend Client/Type
7. Contract/Integration/E2E Test
8. 다른 Surface 회귀 검증
```

계약과 구현 상태가 다를 수 있다. 이 문서에 적힌 Endpoint가 실제 배포됐다는 뜻은 아니다.

---

# 58. Breaking Change 기준

Method/Path, 필수 Request Field, JSON Field Type/의미, Enum, Response Nesting, Error Code 의미, File Preview 계약, Snapshot/Version 보존 정책 변경은 Breaking Change다. Wangyu §65나 기존 Shared Integration에 영향이 있으면 반드시 공동 변경 절차를 따른다.

---

# 59. API Review Checklist

```text
[ ] Requirement ST/AD ID에 연결되는가?
[ ] 기존 API / LearnersHigh 데이터와 중복되지 않는가?
[ ] Actor / Student Owner / Admin 범위가 명시되는가?
[ ] Request 필수값과 응답 상태가 명확한가?
[ ] 평가계획서 지필·수행·원본 페이지가 구분되는가?
[ ] Note Revision과 ArtifactVersion이 불변인가?
[ ] 피드백 요청 시 저장된 Snapshot만 사용되는가?
[ ] Admin 읽기 전용 학생 원본을 수정할 수 없는가?
[ ] PDF/미리보기/AI 장애가 빈 데이터로 표현되지 않는가?
[ ] 학생 ST-13의 두 버전 비교 및 Task 출처 연결이 Domain/Feature Spec과 일치하는가?
[ ] 휴지통·삭제·복원 정책의 대상별 미확정 범위가 명시되는가?
[ ] Wangyu Counseling 금지 목록 및 Student Care §65 원문·Endpoint가 유지되는가?
[ ] Test / 회귀 시나리오가 정의되는가?
```

---

# 60. 초기 Contract Test 우선순위

```text
1. ST-01 학교/학기 Context → ST-02 평가계획서 조회
2. AD-03 PDF 등록/개정 → AD-04~05 검토 → ST-02 개인 열람
3. ST-03 수행평가 두 등록 방식/상태 3종
4. ST-07 / AD-06 모의고사 콘텐츠 공개/개인 등록 분리
5. ST-16 / AD-09 관리자 공통 Task 및 ST-07·17 출처 참조 → 학생 개인 Task 생성
6. ST-08~09 Note/템플릿 → 자동저장 Revision/충돌
7. ST-10~11 자료함/링크 삽입 → 출처 보존
8. ST-12~13 / AD-12~13 Artifact별 Version/학생·관리자 두 버전 비교(계약 초안, 실제 형식별 지원은 미확정)
9. ST-14 / AD-14~15 / ST-15 피드백 Snapshot → 위치 댓글/전달
10. AD-16 추천의 내부 메모 비노출
11. ST-19~20 성장 기록/보관함/휴지통
12. Admin 담당 학생 범위 제한 + Wangyu Student Care §65 회귀
```

최소한 읽기/쓰기/타 학생 접근/이전 버전 회귀/빈 데이터와 Provider 실패가 분리되는지를 테스트한다. 실제 검증 전 `VERIFIED`로 표시하지 않는다.

---

# 61. 현재 Open API Decisions

| ID | 미확정 사항 | 영향 |
|---|---|---|
| API-OD-A01 | Existing LearnersHigh 인증·학교/학적 Write Owner/Assessment 원본 매핑 | §9, §12, §34 |
| API-OD-A02 | PDF 분석 엔진, 한 PDF 다과목 스키마, 개정·부분 실패·출처 좌표 | §10~11, §38~39 |
| API-OD-A03 | PDF/문서 업로드 크기·허용 MIME·Storage/변환 지원 범위. **부분 결정(2026-11-13)**: 평가계획서 원문은 개발용 로컬 격리 Storage에 보관(§38-1). 운영 Provider·HWP/HWPX 변환 Rendition은 미결 | §25~26, §38-1, §48 |
| API-OD-A04 | Rich-text 블록 Schema·Autosave 주기·Revision 단위·충돌 전략 | §19~21 |
| API-OD-A05 | 평가계획서 개인 정정의 공개·승인 의미/학생 학교 정보 수정 범위 | §9, §11 |
| API-OD-A06 | 피드백 Snapshot 물리 보존 방식/보존기간·취소/재요청 정책 | §31~32, §44~45 |
| API-OD-A07 | 위치별 피드백의 PDF Page/PPT Slide/노트 Block 식별자 및 변환 버전 | §45 |
| API-OD-A08 | Archive Soft Delete/휴지통/복구·영구 삭제: SchoolAssessment, EnrichmentTask, Note/Revision, Artifact/Version, Resource/개인 모의고사 자료, GrowthRecord의 대상별 정책과 연쇄 참조·보존 의무 | §12, §17~18, §20~26, §29~30 |
| API-OD-A09 | **문서상 ADR-0009로 결정:** 신규 Assessment 공용 피드백 요청함(자동 Staff 배정 없음), ADR-0003 대체. 팀 승인 확인 및 **기존 Queue 코드/데이터의 물리적 재사용 여부만 미확정** | §31~32, §44~45, docs/adr/0009 |
| API-OD-A10 | AI Provider/학생 자료 외부 전송/재시도·비용·오류 관리 | §11, §14, §28 |
| API-OD-A11 | 외부 출처·모의고사/대학 PDF 저작권·자료 유효성 | §17, §27, §40~42 |
| API-OD-A12 | 콘텐츠 공개 상태/Enum·삭제/보관 전이 및 Admin 운영 권한 범위(전체/기관/지점), 학생 버전 비교의 형식별 실제 지원, 개인 Task `sourceReference` 필드 검증·원천 보존·`catalogTaskId`와의 관계 | §18, §37~43 |

**제안서/목업은 Provider·인증·DB Schema의 증거가 아니다.** 추가 결정이 필요하면 API Schema를 확정된 구현으로 속이지 않는다. 구현에 영향을 주는 항목은 담당자 합의를 거친다.

---

# 62. Endpoint Inventory — Assessment

이 목록은 §9~47의 Endpoint를 요약한 것이다. `GET`은 별도 명시 없는 한 Read-only이며 권한 검사를 전제로 한다.

## Student

```text
GET    /api/student/assessment/me
GET    /api/student/assessment/academic-context
PUT    /api/student/assessment/academic-context
GET    /api/student/assessment/evaluation-plans
GET    /api/student/assessment/evaluation-plans/{planId}
POST   /api/student/assessment/evaluation-plans/uploads
POST   /api/student/assessment/evaluation-plans/{documentRevisionId}/analysis
GET    /api/student/assessment/evaluation-plans/{documentRevisionId}/analysis
PUT    /api/student/assessment/evaluation-plans/{documentRevisionId}/personal-review
GET    /api/student/assessment/school-assessments
POST   /api/student/assessment/school-assessments
GET    /api/student/assessment/school-assessments/{assessmentId}
PATCH  /api/student/assessment/school-assessments/{assessmentId}
DELETE /api/student/assessment/school-assessments/{assessmentId}
PATCH  /api/student/assessment/school-assessments/{assessmentId}/status
POST   /api/student/assessment/school-assessments/{assessmentId}/criteria-explanations
POST   /api/student/assessment/school-assessments/{assessmentId}/topic-suggestions
GET    /api/student/assessment/tips                             [서버 제공 시]
GET    /api/student/assessment/tips/{tipId}                    [서버 제공 시]
GET    /api/student/assessment/enrichment/catalog
GET    /api/student/assessment/enrichment/catalog/{catalogTaskId}
GET    /api/student/assessment/mock-exam-materials
GET    /api/student/assessment/mock-exam-materials/{materialId}
POST   /api/student/assessment/my-mock-exam-materials
GET    /api/student/assessment/my-mock-exam-materials
GET    /api/student/assessment/enrichment/tasks
POST   /api/student/assessment/enrichment/tasks
GET    /api/student/assessment/enrichment/tasks/{taskId}
PATCH  /api/student/assessment/enrichment/tasks/{taskId}
PATCH  /api/student/assessment/enrichment/tasks/{taskId}/status
GET    /api/student/assessment/note-templates                   [서버 제공 시]
GET    /api/student/assessment/note-templates/{templateId}     [서버 제공 시]
GET    /api/student/assessment/notes
POST   /api/student/assessment/notes
PUT    /api/student/assessment/notes/{noteId}
GET    /api/student/assessment/notes/{noteId}/revisions
GET    /api/student/assessment/notes/{noteId}/revisions/{revisionId}
GET    /api/student/assessment/resources/recommendations
GET    /api/student/assessment/resources
POST   /api/student/assessment/resources
GET    /api/student/assessment/resources/{resourceId}
PATCH  /api/student/assessment/resources/{resourceId}
POST   /api/student/assessment/notes/{noteId}/resource-links    [서버 블록삽입 시]
GET    /api/student/assessment/artifacts
POST   /api/student/assessment/artifacts
GET    /api/student/assessment/artifacts/{artifactId}
PATCH  /api/student/assessment/artifacts/{artifactId}
GET    /api/student/assessment/artifacts/{artifactId}/versions
POST   /api/student/assessment/artifacts/{artifactId}/versions
GET    /api/student/assessment/artifacts/{artifactId}/versions/{versionId}
GET    /api/student/assessment/artifacts/{artifactId}/versions/{versionId}/file
GET    /api/student/assessment/artifacts/{artifactId}/versions/{versionId}/preview
GET    /api/student/assessment/artifacts/{artifactId}/compare
GET    /api/student/assessment/university-resources
GET    /api/student/assessment/university-resources/{resourceId}
POST   /api/student/assessment/ai-assistant/messages
GET    /api/student/assessment/growth-records
POST   /api/student/assessment/growth-records
GET    /api/student/assessment/growth-records/{recordId}
PATCH  /api/student/assessment/growth-records/{recordId}
GET    /api/student/assessment/archive
PUT    /api/student/assessment/archive/favorites
POST   /api/student/assessment/archive/restore
POST   /api/student/assessment/feedback-requests
GET    /api/student/assessment/feedback-requests
GET    /api/student/assessment/feedback-requests/{requestId}
GET    /api/student/assessment/feedback-requests/{requestId}/reply
```

## Admin

```text
GET    /api/admin/assessment/overview
GET    /api/admin/assessment/students
GET    /api/admin/assessment/students/{studentId}
GET    /api/admin/assessment/students/{studentId}/school-assessments
GET    /api/admin/assessment/students/{studentId}/enrichment-tasks
GET    /api/admin/assessment/students/{studentId}/growth-records
GET    /api/admin/assessment/students/{studentId}/notes
GET    /api/admin/assessment/students/{studentId}/notes/{noteId}
GET    /api/admin/assessment/students/{studentId}/notes/{noteId}/revisions
GET    /api/admin/assessment/students/{studentId}/notes/{noteId}/revisions/{revisionId}
GET    /api/admin/assessment/students/{studentId}/artifacts
GET    /api/admin/assessment/artifacts/{artifactId}/versions
GET    /api/admin/assessment/artifacts/{artifactId}/versions/{versionId}
GET    /api/admin/assessment/artifacts/{artifactId}/versions/{versionId}/file
GET    /api/admin/assessment/artifacts/{artifactId}/versions/{versionId}/preview
GET    /api/admin/assessment/artifacts/{artifactId}/compare
GET    /api/admin/assessment/evaluation-plans
POST   /api/admin/assessment/evaluation-plans
GET    /api/admin/assessment/evaluation-plans/{planId}
POST   /api/admin/assessment/evaluation-plans/{planId}/revisions
POST   /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/analysis
GET    /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/analysis
PUT    /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/review
GET    /api/admin/assessment/mock-exam-materials
POST   /api/admin/assessment/mock-exam-materials
GET    /api/admin/assessment/mock-exam-materials/{materialId}
PATCH  /api/admin/assessment/mock-exam-materials/{materialId}
POST   /api/admin/assessment/mock-exam-materials/{materialId}/publish
POST   /api/admin/assessment/mock-exam-materials/{materialId}/unpublish
GET    /api/admin/assessment/enrichment/catalog
POST   /api/admin/assessment/enrichment/catalog
GET    /api/admin/assessment/enrichment/catalog/{catalogTaskId}
PATCH  /api/admin/assessment/enrichment/catalog/{catalogTaskId}
POST   /api/admin/assessment/enrichment/catalog/{catalogTaskId}/publish
POST   /api/admin/assessment/enrichment/catalog/{catalogTaskId}/unpublish
GET    /api/admin/assessment/university-resources
POST   /api/admin/assessment/university-resources
GET    /api/admin/assessment/university-resources/{resourceId}
PATCH  /api/admin/assessment/university-resources/{resourceId}
POST   /api/admin/assessment/university-resources/{resourceId}/publish
POST   /api/admin/assessment/university-resources/{resourceId}/unpublish
GET    /api/admin/assessment/reference-library
POST   /api/admin/assessment/reference-library
GET    /api/admin/assessment/reference-library/{scrapId}
PATCH  /api/admin/assessment/reference-library/{scrapId}
DELETE /api/admin/assessment/reference-library/{scrapId}
GET    /api/admin/assessment/feedback-requests
GET    /api/admin/assessment/feedback-requests/{requestId}
PUT    /api/admin/assessment/feedback-requests/{requestId}/reply-draft
POST   /api/admin/assessment/feedback-requests/{requestId}/deliver
GET    /api/admin/assessment/activity-summary
```

이 Inventory는 **필요 업무를 기반으로 작성한 계약 초안**이고 학생 두 버전 비교, 출처 연결과 정적 Tips/Templates 및 Editor 블록 삽입 같은 구현 대안도 포함한다. 구현 필요성 확인 후 실제 서버 Inventory를 고정한다. Wangyu API는 다음 `§65`가 별도 관리한다.

---

# 62-1. 학생 기록 실데이터 구현 반영 (2026-11-11)

> 근거: 2026-11-11 사용자가 Assessment DB·API·개발용 Storage 진행과 공동 담당자(Wangyu) 승인을 **전달**함. 저장소에 서명·리뷰 기록은 없다
> (`docs/specs/suyeon/assessment-db-integration-202611/REPORT.md` §승인 기록). 아래는 기존 절(§20~§45)의 Shape을 그대로 구현한 것과,
> 구현하면서 **새로 추가한** Endpoint·필드다. 기존 절의 내용은 바꾸지 않았다. Migration: `V202611110506__create_assessment_student_records.sql`.

## 62-1-1. 기존 절 그대로 구현 (Backend + Student/Admin http Adapter)

| 절 | Endpoint | 비고 |
|---|---|---|
| §20·21 | `GET/POST /api/student/assessment/notes`, `PUT /notes/{noteId}`, `GET /notes/{noteId}/revisions[/{revisionId}]` | 대상 `sourceType`은 `SCHOOL_ASSESSMENT`만(심화 Task 폐기). 수행평가당 노트 1개. 오래된 `expectedRevisionId` → 409 `RESOURCE_VERSION_CONFLICT`. 블록은 `blockId·type·text`(문자열) 필수, `attrs`는 객체(Editor 확정 전 임시 형식, OD-A05) |
| §22 | `GET/POST /api/student/assessment/resources`, `GET/PATCH /resources/{resourceId}` | 항상 본인 비공개. `sourceUrl`은 http/https만. `fileRef`는 항상 null(파일 첨부 미지원). 응답에 `subjectIds` 추가 |
| §24·25·26 | `GET/POST /artifacts`, `GET/POST /artifacts/{id}/versions`(multipart `file`, `changeNote?`, `expectedLatestVersionId?`), `GET /artifacts/{id}/versions/{versionId}/file` | 허용: pdf·hwp·hwpx·doc·docx·ppt·pptx·xlsx·png·jpg·jpeg·gif — **확장자와 파일 서명이 둘 다** 맞아야 함(아니면 415 `UNSUPPORTED_FILE_TYPE`). 최대 `assessment.storage.max-file-bytes`(기본 50MB, 초과 413 `FILE_TOO_LARGE`). 빈 파일 400. 최신 버전 불일치 409 `FILE_VERSION_MISMATCH`. `file.fileRef` = `file_{versionId}`(불투명). 파일 응답은 `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`. `/preview`는 미구현 |
| §29 | `GET/POST /growth-records`, `GET/PATCH /growth-records/{recordId}` | PATCH는 보낸 필드만 변경. 관련 활동은 본인 학교 수행평가만, `artifactIds`는 본인 결과물만 |
| §30 | `GET /archive?tab=recent|favorites|completed|previous-semesters|trash`, `PUT /archive/favorites` | 대상은 `SCHOOL_ASSESSMENT`만. `size` 최대 500(중요 표시 일괄 조회). `trash`는 삭제 정책(OD-A11) 미결이라 항상 빈 목록 |
| §31·32 | `POST/GET /feedback-requests`, `GET /feedback-requests/{id}`, `GET /feedback-requests/{id}/reply` | Snapshot = 본인 노트 Revision + 본인 결과물 버전(같은 수행평가, 최대 10). 같은 Snapshot 재요청은 기존 요청을 돌려준다(새로 만들지 않음). 관리자 초안은 reply에 나오지 않는다 |
| §35·36 | `GET /api/admin/assessment/students/{studentId}/notes`, `GET /students/{studentId}/artifacts`, `GET /artifacts/{id}/versions`, `GET /artifacts/{id}/versions/{versionId}/file` | 담당 지점 학생만(범위 밖·없는 ID 모두 404). 읽기 전용. 버전에 `previewSupported` |
| §44·45 | `GET /api/admin/assessment/feedback-requests?status=&query=&studentId=&sourceId=`, `GET /feedback-requests/{id}`, `PUT /feedback-requests/{id}/reply-draft`, `POST /feedback-requests/{id}/deliver` | 초안 → `{status:"DRAFT_SAVED", savedAt}`(요청 PENDING 유지), 전달 → `{status:"DELIVERED", deliveredAt}`(Reply·요청 같은 Transaction). 코멘트 대상이 Snapshot 밖이면 400(`not_in_snapshot`). 위치 `PDF_PAGE{pageNumber≥1}`·`NOTE_BLOCK{blockId}`·null. 전달 후 다시 전달·초안 저장 → 409 `FEEDBACK_ALREADY_DELIVERED`. 전달은 수행평가 상태를 바꾸지 않는다 |
| §43 | `GET/POST /api/admin/assessment/reference-library`, `GET/PATCH /reference-library/{scrapId}` | 기본 비공개. 응답에 `published`, `publishedAt` 추가. `DELETE`는 보존 정책 미결이라 미구현. 지점 구분 없이 관리자 공용 |

## 62-1-2. 새로 추가한 Endpoint·필드

```http
GET /api/student/assessment/shared-resources
```
관리자가 공개한 자료(읽기 전용). `{ items: [{ resourceId, type, title, sourceName, sourceUrl, author, publishedDate, description, tags, subjectIds, publishedAt }] }`. `description`은 관리자 메모(공개 시 학생에게 보인다는 안내를 화면에서 한다).

```http
PUT /api/admin/assessment/reference-library/{scrapId}/visibility   { "published": true | false }
```
응답은 §43 ReferenceScrap + `published`·`publishedAt`.

```http
GET /api/admin/assessment/students?academicYear=2026&semester=1&query=
GET /api/admin/assessment/students/{studentId}?academicYear=2026
GET /api/admin/assessment/students/{studentId}/school-assessments/{assessmentId}
GET /api/admin/assessment/students/{studentId}/growth-records
```
- 목록: `{ items: [{ student: { studentId, displayName, school: { schoolId, name }, grade }, activity: { schoolAssessment: { beforeStart, inProgress, completed }, enrichmentTask: { 0,0,0 }, feedback: { pending, delivered } }, nextDeadline: { assessmentId, title, deadlineDate } | null, lastActivityAt }] }` — 활동 수는 Source Entity에서 계산(저장 Counter 없음). 학교·학년 필터는 미구현.
- 상세: `{ student, academicContexts: [§9-1 Shape] }`.
- 수행평가 단건: `{ student, assessment: §12 Shape, grade }`.
- 학생 원천·학업 정보는 개발용 Mock(API-OD-A01·OD-A04)이다.

## 62-1-3. 개발용 Mock 관리자 추가

`adm_demo_gangnam` = 강남 지점 학생 기록(시연용). **2026-11-13 OD-A08 결정 이후 모든 Mock 관리자(시연 명단 관리자 포함)가 모든 학교 평가계획서를 운영한다(§38-2).** 학생 기록 지점 범위는 그대로다.

**개발용 다지점 시연 명단 (2026-11-12, 기본 OFF)**: `assessment.demo-roster.enabled=true`(`ASSESSMENT_DEMO_ROSTER_ENABLED`)와 `learnershigh.integration.mode=mock`일 때만 시연 지점 `br_demo_a/b/c`(각 합성 학생 20명)와 지점 관리자 Mock 계정 `adm_demo_a01`·`adm_demo_a02`(A)·`adm_demo_b01`(B)·`adm_demo_c01`(C)이 생긴다. 각 계정은 자기 지점 학생 기록만 읽고(§17 범위 검사 그대로), 평가계획서는 다른 관리자와 같이 모든 학교를 운영한다(§38-2, 2026-11-13). 모든 지점을 보는 계정은 없다. **실제 로그인·Session이 아니라 기존 Mock Header 인증**(API-OD-A01)이다. 이 명단은 Assessment 안에서만 보이며 Shared 학생 Client·Student Care는 바뀌지 않는다. 상세: `docs/specs/suyeon/assessment-15schools-60students-seed-202611/`.

## 62-1-4. 이번에 하지 않은 것

HWP·HWPX 공식 검토(M-1~M-7, D-1), C-10 분석 수신 Endpoint 계약 본문 등록, 학생 화면 읽기 전용 보기(`GET` Snapshot), 결과물 미리보기(§26 `/preview`)·비교(§25-1·§37), 삭제·휴지통.

---

# 62-2. Phase B·학생 화면 보기·미리보기/비교·휴지통 구현 반영 (2026-11-11 밤)

> 사용자 전달 승인(DB·API·Phase B Gate 1~3·결정 1~6, Wangyu 포함) 기반. 저장소 공동 Review 기록은 PR 단계에서 따로 남긴다. 기존 절은 고치지 않고 여기에 실제 구현을 적는다.

## HWP·HWPX 공식 검토 (§39 확장, M-1~M-7)

- Migration `V202611111600`(D-1: `evidence_format`·`evidence_locator_json`·`analysis_subject_index`, Review `source_check_method`·`source_check_sha256`), `V202611111610`(UNIQUE `(review_id, subject_id, field_path)`, `manual_comparison_confirmed`, `reviewer_auth` MOCK_HEADER|VERIFIED).
- `PUT .../review` HWP·HWPX 요청 = `assessment-multiformat-review-gate-202611/API-CONTRACT-REVISED.md` §3-3 그대로(`sourceCheck`·`analysisSubjectIndex`·`documentLocator`·`absence`). 검증·사유 코드 = 같은 문서 §3-4(`document_mismatch`·`evidence_not_in_analysis`·`evidence_scope_unavailable`·`duplicate`·`path_mismatch`·`format_mismatch`·`required`·`not_allowed`·`unknown`).
- **운영 보호:** `assessment.plan-review.structured-confirm-dev`(기본 false)이면 HWP·HWPX 확정은 400 `revision.documentFormat: verified_auth_required`. 실험 Flag만으로는 열리지 않는다. true는 격리 개발·합성 시험 전용이며 기록은 `reviewer_auth=MOCK_HEADER`(운영 검토 실적 아님).
- PDF: 기존 요청·응답 그대로. 추가 거절: 같은 과목 안 같은 fieldPath `duplicate`, 비정규 색인(`[01]`) `unknown`, 같은 subjectId 두 번 `duplicate`, HWP 전용 필드 `not_allowed`. DB에는 `evidence_format='PDF'`.
- 응답: HWP·HWPX 확정값에만 `analysisSubjectIndex`·`documentLocator`·`absence`(NON_NULL), `review.sourceReview`·`revisions[].sourceReview`(관리자 전용). 학생 응답 변화 없음(확정 상태만).

## 관리자 학생 화면 보기 (읽기 전용)

`GET /api/admin/assessment/students/{studentId}/student-view/<학생 API 경로>` — 학생 GET API와 같은 경로·응답 Shape(학업 정보, 수행평가, 평가계획서, 노트·Revision, 결과물·버전·file·preview·compare, 피드백·답변, 성장 기록, 자료, 공개 자료, 보관함). Actor ADMIN, 담당 지점 밖·없는 학생 404. 쓰기 Endpoint 없음. 학생 인증 Header를 쓰지 않는다.

## 결과물 미리보기·비교 (§26·§25-1·§37)

- `GET .../artifacts/{artifactId}/versions/{versionId}/preview` (Student·Admin·student-view): PDF·PNG·JPEG·GIF만 inline, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`. 그 밖 형식 415 `PREVIEW_UNAVAILABLE`. 저장 바이트 SHA-256·크기가 등록 값과 다르면 409 `FILE_INTEGRITY_FAILED`. 권한은 다운로드와 같다.
- `GET .../artifacts/{artifactId}/compare?fromVersionId=&toVersionId=`: §37 Shape, `mode=METADATA_ONLY`만(changes field: fileName·contentType·sizeBytes·sha256·uploadedAt·changeNote, 실제로 다른 것만), `versions[]`에 `previewSupported`. 같은 버전 400, 다른 결과물 버전 404.

## 휴지통 (OD-A11 일부 — 사용자 지시 정책)

- 정책: 소프트 삭제·복원만. 영구 삭제·자동 삭제 Endpoint 없음(보존 기간·영구 삭제·개인정보 삭제 의무는 OD-A11/API-OD-A08 미결). Migration `V202611111620`(`deleted_at`·`deleted_by`).
- Student: `DELETE /school-assessments/{id}`(§12), `DELETE /artifacts/{id}`, `DELETE /resources/{id}`, `DELETE /growth-records/{id}` → 204. `GET /archive?tab=trash` → 휴지통 항목(sourceType `SCHOOL_ASSESSMENT|ARTIFACT|RESOURCE|GROWTH_RECORD`, `deletedAt`, `origin`). `POST /archive/restore {sourceType, sourceId}`(§30) → ArchiveItem. 상위 수행평가가 휴지통이면 결과물 복원 400 `sourceId: parent_in_trash`.
- Admin: `DELETE /reference-library/{scrapId}`(§43, 만든 관리자만) → 204, `GET /reference-library/trash`, `POST /reference-library/{scrapId}/restore`.
- 노트 Revision·결과물 Version·피드백 요청/Snapshot/답변·실제 파일은 바꾸지 않는다. 관리자 피드백 상세의 요청 당시 노트·파일은 휴지통과 무관하게 열린다. 노트는 수행평가와 1:1이라 따로 삭제하지 않는다.

## 과목별 추천 자료원

서버 API(§22 recommendations)는 만들지 않았다. Student http 모드는 검토된 정적 카탈로그(참고자료 24곳)를 과목 **이름** 정규화로 고른다(과목 ID 하드코딩 없음). 영역을 모르는 과목은 일반 자료원(도서관·논문·통계). "내 자료로 추가"는 §22 `POST /resources`.

---

## A27-UX DRAFT 추가 계약 (2026-11-17, 프론트·백엔드 구현 기준 · 팀 승인 전)

### §12 학생 개인 수행평가 관리 정보 확장

`POST /school-assessments` 요청과 `PATCH /school-assessments/{id}` 편집 필드에 다음 **선택** 필드를 더한다. 응답(§12 목록·상세·등록)에도 같은 이름으로 붙는다. 모두 학생 개인 관리 데이터이며 평가계획서 확정값(공식 평가정보)을 바꾸지 않는다.

| 필드 | 형식 | 규칙 |
|---|---|---|
| `assessmentType` | `PRESENTATION`·`REPORT`·`PROJECT`·`EXPERIMENT`·`DEBATE`·`PORTFOLIO`·`OTHER` 또는 null | 그 밖 값 400 `unknown` |
| `evaluationDate` | `YYYY-MM-DD` 또는 null | 제출 마감(`deadlineDate`)과 별도 |
| `weightPercent` | 0~100 정수 또는 null | null = 모름(0과 구분). 범위 밖 400 `range` |
| `submissions` | 문자열 ≤500 또는 null | |
| `personalMemo` | 문자열 ≤2000 또는 null | 본인만 |
| `description` (응답) | 문자열 또는 null | 기존 요청 필드를 응답에도 돌려준다(수행 내용) |
| `updatedAt` (응답) | OffsetDateTime | |

DB: `V202611170200__assessment_school_assessment_personal_details.sql`(새 Migration, 기존 Migration 변경 없음).

### §10-1-3 학교 공식 공개 평가계획서 원본 (Student)

```http
GET /api/student/assessment/evaluation-plans/official?academicYear=2026&semester=1
```

학생 본인의 학적 Context(학교·학년)로만 슬롯을 정한다(요청에서 학교·학년을 받지 않는다). 관리자 직접 등록 평가계획서(§38)·분석 결과와 **다른 자료**이며, 출처·공개 여부가 검증된 공식 원본만 돌려준다.

```json
{ "academicYear": 2026, "semester": 1, "contextFound": true, "schoolId": "school_001", "schoolName": "예시고등학교", "grade": 1,
  "sourceConnected": false, "documents": [] }
```

- `contextFound=false`: 그 학년도·학기 학적 기록이 없어 다른 학년 문서를 추측해 연결하지 않았다(`schoolId`·`grade` null).
- `sourceConnected=false`: 공식 원본 공급자(학교알리미 수집기, 향후)가 아직 없다. `documents`는 항상 빈 배열.
- `documents[]`: `sourceDocumentId`, `provider`, `fileName`, `documentFormat`, `sourceUrl`, `sha256`, `publishedAt`, `verifiedAt`, `latest`. 파일 내려받기 경로는 공급자 연결 시 정한다.
- Backend 경계: `integration/officialplan/OfficialPlanSourceProvider`(부록 K 이전 구현 `UnconnectedOfficialPlanSourceProvider`).

#### §10-1-3 부록 K 변경 (2026-11-20 사용자 승인 · 학교알리미 수집 원본 학생 연동)

공급자를 **학교알리미 자동 수집 원본**(§38-12~14의 `SchoolInfoSourceFile`·`SchoolInfoSlotLink`, 학교 단위 공유)으로 연결한다. 새 표·열·Migration 없음. 원본 바이트는 학교당 한 벌이고 학생마다 복제하지 않는다.

- `sourceConnected=true`. `documents[]`는 **학생 본인 학적 슬롯(학교·학년도·학년·학기)** 에 연결된 원본만이다. 포함 조건(모두 서버에서 판정):
  1. `SchoolInfoSlotLink`가 그 학교·학년도·학년·학기에 있고, 연결된 평가계획서 문서가 **삭제되지 않음**(§38-9 관리자 삭제 = 학생에게서도 사라짐, 재수집이 되살리지 않음 `REMOVED_BY_ADMIN`).
  2. 원본이 `VERIFIED`(자동 분류) 또는 관리자가 §38-14로 학년·학기를 분류한 `UNCLASSIFIED` 원본(출처·학년도는 이미 확인). `NEEDS_SOURCE_VERIFICATION`·`YEAR_MISMATCH`·`UNSUPPORTED`·`NOT_PLAN`·보류(미분류) 원본은 연결이 없어 나오지 않는다.
  3. 원본 바이트가 저장돼 있음(`storage_key`), 그 학교에 학교알리미 학교 선택(§38-13)이 있으면 원본의 학교알리미 학교 ID가 그 선택과 같음(학교를 다시 고른 뒤 이전 학교 원본이 섞이지 않게).
  - 관리자 직접 등록 문서(§38)·`sourceUrl` 문자열·분석 결과는 공식 원본이 아니다(이 목록에 들어가지 않는다).
- `documents[]` 필드: 기존 `sourceDocumentId`(불투명 ID), `provider`(`SCHOOLINFO`), `fileName`, `documentFormat`(`PDF`·`HWP`·`HWPX`), `sourceUrl`(`https://www.schoolinfo.go.kr`), `sha256`, `publishedAt`(null — 공시 일자 미수집), `verifiedAt`(수집·확인 시각), `latest`(true — 한 칸 여러 원본이 함께 유효) + **추가** `sizeBytes`, `disclosureMonth`(4 = 1학기 공시, 9 = 2학기 공시, 모르면 null). 한 칸에 여러 원본(학년 계획·과목별·공동교육과정)이면 모두 준다.
- 원본 보기·내려받기:

```http
GET /api/student/assessment/evaluation-plans/official/files/{sourceDocumentId}?academicYear=2026&semester=1          → attachment (원본 바이트)
GET /api/student/assessment/evaluation-plans/official/files/{sourceDocumentId}/preview?academicYear=2026&semester=1  → inline (PDF만)
```

  - 서버가 그 학생의 그 학년도·학기 `documents[]`를 다시 계산해 **그 안에 있는 ID만** 준다. 다른 학교·학년·학기·삭제·보류 원본 ID는 `404 SCHOOLINFO_SOURCE_NOT_FOUND`(존재 여부를 드러내지 않음), 학적 없음도 404. 인증 없음 401.
  - 내려주기 전에 크기·SHA-256을 저장 기록과 다시 비교한다(다르면 `409 FILE_INTEGRITY_FAILED`). `nosniff`·`private, no-store`. HWP·HWPX 미리보기는 `415 PREVIEW_UNAVAILABLE`(내려받기 안내). 저장 경로·저장 키는 내보내지 않는다.
- 학생 진입 자동 확보:

```http
POST /api/student/assessment/evaluation-plans/official/ensure      (본문 없음)
→ 200 | 202 { "state": "READY", "schoolSelectionRequired": false,
              "years": [ { "academicYear": 2026, "status": "COMPLETED" } ], "message": null }
```

  - 학생 화면(홈·학교 평가 정보·수행평가 상세)이 진입할 때 **버튼 없이** 부른다. 요청에서 학교·학년도를 받지 않는다 — 서버가 학생 학적(최근 3개 학년도 중 학적이 있는 첫 학년도)의 학교를 정하고, §38-12 관리자 화면 진입과 **같은 확인**(force 없음, 학교당 작업 1개, 학교·학년도별 24시간 기록 재사용, 순차·요청 간격·크기 한도)을 시스템 주체로 시작하거나 진행 중 작업을 돌려준다. 같은 학교 학생·관리자가 동시에 들어와도 작업은 하나다. 기록이 유효하면 외부 요청 0.
  - `state`: `RUNNING`(202, 진행 중 — 화면은 같은 POST를 짧은 간격으로 다시 불러 끝나면 멈춘다) · `READY`(완료·일부 확인) · `SCHOOL_CONFIRMATION_REQUIRED`(같은 이름 학교 — **관리자만** §38-13으로 고를 수 있다. 학생에게 후보·주소를 보이지 않는다, 등록 0) · `SCHOOL_IDENTITY_REQUIRED`(학적에서 학교 이름 없음) · `NO_CONTEXT`(최근 3개 학년도 학적 없음) · `FAILED`(학교알리미 연결 실패 — 다음 진입 때 다시 시도). `years[].status`는 §38-12 학년도 상태 그대로.
  - 이 POST는 수집·등록·서버 분석 대기열까지만 한다. **분석 결과·채점기준·운영계획의 학생 공개는 그대로 관리자 확정분만**(§10-1).
  - 학년도별 학생 학년은 그 학년도 학적으로만 정한다. 학적이 없는 학년도는 `GET`이 `contextFound=false`(다른 학년 원본을 추측해 보이지 않음).

#### §10-1-3 부록 L 변경 (2026-11-20)

- 관리자 '학생 화면 보기'(읽기 전용, `/api/admin/assessment/students/{studentId}/student-view`)에 같은 응답의 읽기 경로를 더한다: `GET .../student-view/evaluation-plans/official?academicYear&semester`, `GET .../student-view/evaluation-plans/official/files/{sourceDocumentId}?academicYear&semester`(attachment), `.../preview`(PDF만). 담당 지점 범위 밖 학생은 404(기존 학생 화면 보기 규칙). 자동 확보 `POST .../ensure`는 **두지 않는다**(관리자 미리보기가 학교알리미 수집을 시작하지 않음). 학생 결과물 파일 내려받기와 같은 읽기 전용 정책.
- 학생 화면 자동 확보: `SCHOOL_CONFIRMATION_REQUIRED`(관리자 학교 선택 대기)이면 화면이 15초 간격으로 같은 POST를 다시 불러(서버 기록만 읽음, 외부 요청 없음, 최대 5분) 관리자가 학교를 고르면 다시 들어오지 않아도 목록이 갱신된다.
- 시험 전용 설정 `assessment.demo-roster.e2e-extra-file`(기본 비어 있음): 지정한 파일의 합성 학생을 시연 명단 뒤에 더한다(같은 무결성 검사). 일회용 E2E(`playwright.assessment-live.config.ts`)에서만 쓴다 — 운영·기본 실행 영향 없음.

#### §10-1-3 A28-01 변경 (2026-11-22 사용자 지시 · 학생 3개년 공개 원본 · 새 표·열·Migration 없음)

- **학적 기록과 학교 공개 자료를 구분한다.** 과거 학년도 학적이 없다는 이유만으로 학교 공개 원본 열람을 막지 않는다. 학적을 만들거나 바꾸지 않는다.
- `GET official`·`GET official/files/{id}`·`.../preview`에 선택 쿼리 `grade`(1~3)를 더한다. 범위 밖은 `400 VALIDATION_ERROR`. 관리자 '학생 화면 보기'(부록 L) 읽기 경로도 같다.
- 칸 규칙(목록·내려받기·미리보기 공통, 서버가 요청마다 다시 계산):
  1. 그 학년도·학기 학적이 있고 `grade`가 없거나 학적 학년과 같으면 → 학적 칸(`basis=ACADEMIC_RECORD`, 기존 동작).
  2. 최근 3개 학년도(§38-12 `expectedYears`, 서버 KST) 안이면 → 그 해 학적 학교(없으면 학생 ensure 와 같은 규칙의 현재 학교)의 공개 원본 칸(`basis=SCHOOL_PUBLIC`). 학년 = `grade` → 그 해 학적 학년 → 현재 학년.
  3. 그 밖(범위 밖 학년도·학적이 전혀 없음) → 칸 없음(`basis=null`, `schoolId`·`grade` null, `documents` 빈 배열). 내려받기 404.
- 응답 추가 필드 `basis`: `ACADEMIC_RECORD` · `SCHOOL_PUBLIC` · `null`. `contextFound`는 **학적 유무 그대로**다(원본 유무와 별개). 화면은 `SCHOOL_PUBLIC` 원본을 학생의 재학·수강 기록으로 표현하지 않는다.
- 학교는 요청에서 받지 않는다(학생 자신의 학교만). 동명 학교 열람 선택(§38-16)·관리자 매핑 우선·원본 출처 검증·삭제 문서 제외 규칙은 그대로다. 조회만으로 외부 요청·DB 쓰기 없음.
- `POST official/ensure`: 서버 재시작 등으로 동명 후보가 메모리에 없고 저장 기록이 `SCHOOL_AMBIGUOUS`(관리자 매핑 없음·학생 선택 없음)이면 `FAILED` 가 아니라 `SCHOOL_CONFIRMATION_REQUIRED`(`schoolSelectionRequired=true`)로 답한다. 후보는 §38-16 `school-candidates`가 다시 확인한다(기존 동작). 실제 연결 실패는 그대로 `FAILED`.

#### §10-1-3 A28-06 변경 (2026-11-22 · 학생 원본 앱 안 열람 · 새 Endpoint 없음)

- `GET official/files/{id}/preview`(학생·관리자 학생 화면 보기)가 HWP·HWPX 에서도 동작한다: 변환기가 설정돼 있으면 관리자 원문 보기(§38-10)와 같은 변환기·캐시로 만든 **미리보기 PDF**(`X-Preview-Rendition: converted-pdf`, 파일 이름 `<원본 이름> (미리보기 변환).pdf`)를 준다. 원본 바이트·SHA 는 바뀌지 않는다.
- 칸 규칙·권한·SHA 검증은 내려받기와 같다. 변환은 그 원본이 연결된 문서 Revision(같은 SHA)의 캐시를 쓴다. 변환기 없음·연결 Revision 없음 `415 PREVIEW_UNAVAILABLE`, 변환 준비 중·실패는 §38-10 오류 그대로.
- 관리자 확정 전 분석 결과는 이 경로로 나가지 않는다(원본만).

#### 시연 명단 학교 고정 (A28-04, 2026-11-22 · local-run 시연 명단 전용 · 새 Endpoint·DB 없음)

- 시연 명단(`assessment/demo-roster/demo-roster-2026.json`, `ASSESSMENT_DEMO_ROSTER_ENABLED=true` 일 때만)의 학교에 선택 필드 `schoolinfoSchoolId`·`address`를 둘 수 있다. 같은 학교 키의 학생은 같은 값이어야 한다(아니면 기동 실패).
- 관리자 매핑(§38-13)이 없고 고정값이 있으면 학교알리미 자동 확인은 **이름 검색 없이** 그 학교 상세만 확인하고, 학교알리미의 이름·주소가 고정값과 모두 같을 때만 수집한다(다르면 `SCHOOL_AMBIGUOUS`, 수집 0). 관리자 매핑은 만들지 않는다. 관리자 매핑이 있으면 그것이 먼저다.

### §22-1 학생 자료함 파일 첨부

```http
POST   /api/student/assessment/resources/{resourceId}/file          (multipart: file) → StudentResource
DELETE /api/student/assessment/resources/{resourceId}/file          → StudentResource (첨부 연결만 비움)
GET    /api/student/assessment/resources/{resourceId}/file          → attachment (원본 바이트)
GET    /api/student/assessment/resources/{resourceId}/file/preview  → inline (PDF·이미지만, 그 밖 415 PREVIEW_UNAVAILABLE)
```

- 허용: PDF·HWP·HWPX·DOC·DOCX·XLS·XLSX·PPT·PPTX·JPG·JPEG·PNG·GIF·WEBP. **확장자와 파일 서명이 둘 다** 맞아야 한다(아니면 415 `UNSUPPORTED_FILE_TYPE`). 빈 파일 400, 한도 초과 `FILE_TOO_LARGE`(결과물과 같은 한도).
- 파일명은 경로 구분자·제어문자를 지운 표시용 이름만 쓴다(저장 경로는 UUID 키). 원본 바이트를 그대로 보관한다(GIF 애니메이션 보존). 다운로드 전 크기·SHA-256 재확인.
- 본인 자료만(다른 학생 404). 응답 `StudentResource.file`: `{ fileName, contentType, sizeBytes, uploadedAt, previewAvailable }` 또는 null. `fileRef`는 첨부가 있을 때 불투명 참조.
- DB: `V202611170300__assessment_resource_file_attachment.sql`.

### §43-1 관리자 참고자료실 파일 업로드 (A27-UX 관리자 UI 개선, 2026-11-18 DRAFT · 팀 승인 전)

```http
POST   /api/admin/assessment/reference-library/uploads              (multipart: file, metadata(JSON)) → 201 ReferenceScrap
POST   /api/admin/assessment/reference-library/{scrapId}/file       (multipart: file) → ReferenceScrap (파일 교체)
DELETE /api/admin/assessment/reference-library/{scrapId}/file       → ReferenceScrap (링크가 있는 스크랩만, 연결만 비움)
GET    /api/admin/assessment/reference-library/{scrapId}/file       → attachment (원본 바이트)
GET    /api/admin/assessment/reference-library/{scrapId}/file/preview → inline (PDF·이미지·MP4·WEBM만, 그 밖 415 PREVIEW_UNAVAILABLE)
```

- `metadata`: §43 POST 본문과 같은 필드(`title`·`type` 필수, `sourceUrl`·`sourceName`·`authorOrOrg`·`publishedDate`·`memo`·`tags`·`subjectIds` 선택). **업로드 스크랩만 `sourceUrl`이 선택**이다(링크 스크랩 POST·PATCH의 `sourceUrl` 필수 규칙은 그대로, 파일이 있는 스크랩의 PATCH는 `sourceUrl` 생략 가능). `type`은 기존 값(`SITE`·`ARTICLE`·`PAPER`·`VIDEO`·`STATISTICS`·`OTHER`)을 그대로 쓴다 — 새 Enum 없음.
- 허용 형식: §22-1과 같은 문서·이미지(PDF·HWP·HWPX·DOC·DOCX·XLS·XLSX·PPT·PPTX·JPG·JPEG·PNG·GIF·WEBP) + **관리자 전용 영상 MP4·M4V·MOV(ISO BMFF `ftyp` 서명)·WEBM(EBML 서명)**. 확장자와 서명이 둘 다 맞아야 한다(아니면 415 `UNSUPPORTED_FILE_TYPE`). 학생 자료함·결과물의 허용 형식은 바뀌지 않는다.
- 크기: `assessment.storage.max-file-bytes`(기본 50MB) 초과 413 `FILE_TOO_LARGE`, 빈 파일 400. 저장은 §22-1과 같은 격리 Storage(UUID 저장 키, 경로에 원본 이름을 쓰지 않음), 다운로드 전 크기·SHA-256 재확인, 응답 `nosniff`·`no-store`.
- 권한: 관리자 전용(학생 Endpoint 없음 — 학생 공개(`published`)여도 학생에게는 기존 공개 필드만 보이고 **파일은 내려받을 수 없다**). 휴지통에 있는 스크랩은 404. 지점 구분 없이 관리자 공용(§43과 같음).
- 응답 `ReferenceScrap.file`: `{ fileName, contentType, sizeBytes, uploadedAt, previewAvailable }` 또는 null (§22-1 `StudentResource.file`과 같은 모양). 추가 필드라 기존 클라이언트와 호환.
- 피드백 추천(§46 `RESOURCE`)은 링크(`sourceUrl`)가 있는 스크랩만 고를 수 있다(파일만 있는 스크랩은 학생에게 전달할 주소가 없다).
- 학생 공개(§43 `PUT .../visibility {published:true}`)도 링크가 있는 스크랩만 된다 — 링크 없는 업로드 스크랩은 400 `VALIDATION_ERROR`(`sourceUrl: required`). 비공개 전환은 언제나 된다.
- DB: 새 Migration 없음 — `V202611170300`의 `assessment_resource` 파일 열을 관리자 스크랩(`owner_type=ADMIN`)에도 쓴다.

### A27-UX 학생 화면 개선 추가 계약 (2026-11-19 DRAFT · **사용자 승인 2026-11-19** · 팀 승인 별도)

> **승인 기록(2026-11-19)**: 아래 5건(§12-a 개인 과목 원자 등록, §9-1-a `addedByStudent`, §12-b `assessmentTypeLabel`, §12-c 안내문 첨부, §30-a 홈 메모)은 사용자(Suyeon 담당)가 승인했다. 공유 계약(API Contract·DB)이라 **팀(다른 담당자) 승인 절차는 별도**로 남는다(docs/OWNERSHIP.md). 승인으로 동작은 바뀌지 않았다(코드 그대로). Migration `V202611190100`은 승인됐지만 사용자 DB 적용 시점은 PR #18 `V202611180100` 처리 결정과 함께 정한다(최종 보고서 부록 D).
> **평가 기준 연결 규칙(보수적, 2026-11-19 유지)**: 직접 등록 수행평가는 같은 과목의 확정·공개 항목과 **이름이 정확히 같고 그 이름이 하나뿐일 때만** '이 수행평가'로 연결한다. 같은 이름이 여러 개면 자동으로 고르지 않고 목록과 '확인 필요'를 보인다. 유사도·부분 일치·과목만으로 고르기는 하지 않는다. 같은 학기 확정 문서가 여럿이면 모두 찾는다. 확정 `itemKey`↔`evaluationItemRef.itemKey` 명시 계약은 제안만(미승인).


모두 **학생 본인 데이터**다(소유 학생은 인증 Actor, 다른 학생 것은 존재도 드러내지 않는 404/검증 오류). 학교·관리자 공식 데이터(§9-1 `subjects[]` 원천, §38·§39 평가계획서·확정값)는 바꾸지 않는다. DB: `V202611190100__assessment_student_ux.sql`(새 Migration, 기존 Migration 변경 없음 · 사용자 DB 미적용).

**§12-a 수행평가 등록 시 개인 과목 함께 등록 (원자적)**

`POST /school-assessments`에 선택 필드 `newSubjectName`(문자열 1~50, 제어문자 불가)을 더한다. `subjectId`와 **둘 중 하나만** 보낸다(둘 다·둘 다 없음 → 400 `subjectId: required`/`newSubjectName: not_allowed`).

- 서버가 이름을 정규화(앞뒤 공백·연속 공백 정리, 비교는 공백 제거·소문자)해 다음 순서로 과목을 정한다: ① 이 학기 학생 수강 과목(`subjects[]`)에 같은 이름 → 그 `subjectId` ② 이 학기 공통 과목 후보(`catalogSubjects[]`)에 같은 이름 → 그 **기존 `subjectId`를 재사용**해 학생 개인 수강 목록에 더한다 ③ 이미 학생이 더한 개인 과목에 같은 이름 → 재사용 ④ 그 밖 → 새 학생 소유 개인 과목(`psubj_…`).
- 과목 추가와 수행평가 등록은 **한 트랜잭션**이다(하나라도 실패하면 둘 다 저장되지 않는다). 학생·학년도·학기·이름 기준 유일(동시 중복 요청은 409 `RESOURCE_VERSION_CONFLICT`).
- 학교 공식 개설·수강 원천 목록과 관리자 평가계획서 과목 목록은 바꾸지 않는다. 개인 과목은 공식 평가계획서 과목처럼 매칭하지 않는다(②의 기존 ID 재사용만 같은 과목으로 본다).

**§9-1-a 학업 정보 응답의 학생 추가 과목**

§9-1 `subjects[]`에 위 ②~④로 학생이 더한 과목이 함께 들어간다(같은 학기만). 항목에 `addedByStudent: true`가 붙는다(원래 수강 과목은 `false`). `catalogSubjects[].enrolled`도 이를 반영한다. Admin 학생 상세 `academicContexts[]`도 같은 규칙이다.

**§12-b 평가 유형 '기타' 직접 입력**

§12 등록·`PATCH`·응답에 `assessmentTypeLabel`(문자열 ≤50 또는 null)을 더한다. `assessmentType`이 `OTHER`일 때만 저장되고, 다른 유형이면 서버가 null로 비운다. 제출물(`submissions`)은 기존 문자열 그대로이며 화면의 선택 목록(보고서·발표 자료(PPT)·…·기타 직접 입력)은 그 문자열 값이다(새 Enum 없음).

**§12-c 수행평가 안내문 첨부 (학생 개인 파일)**

```http
GET    /api/student/assessment/school-assessments/{assessmentId}/notice-files                    → { items: NoticeFile[] }
POST   /api/student/assessment/school-assessments/{assessmentId}/notice-files     (multipart: file) → 201 NoticeFile
DELETE /api/student/assessment/school-assessments/{assessmentId}/notice-files/{fileId}            → 204
GET    /api/student/assessment/school-assessments/{assessmentId}/notice-files/{fileId}            → attachment (원본 바이트)
GET    /api/student/assessment/school-assessments/{assessmentId}/notice-files/{fileId}/preview    → inline
```

- `NoticeFile`: `{ fileId, fileName, contentType, sizeBytes, uploadedAt }`.
- 허용: PDF·JPG·JPEG·PNG·GIF·WEBP(확장자 + 파일 서명 둘 다, 아니면 415 `UNSUPPORTED_FILE_TYPE`). 빈 파일 400, 크기 한도 413 `FILE_TOO_LARGE`(§22-1과 같은 한도). 수행평가 하나에 최대 10개(초과 400 `file: limit`).
- 저장은 §22-1과 같은 격리 Storage(UUID 키, 원본 바이트·SHA-256 재확인). 삭제는 목록에서만 뺀다(바이트 보존 — 운영 보존 정책은 별도 결정). 휴지통에 있는 수행평가의 첨부는 404.

**§30-a 학생 홈 메모**

```http
GET /api/student/assessment/home-memo                → { body: string|null, updatedAt: OffsetDateTime|null, version: number }
PUT /api/student/assessment/home-memo  { body, expectedVersion } → 같은 Shape
```

- 학생 한 명당 하나. `body` ≤2000(빈 문자열·null = 지움). `expectedVersion`이 현재와 다르면 409 `RESOURCE_VERSION_CONFLICT`(처음은 0). 관리자·다른 학생에게 보이지 않는다(관리자 Endpoint 없음). 탐구 노트(§20)와 별개다.

**§30-b 학생 달력 개인 임시 배치 (A28-33, 2026-11-23 · DRAFT — 사용자 요청, 팀 승인 별도)**

```http
GET    /api/student/assessment/calendar-placements?academicYear=2026&semester=2
       → { academicYear, semester, items: [{ sourceKey, displayDate: "YYYY-MM-DD", rangeFrom, rangeTo, updatedAt }] }
PUT    /api/student/assessment/calendar-placements
       { academicYear, semester, sourceKey, displayDate, rangeFrom, rangeTo } → 위 items 한 개 Shape
DELETE /api/student/assessment/calendar-placements?academicYear=2026&semester=2   → 204 (그 학기 배치 초기화)
```

- 학생 홈 달력에서 원문 날짜가 없는 운영계획(`n월 m주` → 그 주 날짜 범위, 한 달만 적힌 `n월` → 그 달 날짜 범위)을 **학생 본인 화면에만** 옮겨 둔 표시 날짜다. 공식 날짜가 아니다: 운영계획·평가계획서·학교 수행평가·D-day·관리자 화면·다른 학생에게 영향을 주지 않는다(관리자 Endpoint 없음).
- `sourceKey` = 화면의 운영계획 행 키 `{planId}|{subjectId}|{rowKey}`(1~200자, 공백·제어문자 불가). 원문 날짜가 있는 행·여러 달·시기 불명 행은 화면이 배치 대상으로 보내지 않는다.
- 서버 검증(400 `VALIDATION_ERROR` + `fields`): `semester` 1·2 · `rangeFrom ≤ displayDate ≤ rangeTo` (`displayDate: out_of_range`) · 범위는 한 달 안(`rangeTo: other_month`) · 그 달이 학년도 범위(3~12월 = 학년도, 1~2월 = 다음 해, `rangeFrom: other_year`) · `sourceKey` 형식(`sourceKey: invalid`).
- 같은 학생·학년도·학기·`sourceKey` 는 한 행(PUT 은 덮어쓰기, 멱등). 학생 인증 없으면 401. 다른 학생의 배치는 조회·변경 경로 자체가 없다(본인 ID는 인증에서만).
- 화면은 저장값이 지금 행의 범위 밖이면(운영계획 재확정으로 시기가 바뀜) 쓰지 않고 기본 배치로 돌아간다(저장값은 남는다).

**§39-6 보충: 결정 근거 `decisionBasis` (A28-31, 2026-11-23 · DRAFT — 추가형)**

- `RowView`(§39-6 `review.rows[]`, §39-10 이력 `rows[]`)에 `decisionBasis: "ADMIN" | "AI_DEFAULT" | null` 추가. `ADMIN` = 관리자가 운영계획 초안에서 그 행을 직접 확인·수정·제외했거나 직접 추가한 행, `AI_DEFAULT` = 관리자가 따로 정하지 않아 '월별 운영계획 최종 승인' 한 번이 분석 후보를 기본값으로 채택한 행, `null` = 이 필드 이전 확정(V202611222242 전).
- 서버가 확정 시점의 열린 운영계획 초안 결정(`teachingPlan[n]`)과 대조해 정한다(요청 필드 아님). 확정 요청·검증(학교·학년도·학년·학기·과목 연결·분석 최신·중복 409 `alreadyConfirmed`)은 그대로다.
- 관리자 화면은 결정하지 않은 후보 중 원문 근거(쪽·위치)가 있고 이 문서 학년 과목인 행을 기본 포함해 `rows` 로 보낸다(행마다 '확인' 필요 없음). 학생 응답(§10-1-2)에는 이 필드가 없다.

**§30-c 관리자 '학생 화면 보기' 읽기 경로 추가 (A28-36, 2026-11-23 · DRAFT — 사용자 요청, 팀 승인 별도)**

```http
GET /api/admin/assessment/students/{studentId}/student-view/evaluation-plans/{planId}/teaching-plan   # 학생 §10-1-2 와 같은 응답
GET /api/admin/assessment/students/{studentId}/student-view/academic-terms                          # 학생 §9-1-c 와 같은 응답
GET /api/admin/assessment/students/{studentId}/student-view/calendar-placements?academicYear&semester  # 학생 §30-b GET 과 같은 응답
GET /api/admin/assessment/students/{studentId}/student-view/current-term                            # 학생 §9-2 current-term 과 같은 응답
```

- 학생 홈 달력·월별 운영계획을 관리자 읽기 전용 보기에서도 학생 화면과 같은 데이터로 보이게 한다. Actor ADMIN, 담당 지점 밖·없는 학생 404(기존 student-view 규칙). 학생 인증 Header 를 쓰지 않는다.
- 쓰기 경로(배치 옮기기·초기화)는 두지 않는다. 학생 홈 메모는 계속 보이지 않는다(§30-a 규칙).

**학생 화면 정책 (새 API 없음)**

- 상세 '평가 기준'은 §10-1 `confirmedFields`(관리자 확정·학생 공개)만 쓴다. 학생 화면은 §11 분석을 읽거나 요청하지 않는다(AI 후보 비노출).
- 상세 '평가계획서 원본'과 홈 3개년 슬롯은 §10-1-3만 쓴다(관리자 등록 문서·분석 결과로 대체하지 않음).
- 목록 '기록 수' = 그 수행평가 탐구 노트의 저장 기록(§21 Revision) 수, '피드백 수' = 그 노트 Revision을 가리키는 §31 요청 수(답변 도착 + 대기). 노트 버전 번호(`revisionNumber`)를 그대로 쓰지 않고 목록 길이로 센다.

### 관리자 화면 (새 API 없음)

- 분석 결과 조회 화면(`/assessment/analysis/{planId}/revisions/{revisionId}/result`)은 §38 `GET /evaluation-plans/{planId}`, §39 `GET .../analysis`·`review-draft`·`teaching-plan-review`, §39-8 `GET .../reviews`, §39-10 `GET .../teaching-plan-reviews`만 읽는다(쓰기·분석기 호출 없음).
- 월별 운영계획 탭·전체 현황 Calendar는 §38 목록 + §39-6 확정 운영계획 + §38-4 과목 목록을 조합한다.

### A27-UX 계정 B 보완 (2026-11-18, DRAFT · 새 Endpoint 없음)

- **분석 결과 조회 화면 2패널·비교**: 위 읽기 API만 쓴다. AI 후보 = §39 `GET .../analysis`(확정 후보 필드), 관리자 검토값 = §39-4 `GET .../review-draft`의 `draft.decisions`(ACTIVE = 임시 저장, 확정 뒤 CLOSED 초안은 확정 때 쓴 결정), 최종 확정값 = §39-8 `GET .../reviews`의 `current` 기록 `confirmedFields`(`analysisSubjectIndex`로 분석 과목과 맞춘다. 번호가 없는 기록은 위 A10 우선순위 ②초안 `subjectLinks` ③분석 과목 1개 + 확정 과목 1개로만 맞추고 그 밖에는 추정하지 않는다). 초안·이력 조회 실패는 '값 없음'과 구분해 표시한다.
- **검토 완료·미확정 판정**: 서버 상태를 새로 만들지 않는다. 검토 대상 총수 = 최신 분석 결과의 확정 후보 필드 수, 결정 수 = ACTIVE 초안의 결정 중 그 필드에 해당하는 수. 분석 목록은 결정이 있는 문서만 분석 결과를 더 읽어 계산한다.
- **학생 Home 다가오는 수행평가**: §12 목록(학생 소유) + §10-1 목록·상세 `confirmedFields`(관리자 확정, 읽기 전용)를 화면에서 함께 보여 준다. 확정값으로 D-day를 만들지 않는다.
- **§20 노트 블록 `attrs.marks`** (OD-A05 전 임시 형식): `[{ "type": "bold"|"italic"|"underline"|"link", "start": 0, "end": 2, "href": "https://..." }]`. `start` 포함·`end` 미포함(UTF-16 위치), `text`는 순수 글 그대로. 서버는 기존대로 `attrs` 객체를 그대로 보존한다(Backend 변경 없음). 클라이언트는 읽을 때 범위·형식·href(http(s))를 다시 검사한다.
- **자료 찾기 Modal**: §22 `GET /resources?query=&type=`(이미 계약된 `type` 필터)와 §20 노트 출처 카드로 연결·해제한다. 새 자료↔수행평가 연결 API는 만들지 않았다.

---

# 63. 구현 시 주의

```text
- Endpoint Inventory는 제공된 Feature Spec과 Domain의 업무 계약이다.
- Backend Controller, 인증, Storage, AI Provider가 이미 구현됐다는 뜻은 아니다.
- Mockup/디자인 이미지만 보고 Endpoint를 추가하지 않는다.
- 구형 수연 Mentor / Parent / Interview / 8단계 Task Flow를 신규로 복구하지 않는다.
- 팀 공통 API 문서는 특정 담당자만을 위한 문서가 아니다.
- Wangyu §65 Student Care Endpoint/Request/Response/Error/주석은 보존한다.
- 실제 검증되지 않은 Existing LearnersHigh ID/API는 추측하지 않는다.
```

---

# 64. 핵심 요약

```text
Frontend
→ 기존 LearnersHigh Student / Admin Surface
→ /api/student/assessment/**
→ /api/admin/assessment/**
→ 기존 Admin Student Care /api/admin/student-care/** 유지

Backend
→ Domain-oriented Spring Boot + 공통 인증 / Integration Boundary
→ Assessment Note Revision / ArtifactVersion / FeedbackSnapshot 보존
→ 관리자 학생 원본 읽기 전용 + 피드백만 별도 쓰기

API Shape → docs/api/api-contract.md
Domain / State → docs/specs/<owner>/domain.md
기능 / Interaction → docs/specs/<owner>/features/*.md
진행 상태 → docs/specs/<owner>/progress.md + 실제 테스트
```

어떤 기능이 '계약 문서에 있다'는 사실만으로 **구현 완료**로 판정하지 않는다. 기존 LearnersHigh 및 Wangyu 기능은 소유권을 지킨다.

---

---

# 65. Admin — Student Care (Wangyu)

### 2026-10-25 주간 지표 확장 (이 절의 이전 기간/기본값 설명보다 우선)

- `asOf`는 서버 Asia/Seoul의 완료된 전날이다. 최근7일은 asOf-6~asOf, 비교28일은 asOf-34~asOf-7로 서로 겹치지 않는다. 기존 `dailyStudy` last14 필드는 호환 유지한다.
- board 응답에 `students: StudentRef[]`를 추가한다. 지점 전체 재원 학생이며 정상·기록부족·관리중도 포함한다. 기존 분류 배열은 유지한다.
- detail 응답에 아래 `review: CareWeeklyReview`를 추가한다.
- `GET /api/admin/student-care/metrics?branchId=...` → `{asOf, branch:{branchId,name}, students:[{student:StudentRef,review:CareWeeklyReview}], dailyAverages:[{date,minutes:number|null,samples:number}]}`. 학생 명단은 전체이며 이름/ID 순으로 안정 정렬한다. 평균은 해당 날짜 기록이 있는 학생의 분 합/표본수(실제0 포함, 미기록 제외)다. 학습관 모든 학생이 없으면 students/dailyAverages는 빈 배열이다. branchId 필수, 오류는 board와 동일한400/404/503, ADMIN 전용이다. 학생별 기존 원본 조회의 실패는 응답 전체503이며 빈 기록으로 대체하지 않는다.
- `CareWeeklyReview` = `{from,to,baselineFrom,baselineTo,days:CareDay[7],baselineDays:CareDay[28],current:CarePeriodSummary,baseline:CarePeriodSummary,weekdayBaseline:[{date,minutes:number|null,startMinutes:number|null,samples:number,startSamples:number}],subjects:[{name,plannedMinutes,actualMinutes,plannedShare:number|null,actualShare:number|null}]}`. baseline 요약의 학습총량/입실일수는28일 전체 값이며 주평균은 각각 /4다. subjects는 최근7일만 집계한다.
- `CareDay` = `{date,attendance:'PRESENT'|'ABSENT'|'UNSCHEDULED'|'UNKNOWN',submission:'SUBMITTED'|'MISSING'|'UNKNOWN',scheduled:boolean|null,minutes:number|null,startMinutes:number|null,plannedMinutes:number|null,actualMinutes:number|null}`. 예정일 미확인+미입실은UNKNOWN이며 결석으로 단정하지 않는다. 학습/제출 기록은 일정과 독립이다. 입실/학습 원본 자체가 없으면 수치는null(0으로 보완하지 않음).
- `CarePeriodSummary` = `{calendarDays,recordedDays,attendanceDays,scheduledAbsenceDays,submissionDays,submissionRecordedDays,studyMinutes:number|null,minutesPerAttendance:number|null,averageStartMinutes:number|null,startSamples,plannedMinutes:number|null,actualMinutes:number|null,executionRate:number|null,comparablePlanDays}`. studyMinutes는 기록된 부분 합이며 recordedDays/calendarDays로 완전성을 구분한다. 과거 주평균 비교는 recordedDays=28인 경우만 유효하다. 달성률은 입실·양수계획·실제가 함께 있는 날짜의 actual/planned*100(상한없음)이다. 비입실 날짜의 제출도 제출률에는 독립 포함한다.
- `CONSECUTIVE_ABSENCE` 코드는 기존 데이터 호환을 위해 유지하되 최근7일의 등원예정·미입실 횟수를 뜻한다. 라벨은 ‘미입실’. 예정일을 확인할 수 없으면 이 신호는 만들지 않는다. 임의 일정 추정 금지.
- 기본값은 absenceDays=1,planMissingDays=2,studyDropPercent=30,executionRatePercent=60,subjectShareGapPoints=20,startShiftMinutes=60,minValidDays=3,cooldownDays=7. absenceDays 범위1~14. 기존 저장된 지점 설정은 자동 변경하지 않는다. 운영 검증 전 제안값이다.
- 케어 건은 내부 `metric_formula_version`으로 판정 공식을 구분한다. 기존 행은1, 새 건은2다. 버전1 baseline/이벤트는 그대로 보존하며 새 주간 공식과 자동 비교하지 않는다. 버전1 점검 comparison은 기존 before/target을 유지하고 now=null, trend=SAME으로 반환한다. 상태전이/상담 기록은 계속 가능하다.
- 미입실/계획미제출 재점검의 `now`는 최근7일 원본이 모두 확인되어야 계산한다. 미입실은 미입실인 날짜의 일정도 확인되어야 한다. 불완전하면 `now=null`이며 개선으로 판정하지 않는다. 확인된 일부 날짜만으로 발생하는 새 경고 신호와는 구분한다.
- 실행률 신호/재확인도 최근7일, 학습시간/입실시각 비교 기준은 직전28일로 통일한다. 반올림 전 판정·종결신호 숨김·상담 상태전이는 유지한다.
- 원본 일정이 제공되지 않으면 scheduled=null을 유지한다. 무계획모드와 권한/원본 API의 기존 Open Decision을 임의로 확정하지 않는다.

> Spec: `docs/specs/wangyu/features/student-care.md`, Domain: `docs/specs/wangyu/domain.md`  
> Actor: `ADMIN`. 인증 방식은 미확정(§7)이며, 확정 전까지 이 Endpoint는 Admin Surface에서만 호출한다.

Base:

```text
/api/admin/student-care
```

공통:

- `branchId`, `studentId`는 Existing LearnersHigh ID(문자열)다.
- `className`은 반이 없는 학생이면 `null`이다.
- 숫자 필드는 JSON 숫자만 받는다(문자열 `"3"`, 소수, 범위를 넘는 정수는 `400 VALIDATION_ERROR`, `details.fields[].field`는 그 필드 경로).
- 날짜는 `YYYY-MM-DD`(Asia/Seoul 기준일), 시각은 ISO 8601 Offset(`+09:00`).
- 기존 학습 데이터 연동 실패: `503 EXISTING_STUDY_DATA_UNAVAILABLE` (빈 목록으로 응답하지 않는다). 기존 학습 기록을 읽는 Endpoint(board, students/{id}, POST cases, decisions) 모두 해당하며, 실패하면 아무것도 저장하지 않는다.
- 모든 Endpoint는 `branchId`로 범위를 정한다. 다른 지점의 학생 / 케어 건은 없는 것으로 본다(404).
- 공통 Error(§5-1 표)는 Endpoint별 Error 목록에 다시 적지 않는다.

Enum:

```text
signalType : CONSECUTIVE_ABSENCE | PLAN_MISSING | STUDY_DROP | EXECUTION_GAP | SUBJECT_SHARE | START_TIME_SHIFT
reason     : EXPECTED_CHANGE | RECORD_ISSUE | ADJUSTMENT_NEEDED        (화면: 문제없음 | 기록 오류 | 계속 관리)
status     : IN_ADJUSTMENT | CLOSED                                   (화면: 관리 중 | 관리 종료)
closeType  : EXPECTED_CHANGE | RECORD_ISSUE | AFTER_RECHECK
decision   : CLOSE | CONTINUE                                         (화면: 관리 종료 | 계속 관리)
eventType  : REASON_CONFIRMED | ADJUSTMENT_STARTED | RECHECKED | CONTINUED | CLOSED | NOTE   (REVISED: 이전 기록에만)
noteChannel: MEETING | CALL | MESSAGE                                  (화면: 면담 | 통화 | 문자. OTHER: 이전 기록에만, 요청에서는 받지만 화면에 없음)
trend      : IMPROVED | SAME | WORSENED
result     : IMPROVED | NO_CHANGE | WORSENED | MIXED                  (화면: 좋아짐 | 그대로 | 나빠짐 | 일부 좋아짐)
```

## 65-1. Branch List

```http
GET /api/admin/student-care/branches
```

```json
{
  "items": [
    { "branchId": "br_gangnam", "name": "러너스하이 강남점", "studentCount": 10 }
  ]
}
```

- 지점이 없으면 `items: []` (Empty). 지점 / 학생 연동 실패는 `503 EXISTING_STUDY_DATA_UNAVAILABLE`.

## 65-2. Care Board

```http
GET /api/admin/student-care/board?branchId=br_gangnam
```

```json
{
  "asOf": "2026-09-30",
  "branch": { "branchId": "br_gangnam", "name": "러너스하이 강남점" },
  "needsCheck": [
    {
      "studentId": "stu_001",
      "studentName": "김서준",
      "className": "고3 A반",
      "signals": [
        { "type": "CONSECUTIVE_ABSENCE", "label": "연속 결석", "summary": "4일째 결석" }
      ]
    }
  ],
  "inAdjustment": [
    {
      "caseId": "care_9f0c...",
      "studentId": "stu_005",
      "studentName": "윤서연",
      "className": "고3 A반",
      "signals": [ { "type": "SUBJECT_SHARE", "label": "수학 계획 미달성", "summary": "수학 계획 30% → 실제 12%" } ],
      "recheckDate": "2026-10-07",
      "recheckDue": false
    }
  ],
  "deferred": [
    { "studentId": "stu_008", "studentName": "장하준", "className": "고3 A반", "validDays": 2 }
  ]
}
```

- `needsCheck`: 특이사항이 있고 관리 중이 아닌 학생. 신호 수 많은 순 → 이름.
- `inAdjustment`: 관리 중. 점검일이 된 건 먼저 → 다음 점검일 빠른 순.
- `deferred`: 기록 부족.

Error: `400 VALIDATION_ERROR`(branchId 없음), `404 BRANCH_NOT_FOUND`, `503 EXISTING_STUDY_DATA_UNAVAILABLE`.

## 65-3. Student Care Detail

`today`는 서버 업무일(Asia/Seoul)이며 다음 확인일의 상대 날짜 계산 기준이다. `asOf`는 완료된 관찰일이므로 업무일과 혼용하지 않는다. 기존 필드에 `today: YYYY-MM-DD`를 추가한다.

```http
GET /api/admin/student-care/students/{studentId}?branchId=br_gangnam
```

```json
{
  "asOf": "2026-09-30",
  "student": { "studentId": "stu_005", "studentName": "윤서연", "className": "고3 A반", "branchId": "br_gangnam" },
  "signals": [
    {
      "type": "SUBJECT_SHARE",
      "label": "수학 계획 미달성",
      "summary": "수학 계획 30% → 실제 12%",
      "evidence": ["수학 계획 30% → 실제 12% · 전체 공부 시간은 평소 수준"]
    }
  ],
  "deferred": null,
  "dailyStudy": [ { "date": "2026-09-17", "minutes": 260 } ],
  "usualDailyMinutes": 252,
  "activeCase": null
}
```

- `dailyStudy`: last14, 날짜 오름차순.
- `deferred`: 기록 부족이면 `{ "validDays": 2 }`, 아니면 `null`.
- `activeCase`: 관리 중 건(65-5 `CareCase`) 또는 `null`.

Error: `400 VALIDATION_ERROR`(branchId 없음), `404 BRANCH_NOT_FOUND`, `404 STUDENT_NOT_FOUND`, `503 EXISTING_STUDY_DATA_UNAVAILABLE`.

## 65-4. Open Care Case (상담 기록)

```http
POST /api/admin/student-care/cases
```

```json
{
  "branchId": "br_gangnam",
  "studentId": "stu_005",
  "channel": "CALL",
  "memo": "시험 범위가 넓어 수학을 미루고 있다고 함. 수학을 30분씩 나눠 하기로",
  "reason": "ADJUSTMENT_NEEDED",
  "recheckDate": "2026-10-07"
}
```

- `channel` 필수. `memo` 0~1000자, 이력에 잘리지 않고 남는다.
- `EXPECTED_CHANGE` / `RECORD_ISSUE`: 건은 바로 `CLOSED`. `recheckDate`는 검증하지 않고 무시한다.
- `ADJUSTMENT_NEEDED`: `recheckDate` 필수, asOf+1 ~ asOf+28. 아니면 `422 INVALID_RECHECK_DATE`(`details.fields[].field` = `recheckDate`).
- 같은 학생에 대한 요청은 순서대로 처리한다. 동시에 두 번 보내도 건은 하나만 생기고 나머지는 `409 ACTIVE_CARE_CASE_EXISTS`(관리 중) 또는 `409 STUDENT_NOT_FLAGGED`(방금 종결되어 쉬는 기간)다. 단, `cooldownDays = 0`이면 즉시 종결 결과는 신호가 남아 있으므로 요청마다 건이 생긴다(domain.md §5-1).

Response `201`: `CareCase` (65-5).

Error: `400 VALIDATION_ERROR`, `404 BRANCH_NOT_FOUND`, `404 STUDENT_NOT_FOUND`, `409 ACTIVE_CARE_CASE_EXISTS`, `409 STUDENT_NOT_FLAGGED`, `422 INVALID_RECHECK_DATE`, `503 EXISTING_STUDY_DATA_UNAVAILABLE`.

## 65-5. CareCase Shape

```json
{
  "caseId": "care_9f0c...",
  "studentId": "stu_005",
  "branchId": "br_gangnam",
  "status": "IN_ADJUSTMENT",
  "reason": "ADJUSTMENT_NEEDED",
  "closeType": null,
  "openedOn": "2026-09-30",
  "closedOn": null,
  "baseline": [
    { "type": "SUBJECT_SHARE", "label": "수학 계획 미달성", "summary": "수학 계획 30% → 실제 12%", "value": 12, "target": 30, "unit": "PERCENT" }
  ],
  "recheckDate": "2026-10-07",
  "recheckDue": false,
  "comparison": null,
  "events": [
    { "eventId": "evt_...", "caseId": "care_9f0c...", "type": "REASON_CONFIRMED", "occurredOn": "2026-09-30", "createdAt": "2026-09-30T10:12:00+09:00", "content": "상담 · 통화 — 시험 범위가 넓어 수학을 미루고 있다고 함", "noteChannel": "CALL" },
    { "eventId": "evt_...", "caseId": "care_9f0c...", "type": "ADJUSTMENT_STARTED", "occurredOn": "2026-09-30", "createdAt": "2026-09-30T10:12:00+09:00", "content": "계속 관리 · 다음 점검 10월 7일", "noteChannel": null }
  ]
}
```

- `unit`: `DAYS` | `MINUTES` | `PERCENT` | `CLOCK_MINUTES`(자정 기준 분).
- `comparison`: `recheckDue`가 `true`일 때만 값이 있다.
- `baseline[].target` / `comparison.rows[].target`: 비교 기준이 있는 신호만 값이 있다. `STUDY_DROP`(평소 7일 공부 분), `EXECUTION_GAP`(기준 달성률), `SUBJECT_SHARE`(계획 비중), `START_TIME_SHIFT`(평소 등원 시각). `CONSECUTIVE_ABSENCE` / `PLAN_MISSING`은 `null`.
- `events[].content`: 화면에 그대로 보여 주는 한 줄. `events`는 오래된 순.

```json
{
  "rows": [
    { "type": "SUBJECT_SHARE", "label": "수학 계획 미달성", "before": 12, "now": 24, "target": 30, "unit": "PERCENT", "trend": "IMPROVED" }
  ],
  "result": "IMPROVED",
  "resultLabel": "좋아짐"
}
```

- `rows[].now`가 `null`이면 지금 기록으로 계산할 수 없는 지표다. `trend`는 `SAME`이지만 화면은 "기록 없음"으로 표시한다.

## 65-6. Decide After Recheck (점검)

```http
POST /api/admin/student-care/cases/{caseId}/decisions?branchId=br_gangnam
```

```json
{ "decision": "CONTINUE", "recheckDate": "2026-10-14" }
```

- `CLOSE`: 관리 종료. `recheckDate`는 무시한다.
- `CONTINUE`: 계속 관리. `recheckDate` 필수 (asOf+1 ~ asOf+28), 아니면 `422 INVALID_RECHECK_DATE`.
- 같은 건에 대한 결정 / 상담 기록은 순서대로 처리한다. 이미 종결된 건에 대한 두 번째 결정은 `409 INVALID_STATE_TRANSITION`.

Response `200`: `CareCase`.

Error: `400 VALIDATION_ERROR`(branchId 없음, 알 수 없는 decision 등), `404 CARE_CASE_NOT_FOUND`(없거나 다른 지점 건), `409 RECHECK_NOT_DUE`, `409 INVALID_STATE_TRANSITION`, `422 INVALID_RECHECK_DATE`, `503 EXISTING_STUDY_DATA_UNAVAILABLE`.

## 65-7. Add Note (관리 중 상담 기록)

```http
POST /api/admin/student-care/cases/{caseId}/notes?branchId=br_gangnam
```

```json
{ "channel": "CALL", "content": "어머니와 통화. 다음 주 시험 끝나면 정상 등원 예정" }
```

Response `201`: `CareEvent` (65-5 `events` 항목, `content`는 `상담 · 통화 — …`). `content` 1~1000자.

종결된 건에도 남길 수 있다.

Error: `400 VALIDATION_ERROR`, `404 CARE_CASE_NOT_FOUND`(없거나 다른 지점 건).

## 65-8. Student Care History

```http
GET /api/admin/student-care/students/{studentId}/history?branchId=br_gangnam
```

```json
{
  "student": { "studentId": "stu_005", "studentName": "윤서연", "className": "고3 A반", "branchId": "br_gangnam" },
  "items": [
    { "eventId": "evt_...", "caseId": "care_...", "type": "CLOSED", "occurredOn": "2026-10-07", "createdAt": "2026-10-07T09:00:00+09:00", "content": "관리 종료", "noteChannel": null }
  ]
}
```

- 그 지점에서 연 이 학생의 모든 건 이벤트, 최신순(같은 시각이면 나중에 기록된 것 먼저).

Error: `400 VALIDATION_ERROR`, `404 BRANCH_NOT_FOUND`, `404 STUDENT_NOT_FOUND`.

## 65-9. Care Settings (특이사항 기준)

```http
GET /api/admin/student-care/settings?branchId=br_gangnam
PUT /api/admin/student-care/settings?branchId=br_gangnam
```

```json
{
  "absenceDays": 3,
  "planMissingDays": 3,
  "studyDropPercent": 40,
  "executionRatePercent": 60,
  "subjectShareGapPoints": 15,
  "startShiftMinutes": 90,
  "minValidDays": 3,
  "cooldownDays": 7
}
```

- PUT은 전체 값을 받는다. 모두 정수다(소수는 `400 VALIDATION_ERROR`). 범위는 `docs/specs/wangyu/domain.md` §4-3. 범위 밖: `422 INVALID_CARE_SETTINGS` (`details.fields`).
- 응답에 각 값의 허용 범위를 함께 준다.

```json
{
  "absenceDays": 3,
  "...": "...",
  "ranges": { "absenceDays": { "min": 2, "max": 14 }, "...": "..." }
}
```

Error: `400 VALIDATION_ERROR`, `404 BRANCH_NOT_FOUND`, `422 INVALID_CARE_SETTINGS`.

## 65-11. Vision Evidence (사진 관찰 근거 사진)

사진 인식·판정과 근거 사진 저장·보관(7일)·삭제는 사진 관찰 서비스(runners_hi_vision_ai)가 맡고, 관리자에게 보여주는 조회는 학생 케어가 맡는다.
학생 케어는 사진을 따로 저장하지 않는다. 사진 관찰 서비스의 근거 사진 저장소(메타데이터 `rhv_evidence_asset`, 원본은 비공개 저장 루트의 `{storage_key}/image.bin`)를 읽기 전용으로 읽고, `state = available`이며 보관 기한 전인 사진만 내준다. 원본은 `content_hash`와 대조한다. 학습관 ID와 학생 ID는 두 서비스가 같은 값을 쓴다.

```http
GET /api/admin/student-care/students/{studentId}/vision-evidence?branchId=br_gangnam&from=2026-10-21&to=2026-10-27
```

```json
{
  "items": [
    { "evidenceId": "asset_zc_s012_20261027_14", "serviceDate": "2026-10-27", "captureId": "zc_s012_20261027_14",
      "capturedAt": "2026-10-27T11:30:00Z" }
  ]
}
```

```http
GET /api/admin/student-care/students/{studentId}/vision-evidence/{evidenceId}/content?branchId=br_gangnam
```

- `evidenceId`는 사진 관찰 서비스의 자산 ID(`assetId`)다. `serviceDate`는 촬영 시각의 Asia/Seoul 날짜다.
- 관리 사유는 이 응답에 두지 않는다. 같은 `captureId`를 가진 사진 관찰 보고의 장면(`AttentionEpisode.captureIds`)에서 읽는다.
- 응답 본문은 사진 원본(`image/jpeg` | `image/png` | `image/webp`), `Cache-Control: no-store, private`.
- 기간은 `from` ≤ `to`, 최대 35일. 어기면 `422 INVALID_VISION_EVIDENCE_PERIOD`.
- 다른 지점·학생의 사진, 만료·삭제된 사진, 내용 해시가 맞지 않는 사진은 `404 VISION_EVIDENCE_NOT_FOUND`. 사진 관찰 저장소에 닿지 못하면 `503 VISION_EVIDENCE_UNAVAILABLE`(사진 없음과 구분).
- 사진은 사진 표본이다. 시간·집중도·수면을 뜻하지 않으며 판정·사유·정렬에 쓰지 않는다.

## 65-10. Endpoint Inventory

```text
GET    /api/admin/student-care/branches
GET    /api/admin/student-care/board
GET    /api/admin/student-care/metrics
GET    /api/admin/student-care/students/{studentId}
GET    /api/admin/student-care/students/{studentId}/history
GET    /api/admin/student-care/students/{studentId}/vision-evidence
GET    /api/admin/student-care/students/{studentId}/vision-evidence/{evidenceId}/content
POST   /api/admin/student-care/cases
POST   /api/admin/student-care/cases/{caseId}/decisions
POST   /api/admin/student-care/cases/{caseId}/notes
GET    /api/admin/student-care/settings
PUT    /api/admin/student-care/settings
```

지점 요약(`GET /summary`)은 없앴다(`docs/design/student-care-ux.md` "이번에 넣지 않는 것").

E2E 전용(운영에서는 등록하지 않음):

```text
PUT    /api/test/clock          { "date": "2026-10-07" }
POST   /api/test/reset
PUT    /api/test/integration    { "studyDataAvailable": false }   Existing 학습 기록 연동 실패 재현
```

등록 조건: `e2e` Profile **그리고** 실행 환경 변수 `LEARNERSHIGH_TEST_ENDPOINTS_ENABLED=true`(설정 파일에는 없음, E2E 실행 명령 / CI e2e Job에서만 지정). 둘 중 하나라도 없으면 Bean이 없다.

- 65-8 history, 65-9 settings도 지점 조회가 Existing 연동이므로 실패하면 `503 EXISTING_STUDY_DATA_UNAVAILABLE`이다.

### 2026-10-28 공식 버전3 호환 규칙

Endpoint/JSON shape는 유지한다. 신규 관리 건의 START_TIME_SHIFT baseline/점검 row는 개인 같은요일 평소 대비 분 차이이며 unit=MINUTES, target=0이다. 구버전1/2 건의 baseline/이력/단위는 보존하고 now=null로 반환하여 새 공식과 잘못 비교하지 않는다. 새 신호의 요약은 ‘평소보다 N분 늦게 입실’이다. 계획 미제출은 scheduled=false 제외, 과목 계획·실제는 동일 입실/계획 제출/양수 계획 날짜만 비교한다. review.subjects의 planned/actual도 동일 날짜를 쓴다. weekdayBaseline.startSamples는 FE에서도 그대로 보존한다. 저장된 상담·지점 기준값은 재작성하지 않는다.


2026-10-29: CareWeeklyReview.baselineDays는 최근7일을 제외한 이전28일 원본 일별 상태다. 결석 화면은 관측된 미입실 전체를 표시하며, 같은요일 이전4회 모두 관측·미입실일 때만 정기 패턴으로 추정한다. 누락 기록은 미입실/정기패턴으로 만들지 않는다. 추정은 승인된 휴무나 무단 여부를 뜻하지 않는다. 기존 상담 판정/임계치 저장값은 재작성하지 않는다.

2026-10-29 관리 이력: StudentHistoryResponse에 cases:CareCaseResponse[] 추가(종결 포함, 당시 baseline 보존). CareEventResponse에 actorName:string|null 추가. open/notes/decisions 요청에 actorName(선택,100자 이하) 추가; 로컬 작성자가 입력하는 이름이며 인증된 운영 사용자 ID를 대체하지 않는다. 과거 null 담당자는 추정해서 채우지 않는다.
