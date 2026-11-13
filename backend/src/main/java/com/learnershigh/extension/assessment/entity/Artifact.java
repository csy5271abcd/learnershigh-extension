package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/** 결과물 하나 (api-contract.md §24). 버전 번호는 이 결과물 안에서만 증가한다(§25). */
@Entity
@Table(name = "assessment_artifact")
public class Artifact {

    public static final int TITLE_MAX = 200;

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "student_id", nullable = false, length = 64, updatable = false)
    private String studentId;

    @Column(name = "source_type", nullable = false, length = 30, updatable = false)
    private String sourceType;

    @Column(name = "source_id", nullable = false, length = 64, updatable = false)
    private String sourceId;

    @Column(name = "title", nullable = false, length = TITLE_MAX)
    private String title;

    @Column(name = "kind", length = 50)
    private String kind;

    @Column(name = "latest_version_number", nullable = false)
    private int latestVersionNumber;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Artifact() {
    }

    public static Artifact create(String studentId, String sourceType, String sourceId, String title, String kind,
            Instant now) {
        Artifact artifact = new Artifact();
        artifact.id = "artifact_" + UUID.randomUUID();
        artifact.studentId = studentId;
        artifact.sourceType = sourceType;
        artifact.sourceId = sourceId;
        artifact.title = title;
        artifact.kind = kind;
        artifact.latestVersionNumber = 0;
        artifact.createdAt = now;
        artifact.updatedAt = now;
        return artifact;
    }

    /** 다음 버전 번호를 예약한다. 같은 Transaction에서 ArtifactVersion을 저장하지 못하면 함께 롤백된다. */
    public int nextVersionNumber(Instant now) {
        latestVersionNumber += 1;
        updatedAt = now;
        return latestVersionNumber;
    }

    public String id() {
        return id;
    }

    public String studentId() {
        return studentId;
    }

    public String sourceType() {
        return sourceType;
    }

    public String sourceId() {
        return sourceId;
    }

    public String title() {
        return title;
    }

    public String kind() {
        return kind;
    }

    public int latestVersionNumber() {
        return latestVersionNumber;
    }

    // ---- 휴지통 (소프트 삭제, V202611111620). 하위 Revision·Version·파일은 건드리지 않는다 ----

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_by", length = 64)
    private String deletedBy;

    /** 휴지통으로 옮긴다. 이미 휴지통이면 그대로(재시도 안전). */
    public void moveToTrash(String actorId, Instant now) {
        if (deletedAt != null) {
            return;
        }
        this.deletedAt = now;
        this.deletedBy = actorId;
    }

    /** 원래 자리로 복원한다(ID·내용 그대로). */
    public void restoreFromTrash() {
        this.deletedAt = null;
        this.deletedBy = null;
    }

    public boolean inTrash() {
        return deletedAt != null;
    }

    public Instant deletedAt() {
        return deletedAt;
    }
}
