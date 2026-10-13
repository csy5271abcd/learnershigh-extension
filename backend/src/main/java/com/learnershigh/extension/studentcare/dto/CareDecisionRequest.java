package com.learnershigh.extension.studentcare.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * 재점검 후 선생님 결정 (api-contract.md §65-6).
 * 새 재점검일은 최상위 {@code recheckDate}다. REVISE의 {@code plan}에는 재점검일이 없다.
 */
public record CareDecisionRequest(@NotNull Decision decision, LocalDate recheckDate, @Valid Plan plan) {

    public enum Decision {
        CLOSE,
        CONTINUE,
        REVISE
    }

    /** 약속 수정 입력. 길이 초과는 400, 빈 목표 / 행동과 합의는 Domain이 422로 검사한다. */
    public record Plan(
            @Size(max = 200) String goal,
            @Size(max = 200) String action,
            @Size(max = 100) String loadLimit,
            Boolean agreedWithStudent) {
    }
}
