package com.learnershigh.extension.studentcare.dto;

import java.time.LocalDate;

/**
 * 사유 확인(조정 시작)의 약속 입력 (api-contract.md §65-4). ADJUSTMENT_NEEDED일 때만 읽는다.
 * 검증은 Domain(CarePlan / CareCase)이 한다: 길이 초과는 400 VALIDATION_ERROR(field {@code plan.goal} 등),
 * 빈 목표 / 행동, 합의, 재점검일은 422.
 */
public record PlanRequest(
        String goal,
        String action,
        String loadLimit,
        LocalDate recheckDate,
        Boolean agreedWithStudent) {
}
