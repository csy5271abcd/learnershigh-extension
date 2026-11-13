package com.learnershigh.extension.assessment.dto.school;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** §13 PATCH .../status 요청. 허용 값은 BEFORE_START / IN_PROGRESS / COMPLETED (§13). */
public record ChangeStatusRequest(@NotNull @Pattern(regexp = "BEFORE_START|IN_PROGRESS|COMPLETED") String status) {
}
