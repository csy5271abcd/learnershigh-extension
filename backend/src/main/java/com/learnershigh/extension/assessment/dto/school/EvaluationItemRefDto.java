package com.learnershigh.extension.assessment.dto.school;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** §12 evaluationItemRef. */
public record EvaluationItemRefDto(
        @NotBlank @Size(max = 64) String documentRevisionId,
        @NotBlank @Size(max = 64) String subjectId,
        @NotBlank @Size(max = 100) String itemKey) {
}
