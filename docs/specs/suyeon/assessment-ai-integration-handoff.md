# Assessment AI 분석기 연동 인계서 (계정 A → 계정 B)

> 작성: 2026-11-09 · 상태: **DRAFT / PROPOSED**  
> 대상: `C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis`(v20 기반 교육과정 분석기) 개발 담당(계정 B)  
> 목적: 분석기 결과를 LearnersHigh Assessment Backend로 넘기는 **변환기**를 계정 B 프로젝트에서 독립적으로 구현할 수 있게, 실제 구현된 수신 경계를 설명한다.

이 문서는 Assessment 소유 문서다. `docs/api/api-contract.md`(Shared)에는 아직 반영하지 않았다. 아래 수신 Endpoint는 **승인 전 제안**이며, 기본 설정에서는 꺼져 있다.

---

## 1. 한눈에 보기

```text
[계정 B] PDF → 분석기(v20) → 변환기(계정 B가 구현) → AnalysisImportRequest JSON
                                                        │
                                                        ▼  POST .../analysis-imports  (PROPOSED, 기본 off)
[계정 A] 검증(문서 SHA-256·쪽·Key·근거) → 후보(AnalysisRun)로 저장 → 관리자 화면에서 원문 대조
                                                        │
                                                        ▼  PUT .../review (사람이 호출할 때만)
                                              관리자 확정값(ConfirmedValue) → 학생 공개·수행평가 참조
```

- 분석 결과는 **후보(Candidate)**다. 수신만으로는 검토 상태(`UNREVIEWED`)가 바뀌지 않고, 관리자 승인 기록도 생기지 않는다.
- 학생은 AI 후보를 보지 못한다. 학생에게는 문서 목록과 관리자가 확정한 Revision만 연결된다.
- 원문에 없는 값은 `null`로 보낸다. 서버는 값을 `0`으로 바꾸거나 비율 합계를 보정하지 않는다(합계 불일치는 경고만 남긴다).

---

## 2. 실제 구현된 Backend API (2026-11-09 기준)

| Method | Path | 상태 | 비고 |
|---|---|---|---|
| POST | `/api/admin/assessment/evaluation-plans` (multipart) | 구현 (§38) | PDF 등록 → `planId`, `documentRevisionId` 반환 |
| POST | `/api/admin/assessment/evaluation-plans/{planId}/revisions` (multipart) | 구현 (§38) | 개정본 추가 |
| GET | `/api/admin/assessment/evaluation-plans?schoolId=` | 구현 (§38) | 문서 + Revision 목록 |
| GET | `/api/admin/assessment/evaluation-plans/{planId}` | 구현 (§38) | |
| GET | `/api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/analysis` | 구현 (§39) | 최신 후보 + 확정값 |
| PUT | `/api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/review` | 구현 (§39) | 사람의 확정 |
| **POST** | **`/api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/analysis-imports`** | **PROPOSED, 기본 off** | **계정 B 결과 수신** |
| POST | `.../revisions/{revisionId}/analysis` (§39 서버 분석 실행) | **미구현** | 원본 파일 보관(File Storage) 미결 |

인증(개발용 Mock): 모든 관리자 요청에 `X-Assessment-Admin-Id: adm_plan_operator` Header를 보낸다. 이 Mock 관리자만 `school_001`의 평가계획서 운영 권한이 있다(OD-A08 미결이라 다른 관리자에게는 권한을 주지 않음). 실제 인증이 정해지면 Header 방식은 바뀐다.

---

## 3. 수신 Request — `AnalysisImportRequest`

`Content-Type: application/json` (UTF-8). **알 수 없는 필드는 400으로 거절**한다(분석기 내부 값이 공식 데이터에 섞이지 않게).

```json
{
  "analyzer": { "name": "curriculum-analysis", "version": "v20" },
  "source":   { "sha256": "<등록한 PDF 바이트의 SHA-256 소문자 hex 64자>", "pageCount": 12 },
  "status": "REVIEW_REQUIRED",
  "failureReason": null,
  "subjects": [
    {
      "subjectName": "통합과학2",
      "pageRange": { "from": 9, "to": 11 },
      "writtenEvaluation": {
        "weightPercent": 60,
        "sources": [{ "pdfPageNumber": 9, "printedPageLabel": "7", "extractedText": "지필평가 60%" }],
        "exams": [
          { "itemKey": "written_01", "round": 1, "weightPercent": 30, "maxScore": 100, "timing": "1차 지필",
            "questionTypes": ["선택형", "서술형"], "sources": [{ "pdfPageNumber": 9 }] }
        ]
      },
      "performanceEvaluation": {
        "weightPercent": 40,
        "sources": [{ "pdfPageNumber": 10 }],
        "items": [
          { "itemKey": "performance_01", "label": "탐구 보고서", "area": "과학 탐구", "timing": "10월",
            "weightPercent": 25, "maxScore": null, "content": "지역 하천 수질 조사 보고서 작성",
            "submissions": ["보고서"], "conditions": ["모둠별 수행"],
            "rubric": [ { "element": "탐구 설계",
                          "levels": [ { "description": "변인 통제가 명확함", "score": 10 } ],
                          "sources": [{ "pdfPageNumber": 11 }] } ],
            "sources": [{ "pdfPageNumber": 10, "printedPageLabel": "8", "extractedText": "탐구 보고서 25%" }] }
        ]
      },
      "sources": [{ "pdfPageNumber": 9 }]
    }
  ],
  "warnings": ["11쪽 표 일부 판독 불가"]
}
```

위 수치는 **형식 예시**이며 실제 학교 기록이 아니다.

### 3-1. 필드 표

| 경로 | 필수 | 타입·제약 | 의미 |
|---|---|---|---|
| `analyzer.name` / `.version` | 필수 | 문자열 ≤100 / ≤50 | 출처 표시. 저장됨 |
| `source.sha256` | 필수 | `[0-9a-f]{64}` | **등록된 Revision 파일과 같아야 함** (다르면 `document_mismatch`) |
| `source.pageCount` | 필수 | 정수 ≥1 | Revision 쪽수와 같아야 함 (`page_count_mismatch`) |
| `status` | 필수 | `REVIEW_REQUIRED` \| `FAILED` | 그 밖의 값(예: `CONFIRMED`)은 400. 자동 확정 불가 |
| `failureReason` | `FAILED`면 필수 | ≤500 | 실패 사유 |
| `subjects[]` | 필수(배열) | ≤40개. `REVIEW_REQUIRED`면 1개 이상, `FAILED`면 빈 배열 | |
| `subjects[].subjectName` | 필수 | ≤100, 문서 안에서 중복 금지 | 문서에 적힌 과목명 그대로 |
| `subjects[].pageRange` | 선택 | `from ≤ to ≤ pageCount` | 과목 구간. 있으면 그 과목의 모든 `pdfPageNumber`가 이 구간 안이어야 함 |
| `writtenEvaluation.weightPercent` | 선택 | 0~100 또는 null | 지필 반영비율 |
| `writtenEvaluation.exams[].itemKey` | 필수 | ≤100, **과목 안에서 지필·수행 통틀어 유일** | 평가 식별자 |
| `writtenEvaluation.exams[].round` | 필수 | 정수 ≥1, 과목 안에서 중복 금지 | 차수 |
| `exams[].weightPercent` / `maxScore` | 선택 | 0~100 / >0, 또는 null | |
| `exams[].timing` / `questionTypes[]` | 선택 | ≤100 / 각 ≤50 | |
| `performanceEvaluation.weightPercent` | 선택 | 0~100 또는 null | 수행 반영비율 |
| `performanceEvaluation.items[].itemKey` | 필수 | 위와 같음 | 학생 `evaluationItemRef.itemKey`가 가리키는 값 |
| `items[].label` | 필수 | ≤200 | 평가명 |
| `items[].area` / `timing` | 선택 | ≤100 | 영역 / 시기 |
| `items[].weightPercent` / `maxScore` | 선택 | 0~100 / >0, 또는 null | 반영비율 / 만점 |
| `items[].content` | 선택 | ≤4000 | 수행 활동 내용 |
| `items[].submissions[]` / `conditions[]` | 선택 | 각 ≤300 | 제출물 / 수행 조건 |
| `items[].rubric[].element` | 필수(있을 때) | ≤300 | 평가요소 |
| `items[].rubric[].levels[]` | 선택 | `description` 필수 ≤1000, `score` ≥0 또는 null | 수준별 기준 |
| `*.sources[]` (Locator) | 조건부 | 아래 §4 | 원문 근거 |
| `warnings[]` | 선택 | ≤100개, 각 ≤500 | 분석기 경고. `source=ANALYZER`로 저장 |

> 성취수준(`achievement`)·교수학습계획(`teachingPlan`)은 이번 수신 범위에 넣지 않았다(보내면 `unknown_field`로 거절). 필요하면 계약 개정 후 추가한다.

### 3-2. 보내면 안 되는 것

```text
confidence / score / model 내부 지표 / unresolvedReason 같은 분석기 내부 필드
reviewStatus / confirmed / approvedBy 같은 사람 검토 필드
원문에 없는 값을 0 / "" 로 채운 값 (null로 보낸다)
합계를 맞추려고 조정한 비율
```

---

## 4. 원문 Locator 처리

```json
{ "pdfPageNumber": 10, "printedPageLabel": "8", "extractedText": "탐구 보고서 25%" }
```

- `pdfPageNumber`: PDF **물리 쪽, 1부터**(필수). `source.pageCount` 이하, `pageRange`가 있으면 그 안.
- `printedPageLabel`: 문서에 인쇄된 쪽 번호(선택, ≤20). 2-up 문서는 `"7-8"`처럼 보내도 된다.
- `extractedText`: 근거 인용(선택, ≤2000).
- **숫자(비율·만점)를 보냈으면 같은 객체에 `sources`가 1개 이상 있어야 한다**(없으면 `evidence_required`). 루브릭 점수는 기준 자체 또는 그 항목의 `sources` 중 하나가 있으면 된다.
- 서버는 PDF 바이트를 보관하지 않으므로(§7) 인용 문장이 실제 그 쪽에 있는지는 **아직 서버에서 대조하지 않는다**. 쪽 범위만 검사한다.

---

## 5. 응답과 오류

| 결과 | HTTP | Body |
|---|---|---|
| 처음 수신 | 201 | `PlanAnalysisResponse` (§5-1) |
| 같은 Revision에 같은 내용 재전송 | 200 | 기존 결과(새 Run을 만들지 않음) |
| 형식·업무 검증 실패 | 400 `VALIDATION_ERROR` | `details.fields[] = {field, reason}` — 아무것도 저장하지 않음 |
| 인증 Header 없음 | 401 `UNAUTHORIZED` | |
| 권한 밖 학교 / 없는 plan·revision | 404 `NOT_FOUND` | |
| 기능 꺼짐(`enabled=false`) | 404 `NOT_FOUND` | |

`reason` 값: `required`, `size`, `format`, `range`, `unknown_field`, `invalid`(타입 불일치), `document_mismatch`, `page_count_mismatch`, `out_of_range`, `duplicate`, `evidence_required`, `must_be_empty_when_failed`.

"같은 내용"의 기준: 서버가 Request를 다시 직렬화한 JSON의 SHA-256. 내용이 하나라도 다르면 새 AnalysisRun이 생기고, 이전 Run은 보존된다(최신 Run이 화면에 보임).

### 5-1. `PlanAnalysisResponse`

```json
{
  "planId": "plan_…", "documentRevisionId": "plan_rev_…", "analysisId": "analysis_…",
  "analysisStatus": "REVIEW_REQUIRED", "reviewStatus": "UNREVIEWED",
  "analyzer": { "origin": "EXTERNAL_IMPORT", "name": "curriculum-analysis", "version": "v20" },
  "receivedAt": "2026-11-09T21:41:10.707267+09:00",
  "subjects": [ /* 보낸 subjects 그대로 */ ],
  "warnings": [ { "source": "ANALYZER", "message": "…" },
                { "source": "SERVER", "message": "통합과학2: 수행 항목 비율 합계(25)가 수행 반영비율(40)과 다릅니다. 원문 값을 그대로 두었습니다." } ],
  "confirmedFields": [], "review": null
}
```

서버 경고(`SERVER`): 지필+수행 ≠ 100, 지필 차수 합 ≠ 지필 비율, 수행 항목 합 ≠ 수행 비율. **값은 바꾸지 않는다.**

---

## 6. 검토 상태 처리

```text
분석 상태(analysisStatus)  NOT_REQUESTED → REVIEW_REQUIRED | FAILED   (수신으로만 바뀜)
검토 상태(reviewStatus)    UNREVIEWED → CONFIRMED                     (PUT .../review 로만 바뀜)
```

- 분석기의 "확신"과 관계없이 수신 결과는 항상 `REVIEW_REQUIRED`(또는 `FAILED`)다.
- `PUT .../review` 요청: `{ analysisId, decision: "CONFIRM", reviewedSubjects: [{ subjectId, confirmedFields: [{ fieldPath, value, pdfPageNumber }] }] }`
  - `fieldPath`는 `writtenEvaluation|performanceEvaluation|achievement|teachingPlan`로 시작하는 경로만 허용(예: `performanceEvaluation.items[0].weightPercent`).
  - 값을 확정하면 `pdfPageNumber`가 필요하다. `value: null`은 "원문에 없음"으로 확정한다는 뜻이다.
  - `FAILED` 결과나 다른 Revision의 `analysisId`로는 확정할 수 없다.
- 학생 수행평가가 평가계획서 항목을 참조하려면(`evaluationItemRef`) 그 Revision이 `CONFIRMED`여야 한다.

---

## 7. DB 저장 가능 여부

| 데이터 | 저장 | 위치 |
|---|---|---|
| 문서 슬롯·Revision 메타(파일명·크기·SHA-256·쪽수·출처 URL) | 예 | `assessment_evaluation_plan`, `assessment_plan_revision` |
| PDF 원본 바이트 | **아니오** | File Storage 미결(API-OD-A03). `fileRef`는 `null` |
| 분석 결과(후보)·경고 | 예(불변) | `assessment_plan_analysis_run.result_json / warnings_json` |
| 관리자 검토·확정값 | 예(불변) | `assessment_plan_review`, `assessment_plan_confirmed_value` |
| 학생 개인 PDF·개인 정정 | **아니오** | §10-2·§11 미구현(OD-A13) |

원본 바이트를 보관하지 않으므로 **서버가 직접 분석을 실행하는 §39 POST는 아직 없다**. 지금은 계정 B가 같은 PDF로 분석하고 SHA-256으로 문서 동일성을 맞추는 구조다.

---

## 8. 로컬 연동 실행

```powershell
# 1) MySQL (로컬 3306을 다른 MySQL이 쓰면 포트를 바꾼다)
$env:MYSQL_PORT = "3307"; docker compose up -d

# 2) Backend (수신 Endpoint 켜기). 기존 로컬 DB에 구형 mentor Migration 이력이 있으면
#    Flyway 검증이 실패하므로 빈 Schema를 쓴다 (TEST-RESULT.md §4 참고)
cd backend
$env:DB_URL = "jdbc:mysql://localhost:3307/lh_assessment_check"
$env:DB_USERNAME = "learnershigh"; $env:DB_PASSWORD = "<.env의 MYSQL_PASSWORD>"
$env:ASSESSMENT_ANALYSIS_IMPORT_ENABLED = "true"
.\gradlew.bat bootRun --args="--server.port=18080"
```

```bash
# 3) PDF 등록 → planId / documentRevisionId 받기
curl -s -X POST http://localhost:18080/api/admin/assessment/evaluation-plans \
  -H "X-Assessment-Admin-Id: adm_plan_operator" \
  -F "file=@plan.pdf;type=application/pdf" -F schoolId=school_001 \
  -F academicYear=2026 -F grade=1 -F semester=2

# 4) 변환기 출력 보내기 (Windows에서는 한글 깨짐 방지를 위해 UTF-8 파일로 보낸다)
curl -s -X POST "http://localhost:18080/api/admin/assessment/evaluation-plans/<planId>/revisions/<revisionId>/analysis-imports" \
  -H "X-Assessment-Admin-Id: adm_plan_operator" -H "Content-Type: application/json; charset=utf-8" \
  --data-binary @import.json

# 5) 결과 확인
curl -s "http://localhost:18080/api/admin/assessment/evaluation-plans/<planId>/revisions/<revisionId>/analysis" \
  -H "X-Assessment-Admin-Id: adm_plan_operator"
```

수신 검증 로직의 Test: `backend/src/test/java/.../assessment/controller/EvaluationPlanApiTest.java`(합성 Fixture), `.../service/plan/AnalysisImportValidatorTest.java`.

---

## 9. 계정 B가 확인해야 할 미해결 사항

| # | 질문 | 영향 |
|---|---|---|
| B-1 | v20 출력의 과목·평가 단위를 위 `subjects[] / exams[] / items[]`로 1:1 변환할 수 있는가? 한 PDF 다과목·과목별 PDF 모두 처리되는가? | 변환기 설계 |
| B-2 | `itemKey`를 **같은 PDF를 다시 분석해도 같은 값**이 나오게 만들 수 있는가? (학생 수행평가가 이 Key를 참조) | 재분석 시 학생 참조 유지 |
| B-3 | 값마다 PDF 물리 쪽(1-based)을 낼 수 있는가? 인쇄 쪽은 선택 | `evidence_required` 거절 여부 |
| B-4 | 판독 불가 값을 `null` + `warnings`로 낼 수 있는가? (현재 스키마에는 "원문에 없음 / 판독 불가"를 값 단위로 구분하는 필드가 없다) | 계약 보완 후보(§10) |
| B-5 | 성취수준·교수학습계획을 함께 넘길 필요가 있는가? | 수신 범위 확대 |
| B-6 | 분석에 쓴 PDF가 관리자가 등록한 파일과 **바이트 단위로 같은가**? (SHA-256 비교) | `document_mismatch` |

---

## 10. 계정 A 쪽 남은 작업 (계약·승인 대기)

- 수신 Endpoint를 `api-contract.md`에 등록할지 결정(Shared 승인). §11·§39·§47-A 분석 결과 Schema 통합(P-35)과 함께 정리 필요.
- 값 단위 presence(`원본에 있음 / 없음 / 판독 불가`) 표현 추가 여부(domain.md §9-1).
- 원본 PDF 보관(File Storage) 결정 후: 서버가 인용 문장을 원문과 대조, §39 POST 서버 분석 실행.
- 실제 관리자 인증·평가계획서 운영 권한 범위(OD-A08) 확정 후 Mock Header 교체.
