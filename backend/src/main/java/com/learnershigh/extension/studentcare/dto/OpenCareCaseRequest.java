package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareReason;
import com.learnershigh.extension.studentcare.entity.NoteChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * 상담 기록으로 관리 열기 (api-contract.md §65-4).
 * {@code recheckDate}는 계속 관리(ADJUSTMENT_NEEDED)일 때만 검증하고(422), 다른 결과에서는 무시한다.
 */
public record OpenCareCaseRequest(
        @NotBlank String branchId,
        @NotBlank String studentId,
        @NotNull NoteChannel channel,
        @Size(max = 1000) String memo,
        @NotNull CareReason reason,
        LocalDate recheckDate) {
}
