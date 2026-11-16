# Phase B 공동 승인 요청서 (2026-11-11)

> **이 문서는 승인 요청이며 승인 기록이 아니다.** 작업 지시서도 승인이 아니다. 아래 Gate와 결정 항목에 승인자가 서명(이 문서 또는 `../assessment-multiformat-review-gate-202611/SHARED-APPROVAL-STATUS.md` 갱신, 필요하면 ADR)하기 전에는 Phase B를 시작하지 않는다.
> 상세 근거: `../assessment-multiformat-review-gate-202611/` (`API-CONTRACT-REVISED.md`, `MIGRATION-D1-REVISED.md`, `SOURCE-REVIEW-REVISED.md`).

## 1. 승인자 기준 (`docs/OWNERSHIP.md`)

| 대상 | 소유 | 필요한 승인 |
|---|---|---|
| `docs/api/api-contract.md` | Shared(§6) — 단독 소유 아님 | Suyeon + Wangyu 확인 |
| `database/**` (새 Migration) | Shared, CODEOWNERS 예시 `@suyeon @wangyu` | Suyeon + Wangyu |
| Assessment Backend·Frontend(`assessment/` 패키지, `features/assessment/`) | Suyeon | Suyeon(사용자) |
| 원문 수동 검토 절차(A안) | Assessment 정책 | Suyeon(사용자). 운영 인증 연동 시점은 팀 결정 |

GitHub 계정명은 팀에서 확정한 값이 필요하다(OWNERSHIP §19 예시).

## 2. Gate 상태

| Gate | 승인 대상 | 상태 | 승인자 | 근거 문서 |
|---|---|---|---|---|
| 1. API 계약 M-1~M-7 | PDF·HWP·HWPX 등록, `source.format`, `documentLocator`, 형식별 Locator, `path_mismatch`, M-4 필드별 근거 검증, null 확정값(`NOT_IN_SOURCE`), PDF 하위 호환. **M-8(`sectionCount`·`sourceRange`)은 보류** | **수정 후 승인 필요** — 아래 결정 1·2·3·5를 반영한 뒤 승인 | 미정(Suyeon + Wangyu) | `API-CONTRACT-REVISED.md` |
| 2. D-1 Migration | `evidence_format`(NOT NULL), `evidence_locator_json JSON`, `analysis_subject_index`, 형식별 CHECK·NULL 처리, `source_check_method`·`source_check_sha256` 쌍 CHECK, 기존 PDF 보존, Hibernate JSON 매핑(A), 전진형 복구 | **승인 대기** — SQL은 2차 보완 완료(진리표 42/42, 사본 14/14). 결정 6 | 미정(Suyeon + Wangyu) | `MIGRATION-D1-REVISED.md`, `sql/D1-draft.sql` |
| 3. 원문 수동 검토 A안 | 로컬 HWP·HWPX 선택, 브라우저 SHA-256 대조, 한글 프로그램 원문 확인, 필드별 근거 선택, 관리자 명시적 확인, 기록 저장, 운영 인증 전 제한 | **승인 대기** — 결정 4 | 미정(Suyeon) | `SOURCE-REVIEW-REVISED.md` |

반려된 Gate는 없다. 승인된 Gate도 없다.

## 3. 결정 항목 6개 (`SHARED-APPROVAL-STATUS.md` "승인받을 때 함께 결정할 것" 1~6 그대로)

### 결정 1. `evidence_scope_unavailable` 신규 오류 사유 코드 추가 여부

| 항목 | 내용 |
|---|---|
| 현재 구현 | 없음. HWP·HWPX review는 그 앞에서 `review_not_supported`로 막힌다 |
| 계약 규칙 | `api-contract.md` §5-2는 `VALIDATION_ERROR` + `details.fields[{field, reason}]` **형식만** 정한다. `reason` 값 목록(Enum)은 계약에 없다. 코드가 실제로 쓰는 값: `required`·`unknown`·`not_allowed`·`format`·`duplicate`·`evidence_required`·`out_of_range`·`document_mismatch`·`not_confirmed` 등 21종 |
| 제안 | 분석 결과 밖 영역(`achievement`·`teachingPlan`)이거나 근거 노드에 구조 Locator가 없을 때 `…fieldPath: evidence_scope_unavailable` |
| 대안 | (A) 신규 코드 채택 (B) 기존 `not_allowed` 재사용(경로 화이트리스트 위반과 구분 안 됨) (C) `…documentLocator: evidence_not_in_analysis`로 합침(관리자가 "다른 칸을 고르면 된다"고 오해) |
| 권장 | **(A)**. "이 문서에서는 이 필드에 근거를 댈 수 없다"는 의미를 나타내는 기존 코드가 없다. `reason`은 Enum이 아니라서 추가해도 기존 Client가 깨지지 않는다 |
| 함께 고칠 것 | 계약안은 Locator 누락을 `…documentLocator: required`로 적었다. PDF는 같은 상황에 이미 `…pdfPageNumber: evidence_required`를 쓴다. **HWP·HWPX도 `evidence_required`로 맞출 것을 권장**한다(기존 코드 재사용, 형식 간 일관성) |
| 영향 | API: 오류 사유 문자열 1개 추가(형식 불변). DB: 없음. Frontend: Admin 오류 표시 문구 1개 |
| PDF 호환 | 영향 없음(PDF 경로에서 발생하지 않음) |
| Student Care | 없음 |
| 결정하지 않으면 | HWP·HWPX review의 거절 사유를 확정할 수 없어 Phase B Step 6(API 연결)과 Admin 오류 표시가 막힌다 |
| 승인자 / 상태 | Suyeon + Wangyu / **승인 대기** |

### 결정 2. PDF에 `analysisSubjectIndex` 등을 적용하지 않는 현행 유지(형식 간 차이 인정) 여부

| 항목 | 내용 |
|---|---|
| 현재 구현 | PDF review는 `subjectId`·`fieldPath`·`value`·`pdfPageNumber`만 받는다. 분석 결과의 어느 과목인지, 그 fieldPath가 분석 결과에 있는지 **확인하지 않는다**(`EvaluationPlanService.review`) |
| 제안 | HWP·HWPX만 `analysisSubjectIndex`·`documentLocator`·`absence`·`sourceCheck` 사용. PDF에서는 이 필드가 오면 `not_allowed` |
| 대안 | (A) 형식 간 차이 인정 (B) PDF도 같은 근거 무결성 검증으로 확장 |
| 권장 | **(A) — 시연 기준선 보호.** (B)는 PDF 요청 형태를 바꾸는 Breaking Change라서 Admin PDF 검토 화면·43/33 브라우저 시험·HTTP 33 시험을 모두 바꿔야 한다. 시연 뒤 별도 결정으로 다룬다 |
| 영향 | API: PDF 불변. DB: PDF 행은 새 Column NULL(D-1 CHECK가 강제). Frontend: PDF 화면 불변 |
| PDF 호환 | 완전 유지 |
| Student Care | 없음 |
| 결정하지 않으면 | 계약 문구(PDF 요청에 새 필드 허용 여부)를 확정할 수 없어 Gate 1이 막힌다 |
| 승인자 / 상태 | Suyeon + Wangyu / **승인 대기** |

### 결정 3. 영역 반영비율을 HWP·HWPX에서 확정 불가로 두는 것

| 항목 | 내용 |
|---|---|
| 현재 구현 | PDF는 `writtenEvaluation.weightPercent`·`performanceEvaluation.weightPercent`를 포함해 화이트리스트(`(writtenEvaluation\|performanceEvaluation\|achievement\|teachingPlan)(…)*`)에 맞는 모든 경로를 확정할 수 있다 |
| 제안 | HWP·HWPX에서는 근거 노드에 구조 Locator가 있는 필드만 확정. 계정 B 출력에서 영역 노드 15개 중 13개가 구조 Locator가 없으므로 영역 반영비율은 대부분 확정 불가(`evidence_scope_unavailable`). `achievement`·`teachingPlan`은 분석 결과에 없어 확정 불가 |
| 대안 | (A) 확정 불가 유지 (B) 영역 값을 하위 항목 근거로 대신 인정(근거 관계 위반) (C) 계정 B가 영역 노드에 구조 Locator를 붙인 뒤 허용 |
| 권장 | **(A) 지금은 확정 불가, (C)는 계정 B 협의 후.** 근거 관계를 검증할 수 없는 필드는 허용하지 않는다는 원칙과 같다 |
| 영향 | API: 사유 코드(결정 1). DB: 없음. Frontend: Admin에서 해당 필드를 "근거 없음 · 확정 불가"로 표시하고 선택지에서 뺀다 |
| PDF 호환 | PDF는 계속 영역 비율 확정 가능(결정 2와 같은 형식 간 차이) |
| Student Care | 없음 |
| 결정하지 않으면 | HWP·HWPX 문서는 학생 화면에 영역 비율 없이 항목만 공개된다는 운영 결과를 합의하지 못한 채 Phase B가 진행된다 |
| 승인자 / 상태 | Suyeon(+ 계정 B 협의) / **승인 대기** |

### 결정 4. 운영 보호 장치(Mock 인증이면 HWP·HWPX 확정 거절) 도입 여부

| 항목 | 내용 |
|---|---|
| 현재 구현 | 관리자 인증은 `X-Assessment-Admin-Id` 개발용 Mock Header다. 실험 Flag(`assessment.multiformat.experimental`, 기본 false)가 HWP·HWPX 등록 자체를 막는다. 확정은 `review_not_supported`로 막혀 있다 |
| 제안 | Phase B 뒤에도 Backend가 "Mock 인증 상태에서는 HWP·HWPX 확정 거절"을 따로 검사 |
| 대안 | (A) 별도 보호 장치 추가 (B) 실험 Flag OFF만으로 충분하다고 보고 추가하지 않음 (C) 확정 전용 Flag를 하나 더 둠 |
| 권장 | **(A)**. Flag는 개발 시험을 위해 켤 수 있다. 확정 기록에는 검토자 신원이 핵심인데 Mock ID는 감사 근거가 되지 못한다. "Flag를 켰더니 운영에서 확정이 열린다"는 경로를 하나 더 막는다 |
| 영향 | API: 거절 사유 1개(예: 403 또는 `VALIDATION_ERROR` 사유, 형태는 승인 시 결정). DB: 없음. Frontend: 개발 표시 "운영 확정 아님" 유지 |
| PDF 호환 | PDF는 적용하지 않는다(현재 PDF 시연은 Mock 인증으로 확정한다. PDF에도 적용할지는 별도 결정) |
| Student Care | 없음(`common/auth` 변경 없이 Assessment 안에서 판정하는 것이 전제. `common/**`를 바꿔야 하면 Wangyu 합의 필요) |
| 결정하지 않으면 | Gate 3 "운영 인증 전 기능 제한"의 구현 방식이 없다 |
| 승인자 / 상태 | Suyeon(+ `common/**` 변경 시 Wangyu) / **승인 대기** |

### 결정 5. fieldPath 색인 정규형(`[01]` 거절)을 계약에 넣을지, 현행 PDF review에도 적용할지

| 항목 | 내용 |
|---|---|
| 현재 구현 | PDF `FIELD_PATH`의 색인은 `\[\d{1,3}]`이라 `[01]`을 허용한다. **PDF review는 fieldPath 중복 검사도 하지 않고**, DB에도 `(review_id, subject_id, field_path)` Unique 제약이 없다. Student 응답은 확정값을 모두 나열하므로 같은 필드가 두 번 확정되면 학생에게 값 두 개가 보인다. HWP·HWPX 준비 코드(`ReviewEvidenceScope`)는 이미 `[01]`을 거절한다(API 미연결) |
| 저장 데이터 영향 (실측) | 로컬 합성 Schema 38개, 확정값 54행: 비정규 색인 **0행**. 완전 중복 3건은 모두 D-1 진리표 Schema의 의도적 시험 행이고, E2E 흐름의 중복은 0 |
| 회귀 테스트 영향 (실측) | Backend 테스트·E2E 스크립트 중 `[0n]` 형태를 쓰는 곳은 `ReviewEvidenceScopeTest`뿐 |
| 제안 | 계약에 "색인은 `0` 또는 선행 0 없는 정수" 규칙 추가 |
| 대안 | (A) HWP·HWPX만 적용(PDF 현행 유지) (B) PDF에도 색인 정규형 + 같은 요청 안 fieldPath 중복 거절(`duplicate`) 적용 (C) (B) + DB Unique 제약 |
| 권장 | **계약에는 지금 넣고, 적용은 (A) → 시연 뒤 (B).** (B)는 정상 요청을 거절하지 않으므로(위 실측 0행) 하위 호환 위험이 낮지만, 시연 전에 PDF 코드를 바꾸지 않는다. (C)는 Shared `database/**` 변경이라 D-1과 묶어 별도 승인 |
| 영향 | API: 규칙 문구 추가, (B)면 PDF에 `unknown`·`duplicate` 사유 발생 가능. DB: (C)만 해당. Frontend: Admin PDF 화면은 정규형 경로만 만들므로 영향 없음(확인 필요) |
| PDF 호환 | (A) 영향 없음. (B) 비정규 색인·중복 요청만 거절. 적용 시 PDF 브라우저 43·회귀 33·HTTP 33 재실행 필수 |
| Student Care | 없음 |
| 결정하지 않으면 | HWP·HWPX는 준비 코드대로 막히지만, PDF의 중복 확정 허점은 계속 남는다 |
| 승인자 / 상태 | Suyeon + Wangyu(계약·DB) / **승인 대기** |

### 결정 6. D-1 2차 보완(PDF 행 `analysis_subject_index IS NULL`)을 포함한 최종 SQL 승인

| 항목 | 내용 |
|---|---|
| 현재 구현 | `database/migrations/`에 D-1 없음. 초안은 `../assessment-multiformat-review-gate-202611/sql/D1-draft.sql` |
| 제안 | 2차 초안 그대로 승인. 파일명 `V<작성 시각>__assessment_plan_confirmed_value_evidence_locator.sql` |
| 검증 | 격리 Schema 진리표 **42/42**(NULL 조합·JSON 모양·sourceCheck 쌍·UPDATE 우회·원자성), 기존 PDF 데이터 사본 **14/14**(행·인덱스·외래키·API 응답 동일), Hibernate 7 JSON 매핑 실측(이중 인코딩 없음) |
| 대안 | (A) 2차 초안 승인 (B) `evidence_locator_json`을 `VARCHAR`+앱 검증으로(DB의 JSON 모양 검사 없음) (C) 결정 5-(C) Unique 제약을 같은 Migration에 포함 |
| 권장 | **(A)**. (C)는 PDF 동작 변경이라 결정 5 승인 뒤 별도 Migration으로 |
| 영향 | DB: Column 5개·CHECK 5개 추가. **D-1과 Entity·Service 변경은 같은 배포여야 한다**(Migration만 먼저 적용하면 현재 코드의 PDF 확정 저장이 `evidence_format` 기본값 없음으로 실패 — 사본 시험에서 확인). Frontend: 없음 |
| PDF 호환 | 기존 행 `evidence_format='PDF'`로 채움, 새 Column NULL. API 응답 동일(사본 시험) |
| Student Care | 없음(다른 테이블 변경 없음) |
| 결정하지 않으면 | HWP·HWPX 근거를 저장할 Column이 없어 Phase B 전체가 막힌다 |
| 승인자 / 상태 | Suyeon + Wangyu / **승인 대기** |

## 4. 승인 후 수정할 파일

| 단계 | 파일 | 소유 |
|---|---|---|
| 계약 | `docs/api/api-contract.md` §11·§39(M-1~M-7, 결정 1·2·3·5) | Shared |
| Migration | `database/migrations/V<시각>__assessment_plan_confirmed_value_evidence_locator.sql` (신규) | Shared |
| DTO | `assessment/dto/plan/PlanReviewRequest.java`, `ConfirmedFieldView.java` | Assessment |
| Entity | `assessment/entity/plan/PlanReview.java`(`PlanConfirmedValue` 포함) | Assessment |
| Service | `assessment/service/plan/EvaluationPlanService.java`(형식별 분기), `ReviewEvidenceScope.java`(연결), `PlanViews.java` | Assessment |
| Test | Migration 통합 테스트(진리표 → JUnit), review API 통합 테스트(근거 부정 사례 7종) | Assessment |
| Admin | `frontend/admin/src/features/assessment/` — `PlanReviewConfirmPanel.tsx`, `MultiformatReviewReadiness.tsx`, API Adapter | Assessment |
| 문서 | `docs/specs/suyeon/domain.md`(OD-A 항목 상태), `progress.md` | Assessment |

`application.yml`의 실험 Flag 기본값(false)은 바꾸지 않는다.

## 5. Phase B 착수 조건

1. Gate 1·2: Suyeon과 Wangyu의 승인 기록이 Repository에 있다
2. Gate 3: Suyeon 승인 기록이 있다
3. 결정 1~6의 선택이 기록돼 있다
4. 시연(11-12)이 끝났다 — 시연 전에는 PDF 경로를 바꾸지 않는다
5. 착수 직전 기준선 재확인: Backend 261·129, PDF 43·33·33, 실험 OFF 9, HWP·HWPX 83, 점검표 6

## 6. 승인 후 실행 순서와 완료 기준

| # | 단계 | 필요한 승인 | 완료 기준 |
|---|---|---|---|
| 1 | Shared 계약 반영 | Gate 1, 결정 1·2·3·5 | `api-contract.md` 개정, 변경 구간을 Wangyu가 확인 |
| 2 | D-1 Migration 파일 생성 | Gate 2, 결정 6 | 새 파일만 추가, 기존 Migration 해시 불변 |
| 3 | 독립 시험 Schema 적용 | 2 | Flyway 5개 적용·검증, 진리표 42건 JUnit 통과 |
| 4 | 기존 PDF 데이터 사본 적용 | 2 | 사본 14/14 + 더 큰 사본(여러 PDF 확정·개정본) |
| 5 | Entity·DTO 확장 | 1·2 | 단위 테스트, PDF DTO 직렬화 불변(재전송 해시 `49d2c72f…`) |
| 6 | `ReviewEvidenceScope` API 연결 | 1·5 | HWP·HWPX만 사용, PDF 경로 코드 불변 |
| 7 | 필드별 근거 무결성 검증 | 6 | 통합 테스트: 같은 항목 허용 / 다른 항목·다른 과목·다른 Run·다른 Revision·없는 Locator·무관한 Locator 거절, null 정책, 비정규 색인, 권한 403 |
| 8 | Admin 수동 확인 UI 연결 | Gate 3, 결정 4 | SHA 일치·불일치, 근거 없는 필드 차단, 체크 전 확정 차단, 서버 오류 표시, 재조회(브라우저) |
| 9 | HWP·HWPX 합성 review API 시험 | 6~8 | 원본 → 계정 B Adapter → 후보 → 합성 수동 검토 → 확정값 저장(Mock 관리자, 사람 검토 실적 아님) |
| 10 | Student 공식 평가정보 조회 | 9 | 확정값만, Locator·후보 미노출, itemKey 무결성·지필 Key 차단 유지 |
| 11 | 전체 회귀 | — | Backend·Frontend·PDF·HWP·HWPX·실험 OFF·Student Care 전부, 실험 Flag 기본 OFF 유지 |

## 7. 이번 Phase B에서도 바꾸지 않는 정책

같은 Revision 재검토 시 이전 확정 대체 / 최신 미확정 Revision이 있을 때 이전 확정본 학생 공개 / 재분석 itemKey 변경 시 학생 참조. HWP·HWPX도 PDF와 같은 현행 동작을 따른다. 충돌하면 그 시나리오를 막고 결정 필요 사항으로 보고한다.
