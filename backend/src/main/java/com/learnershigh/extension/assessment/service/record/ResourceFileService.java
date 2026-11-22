package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.FileDownload;
import com.learnershigh.extension.assessment.entity.AssessmentResource;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.storage.ArtifactStorage;
import com.learnershigh.extension.assessment.repository.AssessmentResourceRepository;
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
 * A27-UX 학생 자료함 파일 첨부 (§22-1 DRAFT). 자료 하나에 파일 하나 — 다시 올리면 새 파일로 바꾼다(이전 바이트는 보존).
 * 형식은 확장자 + 파일 서명이 둘 다 맞아야 한다({@link ArtifactFileTypes}). 크기는 결과물과 같은 한도.
 * 본인 자료만 다룬다(다른 학생 자료는 존재도 드러내지 않는 404). 미리보기는 PDF·이미지만(원본 바이트 그대로, GIF 애니메이션 보존).
 */
@Service
@Transactional
public class ResourceFileService {

    private static final Set<String> PREVIEWABLE = Set.of("application/pdf", "image/png", "image/jpeg", "image/gif",
            "image/webp");

    private final AssessmentResourceRepository resources;
    private final ArtifactStorage storage;
    private final AssessmentTimes times;
    private final long maxFileBytes;

    public ResourceFileService(AssessmentResourceRepository resources, ArtifactStorage storage, AssessmentTimes times,
            @Value("${assessment.storage.max-file-bytes}") long maxFileBytes) {
        this.resources = resources;
        this.storage = storage;
        this.times = times;
        this.maxFileBytes = maxFileBytes;
    }

    public static boolean previewable(String contentType) {
        return contentType != null && PREVIEWABLE.contains(contentType);
    }

    public void attach(StudentActor student, String resourceId, String originalFileName, byte[] bytes) {
        AssessmentResource resource = owned(student, resourceId);
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
                        "PDF·HWP·HWPX·DOC·DOCX·XLS·XLSX·PPT·PPTX·JPG·PNG·GIF·WEBP 파일만 올릴 수 있어요(확장자와 파일 내용이 맞아야 해요)."));
        String storageKey = storage.store(bytes);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    storage.deleteQuietly(storageKey);
                }
            }
        });
        resource.attachFile(storageKey, fileName, contentType, bytes.length, ArtifactService.sha256(bytes), times.now());
        resources.saveAndFlush(resource);
    }

    public void detach(StudentActor student, String resourceId) {
        AssessmentResource resource = owned(student, resourceId);
        resource.detachFile(times.now());
        resources.saveAndFlush(resource);
    }

    @Transactional(readOnly = true)
    public FileDownload download(StudentActor student, String resourceId, boolean preview) {
        AssessmentResource resource = owned(student, resourceId);
        AssessmentResource.FileInfo file = resource.file();
        if (file == null) {
            throw new BusinessException(AssessmentErrorCode.NOT_FOUND, "첨부 파일이 없어요.");
        }
        if (preview && !previewable(file.contentType())) {
            throw new BusinessException(AssessmentErrorCode.PREVIEW_UNAVAILABLE);
        }
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

    private AssessmentResource owned(StudentActor student, String resourceId) {
        return resources.findByIdAndOwnerTypeAndOwnerIdAndDeletedAtIsNull(resourceId, AssessmentResource.OWNER_STUDENT,
                        student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOT_FOUND, "자료를 찾을 수 없습니다."));
    }
}
