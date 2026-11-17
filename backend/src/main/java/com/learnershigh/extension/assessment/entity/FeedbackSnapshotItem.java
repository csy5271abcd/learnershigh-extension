package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

/** 피드백 요청 Snapshot에 고정한 결과물 버전 한 개 (불변, INSERT만). */
@Entity
@Table(name = "assessment_feedback_snapshot")
public class FeedbackSnapshotItem {

    @EmbeddedId
    private Key key;

    @Column(name = "position", nullable = false, updatable = false)
    private int position;

    protected FeedbackSnapshotItem() {
    }

    public static FeedbackSnapshotItem of(String requestId, String artifactVersionId, int position) {
        FeedbackSnapshotItem item = new FeedbackSnapshotItem();
        item.key = new Key(requestId, artifactVersionId);
        item.position = position;
        return item;
    }

    public String requestId() {
        return key.requestId;
    }

    public String artifactVersionId() {
        return key.artifactVersionId;
    }

    public int position() {
        return position;
    }

    @Embeddable
    public static class Key implements Serializable {

        @Column(name = "request_id", length = 64, updatable = false)
        private String requestId;

        @Column(name = "artifact_version_id", length = 64, updatable = false)
        private String artifactVersionId;

        protected Key() {
        }

        Key(String requestId, String artifactVersionId) {
            this.requestId = requestId;
            this.artifactVersionId = artifactVersionId;
        }

        @Override
        public boolean equals(Object other) {
            return other instanceof Key key && requestId.equals(key.requestId)
                    && artifactVersionId.equals(key.artifactVersionId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(requestId, artifactVersionId);
        }
    }
}
