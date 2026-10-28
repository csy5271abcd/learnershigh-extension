package com.learnershigh.extension.studentcare.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.FieldViolation;
import com.learnershigh.extension.studentcare.exception.StudentCareErrorCode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** 기준값 범위 (domain.md §4-3): 8 Key × {min, max, min−1, max+1}. */
class CareSettingsTest {

    private static final Instant NOW = Instant.parse("2026-09-30T03:00:00Z");

    private static CareSettings.Values with(String key, int value) {
        Map<String, Integer> map = new LinkedHashMap<>(CareSettings.Values.DEFAULTS.asMap());
        map.put(key, value);
        return new CareSettings.Values(map.get("absenceDays"), map.get("planMissingDays"), map.get("studyDropPercent"),
                map.get("executionRatePercent"), map.get("subjectShareGapPoints"), map.get("startShiftMinutes"),
                map.get("minValidDays"), map.get("cooldownDays"));
    }

    @ParameterizedTest
    @CsvSource({
            "absenceDays, 1, 14",
            "planMissingDays, 1, 7",
            "studyDropPercent, 10, 90",
            "executionRatePercent, 10, 100",
            "subjectShareGapPoints, 5, 60",
            "startShiftMinutes, 30, 300",
            "minValidDays, 1, 7",
            "cooldownDays, 0, 30"
    })
    void eachKeyAcceptsItsRangeEndsAndRejectsOneStepOutside(String key, int min, int max) {
        assertThat(CareSettings.RANGES.get(key)).isEqualTo(new CareSettings.Range(min, max));

        assertThat(CareSettings.create("br", with(key, min), NOW).values().asMap().get(key)).isEqualTo(min);
        assertThat(CareSettings.create("br", with(key, max), NOW).values().asMap().get(key)).isEqualTo(max);

        for (int outside : List.of(min - 1, max + 1)) {
            BusinessException exception = catchThrowableOfType(BusinessException.class,
                    () -> CareSettings.create("br", with(key, outside), NOW));
            assertThat(exception.errorCode()).isEqualTo(StudentCareErrorCode.INVALID_CARE_SETTINGS);
            assertThat(exception.details().get("fields")).isEqualTo(List.of(new FieldViolation(key, "range")));
        }
    }

    @Test
    void rangesCoverEveryKeyInContractOrderAndDefaultsAreInside() {
        assertThat(CareSettings.RANGES.keySet()).containsExactlyElementsOf(CareSettings.Values.DEFAULTS.asMap().keySet());
        CareSettings.Values.DEFAULTS.asMap()
                .forEach((key, value) -> assertThat(CareSettings.RANGES.get(key).contains(value)).isTrue());
    }

    @Test
    void updateValidatesAndKeepsPreviousValuesOnError() {
        CareSettings settings = CareSettings.create("br", CareSettings.Values.DEFAULTS, NOW);

        catchThrowableOfType(BusinessException.class, () -> settings.update(with("cooldownDays", 31), NOW));

        assertThat(settings.values()).isEqualTo(CareSettings.Values.DEFAULTS);
    }
    @Test
    void weeklyDefaultsPreserveStoredValues() {
        assertThat(CareSettings.defaults("new").values()).isEqualTo(new CareSettings.Values(1, 2, 30, 60, 20, 60, 3, 7));
        CareSettings.Values old = new CareSettings.Values(14, 3, 40, 60, 15, 90, 3, 7);
        assertThat(CareSettings.create("old", old, NOW).values()).isEqualTo(old);
    }

}
