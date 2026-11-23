package com.learnershigh.extension.assessment.dto.plan;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST schoolinfo-sync/school-selection (§38-13, A27-UX 부록 F). candidateId 는 §38-12 응답의 후보 값만. */
public record SchoolInfoSelectionRequest(
        @NotBlank @Size(max = 64) String schoolId,
        @NotBlank @Size(max = 100) String jobId,
        @NotBlank @Size(max = 100) String candidateId,
        @Min(0) long expectedVersion) {
}
