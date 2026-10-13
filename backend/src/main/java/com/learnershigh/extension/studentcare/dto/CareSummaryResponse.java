package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.time.LocalDate;
import java.util.List;

/** 지점 요약 (api-contract.md §65-10). */
public record CareSummaryResponse(
        LocalDate asOf,
        int needsCheckCount,
        int deferredCount,
        int inAdjustmentCount,
        int recheckDueCount,
        List<SignalCount> signalCounts,
        ClosedCounts closedLast30Days) {

    public record SignalCount(CareSignalType type, String label, int count) {
    }

    public record ClosedCounts(int expectedChange, int recordIssue, int afterRecheck) {
    }
}
