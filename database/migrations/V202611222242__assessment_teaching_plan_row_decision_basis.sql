-- A28-31 (2026-11-23): 월별 운영계획 확정 행마다 결정 근거를 남긴다.
--   ADMIN      = 관리자가 운영계획 초안에서 그 행을 직접 확인·수정·제외했거나 관리자가 추가한 행
--   AI_DEFAULT = 관리자가 따로 결정하지 않아 '최종 승인'이 분석 후보를 기본값으로 채택한 행
-- 서버가 확정 시점의 운영계획 초안과 대조해 정한다(요청으로 받지 않음). 기존 행은 NULL(근거 기록 전).
-- 추가형 변경만 한다: 기존 데이터·제약은 바꾸지 않는다.
ALTER TABLE assessment_plan_teaching_plan_row
    ADD COLUMN decision_basis VARCHAR(20) NULL AFTER decision,
    ADD CONSTRAINT ck_assessment_plan_teaching_plan_row_basis
        CHECK (decision_basis IS NULL OR decision_basis IN ('ADMIN', 'AI_DEFAULT'));
