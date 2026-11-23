package com.learnershigh.extension.assessment.entity;

import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.common.error.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * 피드백 요청 (api-contract.md §31, ADR-0009). 요청 시 noteRevisionId와 결과물 버전(assessment_feedback_snapshot)을
 * 고정한다. 상태는 PENDING → DELIVERED 하나뿐이고 되돌리지 않는다. 전달은 수행평가 상태를 바꾸지 않는다.
 */
@Entity
@Table(name = "assessment_feedback_request")
public class FeedbackRequest {

    public static final String PENDING = "PENDING";
    public static final String DELIVERED = "DELIVERED";

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "student_id", nullable = false, length = 64, updatable = false)
    private String studentId;

    @Column(name = "source_type", nullable = false, length = 30, updatable = false)
    private String sourceType;

    @Column(name = "source_id", nullable = false, length = 64, updatable = false)
    private String sourceId;

    @Column(name = "note_revision_id", nullable = false, length = 64, updatable = false)
    private String noteRevisionId;

    @Column(name = "snapshot_key", nullable = false, length = 64, updatable = false)
    private String snapshotKey;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private Instant requestedAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected FeedbackRequest() {
    }

    public static FeedbackRequest open(String studentId, String sourceType, String sourceId, String noteRevisionId,
            String snapshotKey, Instant now) {
        FeedbackRequest request = new FeedbackRequest();
        request.id = "feedback_" + UUID.randomUUID();
        request.studentId = studentId;
        request.sourceType = sourceType;
        request.sourceId = sourceId;
        request.noteRevisionId = noteRevisionId;
        request.snapshotKey = snapshotKey;
        request.status = PENDING;
        request.requestedAt = now;
        return request;
    }

    public void markDelivered(Instant now) {
        if (!PENDING.equals(status)) {
            throw new BusinessException(AssessmentErrorCode.FEEDBACK_ALREADY_DELIVERED);
        }
        status = DELIVERED;
        deliveredAt = now;
    }

    public boolean isDelivered() {
        return DELIVERED.equals(status);
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

    public String noteRevisionId() {
        return noteRevisionId;
    }

    public String status() {
        return status;
    }

    public Instant requestedAt() {
        return requestedAt;
    }

    public Instant deliveredAt() {
        return deliveredAt;
    }
}
