package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * A27-UX 수행평가 안내문 첨부(api-contract '§12-c', 2026-11-19 DRAFT). 학생 개인 파일(PDF·이미지)이다.
 * 바이트는 격리 Storage에 원본 그대로, 여기에는 저장 키·메타데이터만 둔다. 삭제는 deletedAt만 남긴다(바이트 보존).
 */
@Entity
@Table(name = "assessment_notice_file")
public class NoticeFile {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "assessment_id", nullable = false, length = 64, updatable = false)
    private String assessmentId;

    @Column(name = "student_id", nullable = false, length = 64, updatable = false)
    private String studentId;

    @Column(name = "storage_key", nullable = false, length = 64, updatable = false)
    private String storageKey;

    @Column(name = "file_name", nullable = false, length = 255, updatable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 120, updatable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private long sizeBytes;

    @Column(name = "sha256", nullable = false, length = 64, updatable = false)
    private String sha256;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected NoticeFile() {
    }

    public static NoticeFile attach(String assessmentId, String studentId, String storageKey, String fileName,
            String contentType, long sizeBytes, String sha256, Instant now) {
        NoticeFile file = new NoticeFile();
        file.id = "notice_" + UUID.randomUUID();
        file.assessmentId = Objects.requireNonNull(assessmentId);
        file.studentId = Objects.requireNonNull(studentId);
        file.storageKey = Objects.requireNonNull(storageKey);
        file.fileName = Objects.requireNonNull(fileName);
        file.contentType = Objects.requireNonNull(contentType);
        file.sizeBytes = sizeBytes;
        file.sha256 = Objects.requireNonNull(sha256);
        file.uploadedAt = now;
        return file;
    }

    /** 목록에서 뺀다(같은 요청 반복은 변경 없음). 바이트는 지우지 않는다 */
    public void remove(Instant now) {
        if (deletedAt == null) {
            deletedAt = now;
        }
    }

    public String id() {
        return id;
    }

    public String assessmentId() {
        return assessmentId;
    }

    public String studentId() {
        return studentId;
    }

    public String storageKey() {
        return storageKey;
    }

    public String fileName() {
        return fileName;
    }

    public String contentType() {
        return contentType;
    }

    public long sizeBytes() {
        return sizeBytes;
    }

    public String sha256() {
        return sha256;
    }

    public Instant uploadedAt() {
        return uploadedAt;
    }

    public Instant deletedAt() {
        return deletedAt;
    }
}
