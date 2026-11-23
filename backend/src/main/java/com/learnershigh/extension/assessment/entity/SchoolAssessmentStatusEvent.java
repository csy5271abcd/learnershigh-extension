package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** A27-UX 학교 수행평가 진행 상태 변경 이력(앞으로·되돌리기). 한 번 쓰면 바꾸지 않는다. */
@Entity
@Table(name = "assessment_school_assessment_status_event")
public class SchoolAssessmentStatusEvent {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "assessment_id", nullable = false, length = 64, updatable = false)
    private String assessmentId;

    @Column(name = "student_id", nullable = false, length = 64, updatable = false)
    private String studentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", nullable = false, length = 20, updatable = false)
    private SchoolAssessmentStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 20, updatable = false)
    private SchoolAssessmentStatus toStatus;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    protected SchoolAssessmentStatusEvent() {
    }

    public SchoolAssessmentStatusEvent(String assessmentId, String studentId, SchoolAssessmentStatus fromStatus,
            SchoolAssessmentStatus toStatus, Instant changedAt) {
        this.id = "status_event_" + UUID.randomUUID();
        this.assessmentId = Objects.requireNonNull(assessmentId);
        this.studentId = Objects.requireNonNull(studentId);
        this.fromStatus = Objects.requireNonNull(fromStatus);
        this.toStatus = Objects.requireNonNull(toStatus);
        this.changedAt = Objects.requireNonNull(changedAt);
    }

    public String assessmentId() {
        return assessmentId;
    }

    public SchoolAssessmentStatus fromStatus() {
        return fromStatus;
    }

    public SchoolAssessmentStatus toStatus() {
        return toStatus;
    }

    public Instant changedAt() {
        return changedAt;
    }
}
