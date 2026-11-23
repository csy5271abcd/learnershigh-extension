-- 신규 Assessment: 학생 기록 (노트·Revision·결과물·버전·피드백·성장 기록·자료·중요 표시)
-- 근거: docs/specs/suyeon/domain.md, api-contract.md §20·21·22·24·25·29·30·31·32·44·45, ADR-0009(Snapshot 피드백)
-- 승인: 2026-11-11 사용자가 DB·API·Storage 진행과 공동 담당자(Wangyu) 승인을 전달함(저장소의 서명 기록은 아님,
--       docs/specs/suyeon/assessment-db-integration-202611/REPORT.md §승인 기록). 기존 Migration·Student Care Table은 바꾸지 않는다.
--
-- 원칙
-- - student_id는 기존 LearnersHigh 학생 ID 문자열(API-OD-A01)이라 FK를 걸지 않는다(기존 Table과 같은 방식).
-- - 노트·결과물·피드백의 대상은 이번 범위에서 학교 수행평가(SCHOOL_ASSESSMENT)만이다. 심화 Task는 2026-11-03 범위 축소로 폐기.
-- - Revision·ArtifactVersion·피드백 Snapshot은 불변이다. UPDATE 경로를 두지 않고, 갱신 Column이 없다.
-- - ON DELETE CASCADE를 쓰지 않는다(기록 유실 방지). 삭제 정책(OD-A11)이 미결이라 삭제 Column·API도 두지 않는다.

CREATE TABLE assessment_note (
    id                      VARCHAR(64)  NOT NULL,
    student_id              VARCHAR(64)  NOT NULL,
    source_type             VARCHAR(30)  NOT NULL,
    source_id               VARCHAR(64)  NOT NULL,
    -- 최신 Revision (조회 편의). 진실은 assessment_note_revision이며 낙관적 잠금으로 함께 바뀐다.
    latest_revision_id      VARCHAR(64)  NOT NULL,
    latest_revision_number  INT          NOT NULL,
    version                 BIGINT       NOT NULL,
    created_at              DATETIME(6)  NOT NULL,
    updated_at              DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    -- 수행평가 하나에 학생 노트 하나 (재시도·중복 클릭으로 노트가 둘 생기지 않게)
    CONSTRAINT uq_assessment_note_source UNIQUE (student_id, source_type, source_id),
    CONSTRAINT fk_assessment_note_sa FOREIGN KEY (source_id) REFERENCES assessment_school_assessment (id),
    CONSTRAINT ck_assessment_note_source_type CHECK (source_type IN ('SCHOOL_ASSESSMENT')),
    CONSTRAINT ck_assessment_note_rev_no CHECK (latest_revision_number >= 1)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE assessment_note_revision (
    id               VARCHAR(64)  NOT NULL,
    note_id          VARCHAR(64)  NOT NULL,
    revision_number  INT          NOT NULL,
    title            VARCHAR(200) NOT NULL,
    -- §20 blocks 전체 본문 (블록 Schema는 Editor 확정 전 문자열 type + attrs, OD-A05)
    blocks_json      JSON         NOT NULL,
    saved_at         DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_assessment_note_rev UNIQUE (note_id, revision_number),
    CONSTRAINT fk_assessment_note_rev_note FOREIGN KEY (note_id) REFERENCES assessment_note (id),
    CONSTRAINT ck_assessment_note_rev_no2 CHECK (revision_number >= 1),
    CONSTRAINT ck_assessment_note_rev_blocks CHECK (JSON_TYPE(blocks_json) = 'ARRAY')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE assessment_artifact (
    id                     VARCHAR(64)  NOT NULL,
    student_id             VARCHAR(64)  NOT NULL,
    source_type            VARCHAR(30)  NOT NULL,
    source_id              VARCHAR(64)  NOT NULL,
    title                  VARCHAR(200) NOT NULL,
    kind                   VARCHAR(50)  NULL,
    latest_version_number  INT          NOT NULL,
    version                BIGINT       NOT NULL,
    created_at             DATETIME(6)  NOT NULL,
    updated_at             DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_assessment_artifact_source (student_id, source_type, source_id),
    CONSTRAINT fk_assessment_artifact_sa FOREIGN KEY (source_id) REFERENCES assessment_school_assessment (id),
    CONSTRAINT ck_assessment_artifact_source_type CHECK (source_type IN ('SCHOOL_ASSESSMENT')),
    CONSTRAINT ck_assessment_artifact_latest CHECK (latest_version_number >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE assessment_artifact_version (
    id              VARCHAR(64)   NOT NULL,
    artifact_id     VARCHAR(64)   NOT NULL,
    version_number  INT           NOT NULL,
    -- 개발용 로컬 Storage의 저장 키(UUID). 원본 파일명은 경로에 쓰지 않는다.
    storage_key     VARCHAR(64)   NOT NULL,
    file_name       VARCHAR(255)  NOT NULL,
    content_type    VARCHAR(100)  NOT NULL,
    size_bytes      BIGINT        NOT NULL,
    sha256          CHAR(64)      NOT NULL,
    change_note     VARCHAR(1000) NULL,
    uploaded_at     DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_assessment_artifact_ver UNIQUE (artifact_id, version_number),
    CONSTRAINT uq_assessment_artifact_ver_storage UNIQUE (storage_key),
    CONSTRAINT fk_assessment_artifact_ver_artifact FOREIGN KEY (artifact_id) REFERENCES assessment_artifact (id),
    CONSTRAINT ck_assessment_artifact_ver_no CHECK (version_number >= 1),
    CONSTRAINT ck_assessment_artifact_ver_size CHECK (size_bytes > 0),
    CONSTRAINT ck_assessment_artifact_ver_sha CHECK (sha256 REGEXP '^[0-9a-f]{64}$')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 피드백 요청 = 요청 당시 Snapshot의 머리. note_revision_id는 요청 시 고정되고 바뀌지 않는다(ADR-0009).
CREATE TABLE assessment_feedback_request (
    id                VARCHAR(64)  NOT NULL,
    student_id        VARCHAR(64)  NOT NULL,
    source_type       VARCHAR(30)  NOT NULL,
    source_id         VARCHAR(64)  NOT NULL,
    note_revision_id  VARCHAR(64)  NOT NULL,
    -- Snapshot 식별 키: SHA-256(noteRevisionId + 정렬한 artifactVersionIds). 같은 Snapshot 재요청은 기존 요청을 돌려준다(중복 생성 방지).
    snapshot_key      CHAR(64)     NOT NULL,
    status            VARCHAR(20)  NOT NULL,
    requested_at      DATETIME(6)  NOT NULL,
    delivered_at      DATETIME(6)  NULL,
    version           BIGINT       NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_assessment_fb_snapshot UNIQUE (student_id, snapshot_key),
    INDEX idx_assessment_fb_status (status, requested_at),
    INDEX idx_assessment_fb_student (student_id, requested_at),
    CONSTRAINT fk_assessment_fb_sa FOREIGN KEY (source_id) REFERENCES assessment_school_assessment (id),
    CONSTRAINT fk_assessment_fb_note_rev FOREIGN KEY (note_revision_id) REFERENCES assessment_note_revision (id),
    CONSTRAINT ck_assessment_fb_source_type CHECK (source_type IN ('SCHOOL_ASSESSMENT')),
    CONSTRAINT ck_assessment_fb_status CHECK (status IN ('PENDING', 'DELIVERED')),
    CONSTRAINT ck_assessment_fb_delivered CHECK ((status = 'DELIVERED') = (delivered_at IS NOT NULL))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Snapshot에 고정한 결과물 버전 (불변, 요청 시 함께 INSERT만)
CREATE TABLE assessment_feedback_snapshot (
    request_id           VARCHAR(64) NOT NULL,
    artifact_version_id  VARCHAR(64) NOT NULL,
    position             INT         NOT NULL,
    PRIMARY KEY (request_id, artifact_version_id),
    CONSTRAINT fk_assessment_fb_snap_req FOREIGN KEY (request_id) REFERENCES assessment_feedback_request (id),
    CONSTRAINT fk_assessment_fb_snap_ver FOREIGN KEY (artifact_version_id) REFERENCES assessment_artifact_version (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 관리자 답변: 초안(DRAFT, 학생에게 안 보임)과 전달(DELIVERED, 이후 변경 불가)을 한 행에서 상태로 구분 (§45)
CREATE TABLE assessment_feedback_reply (
    request_id            VARCHAR(64)  NOT NULL,
    admin_id              VARCHAR(64)  NOT NULL,
    state                 VARCHAR(20)  NOT NULL,
    overall_comment       TEXT         NOT NULL,
    comments_json         JSON         NOT NULL,
    recommendations_json  JSON         NOT NULL,
    draft_saved_at        DATETIME(6)  NOT NULL,
    delivered_at          DATETIME(6)  NULL,
    version               BIGINT       NOT NULL,
    PRIMARY KEY (request_id),
    CONSTRAINT fk_assessment_fb_reply_req FOREIGN KEY (request_id) REFERENCES assessment_feedback_request (id),
    CONSTRAINT ck_assessment_fb_reply_state CHECK (state IN ('DRAFT', 'DELIVERED')),
    CONSTRAINT ck_assessment_fb_reply_delivered CHECK ((state = 'DELIVERED') = (delivered_at IS NOT NULL)),
    CONSTRAINT ck_assessment_fb_reply_comments CHECK (JSON_TYPE(comments_json) = 'ARRAY'),
    CONSTRAINT ck_assessment_fb_reply_recs CHECK (JSON_TYPE(recommendations_json) = 'ARRAY')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE assessment_growth_record (
    id                    VARCHAR(64)   NOT NULL,
    student_id            VARCHAR(64)   NOT NULL,
    title                 VARCHAR(200)  NOT NULL,
    subject_id            VARCHAR(64)   NULL,
    activity_start_date   DATE          NULL,
    role                  VARCHAR(2000) NULL,
    motivation            TEXT          NULL,
    process               TEXT          NULL,
    contribution          TEXT          NULL,
    difficulty            TEXT          NULL,
    solution              TEXT          NULL,
    outcome               TEXT          NULL,
    reflection            TEXT          NULL,
    follow_up             TEXT          NULL,
    related_source_type   VARCHAR(30)   NULL,
    related_source_id     VARCHAR(64)   NULL,
    artifact_ids_json     JSON          NOT NULL,
    version               BIGINT        NOT NULL,
    created_at            DATETIME(6)   NOT NULL,
    updated_at            DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_assessment_growth_student (student_id, updated_at),
    CONSTRAINT fk_assessment_growth_sa FOREIGN KEY (related_source_id) REFERENCES assessment_school_assessment (id),
    CONSTRAINT ck_assessment_growth_related CHECK (
        (related_source_type IS NULL AND related_source_id IS NULL)
        OR (related_source_type = 'SCHOOL_ASSESSMENT' AND related_source_id IS NOT NULL)),
    CONSTRAINT ck_assessment_growth_artifacts CHECK (JSON_TYPE(artifact_ids_json) = 'ARRAY')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 자료: 학생 개인 자료(STUDENT, 항상 비공개)와 관리자 자료(ADMIN, 기본 비공개 → 공개 시 학생 조회)를 owner_type으로 구분
CREATE TABLE assessment_resource (
    id              VARCHAR(64)   NOT NULL,
    owner_type      VARCHAR(20)   NOT NULL,
    owner_id        VARCHAR(64)   NOT NULL,
    type            VARCHAR(50)   NOT NULL,
    title           VARCHAR(200)  NOT NULL,
    source_name     VARCHAR(200)  NULL,
    source_url      VARCHAR(2000) NULL,
    author          VARCHAR(200)  NULL,
    published_date  DATE          NULL,
    memo            VARCHAR(2000) NULL,
    -- 관련 과목 ID 목록 (§43 subjectIds). 학생 자료는 비어 있을 수 있다.
    subject_ids_json JSON         NOT NULL,
    -- 추천 자료원에서 저장한 경우 그 자료원 ID (§43 referenceSourceId, 관리자 자료)
    reference_source_id VARCHAR(64) NULL,
    tags_json       JSON          NOT NULL,
    visibility      VARCHAR(20)   NOT NULL,
    published_at    DATETIME(6)   NULL,
    version         BIGINT        NOT NULL,
    created_at      DATETIME(6)   NOT NULL,
    updated_at      DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_assessment_resource_owner (owner_type, owner_id, updated_at),
    INDEX idx_assessment_resource_public (visibility, published_at),
    CONSTRAINT ck_assessment_resource_owner CHECK (owner_type IN ('STUDENT', 'ADMIN')),
    CONSTRAINT ck_assessment_resource_visibility CHECK (visibility IN ('PRIVATE', 'PUBLISHED')),
    -- 학생 자료는 공개하지 않는다(§22 "학생 스크랩은 본인 비공개가 기본")
    CONSTRAINT ck_assessment_resource_student_private CHECK (owner_type = 'ADMIN' OR visibility = 'PRIVATE'),
    CONSTRAINT ck_assessment_resource_published CHECK ((visibility = 'PUBLISHED') = (published_at IS NOT NULL)),
    CONSTRAINT ck_assessment_resource_tags CHECK (JSON_TYPE(tags_json) = 'ARRAY'),
    CONSTRAINT ck_assessment_resource_subjects CHECK (JSON_TYPE(subject_ids_json) = 'ARRAY')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 중요 표시 (§30). 이번 범위는 학교 수행평가만 (기존 계약 예시 = SCHOOL_ASSESSMENT)
CREATE TABLE assessment_favorite (
    student_id   VARCHAR(64) NOT NULL,
    source_type  VARCHAR(30) NOT NULL,
    source_id    VARCHAR(64) NOT NULL,
    created_at   DATETIME(6) NOT NULL,
    PRIMARY KEY (student_id, source_type, source_id),
    CONSTRAINT fk_assessment_favorite_sa FOREIGN KEY (source_id) REFERENCES assessment_school_assessment (id),
    CONSTRAINT ck_assessment_favorite_type CHECK (source_type IN ('SCHOOL_ASSESSMENT'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
