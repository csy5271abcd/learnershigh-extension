-- A27-UX 부록 F (2026-11-19 DRAFT, api-contract.md §38-13·§38-14 · domain.md §30-C): 동명 학교 선택 · 분류하지 못한 원본의 학년·학기 분류.
-- 추가(additive)만 한다. 기존 표·열·Migration(190100·190200 포함)은 바꾸지 않는다.

-- 이 학교(학업 Context 학교 ID)가 학교알리미의 어느 학교인지 관리자가 고른 기록 (학교마다 하나, version 으로 동시 선택 충돌 방지)
CREATE TABLE assessment_schoolinfo_school_mapping (
    school_id            VARCHAR(64)  NOT NULL,
    schoolinfo_school_id VARCHAR(64)  NOT NULL,
    school_name          VARCHAR(100) NOT NULL,
    address              VARCHAR(300) NULL,
    sido                 VARCHAR(40)  NULL,
    sigungu              VARCHAR(40)  NULL,
    status               VARCHAR(20)  NOT NULL,
    invalidated_reason   VARCHAR(100) NULL,
    version              BIGINT       NOT NULL,
    selected_by          VARCHAR(64)  NOT NULL,
    selected_at          DATETIME(6)  NOT NULL,
    PRIMARY KEY (school_id),
    CONSTRAINT ck_assessment_schoolinfo_mapping_status CHECK (status IN ('ACTIVE', 'INVALIDATED'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 분류하지 못한 원본(UNCLASSIFIED)에 관리자가 정한 학년·학기. Revision 으로 쌓고 지우지 않는다.
CREATE TABLE assessment_schoolinfo_classification (
    id             VARCHAR(64)  NOT NULL,
    source_file_id VARCHAR(64)  NOT NULL,
    version        INT          NOT NULL,
    grades         VARCHAR(10)  NOT NULL,
    semesters      VARCHAR(5)   NOT NULL,
    note           VARCHAR(200) NULL,
    decided_by     VARCHAR(64)  NOT NULL,
    decided_at     DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_assessment_schoolinfo_classification UNIQUE (source_file_id, version),
    CONSTRAINT fk_assessment_schoolinfo_classification_source FOREIGN KEY (source_file_id) REFERENCES assessment_schoolinfo_source_file (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
