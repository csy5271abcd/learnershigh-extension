package com.learnershigh.extension.studentcare.service;

import static com.learnershigh.extension.studentcare.service.StudyDays.AS_OF;
import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.service.CareComparison.Result;
import com.learnershigh.extension.studentcare.service.CareComparison.Trend;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class CareComparatorTest {

    @ParameterizedTest
    @CsvSource({
            "CONSECUTIVE_ABSENCE, 4, 0, IMPROVED",
            "CONSECUTIVE_ABSENCE, 4, 4, SAME",
            "CONSECUTIVE_ABSENCE, 2, 3, WORSENED",
            "STUDY_DROP, 540, 980, IMPROVED",
            "STUDY_DROP, 540, 560, SAME",
            "STUDY_DROP, 1000, 940, WORSENED",
            "SUBJECT_SHARE, 12, 24, IMPROVED",
            "SUBJECT_SHARE, 12, 14, SAME",
            "EXECUTION_GAP, 53, 40, WORSENED",
            "START_TIME_SHIFT, 1300, 1200, IMPROVED",
            "START_TIME_SHIFT, 1300, 1290, SAME",
            "START_TIME_SHIFT, 1200, 1300, WORSENED"
    })
    void trendFollowsBetterDirectionAndMinimumChange(CareSignalType type, int before, int now, Trend expected) {
        assertThat(CareComparator.trend(type, before, now)).isEqualTo(expected);
    }

    @Test
    void comparesBaselineWithSameFormulaAtRecheckDate() {
        List<CareBaselineSignal> baseline = List.of(
                new CareBaselineSignal(CareSignalType.PLAN_MISSING, "최근 7일 중 4일 계획 미제출", 4, 0, null),
                new CareBaselineSignal(CareSignalType.STUDY_DROP, "최근 7일 14시간 · 평소 같은 기간 28시간", 840, 1680, null));

        CareComparison comparison = CareComparator.compare(baseline, StudyDays.usual(), AS_OF);

        assertThat(comparison.rows()).extracting(CareComparison.Row::now).containsExactly(0, 1680);
        assertThat(comparison.result()).isEqualTo(Result.IMPROVED);
        assertThat(comparison.text())
                .isEqualTo("재점검 — 변화 관찰: 최근 7일 계획 미제출 4일 → 0일, 최근 7일 학습량 14시간 → 28시간");
    }

    @Test
    void resultLabels() {
        CareBaselineSignal plan = new CareBaselineSignal(CareSignalType.PLAN_MISSING, "s", 0, 0, null);
        CareBaselineSignal drop = new CareBaselineSignal(CareSignalType.STUDY_DROP, "s", 840, 1680, null);

        assertThat(CareComparator.compare(List.of(plan), StudyDays.usual(), AS_OF).result()).isEqualTo(Result.NO_CHANGE);
        assertThat(CareComparator.compare(List.of(
                new CareBaselineSignal(CareSignalType.PLAN_MISSING, "s", 0, 0, null)),
                StudyDays.build((offset, day) -> offset >= -2 ? day.noPlan() : day), AS_OF).result())
                .isEqualTo(Result.WORSENED);
        assertThat(CareComparator.compare(List.of(plan, drop),
                StudyDays.build((offset, day) -> offset >= -2 ? day.noPlan() : day), AS_OF).result())
                .isEqualTo(Result.MIXED);
        assertThat(Result.IMPROVED.label()).isEqualTo("변화 관찰");
        assertThat(Result.NO_CHANGE.label()).isEqualTo("변화 없음");
    }

    @Test
    void unmeasurableSignalCountsAsSame() {
        CareBaselineSignal share = new CareBaselineSignal(CareSignalType.SUBJECT_SHARE, "s", 12, 30, "수학");

        CareComparison comparison = CareComparator.compare(List.of(share),
                StudyDays.build((offset, day) -> day.absent()), AS_OF);

        assertThat(comparison.rows().getFirst().now()).isNull();
        assertThat(comparison.result()).isEqualTo(Result.NO_CHANGE);
        assertThat(comparison.text()).isEqualTo("재점검 — 변화 없음: 비교할 기록 없음");
    }
}
