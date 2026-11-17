-- 신규 Assessment: 학교 평가계획서 (docs/specs/suyeon/domain.md §9-0, api-contract.md §10·§38·§39)
-- 사용자 승인(2026-11-09): Assessment 전용 신규 Migration 추가.
-- 계층: ① 원본(Plan 슬롯 + Revision) ② AI 결과(AnalysisRun) ④ 관리자 확정(Review + ConfirmedValue).
-- ③ 근거·검증은 AnalysisRun의 결과 JSON 안에 후보별로 보존한다. ⑤ 학생 개인 정정은 이번 범위가 아니다.
-- 원본 PDF 바이트 저장은 File Storage 미결(API-OD-A03 / OD-A07)이라 하지 않는다: file_ref는 NULL, SHA-256·크기·쪽수만 남긴다.
-- 분석 상태 / 검토 상태 값은 api-contract.md §38·§11 예시에 나온 값만 쓴다.

CREATE TABLE assessment_evaluation_plan (
    id            VARCHAR(64) NOT NULL,
    school_id     VARCHAR(64) NOT NULL,
    academic_year INT         NOT NULL,
    grade         INT         NOT NULL,
    semester      INT         NOT NULL,
    -- 마지막 Revision 순번. version(낙관적 잠금)과 함께 동시 개정 등록에서 같은 순번이 생기지 않게 한다.
    revision_count INT        NOT NULL,
    created_by    VARCHAR(64) NOT NULL,
    created_at    DATETIME(6) NOT NULL,
    version       BIGINT      NOT NULL,
    PRIMARY KEY (id),
    -- 한 학교·학년도·학년·학기 슬롯에 여러 문서(Plan)를 허용한다 (§38). Unique 제약을 두지 않는다.
    INDEX idx_assessment_plan_slot (school_id, academic_year, grade, semester)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE assessment_plan_revision (
    id               VARCHAR(64)   NOT NULL,
    plan_id          VARCHAR(64)   NOT NULL,
    revision_number  INT           NOT NULL,
    file_name        VARCHAR(200)  NOT NULL,
    content_type     VARCHAR(100)  NOT NULL,
    size_bytes       BIGINT        NOT NULL,
    sha256           CHAR(64)      NOT NULL,
    page_count       INT           NULL,
    file_ref         VARCHAR(64)   NULL,
    source_url       VARCHAR(1000) NULL,
    review_status    VARCHAR(20)   NOT NULL,
    uploaded_by      VARCHAR(64)   NOT NULL,
    uploaded_at      DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    -- Revision은 덮어쓰지 않고 순번으로 쌓는다. 같은 순번이 두 번 생기지 않게 DB에서도 막는다.
    CONSTRAINT uk_assessment_plan_revision_number UNIQUE (plan_id, revision_number),
    CONSTRAINT fk_assessment_plan_revision_plan FOREIGN KEY (plan_id) REFERENCES assessment_evaluation_plan (id),
    CONSTRAINT ck_assessment_plan_revision_review CHECK (review_status IN ('UNREVIEWED', 'CONFIRMED'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE assessment_plan_analysis_run (
    id               VARCHAR(64)  NOT NULL,
    revision_id      VARCHAR(64)  NOT NULL,
    status           VARCHAR(30)  NOT NULL,
    -- 결과를 만든 쪽. 외부 분석기 수신은 EXTERNAL_IMPORT. (분석기 내부 신뢰도·채점 모델은 저장하지 않는다)
    origin           VARCHAR(30)  NOT NULL,
    analyzer_name    VARCHAR(100) NOT NULL,
    analyzer_version VARCHAR(50)  NOT NULL,
    -- 같은 Revision에 같은 결과를 다시 보내면 새 Run을 만들지 않는다 (재시도 중복 방지).
    payload_sha256   CHAR(64)     NOT NULL,
    result_json      LONGTEXT     NOT NULL,
    warnings_json    TEXT         NOT NULL,
    received_by      VARCHAR(64)  NOT NULL,
    received_at      DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_assessment_plan_analysis_payload UNIQUE (revision_id, payload_sha256),
    CONSTRAINT fk_assessment_plan_analysis_revision FOREIGN KEY (revision_id) REFERENCES assessment_plan_revision (id),
    CONSTRAINT ck_assessment_plan_analysis_status CHECK (status IN ('REVIEW_REQUIRED', 'FAILED')),
    INDEX idx_assessment_plan_analysis_revision (revision_id, received_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 관리자 검토 기록. 사람이 PUT .../review를 호출했을 때만 생긴다 (AI 결과가 자동으로 만들지 않는다).
CREATE TABLE assessment_plan_review (
    id           VARCHAR(64) NOT NULL,
    revision_id  VARCHAR(64) NOT NULL,
    analysis_id  VARCHAR(64) NOT NULL,
    decision     VARCHAR(20) NOT NULL,
    reviewed_by  VARCHAR(64) NOT NULL,
    reviewed_at  DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_assessment_plan_review_revision FOREIGN KEY (revision_id) REFERENCES assessment_plan_revision (id),
    CONSTRAINT fk_assessment_plan_review_analysis FOREIGN KEY (analysis_id) REFERENCES assessment_plan_analysis_run (id),
    CONSTRAINT ck_assessment_plan_review_decision CHECK (decision IN ('CONFIRM')),
    INDEX idx_assessment_plan_review_revision (revision_id, reviewed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 관리자가 원문 대조 후 확인한 값 (§39 confirmedFields). value_json은 JSON 표현 그대로 (null 허용 = 원문에 없음).
CREATE TABLE assessment_plan_confirmed_value (
    id              VARCHAR(64)   NOT NULL,
    review_id       VARCHAR(64)   NOT NULL,
    revision_id     VARCHAR(64)   NOT NULL,
    subject_id      VARCHAR(64)   NOT NULL,
    field_path      VARCHAR(300)  NOT NULL,
    value_json      VARCHAR(4000) NULL,
    pdf_page_number INT           NULL,
    position        INT           NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_assessment_plan_confirmed_review FOREIGN KEY (review_id) REFERENCES assessment_plan_review (id),
    INDEX idx_assessment_plan_confirmed_revision (revision_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
