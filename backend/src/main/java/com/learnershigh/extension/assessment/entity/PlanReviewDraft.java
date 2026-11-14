package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Persistable;

/**
 * 관리자 공유 검토 초안 (A5, 2026-11-14). 같은 분석 결과(AnalysisRun)를 검토하는 관리자들이 하나의 초안을 쓴다.
 * 초안은 학생 공개가 아니다 — 확정은 기존 §39 PUT review만 한다. 확정되면 초안은 CLOSED(CONFIRMED)로 닫혀 더 바뀌지 않는다.
 * 동시 저장은 version(@Version)으로 막는다: 저장 요청의 baseVersion이 현재 version과 다르면 Service가 409로 알린다.
 */
@Entity
@Table(name = "assessment_plan_review_draft")
public class PlanReviewDraft implements Persistable<String> {

    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_CLOSED = "CLOSED";
    public static final String CLOSED_CONFIRMED = "CONFIRMED";

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "revision_id", nullable = false, length = 64, updatable = false)
    private String revisionId;

    @Column(name = "analysis_id", nullable = false, length = 64, updatable = false)
    private String analysisId;

    @Column(name = "source_sha256", nullable = false, length = 64, updatable = false)
    private String sourceSha256;

    @Column(name = "analyzer_version", nullable = false, length = 50, updatable = false)
    private String analyzerVersion;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "closed_reason", length = 30)
    private String closedReason;

    @Column(name = "payload_json", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String payloadJson;

    @Column(name = "decision_count", nullable = false)
    private int decisionCount;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_by", nullable = false, length = 64, updatable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_by", nullable = false, length = 64)
    private String updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Transient
    private boolean isNew;

    protected PlanReviewDraft() {
    }

    public static PlanReviewDraft start(String revisionId, String analysisId, String sourceSha256, String analyzerVersion,
            String payloadJson, int decisionCount, String adminId, Instant now) {
        PlanReviewDraft draft = new PlanReviewDraft();
        draft.id = "plan_draft_" + UUID.randomUUID();
        draft.revisionId = revisionId;
        draft.analysisId = analysisId;
        draft.sourceSha256 = sourceSha256;
        draft.analyzerVersion = analyzerVersion;
        draft.status = STATUS_ACTIVE;
        draft.payloadJson = payloadJson;
        draft.decisionCount = decisionCount;
        draft.createdBy = adminId;
        draft.createdAt = now;
        draft.updatedBy = adminId;
        draft.updatedAt = now;
        draft.isNew = true;
        return draft;
    }

    /** 내용 교체. 닫힌 초안은 바꾸지 않는다(호출 전 Service가 확인). version은 JPA가 올린다. */
    public void replace(String payloadJson, int decisionCount, String adminId, Instant now) {
        if (!isActive()) {
            throw new IllegalStateException("closed draft");
        }
        this.payloadJson = payloadJson;
        this.decisionCount = decisionCount;
        this.updatedBy = adminId;
        this.updatedAt = now;
    }

    /** 최종 확정과 함께 닫는다. 이후 학생 공개값은 확정값(Review)이고 초안은 기록으로만 남는다. */
    public void closeConfirmed(String adminId, Instant now) {
        if (!isActive()) {
            return;
        }
        this.status = STATUS_CLOSED;
        this.closedReason = CLOSED_CONFIRMED;
        this.updatedBy = adminId;
        this.updatedAt = now;
    }

    public boolean isActive() {
        return STATUS_ACTIVE.equals(status);
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostLoad
    @PostPersist
    void markNotNew() {
        isNew = false;
    }

    public String id() {
        return id;
    }

    public String revisionId() {
        return revisionId;
    }

    public String analysisId() {
        return analysisId;
    }

    public String sourceSha256() {
        return sourceSha256;
    }

    public String analyzerVersion() {
        return analyzerVersion;
    }

    public String status() {
        return status;
    }

    public String closedReason() {
        return closedReason;
    }

    public String payloadJson() {
        return payloadJson;
    }

    public int decisionCount() {
        return decisionCount;
    }

    public long version() {
        return version;
    }

    public String createdBy() {
        return createdBy;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public String updatedBy() {
        return updatedBy;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
