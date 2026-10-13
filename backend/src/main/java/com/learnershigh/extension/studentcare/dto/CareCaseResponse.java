package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareCaseStatus;
import com.learnershigh.extension.studentcare.entity.CareCloseType;
import com.learnershigh.extension.studentcare.entity.CareReason;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.entity.MetricUnit;
import java.time.LocalDate;
import java.util.List;

/** 케어 건 (api-contract.md §65-5). */
public record CareCaseResponse(
        String caseId,
        String studentId,
        String branchId,
        CareCaseStatus status,
        CareReason reason,
        CareCloseType closeType,
        LocalDate openedOn,
        LocalDate closedOn,
        List<Baseline> baseline,
        Plan plan,
        LocalDate recheckDate,
        boolean recheckDue,
        Comparison comparison,
        List<CareEventResponse> events) {

    public record Baseline(CareSignalType type, String label, String summary, int value, Integer target, MetricUnit unit) {
    }

    public record Plan(String goal, String action, String loadLimit, boolean agreedWithStudent) {
    }

    public record Comparison(List<ComparisonRow> rows, String result, String resultLabel) {
    }

    public record ComparisonRow(
            CareSignalType type,
            String label,
            int before,
            Integer now,
            Integer target,
            MetricUnit unit,
            String trend) {
    }
}
