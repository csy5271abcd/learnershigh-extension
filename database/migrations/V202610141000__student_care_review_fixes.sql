-- 학생 케어 리뷰 반영 (docs/reviews/2026-10-13-student-care.md, docs/specs/wangyu/domain.md §3, §5-1, §5-2)
-- V202610131200은 수정하지 않는다. 모든 변경은 기존 데이터를 지우지 않는다(Column 확장 / 추가, Unique 범위 변경).

-- 1. 진행 중 건은 지점 × 학생당 하나 (domain.md §5-1).
--    closed_at: cooldown의 "가장 최근 종결 건"을 같은 종결일 안에서도 가리기 위한 종결 시각 (domain.md §3).
ALTER TABLE care_case
    DROP INDEX uk_care_case_active_student,
    ADD CONSTRAINT uk_care_case_branch_active_student UNIQUE (branch_id, active_student_id),
    ADD COLUMN closed_at DATETIME(6) NULL AFTER closed_on;

-- 기존 종결 건의 종결 시각은 CLOSED 이벤트 시각으로 채운다. 이벤트가 없으면 마지막 변경 시각을 쓴다.
UPDATE care_case c
SET c.closed_at = (SELECT MAX(e.created_at) FROM care_event e WHERE e.case_id = c.id AND e.event_type = 'CLOSED')
WHERE c.status = 'CLOSED';

UPDATE care_case
SET closed_at = updated_at
WHERE status = 'CLOSED' AND closed_at IS NULL;

-- 2. Baseline 과목은 Existing 지점별 과목 코드명이다 (docs/architecture/existing-learnershigh-data.md §2-5).
--    Extension은 100자까지 쓴다 (ExistingDailyStudy.SUBJECT_KEY_MAX).
--    연속 미입실 / 계획 미제출은 비교 기준(target)이 없다 (api-contract.md §65-5).
ALTER TABLE care_case_baseline
    MODIFY subject VARCHAR(100) NULL;

UPDATE care_case_baseline
SET target_value = NULL
WHERE signal_type IN ('CONSECUTIVE_ABSENCE', 'PLAN_MISSING');

-- 3. 학생 기록은 잘리지 않는다: 접두어(사유 확인 등) + 메모 1000자가 들어간다 (api-contract.md §65-4).
--    record_no: 같은 시각에 남은 이벤트를 기록한 순서대로 보여 주기 위한 전역 순번 (api-contract.md §65-8).
ALTER TABLE care_event
    MODIFY content VARCHAR(1200) NOT NULL,
    ADD COLUMN record_no BIGINT NOT NULL AUTO_INCREMENT,
    ADD CONSTRAINT uk_care_event_record_no UNIQUE (record_no);

-- 4. 같은 학생의 사유 확인(새 건)을 순서대로 처리하기 위한 학생 단위 잠금 행 (domain.md §5-1).
--    StudentCareService.open()이 Transaction 처음에 이 행을 배타 잠금한다. 업무 데이터는 담지 않는다.
CREATE TABLE care_student_lock (
    branch_id  VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (branch_id, student_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
