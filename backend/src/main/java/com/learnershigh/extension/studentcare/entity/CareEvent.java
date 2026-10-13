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

/**
 * 학생 기록 Timeline 한 줄. 추가만 하고 수정 / 삭제하지 않는다.
 * 내용은 자르지 않는다: 상담 내용 길이는 Request와 {@link CareCase}가 먼저 확인하고, 그래도 넘으면 Programming Error로 본다.
 */
@Entity
@Table(name = "care_event")
public class CareEvent {

    /** 접두어(예: "상담 · 통화 — ") + 상담 내용 1000자가 들어가는 길이. */
    public static final int CONTENT_MAX = 1200;

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

    /** DB가 매기는 전역 기록 순번. 같은 시각의 이벤트를 기록한 순서대로 정렬할 때만 쓴다. */
    @Column(name = "record_no", insertable = false, updatable = false)
    private Long recordNo;

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
        if (content == null || content.isBlank() || content.length() > CONTENT_MAX) {
            throw new IllegalArgumentException("event content must be 1.." + CONTENT_MAX + " characters");
        }
        this.content = content;
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
