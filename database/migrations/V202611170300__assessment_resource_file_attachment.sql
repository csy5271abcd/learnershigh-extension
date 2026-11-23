-- A27-UX (2026-11-17) 학생 자료함 파일 첨부 (PDF·HWP·HWPX·DOC(X)·XLS(X)·PPT(X)·JPG·PNG·GIF·WEBP).
-- 파일 바이트는 결과물과 같은 격리 Storage(ArtifactStorage, 저장 키만 DB에 둔다)에 원본 그대로 보관한다(GIF 애니메이션 보존).
-- 형식은 서버가 확장자 + 파일 서명으로 정한다(클라이언트 Content-Type을 믿지 않음). 학생 자료는 본인만 열람한다.
-- 첨부 삭제는 연결만 비운다(저장 바이트는 보상 삭제 외에는 지우지 않는다 — 운영 보존 정책은 별도 결정).

ALTER TABLE assessment_resource
    ADD COLUMN file_storage_key VARCHAR(64) NULL,
    ADD COLUMN file_name VARCHAR(255) NULL,
    ADD COLUMN file_content_type VARCHAR(120) NULL,
    ADD COLUMN file_size_bytes BIGINT NULL,
    ADD COLUMN file_sha256 CHAR(64) NULL,
    ADD COLUMN file_uploaded_at DATETIME(6) NULL,
    ADD CONSTRAINT ck_assessment_resource_file
        CHECK ((file_storage_key IS NULL AND file_name IS NULL AND file_content_type IS NULL AND file_size_bytes IS NULL
                AND file_sha256 IS NULL AND file_uploaded_at IS NULL)
            OR (file_storage_key IS NOT NULL AND file_name IS NOT NULL AND file_content_type IS NOT NULL
                AND file_size_bytes IS NOT NULL AND file_sha256 IS NOT NULL AND file_uploaded_at IS NOT NULL));
