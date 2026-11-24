package com.learnershigh.extension.assessment.dto.plan;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** PUT schoolinfo-sources/{id}/classification (§38-14, A27-UX 부록 F). */
public record SchoolInfoClassificationRequest(
        @NotBlank @Size(max = 64) String schoolId,
        @Min(2000) @Max(2100) int academicYear,
        @NotEmpty @Size(max = 3) List<@NotNull @Min(1) @Max(3) Integer> grades,
        @NotEmpty @Size(max = 2) List<@NotNull @Min(1) @Max(2) Integer> semesters,
        @Size(max = 200) String note,
        @Min(0) int expectedVersion) {
}
