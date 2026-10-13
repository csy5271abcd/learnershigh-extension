package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareSettings;
import java.util.LinkedHashMap;
import java.util.Map;

/** 기준값과 각 값의 허용 범위 (api-contract.md §65-9). 범위는 {@link CareSettings#RANGES}에서 온다. */
public record CareSettingsResponse(
        int absenceDays,
        int planMissingDays,
        int studyDropPercent,
        int executionRatePercent,
        int subjectShareGapPoints,
        int startShiftMinutes,
        int minValidDays,
        int cooldownDays,
        Map<String, Range> ranges) {

    public static CareSettingsResponse from(CareSettings.Values values) {
        Map<String, Range> ranges = new LinkedHashMap<>();
        CareSettings.RANGES.forEach((key, range) -> ranges.put(key, new Range(range.min(), range.max())));
        return new CareSettingsResponse(values.absenceDays(), values.planMissingDays(), values.studyDropPercent(),
                values.executionRatePercent(), values.subjectShareGapPoints(), values.startShiftMinutes(),
                values.minValidDays(), values.cooldownDays(), ranges);
    }

    public record Range(int min, int max) {
    }
}
