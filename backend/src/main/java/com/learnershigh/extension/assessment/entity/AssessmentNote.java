package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * 학생이 편집하는 현재 노트 (domain.md, api-contract.md §20). 본문은 {@link NoteRevision}에만 있고, 이 Entity는
 * 최신 Revision 포인터와 낙관적 잠금만 가진다. 학교 수행평가 하나에 학생 노트 하나(UNIQUE).
 */
@Entity
@Table(name = "assessment_note")
public class AssessmentNote {

    public static final String SOURCE_SCHOOL_ASSESSMENT = "SCHOOL_ASSESSMENT";

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "student_id", nullable = false, length = 64, updatable = false)
    private String studentId;

    @Column(name = "source_type", nullable = false, length = 30, updatable = false)
    private String sourceType;

    @Column(name = "source_id", nullable = false, length = 64, updatable = false)
    private String sourceId;

    @Column(name = "latest_revision_id", nullable = false, length = 64)
    private String latestRevisionId;

    @Column(name = "latest_revision_number", nullable = false)
    private int latestRevisionNumber;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AssessmentNote() {
    }

    /** 첫 Revision과 함께 만든다. 반환된 노트의 latestRevisionId가 첫 Revision ID다. */
    public static AssessmentNote start(String studentId, String sourceType, String sourceId, Instant now) {
        AssessmentNote note = new AssessmentNote();
        note.id = "note_" + UUID.randomUUID();
        note.studentId = studentId;
        note.sourceType = sourceType;
        note.sourceId = sourceId;
        note.latestRevisionId = NoteRevision.newId();
        note.latestRevisionNumber = 1;
        note.createdAt = now;
        note.updatedAt = now;
        return note;
    }

    /** 새 Revision을 다음 번호로 붙인다. 호출 전 expectedRevisionId 일치를 Service가 확인한다. */
    public String appendRevision(Instant now) {
        latestRevisionId = NoteRevision.newId();
        latestRevisionNumber += 1;
        updatedAt = now;
        return latestRevisionId;
    }

    public boolean isLatest(String revisionId) {
        return latestRevisionId.equals(revisionId);
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

    public String latestRevisionId() {
        return latestRevisionId;
    }

    public int latestRevisionNumber() {
        return latestRevisionNumber;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
