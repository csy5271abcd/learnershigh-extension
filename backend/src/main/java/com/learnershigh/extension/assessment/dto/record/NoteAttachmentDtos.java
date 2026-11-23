package com.learnershigh.extension.assessment.dto.record;

import java.time.OffsetDateTime;

/** §26-1 노트 첨부 (A28-41). 저장 키·서버 경로는 내보내지 않는다. */
public final class NoteAttachmentDtos {

    private NoteAttachmentDtos() {
    }

    public record NoteAttachmentResponse(String attachmentId, String fileName, String contentType, long sizeBytes,
            String sha256, OffsetDateTime uploadedAt, boolean previewSupported) {
    }
}
