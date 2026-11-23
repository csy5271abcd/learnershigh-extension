package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.FileDownload;
import com.learnershigh.extension.assessment.dto.record.NoteAttachmentDtos.NoteAttachmentResponse;
import com.learnershigh.extension.assessment.entity.NoteAttachment;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.storage.ArtifactStorage;
import com.learnershigh.extension.assessment.repository.NoteAttachmentRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * §26-1 탐구 노트 첨부 파일 (A28-41). 결과물(§25)과 같은 허용 형식·서명 검사·크기 제한·Storage 를 쓴다.
 * 파일 → DB 순서로 저장하고 DB 가 롤백되면 방금 쓴 파일을 지운다. 행·파일은 불변(덮어쓰기·삭제 없음).
 * 학생은 본인 첨부만, 관리자는 담당 학생 첨부만(범위 밖은 존재를 드러내지 않는 404).
 */
@Service
@Transactional
public class NoteAttachmentService {

    private final NoteAttachmentRepository attachments;
    private final StudentRecordAccess access;
    private final ArtifactStorage storage;
    private final AssessmentTimes times;
    private final long maxFileBytes;

    public NoteAttachmentService(NoteAttachmentRepository attachments, StudentRecordAccess access,
            ArtifactStorage storage, AssessmentTimes times,
            @Value("${assessment.storage.max-file-bytes}") long maxFileBytes) {
        this.attachments = attachments;
        this.access = access;
        this.storage = storage;
        this.times = times;
        this.maxFileBytes = maxFileBytes;
    }

    public NoteAttachmentResponse upload(StudentActor student, String originalFileName, byte[] bytes) {
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
                        "이미지(PNG·JPG·GIF·WEBP)·PDF·HWP·HWPX·DOC·DOCX·PPT·PPTX·XLS·XLSX 파일만 올릴 수 있어요(확장자와 파일 내용이 맞아야 해요)."));
        String sha256 = ArtifactService.sha256(bytes);
        String storageKey = storage.store(bytes);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    storage.deleteQuietly(storageKey);
                }
            }
        });
        NoteAttachment saved = attachments.saveAndFlush(NoteAttachment.of(student.studentId(), storageKey, fileName,
                contentType, bytes.length, sha256, times.now()));
        return view(saved);
    }

    @Transactional(readOnly = true)
    public FileDownload download(StudentActor student, String attachmentId) {
        return open(owned(student, attachmentId));
    }

    @Transactional(readOnly = true)
    public FileDownload preview(StudentActor student, String attachmentId) {
        return verifiedPreview(owned(student, attachmentId));
    }

    @Transactional(readOnly = true)
    public FileDownload downloadForAdmin(AdminActor admin, String attachmentId) {
        return open(readable(admin, attachmentId));
    }

    @Transactional(readOnly = true)
    public FileDownload previewForAdmin(AdminActor admin, String attachmentId) {
        return verifiedPreview(readable(admin, attachmentId));
    }

    /** 노트 저장 검사: 블록이 가리키는 첨부 중 이 학생 것이 아닌(또는 없는) ID. 모두 맞으면 빈 집합 */
    @Transactional(readOnly = true)
    public Set<String> unknownFor(String studentId, Collection<String> attachmentIds) {
        Set<String> missing = new HashSet<>(attachmentIds);
        if (missing.isEmpty()) {
            return missing;
        }
        attachments.findByIdInAndStudentId(missing, studentId).forEach(found -> missing.remove(found.id()));
        return missing;
    }

    private NoteAttachment owned(StudentActor student, String attachmentId) {
        return attachments.findByIdAndStudentId(attachmentId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOTE_ATTACHMENT_NOT_FOUND));
    }

    private NoteAttachment readable(AdminActor admin, String attachmentId) {
        NoteAttachment attachment = attachments.findById(attachmentId)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOTE_ATTACHMENT_NOT_FOUND));
        try {
            access.requireReadable(admin, attachment.studentId());
        } catch (BusinessException outOfScope) {
            throw new BusinessException(AssessmentErrorCode.NOTE_ATTACHMENT_NOT_FOUND);
        }
        return attachment;
    }

    private FileDownload open(NoteAttachment attachment) {
        return new FileDownload(attachment.fileName(), attachment.contentType(), attachment.sizeBytes(),
                storage.open(attachment.storageKey()));
    }

    private FileDownload verifiedPreview(NoteAttachment attachment) {
        if (!ArtifactViews.previewable(attachment.contentType())) {
            throw new BusinessException(AssessmentErrorCode.PREVIEW_UNAVAILABLE);
        }
        byte[] bytes;
        try (InputStream in = storage.open(attachment.storageKey())) {
            bytes = in.readAllBytes();
        } catch (IOException failed) {
            throw new UncheckedIOException(failed);
        }
        if (bytes.length != attachment.sizeBytes() || !ArtifactService.sha256(bytes).equals(attachment.sha256())) {
            throw new BusinessException(AssessmentErrorCode.FILE_INTEGRITY_FAILED);
        }
        return new FileDownload(attachment.fileName(), attachment.contentType(), attachment.sizeBytes(),
                new ByteArrayInputStream(bytes));
    }

    private NoteAttachmentResponse view(NoteAttachment attachment) {
        return new NoteAttachmentResponse(attachment.id(), attachment.fileName(), attachment.contentType(),
                attachment.sizeBytes(), attachment.sha256(), times.toOffset(attachment.uploadedAt()),
                ArtifactViews.previewable(attachment.contentType()));
    }
}
