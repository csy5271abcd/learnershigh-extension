-- A5 (2026-11-14 사용자 승인): 관리자 공유 검토 초안. 같은 분석 결과(AnalysisRun)를 검토하는 관리자들이 하나의 초안을 쓴다.
-- 초안은 학생 공개가 아니다: 분석 후보(assessment_plan_analysis_run) · 검토 초안(이 테이블) · 확정값(assessment_plan_review/confirmed_value)은 서로 다른 데이터다.
-- 기존 Migration·테이블은 바꾸지 않는다.

CREATE TABLE assessment_plan_review_draft (
    id               VARCHAR(64)  NOT NULL,
    revision_id      VARCHAR(64)  NOT NULL,
    -- 초안은 분석 결과 하나에 묶인다. 재분석으로 새 Run이 생기면 이전 초안은 보존만 하고 새 결과에 적용하지 않는다.
    analysis_id      VARCHAR(64)  NOT NULL,
    -- 초안을 만들 때의 원문 SHA-256과 분석기 버전 (변경 감지·추적용)
    source_sha256    CHAR(64)     NOT NULL,
    analyzer_version VARCHAR(50)  NOT NULL,
    status           VARCHAR(20)  NOT NULL,
    closed_reason    VARCHAR(30)  NULL,
    -- {"decisions":[{subjectIndex, fieldPath, decision, value, pdfPageNumber, candidate}], "subjectLinks":[{subjectIndex, subjectId}]}
    payload_json     MEDIUMTEXT   NOT NULL,
    decision_count   INT          NOT NULL,
    version          BIGINT       NOT NULL,
    created_by       VARCHAR(64)  NOT NULL,
    created_at       DATETIME(6)  NOT NULL,
    updated_by       VARCHAR(64)  NOT NULL,
    updated_at       DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_assessment_plan_review_draft_analysis UNIQUE (analysis_id),
    CONSTRAINT fk_assessment_plan_review_draft_revision FOREIGN KEY (revision_id) REFERENCES assessment_plan_revision (id),
    CONSTRAINT fk_assessment_plan_review_draft_analysis FOREIGN KEY (analysis_id) REFERENCES assessment_plan_analysis_run (id),
    CONSTRAINT ck_assessment_plan_review_draft_status CHECK (status IN ('ACTIVE', 'CLOSED')),
    CONSTRAINT ck_assessment_plan_review_draft_closed CHECK ((status = 'ACTIVE' AND closed_reason IS NULL)
        OR (status = 'CLOSED' AND closed_reason IN ('CONFIRMED'))),
    INDEX idx_assessment_plan_review_draft_revision (revision_id, updated_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 저장 기록: 누가 언제 어떤 필드를 바꿨는지 (관리자별 작업 기록). 초안 본문은 덮어써도 기록은 남는다.
CREATE TABLE assessment_plan_review_draft_event (
    id                 VARCHAR(64) NOT NULL,
    draft_id           VARCHAR(64) NOT NULL,
    draft_version      BIGINT      NOT NULL,
    saved_by           VARCHAR(64) NOT NULL,
    saved_at           DATETIME(6) NOT NULL,
    changed_count      INT         NOT NULL,
    changed_paths_json TEXT        NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_assessment_plan_review_draft_event_draft FOREIGN KEY (draft_id) REFERENCES assessment_plan_review_draft (id),
    INDEX idx_assessment_plan_review_draft_event_draft (draft_id, saved_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
