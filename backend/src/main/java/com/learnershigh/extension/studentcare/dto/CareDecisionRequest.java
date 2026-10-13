package com.learnershigh.extension.studentcare.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CareDecisionRequest(@NotNull Decision decision, LocalDate recheckDate, PlanRequest plan) {

    public enum Decision {
        CLOSE,
        CONTINUE,
        REVISE
    }
}
