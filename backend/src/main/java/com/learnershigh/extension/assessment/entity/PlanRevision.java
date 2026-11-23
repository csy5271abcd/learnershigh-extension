package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * 평가계획서 문서의 한 Revision (원본 파일 메타데이터). 등록 뒤 파일 정보는 바뀌지 않는다.
 * fileRef: 원문 바이트의 Storage 저장 키(2026-11-13 S-4·S-5 승인 이후 등록분). 그 이전 등록분은 원문을 보관하지 않아 null이며,
 * 다른 파일을 만들어 연결하지 않는다(원문 없음으로 응답). 저장 키는 API 응답에 그대로 내보내지 않는다.
 */
@Entity
@Table(name = "assessment_plan_revision")
public class PlanRevision {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "plan_id", nullable = false, length = 64, updatable = false)
    private String planId;

    @Column(name = "revision_number", nullable = false, updatable = false)
    private int revisionNumber;

    @Column(name = "file_name", nullable = false, length = 200, updatable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100, updatable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private long sizeBytes;

    @Column(name = "sha256", nullable = false, length = 64, updatable = false)
    private String sha256;

    @Column(name = "page_count", updatable = false)
    private Integer pageCount;

    @Column(name = "file_ref", length = 64, updatable = false)
    private String fileRef;

    @Column(name = "source_url", length = 1000, updatable = false)
    private String sourceUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 20)
    private PlanReviewStatus reviewStatus;

    @Column(name = "uploaded_by", nullable = false, length = 64, updatable = false)
    private String uploadedBy;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    protected PlanRevision() {
    }

    public static PlanRevision upload(String planId, int revisionNumber, String fileName, String contentType,
            long sizeBytes, String sha256, Integer pageCount, String storageKey, String sourceUrl, String adminId,
            Instant now) {
        PlanRevision revision = new PlanRevision();
        revision.id = "plan_rev_" + UUID.randomUUID();
        revision.planId = planId;
        revision.revisionNumber = revisionNumber;
        revision.fileName = fileName;
        revision.contentType = contentType;
        revision.sizeBytes = sizeBytes;
        revision.sha256 = sha256;
        revision.pageCount = pageCount;
        revision.fileRef = storageKey;
        revision.sourceUrl = sourceUrl;
        revision.reviewStatus = PlanReviewStatus.UNREVIEWED;
        revision.uploadedBy = adminId;
        revision.uploadedAt = now;
        return revision;
    }

    /** 관리자 검토 확정. Service가 사람의 검토 요청과 분석 결과 검증을 마친 뒤에만 부른다. */
    public void markConfirmed() {
        this.reviewStatus = PlanReviewStatus.CONFIRMED;
    }

    public boolean isConfirmed() {
        return reviewStatus == PlanReviewStatus.CONFIRMED;
    }

    public String id() {
        return id;
    }

    public String planId() {
        return planId;
    }

    public int revisionNumber() {
        return revisionNumber;
    }

    public String fileName() {
        return fileName;
    }

    public long sizeBytes() {
        return sizeBytes;
    }

    public String sha256() {
        return sha256;
    }

    /** 원본 형식 (content_type에서). 기존 행은 모두 PDF다. */
    public PlanDocumentFormat format() {
        return PlanDocumentFormat.fromContentType(contentType);
    }

    public Integer pageCount() {
        return pageCount;
    }

    /** Storage 저장 키 (원문이 없으면 null). 응답에는 내보내지 않는다. */
    public String fileRef() {
        return fileRef;
    }

    /** 원문 바이트를 보관하고 있는가 (S-4 이전 등록분은 false). */
    public boolean hasStoredFile() {
        return fileRef != null;
    }

    public String contentType() {
        return contentType;
    }

    public String sourceUrl() {
        return sourceUrl;
    }

    public PlanReviewStatus reviewStatus() {
        return reviewStatus;
    }

    public Instant uploadedAt() {
        return uploadedAt;
    }
}
