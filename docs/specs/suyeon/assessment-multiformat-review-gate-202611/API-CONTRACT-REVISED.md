# API 계약 보완안 — M-1~M-7 최종 후보 (승인 요청용, 2026-11-10)

> **승인 전 초안이다.** Shared `docs/api/api-contract.md`는 수정하지 않았다(SHA-256 `052128cf…` 작업 시작과 같음). 이 문서의 오류 사유 코드는 모두 **제안**이며, 승인 전에는 정식 API에 없다.
> 이전 제안: `../assessment-multiformat-review-next/API-CONTRACT-PROPOSAL.md`. 이 문서는 그 위에 M-4(review 근거)와 null 정책만 고친다.

## 1. 바뀌지 않는 것 (M-1·M-2·M-3·M-5·M-6·M-7, M-8 제외)

| # | 내용 (이전 제안 그대로) |
|---|---|
| M-1 | 등록 형식 PDF·HWP·HWPX, 실제 바이트로 판별, 거절은 415 `UNSUPPORTED_FILE_TYPE` + 사유 |
| M-2 | Admin Revision 응답 `documentFormat`·`checksum`, HWP·HWPX `pageCount=null` |
| M-3 | 수신: `source.format`(생략=PDF), `Locator.documentLocator`(HWP·HWPX 필수, PDF 금지), PDF `pageCount`·`pdfPageNumber` 필수, HWP·HWPX `pageCount`·`pageRange`·`pdfPageNumber`·`printedPageLabel` 금지, kind 접두어 = 형식 |
| M-5 | 학생 응답에는 확정값만. 미확정 후보·근거 위치(`documentLocator`) 미노출 |
| M-6 | `path` 문법 `[A-Za-z0-9.]+` ≤ 200, `*_TABLE_CELL`은 path 마지막 `r<row>c<col>` = row·col(`path_mismatch`). 중첩 표는 마지막 표 칸 기준 |
| M-7 | 필드 이름 `source.format`·`documentLocator`·`documentFormat`·`checksum`·`pdfPageNumber` 유지 |
| M-8 | `sectionCount`·`sourceRange` **제외**(새 필드가 필요하다는 증거 없음) |
| 공통 | 원본 SHA-256 일치, 실험 Flag 기본 OFF, PDF Payload 저장·재전송 해시 동일(`49d2c72f…253b`, 2026-11-10 재확인) |

## 2. 이전 M-4 초안의 문제 (실제 코드와 대조)

| 문제 | 근거 |
|---|---|
| ① 서버가 **검토 과목이 분석 결과의 어느 과목인지 모른다** | 현행 `PlanReviewRequest.ReviewedSubject`는 학업 과목 ID(`subjectId`)만 있다. 분석 결과는 `subjects[i]` 배열이고 `fieldPath`는 과목 아래 경로다(`performanceEvaluation.items[0]…`). → 과목 A 필드에 과목 B 근거를 붙여도 판별 불가 |
| ② "분석 Run에 있는 Locator인가"만으로는 **다른 평가 항목의 근거**를 막지 못한다 | P01 값에 P02 채점표 칸을 붙여도 둘 다 같은 Run 안에 있다 |
| ③ 분석 JSON에는 **필드별 근거가 없다** | `sources`는 노드(영역·지필 시험·평가 항목·채점 요소)마다만 있다(`AnalysisImportRequest`). 같은 항목의 평가명·반영비율·만점은 같은 근거 목록을 공유한다 |
| ④ 영역 노드 근거가 자주 비어 있다 | 계정 B 실험 출력: 영역 노드 15개 중 13개가 구조 Locator 없음(항목·시험·채점 요소는 모두 있음) |
| ⑤ 값 `null`을 근거 없이 확정할 수 있었다 | 이전 초안은 PDF 규칙(값 null이면 근거 생략)을 그대로 따랐다 |

## 3. M-4 보완: 근거 관계와 검증

### 3-1. 연결 관계

```text
Revision ─(analysisId가 이 Revision의 Run인지: 현행)─▶ AnalysisRun
   └ reviewedSubjects[s].analysisSubjectIndex ─▶ Run.subjects[i]          (신규 필드)
        └ reviewedSubjects[s].subjectId ─▶ 문서 슬롯의 학업 과목             (현행 검증)
        └ confirmedFields[f].fieldPath ─▶ subjects[i] 아래 실제 노드·속성     (신규: 존재 검사)
             └ 근거 노드 = 경로에서 가장 가까운 sources 보유 노드
                  └ confirmedFields[f].documentLocator ∈ 그 노드의 sources  (신규)
```

### 3-2. 근거 노드 규칙 (`ReviewEvidenceScope`, 준비 코드·단위 테스트 9개)

| fieldPath | 근거 노드 |
|---|---|
| `writtenEvaluation.weightPercent` | `writtenEvaluation.sources` |
| `writtenEvaluation.exams[i].{itemKey,round,weightPercent,maxScore,timing,questionTypes[k]}` | `exams[i].sources` |
| `performanceEvaluation.weightPercent` | `performanceEvaluation.sources` |
| `performanceEvaluation.items[i].{itemKey,label,area,timing,weightPercent,maxScore,content,submissions[k],conditions[k]}` | `items[i].sources` |
| `performanceEvaluation.items[i].rubric[j].{element, levels[k].description, levels[k].score}` | `items[i].rubric[j].sources` |
| `achievement.*`, `teachingPlan.*` | 분석 결과에 없음 → **HWP·HWPX 확정 차단** |
| 노드 자체(`items[0]`), 없는 속성·색인 | 거절 |

- 상위 노드로 넘어가지 않는다. 항목 값에 영역 표 전체 근거, 항목 값에 채점 요소 근거, 채점 요소에 항목 근거를 쓰지 못한다.
- **한계(기록):** 같은 항목 안의 평가명·반영비율·만점은 근거를 구분하지 못한다. 분석 JSON이 구분하지 않기 때문이다. 필드 단위로 구분하려면 분석 결과에 필드별 근거 참조가 필요하며, 이는 계정 B 계약 변경이다(이번 범위 밖, `NEXT-STEPS.md`). 이 한계를 이유로 검증을 완화하지 않는다.
- 근거 노드에 구조 Locator가 없으면 확정하지 않는다. 계정 B 출력에서는 영역 반영비율이 대부분 여기에 해당한다.
- **색인 정규형(2차):** `ReviewEvidenceScope`는 `[0]`·`[1]`…만 받고 `[01]`·`[00]`은 `FIELD_UNKNOWN`으로 거절한다(단위 테스트 `nonCanonicalIndexIsRejected`). 현행 PDF `FIELD_PATH`(`\[\d{1,3}]`)도 같은 허점이 있으나 PDF 동작은 이번에 바꾸지 않는다(결정 필요, `SHARED-APPROVAL-STATUS.md`).
- Locator 비교는 `kind·section·path·table·row·col·rowSpan·colSpan·control·cell` 전체 일치다(병합 정보가 다르면 다른 Locator).
- Locator는 그 Run 안에서만 의미가 있다. 다른 Revision에서 좌표까지 같은 Locator는 값으로 구분되지 않으므로 "이 Run의 이 노드 근거"로 판정한다. 다른 Run의 근거 *목록*을 쓰지 않으므로 이 Run에 없는 Locator는 거절된다.

### 3-3. 요청 (HWP·HWPX)

```json
{ "analysisId": "analysis_…", "decision": "CONFIRM",
  "sourceCheck": { "method": "LOCAL_FILE_EXTERNAL_VIEWER", "localFileSha256": "<64 소문자 hex>",
                   "manualComparisonConfirmed": true },
  "reviewedSubjects": [{ "subjectId": "subj_14", "analysisSubjectIndex": 0, "confirmedFields": [
    { "fieldPath": "performanceEvaluation.items[0].weightPercent", "value": 30,
      "documentLocator": {"kind": "HWP_TABLE_CELL", "section": 0, "path": "p3.c0.r5c3", "table": 1, "row": 5, "col": 3, "rowSpan": 1, "colSpan": 1} },
    { "fieldPath": "performanceEvaluation.items[0].maxScore", "value": null, "absence": "NOT_IN_SOURCE",
      "documentLocator": {"kind": "HWP_TABLE_CELL", "section": 0, "path": "p3.c0.r5c3", "table": 1, "row": 5, "col": 3, "rowSpan": 1, "colSpan": 1} } ] }] }
```

PDF 요청은 현행 그대로다. PDF에서 `analysisSubjectIndex`·`documentLocator`·`absence`·`sourceCheck`는 `not_allowed`(PDF 범위 확장은 별도 결정).

### 3-4. 검증 규칙 (모두 400 `VALIDATION_ERROR`, 위반을 모두 모아 반환, 부분 저장 없음 — 현행 방식)

| 검사 | field | reason | 상태 |
|---|---|---|---|
| analysisId가 이 Revision의 Run이 아님 / FAILED | `analysisId` | `unknown` / `analysis_failed` | 현행 |
| sourceCheck 없음 | `sourceCheck` | `required` | 제안 |
| method ≠ `LOCAL_FILE_EXTERNAL_VIEWER` / SHA 64 소문자 hex 아님 | `sourceCheck.method` / `.localFileSha256` | `not_allowed` / `format` | 제안 |
| SHA ≠ Revision `checksum` | `sourceCheck.localFileSha256` | `document_mismatch` | 제안 |
| `manualComparisonConfirmed` ≠ true | `sourceCheck.manualComparisonConfirmed` | `required` | 제안 |
| analysisSubjectIndex 없음 / 범위 밖 / 두 과목이 같은 번호 | `reviewedSubjects[s].analysisSubjectIndex` | `required` / `unknown` / `duplicate` | 제안 |
| 학업 과목 ID가 슬롯에 없음 | `reviewedSubjects[s].subjectId` | `unknown` | 현행 |
| fieldPath 문법(화이트리스트) | `…fieldPath` | `not_allowed` | 현행 |
| fieldPath 색인이 정규형이 아님(`[01]`·`[00]`) | `…fieldPath` | `unknown` | **제안(2차)** — `[01]`과 `[1]`이 같은 필드로 풀리면 문자열 기준 `duplicate`를 우회해 한 필드에 확정값이 둘 생긴다. 색인 문법 `0\|[1-9]\d{0,2}` |
| fieldPath가 분석 과목에 없는 노드·속성·색인 | `…fieldPath` | `unknown` | 제안 |
| 분석 결과 밖 영역 / 근거 노드에 구조 Locator 없음 | `…fieldPath` | `evidence_scope_unavailable` | **신규 코드 제안** |
| 같은 과목에서 같은 fieldPath 두 번 | `…fieldPath` | `duplicate` | 제안 |
| documentLocator 없음 | `…documentLocator` | `required` | 제안 |
| documentLocator가 근거 노드 sources에 없음(다른 항목·과목·Run·Revision·존재하지 않음) | `…documentLocator` | `evidence_not_in_analysis` | 제안(이전 초안 코드 재사용) |
| documentLocator kind·path 규칙 | 해당 경로 | `format_mismatch`·`path_mismatch`·`format` | M-3·M-6과 같음 |
| pdfPageNumber 있음 | `…pdfPageNumber` | `not_allowed` | 제안 |
| value null인데 absence 없음 / value 있는데 absence 있음 / absence 값 오류 | `…absence` | `required` / `not_allowed` / `format` | 제안 |
| 권한(평가계획서 운영 관리자) | — | 403 | 현행 |

### 3-5. 응답

`confirmedFields[]` = 현행 `{subjectId, fieldPath, value, pdfPageNumber}` + HWP·HWPX일 때만 `analysisSubjectIndex`, `documentLocator`(NON_NULL). PDF 응답은 바뀌지 않는다. 학생 응답에는 넣지 않는다.

## 4. null 확정값 정책

| 상황 | HWP·HWPX 처리 |
|---|---|
| ① 원문에 값이 명시적으로 없음 | 관리자가 근거 노드 칸을 확인한 뒤 `value: null` + `absence: "NOT_IN_SOURCE"` + 확인한 위치의 `documentLocator`로만 확정 |
| ② AI가 값을 추출하지 못함 | 그 이유만으로 null을 확정하지 않는다. 관리자가 원문에서 값을 찾으면 값+근거로 확정, 아니면 ①을 직접 확인해야 함 |
| ③ 원문을 읽을 수 없음 | 확정하지 않는다(요청에 넣지 않음 = 미확정 유지) |
| ④ 정보가 서로 충돌 | 확정하지 않는다. 처리 정책은 결정 필요(`NEXT-STEPS.md`) |
| ⑤ 관리자가 확인 없이 비워 둠 | 확정값이 아니다(요청에 넣지 않음) |

- `absence` 값은 `NOT_IN_SOURCE` 하나다. ③·④는 "확정하지 않음"이라 저장 상태가 필요 없다.
- 저장: `value_json NULL` + 근거 Locator = 원문 부재 확인(기존 DDL 주석의 "null = 원문에 없음"과 같은 뜻). **새 상태 Column이 필요 없다.**
- PDF 호환: PDF는 현행(값 null이면 쪽 번호 생략 가능)을 바꾸지 않는다. 두 형식의 차이는 기록하고, PDF를 맞출지는 별도 결정이다.

## 5. 확정값 수정 감사

| 정보 | 복원 경로 | 추가 저장 |
|---|---|---|
| 원래 분석 후보값 | `review.analysis_id` → `run.result_json` → `subjects[analysis_subject_index]` → fieldPath | **`analysis_subject_index`가 없으면 복원 불가**(학업 과목 ID ↔ 분석 과목 대응이 저장되지 않음) → D-1에 추가 |
| 최종 확정값 | `confirmed_value.value_json` | 없음 |
| fieldPath | `confirmed_value.field_path` | 없음 |
| analysisId | `review.analysis_id` | 없음 |
| 선택한 근거 | `confirmed_value.evidence_locator_json`(D-1). 원문 인용은 Run의 같은 Locator에서 조회 | 위치만 |
| 검토자·시각 | `review.reviewed_by`·`reviewed_at` | 없음(실제 인증 전에는 Mock ID) |
| 후보와 달라졌는지 | 위 두 값을 비교해 계산 | 없음 |
