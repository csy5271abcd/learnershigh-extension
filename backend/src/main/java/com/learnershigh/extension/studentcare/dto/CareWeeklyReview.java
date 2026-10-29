package com.learnershigh.extension.studentcare.dto;

import java.time.LocalDate;
import java.util.List;

/** 차트 종류와 무관한 학생의 최근7일 / 직전28일 지표. */
public record CareWeeklyReview(LocalDate from, LocalDate to, LocalDate baselineFrom, LocalDate baselineTo,
        List<Day> days, List<Day> baselineDays, Summary current, Summary baseline, List<WeekdayBaseline> weekdayBaseline,
        List<Subject> subjects) {
    public enum Attendance { PRESENT, ABSENT, UNSCHEDULED, UNKNOWN }
    public enum Submission { SUBMITTED, MISSING, UNKNOWN }
    public record Day(LocalDate date, Attendance attendance, Submission submission, Boolean scheduled,
            Integer minutes, Integer startMinutes, Integer plannedMinutes, Integer actualMinutes) { }
    public record Summary(int calendarDays, int recordedDays, int attendanceDays, int scheduledAbsenceDays,
            int submissionDays, int submissionRecordedDays, Integer studyMinutes, Double minutesPerAttendance,
            Double averageStartMinutes, int startSamples, Integer plannedMinutes, Integer actualMinutes,
            Double executionRate, int comparablePlanDays) { }
    public record WeekdayBaseline(LocalDate date, Double minutes, Double startMinutes, int samples,
            int startSamples) { }
    public record Subject(String name, int plannedMinutes, int actualMinutes, Double plannedShare,
            Double actualShare) { }
}
