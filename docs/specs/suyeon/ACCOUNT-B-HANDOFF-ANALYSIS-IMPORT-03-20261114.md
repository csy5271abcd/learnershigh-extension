# 계정 A → 계정 B 인계: analysis-import 0.3 · 월별 교수·학습 운영 계획 연동 (2026-11-14, DRAFT)

> 상태: **합의 전 제안.** 계정 A Backend는 지금 backend-adapter-0.2만 받는다(`AnalysisImportContractCompatibilityTest`로 고정). 이 문서의 필드는 합의 전까지 공식 데이터로 저장하지 않는다.
> 계정 B 분석기 코드는 계정 A가 바꾸지 않는다.

## 1. 지금 Backend가 받는 것 (0.2)

- 분석기 Envelope `status`: `OK_REVIEW_REQUIRED` · `PARTIAL` · `PARSE_FAILED` (그 밖 저장 안 함). `PARTIAL` + payload `REVIEW_REQUIRED` → Run `PARTIAL` 저장. `PARTIAL` + payload `FAILED` → 모순(502).
- `backendImport.payload`: `analyzer{name,version}` · `source{sha256,pageCount}` · `status: REVIEW_REQUIRED|FAILED` · `failureReason` · `subjects[]{subjectName, pageRange, writtenEvaluation, performanceEvaluation{items[]{itemKey,label,area,timing,weightPercent,maxScore,content,submissions,conditions,rubric[]{element,levels[]{description,score},sources},sources}}, sources}` · `warnings[]`.
- Envelope `errors[].code`는 관리자 화면에 문장으로 바꿔 보여 준다(`ANALYZER_ERROR` 경고로 보존).
- **알 수 없는 필드는 거절한다**(조용히 버리지 않음). 지금 `contractVersion`·`subjects[].teachingPlan`·`subjects[].extraction`·payload `status: PARTIAL`을 보내면 저장되지 않는다.

## 2. 0.3에서 합의할 것 (계정 A 제안)

| 필드 | 제안 | 비고 |
|---|---|---|
| `contractVersion` | payload 최상위 `"0.3"`. 없으면 0.2로 해석 | Backend는 버전별 허용 필드 집합으로 Parser를 나눈다 |
| `status` | payload는 `REVIEW_REQUIRED|FAILED` 유지, 부분 결과는 **Envelope `PARTIAL`로만** | 둘 다 PARTIAL을 갖지 않게(이중 정의 방지) |
| `subjects[].extraction` | `{ status: COMPLETE|PARTIAL|MISSING_SECTION, issues:[{ code, severity: INFO|WARNING|ERROR, fieldPath, message, sources[] }] }` | 계정 B `extensions`의 `detailCause`·`nameQuality`·`linkConfidence`는 `issues[].code`로 흡수 제안 |
| field presence | `fieldPresence: { "<fieldPath>": PRESENT|NOT_IN_SOURCE|EXTRACTION_FAILED|NEEDS_REVIEW }` (과목·운영 계획 행 단위) | `null` 값과 함께: NOT_IN_SOURCE(원문에 없음) ≠ EXTRACTION_FAILED(못 읽음). 신뢰도 숫자는 넣지 않음 |
| `subjects[].teachingPlan[]` | §3 | 수행평가(`performanceEvaluation`)와 **별도 배열**. 공식 수행평가 항목을 새로 만들지 않음 |
| Locator | PDF `pdfPageNumber`(1-based)·`printedPageLabel`·`extractedText`, HWP/HWPX `documentLocator{kind,section,path,table,row,col,rowSpan,colSpan,control,cell}` | HWP/HWPX를 `EXPERIMENTAL_MULTIFORMAT`에서 0.3 정식으로 |
| 분석기 버전 | `analyzer{name, version, profile}` + Envelope `requestId`·`elapsedMs` | requestId 저장은 Migration 필요(후속) |

## 3. `teachingPlan[]` 행 (Monthly Planner가 쓰는 원본 정보)

```jsonc
{
  "rowKey": "tp_03",                        // 과목 안에서 안정된 키
  "period": {
    "precision": "WEEK_ONLY",               // EXACT_DATE | DATE_RANGE | WEEK_ONLY | MONTH_ONLY | UNKNOWN (필수)
    "month": 9, "monthTo": null,            // 원문에 있을 때만
    "weekFrom": 2, "weekTo": 2,             // 원문의 학교 주차 번호 그대로 (ISO 주 환산 금지)
    "dateFrom": null, "dateTo": null,       // YYYY-MM-DD, 원문에 날짜가 적힌 경우만 (연도 추측 금지)
    "asWritten": "9월 2주"                  // 원문 표기 그대로 (필수)
  },
  "unit": "…", "content": "…",
  "achievementStandards": [{ "code": "[10통과2-01-01]", "text": "…" }],
  "inquiryProcess": "…", "teachingMethods": ["…"], "assessmentMethods": ["…"],
  "linkageFocus": "…", "specialSchedule": "1차 지필평가",
  "assessmentMentions": ["P01"],            // 원문이 명시한 수행평가 itemKey만 (추측 연결 금지)
  "fieldPresence": { "inquiryProcess": "NOT_IN_SOURCE" },
  "sources": [{ "pdfPageNumber": 4, "printedPageLabel": "3", "extractedText": "9월 2주 …" }]
}
```

손실 금지 항목(Adapter가 버리면 Planner가 틀림): `precision`·`asWritten`·주차 번호·원문 Locator·`fieldPresence`·`assessmentMentions`.

## 4. 계정 A Adapter 설계 (합의 후 구현)

1. Parser: `contractVersion` 없음 → 0.2 DTO, `"0.3"` → 0.3 DTO(새 필드 선택). 알 수 없는 필드 거절은 유지.
2. 저장: 후보는 지금처럼 Run `result_json`에 그대로. 운영 계획 확정 저장 방식(확정값 테이블 재사용 vs 행 테이블)은 별도 결정.
3. 화면 변환: `teachingPlan[i]` → `TeachingPlanEntry`(`frontend/student/.../teaching-plan/teachingPlanPlacement.ts`)

| 0.3 | TeachingPlanEntry |
|---|---|
| `rowKey` | `rowKey` |
| 상위 `subjectName` | `subjectName` |
| `period.precision/month/weekFrom/weekTo/dateFrom/dateTo/asWritten` | 같은 이름 |
| `unit`·`content` | 같은 이름 |
| `achievementStandards[].code + text` | `achievementStandards[]` (문장) |
| `teachingMethods`·`assessmentMethods` | 같은 이름 |
| `assessmentMentions` → 같은 과목 `performanceEvaluation.items[].label` | `linkedAssessments[]` |
| `specialSchedule` | `specialSchedule` |
| `sources[0].pdfPageNumber` | `sourcePdfPageNumber` |
| `fieldPresence`의 EXTRACTION_FAILED·NEEDS_REVIEW 키 | `missingFields[]` |
| (확정 여부) | `status` CANDIDATE / CONFIRMED |

4. 시험: 계정 B가 **처음 보는 학교 양식** 문서로 만든 0.3 결과 3건 이상(정밀도 5종 포함)을 Fixture로 받아 Parser·Adapter·Planner 배치를 검증한다.

## 5. 계정 B에 요청

1. 위 §2·§3 필드 이름·의미 확인 또는 수정안.
2. `issues[].code` 목록과 `severity` 기준.
3. 0.3 샘플 결과(합성 또는 공개 문서, 분석기 버전 명시).
4. HWP/HWPX 0.3 정식 출력 시점.
