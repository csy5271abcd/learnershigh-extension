-- A27-UX 학생 화면 개선 (2026-11-19 DRAFT, api-contract.md 'A27-UX 학생 화면 개선 추가 계약').
-- 모두 추가(additive)만 한다. 기존 Migration·열은 바꾸지 않는다. 학생 본인 데이터만 담는다(학교·관리자 공식 데이터 아님).

-- §12-b 평가 유형 '기타' 직접 입력 (assessment_type = 'OTHER'일 때만 값이 있다)
ALTER TABLE assessment_school_assessment
    ADD COLUMN assessment_type_label VARCHAR(50) NULL;

-- §12-a·§9-1-a 학생이 수행평가 등록과 함께 더한 개인 수강 과목.
-- subject_id는 같은 학기 공통 과목 후보의 기존 ID(재사용)이거나 학생 소유 개인 과목 ID(psubj_…)다.
-- 학교 공식 개설·수강 원천 목록은 바꾸지 않는다(이 표는 학생 개인 목록에 덧붙이는 기록이다).
CREATE TABLE assessment_student_subject (
    id            VARCHAR(64)  NOT NULL,
    student_id    VARCHAR(64)  NOT NULL,
    academic_year INT          NOT NULL,
    semester      INT          NOT NULL,
    subject_id    VARCHAR(64)  NOT NULL,
    name          VARCHAR(50)  NOT NULL,
    name_key      VARCHAR(50)  NOT NULL,
    created_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_assessment_student_subject_name UNIQUE (student_id, academic_year, semester, name_key),
    CONSTRAINT uk_assessment_student_subject_id UNIQUE (student_id, academic_year, semester, subject_id)
);

-- §30-a 학생 홈 메모 (학생 한 명당 하나, 본인만)
CREATE TABLE assessment_home_memo (
    student_id VARCHAR(64)   NOT NULL,
    body       VARCHAR(2000) NULL,
    version    BIGINT        NOT NULL,
    updated_at DATETIME(6)   NOT NULL,
    PRIMARY KEY (student_id)
);

-- §12-c 수행평가 안내문 첨부 (PDF·이미지). 바이트는 결과물과 같은 격리 Storage에 원본 그대로, DB에는 저장 키만 둔다.
-- 삭제는 deleted_at만 남긴다(바이트 보존 — 운영 보존 정책은 별도 결정).
CREATE TABLE assessment_notice_file (
    id            VARCHAR(64)  NOT NULL,
    assessment_id VARCHAR(64)  NOT NULL,
    student_id    VARCHAR(64)  NOT NULL,
    storage_key   VARCHAR(64)  NOT NULL,
    file_name     VARCHAR(255) NOT NULL,
    content_type  VARCHAR(120) NOT NULL,
    size_bytes    BIGINT       NOT NULL,
    sha256        CHAR(64)     NOT NULL,
    uploaded_at   DATETIME(6)  NOT NULL,
    deleted_at    DATETIME(6)  NULL,
    PRIMARY KEY (id),
    INDEX ix_assessment_notice_file_owner (assessment_id, student_id)
);
