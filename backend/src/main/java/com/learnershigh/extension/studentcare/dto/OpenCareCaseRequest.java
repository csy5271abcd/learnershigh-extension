package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareReason;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OpenCareCaseRequest(
        @NotBlank String branchId,
        @NotBlank String studentId,
        @NotNull CareReason reason,
        @Size(max = 1000) String memo,
        PlanRequest plan) {
}
