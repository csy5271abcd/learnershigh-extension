package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 자료 (api-contract.md §22 학생 자료함, §43 관리자 참고자료실). 학생 자료는 항상 본인 비공개(PRIVATE)이고,
 * 관리자 자료는 기본 비공개 → 공개(PUBLISHED)한 것만 학생이 조회한다. 정적 심화 탐구 카탈로그와는 별개다.
 */
@Entity
@Table(name = "assessment_resource")
public class AssessmentResource {

    public static final String OWNER_STUDENT = "STUDENT";
    public static final String OWNER_ADMIN = "ADMIN";
    public static final String PRIVATE = "PRIVATE";
    public static final String PUBLISHED = "PUBLISHED";

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "owner_type", nullable = false, length = 20, updatable = false)
    private String ownerType;

    @Column(name = "owner_id", nullable = false, length = 64, updatable = false)
    private String ownerId;

    @Column(name = "type", nullable = false, length = 50)
    private String type;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "source_name", length = 200)
    private String sourceName;

    @Column(name = "source_url", length = 2000)
    private String sourceUrl;

    @Column(name = "author", length = 200)
    private String author;

    @Column(name = "published_date")
    private LocalDate publishedDate;

    @Column(name = "memo", length = 2000)
    private String memo;

    @Column(name = "subject_ids_json", nullable = false, columnDefinition = "JSON")
    private String subjectIdsJson;

    @Column(name = "reference_source_id", length = 64)
    private String referenceSourceId;

    @Column(name = "tags_json", nullable = false, columnDefinition = "JSON")
    private String tagsJson;

    @Column(name = "visibility", nullable = false, length = 20)
    private String visibility;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AssessmentResource() {
    }

    public static AssessmentResource create(String ownerType, String ownerId, Fields fields, Instant now) {
        AssessmentResource resource = new AssessmentResource();
        resource.id = (OWNER_ADMIN.equals(ownerType) ? "scrap_" : "resource_") + UUID.randomUUID();
        resource.ownerType = ownerType;
        resource.ownerId = ownerId;
        resource.visibility = PRIVATE;
        resource.createdAt = now;
        resource.apply(fields, now);
        return resource;
    }

    public void apply(Fields f, Instant now) {
        type = f.type();
        title = f.title();
        sourceName = f.sourceName();
        sourceUrl = f.sourceUrl();
        author = f.author();
        publishedDate = f.publishedDate();
        memo = f.memo();
        subjectIdsJson = f.subjectIdsJson();
        referenceSourceId = f.referenceSourceId();
        tagsJson = f.tagsJson();
        updatedAt = now;
    }

    /** 관리자 자료만 공개할 수 있다(학생 자료는 DB CHECK로도 막는다). */
    public void setPublished(boolean published, Instant now) {
        if (!OWNER_ADMIN.equals(ownerType)) {
            throw new IllegalStateException("student resources are always private");
        }
        visibility = published ? PUBLISHED : PRIVATE;
        publishedAt = published ? now : null;
        updatedAt = now;
    }

    public record Fields(String type, String title, String sourceName, String sourceUrl, String author,
            LocalDate publishedDate, String memo, String subjectIdsJson, String referenceSourceId, String tagsJson) {
    }

    public Fields fields() {
        return new Fields(type, title, sourceName, sourceUrl, author, publishedDate, memo, subjectIdsJson, referenceSourceId,
                tagsJson);
    }

    public String id() {
        return id;
    }

    public String ownerType() {
        return ownerType;
    }

    public String ownerId() {
        return ownerId;
    }

    public boolean isPublished() {
        return PUBLISHED.equals(visibility);
    }

    public Instant publishedAt() {
        return publishedAt;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
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
