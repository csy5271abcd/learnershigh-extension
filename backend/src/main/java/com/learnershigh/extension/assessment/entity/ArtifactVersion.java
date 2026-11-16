package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** 결과물의 한 파일 버전 (api-contract.md §25). **불변**: 이전 버전은 바꾸거나 덮어쓰지 않는다. */
@Entity
@Table(name = "assessment_artifact_version")
public class ArtifactVersion {

    @Id
    @Column(name = "id", length = 64, updatable = false)
    private String id;

    @Column(name = "artifact_id", nullable = false, length = 64, updatable = false)
    private String artifactId;

    @Column(name = "version_number", nullable = false, updatable = false)
    private int versionNumber;

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

    @Column(name = "change_note", length = 1000, updatable = false)
    private String changeNote;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    protected ArtifactVersion() {
    }

    public static ArtifactVersion of(String artifactId, int versionNumber, String storageKey, String fileName,
            String contentType, long sizeBytes, String sha256, String changeNote, Instant uploadedAt) {
        ArtifactVersion version = new ArtifactVersion();
        version.id = "version_" + UUID.randomUUID();
        version.artifactId = artifactId;
        version.versionNumber = versionNumber;
        version.storageKey = storageKey;
        version.fileName = fileName;
        version.contentType = contentType;
        version.sizeBytes = sizeBytes;
        version.sha256 = sha256;
        version.changeNote = changeNote;
        version.uploadedAt = uploadedAt;
        return version;
    }

    public String id() {
        return id;
    }

    public String artifactId() {
        return artifactId;
    }

    public int versionNumber() {
        return versionNumber;
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

    public String changeNote() {
        return changeNote;
    }

    public Instant uploadedAt() {
        return uploadedAt;
    }
}
