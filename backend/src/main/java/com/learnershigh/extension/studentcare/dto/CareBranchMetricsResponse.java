package com.learnershigh.extension.studentcare.dto;

import java.time.LocalDate;
import java.util.List;

public record CareBranchMetricsResponse(LocalDate asOf, BranchRef branch, List<StudentMetrics> students,
        List<DailyAverage> dailyAverages) {
    public record StudentMetrics(StudentRef student, CareWeeklyReview review) { }
    public record DailyAverage(LocalDate date, Double minutes, int samples) { }
}
