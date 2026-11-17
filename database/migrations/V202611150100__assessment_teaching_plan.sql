-- A6 (2026-11-15): analysis-import-0.3 DRAFT 수신 기록 + 월별 교수·학습 운영계획 확정 (api-contract.md §39-3 · §39-6 · §10-1-2).
-- 분석 후보(assessment_plan_analysis_run.result_json의 teachingPlan) · 검토 초안(assessment_plan_review_draft) · 확정 운영계획(이 테이블)은
-- 서로 다른 데이터다. 운영계획 행은 수행평가 확정값(assessment_plan_confirmed_value)과 섞지 않는다.
-- 기존 Migration은 바꾸지 않는다(새 컬럼은 NULL 허용 → 기존 Run은 0.2로 남는다).

ALTER TABLE assessment_plan_analysis_run
    -- 0.3 결과일 때만 '0.3'. NULL = backend-adapter-0.2
    ADD COLUMN contract_version VARCHAR(10) NULL AFTER analyzer_version,
    ADD COLUMN analyzer_profile VARCHAR(50) NULL AFTER contract_version;

-- 운영계획 확정 1건 = Revision 하나에 대한 관리자 결정 (재검토·재확정 정책 미결 → Revision당 1건)
CREATE TABLE assessment_plan_teaching_plan_review (
    id          VARCHAR(64) NOT NULL,
    revision_id VARCHAR(64) NOT NULL,
    analysis_id VARCHAR(64) NOT NULL,
    row_count   INT         NOT NULL,
    reviewed_by VARCHAR(64) NOT NULL,
    reviewed_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_assessment_plan_teaching_plan_review_revision UNIQUE (revision_id),
    CONSTRAINT fk_assessment_plan_teaching_plan_review_revision FOREIGN KEY (revision_id) REFERENCES assessment_plan_revision (id),
    CONSTRAINT fk_assessment_plan_teaching_plan_review_analysis FOREIGN KEY (analysis_id) REFERENCES assessment_plan_analysis_run (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 행별 결정. row_json = 확정된 최종 행(§39-3 행 모양, 정밀도 8종 그대로), candidate_json = 원래 분석 후보 행(변경 이력).
-- EXCLUDED 행은 기록만 하고 학생에게 보내지 않는다. precision_code·month_from·month_to는 조회용 사본(값의 원천은 row_json).
CREATE TABLE assessment_plan_teaching_plan_row (
    id                     VARCHAR(64) NOT NULL,
    review_id              VARCHAR(64) NOT NULL,
    sort_order             INT         NOT NULL,
    subject_id             VARCHAR(64) NOT NULL,
    analysis_subject_index INT         NOT NULL,
    row_key                VARCHAR(50) NOT NULL,
    decision               VARCHAR(20) NOT NULL,
    precision_code         VARCHAR(20) NULL,
    month_from             TINYINT     NULL,
    month_to               TINYINT     NULL,
    row_json               MEDIUMTEXT  NOT NULL,
    candidate_json         MEDIUMTEXT  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_assessment_plan_teaching_plan_row_key UNIQUE (review_id, analysis_subject_index, row_key),
    CONSTRAINT fk_assessment_plan_teaching_plan_row_review FOREIGN KEY (review_id) REFERENCES assessment_plan_teaching_plan_review (id),
    CONSTRAINT ck_assessment_plan_teaching_plan_row_decision CHECK (decision IN ('CONFIRMED', 'EDITED', 'EXCLUDED')),
    INDEX idx_assessment_plan_teaching_plan_row_review (review_id, sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
