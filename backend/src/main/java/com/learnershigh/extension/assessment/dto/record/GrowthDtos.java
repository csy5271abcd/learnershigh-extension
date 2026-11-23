package com.learnershigh.extension.assessment.dto.record;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** api-contract.md §29 성장 기록 DTO (Frontend 계약 Type CreateGrowthRecordRequest·GrowthRecord와 같은 필드). */
public final class GrowthDtos {

    private GrowthDtos() {
    }

    public record GrowthRecordResponse(String recordId, String title, String subjectId, LocalDate activityStartDate,
            String role, String motivation, String process, String contribution, String difficulty, String solution,
            String outcome, String reflection, String followUp, String relatedSourceType, String relatedSourceId,
            List<String> artifactIds, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }
}
