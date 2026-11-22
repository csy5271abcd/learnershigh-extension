-- A27-UX 부록 E (2026-11-19 DRAFT, api-contract.md §38-12 · domain.md §30-B): 학교알리미 최근 3개 학년도 자동 확인.
-- 추가(additive)만 한다. 기존 표·열·Migration은 바꾸지 않는다. 평가계획서 문서·Revision은 기존 표를 그대로 쓰고,
-- 여기에는 '어디서 받았고 무엇을 확인했는지'와 슬롯 연결·학년도 확인 기록만 둔다(재시작 뒤 중복 등록 방지).

-- 학교알리미에서 받은 원본 파일 (ZIP 안 파일은 각각 한 행). 같은 학교·조회 학년도·SHA는 한 번만.
CREATE TABLE assessment_schoolinfo_source_file (
    id                   VARCHAR(64)   NOT NULL,
    school_id            VARCHAR(64)   NOT NULL,
    requested_year       INT           NOT NULL,
    resolved_source_year INT           NULL,
    schoolinfo_school_id VARCHAR(64)   NULL,
    attachment_seq       VARCHAR(40)   NULL,
    file_name            VARCHAR(255)  NOT NULL,
    sha256               CHAR(64)      NOT NULL,
    size_bytes           BIGINT        NOT NULL,
    format               VARCHAR(10)   NULL,
    storage_key          VARCHAR(64)   NULL,
    verification         VARCHAR(40)   NOT NULL,
    evidence_json        VARCHAR(4000) NULL,
    downloaded_at        DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_assessment_schoolinfo_source UNIQUE (school_id, requested_year, sha256),
    CONSTRAINT ck_assessment_schoolinfo_source_verification CHECK (verification IN
        ('VERIFIED', 'NEEDS_SOURCE_VERIFICATION', 'YEAR_MISMATCH', 'UNCLASSIFIED', 'UNSUPPORTED', 'NOT_PLAN'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 확인된 원본이 등록된 슬롯 문서·Revision. 슬롯·원본마다 하나(DB Unique가 동시 요청·재시작 중복을 막는다).
CREATE TABLE assessment_schoolinfo_slot_link (
    id             VARCHAR(64) NOT NULL,
    source_file_id VARCHAR(64) NOT NULL,
    school_id      VARCHAR(64) NOT NULL,
    academic_year  INT         NOT NULL,
    grade          INT         NOT NULL,
    semester       INT         NOT NULL,
    plan_id        VARCHAR(64) NOT NULL,
    revision_id    VARCHAR(64) NOT NULL,
    created_at     DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_assessment_schoolinfo_slot_link UNIQUE (school_id, academic_year, grade, semester, source_file_id),
    CONSTRAINT fk_assessment_schoolinfo_slot_link_source FOREIGN KEY (source_file_id) REFERENCES assessment_schoolinfo_source_file (id),
    CONSTRAINT ck_assessment_schoolinfo_slot_link_grade CHECK (grade BETWEEN 1 AND 3),
    CONSTRAINT ck_assessment_schoolinfo_slot_link_semester CHECK (semester IN (1, 2))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 학교·학년도별 마지막 확인 결과 (TTL 재사용, 진행 상태는 저장하지 않는다)
CREATE TABLE assessment_schoolinfo_sync_year (
    school_id            VARCHAR(64)  NOT NULL,
    academic_year        INT          NOT NULL,
    status               VARCHAR(40)  NOT NULL,
    resolved_source_year INT          NULL,
    message              VARCHAR(300) NULL,
    checked_at           DATETIME(6)  NOT NULL,
    PRIMARY KEY (school_id, academic_year)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
