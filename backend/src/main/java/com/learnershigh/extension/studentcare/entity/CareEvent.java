package com.learnershigh.extension.studentcare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** 학생 기록 Timeline 한 줄. 추가만 하고 수정 / 삭제하지 않는다. */
@Entity
@Table(name = "care_event")
public class CareEvent {

    static final int CONTENT_MAX = 1000;

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private CareCase careCase;

    @Column(name = "case_id", insertable = false, updatable = false)
    private String caseId;

    @Column(name = "student_id", nullable = false, length = 64)
    private String studentId;

    @Column(name = "sequence", nullable = false)
    private int sequence;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private CareEventType type;

    @Column(name = "occurred_on", nullable = false)
    private LocalDate occurredOn;

    @Column(name = "content", nullable = false, length = CONTENT_MAX)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "note_channel", length = 20)
    private NoteChannel noteChannel;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected CareEvent() {
    }

    CareEvent(CareCase careCase, int sequence, CareEventType type, LocalDate occurredOn, String content,
            NoteChannel noteChannel, Instant createdAt) {
        this.id = "evt_" + UUID.randomUUID();
        this.careCase = careCase;
        this.caseId = careCase.id();
        this.studentId = careCase.studentId();
        this.sequence = sequence;
        this.type = type;
        this.occurredOn = occurredOn;
        this.content = content.length() > CONTENT_MAX ? content.substring(0, CONTENT_MAX) : content;
        this.noteChannel = noteChannel;
        this.createdAt = createdAt;
    }

    public String id() {
        return id;
    }

    public String caseId() {
        return caseId;
    }

    public String studentId() {
        return studentId;
    }

    public int sequence() {
        return sequence;
    }

    public CareEventType type() {
        return type;
    }

    public LocalDate occurredOn() {
        return occurredOn;
    }

    public String content() {
        return content;
    }

    public NoteChannel noteChannel() {
        return noteChannel;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
