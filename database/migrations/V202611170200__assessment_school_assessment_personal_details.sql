-- A27-UX (2026-11-17) 학생 개인 수행평가 관리 정보 확장 + 진행 상태 되돌리기 이력.
-- 모두 학생 개인 관리 데이터다. 학교 공식 평가정보(평가계획서 확정값)는 바꾸지 않는다(evaluationItemRef로만 연결).
-- 빈 값(NULL)은 '모름/입력 안 함'이다. 0으로 바꾸지 않는다(반영 비율 0%와 미입력을 구분).

ALTER TABLE assessment_school_assessment
    ADD COLUMN assessment_type VARCHAR(20) NULL,
    ADD COLUMN evaluation_date DATE NULL,
    ADD COLUMN weight_percent SMALLINT NULL,
    ADD COLUMN submissions VARCHAR(500) NULL,
    ADD COLUMN personal_memo VARCHAR(2000) NULL,
    ADD CONSTRAINT ck_assessment_school_assessment_weight
        CHECK (weight_percent IS NULL OR (weight_percent >= 0 AND weight_percent <= 100)),
    ADD CONSTRAINT ck_assessment_school_assessment_type
        CHECK (assessment_type IS NULL OR assessment_type IN ('PRESENTATION', 'REPORT', 'PROJECT', 'EXPERIMENT', 'DEBATE', 'PORTFOLIO', 'OTHER'));

-- 상태 변경 이력(앞으로·되돌리기 모두). 수행평가 행의 현재 상태와 별도로 남긴다(불변 기록).
-- 감사 기록이라 FK를 걸지 않는다(수행평가 정리·시험 초기화가 이력 때문에 막히지 않게, 조회는 assessment_id 색인).
CREATE TABLE assessment_school_assessment_status_event (
    id VARCHAR(64) NOT NULL,
    assessment_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    from_status VARCHAR(20) NOT NULL,
    to_status VARCHAR(20) NOT NULL,
    changed_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_assessment_status_event_assessment (assessment_id, changed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
