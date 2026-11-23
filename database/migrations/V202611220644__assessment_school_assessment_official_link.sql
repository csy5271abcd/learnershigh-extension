-- A28-20 (2026-11-22): 관리자 최종 확정 수행평가를 학생의 학교 수행평가로 자동 등록하기 위한 공식 연결.
-- 기존 행(학생 직접 등록)은 모두 NULL 그대로 — 값·의미 변경 없음. 표·열 삭제 없음.
-- official_key = 문서(plan)ID | 학업 과목 ID | 분석 항목 Key — Revision·확정 기록이 바뀌어도 같은 공식 수행평가는 같은 Key.
-- 같은 학생의 같은 공식 수행평가는 한 행만(UNIQUE). 학생 직접 등록 행(official_key NULL)은 제약을 받지 않는다(MySQL UNIQUE 는 NULL 중복 허용).
ALTER TABLE assessment_school_assessment
    ADD COLUMN official_key VARCHAR(200) NULL,
    ADD COLUMN official_plan_id VARCHAR(64) NULL,
    ADD COLUMN official_review_id VARCHAR(64) NULL,
    ADD COLUMN official_status VARCHAR(20) NULL,
    ADD COLUMN official_timing VARCHAR(100) NULL,
    ADD COLUMN official_weight_percent DECIMAL(5, 2) NULL,
    ADD COLUMN official_max_score DECIMAL(8, 2) NULL,
    ADD COLUMN official_synced_at DATETIME(6) NULL;

ALTER TABLE assessment_school_assessment
    ADD CONSTRAINT uk_assessment_sa_official UNIQUE (student_id, official_key),
    ADD CONSTRAINT ck_assessment_sa_official_status CHECK (official_status IS NULL OR official_status IN ('ACTIVE', 'WITHDRAWN')),
    ADD CONSTRAINT ck_assessment_sa_official_link CHECK (
        (official_key IS NULL AND official_plan_id IS NULL AND official_review_id IS NULL AND official_status IS NULL)
        OR (official_key IS NOT NULL AND official_plan_id IS NOT NULL AND official_review_id IS NOT NULL AND official_status IS NOT NULL)),
    ADD CONSTRAINT ck_assessment_sa_official_weight CHECK (official_weight_percent IS NULL OR (official_weight_percent >= 0 AND official_weight_percent <= 100));
