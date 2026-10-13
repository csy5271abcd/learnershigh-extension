package com.learnershigh.extension.studentcare.service;

import static com.learnershigh.extension.studentcare.service.StudyDays.AS_OF;
import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.studentcare.entity.CareSettings;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class CareSignalCalculatorTest {

    private static final CareSettings.Values DEFAULTS = CareSettings.Values.DEFAULTS;

    private static SignalEvaluation evaluate(List<ExistingDailyStudy> days) {
        return CareSignalCalculator.evaluate(days, AS_OF, DEFAULTS);
    }

    private static List<CareSignalType> types(SignalEvaluation evaluation) {
        return evaluation.signals().stream().map(DetectedSignal::type).toList();
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
            assertThat(absence.summary()).isEqualTo("4일째 입실 기록 없음");
            assertThat(absence.evidence()).containsExactly("4일째 입실 기록 없음", "마지막 입실 9월 26일");
            assertThat(absence.value()).isEqualTo(4);
            assertThat(evaluation.deferred()).isFalse();
        }

        @Test
        void belowThresholdIsNotFlagged() {
            SignalEvaluation evaluation = evaluate(StudyDays.build((offset, day) -> offset >= -1 ? day.absent() : day));

            assertThat(types(evaluation)).doesNotContain(CareSignalType.CONSECUTIVE_ABSENCE);
        }

        @Test
        void streakMustEndAtAsOf() {
            SignalEvaluation evaluation = evaluate(
                    StudyDays.build((offset, day) -> offset >= -6 && offset <= -2 ? day.absent() : day));

            assertThat(types(evaluation)).doesNotContain(CareSignalType.CONSECUTIVE_ABSENCE);
        }
    }

    @Test
    void planMissingCountsOnlyLastSevenDays() {
        SignalEvaluation flagged = evaluate(StudyDays.build(
                (offset, day) -> offset == -6 || offset == -4 || offset == -2 || offset == 0 ? day.noPlan() : day));
        SignalEvaluation older = evaluate(StudyDays.build(
                (offset, day) -> offset <= -7 && offset >= -12 ? day.noPlan() : day));

        assertThat(types(flagged)).containsExactly(CareSignalType.PLAN_MISSING);
        assertThat(flagged.signals().getFirst().summary()).isEqualTo("최근 7일 중 4일 계획 미제출");
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
            assertThat(drop.summary()).isEqualTo("최근 7일 14시간 · 평소 같은 기간 28시간");
            assertThat(drop.evidence().getFirst()).endsWith("(50% 감소)");
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
    void executionGapUsesPlannedDaysOfLastFourteenDays() {
        SignalEvaluation evaluation = evaluate(StudyDays.build(
                (offset, day) -> offset >= -13 ? day.planned(450) : day));

        assertThat(types(evaluation)).containsExactly(CareSignalType.EXECUTION_GAP);
        DetectedSignal gap = evaluation.signals().getFirst();
        assertThat(gap.value()).isEqualTo(53);
        assertThat(gap.summary()).isEqualTo("최근 2주 계획 105시간 중 56시간 실행 (53%)");
        assertThat(gap.target()).isEqualTo(60);
    }

    @Test
    void subjectShareComparesPlannedAndActualShare() {
        SignalEvaluation evaluation = evaluate(StudyDays.build(
                (offset, day) -> offset >= -6 ? day.studyBySubject(80, 20, 80, 60) : day));

        assertThat(types(evaluation)).containsExactly(CareSignalType.SUBJECT_SHARE);
        DetectedSignal share = evaluation.signals().getFirst();
        assertThat(share.subject()).isEqualTo("수학");
        assertThat(share.summary()).isEqualTo("계획한 수학 비중 25% → 최근 8%");
        assertThat(share.evidence()).containsExactly("계획한 수학 비중 25% → 최근 8% (전체 학습량은 평소 수준)");
        assertThat(share.value()).isEqualTo(8);
        assertThat(share.target()).isEqualTo(25);
    }

    @Test
    void startTimeShiftComparesAverageFirstCheckIn() {
        SignalEvaluation evaluation = evaluate(StudyDays.build(
                (offset, day) -> offset >= -6 ? day.start(LocalTime.of(20, 30)) : day.start(LocalTime.of(19, 0))));

        assertThat(types(evaluation)).containsExactly(CareSignalType.START_TIME_SHIFT);
        DetectedSignal shift = evaluation.signals().getFirst();
        assertThat(shift.summary()).isEqualTo("평소 19:00 시작 → 최근 20:30");
        assertThat(shift.value()).isEqualTo(20 * 60 + 30);
        assertThat(shift.target()).isEqualTo(19 * 60);
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
                CareSignalType.PLAN_MISSING, CareSignalType.STUDY_DROP, CareSignalType.START_TIME_SHIFT);
    }

    @Test
    void usualDailyMinutesAndLastFourteenDays() {
        List<ExistingDailyStudy> days = StudyDays.usual();

        assertThat(CareSignalCalculator.usualDailyMinutes(days, AS_OF)).isEqualTo(240);
        assertThat(CareSignalCalculator.last14(days, AS_OF)).hasSize(14)
                .first().extracting(ExistingDailyStudy::date).isEqualTo(AS_OF.minusDays(13));
    }
}
