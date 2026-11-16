package com.learnershigh.extension.assessment.dto.record;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;

/** api-contract.md §24·25·36 결과물 DTO. */
public final class ArtifactDtos {

    private ArtifactDtos() {
    }

    public record CreateArtifactRequest(@NotBlank @Size(max = 30) String sourceType,
            @NotBlank @Size(max = 64) String sourceId,
            @NotBlank @Size(max = 200) String title,
            @Size(max = 50) String kind) {
    }

    public record ArtifactResponse(String artifactId, String sourceType, String sourceId, String title, String kind) {
    }

    public record FileMeta(String fileRef, String fileName, String contentType, long sizeBytes) {
    }

    public record ArtifactVersionResponse(String versionId, String artifactId, int versionNumber, FileMeta file,
            String changeNote, OffsetDateTime uploadedAt) {
    }

    /** §36 Admin 결과물 읽기: 버전 전체 + 브라우저 미리보기 가능 여부 */
    public record AdminArtifactVersion(String versionId, String artifactId, int versionNumber, FileMeta file,
            String changeNote, OffsetDateTime uploadedAt, boolean previewSupported) {
    }

    public record AdminArtifact(String artifactId, String sourceType, String sourceId, String title,
            List<AdminArtifactVersion> versions) {
    }

    /** 다운로드용 (Controller가 Stream 응답으로 바꾼다) */
    /** §25-1·§37 두 버전 비교. 구조 비교기(STRUCTURED_DIFF)가 없어 METADATA_ONLY만 낸다(가짜 Diff 없음). */
    public record ArtifactComparison(String artifactId, String fromVersionId, String toVersionId, Comparison comparison,
            java.util.List<AdminArtifactVersion> versions) {
    }

    public record Comparison(String mode, java.util.List<Change> changes, String reason) {
    }

    /** 파일 메타데이터 차이 하나 (field: fileName·contentType·sizeBytes·sha256·uploadedAt·changeNote) */
    public record Change(String field, Object from, Object to) {
    }

    public record FileDownload(String fileName, String contentType, long sizeBytes, java.io.InputStream content) {
    }
}
