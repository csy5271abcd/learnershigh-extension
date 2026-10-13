-- 학생 케어 (docs/specs/wangyu/domain.md §4, ADR-0006)

CREATE TABLE care_case (
    id                       VARCHAR(64)  NOT NULL,
    branch_id                VARCHAR(64)  NOT NULL,
    student_id               VARCHAR(64)  NOT NULL,
    -- 진행 중(IN_ADJUSTMENT)일 때만 student_id. 학생당 진행 중 건 하나를 DB에서도 보장한다.
    active_student_id        VARCHAR(64)  NULL,
    status                   VARCHAR(20)  NOT NULL,
    reason                   VARCHAR(30)  NOT NULL,
    close_type               VARCHAR(30)  NULL,
    opened_on                DATE         NOT NULL,
    closed_on                DATE         NULL,
    recheck_date             DATE         NULL,
    plan_goal                VARCHAR(200) NULL,
    plan_action              VARCHAR(200) NULL,
    plan_load_limit          VARCHAR(100) NULL,
    plan_agreed_with_student BOOLEAN      NULL,
    version                  BIGINT       NOT NULL,
    created_at               DATETIME(6)  NOT NULL,
    updated_at               DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_care_case_active_student UNIQUE (active_student_id),
    INDEX idx_care_case_branch_status (branch_id, status),
    INDEX idx_care_case_student_closed (student_id, closed_on)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE care_case_baseline (
    case_id      VARCHAR(64)  NOT NULL,
    position     INT          NOT NULL,
    signal_type  VARCHAR(40)  NOT NULL,
    summary      VARCHAR(200) NOT NULL,
    metric_value INT          NOT NULL,
    target_value INT          NULL,
    subject      VARCHAR(40)  NULL,
    PRIMARY KEY (case_id, position),
    CONSTRAINT fk_care_case_baseline_case FOREIGN KEY (case_id) REFERENCES care_case (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE care_event (
    id           VARCHAR(64)   NOT NULL,
    case_id      VARCHAR(64)   NOT NULL,
    student_id   VARCHAR(64)   NOT NULL,
    sequence     INT           NOT NULL,
    event_type   VARCHAR(30)   NOT NULL,
    occurred_on  DATE          NOT NULL,
    content      VARCHAR(1000) NOT NULL,
    note_channel VARCHAR(20)   NULL,
    created_at   DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_care_event_case FOREIGN KEY (case_id) REFERENCES care_case (id),
    CONSTRAINT uk_care_event_case_sequence UNIQUE (case_id, sequence),
    INDEX idx_care_event_student (student_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE care_settings (
    branch_id                VARCHAR(64) NOT NULL,
    absence_days             INT         NOT NULL,
    plan_missing_days        INT         NOT NULL,
    study_drop_percent       INT         NOT NULL,
    execution_rate_percent   INT         NOT NULL,
    subject_share_gap_points INT         NOT NULL,
    start_shift_minutes      INT         NOT NULL,
    min_valid_days           INT         NOT NULL,
    cooldown_days            INT         NOT NULL,
    updated_at               DATETIME(6) NOT NULL,
    PRIMARY KEY (branch_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
