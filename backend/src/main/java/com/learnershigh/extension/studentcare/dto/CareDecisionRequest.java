package com.learnershigh.extension.studentcare.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * 재점검 후 선생님 결정 (api-contract.md §65-6).
 * 새 재점검일은 최상위 {@code recheckDate}다. REVISE의 {@code plan}에는 재점검일이 없다.
 */
public record CareDecisionRequest(@NotNull Decision decision, LocalDate recheckDate, Plan plan) {

    public enum Decision {
        CLOSE,
        CONTINUE,
        REVISE
    }

    /**
     * 약속 수정 입력. REVISE일 때만 Domain({@code CarePlan})이 검사한다: 길이 초과 400, 빈 목표 / 행동과 합의 422.
     * CLOSE / CONTINUE에서는 무시한다.
     */
    public record Plan(String goal, String action, String loadLimit, Boolean agreedWithStudent) {
    }
}
