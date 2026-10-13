package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.time.LocalDate;
import java.util.List;

/** 학생 상세 (api-contract.md §65-3). */
public record StudentCareDetailResponse(
        LocalDate asOf,
        StudentRef student,
        List<Signal> signals,
        Deferred deferred,
        List<DailyStudy> dailyStudy,
        int usualDailyMinutes,
        PlanSuggestion planSuggestion,
        CareCaseResponse activeCase) {

    public record Signal(CareSignalType type, String label, String summary, List<String> evidence, String question) {
    }

    public record Deferred(int validDays) {
    }

    public record DailyStudy(LocalDate date, int minutes) {
    }

    public record PlanSuggestion(String goal, String action, String loadLimit, LocalDate recheckDate) {
    }
}
