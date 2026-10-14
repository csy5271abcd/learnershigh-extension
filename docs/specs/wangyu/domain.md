# Wangyu Domain — Student Care

> 위치: `docs/specs/wangyu/domain.md`  
> 학생 케어(Student Care)의 Entity / State / 신호 계산 기준이다. 기능 흐름은 `features/student-care.md`, API는 `docs/api/api-contract.md` §65.

## 1. Bounded Context

```text
studentcare  (backend package: com.learnershigh.extension.studentcare)
```

읽는 외부 데이터 (Existing LearnersHigh, Read only):

| Client | 내용 |
|---|---|
| `ExistingStudentClient` | 지점 목록, 지점 학생 (studentId, 이름, 반) |
| `ExistingStudyClient` | 학생별 하루 기록: 입실 여부 / 첫 입실 시각, 과목별 학습 분, 계획 제출 여부, 과목별 계획 분 |

실제 Existing API가 확정되기 전까지 `MockExistingStudentClient` / `MockExistingStudyClient`(시나리오 데이터)를 쓴다.
연동 실패는 `EXISTING_STUDY_DATA_UNAVAILABLE`(503)이며 빈 목록으로 바꾸지 않는다.

## 2. 기준일 / 기간

- 기준일 `asOf` = 서버 `Clock`의 오늘 (Asia/Seoul).
- `last7` = asOf-6 ~ asOf, `last14` = asOf-13 ~ asOf, `prev21` = asOf-27 ~ asOf-7.
- 유효 학습일 = 그날 학습 30분 이상.

## 3. 신호 (CareSignalType)

우선순위 순서. 화면 용어는 **특이사항**이며 판정이 아니다.

| Type | 라벨 | 조건 | 비교 지표 (점검) | 좋아지는 방향 |
|---|---|---|---|---|
| `CONSECUTIVE_ABSENCE` | 연속 결석 | asOf부터 거꾸로 연속 미입실 일수 ≥ `absenceDays` | 연속 미입실 일수 | 낮을수록 |
| `PLAN_MISSING` | 계획 미제출 | last7 계획 미제출 일수 ≥ `planMissingDays` | last7 미제출 일수 | 낮을수록 |
| `STUDY_DROP` | 공부 시간 감소 | 평소(prev21 합 ÷ 3) > 0 이고 (평소 − last7 합) ÷ 평소 ≥ `studyDropPercent`% | last7 학습 분 | 높을수록 |
| `EXECUTION_GAP` | 계획 미달성 | last14 중 계획을 제출한 날의 계획 분 합 > 0 이고, 그날들의 실행 분 합 ÷ 계획 분 합 < `executionRatePercent`% | 실행률 % | 높을수록 |
| `SUBJECT_SHARE` | 과목 계획 미달성 (화면: "<과목> 계획 미달성") | last7 계획 비중 − 실제 비중이 가장 큰 과목의 차이 ≥ `subjectShareGapPoints`%p | 그 과목 실제 비중 % | 높을수록 |
| `START_TIME_SHIFT` | 등원 시간 늦어짐 | last7 평균 첫 입실 시각 − prev21 평균 ≥ `startShiftMinutes`분 (각 기간 입실 3일 이상) | last7 평균 시작 분 | 낮을수록 |

규칙:

- 판정은 반올림하지 않은 값으로 한다. 화면 / 요약 / Baseline 값만 정수로 반올림한다. (예: 실행률 59.6%는 60% 미만이다.)
- `CONSECUTIVE_ABSENCE`가 있으면 학습량 계열(`STUDY_DROP`, `EXECUTION_GAP`, `SUBJECT_SHARE`, `START_TIME_SHIFT`)은 계산하지 않는다.
- 기록 부족(`deferred`): last7 유효 학습일 < `minValidDays`이고 `CONSECUTIVE_ABSENCE`가 없으면 학습량 계열을 계산하지 않는다. **cooldown을 적용한 뒤** 남은 신호가 없으면 기록 부족 목록에 둔다.
- `cooldownDays`: 학생의 **가장 최근 종결 건**(closedOn이 가장 늦은 건, 같으면 나중에 종결된 건) 하나만 본다. closedOn > asOf − cooldownDays 이면(종결일 포함 cooldownDays일 동안) 그 건의 기준 신호와 같은 Type은 보드에 올리지 않는다. cooldownDays = 0이면 숨기지 않는다.
  예: cooldown 7일, 9/23 종결 → 9/23~9/29 숨김, 9/30부터 다시 올림.
- 관리 중(`IN_ADJUSTMENT`) 학생은 특이사항 목록(`needsCheck`)이 아니라 관리 목록(`inAdjustment`)에 둔다.

## 4. Entity

### 4-1. CareCase (관리)

| Field | 설명 |
|---|---|
| `caseId` | `care_<uuid>` |
| `branchId`, `studentId` | Existing ID (문자열) |
| `status` | `IN_ADJUSTMENT`(관리 중) / `CLOSED`(관리 종료) |
| `reason` | 상담 결과: `EXPECTED_CHANGE`(문제없음) / `RECORD_ISSUE`(기록 오류) / `ADJUSTMENT_NEEDED`(계속 관리) |
| `closeType` | `EXPECTED_CHANGE` / `RECORD_ISSUE` / `AFTER_RECHECK` (CLOSED일 때) |
| `openedOn`, `closedOn` | 날짜 |
| `baseline` | 건을 연 시점의 신호 목록과 비교 지표 값 (Snapshot, 이후 원본 변경으로 덮어쓰지 않음) |
| `recheckDate` | 다음 점검일 (IN_ADJUSTMENT일 때) |

약속(plan)은 두지 않는다. 상담 내용(memo)이 곧 계획이다. `care_case.plan_*` Column은 이전 기록용으로 남고 쓰지 않는다.

### 4-2. CareEvent (이력)

| Type | 남는 시점 | 문구 예 |
|---|---|---|
| `REASON_CONFIRMED` | 관리를 연 상담 (방식 = `noteChannel`) | `상담 · 통화 — 시험 끝나고 쉬는 중` |
| `ADJUSTMENT_STARTED` | 계속 관리로 시작 | `계속 관리 · 다음 점검 10월 7일` |
| `RECHECKED` | 점검 결정 시 비교 | `점검 · 좋아짐 — 수학 비중 12% → 24%` |
| `CONTINUED` | 점검 후 계속 관리 | `계속 관리 · 다음 점검 10월 14일` |
| `CLOSED` | 관리 종료 | `문제없음 · 관리 종료` / `기록 오류 · 관리 종료` / `관리 종료` |
| `NOTE` | 관리 중 상담 기록 | `상담 · 면담 — …` |

이벤트는 추가만 한다(수정 / 삭제 없음). `REVISED`는 이전 기록에만 있고 새로 만들지 않는다.
상담 방식(`NoteChannel`): `MEETING`(면담) / `CALL`(통화) / `MESSAGE`(문자). `OTHER`는 이전 기록 호환용이다.

### 4-3. CareSettings (기준값)

지점별 1건. 없으면 기본값을 쓴다. 범위:

| Key | 기본 | 범위 |
|---|---|---|
| absenceDays | 3 | 2~14 |
| planMissingDays | 3 | 1~7 |
| studyDropPercent | 40 | 10~90 |
| executionRatePercent | 60 | 10~100 |
| subjectShareGapPoints | 15 | 5~60 |
| startShiftMinutes | 90 | 30~300 |
| minValidDays | 3 | 1~7 |
| cooldownDays | 7 | 0~30 |

## 5. State Transition

```text
(없음) ──상담: 문제없음──▶ CLOSED (closeType EXPECTED_CHANGE)
(없음) ──상담: 기록 오류──▶ CLOSED (closeType RECORD_ISSUE)
(없음) ──상담: 계속 관리 + 다음 점검일──▶ IN_ADJUSTMENT

IN_ADJUSTMENT ──(asOf ≥ recheckDate) 관리 종료──────────────▶ CLOSED (AFTER_RECHECK)
IN_ADJUSTMENT ──(asOf ≥ recheckDate) 계속 관리(새 다음 점검일)──▶ IN_ADJUSTMENT
```

잘못된 전이 (409):

| 상황 | Error Code |
|---|---|
| 진행 중 건이 있는데 새 건 | `ACTIVE_CARE_CASE_EXISTS` |
| 신호가 없는 학생으로 새 건 | `STUDENT_NOT_FLAGGED` |
| 다음 점검일 전 결정 | `RECHECK_NOT_DUE` |
| CLOSED 건에 결정 | `INVALID_STATE_TRANSITION` |

입력 오류 (422): `INVALID_RECHECK_DATE`, `INVALID_CARE_SETTINGS`.

## 5-1. 동시 요청

- 같은 학생의 상담 기록(새 건)은 학생 단위 잠금으로 순서대로 처리한다. 즉시 종결(EXPECTED_CHANGE / RECORD_ISSUE)을 두 번 동시에 보내도 건은 하나다. 두 번째는 쉬는 기간 때문에 `STUDENT_NOT_FLAGGED`가 된다(cooldownDays = 0이면 신호가 남아 있으므로 새 건이 정상적으로 하나 더 생긴다).
- 진행 중 건은 지점 × 학생당 하나다(DB Unique `branch_id, active_student_id`).
- 같은 건의 결정 / 상담 기록(notes)은 건 단위 잠금으로 순서대로 처리한다. 그래도 충돌하면 `409 CONCURRENT_MODIFICATION`.

## 5-2. 지점 범위

- 케어 건과 학생 기록은 지점 단위다. 다른 지점에서 연 건은 보이지 않고 변경할 수 없다(404).
- 학생이 지점을 옮겼을 때 이전 지점 기록을 이어 보여 줄지는 Open Decision이다(§8).

## 6. 점검 비교

- 건의 `baseline`에 있는 신호마다 같은 공식으로 asOf 기준 지표를 다시 계산한다.
- 추세: 좋아지는 방향으로 최소 폭 이상 움직이면 `IMPROVED`, 반대면 `WORSENED`, 아니면 `SAME`.
  최소 폭: 일수 1일, 학습 분 max(30분, 기준의 5%), 비중·실행률 3%p, 시작 시각 15분.
- 지금 기록으로 계산할 수 없는 지표(예: 미입실이라 과목 비중 없음)는 `SAME`으로 보고 값은 비운다. 화면은 "비교할 기록 없음"으로 표시한다.
- 결과: 모두 IMPROVED → `IMPROVED`(좋아짐), 모두 SAME → `NO_CHANGE`(그대로), IMPROVED 없이 WORSENED 있음 → `WORSENED`(나빠짐), 그 외 → `MIXED`(일부 좋아짐).
- 결과는 표시용이다. 상태를 바꾸지 않는다.

## 7. 문구

화면에 나가는 문구(특이사항 라벨, 한 줄 수치, 이력 문구)는 `docs/design/student-care-ux.md` 용어를 따른다. 백엔드 문구는 `CareSignalType`, `CareSignalCalculator`, `StudentCareTexts`가 관리한다.

## 8. Open Decision

| 항목 | 내용 |
|---|---|
| 무계획모드 | Existing `user_svc_flag` 2째자리 `'1'`인 학생은 계획 상태가 계속 "제출전"이라 `PLAN_MISSING`이 오탐한다(`docs/architecture/existing-learnershigh-data.md` §5-2). Contract에 반영할지, 이 학생은 `PLAN_MISSING` / `EXECUTION_GAP` / `SUBJECT_SHARE`를 계산하지 않을지 결정 필요. |
| 표준 과목 | Existing 과목은 지점별 코드명이라 `SUBJECT_SHARE` 기준이 지점마다 다르다. 표준 과목 Mapping 필요. |
| 지점 이동 | 학생이 지점을 옮기면 이전 지점 케어 기록을 이어 볼지. 현재는 지점 단위로 분리. |
| 인증 / 권한 | 관리자가 볼 수 있는 지점 범위. 현재는 `branchId` 파라미터로만 범위를 정한다. |
