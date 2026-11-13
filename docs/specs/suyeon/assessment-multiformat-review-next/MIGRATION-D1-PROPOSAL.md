# D-1 Migration 변경안 — 확정값 근거 위치 (승인 요청용, 미적용)

> `database/**`는 공동 소유(@suyeon @wangyu, `docs/OWNERSHIP.md`)다. 아래 SQL은 **초안**이며 `database/migrations/`에 파일을 만들지 않았다. 기존 Migration은 수정하지 않는다.

## 1. 현재 구조와 문제

```text
assessment_plan_review           (id, revision_id, analysis_id, decision, reviewed_by, reviewed_at)
assessment_plan_confirmed_value  (id, review_id, revision_id, subject_id, field_path, value_json VARCHAR(4000) NULL,
                                  pdf_page_number INT NULL, position)
```

- 근거는 `pdf_page_number`뿐 → HWP·HWPX의 구역·경로·표 칸을 저장할 곳이 없다.
- 원본 SHA-256은 `revision.sha256`, 분석기 버전은 `review.analysis_id → analysis_run.analyzer_version`으로 이미 연결된다. Revision별 근거 분리도 `revision_id`로 된다.

## 2. 실제 크기 측정 (계정 B 실험 출력 568개 Locator, 2026-11-10)

| 대상 | 최대 | p95 |
|---|---|---|
| `{documentFormat, documentLocator}` JSON | **184 byte** | 183 |
| `extractedText` | 568 byte | 137 |
| 위 둘을 합친 JSON | 765 byte | 329 |
| 값 하나의 근거 수 | 10 | 10 |

계약상 `extractedText`는 2,000자까지라 한글 기준 최악은 6KB를 넘는다.

## 3. Column 타입 비교

| 선택지 | 장점 | 단점 | 판단 |
|---|---|---|---|
| `VARCHAR(1000)` (지난 초안) | 단순 | 원문 인용을 같이 넣으면 넘칠 수 있음. JSON 유효성 검사 없음 | **채택 안 함** |
| `TEXT` | 기존 `warnings_json TEXT`와 같은 관례, Entity는 `String` 그대로 | DB가 JSON 유효성을 보장하지 않음 | 대안 |
| **`JSON`** (MySQL 8.4) | DB가 유효한 JSON만 받음, `JSON_EXTRACT`로 감사 조회 가능, 크기 여유 | Entity에 `@JdbcTypeCode(SqlTypes.JSON)` 필요(Hibernate 7), 이 저장소 첫 JSON Column | **권장** |

권장: `evidence_locator_json JSON NULL` + 애플리케이션 상한(직렬화 ≤ 2,000 byte, 원문 인용은 넣지 않거나 500자로 자름). 확정값 하나에 근거 Locator 하나(관리자가 고른 칸)를 저장한다.

## 4. SQL 초안

```sql
-- 파일명(승인 시 작성 시각 기준): V2026111?????__assessment_plan_confirmed_value_evidence_locator.sql
-- 추가형 변경. 기존 PDF 확정값의 pdf_page_number는 그대로 둔다.

ALTER TABLE assessment_plan_confirmed_value
    ADD COLUMN evidence_format       VARCHAR(10) NULL AFTER pdf_page_number,
    ADD COLUMN evidence_locator_json JSON        NULL AFTER evidence_format;

-- 기존 행은 모두 PDF Revision의 확정값이다(HWP·HWPX 확정은 지금까지 차단).
UPDATE assessment_plan_confirmed_value cv
    JOIN assessment_plan_revision r ON r.id = cv.revision_id
SET cv.evidence_format = 'PDF'
WHERE r.content_type = 'application/pdf';

ALTER TABLE assessment_plan_confirmed_value
    ADD CONSTRAINT ck_assessment_plan_confirmed_evidence_format
        CHECK (evidence_format IS NULL OR evidence_format IN ('PDF', 'HWP', 'HWPX')),
    ADD CONSTRAINT ck_assessment_plan_confirmed_evidence_shape
        CHECK ((evidence_format = 'PDF' AND evidence_locator_json IS NULL)
            OR (evidence_format IN ('HWP', 'HWPX') AND pdf_page_number IS NULL)
            OR (evidence_format IS NULL AND evidence_locator_json IS NULL));

-- 원문 확인 기록 (관리자 브라우저가 계산한 SHA-256 — 서버 증명이 아님)
ALTER TABLE assessment_plan_review
    ADD COLUMN source_check_method VARCHAR(40) NULL,
    ADD COLUMN source_check_sha256 CHAR(64)    NULL,
    ADD CONSTRAINT ck_assessment_plan_review_source_check
        CHECK (source_check_method IS NULL
            OR source_check_method IN ('BROWSER_PDF_VIEW', 'LOCAL_FILE_EXTERNAL_VIEWER'));
```

## 5. 정책 결정

| 항목 | 결정 후보 |
|---|---|
| PDF `pdf_page_number`와 새 Locator 관계 | PDF는 `pdf_page_number` 계속 사용, Locator NULL. HWP·HWPX는 Locator 사용, 쪽 번호 NULL(가짜 값 금지 — CHECK로 강제) |
| 기존 데이터 | 삭제·변환 없음. `evidence_format='PDF'`만 채움 |
| Null 정책 | 값이 `null`(원문에 없음 확인)이면 근거 생략 가능(현행 PDF와 같음). 값이 있으면 형식별 근거 필수(애플리케이션 검사) |
| SHA-256 연결 | `revision.sha256`(서버 계산) + `review.source_check_sha256`(관리자 브라우저 계산)을 함께 남김 |
| analysisId | `review.analysis_id`(현행) |
| 파서 버전 | `analysis_run.analyzer_version`(현행) — 근거 Locator는 그 Run의 Locator 중 하나여야 함(계약 `evidence_not_in_analysis`) |
| 크기 | DB JSON + 애플리케이션 상한 2,000 byte |
| 응답 호환 | PDF 응답 변화 없음, HWP·HWPX만 `documentLocator` 추가(NON_NULL) |

## 6. Entity·Repository 영향

| 대상 | 변경 |
|---|---|
| `PlanReview.PlanConfirmedValue` | `evidenceFormat`, `evidenceLocatorJson`(`@JdbcTypeCode(SqlTypes.JSON)` String) 추가, 생성자 분기 |
| `PlanReview` | `sourceCheckMethod`, `sourceCheckSha256` 추가 |
| `PlanReviewRequest` | `sourceCheck`, `ConfirmedField.documentLocator`(NON_NULL) |
| `ConfirmedFieldView` / `PlanViews` | HWP·HWPX만 `documentLocator` 반환 |
| `EvaluationPlanService.review` | 형식별 근거 검증 분기(PDF 현행 경로는 그대로) |
| Repository | 변경 없음(조회 Query 그대로) |

## 7. 테스트 계획

1. 빈 Schema에 기존 4개 + 새 Migration 적용 → Flyway 검증 통과
2. **기존 데이터가 있는 Schema**(현 E2E Schema 사본)에 새 Migration 적용 → 기존 PDF 확정값 `evidence_format='PDF'`, 조회 응답 동일
3. CHECK 위반(HWP 행에 `pdf_page_number`, PDF 행에 Locator) INSERT 거절
4. HWP·HWPX 확정 저장·재조회(합성 데이터 기반 검토 API 시험), PDF 회귀 전체

## 8. 롤백·복구

- Flyway는 전진형이다. 되돌리려면 **새 Migration**으로 CHECK·Column을 제거한다(HWP·HWPX 근거와 원문 확인 기록만 사라지고 PDF 데이터는 영향 없음).
- 롤백 전에 HWP·HWPX review를 다시 차단(`review_not_supported`)하고, 해당 Revision의 `review_status`를 어떻게 둘지 결정해야 한다(자동 되돌림 금지).
- 적용 전 대상 Schema 백업(`mysqldump --single-transaction`)을 남긴다. 로컬 공용 Volume의 구형 mentor 이력 문제(별도 결정 대기)와 섞지 않는다.
