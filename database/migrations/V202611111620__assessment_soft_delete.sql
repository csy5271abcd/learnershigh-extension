-- 학생·관리자 개인 Assessment 자료 휴지통(소프트 삭제·복원), 2026-11-11.
-- 정책(사용자 지시): 즉시 영구 삭제 없음, 자동 영구 삭제 없음, 복원 시 같은 ID·Revision·Version·파일 그대로.
-- 노트 Revision·결과물 Version·피드백 Snapshot·답변 행과 실제 파일 바이트는 건드리지 않는다(삭제 표시는 상위 항목에만).
-- 보존 기간·영구 삭제·개인정보 삭제 의무는 OD-A11/API-OD-A08에 미결로 남는다.

ALTER TABLE assessment_school_assessment
    ADD COLUMN deleted_at DATETIME(6) NULL,
    ADD COLUMN deleted_by VARCHAR(64) NULL,
    ADD CONSTRAINT ck_assessment_school_assessment_deleted
        CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL));

ALTER TABLE assessment_artifact
    ADD COLUMN deleted_at DATETIME(6) NULL,
    ADD COLUMN deleted_by VARCHAR(64) NULL,
    ADD CONSTRAINT ck_assessment_artifact_deleted
        CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL));

ALTER TABLE assessment_resource
    ADD COLUMN deleted_at DATETIME(6) NULL,
    ADD COLUMN deleted_by VARCHAR(64) NULL,
    ADD CONSTRAINT ck_assessment_resource_deleted
        CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL));

ALTER TABLE assessment_growth_record
    ADD COLUMN deleted_at DATETIME(6) NULL,
    ADD COLUMN deleted_by VARCHAR(64) NULL,
    ADD CONSTRAINT ck_assessment_growth_record_deleted
        CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL));
