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

    /** 최소 폭 경계 (domain.md §6): 정확히 최소 폭이면 변화, 한 단계 모자라면 SAME. */
    @ParameterizedTest(name = "{0} {1} → {2}: {3}")
    @CsvSource({
            // 일수 1일 (낮을수록 좋음)
            "PLAN_MISSING, 4, 3, IMPROVED",
            "PLAN_MISSING, 4, 4, SAME",
            "PLAN_MISSING, 4, 5, WORSENED",
            "CONSECUTIVE_ABSENCE, 1, 2, WORSENED",
            // 학습 분: 기준 600 미만은 30분
            "STUDY_DROP, 500, 530, IMPROVED",
            "STUDY_DROP, 500, 529, SAME",
            "STUDY_DROP, 500, 470, WORSENED",
            "STUDY_DROP, 500, 471, SAME",
            // 학습 분: 기준 600 이상은 기준의 5% (1000 → 50분, 610 → 30.5분)
            "STUDY_DROP, 1000, 1050, IMPROVED",
            "STUDY_DROP, 1000, 1049, SAME",
            "STUDY_DROP, 1000, 950, WORSENED",
            "STUDY_DROP, 1000, 951, SAME",
            "STUDY_DROP, 610, 640, SAME",
            "STUDY_DROP, 610, 641, IMPROVED",
            "STUDY_DROP, 600, 630, IMPROVED",
            // 비중 / 실행률 3%p (높을수록 좋음)
            "SUBJECT_SHARE, 12, 15, IMPROVED",
            "SUBJECT_SHARE, 12, 14, SAME",
            "SUBJECT_SHARE, 12, 9, WORSENED",
            "SUBJECT_SHARE, 12, 10, SAME",
            "EXECUTION_GAP, 53, 56, IMPROVED",
            "EXECUTION_GAP, 53, 55, SAME",
            "EXECUTION_GAP, 53, 53, SAME",
            "EXECUTION_GAP, 53, 50, WORSENED",
            // 시작 시각 15분 (이를수록 좋음)
            "START_TIME_SHIFT, 1300, 1285, IMPROVED",
            "START_TIME_SHIFT, 1300, 1286, SAME",
            "START_TIME_SHIFT, 1300, 1315, WORSENED",
            "START_TIME_SHIFT, 1300, 1314, SAME"
    })
    void minimumChangeBoundaries(CareSignalType type, int before, int now, Trend expected) {
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

    /** 결과 규칙 (domain.md §6): 모두 IMPROVED / 모두 SAME / IMPROVED 없이 WORSENED / 그 외 MIXED. */
    @Test
    void resultCombinesRowTrends() {
        CareBaselineSignal improved = new CareBaselineSignal(CareSignalType.PLAN_MISSING, "s", 4, null, null);
        CareBaselineSignal same = new CareBaselineSignal(CareSignalType.CONSECUTIVE_ABSENCE, "s", 0, null, null);
        CareBaselineSignal worsened = new CareBaselineSignal(CareSignalType.STUDY_DROP, "s", 2000, 2000, null);

        assertThat(trends(List.of(improved, same, worsened)))
                .containsExactly(Trend.IMPROVED, Trend.SAME, Trend.WORSENED);
        assertThat(result(improved, same)).isEqualTo(Result.MIXED);
        assertThat(result(worsened, same)).isEqualTo(Result.WORSENED);
        assertThat(result(improved, worsened)).isEqualTo(Result.MIXED);
        assertThat(result(improved, same, worsened)).isEqualTo(Result.MIXED);
        assertThat(result(same, same)).isEqualTo(Result.NO_CHANGE);
        assertThat(result(improved, improved)).isEqualTo(Result.IMPROVED);
    }

    private static List<Trend> trends(List<CareBaselineSignal> baseline) {
        return CareComparator.compare(baseline, StudyDays.usual(), AS_OF).rows().stream()
                .map(CareComparison.Row::trend).toList();
    }

    private static Result result(CareBaselineSignal... baseline) {
        return CareComparator.compare(List.of(baseline), StudyDays.usual(), AS_OF).result();
    }

    @Test
    void unmeasurableSignalCountsAsSame() {
        CareBaselineSignal share = new CareBaselineSignal(CareSignalType.SUBJECT_SHARE, "s", 12, 30, "수학");

        CareComparison comparison = CareComparator.compare(List.of(share),
                StudyDays.build((offset, day) -> day.absent()), AS_OF);

        assertThat(comparison.rows().getFirst().now()).isNull();
        assertThat(comparison.rows().getFirst().trend()).isEqualTo(Trend.SAME);
        assertThat(comparison.result()).isEqualTo(Result.NO_CHANGE);
        assertThat(comparison.text()).isEqualTo("재점검 — 변화 없음: 비교할 기록 없음");
    }
}
