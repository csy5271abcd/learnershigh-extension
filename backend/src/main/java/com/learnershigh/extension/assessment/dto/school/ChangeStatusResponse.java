package com.learnershigh.extension.assessment.dto.school;

import java.time.OffsetDateTime;

/** §13 응답. */
public record ChangeStatusResponse(String assessmentId, String status, OffsetDateTime updatedAt) {
}
