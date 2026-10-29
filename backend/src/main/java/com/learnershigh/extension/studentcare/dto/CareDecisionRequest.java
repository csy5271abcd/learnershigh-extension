package com.learnershigh.extension.studentcare.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** 점검 후 결정 (api-contract.md §65-6). {@code recheckDate}는 CONTINUE일 때만 쓴다. */
public record CareDecisionRequest(@NotNull Decision decision, LocalDate recheckDate, @jakarta.validation.constraints.Size(max = 100) String actorName) {
    public CareDecisionRequest(Decision decision, LocalDate recheckDate) { this(decision, recheckDate, null); }

    public enum Decision {
        /** 관리 종료 */
        CLOSE,
        /** 계속 관리 */
        CONTINUE
    }
}
