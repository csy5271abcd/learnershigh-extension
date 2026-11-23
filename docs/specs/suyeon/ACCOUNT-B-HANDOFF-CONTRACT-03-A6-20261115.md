# 계정 A → 계정 B: analysis-import-0.3 수용 결과와 남은 합의 (A6, 2026-11-15)

> 이전 인계(`ACCOUNT-B-HANDOFF-ANALYSIS-IMPORT-03-20261114.md`)를 대체하지 않고 갱신한다. 계정 B 제안 문서(B3 `CONTRACT-HANDOFF-4`, B4 `CONTRACT-HANDOFF-B4`·`MONTHLY-PLANNER-CONTRACT`)를 읽기만 했고 분석기 코드는 바꾸지 않았다.
> 계약 기준: 작업 트리 `docs/api/api-contract.md` §39-3(0.3 수신), §39-6(운영계획 확정), §10-1-2(학생 조회) — **모두 DRAFT, 합의 전**.

## 1. 계정 A가 계정 B 제안대로 받게 만든 것 (Backend `75a27bf`, 기본 꺼짐)

| 계정 B 제안 | 계정 A 구현 | 비고 |
|---|---|---|
| `contractVersion: "0.3"` (A안) | 그대로. 없으면 0.2 | 설정 `assessment.analysis-import.contract03-enabled`(기본 false) |
| ③ payload `status: PARTIAL` | **수용** (0.3만) | 지난 계정 A 인계의 "Envelope로만" 제안은 철회 |
| ③ `failureReason` 코드 5종 | 수용 (0.3 + FAILED에서 필수, 그 외 null) | |
| ① `issues[].severity` BLOCKING/REVIEW/INFO (없으면 REVIEW) | 수용 | 값은 받은 그대로 저장 |
| ② 필드 상태를 issue 코드 3종으로 | 수용 — `fieldPresence` 맵 제안은 철회 | FIELD_NOT_PROVIDED는 근거 필수·값 null, EXTRACTION_FAILED는 값 null, 같은 경로 중복 금지, 경로는 실제 경로 |
| issue 코드 목록(§6) | **형식만 검사, 모르는 코드도 보존**(목록 미합의) | 목록 확정 시 화면 문구 매핑 |
| ④ `teachingPlan[]` 행 + `TEACHING_PLAN_*` 상태 issue, 연계 키 제외 | 수용 (빈 배열이면 상태 issue 필수, `relatedItemKeys`는 unknown_field) | |
| ⑤ Planner 확장 `monthTo`·`content`·`note`·`schedule` | **수용 — 정밀도 8종을 줄이지 않고 그대로 저장** | 계정 A 초기 5종 제안 폐기 |
| `schedule` 불변 규칙 1~4 | 수용 (calendarYear⇔EXPLICIT_IN_CELL, 날짜 정밀도⇔dateFrom, 주 범위, UNKNOWN 보존) | 관리자 수정에도 같은 규칙 |
| ⑥ 운영계획만 있는 문서 → PARTIAL+MISSING_SECTION | 받을 수 있음(과목이 있으면 평가 0건이어도 통과) | 실제 Fixture로 미검증 |
| 0.3 Envelope 판정 | OK_REVIEW_REQUIRED↔REVIEW_REQUIRED, PARTIAL↔PARTIAL, PARSE_FAILED·NO_ASSESSMENTS_EXTRACTED·NO_SEGMENTS·UNSUPPORTED_FORMAT·NEEDS_OCR↔FAILED | 조합이 다르면 502 |

시험: 합성 0.3 Fixture(`backend/src/test/resources/assessment/contract03/`, 0.2 실제 출력 + 손으로 덧붙인 0.3 필드, 정밀도 8종 9행)로 Unit 10건·Integration 6건 통과. **계정 B 실제 0.3 Adapter 출력으로는 아직 검증하지 않았다.**

## 2. 아직 합의가 필요한 것 (계정 A 단독으로 닫지 않음)

1. **활성화 방식(⑦)**: 계정 A Backend는 서버 분석 요청에 0.3 매개변수(`contract=0.3`, `planner=true`)를 아직 보내지 않는다. 이름·위치를 정해 주면 Client에 추가한다.
2. **`document{}`·`source.sectionCount`**: 모양이 문서에 없어 0.3에서도 `unknown_field`로 거절한다. 필요하면 필드 정의를 보내 달라.
3. **issue 코드 목록·문구**: 확정 목록과 관리자용 한국어 문구.
4. **0.2 경로의 `NO_ASSESSMENTS_EXTRACTED`**(아래 §3-2): 0.2 표에서 FAILED로 받을지(계정 A는 사용자 결정 대기 D-A6-3).
5. **실제 0.3 샘플**: 처음 보는 학교 양식 3건 이상(정밀도 다양), 분석기 버전 명시.
6. **학사력(개학일)**: TERM_WEEK를 날짜로 바꿀 원천 — 계정 A·B 모두 만들지 않는다(1팀·학교 자료 결정).

## 3. 실제 분석기 v21.1 + 0.2 재검증에서 본 것 (2026-11-15, 로컬만, 외부 전송 없음)

| 문서 | 결과 | 비고 |
|---|---|---|
| 합성 PDF(`synthetic-e2e.pdf`) | REVIEW_REQUIRED 저장, 1.8초, 원문 SHA 일치 | 과목 1·수행 2 |
| 공개 학교 문서 A(경기 일반고, 2024 1학년 2학기) | REVIEW_REQUIRED 저장, 7.6초 | 과목 11·수행 27(항목 근거 27/27), 평가명 손상 의심 경고 다수 |
| 공개 학교 문서 B(자율형 사립고, 2024 1학년 1학기) | **PARTIAL 저장**, 5.8초 | 과목 10·수행 26(항목 근거 26/26), **과목 단위 sources 0건**, Envelope `errors[]` 비어 있음 |
| 평가계획서가 아닌 공개 PDF | **502 `unknown_status`, 저장 안 함** | Envelope `NO_ASSESSMENTS_EXTRACTED` + payload `FAILED`(importable=true) |

1. PARTIAL인데 Envelope `errors[]`가 비어 있으면 관리자 화면에 "무엇이 빠졌는지"가 경고 문장으로만 남는다. 0.3에서는 `extraction.status`·issue로 보내 주면 과목 단위로 보여 줄 수 있다.
2. 0.2 계약 표(§39-2)는 Envelope 상태를 3종만 받는다. 실제 분석기는 `NO_ASSESSMENTS_EXTRACTED`를 보내 관리자는 "분석기 응답 오류"만 보게 된다 — 계약 차이.
3. 과목 단위 `sources`가 빈 문서가 있다(B). 0.2 검증은 통과하지만 관리자 화면의 과목 근거 쪽 이동이 안 된다.
