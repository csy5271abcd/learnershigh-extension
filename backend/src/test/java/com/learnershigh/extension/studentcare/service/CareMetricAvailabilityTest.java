package com.learnershigh.extension.studentcare.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
import com.learnershigh.extension.studentcare.entity.CareSettings;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** 부분 원본이나 일정 미확인을 점검 개선으로 해석하지 않는다. */
class CareMetricAvailabilityTest {
    private static final LocalDate AS_OF = LocalDate.of(2026, 10, 24);

    private static List<ExistingDailyStudy> week(boolean checkedIn, Boolean scheduled,
            boolean available, boolean submitted) {
        return AS_OF.minusDays(6).datesUntil(AS_OF.plusDays(1))
                .map(date -> new ExistingDailyStudy(date, checkedIn, null, Map.of(), submitted, Map.of(),
                        scheduled, available)).toList();
    }

    @Test
    void unknownScheduleCannotBecomeAnImprovedAbsenceComparison() {
        var days = week(false, null, true, true);
        assertThat(CareSignalCalculator.measure(CareSignalType.CONSECUTIVE_ABSENCE, null, days, AS_OF)).isEmpty();
        var baseline = new CareBaselineSignal(CareSignalType.CONSECUTIVE_ABSENCE, "기존 미입실", 4, null, null);
        var comparison = CareComparator.compare(List.of(baseline), days, AS_OF);
        assertThat(comparison.rows().getFirst().now()).isNull();
        assertThat(comparison.rows().getFirst().trend()).isEqualTo(CareComparison.Trend.SAME);
    }

    @Test
    void partialWeekCannotBecomeZeroAbsencesOrZeroMissingPlans() {
        var days = week(true, true, true, true).subList(0, 6);
        assertThat(CareSignalCalculator.measure(CareSignalType.CONSECUTIVE_ABSENCE, null, days, AS_OF)).isEmpty();
        assertThat(CareSignalCalculator.measure(CareSignalType.PLAN_MISSING, null, days, AS_OF)).isEmpty();
    }

    @Test
    void unavailableDayCannotCompleteAttendanceOrSubmissionEvidence() {
        var days = new java.util.ArrayList<>(week(true, true, true, true));
        days.set(6, new ExistingDailyStudy(AS_OF, false, null, Map.of(), false, Map.of(), true, false));
        assertThat(CareSignalCalculator.measure(CareSignalType.CONSECUTIVE_ABSENCE, null, days, AS_OF)).isEmpty();
        assertThat(CareSignalCalculator.measure(CareSignalType.PLAN_MISSING, null, days, AS_OF)).isEmpty();
    }

    @Test
    void confirmedPresenceDoesNotRequireAnInferredSchedule() {
        var present = week(true, null, true, true);
        assertThat(CareSignalCalculator.measure(CareSignalType.CONSECUTIVE_ABSENCE, null, present, AS_OF)).hasValue(0);
        assertThat(CareSignalCalculator.measure(CareSignalType.PLAN_MISSING, null, present, AS_OF)).hasValue(0);
    }

    @Test
    void partialVerifiedMissingPlansCanStillRaiseASignalWithoutInventingComparisonCoverage() {
        var days = week(true, true, true, false).subList(0, 2);
        assertThat(CareSignalCalculator.evaluate(days, AS_OF, CareSettings.Values.DEFAULTS).signals())
                .extracting(DetectedSignal::type).contains(CareSignalType.PLAN_MISSING);
        assertThat(CareSignalCalculator.measure(CareSignalType.PLAN_MISSING, null, days, AS_OF)).isEmpty();
    }
    @Test
    void legacyFormulaCannotReinterpretAnyHistoricalMetric() {
        var signal = new CareBaselineSignal(CareSignalType.EXECUTION_GAP, "이전 실행률", 60, 70, null);
        var result = CareComparator.compare(List.of(signal), week(true, null, true, true), AS_OF, 1);
        assertThat(result.rows().getFirst().before()).isEqualTo(60);
        assertThat(result.rows().getFirst().target()).isEqualTo(70);
        assertThat(result.rows().getFirst().now()).isNull();
        assertThat(result.rows().getFirst().trend()).isEqualTo(CareComparison.Trend.SAME);
    }

    @Test
    void subjectGapDoesNotClaimUsualVolumeWhenThereIsNoBaseline() {
        var days = AS_OF.minusDays(6).datesUntil(AS_OF.plusDays(1))
                .map(date -> new ExistingDailyStudy(date, true, null,
                        Map.of("수학", 10, "국어", 90), true, Map.of("수학", 50, "국어", 50))).toList();
        var signal = CareSignalCalculator.evaluate(days, AS_OF, CareSettings.Values.DEFAULTS).signals().stream()
                .filter(value -> value.type() == CareSignalType.SUBJECT_SHARE).findFirst().orElseThrow();
        assertThat(signal.evidence()).noneMatch(value -> value.contains("평소 수준"));
    }
}
