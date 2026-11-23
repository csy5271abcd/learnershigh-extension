package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * 탐구 노트 이미지·파일 블록의 실제 파일 (api-contract.md §26-1, A28-41). **불변**: 바꾸거나 지우지 않는다.
 * 노트 Revision 의 블록 attrs.file.attachmentId 가 이 행을 가리킨다(노트 Revision 도 불변이라 피드백 Snapshot 의 파일이 유지된다).
 */
@Entity
@Table(name = "assessment_note_attachment")
public class NoteAttachment {

    @Id
    @Column(name = "id", length = 64, updatable = false)
    private String id;

    @Column(name = "student_id", nullable = false, length = 64, updatable = false)
    private String studentId;

    @Column(name = "storage_key", nullable = false, length = 64, updatable = false)
    private String storageKey;

    @Column(name = "file_name", nullable = false, length = 255, updatable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100, updatable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private long sizeBytes;

    @Column(name = "sha256", nullable = false, length = 64, updatable = false)
    private String sha256;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    protected NoteAttachment() {
    }

    public static NoteAttachment of(String studentId, String storageKey, String fileName, String contentType,
            long sizeBytes, String sha256, Instant uploadedAt) {
        NoteAttachment attachment = new NoteAttachment();
        attachment.id = "noteatt_" + UUID.randomUUID();
        attachment.studentId = studentId;
        attachment.storageKey = storageKey;
        attachment.fileName = fileName;
        attachment.contentType = contentType;
        attachment.sizeBytes = sizeBytes;
        attachment.sha256 = sha256;
        attachment.uploadedAt = uploadedAt;
        return attachment;
    }

    public String id() {
        return id;
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
}
