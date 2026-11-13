-- 신규 Assessment: 학교 수행평가 (docs/specs/suyeon/domain.md §10, api-contract.md §12·13)
-- 사용자 승인(2026-11-09): Assessment 전용 신규 Migration 추가. 기존 Migration / Student Care Table은 변경하지 않는다.
-- student_id는 기존 LearnersHigh 학생 ID 문자열이다 (실제 PK Type은 API-OD-A01 미결이라 FK를 걸지 않는다).
-- 상태 값은 api-contract.md §13이 정한 BEFORE_START / IN_PROGRESS / COMPLETED만 쓴다.
-- 삭제(Soft Delete/휴지통)는 OD-A11 미결이라 Column을 만들지 않는다.

CREATE TABLE assessment_school_assessment (
    id                        VARCHAR(64)   NOT NULL,
    student_id                VARCHAR(64)   NOT NULL,
    academic_year             INT           NOT NULL,
    semester                  INT           NOT NULL,
    subject_id                VARCHAR(64)   NOT NULL,
    -- 학생 개인 관리 정보. 학교 공식 평가정보(평가계획서 확정값)는 이 Table에 복사하지 않고 evaluation_item_* 참조로만 연결한다.
    title                     VARCHAR(200)  NOT NULL,
    description               VARCHAR(2000) NULL,
    deadline_date             DATE          NULL,
    status                    VARCHAR(20)   NOT NULL,
    -- §12 evaluationItemRef (documentRevisionId + subjectId + itemKey). 셋 다 있거나 셋 다 없다.
    eval_document_revision_id VARCHAR(64)   NULL,
    eval_subject_id           VARCHAR(64)   NULL,
    eval_item_key             VARCHAR(100)  NULL,
    version                   BIGINT        NOT NULL,
    created_at                DATETIME(6)   NOT NULL,
    updated_at                DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_assessment_sa_student_term (student_id, academic_year, semester),
    -- 같은 평가 항목을 다시 반영하는지 확인하는 조회용. 중복은 알림 대상이며 자동 병합·차단하지 않는다 (domain.md §9-3).
    INDEX idx_assessment_sa_eval_ref (student_id, eval_document_revision_id, eval_subject_id, eval_item_key),
    CONSTRAINT ck_assessment_sa_status CHECK (status IN ('BEFORE_START', 'IN_PROGRESS', 'COMPLETED')),
    CONSTRAINT ck_assessment_sa_semester CHECK (semester IN (1, 2)),
    CONSTRAINT ck_assessment_sa_eval_ref CHECK (
        (eval_document_revision_id IS NULL AND eval_subject_id IS NULL AND eval_item_key IS NULL)
        OR (eval_document_revision_id IS NOT NULL AND eval_subject_id IS NOT NULL AND eval_item_key IS NOT NULL))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
