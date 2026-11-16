package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * 노트의 확정된 한 시점 (api-contract.md §21). **불변**: 모든 Column이 updatable=false이고 변경 메서드가 없다.
 * 피드백 Snapshot은 이 ID를 참조하며 최신 Revision으로 바꿔 끼우지 않는다.
 */
@Entity
@Table(name = "assessment_note_revision")
public class NoteRevision {

    public static final int TITLE_MAX = 200;

    @Id
    @Column(name = "id", length = 64, updatable = false)
    private String id;

    @Column(name = "note_id", nullable = false, length = 64, updatable = false)
    private String noteId;

    @Column(name = "revision_number", nullable = false, updatable = false)
    private int revisionNumber;

    @Column(name = "title", nullable = false, length = TITLE_MAX, updatable = false)
    private String title;

    @Column(name = "blocks_json", nullable = false, updatable = false, columnDefinition = "JSON")
    private String blocksJson;

    @Column(name = "saved_at", nullable = false, updatable = false)
    private Instant savedAt;

    protected NoteRevision() {
    }

    static String newId() {
        return "rev_" + UUID.randomUUID();
    }

    public static NoteRevision of(String id, String noteId, int revisionNumber, String title, String blocksJson,
            Instant savedAt) {
        NoteRevision revision = new NoteRevision();
        revision.id = id;
        revision.noteId = noteId;
        revision.revisionNumber = revisionNumber;
        revision.title = title;
        revision.blocksJson = blocksJson;
        revision.savedAt = savedAt;
        return revision;
    }

    public String id() {
        return id;
    }

    public String noteId() {
        return noteId;
    }

    public int revisionNumber() {
        return revisionNumber;
    }

    public String title() {
        return title;
    }

    public String blocksJson() {
        return blocksJson;
    }

    public Instant savedAt() {
        return savedAt;
    }
}
