-- A7 (2026-11-15): 공유 검토 초안의 범위(scope) 분리.
-- 평가 정보 초안(EVALUATION)과 월별 운영계획 초안(TEACHING_PLAN)은 확정 시점이 다르다(§39 PUT review / §39-6 teaching-plan-review).
-- 지금까지는 분석 결과당 초안 1개라 평가 정보 확정이 운영계획 초안까지 닫았다 → 범위별로 하나씩 둔다.
-- 기존 초안은 모두 EVALUATION으로 남는다(내용 변경 없음). 기존 Migration은 바꾸지 않는다.

ALTER TABLE assessment_plan_review_draft
    ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'EVALUATION' AFTER analysis_id,
    ADD CONSTRAINT ck_assessment_plan_review_draft_scope CHECK (scope IN ('EVALUATION', 'TEACHING_PLAN'));

-- 새 Unique(분석 결과 + 범위)를 먼저 만든 뒤 예전 Unique(분석 결과)를 지운다.
-- analysis_id FK는 새 인덱스(analysis_id가 첫 열)를 쓴다.
ALTER TABLE assessment_plan_review_draft
    ADD CONSTRAINT uk_assessment_plan_review_draft_analysis_scope UNIQUE (analysis_id, scope);

ALTER TABLE assessment_plan_review_draft
    DROP INDEX uk_assessment_plan_review_draft_analysis;
