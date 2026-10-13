package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareSettings;

public record CareSettingsResponse(
        int absenceDays,
        int planMissingDays,
        int studyDropPercent,
        int executionRatePercent,
        int subjectShareGapPoints,
        int startShiftMinutes,
        int minValidDays,
        int cooldownDays) {

    public static CareSettingsResponse from(CareSettings.Values values) {
        return new CareSettingsResponse(values.absenceDays(), values.planMissingDays(), values.studyDropPercent(),
                values.executionRatePercent(), values.subjectShareGapPoints(), values.startShiftMinutes(),
                values.minValidDays(), values.cooldownDays());
    }
}
