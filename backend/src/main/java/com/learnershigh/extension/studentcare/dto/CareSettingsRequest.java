package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareSettings;
import jakarta.validation.constraints.NotNull;

/** 기준값 전체. 범위 검사는 Domain(CareSettings)이 422로 한다. */
public record CareSettingsRequest(
        @NotNull Integer absenceDays,
        @NotNull Integer planMissingDays,
        @NotNull Integer studyDropPercent,
        @NotNull Integer executionRatePercent,
        @NotNull Integer subjectShareGapPoints,
        @NotNull Integer startShiftMinutes,
        @NotNull Integer minValidDays,
        @NotNull Integer cooldownDays) {

    public CareSettings.Values toValues() {
        return new CareSettings.Values(absenceDays, planMissingDays, studyDropPercent, executionRatePercent,
                subjectShareGapPoints, startShiftMinutes, minValidDays, cooldownDays);
    }
}
