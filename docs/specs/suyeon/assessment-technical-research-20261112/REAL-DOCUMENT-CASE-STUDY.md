# 실제 평가계획서 분석 사례 — 원본에서 Backend Payload까지

> **실제 학교 문서**를 썼다. 원문은 옮기지 않고 키·Locator·숫자·상태만 적는다(교사명·평가명·활동 문장 비공개).
> 근거 파일(로컬 전용, 원문 포함 — 외부 반출 금지):
> - `CA/sensitive/docmodel/v4/F02532.docmodel.json`
> - `CA/sensitive/v21-pdf-quality/results/G024.{analysis,backend-import}.json`(v21.1)
> - `CA/sensitive/v21-multiformat/results/G024.experimental-{import,meta}.json`
>
> 이번 조사는 이 파일들을 **읽기만** 했다. 재분석·재전송은 하지 않았다.
> 상태: **[실제 실행됨]** 저장된 실행 결과가 있음 / **[구현상 가능]** 코드 경로는 있으나 이 문서로 실행한 적 없음

## 1. 원본 문서

| 항목 | 값 |
|---|---|
| ID | G024 / fileId `F02532` |
| 원본 폴더 | `references/curriculum-plan/general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/wanju/2025/first-grade/first-semester/` |
| 형식 | HWP 5.1.0.1(압축, 암호·배포 아님), 매직 바이트 CFB |
| 크기 | 303,104 bytes |
| SHA-256 | `a02a120199e646677b7c00d5495efeed6ece300b9a08b0202e252d4b7cd639ee` |
| 학년도·학년·학기 | 2025 · 1 · 1 (문서 머리표·제목에서 추출, 폴더 값과 일치) |
| 구조 | Section 1개, 표 42개(격자 검산 42/42 OK), 병합 셀 233개, 원문 글자 44,985자(공백 제외) |
| 문서 유형 | 교수학습·평가 통합, 과목 1개 |

지시서 기준(가능하면 PDF·HWP·HWPX 각 1건)에 대해: PDF 실문서(G001·G003·G009·G013)는 모두 `PARTIAL`, HWPX 실문서(G033)는 평가가 없는 문서라 끝까지 추적할 수 있는 항목이 없다. 그래서 **추적 대상은 HWP 1건**으로 정했다. PDF·HWPX 결과는 `DOCUMENT-REPRESENTATIVE-CASES.md` §2에 있다.

## 2. 문서 수준 결과 [실제 실행됨 — v21.1]

| 항목 | 값 |
|---|---|
| 파서 | `hwp_model` 0.1, integrity `OK`, problems 0 |
| 과목 구간 | 1개(S01), `startedBy` 머리표, `contextStatus=FROM_DOCUMENT` |
| 과목명 | 머리표 '과목' 칸 아래 칸(`F02532#s0.p1.c0.r1c2`), 제목 값과 같음(`differs=false`) |
| 평가 | 지필 W01·W02, 수행 P01·P02 |
| 검증 | Locator 141/141 · 인용 46/46 · 범위 이탈 0 · 평가 간 교차 0 |
| 문서 상태 | `OK_REVIEW_REQUIRED`, `reviewState=DRAFT_UNREVIEWED`, 사람 검토 0 |

## 3. 수행평가 P01 단계별 추적

| 단계 | 입력 데이터 | 처리 기술·함수 | 결과 | 근거 |
|---|---|---|---|---|
| 1. 형식 판정 | 파일 바이트 | `build.actual_format` | `HWP` | 첫 8바이트 CFB 시그니처 |
| 2. 컨테이너·스트림 | CFB | `hwp5.Cfb` → `read("FileHeader")`, `read("BodyText/Section0")` → `zlib.decompress(-15)` | 레코드 목록 | `hwp_model.parse_hwp` |
| 3. 문단·표 복원 | 레코드 트리 | `hwp_model._Parser.paragraph/table` | 표 42개. P01과 관련된 표 4개: 요약표 `p46.c0`(가로형), 요약 목록 `p51.c0`(세로형), 채점표 `p53.c0`, 세부 계획표 `p111.c0`(13행×10열, tableIndex 11) | DocumentModel |
| 4. 과목 구간 | blocks | `analyze.segments` | S01 = 블록 전체 | 머리표 라벨(학년·학기·과목) |
| 5. 표 역할 | 표 4개 | `assessment_assembly03.table_role` | `p46`·`p51` → 요약표, `p53`·`p111` → 채점표(RUBRIC) | 점수 열 모양 |
| 6. 평가 목록 | 요약표 | `matrix_entries`(p46) + `list_entries`(p51) → `_merge_registry` | P01 1개로 합침. `kind=PERFORMANCE`(`kindSource=HEADER_ABOVE`), `nameQuality=OK` | 이름 칸 `p46.c0.r3c6`, `p51.c0.r1c0` |
| 7. 반영비율 | 요약표 칸 | `field_of`·`parse_value` | `weight` FOUND 20 PERCENT | `p46.c0.r6c6` |
| 8. 만점 | 3곳 | 같음 | `maxScore` FOUND 20 POINT(3곳 값 같음) | `p46.c0.r5c6`, `p51.c0.r1c3`, `p111.c0.r2c8` |
| 9. 기본점수 | 요약표 칸 | 같음 | `baseScore` FOUND 7 POINT | `p46.c0.r8c6` |
| 10. 시기 | 3곳 | 같음 | `timing` **VARIANTS**(세 곳 표현이 다름, 하나를 고르지 않음) | `p46.c0.r9c6`, `p51.c0.r1c2`, `p111.c0.r2c1` |
| 11. 묶음 값 | 요약표 | `groupValues` | 수행평가 전체 40%(P01·P02를 덮는 병합 칸) | `p46.c0.r2c6` |
| 12. 채점표 연결 | 요약 이름 ↔ 채점표 | `link_evidence`·`link_confidence` | `p53`·`p111` 모두 `LINKED_BY_NAME` → `LINKED_CONFIDENT`. 근거 검사 `TOP_SCORE_VS_MAX` CONSISTENT, `PLAN_TIMING` CONSISTENT | 이름 신호 + 값 일치 |
| 13. 채점 모형 | 채점표 수준 칸 | `count_bands` | `COUNT_BANDS`(충족 개수 구간) 2개 표, 구간 6개씩: 모든 항목 20 · 5개 18 · 4개 16 · 3개 14 · 2개 12 · 1개 10 + 특수(미기재·미제출·불참) 7 | `p53.c0`, `p111.c0` |
| 14. 상세 범위 고정 | 평가 + 연결 표 | `task_detail.scope_for` | 요약표 2개의 P01 열·행 + 연결 표 2개만. 다른 평가 표 제외 | `taskDetail.scope` |
| 15. 활동·관점·조건 | 범위 표 | `task_detail.extract` | 활동 1(FOUND), 활동 유형 DISCUSSION·APPRECIATION, 채점 관점 6(작성 필수 내용 3 + 평가 질문 3), 조건 REQUIRED_CONTENT 3(STATED) | `p53.c0.r1c0`, `p111.c0.r6c2` |
| 16. 제출물 | 관점 묶음 | `deliverables_in` | 제출물 1개 **INFERRED**(원문에 '제출' 표현 없음). 관찰 체크리스트는 학생 제출물이 아니라 교사 평가 도구(`assessorInstruments`)로 분리 | `p111.c0.r6c2` |
| 17. 특수 규정 | 요약 칸·채점 구간 | `special_rule_lines`, `_checks` | 7점 규정 2곳. 요약표는 대상 2개, 채점표는 3개 → `SPECIAL_TERMS_SUMMARY_VS_RUBRIC=TERMS_DIFFER`. 기본점수 7 = 특수 점수 7 → `EQUAL`로 표시만(합치지 않음). 0개 충족 점수는 원문에 없음 → `NOT_STATED`(만들지 않음) | `p51.c0.r1c4`, `p53.c0.r7c2`, `p111.c0.r12c7` |
| 18. 검증 | 결과 + DocumentModel | `analysis_result.validate` | 이 평가의 Locator 모두 존재, 인용 일치, 범위 이탈 0 | `validation` |
| 19. 위치 지문 | 구간·평가 | `key_fingerprint` | `3f6bf75b08de9e80`(재분석 시 같은 평가인지 확인용) | – |
| 20. 공식 PDF Adapter | 결과 | `backend_adapter.to_import_request` | **`importable=false`** — `FORMAT_NOT_ACCEPTED`, `PAGE_COUNT_MISSING`(HWP에는 쪽 번호를 만들지 않음) | `G024.backend-import.json` |
| 21. 실험 Adapter | 결과 + DocumentModel | `multiformat_adapter.to_experimental` | P01 Payload: `weightPercent 20`, `maxScore 20`, `timing null`(VARIANTS라 고르지 않음), `area` 있음, `content` 70자, `submissions []`(INFERRED는 안 보냄), `conditions` 3, `rubric` 7개 요소(첫 요소에 수준 7개 [20,18,16,14,12,10,7], 나머지 6개는 채점 관점 이름), `sources` 10개 `documentLocator{kind:HWP_TABLE_CELL, section:0, path, table,row,col,rowSpan,colSpan}`. 과목 단위 `performanceEvaluation.weightPercent 40`, `writtenEvaluation.weightPercent 60` | `G024.experimental-import.json` |
| 22. 로컬 계약 검증 | Payload | `validate_experimental`(계정 A Validator 규칙 이식), `quote_check`, `locator_consistency` | 위반 0, 근거 원문 대조 69/69, 평가 처리 `SENT` 4(W01·W02·P01·P02) | `G024.experimental-meta.json` |
| 23. 계약 밖 정보(문서 전체) | 결과 | `gaps[]` | 19개 범주: SUBJECT_CONTEXT 3, DELIVERABLE_INFERRED 3, BASE_SCORE 2, OCCURRENCES 2, SPECIAL_RULES 2, TASK_GOALS·TOPICS·UNITS·STANDARDS·METHODS 각 2, RUBRIC_MODEL_COUNT_BANDS 2, CONDITION_STRUCTURE 1, ASSESSOR_INSTRUMENTS 1, FIELD_PRESENCE 1 등 | 같음 |

## 4. Backend 연동 단계 — 실제와 가능의 구분

| 단계 | 이 문서(G024) | 근거 |
|---|---|---|
| 문서 등록(`POST /api/admin/assessment/evaluation-plans`, multipart) | **[구현상 가능]** 실행 안 함. HWP는 `assessment.multiformat.experimental=true`일 때만 받음 | `DocumentFormatInspector` |
| Revision 생성 | **[구현상 가능]** | `EvaluationPlanService.addRevision` |
| AnalysisRun 저장(`POST …/revisions/{rid}/analysis-imports`) | **[구현상 가능]** 실행 안 함 — 실제 학교 문서 DB 반입은 승인 대상 | `runs/v21-multiformat-backend-bridge-20261110/REPORT.md` §1 |
| 관리자 원문 검토 | **[구현상 가능]** HWP 검토는 합성 HWP로 통합 테스트만 | Phase B `REPORT.md` |
| 확정 정보 | **[구현상 가능]** `structured-confirm-dev=true` + Mock 인증에서만 | `application.yml` |
| 학생 조회 | 확정 상태·itemKey 참조만 | `StudentEvaluationPlanResponse`, `ConfirmedItemKeys` |

합성 문서(같은 흐름)로는 등록 → 분석기 200 → 수신 201 → 검토 페이지까지 브라우저에서 실행된 기록이 있다(Admin PDF 13/13, HWP·HWPX 15/15×2, `assessment-full-integration-202611/FEATURE-MATRIX.md`).

## 5. 이 사례에서 확인된 한계

- 시기 표현이 세 곳에서 달라 Backend `timing`은 null이다. 사람이 원문을 보고 골라야 한다.
- 기본점수 7점은 분석 결과에는 있지만 계약 필드가 없어 Backend로 가지 않는다.
- 제출물은 추정(INFERRED)이라 보내지 않았다. 학생 화면에는 제출물이 비어 보인다.
- 채점표 첫 요소에 개수 구간 7단계가 들어가고, 채점 관점 6개는 수준 없는 요소로 들어간다. 계약에 '개수 구간형' 표현이 없어서 생기는 모양이다(gaps `RUBRIC_MODEL_COUNT_BANDS`).
