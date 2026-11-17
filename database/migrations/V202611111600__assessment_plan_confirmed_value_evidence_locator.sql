-- D-1 (Phase B, 2026-11-11 사용자 전달 승인). 초안: docs/specs/suyeon/assessment-multiformat-review-gate-202611/sql/D1-draft.sql
-- 추가형 변경이다. 기존 PDF 확정값(pdf_page_number·value_json)·Revision·AnalysisRun·Review 관계는 바꾸지 않는다.
-- 같은 배포 단위의 PlanConfirmedValue Entity가 evidence_format을 항상 기록한다(NOT NULL 호환).

-- 1) 확정값 근거: 형식, HWP·HWPX 구조 위치, 분석 결과 안의 과목 번호
ALTER TABLE assessment_plan_confirmed_value
    ADD COLUMN evidence_format        VARCHAR(10) NULL AFTER pdf_page_number,
    ADD COLUMN evidence_locator_json  JSON        NULL AFTER evidence_format,
    ADD COLUMN analysis_subject_index INT         NULL AFTER evidence_locator_json;

-- 2) 기존 행은 모두 PDF Revision의 확정값이다(HWP·HWPX 확정은 지금까지 Service가 차단).
UPDATE assessment_plan_confirmed_value cv
    JOIN assessment_plan_revision r ON r.id = cv.revision_id
SET cv.evidence_format = 'PDF'
WHERE r.content_type = 'application/pdf';

-- 3) 형식을 비워 둘 수 없게 한다. PDF가 아닌 Revision의 기존 확정값이 하나라도 있으면 여기서 실패한다(조용히 PDF로 칠하지 않음).
ALTER TABLE assessment_plan_confirmed_value
    MODIFY COLUMN evidence_format VARCHAR(10) NOT NULL;

-- 4) 형식별 모양. evidence_format이 NOT NULL이고 나머지는 IS [NOT] NULL 비교뿐이라 CHECK 결과가 UNKNOWN이 되지 않는다.
ALTER TABLE assessment_plan_confirmed_value
    ADD CONSTRAINT ck_assessment_plan_confirmed_evidence_format
        CHECK (evidence_format IN ('PDF', 'HWP', 'HWPX')),
    ADD CONSTRAINT ck_assessment_plan_confirmed_evidence_shape
        -- PDF 분기에 analysis_subject_index IS NULL 추가(2026-11-10 2차): 계약안에서 PDF analysisSubjectIndex는 not_allowed다.
        CHECK ((evidence_format = 'PDF' AND evidence_locator_json IS NULL AND analysis_subject_index IS NULL)
            OR (evidence_format IN ('HWP', 'HWPX')
                AND pdf_page_number IS NULL
                AND evidence_locator_json IS NOT NULL
                AND analysis_subject_index IS NOT NULL)),
    -- 평평한 JSON 객체만(중첩 금지), 키 12개 이하, 직렬화 1,000 byte 이하
    ADD CONSTRAINT ck_assessment_plan_confirmed_locator_json
        CHECK (evidence_locator_json IS NULL
            OR (JSON_TYPE(evidence_locator_json) = 'OBJECT'
                AND JSON_DEPTH(evidence_locator_json) = 2
                AND JSON_LENGTH(evidence_locator_json) <= 12
                AND LENGTH(CAST(evidence_locator_json AS CHAR)) <= 1000)),
    ADD CONSTRAINT ck_assessment_plan_confirmed_subject_index
        CHECK (analysis_subject_index IS NULL OR analysis_subject_index BETWEEN 0 AND 39);

-- 5) 관리자가 제출한 원문 확인 기록(브라우저 계산 SHA-256). 서버 증명이 아니다. 둘 다 있거나 둘 다 없어야 한다.
ALTER TABLE assessment_plan_review
    ADD COLUMN source_check_method VARCHAR(40) NULL,
    ADD COLUMN source_check_sha256 CHAR(64)    NULL,
    ADD CONSTRAINT ck_assessment_plan_review_source_check
        CHECK ((source_check_method IS NULL AND source_check_sha256 IS NULL)
            -- IS NOT NULL을 먼저 둔다: method가 NULL이면 비교가 UNKNOWN이 되어 'SHA만 있는 행'이 CHECK를 통과한다(1차 시험에서 확인).
            OR (source_check_method IS NOT NULL
                AND source_check_method = 'LOCAL_FILE_EXTERNAL_VIEWER'
                AND source_check_sha256 IS NOT NULL
                AND REGEXP_LIKE(source_check_sha256, '^[0-9a-f]{64}$', 'c')));
