# evaluationItemRef.itemKey 검증 (G-7 A안, 2026-11-10)

## 1. 규칙

학생이 `POST /api/student/assessment/school-assessments`에 `evaluationItemRef`를 보내면 아래를 순서대로 확인한다. 하나라도 어기면 400 `VALIDATION_ERROR`이고 아무것도 저장하지 않는다.

| # | 확인 | 실패 사유 (`details.fields[]`) | 상태 |
|---|---|---|---|
| 1 | Revision이 있고 학생 학교·학년도·학년·학기와 같은 슬롯인가 | `evaluationItemRef.documentRevisionId: unknown` | 기존 |
| 2 | Revision이 `CONFIRMED`인가 | `evaluationItemRef.documentRevisionId: not_confirmed` | 기존 |
| 3 | 참조 과목 = 등록 과목인가 | `evaluationItemRef.subjectId: mismatch` | 기존 |
| 4 | 그 Revision의 **검토 기록이 확정에 사용한 분석 Run**에 그 `itemKey`가 **수행평가 항목**(`performanceEvaluation.items[]`)으로 있는가 | 없음 → `evaluationItemRef.itemKey: unknown` / 지필 항목(`writtenEvaluation.exams[]`)뿐 → `evaluationItemRef.itemKey: not_allowed` | **신규** |

- 새 오류 코드는 만들지 않았다. 공통 `VALIDATION_ERROR`와 기존 사유 어휘(`unknown`, `not_allowed`)를 재사용했다.
- 지필 Key 거절은 계약 §12 "지필평가 항목을 수행평가로 생성하지 않는다"를 따른다.

## 2. 기준 Run을 정하는 방법

- 기준은 **가장 최근 AnalysisRun이 아니라 `PlanReview.analysisId`**다. 검토 없이 나중에 들어온 Run은 기준이 되지 않는다.
- 같은 Revision을 여러 번 검토했다면 **검토 기록 중 하나라도** 쓴 Run에 Key가 있으면 허용한다.
  - "나중 검토가 이전 검토를 대체하는가"(대체됨 상태)는 `domain.md`에서 미확정이다. 그래서 대체 규칙을 여기서 정하지 않았다.
  - 1차 구현은 "가장 최근 검토"를 기준으로 했으나, 같은 시각의 검토 순서가 UUID에 따라 갈렸다. 이 결정도 사실상 대체 규칙을 닫는 것이라 되돌렸다.
- 분석 과목명(예: 가상과학탐구)과 학생 과목 ID(`subj_14`)는 자동 매핑하지 않는다. 그래서 Key는 그 Run의 모든 과목에서 찾는다.

구현: `backend/.../assessment/service/plan/ConfirmedItemKeys.java`(신규), `service/school/SchoolAssessmentService.java`(검사 호출 추가). Shared API·Migration 변경은 없다.

## 3. 테스트 (`AnalyzerV211ImportAndItemKeyApiTest`, 통합)

| 시나리오 | 기대 | 결과 |
|---|---|---|
| 검토 전 Revision의 P01 | 400 `not_confirmed` | 통과 |
| 확정 후 P01 | 201 | 통과 |
| 확정 후 W01(지필) | 400 `itemKey: not_allowed`, 저장 없음 | 통과 |
| 확정 후 P99(없음) | 400 `itemKey: unknown`, 저장 없음 | 통과 |
| 다른 Revision에만 있는 Key(P01을 합성 Revision에 참조) | 400 `unknown`, 저장 없음 | 통과 |
| 그 합성 Revision 자신의 Key(`performance_01`) | 201 | 통과 |
| 검토 뒤 새 Run(P77만 있음) 수신 → P77 | 400 `unknown`(검토에 쓰이지 않은 Run) | 통과 |
| 같은 시점 P01 | 201(기존 검토 기준 유지) | 통과 |
| 새 Run으로 다시 검토 → P77·P01 / P98 | 201·201 / 400 | 통과 |
| 다시 검토한 뒤 기존 학생 참조(P01) 재조회 | 값 그대로(자동 수정 없음) | 통과 |
| 참조 없는 직접 등록 | 201 | 통과 |

P77 변형 Run은 v21.1 결과에서 `"P01"` 문자열만 `"P77"`로 바꾼 **손으로 만든 합성 변형**이다. 분석기 출력이 아니다.

실제 서버 HTTP에서도 P99 400, W01 400, P01 201을 확인했다(`V211-E2E-RESULT.md` §3).

## 4. 기존 참조와의 호환성

- 이미 저장된 학생 수행평가는 다시 검사하거나 고치지 않는다. 검사는 새로 등록할 때만 한다.
- 기존 테스트(`EvaluationPlanApiTest`의 `performance_01` 참조 등)는 Key가 분석 결과에 있어 그대로 통과했다.
- 로컬 E2E Schema 밖의 기존 데이터에는 적용하지 않았다(데이터 수정 없음).

## 5. 한계 (보장하지 않는 것)

- **Key가 있다는 것은 그 평가 항목을 사람이 개별로 확인했다는 뜻이 아니다.** 관리자 확정값은 `fieldPath` 단위(예: `performanceEvaluation.items[0].weightPercent`)로만 저장된다. 항목 단위 확인 기록은 계약에 없다(G-7 B안, 계약·DB 변경 필요).
- 과목 일치는 학생이 보낸 `subjectId`끼리만 비교한다. Key가 그 과목의 분석 구간에서 왔는지는 확인하지 않는다(과목 매핑 기록 없음).
- `itemKey`의 재분석 안정성은 분석기 규칙에 달려 있다(계정 B B-2). 현재 v21.1은 같은 파일 2회 분석 시 같은 Key라고 보고했다.
