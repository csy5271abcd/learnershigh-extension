package com.learnershigh.extension.studentcare.dto;

import java.time.LocalDate;
import java.util.List;

/** 특이사항 / 관리 목록 (api-contract.md §65-2). */
public record CareBoardResponse(
        LocalDate asOf,
        BranchRef branch,
        List<NeedsCheckCard> needsCheck,
        List<InAdjustmentCard> inAdjustment,
        List<DeferredStudent> deferred) {

    public record NeedsCheckCard(String studentId, String studentName, String className, List<SignalSummary> signals) {
    }

    public record InAdjustmentCard(
            String caseId,
            String studentId,
            String studentName,
            String className,
            List<SignalSummary> signals,
            LocalDate recheckDate,
            boolean recheckDue) {
    }

    public record DeferredStudent(String studentId, String studentName, String className, int validDays) {
    }
}
