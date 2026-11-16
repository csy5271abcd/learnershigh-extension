package com.learnershigh.extension.assessment.dto.record;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import tools.jackson.databind.JsonNode;

/** api-contract.md §20·21·35 노트 DTO. blocks는 Editor 확정 전(OD-A05) 블록 객체를 그대로 보존한다(Service가 형식 검사). */
public final class NoteDtos {

    private NoteDtos() {
    }

    public record CreateNoteRequest(@NotBlank @Size(max = 30) String sourceType,
            @NotBlank @Size(max = 64) String sourceId,
            @NotNull @Size(max = 200) String title,
            @NotNull @Size(max = 2000) List<JsonNode> blocks) {
    }

    public record UpdateNoteRequest(@NotBlank @Size(max = 64) String expectedRevisionId,
            @NotNull @Size(max = 200) String title,
            @NotNull @Size(max = 2000) List<JsonNode> blocks) {
    }

    public record SaveNoteResponse(String noteId, String revisionId, int revisionNumber, OffsetDateTime savedAt,
            OffsetDateTime updatedAt) {
    }

    public record NoteResponse(String noteId, String sourceType, String sourceId, String title, JsonNode blocks,
            String revisionId, int revisionNumber, OffsetDateTime savedAt, OffsetDateTime updatedAt) {
    }

    public record NoteRevisionSummary(String revisionId, int revisionNumber, OffsetDateTime savedAt) {
    }

    public record NoteRevisionDetail(String revisionId, int revisionNumber, OffsetDateTime savedAt, String noteId,
            String title, JsonNode blocks) {
    }

    /** §35 Admin 노트 읽기: 노트별 전체 Revision(읽기 전용) */
    public record AdminNoteRevision(String revisionId, int revisionNumber, OffsetDateTime savedAt, String title,
            JsonNode blocks) {
    }

    public record AdminNote(String noteId, String sourceType, String sourceId, List<AdminNoteRevision> revisions) {
    }
}
