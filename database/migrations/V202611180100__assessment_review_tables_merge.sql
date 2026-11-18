-- 2026-11-18 검토 저장 간소화 (PR #18): 검토 관련 테이블 9개 → 7개. API 응답 모양은 그대로다.
-- 1) 월별 운영계획 확정(assessment_plan_teaching_plan_review)을 평가 정보 확정(assessment_plan_review)과 한 테이블로 합친다.
--    둘 다 "어떤 분석 결과를 누가 언제 확정했다"는 같은 기록이고, 차이는 scope(EVALUATION · TEACHING_PLAN)뿐이다.
--    평가 정보 확정은 version_no·row_count 가 NULL, 운영계획 확정은 원문 확인 열·reviewer_auth 가 NULL 이다.
-- 2) 초안 저장 이력(assessment_plan_review_draft_event)은 초안과 함께 통째로 읽으므로 초안 행의 history_json(최근 20건)으로 옮긴다.

ALTER TABLE assessment_plan_review
    ADD COLUMN scope      VARCHAR(20) NOT NULL DEFAULT 'EVALUATION' AFTER analysis_id,
    ADD COLUMN version_no INT         NULL AFTER scope,
    ADD COLUMN row_count  INT         NULL AFTER version_no,
    MODIFY COLUMN reviewer_auth VARCHAR(20) NULL;

ALTER TABLE assessment_plan_review
    ADD CONSTRAINT ck_assessment_plan_review_scope CHECK (scope IN ('EVALUATION', 'TEACHING_PLAN')),
    ADD CONSTRAINT ck_assessment_plan_review_scope_fields CHECK (
        (scope = 'EVALUATION' AND version_no IS NULL AND reviewer_auth IS NOT NULL)
        OR (scope = 'TEACHING_PLAN' AND version_no >= 1 AND row_count IS NOT NULL));

INSERT INTO assessment_plan_review (id, revision_id, analysis_id, scope, version_no, row_count, decision, reviewed_by, reviewed_at)
SELECT id, revision_id, analysis_id, 'TEACHING_PLAN', version_no, row_count, 'CONFIRM', reviewed_by, reviewed_at
FROM assessment_plan_teaching_plan_review;

ALTER TABLE assessment_plan_teaching_plan_row DROP FOREIGN KEY fk_assessment_plan_teaching_plan_row_review;
ALTER TABLE assessment_plan_teaching_plan_row
    ADD CONSTRAINT fk_assessment_plan_teaching_plan_row_review FOREIGN KEY (review_id) REFERENCES assessment_plan_review (id);

DROP TABLE assessment_plan_teaching_plan_review;

ALTER TABLE assessment_plan_review
    ADD CONSTRAINT uk_assessment_plan_review_scope_version UNIQUE (revision_id, scope, version_no);

ALTER TABLE assessment_plan_review_draft
    ADD COLUMN history_json TEXT NULL AFTER payload_json;

UPDATE assessment_plan_review_draft d
SET d.history_json = (
    SELECT JSON_ARRAYAGG(JSON_OBJECT('draftVersion', e.draft_version, 'savedBy', e.saved_by,
            'savedAt', DATE_FORMAT(e.saved_at, '%Y-%m-%dT%H:%i:%s.%fZ'), 'changedCount', e.changed_count,
            'changedPaths', CAST(e.changed_paths_json AS JSON)))
    FROM (SELECT * FROM assessment_plan_review_draft_event ORDER BY saved_at DESC, draft_version DESC) e
    WHERE e.draft_id = d.id);

DROP TABLE assessment_plan_review_draft_event;
