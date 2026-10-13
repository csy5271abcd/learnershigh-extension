# Existing LearnersHigh — 확인된 Data / API 표본

> 기존 LearnersHigh 원본 코드(비공개 원본 저장소)에서 **직접 확인한** Table / Column / Response Shape 중 Extension Contract에 필요한 것만 정리한다.
>
> 이 저장소는 Public이다. 원본 저장소 이름, 정확한 Endpoint 경로 / 파라미터, 원본 시스템의 보안 관련 동작은 여기에 적지 않고 팀 비공개 채널에서 관리한다.
> `integration-boundary.md` §55의 "확인 후 업데이트" 대상이며, §41 Mock → Real 전환 1~2단계의 근거 자료다.
>
> 연동 방식(A. Existing API / B. Shared Module / C. DB Read Adapter)과 인증은 아직 **Open Decision**이다. 이 문서는 그것을 닫지 않는다.

---

# 1. 범위

현재 Integration Contract가 쓰는 값만 다룬다.

```text
ExistingStudent      ← user, user_group
ExistingDailyStudy   ← activity_report, activity_item, activity_item_code
ExistingBranch       ← branch            (Response 표본 미작성)
```

코드 위치:

```text
backend/.../common/integration/learnershigh/phapi/
├─ PhapiStudent, PhapiRef               학생 목록 API / 기간별 일일 현황의 user
├─ PhapiDailyReport                     student_list[].report
├─ PhapiStudyReportsPeriodResponse      기간별 일일 현황 API
├─ PhapiSubjectStudyStat                과목별 통계 API (일자별)
└─ PhapiStudyMapper                     phapi Response → Integration Contract

backend/src/test/resources/learnershigh/phapi/v2/   Response 표본 (가짜 값, 원본 Key / 형식 그대로)
backend/src/test/.../phapi/PhapiStudyMapperTest      Contract Test (§43)
```

Real Adapter(`RealExistingStudyClient`)는 인증 방식이 정해진 뒤 phapi 호출 + `PhapiStudyMapper`로 구현한다.

---

# 2. Table

원본: 비공개 원본 저장소의 DB Schema 문서

## 2-0. 시간 기준

| 항목 | 상태 | 내용 |
|---|---|---|
| `login_first` 등 DATETIME의 Timezone | `UNCONFIRMED` | Mapper는 Asia/Seoul 벽시계 값으로 가정한다. 원본 DB / PHP Timezone 확인 필요 |
| 학습일과 다른 날짜의 `login_first` (자정 이후 입실) | `UNCONFIRMED` | 원본 의미가 확인되기 전까지 연동 형식 오류(503)로 처리한다 |

## 2-1. 식별자

```text
모든 PK는 bigint(20) auto_increment
Extension Contract는 String으로 받는다 (String.valueOf(user.id))
학생 = user.role_id = 5
```

## 2-2. user (학생)

| Column | 쓰는 곳 | 비고 |
|---|---|---|
| `id` | studentId | bigint |
| `branch_id` | branchId | |
| `group_id` → `user_group.name` | className | 반이 없으면 null |
| `real_name` | name | Admin Surface 전용 (Mentor 노출 금지) |
| `role_id` | 학생 필터 | 5 = STUDENT |
| `status` | | ACTIVE / INACTIVE / DELETED |
| `user_svc_flag` | 무계획모드 | 2째자리 `'1'` = 무계획모드 사용 (`console/.../common_jh_*.js`의 `planMode`) |

## 2-3. activity_report (하루 1행, `type = DAILY`)

| Column | 쓰는 곳 | 비고 |
|---|---|---|
| `report_date` | date | |
| `login_first` | checkedIn / firstCheckInTime | 미입실이면 NULL |
| `user_status` | | 대기/로그인/학습/경고/식사/휴식/외출/학원/학원후귀가/귀가/미입실 |
| `plan_status` | planSubmitted | 제출전 / 제출완료 / 컨펌완료. 제출완료·컨펌완료를 제출로 본다 |
| `total_time_study` | (참고) | 초. 하루 전체 순공 |
| `total_time_stay` | (참고) | 초. 하루 체류 |
| `todo_count` / `done_count` | (참고) | 계획 / 실천 개수 |

## 2-4. activity_item (할 일 1개)

| Column | 쓰는 곳 | 비고 |
|---|---|---|
| `report_id` → `activity_report` | 날짜 | |
| `item_code_id` → `activity_item_code.name` | 과목 Key | 지점별 자유 명명 |
| `total_time_plan` | plannedMinutesBySubject | 초 |
| `total_time_study` | studyMinutesBySubject | 초 |
| `status` | | INIT / ACTIVE / INACTIVE / DONE / NOTDONE / DELETED |

## 2-5. activity_item_code / 표준 과목

```text
activity_item_code.name        지점별 과목 코드명 (예: "수학(미적분)")
activity_item_code.subject_id  표준 과목 FK (NULL 허용, 미분류 존재)
```

표준 과목 마스터는 문서상 두 개가 보인다. 실제 참조 대상 확인이 필요하다.

```text
subject                      1국어 2수학 3영어 4한국사 5사회탐구 6과학탐구 7외국어
activity_item_code_subject   1국어 2수학 3영어 5사회 6과학 13공무원/자격 14기타
```

---

# 3. Endpoint / Response

모두 `phapi/v2/` (현행). `v1/`은 deprecated다.

## 3-1. 학생 목록

```text
학생 목록 API (지점 단위)
→ user WHERE branch_id = ? AND role_id = 5
→ 표본: v2/branches/select_students.json
```

## 3-2. 기간별 일일 현황 (입실 / 계획 제출)

```text
기간별 일일 현황 API (지점 · 기간 단위)
→ { student_list: [ { user, report } ], ... }
→ 표본: v2/branches/select_study_reports_period.json
```

- 학생 × report 일자마다 한 행이다. report가 없는 날은 행이 없다.
- `LEFT OUTER JOIN`이라 기간 안에 report가 하나도 없는 학생은 `report_date = null`인 행이 하나 온다.
- 시간 값은 `"HH:MM:SS"` 문자열이다 (`formatSecToTime`). 시간 자리는 99를 넘을 수 있다.

## 3-3. 과목별 계획 / 순공

```text
과목별 통계 API (학생 · 기간 단위, 일자별 모드)
→ [ { name, total_time_plan, total_time_study, offset(report_date) } ]
→ 표본: v2/items/stats/subject_study_stats_PDFBYDAY.json
```

- PDFBYDAY는 합산하지 않고 `activity_item` 1개당 한 행이다. 같은 과목 코드가 여러 행 올 수 있다.
- `period_type` 없이 부르면 기간 전체를 과목 코드별로 합산하고 `offset = null`이다.

---

# 4. Mapping 규칙 (`PhapiStudyMapper`)

| Contract | 규칙 |
|---|---|
| `ExistingStudent.studentId` | `String.valueOf(user.id)` |
| `ExistingStudent.className` | `user.group.name` |
| `ExistingDailyStudy.checkedIn` | `report.login_first != null` |
| `firstCheckInTime` | `login_first`의 시각 |
| `planSubmitted` | `plan_status ∈ {제출완료, 컨펌완료}` |
| `studyMinutesBySubject` | PDFBYDAY 행을 날짜 × 과목 코드명으로 초 단위 합산 → 분 (내림), 0분 과목 제외 |
| `plannedMinutesBySubject` | 같은 방식. 계획 미제출일이면 비어 있다 |
| 기간 안 report 없는 날 | 미입실 / 미제출 / 빈 기록 |
| 학생 범위 | `role_id = 5` 그리고 `status = ACTIVE`만. INACTIVE / DELETED / 비학생 계정은 제외 |
| 형식 오류 | `ExistingIntegrationException` → 503. 필수 값 누락(과목 이름, student_list, user / id, 재원 학생 real_name), 해석할 수 없는 날짜 / 시각, 음수 · 부호 붙은 시간 문자열, 분 · 초 60 이상 포함. 미입실로 바꾸지 않는다 |
| 과목별 통계의 삭제된 할 일 | 응답에 할 일 status가 없어 걸러낼 수 없다 (원본 API 확인 필요) |

---

# 5. 주의 사항

## 5-1. 사용하면 안 되는 값

```text
인증 / 세션 / 내부 처리 관련 필드   Adapter는 아래 Mapping에 쓰는 필드만 읽고 나머지는 무시한다.
                                   (원본 응답의 보안 관련 동작은 원본 시스템 담당자에게 비공개로 전달한다.)
progress_rate                 원본이 todo / done으로 뒤집어 계산한다.
phone, parents_phone          학생 목록 API에서는 항상 null이다.
```

표본 JSON에는 Mapping에 쓰는 필드와 형식 확인에 필요한 필드만 둔다.

## 5-2. 현재 Contract로 표현되지 않는 것

```text
무계획모드        user_svc_flag 2째자리 = '1'이면 plan_status가 계속 "제출전"이다.
                  ExistingStudent / ExistingDailyStudy에 필드가 없어 학생 케어 "계획 미제출" 신호가 오탐한다.
                  → PhapiStudent.noPlanMode()까지만 구현. Contract 반영은 studentcare 담당 확인 후.

표준 과목         과목별 통계 API는 과목 코드명만 준다 (subject_id 없음).
                  지점마다 "수학(미적분)", "사탐(생윤)"처럼 달라 과목 비중 신호의 기준이 지점마다 달라진다.
                  → 원본 API에 subject_id 추가 또는 코드 → 표준 과목 Mapping 필요 (Open).

하루 순공 합계    Contract는 과목별 합으로 계산한다. activity_report.total_time_study와 다를 수 있다.
```

## 5-3. 호출 비용

과목별 통계 API는 학생 단위다. 지점 전체 케어 보드를 그리면 학생 수만큼 호출한다 (N+1).

## 5-4. Mock 시나리오와의 차이

`MockExistingStudentClient` / `MockStudyScenarios`는 PR 7 시연용이다.

```text
ID          Mock "stu_001"         실제 bigint ("1001")
과목 Key    Mock 국어/수학/영어/탐구  실제 지점별 과목 코드명
```

---

# 6. Extension이 필요로 하는 조회

Extension이 **만드는** API는 `docs/api/api-contract.md`에 둔다. Frontend는 Existing API를 직접 호출하지 않는다(API-OD-07).

| 필요한 조회 | 사용 Feature | Extension Client | 원본 | 상태 |
|---|---|---|---|---|
| 지점 목록 / 단건 | 학생 케어 | `ExistingStudentClient.findBranches / findBranch` | — | 표본 없음 |
| 지점 학생 목록 / 단건 | 학생 케어, Admin 학생관리 | `ExistingStudentClient.findStudents / findStudent` | §3-1 | 확인 |
| 학생 기간별 출결 · 계획 제출 | 학생 케어 | `ExistingStudyClient.findDailyStudy` | §3-2 | 확인 |
| 학생 기간별 과목 계획 / 순공 | 학생 케어 | `ExistingStudyClient.findDailyStudy` | §3-3 | 확인 (N+1, §5-3) |
| 학생 학습계획 조회 / Mentor Plan 반영 | Mentor Hub | (미구현) | — | 미확인 |
| 라이브러리 조회 | Mentor Hub | (미구현) | — | 미확인 |
| 수행평가 조회 | School & Admissions | (미구현) | — | 미확인 |
| 로그인 / SSO 토큰 검증 | 전체 Surface | (미구현) | — | 미확인 (Open) |

새로 확인하면 §2~§4에 Table / Endpoint / Mapping을 추가하고 이 표의 상태를 바꾼다. 원본 소스 / 스키마 자체는 저장소에 올리지 않는다(Public Repository).

---

# 7. 확인 출처

비공개 원본 저장소의 DB Schema 문서, 학생 목록 / 기간별 일일 현황 / 과목별 통계 API 구현, 시간 Format Util, 관리자 콘솔의 무계획모드 판정 Script (2026-10-13 확인). 정확한 경로는 팀 비공개 채널에 둔다.
