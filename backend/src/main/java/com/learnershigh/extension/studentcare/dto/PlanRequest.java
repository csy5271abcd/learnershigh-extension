package com.learnershigh.extension.studentcare.dto;

import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * 사유 확인(조정 시작)의 약속 입력 (api-contract.md §65-4).
 * 길이 초과는 400 VALIDATION_ERROR(field {@code plan.goal} 등). 빈 목표 / 행동, 합의, 재점검일은 Domain이 422로 검사한다.
 */
public record PlanRequest(
        @Size(max = 200) String goal,
        @Size(max = 200) String action,
        @Size(max = 100) String loadLimit,
        LocalDate recheckDate,
        Boolean agreedWithStudent) {
}
