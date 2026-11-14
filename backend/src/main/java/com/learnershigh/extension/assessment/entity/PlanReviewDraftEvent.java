package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Persistable;

/** 공유 초안 저장 기록 (A5): 누가 언제 어떤 필드를 바꿨는지. 초안 본문이 바뀌어도 기록은 남는다(불변). */
@Entity
@Table(name = "assessment_plan_review_draft_event")
public class PlanReviewDraftEvent implements Persistable<String> {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "draft_id", nullable = false, length = 64, updatable = false)
    private String draftId;

    @Column(name = "draft_version", nullable = false, updatable = false)
    private long draftVersion;

    @Column(name = "saved_by", nullable = false, length = 64, updatable = false)
    private String savedBy;

    @Column(name = "saved_at", nullable = false, updatable = false)
    private Instant savedAt;

    @Column(name = "changed_count", nullable = false, updatable = false)
    private int changedCount;

    @Column(name = "changed_paths_json", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String changedPathsJson;

    @Transient
    private boolean isNew;

    protected PlanReviewDraftEvent() {
    }

    public static PlanReviewDraftEvent record(String draftId, long draftVersion, String savedBy, Instant savedAt,
            int changedCount, String changedPathsJson) {
        PlanReviewDraftEvent event = new PlanReviewDraftEvent();
        event.id = "plan_draft_event_" + UUID.randomUUID();
        event.draftId = draftId;
        event.draftVersion = draftVersion;
        event.savedBy = savedBy;
        event.savedAt = savedAt;
        event.changedCount = changedCount;
        event.changedPathsJson = changedPathsJson;
        event.isNew = true;
        return event;
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

    public String draftId() {
        return draftId;
    }

    public long draftVersion() {
        return draftVersion;
    }

    public String savedBy() {
        return savedBy;
    }

    public Instant savedAt() {
        return savedAt;
    }

    public int changedCount() {
        return changedCount;
    }

    public String changedPathsJson() {
        return changedPathsJson;
    }
}
