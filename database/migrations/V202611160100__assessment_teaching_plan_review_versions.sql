-- A13 (2026-11-16 사용자 승인): 월별 운영계획 재검토·재확정.
-- 이전: Revision당 운영계획 확정 1건(UNIQUE revision_id, V202611150100). 이후: Revision마다 확정 버전 1, 2, 3 … 을 쌓는다.
-- 기존 확정 기록·행은 바꾸지 않는다(기존 행은 모두 1차 확정 = version_no 1). 최신본 = 가장 큰 version_no (시각과 무관하게 안정적).
-- 같은 Revision에 같은 버전이 두 번 저장되지 않는다(동시 재확정은 UNIQUE 위반 → 409).

-- 1) 버전 번호 (기존 행 = 1)
ALTER TABLE assessment_plan_teaching_plan_review
    ADD COLUMN version_no INT NULL AFTER analysis_id;

UPDATE assessment_plan_teaching_plan_review SET version_no = 1 WHERE version_no IS NULL;

ALTER TABLE assessment_plan_teaching_plan_review
    MODIFY COLUMN version_no INT NOT NULL,
    ADD CONSTRAINT ck_assessment_plan_teaching_plan_review_version CHECK (version_no >= 1);

-- 2) Revision당 1건 → (Revision, 버전)당 1건. 새 UNIQUE를 먼저 만들어 revision_id FK가 쓰는 Index를 유지한 뒤 옛 UNIQUE를 지운다.
ALTER TABLE assessment_plan_teaching_plan_review
    ADD CONSTRAINT uk_assessment_plan_teaching_plan_review_version UNIQUE (revision_id, version_no);

ALTER TABLE assessment_plan_teaching_plan_review
    DROP INDEX uk_assessment_plan_teaching_plan_review_revision;
