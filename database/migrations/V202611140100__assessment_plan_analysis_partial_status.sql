-- A3.5 (2026-11-14 사용자 승인): 분석기 부분 결과(PARTIAL)를 AnalysisRun으로 저장한다.
-- 기존 Migration(V202611090310)은 고치지 않고 상태 CHECK 제약만 새로 만든다. 기존 행(REVIEW_REQUIRED·FAILED)은 그대로 유효하다.
-- PARTIAL은 "일부 과목·항목만 추출됨"이며 성공(REVIEW_REQUIRED)으로 바꿔 저장하지 않는다. 확정은 여전히 사람이 PUT .../review로만 한다.
ALTER TABLE assessment_plan_analysis_run DROP CHECK ck_assessment_plan_analysis_status;
ALTER TABLE assessment_plan_analysis_run
    ADD CONSTRAINT ck_assessment_plan_analysis_status CHECK (status IN ('REVIEW_REQUIRED', 'PARTIAL', 'FAILED'));
