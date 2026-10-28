package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.studentcare.dto.CareCaseResponse;
import com.learnershigh.extension.studentcare.dto.CareEventResponse;
import com.learnershigh.extension.studentcare.dto.SignalSummary;
import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
import com.learnershigh.extension.studentcare.entity.CareCase;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.entity.MetricUnit;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/** CareCase Entity → Response. Entity는 Service 밖으로 나가지 않는다 (ADR-0005). */
final class CareCaseMapper {

    private CareCaseMapper() {
    }

    /**
     * 재점검일이 되었으면 {@code comparison}(호출한 쪽이 한 번 계산한 값)을 함께 담는다.
     * 재점검일 전이거나 종결된 건은 비교가 없다 (api-contract.md §65-5).
     */
    static CareCaseResponse toResponse(CareCase careCase, LocalDate today, ZoneId zone, CareComparison comparison) {
        boolean due = careCase.isRecheckDue(today);
        return new CareCaseResponse(
                careCase.id(),
                careCase.studentId(),
                careCase.branchId(),
                careCase.status(),
                careCase.reason(),
                careCase.closeType(),
                careCase.openedOn(),
                careCase.closedOn(),
                careCase.baseline().stream().map(signal -> toBaseline(signal, careCase.metricFormulaVersion())).toList(),
                careCase.recheckDate(),
                due,
                due && comparison != null ? toComparison(comparison, careCase.metricFormulaVersion()) : null,
                careCase.events().stream().map(event -> CareEventResponse.from(event, zone)).toList());
    }

    static List<SignalSummary> signals(CareCase careCase) {
        return careCase.baseline().stream().map(signal -> SignalSummary.of(signal.type(), signal.subject(), signal.summary())).toList();
    }

    private static CareCaseResponse.Comparison toComparison(CareComparison comparison, int version) {
        List<CareCaseResponse.ComparisonRow> rows = comparison.rows().stream()
                .map(row -> new CareCaseResponse.ComparisonRow(row.type(), row.type().labelFor(row.subject()), row.before(), row.now(),
                        row.target(), metricUnit(row.type(), version), row.trend().name()))
                .toList();
        String label = !rows.isEmpty() && rows.stream().allMatch(row -> row.now() == null)
                ? "비교 기록 없음" : comparison.result().label();
        return new CareCaseResponse.Comparison(rows, comparison.result().name(), label);
    }

    private static CareCaseResponse.Baseline toBaseline(CareBaselineSignal signal, int version) {
        return new CareCaseResponse.Baseline(signal.type(), signal.type().labelFor(signal.subject()), signal.summary(), signal.value(),
                signal.target(), metricUnit(signal.type(), version));
    }

    private static MetricUnit metricUnit(CareSignalType type, int version) {
        return version >= 3 && type == CareSignalType.START_TIME_SHIFT ? MetricUnit.MINUTES : type.unit();
    }
}
