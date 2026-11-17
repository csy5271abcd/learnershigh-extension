-- 평가계획서 문서 삭제(논리 삭제), 2026-11-17 A25 사용자 요구.
-- 문서(assessment_evaluation_plan)에만 삭제 표시를 남긴다. Revision·원문 파일·분석 Run·검토·확정 기록·운영계획은 그대로 보존한다(감사·무결성).
-- 삭제된 문서는 관리자 목록·상세·학생 목록·상세·Monthly Planner·원문에서 모두 보이지 않는다(Entity @SQLRestriction).
-- 영구 삭제·복원·보존 기간은 정하지 않았다(OD-A11과 같은 미결).

ALTER TABLE assessment_evaluation_plan
    ADD COLUMN deleted_at DATETIME(6) NULL,
    ADD COLUMN deleted_by VARCHAR(64) NULL,
    ADD CONSTRAINT ck_assessment_evaluation_plan_deleted
        CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL));
