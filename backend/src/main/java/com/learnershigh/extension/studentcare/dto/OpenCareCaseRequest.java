package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareReason;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 사유 확인 / 조정 시작 (api-contract.md §65-4).
 * {@code plan}은 ADJUSTMENT_NEEDED일 때만 쓰고 검증한다(그래서 여기서 {@code @Valid}로 늘 검사하지 않는다).
 * EXPECTED_CHANGE / RECORD_ISSUE의 {@code plan}은 길이와 관계없이 무시한다. 약속 검증은 Domain(CarePlan)이 한다.
 */
public record OpenCareCaseRequest(
        @NotBlank String branchId,
        @NotBlank String studentId,
        @NotNull CareReason reason,
        @Size(max = 1000) String memo,
        PlanRequest plan) {
}
