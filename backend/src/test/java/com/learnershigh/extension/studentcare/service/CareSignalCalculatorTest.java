package com.learnershigh.extension.studentcare.service;

import static com.learnershigh.extension.studentcare.service.StudyDays.AS_OF;
import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.studentcare.entity.CareSettings;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.time.LocalTime;
import java.util.List;
import java.util.function.BiFunction;
import java.util.stream.Stream;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;

class CareSignalCalculatorTest {

    @Test
    void regularOffDaysAreNotMissingPlans() {
        var days = StudyDays.build((o, d) -> AS_OF.plusDays(o).getDayOfWeek().getValue() >= 6
                ? d.absent().schedule(false) : d);
        assertThat(CareSignalCalculator.measure(CareSignalType.PLAN_MISSING, null, days, AS_OF)).hasValue(0);
    }

    @Test
    void unchangedWeekdayClocksAreNotLateWhenAttendanceCompositionChanges() {
        var days = StudyDays.build((o, d) -> {
            boolean weekend = AS_OF.plusDays(o).getDayOfWeek().getValue() >= 6;
            if (o >= -6 && weekend) return d.absent().schedule(false);
            return d.start(weekend ? LocalTime.of(10, 0) : LocalTime.of(19, 0));
        });
        assertThat(flagged(days, CareSignalType.START_TIME_SHIFT)).isFalse();
        assertThat(CareSignalCalculator.measure(CareSignalType.START_TIME_SHIFT, null, days, AS_OF)).hasValue(0);
    }

    @Test
    void startMeasurementIsPersonalWeekdayDeviationInMinutes() {
        var days = StudyDays.build((o, d) -> d.start(o >= -6 ? LocalTime.of(20, 30) : LocalTime.of(19, 0)));
        assertThat(CareSignalCalculator.measure(CareSignalType.START_TIME_SHIFT, null, days, AS_OF)).hasValue(90);
    }

    private static final CareSettings.Values DEFAULTS = new CareSettings.Values(3, 3, 40, 60, 15, 90, 3, 7);

    private static SignalEvaluation evaluate(List<ExistingDailyStudy> days) {
        return CareSignalCalculator.evaluate(days, AS_OF, DEFAULTS);
    }

    private static List<CareSignalType> types(SignalEvaluation evaluation) {
        return evaluation.signals().stream().map(DetectedSignal::type).toList();
    }

    private static boolean flagged(List<ExistingDailyStudy> days, CareSignalType type) {
        return types(evaluate(days)).contains(type);
    }

    private static DetectedSignal signal(List<ExistingDailyStudy> days, CareSignalType type) {
        return evaluate(days).signals().stream().filter(s -> s.type() == type).findFirst().orElseThrow();
    }

    /** 기본 기준값에서 key 하나만 바꾼 값. */
    private static CareSettings.Values settingsWith(String key, int value) {
        java.util.Map<String, Integer> map = new java.util.LinkedHashMap<>(DEFAULTS.asMap());
        map.put(key, value);
        return new CareSettings.Values(map.get("absenceDays"), map.get("planMissingDays"), map.get("studyDropPercent"),
                map.get("executionRatePercent"), map.get("subjectShareGapPoints"), map.get("startShiftMinutes"),
                map.get("minValidDays"), map.get("cooldownDays"));
    }

    /**
     * Threshold 경계 (domain.md §3, 기본 기준값). 판정은 반올림하지 않은 값으로 한다.
     * 각 쌍은 "기준과 정확히 같음 → 신호" / "한 단계 모자람 → 신호 없음"이다.
     */
    @Nested
    class Thresholds {

        @Test
        void consecutiveAbsenceThreeDaysVersusTwo() {
            assertThat(flagged(StudyDays.build((o, d) -> o >= -2 ? d.absent() : d), CareSignalType.CONSECUTIVE_ABSENCE))
                    .isTrue();
            assertThat(flagged(StudyDays.build((o, d) -> o >= -1 ? d.absent() : d), CareSignalType.CONSECUTIVE_ABSENCE))
                    .isFalse();
        }

        @ParameterizedTest
        @CsvSource({"10", "14"})
        void legacyThresholdBeyondSevenCannotBeReached(int absenceDays) {
            List<ExistingDailyStudy> days = StudyDays.build((o, d) -> d.absent());
            assertThat(types(CareSignalCalculator.evaluate(days, AS_OF, settingsWith("absenceDays", absenceDays))))
                    .doesNotContain(CareSignalType.CONSECUTIVE_ABSENCE);
            assertThat(CareSignalCalculator.measure(CareSignalType.CONSECUTIVE_ABSENCE, null, days, AS_OF)).hasValue(7);
        }

        @Test
        void historyWindowCoversTheLargestAbsenceThreshold() {
            assertThat(CareSignalCalculator.HISTORY_DAYS).isGreaterThan(CareSettings.RANGES.get("absenceDays").max());
        }

        @Test
        void planMissingThreeDaysVersusTwo() {
            assertThat(flagged(StudyDays.build((o, d) -> o >= -2 ? d.noPlan() : d), CareSignalType.PLAN_MISSING))
                    .isTrue();
            assertThat(flagged(StudyDays.build((o, d) -> o >= -1 ? d.noPlan() : d), CareSignalType.PLAN_MISSING))
                    .isFalse();
        }

        @Test
        void studyDropExactlyFortyPercentVersusJustBelow() {
            // 평소 = baseline28 6720분 ÷ 4 = 1680분. 1008분이면 정확히 40% 감소, 1009분이면 39.94%.
            List<ExistingDailyStudy> forty = StudyDays.build((o, d) -> o >= -6 ? d.study(144) : d);
            List<ExistingDailyStudy> justBelow = StudyDays.build((o, d) -> o >= -6 ? d.study(o == 0 ? 145 : 144) : d);

            assertThat(signal(forty, CareSignalType.STUDY_DROP).value()).isEqualTo(1008);
            assertThat(flagged(justBelow, CareSignalType.STUDY_DROP)).isFalse();
        }

        @Test
        void executionRateSixtyPercentIsNotAGapButJustBelowIs() {
            // 계획 1680분 중 1008분 = 정확히 60% → 미만이 아니다. 1007분 = 59.94% → 신호.
            List<ExistingDailyStudy> sixty = StudyDays.build((o, d) -> o >= -6 ? d.study(144) : d);
            List<ExistingDailyStudy> justBelow = StudyDays.build((o, d) -> o >= -6 ? d.study(o == 0 ? 143 : 144) : d);

            assertThat(flagged(sixty, CareSignalType.EXECUTION_GAP)).isFalse();
            assertThat(flagged(justBelow, CareSignalType.EXECUTION_GAP)).isTrue();
        }

        @Test
        void executionRateFiftyNinePointSixIsFlaggedEvenThoughItRoundsToSixty() {
            // 계획 1750분 중 1043분 = 59.6% (domain.md §3 예). 표시 값만 60으로 반올림한다.
            DetectedSignal gap = signal(StudyDays.build((o, d) -> o >= -6 ? d.planned(250).study(149) : d),
                    CareSignalType.EXECUTION_GAP);

            assertThat(gap.value()).isEqualTo(60);
            assertThat(gap.summary()).isEqualTo("최근 7일 계획 달성률 60%");
        }

        @Test
        void executedMinutesCountOnlyDaysWithSubmittedPlan() {
            // 계획을 낸 날: 계획 240 / 실행 120 (50%). 계획을 안 낸 날의 600분은 실행에 넣지 않는다.
            DetectedSignal gap = signal(StudyDays.build((o, d) -> {
                if (o < -6) {
                    return d;
                }
                return o % 2 == 0 ? d.noPlan().study(600) : d.study(120);
            }), CareSignalType.EXECUTION_GAP);

            assertThat(gap.value()).isEqualTo(50);
        }

        @Test
        void subjectShareGapExactlyFifteenVersusFourteenPointSix() {
            // 계획 비중 25%. 실제 10% → 차이 15%p(신호). 실제 10.4% → 14.6%p(반올림하면 15지만 신호 아님).
            List<ExistingDailyStudy> fifteen = StudyDays.build((o, d) -> o >= -6 ? d.studyBySubject(72, 24, 72, 72) : d);
            List<ExistingDailyStudy> fourteenSix = StudyDays.build(
                    (o, d) -> o >= -6 ? d.studyBySubject(74, 26, 75, 75) : d);

            DetectedSignal share = signal(fifteen, CareSignalType.SUBJECT_SHARE);
            assertThat(share.subject()).isEqualTo("수학");
            assertThat(share.value()).isEqualTo(10);
            assertThat(share.target()).isEqualTo(25);
            assertThat(flagged(fourteenSix, CareSignalType.SUBJECT_SHARE)).isFalse();
        }

        @Test
        void subjectShareTieUsesSubjectNameOrder() {
            DetectedSignal share = signal(StudyDays.build((o, d) -> o >= -6 ? d.studyBySubject(24, 24, 96, 96) : d),
                    CareSignalType.SUBJECT_SHARE);

            assertThat(share.subject()).isEqualTo("국어");
        }

        @Test
        void startShiftNinetyMinutesVersusEightyNinePointSix() {
            // 평소 18:00. 최근 19:30 → 90분(신호). 하루만 19:27 → 평균 89.57분(반올림하면 90이지만 신호 아님).
            List<ExistingDailyStudy> ninety = StudyDays.build(
                    (o, d) -> o >= -6 ? d.start(LocalTime.of(19, 30)) : d);
            List<ExistingDailyStudy> justBelow = StudyDays.build(
                    (o, d) -> o >= -6 ? d.start(o == 0 ? LocalTime.of(19, 27) : LocalTime.of(19, 30)) : d);

            assertThat(signal(ninety, CareSignalType.START_TIME_SHIFT).value()).isEqualTo(90);
            assertThat(flagged(justBelow, CareSignalType.START_TIME_SHIFT)).isFalse();
            assertThat(flagged(StudyDays.build((o, d) -> o >= -6 ? d.start(LocalTime.of(19, 29)) : d),
                    CareSignalType.START_TIME_SHIFT)).isFalse();
        }

        @Test
        void startShiftNeedsThreeCheckInDaysInEachWindow() {
            // 첫 입실 시각이 없는 날(입실은 했지만 시각 기록 없음)은 표본이 아니다.
            assertThat(flagged(StudyDays.build((o, d) -> o >= -6 ? d.start(o >= -2 ? LocalTime.of(21, 0) : null) : d),
                    CareSignalType.START_TIME_SHIFT)).isTrue();
            assertThat(flagged(StudyDays.build((o, d) -> o >= -6 ? d.start(o >= -1 ? LocalTime.of(21, 0) : null) : d),
                    CareSignalType.START_TIME_SHIFT)).isFalse();

            assertThat(flagged(StudyDays.build((o, d) -> o >= -6 ? d.start(LocalTime.of(21, 0))
                    : d.start(o >= -9 ? LocalTime.of(18, 0) : null)), CareSignalType.START_TIME_SHIFT)).isTrue();
            assertThat(flagged(StudyDays.build((o, d) -> o >= -6 ? d.start(LocalTime.of(21, 0))
                    : d.start(o >= -8 ? LocalTime.of(18, 0) : null)), CareSignalType.START_TIME_SHIFT)).isFalse();
        }

        @Test
        void validStudyDayStartsAtThirtyMinutes() {
            // 최근 7일: 240분 2일 + X분 1일 + 10분 4일. X=30이면 유효 3일, X=29면 2일(판단 보류).
            SignalEvaluation thirty = evaluate(StudyDays.build(
                    (o, d) -> o == -4 ? d.study(30) : o >= -3 ? d.study(10) : d));
            SignalEvaluation twentyNine = evaluate(StudyDays.build(
                    (o, d) -> o == -4 ? d.study(29) : o >= -3 ? d.study(10) : d));

            assertThat(thirty.validDays()).isEqualTo(3);
            assertThat(thirty.volumeSkipped()).isFalse();
            assertThat(twentyNine.validDays()).isEqualTo(2);
            assertThat(twentyNine.deferred()).isTrue();
        }

        @Test
        void attendanceSignalsHaveNoTarget() {
            SignalEvaluation evaluation = evaluate(StudyDays.build((o, d) -> o >= -3 ? d.absent() : d));

            assertThat(evaluation.signals()).extracting(DetectedSignal::target).containsOnlyNulls();
            assertThat(evaluation.signals()).extracting(DetectedSignal::toBaseline)
                    .extracting(com.learnershigh.extension.studentcare.entity.CareBaselineSignal::target)
                    .containsOnlyNulls();
        }
    }

    static Stream<Arguments> settingKeys() {
        BiFunction<Integer, StudyDays.Day, StudyDays.Day> twoAbsent = (o, d) -> o >= -1 ? d.absent() : d;
        BiFunction<Integer, StudyDays.Day, StudyDays.Day> twoNoPlan = (o, d) -> o >= -1 ? d.noPlan() : d;
        BiFunction<Integer, StudyDays.Day, StudyDays.Day> dropThirty = (o, d) -> o >= -6 ? d.study(168) : d;
        BiFunction<Integer, StudyDays.Day, StudyDays.Day> rateSixtyFive = (o, d) -> o >= -6 ? d.study(156) : d;
        BiFunction<Integer, StudyDays.Day, StudyDays.Day> gapTen =
                (o, d) -> o >= -6 ? d.studyBySubject(70, 36, 70, 64) : d;
        BiFunction<Integer, StudyDays.Day, StudyDays.Day> shiftSixty =
                (o, d) -> o >= -6 ? d.start(LocalTime.of(19, 0)) : d;
        return Stream.of(
                Arguments.of("absenceDays", 2, twoAbsent, CareSignalType.CONSECUTIVE_ABSENCE),
                Arguments.of("planMissingDays", 2, twoNoPlan, CareSignalType.PLAN_MISSING),
                Arguments.of("studyDropPercent", 30, dropThirty, CareSignalType.STUDY_DROP),
                Arguments.of("executionRatePercent", 70, rateSixtyFive, CareSignalType.EXECUTION_GAP),
                Arguments.of("subjectShareGapPoints", 10, gapTen, CareSignalType.SUBJECT_SHARE),
                Arguments.of("startShiftMinutes", 60, shiftSixty, CareSignalType.START_TIME_SHIFT));
    }

    /** 기준값 Key마다 그 값이 실제 판정을 바꾼다: 기본값에서는 신호 없음, 바꾼 값에서는 신호. */
    @ParameterizedTest(name = "{0} = {1}")
    @MethodSource("settingKeys")
    void eachSettingKeyChangesDetection(String key, int changed,
            BiFunction<Integer, StudyDays.Day, StudyDays.Day> scenario, CareSignalType type) {
        List<ExistingDailyStudy> days = StudyDays.build(scenario);

        assertThat(types(CareSignalCalculator.evaluate(days, AS_OF, DEFAULTS))).doesNotContain(type);
        assertThat(types(CareSignalCalculator.evaluate(days, AS_OF, settingsWith(key, changed)))).contains(type);
    }

    @ParameterizedTest(name = "minValidDays = {0} → 학습량 계열 생략 {1}")
    @CsvSource({"3, false", "4, true"})
    void minValidDaysDecidesWhetherVolumeSignalsAreSkipped(int minValidDays, boolean skipped) {
        // 최근 7일 유효 학습일 3일
        List<ExistingDailyStudy> days = StudyDays.build((o, d) -> o >= -3 ? d.study(10) : d);

        SignalEvaluation evaluation = CareSignalCalculator.evaluate(days, AS_OF, settingsWith("minValidDays", minValidDays));

        assertThat(evaluation.validDays()).isEqualTo(3);
        assertThat(evaluation.volumeSkipped()).isEqualTo(skipped);
        assertThat(types(evaluation).contains(CareSignalType.STUDY_DROP)).isEqualTo(!skipped);
    }

    @Test
    void usualStudentHasNoSignal() {
        SignalEvaluation evaluation = evaluate(StudyDays.usual());

        assertThat(evaluation.signals()).isEmpty();
        assertThat(evaluation.deferred()).isFalse();
        assertThat(evaluation.validDays()).isEqualTo(7);
    }

    @Nested
    class ConsecutiveAbsence {

        @Test
        void flaggedFromThresholdAndSkipsVolumeSignals() {
            SignalEvaluation evaluation = evaluate(StudyDays.build((offset, day) -> offset >= -3 ? day.absent() : day));

            assertThat(types(evaluation)).containsExactly(CareSignalType.CONSECUTIVE_ABSENCE, CareSignalType.PLAN_MISSING);
            DetectedSignal absence = evaluation.signals().getFirst();
            assertThat(absence.summary()).isEqualTo("최근 7일 중 4일 미입실");
            assertThat(absence.evidence()).containsExactly("최근 7일 중 4일 미입실", "마지막 등원 9월 26일");
            assertThat(absence.value()).isEqualTo(4);
            assertThat(evaluation.deferred()).isFalse();
        }

        @Test
        void belowThresholdIsNotFlagged() {
            SignalEvaluation evaluation = evaluate(StudyDays.build((offset, day) -> offset >= -1 ? day.absent() : day));

            assertThat(types(evaluation)).doesNotContain(CareSignalType.CONSECUTIVE_ABSENCE);
        }

        @Test
        void absenceNeedNotEndAtAsOf() {
            SignalEvaluation evaluation = evaluate(
                    StudyDays.build((offset, day) -> offset >= -6 && offset <= -2 ? day.absent() : day));

            assertThat(types(evaluation)).contains(CareSignalType.CONSECUTIVE_ABSENCE);
            assertThat(evaluation.signals().getFirst().value()).isEqualTo(5);
        }
    }

    @Test
    void planMissingCountsOnlyLastSevenDays() {
        SignalEvaluation flagged = evaluate(StudyDays.build(
                (offset, day) -> offset == -6 || offset == -4 || offset == -2 || offset == 0 ? day.noPlan() : day));
        SignalEvaluation older = evaluate(StudyDays.build(
                (offset, day) -> offset <= -7 && offset >= -12 ? day.noPlan() : day));

        assertThat(types(flagged)).containsExactly(CareSignalType.PLAN_MISSING);
        assertThat(flagged.signals().getFirst().summary()).isEqualTo("최근 7일 중 4일 미제출");
        assertThat(types(older)).isEmpty();
    }

    @Nested
    class StudyDrop {

        @Test
        void flaggedWhenLastSevenDaysDropAtLeastThreshold() {
            SignalEvaluation evaluation = evaluate(StudyDays.build(
                    (offset, day) -> offset >= -6 ? day.study(120).planned(120) : day));

            assertThat(types(evaluation)).containsExactly(CareSignalType.STUDY_DROP);
            DetectedSignal drop = evaluation.signals().getFirst();
            assertThat(drop.summary()).isEqualTo("최근 7일 14시간 · 평소 28시간");
            assertThat(drop.evidence().getFirst()).endsWith(" · 50% 감소");
            assertThat(drop.value()).isEqualTo(840);
            assertThat(drop.target()).isEqualTo(1680);
        }

        @Test
        void notFlaggedJustBelowThreshold() {
            SignalEvaluation evaluation = evaluate(StudyDays.build(
                    (offset, day) -> offset >= -6 ? day.study(150).planned(150) : day));

            assertThat(types(evaluation)).isEmpty();
        }
    }

    @Test
    void executionGapUsesPlannedDaysOfLastSevenDays() {
        SignalEvaluation evaluation = evaluate(StudyDays.build(
                (offset, day) -> offset >= -6 ? day.planned(450) : day));

        assertThat(types(evaluation)).containsExactly(CareSignalType.EXECUTION_GAP);
        DetectedSignal gap = evaluation.signals().getFirst();
        assertThat(gap.value()).isEqualTo(53);
        assertThat(gap.summary()).isEqualTo("최근 7일 계획 달성률 53%");
        assertThat(gap.evidence()).containsExactly("계획 52시간 30분 중 28시간 달성");
        assertThat(gap.target()).isEqualTo(60);
    }

    @Test
    void subjectShareComparesPlannedAndActualShare() {
        SignalEvaluation evaluation = evaluate(StudyDays.build(
                (offset, day) -> offset >= -6 ? day.studyBySubject(80, 20, 80, 60) : day));

        assertThat(types(evaluation)).containsExactly(CareSignalType.SUBJECT_SHARE);
        DetectedSignal share = evaluation.signals().getFirst();
        assertThat(share.subject()).isEqualTo("수학");
        assertThat(share.summary()).isEqualTo("수학 계획 25% → 실제 8%");
        assertThat(share.evidence()).containsExactly("수학 계획 25% → 실제 8% · 전체 공부 시간은 평소 수준");
        assertThat(share.value()).isEqualTo(8);
        assertThat(share.target()).isEqualTo(25);
    }

    @Test
    void startTimeShiftComparesAverageFirstCheckIn() {
        SignalEvaluation evaluation = evaluate(StudyDays.build(
                (offset, day) -> offset >= -6 ? day.start(LocalTime.of(20, 30)) : day.start(LocalTime.of(19, 0))));

        assertThat(types(evaluation)).containsExactly(CareSignalType.START_TIME_SHIFT);
        DetectedSignal shift = evaluation.signals().getFirst();
        assertThat(shift.summary()).isEqualTo("평소보다 90분 늦게 입실");
        assertThat(shift.value()).isEqualTo(90);
        assertThat(shift.target()).isEqualTo(0);
    }

    @Nested
    class Deferred {

        @Test
        void fewValidDaysSkipVolumeSignalsAndDefer() {
            SignalEvaluation evaluation = evaluate(StudyDays.build(
                    (offset, day) -> offset >= -6 && offset != -2 && offset != -5 ? day.study(10) : day));

            assertThat(evaluation.signals()).isEmpty();
            assertThat(evaluation.deferred()).isTrue();
            assertThat(evaluation.validDays()).isEqualTo(2);
        }

        @Test
        void attendanceSignalStillShowsWhenDataIsThin() {
            SignalEvaluation evaluation = evaluate(StudyDays.build(
                    (offset, day) -> offset >= -6 && offset != -2 && offset != -5 ? day.study(10).noPlan() : day));

            assertThat(types(evaluation)).containsExactly(CareSignalType.PLAN_MISSING);
            assertThat(evaluation.deferred()).isFalse();
        }
    }

    @Test
    void thresholdsComeFromSettings() {
        List<ExistingDailyStudy> days = StudyDays.build((offset, day) -> offset >= -1 ? day.absent() : day);
        CareSettings.Values strict = new CareSettings.Values(2, 3, 40, 60, 15, 90, 3, 7);

        assertThat(CareSignalCalculator.evaluate(days, AS_OF, strict).signals())
                .extracting(DetectedSignal::type).contains(CareSignalType.CONSECUTIVE_ABSENCE);
    }

    @Test
    void signalsAreOrderedByPriority() {
        SignalEvaluation evaluation = evaluate(StudyDays.build((offset, day) -> {
            if (offset >= -6) {
                day.study(100).start(LocalTime.of(21, 0));
            }
            return offset == 0 || offset == -1 || offset == -3 ? day.noPlan() : day;
        }));

        assertThat(types(evaluation)).containsExactly(
                CareSignalType.PLAN_MISSING, CareSignalType.STUDY_DROP, CareSignalType.EXECUTION_GAP, CareSignalType.START_TIME_SHIFT);
    }

    @Test
    void usualDailyMinutesAndLastFourteenDays() {
        List<ExistingDailyStudy> days = StudyDays.usual();

        assertThat(CareSignalCalculator.usualDailyMinutes(days, AS_OF)).isEqualTo(240);
        assertThat(CareSignalCalculator.last14(days, AS_OF)).hasSize(14)
                .first().extracting(ExistingDailyStudy::date).isEqualTo(AS_OF.minusDays(13));
    }
    @Test
    void historyIncludesOldestBaselineWeek() {
        assertThat(CareSignalCalculator.historyFrom(AS_OF)).isEqualTo(AS_OF.minusDays(34));
        assertThat(signal(StudyDays.build((o, d) -> o <= -28 ? d.study(960) : d), CareSignalType.STUDY_DROP).target())
                .isEqualTo(2940);
    }

    @Test
    void incompleteBaselineCannotInventZeroDaysOrStudyDrop() {
        List<ExistingDailyStudy> days = StudyDays.build((o, d) -> o >= -6 ? d.study(40) : d);
        assertThat(flagged(days.stream().filter(d -> !d.date().equals(AS_OF.minusDays(34))).toList(),
                CareSignalType.STUDY_DROP)).isFalse();
        assertThat(flagged(StudyDays.build((o, d) -> o == -34 ? d.unavailable() : o >= -6 ? d.study(40) : d),
                CareSignalType.STUDY_DROP)).isFalse();
    }

    @Test
    void missingRecordsAreNeitherPlansNorValidDaysNorAbsences() {
        SignalEvaluation result = evaluate(StudyDays.build((o, d) -> o >= -6 ? d.absent().study(240).unavailable() : d));
        assertThat(result.validDays()).isZero();
        assertThat(result.signals()).isEmpty();
        assertThat(result.deferred()).isTrue();
    }

    @Test
    void scheduledAbsenceExcludesUnknownUnscheduledAndUnavailableDates() {
        List<ExistingDailyStudy> days = StudyDays.build((o, d) -> switch (o) {
            case -6 -> d.absent().schedule(null);
            case -5 -> d.absent().schedule(false);
            case -4 -> d.absent().schedule(null);
            case -3 -> d.absent().unavailable();
            case -2 -> d.absent();
            default -> d;
        });
        assertThat(CareSignalCalculator.measure(CareSignalType.CONSECUTIVE_ABSENCE, null, days, AS_OF)).isEmpty();
        assertThat(CareSignalCalculator.evaluate(days, AS_OF, CareSettings.Values.DEFAULTS).signals())
                .extracting(DetectedSignal::type).contains(CareSignalType.CONSECUTIVE_ABSENCE);
        assertThat(CareSignalCalculator.evaluate(days, AS_OF, CareSettings.Values.DEFAULTS).signals().stream()
                .filter(signal -> signal.type() == CareSignalType.CONSECUTIVE_ABSENCE).findFirst().orElseThrow().value())
                .isEqualTo(1);
        assertThat(CareSignalType.CONSECUTIVE_ABSENCE.label()).isEqualTo("미입실");
    }

    @Test
    void executionUsesOnlyCurrentComparableDaysAndCanExceedOneHundred() {
        List<ExistingDailyStudy> days = StudyDays.build((o, d) -> {
            if (o < -6) return d.study(0).planned(10000);
            if (o == -6) return d.absent().planned(10000).schedule(false);
            if (o == -5) return d.planned(10000).unavailable();
            if (o == -4) return d.planned(0).study(10000);
            return d.planned(100).study(150);
        });
        assertThat(CareSignalCalculator.measure(CareSignalType.EXECUTION_GAP, null, days, AS_OF)).hasValue(150);
        assertThat(flagged(days, CareSignalType.EXECUTION_GAP)).isFalse();
    }

    @Test
    void missingCurrentDateSuppressesStudyDropAndTotalRecheck() {
        List<ExistingDailyStudy> days = StudyDays.build((o, d) -> o >= -6 ? d.study(40) : d)
                .stream().filter(d -> !d.date().equals(AS_OF)).toList();
        assertThat(flagged(days, CareSignalType.STUDY_DROP)).isFalse();
        assertThat(CareSignalCalculator.measure(CareSignalType.STUDY_DROP, null, days, AS_OF)).isEmpty();
    }

    @Test
    void unrecordedCountMetricsAreNotMeasuredAsZero() {
        List<ExistingDailyStudy> days = StudyDays.build((o, d) -> d.unavailable());
        assertThat(CareSignalCalculator.measure(CareSignalType.PLAN_MISSING, null, days, AS_OF)).isEmpty();
        assertThat(CareSignalCalculator.measure(CareSignalType.CONSECUTIVE_ABSENCE, null, days, AS_OF)).isEmpty();
    }

    @Test
    void unavailableCheckInTimesDoNotBecomeStartSamples() {
        assertThat(flagged(StudyDays.build((o, d) -> o >= -6 ? d.start(LocalTime.of(23, 0)).unavailable() : d),
                CareSignalType.START_TIME_SHIFT)).isFalse();
    }

}
