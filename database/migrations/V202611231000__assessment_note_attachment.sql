-- A28-41 (2026-11-23, api-contract §26-1 DRAFT): 탐구 노트 이미지·파일 블록의 실제 파일 저장.
-- 바이트는 결과물과 같은 격리 Storage(UUID 저장 키)에 두고, 이 표에는 필요 최소 메타데이터만 둔다.
-- 행은 불변이다(덮어쓰기·삭제 경로 없음): 학생이 파일을 바꾸면 새 행이 생기고, 피드백 Snapshot 이 가리키던 이전 파일은 남는다.
-- 추가형(새 표)만 한다. 기존 표·행은 바꾸지 않는다.
CREATE TABLE assessment_note_attachment (
    id            VARCHAR(64)  NOT NULL,
    student_id    VARCHAR(64)  NOT NULL,
    storage_key   VARCHAR(64)  NOT NULL,
    file_name     VARCHAR(255) NOT NULL,
    content_type  VARCHAR(100) NOT NULL,
    size_bytes    BIGINT       NOT NULL,
    sha256        CHAR(64)     NOT NULL,
    uploaded_at   DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_assessment_note_attachment_storage UNIQUE (storage_key),
    CONSTRAINT ck_assessment_note_attachment_size CHECK (size_bytes > 0),
    INDEX ix_assessment_note_attachment_student (student_id, uploaded_at)
);
