package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.AdminArtifactVersion;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactVersionResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.FileMeta;
import com.learnershigh.extension.assessment.entity.Artifact;
import com.learnershigh.extension.assessment.entity.ArtifactVersion;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import java.util.Set;
import org.springframework.stereotype.Component;

/** 결과물 Entity → 계약 DTO. fileRef는 저장 키가 아닌 버전 기반 불투명 값이다. */
@Component
public class ArtifactViews {

    /** 브라우저가 그대로 보여줄 수 있는 형식(HWP·DOCX·PPTX는 변환기 없음, §26 PREVIEW_UNAVAILABLE) */
    private static final Set<String> PREVIEWABLE = Set.of("application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp");

    private final AssessmentTimes times;

    public ArtifactViews(AssessmentTimes times) {
        this.times = times;
    }

    public ArtifactResponse artifact(Artifact artifact) {
        return new ArtifactResponse(artifact.id(), artifact.sourceType(), artifact.sourceId(), artifact.title(),
                artifact.kind());
    }

    public ArtifactVersionResponse version(ArtifactVersion version) {
        return new ArtifactVersionResponse(version.id(), version.artifactId(), version.versionNumber(), file(version),
                version.changeNote(), times.toOffset(version.uploadedAt()));
    }

    public AdminArtifactVersion adminVersion(ArtifactVersion version) {
        return new AdminArtifactVersion(version.id(), version.artifactId(), version.versionNumber(), file(version),
                version.changeNote(), times.toOffset(version.uploadedAt()), PREVIEWABLE.contains(version.contentType()));
    }

    public static boolean previewable(String contentType) {
        return PREVIEWABLE.contains(contentType);
    }

    private static FileMeta file(ArtifactVersion version) {
        return new FileMeta("file_" + version.id(), version.fileName(), version.contentType(), version.sizeBytes());
    }
}
