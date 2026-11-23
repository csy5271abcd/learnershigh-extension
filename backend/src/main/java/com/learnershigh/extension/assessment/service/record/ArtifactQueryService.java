package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.Comparison;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.Change;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactComparison;
import java.util.Objects;
import java.util.ArrayList;
import java.io.UncheckedIOException;
import java.io.InputStream;
import java.io.IOException;
import java.io.ByteArrayInputStream;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.AdminArtifact;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.AdminArtifactVersion;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactVersionResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.FileDownload;
import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.entity.Artifact;
import com.learnershigh.extension.assessment.entity.ArtifactVersion;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.storage.ArtifactStorage;
import com.learnershigh.extension.assessment.repository.ArtifactRepository;
import com.learnershigh.extension.assessment.repository.ArtifactVersionRepository;
import com.learnershigh.extension.common.error.BusinessException;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** §24·25·26 학생 본인 결과물 조회·다운로드, §36 관리자 읽기 전용(담당 학생만). */
@Service
@Transactional(readOnly = true)
public class ArtifactQueryService {

    private final ArtifactRepository artifacts;
    private final ArtifactVersionRepository versions;
    private final StudentRecordAccess access;
    private final ArtifactStorage storage;
    private final ArtifactViews views;

    public ArtifactQueryService(ArtifactRepository artifacts, ArtifactVersionRepository versions,
            StudentRecordAccess access, ArtifactStorage storage, ArtifactViews views) {
        this.artifacts = artifacts;
        this.versions = versions;
        this.access = access;
        this.storage = storage;
        this.views = views;
    }

    public ItemsResponse<ArtifactResponse> list(StudentActor student, String sourceType, String sourceId) {
        access.ownedAssessment(student.studentId(), sourceType, sourceId);
        return new ItemsResponse<>(artifacts.findByStudentIdAndSourceTypeAndSourceIdAndDeletedAtIsNullOrderByCreatedAtAsc(
                student.studentId(), sourceType, sourceId).stream().map(views::artifact).toList());
    }

    public ItemsResponse<ArtifactVersionResponse> versions(StudentActor student, String artifactId) {
        Artifact artifact = owned(student, artifactId);
        return new ItemsResponse<>(versions.findByArtifactIdOrderByVersionNumberAsc(artifact.id()).stream()
                .map(views::version).toList());
    }

    public FileDownload download(StudentActor student, String artifactId, String versionId) {
        return open(owned(student, artifactId), versionId);
    }

    /** §26 미리보기: PDF·PNG·JPEG·GIF만. 저장 바이트의 SHA-256이 등록 값과 같을 때만 내보낸다. 휴지통 결과물은 404. */
    public FileDownload preview(StudentActor student, String artifactId, String versionId) {
        return verifiedPreview(owned(student, artifactId), versionId);
    }

    public FileDownload previewForAdmin(AdminActor admin, String artifactId, String versionId) {
        return verifiedPreview(readable(admin, artifactId), versionId);
    }

    public ArtifactComparison compare(StudentActor student, String artifactId, String fromVersionId, String toVersionId) {
        return comparison(owned(student, artifactId), fromVersionId, toVersionId);
    }

    public ArtifactComparison compareForAdmin(AdminActor admin, String artifactId, String fromVersionId,
            String toVersionId) {
        return comparison(readable(admin, artifactId), fromVersionId, toVersionId);
    }

    private FileDownload verifiedPreview(Artifact artifact, String versionId) {
        ArtifactVersion version = version(artifact, versionId);
        if (!ArtifactViews.previewable(version.contentType())) {
            throw new BusinessException(AssessmentErrorCode.PREVIEW_UNAVAILABLE);
        }
        byte[] bytes;
        try (InputStream in = storage.open(version.storageKey())) {
            bytes = in.readAllBytes();
        } catch (IOException failed) {
            throw new UncheckedIOException(failed);
        }
        if (bytes.length != version.sizeBytes() || !ArtifactService.sha256(bytes).equals(version.sha256())) {
            throw new BusinessException(AssessmentErrorCode.FILE_INTEGRITY_FAILED);
        }
        return new FileDownload(version.fileName(), version.contentType(), version.sizeBytes(),
                new ByteArrayInputStream(bytes));
    }

    /** 같은 결과물의 서로 다른 두 버전만. 파일 내용 비교기가 없어 메타데이터 차이만 낸다(없는 차이를 만들지 않는다). */
    private ArtifactComparison comparison(Artifact artifact, String fromVersionId, String toVersionId) {
        if (fromVersionId == null || toVersionId == null || fromVersionId.equals(toVersionId)) {
            throw RecordJson.invalid("toVersionId", "same_or_missing");
        }
        ArtifactVersion from = version(artifact, fromVersionId);
        ArtifactVersion to = version(artifact, toVersionId);
        List<Change> changes = new ArrayList<>();
        diff(changes, "fileName", from.fileName(), to.fileName());
        diff(changes, "contentType", from.contentType(), to.contentType());
        diff(changes, "sizeBytes", from.sizeBytes(), to.sizeBytes());
        diff(changes, "sha256", from.sha256(), to.sha256());
        diff(changes, "uploadedAt", views.adminVersion(from).uploadedAt().toString(), views.adminVersion(to).uploadedAt().toString());
        diff(changes, "changeNote", from.changeNote(), to.changeNote());
        return new ArtifactComparison(artifact.id(), from.id(), to.id(),
                new Comparison("METADATA_ONLY", changes, "파일 내용의 구조 비교는 지원하지 않습니다. 두 원본과 파일 정보를 비교합니다."),
                List.of(views.adminVersion(from), views.adminVersion(to)));
    }

    private static void diff(List<Change> changes, String field, Object from, Object to) {
        if (!Objects.equals(from, to)) {
            changes.add(new Change(field, from, to));
        }
    }

    private ArtifactVersion version(Artifact artifact, String versionId) {
        return versions.findByIdAndArtifactId(versionId, artifact.id())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ARTIFACT_VERSION_NOT_FOUND));
    }

    public ItemsResponse<AdminArtifact> listForAdmin(AdminActor admin, String studentId, String sourceType,
            String sourceId) {
        access.requireReadable(admin, studentId);
        StudentRecordAccess.requireSourceType(sourceType);
        return new ItemsResponse<>(artifacts.findByStudentIdAndSourceTypeAndSourceIdAndDeletedAtIsNullOrderByCreatedAtAsc(studentId,
                sourceType, sourceId).stream().map(this::adminArtifact).toList());
    }

    public ItemsResponse<AdminArtifactVersion> versionsForAdmin(AdminActor admin, String artifactId) {
        Artifact artifact = readable(admin, artifactId);
        return new ItemsResponse<>(versions.findByArtifactIdOrderByVersionNumberAsc(artifact.id()).stream()
                .map(views::adminVersion).toList());
    }

    public FileDownload downloadForAdmin(AdminActor admin, String artifactId, String versionId) {
        return open(readable(admin, artifactId), versionId);
    }

    /** 피드백 Snapshot 버전 (요청 당시 고정) + 결과물 제목 */
    public List<SnapshotVersion> snapshotVersions(Collection<String> versionIds) {
        List<ArtifactVersion> found = versions.findByIdIn(versionIds);
        Map<String, Artifact> owners = artifacts.findByIdIn(found.stream().map(ArtifactVersion::artifactId).toList())
                .stream().collect(Collectors.toMap(Artifact::id, Function.identity()));
        Map<String, ArtifactVersion> byId = found.stream()
                .collect(Collectors.toMap(ArtifactVersion::id, Function.identity()));
        return versionIds.stream().map(byId::get).filter(v -> v != null)
                .map(v -> new SnapshotVersion(views.adminVersion(v), owners.get(v.artifactId()).title(),
                        owners.get(v.artifactId()).studentId()))
                .toList();
    }

    public record SnapshotVersion(AdminArtifactVersion version, String artifactTitle, String studentId) {
    }

    private AdminArtifact adminArtifact(Artifact artifact) {
        return new AdminArtifact(artifact.id(), artifact.sourceType(), artifact.sourceId(), artifact.title(),
                versions.findByArtifactIdOrderByVersionNumberAsc(artifact.id()).stream().map(views::adminVersion)
                        .toList());
    }

    private FileDownload open(Artifact artifact, String versionId) {
        ArtifactVersion version = versions.findByIdAndArtifactId(versionId, artifact.id())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ARTIFACT_VERSION_NOT_FOUND));
        return new FileDownload(version.fileName(), version.contentType(), version.sizeBytes(),
                storage.open(version.storageKey()));
    }

    private Artifact owned(StudentActor student, String artifactId) {
        return artifacts.findByIdAndStudentIdAndDeletedAtIsNull(artifactId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ARTIFACT_NOT_FOUND));
    }

    private Artifact readable(AdminActor admin, String artifactId) {
        Artifact artifact = artifacts.findById(artifactId)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ARTIFACT_NOT_FOUND));
        try {
            access.requireReadable(admin, artifact.studentId());
        } catch (BusinessException outOfScope) {
            throw new BusinessException(AssessmentErrorCode.ARTIFACT_NOT_FOUND);
        }
        return artifact;
    }
}
