package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.FileDownload;
import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.dto.school.NoticeFileResponse;
import com.learnershigh.extension.assessment.entity.NoticeFile;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.storage.ArtifactStorage;
import com.learnershigh.extension.assessment.repository.NoticeFileRepository;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * A27-UX 수행평가 안내문 첨부(api-contract '§12-c', 2026-11-19 DRAFT). 학생 본인 수행평가에만 붙인다(휴지통 수행평가는 404).
 * 형식은 PDF·이미지만(확장자 + 파일 서명, {@link ArtifactFileTypes}). 바이트는 격리 Storage에 원본 그대로 두고 내려받을 때 크기·SHA를 다시 확인한다.
 */
@Service
@Transactional
public class NoticeFileService {

    public static final int MAX_FILES = 10;
    private static final Set<String> ALLOWED = Set.of("application/pdf", "image/png", "image/jpeg", "image/gif",
            "image/webp");

    private final NoticeFileRepository files;
    private final SchoolAssessmentRepository assessments;
    private final ArtifactStorage storage;
    private final AssessmentTimes times;
    private final long maxFileBytes;

    public NoticeFileService(NoticeFileRepository files, SchoolAssessmentRepository assessments, ArtifactStorage storage,
            AssessmentTimes times, @Value("${assessment.storage.max-file-bytes}") long maxFileBytes) {
        this.files = files;
        this.assessments = assessments;
        this.storage = storage;
        this.times = times;
        this.maxFileBytes = maxFileBytes;
    }

    @Transactional(readOnly = true)
    public ItemsResponse<NoticeFileResponse> list(StudentActor student, String assessmentId) {
        requireAssessment(student, assessmentId);
        return new ItemsResponse<>(files.findByAssessmentIdAndStudentIdAndDeletedAtIsNullOrderByUploadedAtAsc(assessmentId,
                student.studentId()).stream().map(this::toResponse).toList());
    }

    public NoticeFileResponse attach(StudentActor student, String assessmentId, String originalFileName, byte[] bytes) {
        requireAssessment(student, assessmentId);
        if (bytes.length == 0) {
            throw RecordJson.invalid("file", "empty");
        }
        if (bytes.length > maxFileBytes) {
            throw new BusinessException(AssessmentErrorCode.FILE_TOO_LARGE,
                    "파일이 너무 커요. " + (maxFileBytes / 1024 / 1024) + "MB 이하 파일만 올릴 수 있어요.");
        }
        if (files.countByAssessmentIdAndStudentIdAndDeletedAtIsNull(assessmentId, student.studentId()) >= MAX_FILES) {
            throw RecordJson.invalid("file", "limit");
        }
        String fileName = ArtifactFileTypes.safeFileName(originalFileName);
        if (fileName.isBlank()) {
            throw RecordJson.invalid("file", "name");
        }
        String contentType = ArtifactFileTypes.contentTypeOf(fileName, bytes).filter(ALLOWED::contains)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.UNSUPPORTED_FILE_TYPE,
                        "안내문은 PDF·JPG·PNG·GIF·WEBP 파일만 올릴 수 있어요(확장자와 파일 내용이 맞아야 해요)."));
        String storageKey = storage.store(bytes);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    storage.deleteQuietly(storageKey);
                }
            }
        });
        NoticeFile saved = files.saveAndFlush(NoticeFile.attach(assessmentId, student.studentId(), storageKey, fileName,
                contentType, bytes.length, ArtifactService.sha256(bytes), times.now()));
        return toResponse(saved);
    }

    public void remove(StudentActor student, String assessmentId, String fileId) {
        requireAssessment(student, assessmentId);
        NoticeFile file = owned(student, assessmentId, fileId);
        file.remove(times.now());
        files.saveAndFlush(file);
    }

    @Transactional(readOnly = true)
    public FileDownload download(StudentActor student, String assessmentId, String fileId) {
        requireAssessment(student, assessmentId);
        NoticeFile file = owned(student, assessmentId, fileId);
        byte[] bytes;
        try (InputStream in = storage.open(file.storageKey())) {
            bytes = in.readAllBytes();
        } catch (IOException failure) {
            throw new UncheckedIOException(failure);
        }
        if (bytes.length != file.sizeBytes() || !ArtifactService.sha256(bytes).equals(file.sha256())) {
            throw new BusinessException(AssessmentErrorCode.NOT_FOUND, "파일을 확인하지 못했어요.");
        }
        return new FileDownload(file.fileName(), file.contentType(), file.sizeBytes(), new ByteArrayInputStream(bytes));
    }

    private void requireAssessment(StudentActor student, String assessmentId) {
        assessments.findOwned(assessmentId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND));
    }

    private NoticeFile owned(StudentActor student, String assessmentId, String fileId) {
        return files.findByIdAndAssessmentIdAndStudentIdAndDeletedAtIsNull(fileId, assessmentId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOT_FOUND, "안내문 파일을 찾을 수 없어요."));
    }

    private NoticeFileResponse toResponse(NoticeFile file) {
        return new NoticeFileResponse(file.id(), file.fileName(), file.contentType(), file.sizeBytes(),
                times.toOffset(file.uploadedAt()));
    }
}
