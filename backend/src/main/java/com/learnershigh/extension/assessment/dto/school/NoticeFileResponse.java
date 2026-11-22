package com.learnershigh.extension.assessment.dto.school;

import java.time.OffsetDateTime;

/** A27-UX 수행평가 안내문 첨부 (§12-c DRAFT) */
public record NoticeFileResponse(String fileId, String fileName, String contentType, long sizeBytes,
        OffsetDateTime uploadedAt) {
}
