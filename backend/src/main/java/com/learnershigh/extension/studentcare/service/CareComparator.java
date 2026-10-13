package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.service.CareComparison.Result;
import com.learnershigh.extension.studentcare.service.CareComparison.Row;
import com.learnershigh.extension.studentcare.service.CareComparison.Trend;
import java.time.LocalDate;
import java.util.List;
import java.util.OptionalInt;

/** 건을 연 시점의 지표와 같은 공식으로 지금 지표를 비교한다 (domain.md §6). */
public final class CareComparator {

    private CareComparator() {
    }

    public static CareComparison compare(List<CareBaselineSignal> baseline, List<ExistingDailyStudy> days, LocalDate asOf) {
        List<Row> rows = baseline.stream().map(signal -> row(signal, days, asOf)).toList();
        return new CareComparison(rows, resultOf(rows));
    }

    private static Row row(CareBaselineSignal signal, List<ExistingDailyStudy> days, LocalDate asOf) {
        OptionalInt now = CareSignalCalculator.measure(signal.type(), signal.subject(), days, asOf);
        if (now.isEmpty()) {
            return new Row(signal.type(), signal.subject(), signal.value(), null, signal.target(), Trend.SAME);
        }
        return new Row(signal.type(), signal.subject(), signal.value(), now.getAsInt(), signal.target(),
                trend(signal.type(), signal.value(), now.getAsInt()));
    }

    /** 의미 있는 변화로 보는 최소 폭: 일수 1, 학습 분 max(30, 5%), 비중·실행률 3%p, 시작 시각 15분. */
    static Trend trend(CareSignalType type, int before, int now) {
        int delta = now - before;
        int better = type.higherIsBetter() ? delta : -delta;
        int minimum = switch (type.unit()) {
            case DAYS -> 1;
            case MINUTES -> Math.max(30, (int) Math.round(Math.abs(before) * 0.05));
            case PERCENT -> 3;
            case CLOCK_MINUTES -> 15;
        };
        if (better >= minimum) {
            return Trend.IMPROVED;
        }
        if (better <= -minimum) {
            return Trend.WORSENED;
        }
        return Trend.SAME;
    }

    private static Result resultOf(List<Row> rows) {
        boolean anyImproved = rows.stream().anyMatch(row -> row.trend() == Trend.IMPROVED);
        boolean anyWorsened = rows.stream().anyMatch(row -> row.trend() == Trend.WORSENED);
        boolean allImproved = !rows.isEmpty() && rows.stream().allMatch(row -> row.trend() == Trend.IMPROVED);
        if (allImproved) {
            return Result.IMPROVED;
        }
        if (!anyImproved && !anyWorsened) {
            return Result.NO_CHANGE;
        }
        if (!anyImproved) {
            return Result.WORSENED;
        }
        return Result.MIXED;
    }
}
