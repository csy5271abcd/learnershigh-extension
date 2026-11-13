package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactVersionResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.CreateArtifactRequest;
import com.learnershigh.extension.assessment.entity.Artifact;
import com.learnershigh.extension.assessment.entity.ArtifactVersion;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.storage.ArtifactStorage;
import com.learnershigh.extension.assessment.repository.ArtifactRepository;
import com.learnershigh.extension.assessment.repository.ArtifactVersionRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * §24 결과물 생성, §25 버전 업로드. 버전은 결과물 안에서만 증가하고, 이전 버전 파일·행은 바꾸지 않는다.
 * 파일 → DB 순서로 저장하고, DB Transaction이 롤백되면 방금 쓴 파일을 지운다(성공 응답 없이 파일만 남지 않게).
 */
@Service
@Transactional
public class ArtifactService {

    static final int CHANGE_NOTE_MAX = 1000;

    private final ArtifactRepository artifacts;
    private final ArtifactVersionRepository versions;
    private final StudentRecordAccess access;
    private final ArtifactStorage storage;
    private final ArtifactViews views;
    private final AssessmentTimes times;
    private final long maxFileBytes;

    public ArtifactService(ArtifactRepository artifacts, ArtifactVersionRepository versions,
            StudentRecordAccess access, ArtifactStorage storage, ArtifactViews views, AssessmentTimes times,
            @Value("${assessment.storage.max-file-bytes}") long maxFileBytes) {
        this.artifacts = artifacts;
        this.versions = versions;
        this.access = access;
        this.storage = storage;
        this.views = views;
        this.times = times;
        this.maxFileBytes = maxFileBytes;
    }

    public ArtifactResponse create(StudentActor student, CreateArtifactRequest request) {
        access.ownedAssessment(student.studentId(), request.sourceType(), request.sourceId());
        String kind = request.kind() == null || request.kind().isBlank() ? null : request.kind().strip();
        Artifact artifact = artifacts.saveAndFlush(Artifact.create(student.studentId(), request.sourceType(),
                request.sourceId(), request.title().strip(), kind, times.now()));
        return views.artifact(artifact);
    }

    public ArtifactVersionResponse upload(StudentActor student, String artifactId, String originalFileName,
            byte[] bytes, String changeNote, String expectedLatestVersionId) {
        Artifact artifact = artifacts.findByIdAndStudentIdAndDeletedAtIsNull(artifactId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ARTIFACT_NOT_FOUND));
        if (bytes.length == 0) {
            throw RecordJson.invalid("file", "empty");
        }
        if (bytes.length > maxFileBytes) {
            throw new BusinessException(AssessmentErrorCode.FILE_TOO_LARGE,
                    "파일이 너무 커요. " + (maxFileBytes / 1024 / 1024) + "MB 이하 파일만 올릴 수 있어요.");
        }
        String fileName = ArtifactFileTypes.safeFileName(originalFileName);
        if (fileName.isBlank()) {
            throw RecordJson.invalid("file", "name");
        }
        String contentType = ArtifactFileTypes.contentTypeOf(fileName, bytes)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.UNSUPPORTED_FILE_TYPE,
                        "PDF·HWP·HWPX·DOC·DOCX·PPT·PPTX·XLSX·이미지 파일만 올릴 수 있어요(확장자와 파일 내용이 맞아야 해요)."));
        String note = changeNote == null || changeNote.isBlank() ? null : changeNote.strip();
        if (note != null && note.length() > CHANGE_NOTE_MAX) {
            throw RecordJson.invalid("changeNote", "too_long");
        }
        if (expectedLatestVersionId != null && !expectedLatestVersionId.isBlank()) {
            List<ArtifactVersion> existing = versions.findByArtifactIdOrderByVersionNumberAsc(artifact.id());
            String latest = existing.isEmpty() ? "" : existing.get(existing.size() - 1).id();
            if (!latest.equals(expectedLatestVersionId)) {
                throw new BusinessException(AssessmentErrorCode.FILE_VERSION_MISMATCH);
            }
        }

        String sha256 = sha256(bytes);
        String storageKey = storage.store(bytes);
        compensateOnRollback(storageKey);
        Instant now = times.now();
        int number = artifact.nextVersionNumber(now);
        artifacts.saveAndFlush(artifact);
        ArtifactVersion version = versions.saveAndFlush(ArtifactVersion.of(artifact.id(), number, storageKey, fileName,
                contentType, bytes.length, sha256, note, now));
        return views.version(version);
    }

    private void compensateOnRollback(String storageKey) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    storage.deleteQuietly(storageKey);
                }
            }
        });
    }

    static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
