package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.studentcare.dto.CareCaseResponse;
import com.learnershigh.extension.studentcare.dto.CareEventResponse;
import com.learnershigh.extension.studentcare.dto.SignalSummary;
import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
import com.learnershigh.extension.studentcare.entity.CareCase;
import com.learnershigh.extension.studentcare.entity.CarePlan;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/** CareCase Entity → Response. Entity는 Service 밖으로 나가지 않는다 (ADR-0005). */
final class CareCaseMapper {

    private CareCaseMapper() {
    }

    /** {@code history}가 있고 재점검일이 되었으면 비교 결과를 함께 담는다. */
    static CareCaseResponse toResponse(CareCase careCase, LocalDate today, ZoneId zone, List<ExistingDailyStudy> history) {
        boolean due = careCase.isRecheckDue(today);
        CareCaseResponse.Comparison comparison = due && history != null
                ? toComparison(CareComparator.compare(careCase.baseline(), history, today))
                : null;
        CarePlan plan = careCase.plan();
        return new CareCaseResponse(
                careCase.id(),
                careCase.studentId(),
                careCase.branchId(),
                careCase.status(),
                careCase.reason(),
                careCase.closeType(),
                careCase.openedOn(),
                careCase.closedOn(),
                careCase.baseline().stream().map(CareCaseMapper::toBaseline).toList(),
                plan == null ? null
                        : new CareCaseResponse.Plan(plan.goal(), plan.action(), plan.loadLimit(), plan.agreedWithStudent()),
                careCase.recheckDate(),
                due,
                comparison,
                careCase.events().stream().map(event -> CareEventResponse.from(event, zone)).toList());
    }

    static List<SignalSummary> signals(CareCase careCase) {
        return careCase.baseline().stream().map(signal -> SignalSummary.of(signal.type(), signal.summary())).toList();
    }

    static CareCaseResponse.Comparison toComparison(CareComparison comparison) {
        List<CareCaseResponse.ComparisonRow> rows = comparison.rows().stream()
                .map(row -> new CareCaseResponse.ComparisonRow(row.type(), row.type().label(), row.before(), row.now(),
                        row.target(), row.type().unit(), row.trend().name()))
                .toList();
        return new CareCaseResponse.Comparison(rows, comparison.result().name(), comparison.result().label());
    }

    private static CareCaseResponse.Baseline toBaseline(CareBaselineSignal signal) {
        return new CareCaseResponse.Baseline(signal.type(), signal.type().label(), signal.summary(), signal.value(),
                signal.target(), signal.type().unit());
    }
}
