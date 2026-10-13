# Existing LearnersHigh Data Model

> 위치: `docs/architecture/existing-data-model.md`  
> 목적: 기존 LearnersHigh의 **실제 Entity / Table / API / Auth / ID 정보**를 확인된 것만 정리하고, Extension의 `Existing*` 통합 Contract와 어떻게 Mapping되는지 기록한다.  
> 연결 원칙은 `docs/architecture/integration-boundary.md`, 결정은 ADR-0002를 따른다.

## 1. 원칙

- 이 문서는 **확인된 사실만** 적는다. 추측한 Table / Column / Endpoint / PK Type은 적지 않는다.
- 확인 출처(원본 파일, 담당자, 날짜)를 항목마다 남긴다.
- 원본 자료(Schema Dump, ERD, API 명세, 소스 일부)는 `references/existing-runners-high/source/`에 그대로 둔다(Read-only). 이 문서는 그 요약과 Mapping이다.
- 기존 Entity를 Extension DB에 복제하지 않는다. Extension은 ID로만 참조하고, 필요한 값은 `common/integration/learnershigh`의 Client로 읽는다.

상태 표기:

| Status | 의미 |
|---|---|
| `UNCONFIRMED` | 원본 정보 없음. Extension은 Mock Client 사용 |
| `CONFIRMED` | 원본 자료로 확인됨 (출처 기재) |
| `MAPPED` | 실제 Client 구현과 Contract Test까지 완료 |

## 2. 연결 방식

| 항목 | 상태 | 내용 | 출처 |
|---|---|---|---|
| 연결 방식 (API / DB Read Replica / 기타) | `UNCONFIRMED` | — | — |
| Authentication / SSO | `UNCONFIRMED` | — | — |
| Timezone / 날짜 형식 | `UNCONFIRMED` | Extension은 Asia/Seoul, ISO-8601 | — |

연결 방식이 정해지면 ADR로 기록한다.

## 3. Existing Entity

확인되면 Entity마다 아래 형식으로 추가한다.

```text
### <Entity 이름> (Table / Resource)

- 상태 / 출처
- Identifier: 이름, Type (예: BIGINT / UUID / String)
- Extension이 쓰는 필드: 이름, Type, 의미, Null 여부
- Enum / Status 값과 의미
- 조회 API 또는 Query 경로
```

| Entity | 상태 | Extension 사용처 |
|---|---|---|
| 지점 (Branch) | `UNCONFIRMED` | 학생 케어 |
| 학생 (Student) | `UNCONFIRMED` | 학생 케어, Suyeon Feature 전반 |
| 출결 / 입실 기록 | `UNCONFIRMED` | 학생 케어 |
| 순공 / 학습 시간 | `UNCONFIRMED` | 학생 케어 |
| 학습계획 (Plan) | `UNCONFIRMED` | 학생 케어, Mentor Plan Apply |
| 라이브러리 (Library) | `UNCONFIRMED` | Mentor Hub |
| 수행평가 (Performance Task) | `UNCONFIRMED` | School & Admissions |
| 매니저 / 관리자 계정 | `UNCONFIRMED` | Admin 인증 |

## 4. Extension Contract Mapping

Extension 코드가 실제로 쓰는 통합 Contract다. 원본이 확인되면 오른쪽 열을 채우고 Mock을 실제 Client로 바꾼다.

### 4-1. `ExistingStudentClient`

| Contract 필드 | Type | 의미 | 원본 Mapping |
|---|---|---|---|
| `ExistingBranch.branchId` | String | 지점 ID | `UNCONFIRMED` |
| `ExistingBranch.name` | String | 지점명 | `UNCONFIRMED` |
| `ExistingStudent.studentId` | String | 학생 ID | `UNCONFIRMED` |
| `ExistingStudent.branchId` | String | 소속 지점 ID | `UNCONFIRMED` |
| `ExistingStudent.name` | String | 이름 (Admin 전용, Mentor 노출 금지) | `UNCONFIRMED` |
| `ExistingStudent.className` | String | 반 | `UNCONFIRMED` |

### 4-2. `ExistingStudyClient.findDailyStudy(studentId, from, to)`

기간 안 모든 날짜를 오름차순으로 돌려준다.

| Contract 필드 | Type | 의미 | 원본 Mapping |
|---|---|---|---|
| `date` | LocalDate | 날짜 | `UNCONFIRMED` |
| `checkedIn` | boolean | 입실 기록 여부 | `UNCONFIRMED` |
| `firstCheckInTime` | LocalTime? | 첫 입실 시각 | `UNCONFIRMED` |
| `studyMinutesBySubject` | Map<String, Integer> | 과목별 순공 분 | `UNCONFIRMED` |
| `planSubmitted` | boolean | 그날 계획 제출 여부 | `UNCONFIRMED` |
| `plannedMinutesBySubject` | Map<String, Integer> | 과목별 계획 분 | `UNCONFIRMED` |

ID Type은 원본이 숫자여도 Contract에서는 String으로 받는다(`integration-boundary.md` §7).

## 5. 변경 절차

```text
원본 자료 수령 → references/existing-runners-high/source/에 보관
→ 이 문서 §2~§4 갱신 (출처 기재)
→ 필요 시 ADR (연결 방식 / 인증)
→ 실제 Client 구현 + Contract Test
→ Mock은 e2e / test Profile에만 남김
```

## 6. Related Documents

```text
docs/architecture/integration-boundary.md
docs/adr/0002-existing-learnershigh-integration-boundary.md
docs/product/existing-runners-high-analysis.md
references/existing-runners-high/
backend/src/main/java/com/learnershigh/extension/common/integration/learnershigh/
```
