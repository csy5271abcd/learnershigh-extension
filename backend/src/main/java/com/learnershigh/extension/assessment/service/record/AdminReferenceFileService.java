package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.FileDownload;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.ReferenceScrapResponse;
import com.learnershigh.extension.assessment.entity.AssessmentResource;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
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
import tools.jackson.databind.JsonNode;

/**
 * A27-UX §43-1 DRAFT 관리자 참고자료실 파일 업로드 (영상·사진·문서).
 * 관리자 스크랩(owner_type=ADMIN)에 파일 하나를 둔다 — 학생 자료함(§22-1)과 같은 격리 Storage·같은 파일 열을 쓴다(새 Migration 없음).
 * 형식은 확장자 + 파일 서명이 둘 다 맞아야 한다: 학생 자료함과 같은 문서·이미지 + 관리자 전용 영상(MP4·M4V·MOV·WEBM).
 * 관리자 전용 — 학생 Endpoint는 없고, 스크랩을 학생에게 공개해도 파일은 내려받을 수 없다. 휴지통 스크랩은 404.
 */
@Service
@Transactional
public class AdminReferenceFileService {

    private static final Set<String> PREVIEWABLE = Set.of("application/pdf", "image/png", "image/jpeg", "image/gif",
            "image/webp", "video/mp4", "video/webm");

    private final AssessmentResourceRepository resources;
    private final ResourceService resourceService;
    private final ArtifactStorage storage;
    private final AssessmentTimes times;
    private final long maxFileBytes;

    public AdminReferenceFileService(AssessmentResourceRepository resources, ResourceService resourceService,
            ArtifactStorage storage, AssessmentTimes times, @Value("${assessment.storage.max-file-bytes}") long maxFileBytes) {
        this.resources = resources;
        this.resourceService = resourceService;
        this.storage = storage;
        this.times = times;
        this.maxFileBytes = maxFileBytes;
    }

    public static boolean previewable(String contentType) {
        return contentType != null && PREVIEWABLE.contains(contentType);
    }

    /** 메타정보 + 파일을 한 번에 저장한다(파일 검사에 실패하면 스크랩도 남지 않는다 — 같은 Transaction). */
    public ReferenceScrapResponse createUpload(AdminActor admin, JsonNode metadata, String originalFileName, byte[] bytes) {
        Checked file = check(originalFileName, bytes);
        AssessmentResource resource = resourceService.adminCreateForUpload(admin, metadata);
        store(resource, file, bytes);
        return resourceService.adminGet(admin, resource.id());
    }

    public ReferenceScrapResponse attach(AdminActor admin, String scrapId, String originalFileName, byte[] bytes) {
        AssessmentResource resource = owned(scrapId);
        Checked file = check(originalFileName, bytes);
        store(resource, file, bytes);
        return resourceService.adminGet(admin, scrapId);
    }

    /** 링크가 있는 스크랩만 파일 연결을 비울 수 있다(파일만 있는 스크랩은 휴지통으로 보낸다). 저장 바이트는 지우지 않는다. */
    public ReferenceScrapResponse detach(AdminActor admin, String scrapId) {
        AssessmentResource resource = owned(scrapId);
        if (resource.fields().sourceUrl() == null) {
            throw RecordJson.invalid("file", "required");
        }
        resource.detachFile(times.now());
        resources.saveAndFlush(resource);
        return resourceService.adminGet(admin, scrapId);
    }

    @Transactional(readOnly = true)
    public FileDownload download(AdminActor admin, String scrapId, boolean preview) {
        AssessmentResource.FileInfo file = owned(scrapId).file();
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

    private record Checked(String fileName, String contentType) {
    }

    private Checked check(String originalFileName, byte[] bytes) {
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
                .or(() -> ArtifactFileTypes.adminVideoContentTypeOf(fileName, bytes))
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.UNSUPPORTED_FILE_TYPE,
                        "PDF·HWP·HWPX·DOC·DOCX·XLS·XLSX·PPT·PPTX·JPG·PNG·GIF·WEBP·MP4·MOV·WEBM 파일만 올릴 수 있어요(확장자와 파일 내용이 맞아야 해요)."));
        return new Checked(fileName, contentType);
    }

    private void store(AssessmentResource resource, Checked file, byte[] bytes) {
        String storageKey = storage.store(bytes);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    storage.deleteQuietly(storageKey);
                }
            }
        });
        resource.attachFile(storageKey, file.fileName(), file.contentType(), bytes.length, ArtifactService.sha256(bytes),
                times.now());
        resources.saveAndFlush(resource);
    }

    private AssessmentResource owned(String scrapId) {
        return resources.findById(scrapId)
                .filter(r -> AssessmentResource.OWNER_ADMIN.equals(r.ownerType()) && !r.inTrash())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOT_FOUND, "스크랩을 찾을 수 없습니다."));
    }
}
