package com.learnershigh.extension.assessment.dto.record;

import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.AdminArtifactVersion;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.AdminNoteRevision;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import tools.jackson.databind.JsonNode;

/** api-contract.md §31·32 학생 피드백, §44·45 관리자 피드백 DTO. */
public final class FeedbackDtos {

    private FeedbackDtos() {
    }

    public record CreateFeedbackRequestBody(@NotBlank @Size(max = 30) String sourceType,
            @NotBlank @Size(max = 64) String sourceId,
            @NotBlank @Size(max = 64) String noteRevisionId,
            @NotNull @Size(max = 10) List<@NotBlank @Size(max = 64) String> artifactVersionIds) {
    }

    /** 요청 당시 고정 자료. locked는 항상 true(요청 후 바뀌지 않음). */
    public record Snapshot(String noteRevisionId, List<String> artifactVersionIds, boolean locked) {
    }

    public record FeedbackRequestResponse(String requestId, String status, OffsetDateTime requestedAt,
            Snapshot snapshot) {
    }

    public record ReplyBody(String overallComment, JsonNode comments, JsonNode recommendations) {
    }

    /** §32 학생 답변 조회: 전달 전이면 reply = null (관리자 초안은 보이지 않는다) */
    public record FeedbackReplyResponse(String requestId, String status, OffsetDateTime deliveredAt, ReplyBody reply) {
    }

    /** §45 관리자 초안·전달 요청 */
    public record ReplyDraftRequest(@NotNull @Size(max = 5000) String overallComment,
            @NotNull @Size(max = 100) List<JsonNode> comments,
            @NotNull @Size(max = 20) List<JsonNode> recommendations) {
    }

    public record DraftSavedResponse(String status, OffsetDateTime savedAt) {
    }

    public record DeliveredResponse(String status, OffsetDateTime deliveredAt) {
    }

    public record School(String schoolId, String name) {
    }

    /** 관리자 화면의 학생 표시 (기존 학생 이름 + 개발용 Mock 학업 Context의 학교·학년) */
    public record StudentRef(String studentId, String displayName, School school, int grade) {
    }

    public record AdminFeedbackRequest(String requestId, StudentRef student, String sourceType, String sourceId,
            String sourceTitle, String subjectName, OffsetDateTime requestedAt, String status, Snapshot snapshot,
            boolean draftSaved, OffsetDateTime deliveredAt) {
    }

    public record SnapshotVersion(String versionId, String artifactId, int versionNumber,
            ArtifactDtos.FileMeta file, String changeNote, OffsetDateTime uploadedAt, boolean previewSupported,
            String artifactTitle) {

        public static SnapshotVersion of(AdminArtifactVersion version, String artifactTitle) {
            return new SnapshotVersion(version.versionId(), version.artifactId(), version.versionNumber(),
                    version.file(), version.changeNote(), version.uploadedAt(), version.previewSupported(),
                    artifactTitle);
        }
    }

    public record DraftView(String overallComment, JsonNode comments, JsonNode recommendations,
            OffsetDateTime savedAt) {
    }

    /** §44 상세: 요청 정보 + 요청 당시 노트 Revision·결과물 버전 + 관리자 초안/전달 답변 */
    public record AdminFeedbackDetail(String requestId, StudentRef student, String sourceType, String sourceId,
            String sourceTitle, String subjectName, OffsetDateTime requestedAt, String status, Snapshot snapshot,
            boolean draftSaved, OffsetDateTime deliveredAt, AdminNoteRevision snapshotRevision,
            Integer latestRevisionNumber, List<SnapshotVersion> snapshotVersions, DraftView draft, ReplyBody reply) {
    }
}
