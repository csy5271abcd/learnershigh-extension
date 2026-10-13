package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareReason;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 사유 확인 / 조정 시작 (api-contract.md §65-4). {@code plan}은 ADJUSTMENT_NEEDED일 때만 쓴다. */
public record OpenCareCaseRequest(
        @NotBlank String branchId,
        @NotBlank String studentId,
        @NotNull CareReason reason,
        @Size(max = 1000) String memo,
        @Valid PlanRequest plan) {
}
