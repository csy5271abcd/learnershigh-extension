-- A14 (2026-11-16): 운영계획 관리자 직접 추가 행 (api-contract.md §39-11 DRAFT).
-- 확정 행의 출처를 명시한다: ANALYSIS = 분석 후보 행(candidate_json = 원래 후보, 필수), MANUAL = 관리자가 직접 추가한 행
-- (분석 결과에 없던 행이라 후보가 없다 → candidate_json NULL). 관리자 추가 행을 분석 후보처럼 저장하지 않는다.
-- 기존 행은 모두 분석 후보 행이다(ANALYSIS). 기존 Migration은 바꾸지 않는다. 확정 행은 계속 INSERT만 한다(버전 불변, A13).

ALTER TABLE assessment_plan_teaching_plan_row
    ADD COLUMN row_origin VARCHAR(20) NOT NULL DEFAULT 'ANALYSIS' AFTER row_key;

ALTER TABLE assessment_plan_teaching_plan_row
    MODIFY COLUMN candidate_json MEDIUMTEXT NULL;

ALTER TABLE assessment_plan_teaching_plan_row
    ADD CONSTRAINT ck_assessment_plan_teaching_plan_row_origin CHECK (row_origin IN ('ANALYSIS', 'MANUAL'));

-- 분석 후보 행은 후보가 반드시 있고, 관리자 추가 행은 후보가 없으며 '수정 확정(EDITED)'이 아니다(확정 또는 제외).
ALTER TABLE assessment_plan_teaching_plan_row
    ADD CONSTRAINT ck_assessment_plan_teaching_plan_row_origin_candidate CHECK (
        (row_origin = 'ANALYSIS' AND candidate_json IS NOT NULL)
        OR (row_origin = 'MANUAL' AND candidate_json IS NULL AND decision IN ('CONFIRMED', 'EXCLUDED')));
