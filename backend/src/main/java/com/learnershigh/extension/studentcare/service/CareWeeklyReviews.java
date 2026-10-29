package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.common.integration.learnershigh.ExistingIntegrationException;
import com.learnershigh.extension.studentcare.dto.CareWeeklyReview;
import com.learnershigh.extension.studentcare.dto.CareWeeklyReview.*;
import java.time.LocalDate;
import java.util.*;
import java.util.function.ToIntFunction;

/** 일별 원본에서 공통 수치만 집계한다. 상태 변경이나 외부 I/O는 없다. */
final class CareWeeklyReviews {
    private CareWeeklyReviews() { }

    static CareWeeklyReview build(List<ExistingDailyStudy> records, LocalDate asOf) {
        LocalDate baselineFrom = asOf.minusDays(34), from = asOf.minusDays(6);
        Map<LocalDate, ExistingDailyStudy> byDate = new HashMap<>();
        for (var record : records) {
            if (record.date().isBefore(baselineFrom) || record.date().isAfter(asOf)) continue;
            if (byDate.putIfAbsent(record.date(), record) != null)
                throw new ExistingIntegrationException("student care: duplicate daily record");
        }
        List<Day> baseline = baselineFrom.datesUntil(from).map(date -> day(date, byDate.get(date))).toList();
        List<Day> current = from.datesUntil(asOf.plusDays(1)).map(date -> day(date, byDate.get(date))).toList();
        List<WeekdayBaseline> weekday = current.stream().map(day -> {
            var matching = baseline.stream().filter(old -> old.date().getDayOfWeek() == day.date().getDayOfWeek()).toList();
            var minutes = matching.stream().filter(old -> old.minutes() != null).toList();
            var starts = matching.stream().filter(old -> old.startMinutes() != null).toList();
            return new WeekdayBaseline(day.date(), mean(minutes, Day::minutes), mean(starts, Day::startMinutes),
                    minutes.size(), starts.size());
        }).toList();
        Map<String, int[]> subjectSums = new TreeMap<>();
        for (var record : records) {
            if (record.date().isBefore(from) || record.date().isAfter(asOf) || !record.recordAvailable()
                    || !record.checkedIn() || !record.planSubmitted() || record.plannedMinutes() <= 0) continue;
            record.studyMinutesBySubject().forEach((name, minutes) -> subjectSums.computeIfAbsent(name, k -> new int[2])[1] += minutes);
            if (record.planSubmitted()) record.plannedMinutesBySubject().forEach((name, minutes) -> subjectSums.computeIfAbsent(name, k -> new int[2])[0] += minutes);
        }
        int planned = subjectSums.values().stream().mapToInt(v -> v[0]).sum();
        int actual = subjectSums.values().stream().mapToInt(v -> v[1]).sum();
        var subjects = subjectSums.entrySet().stream().map(e -> new Subject(e.getKey(), e.getValue()[0], e.getValue()[1],
                percent(e.getValue()[0], planned), percent(e.getValue()[1], actual))).toList();
        return new CareWeeklyReview(from, asOf, baselineFrom, from.minusDays(1), current, baseline, summary(current),
                summary(baseline), weekday, subjects);
    }

    private static Day day(LocalDate date, ExistingDailyStudy record) {
        if (record == null || !record.recordAvailable()) return new Day(date, Attendance.UNKNOWN, Submission.UNKNOWN,
                record == null ? null : record.scheduled(), null, null, null, null);
        Attendance attendance = record.checkedIn() ? Attendance.PRESENT
                : Boolean.FALSE.equals(record.scheduled()) ? Attendance.UNSCHEDULED
                : Boolean.TRUE.equals(record.scheduled()) ? Attendance.ABSENT : Attendance.UNKNOWN;
        Integer start = record.checkedIn() && record.firstCheckInTime() != null
                ? record.firstCheckInTime().getHour() * 60 + record.firstCheckInTime().getMinute() : null;
        return new Day(date, attendance, record.planSubmitted() ? Submission.SUBMITTED : Submission.MISSING,
                record.scheduled(), record.studyMinutes(), start,
                record.planSubmitted() ? record.plannedMinutes() : null, record.studyMinutes());
    }

    private static Summary summary(List<Day> days) {
        var recorded = days.stream().filter(d -> d.minutes() != null).toList();
        var present = recorded.stream().filter(d -> d.attendance() == Attendance.PRESENT).toList();
        var starts = days.stream().filter(d -> d.startMinutes() != null).toList();
        var requiredPlans = days.stream().filter(d -> !Boolean.FALSE.equals(d.scheduled())).toList();
        var paired = present.stream().filter(d -> d.plannedMinutes() != null && d.plannedMinutes() > 0 && d.actualMinutes() != null).toList();
        Integer planned = paired.isEmpty() ? null : sum(paired, Day::plannedMinutes);
        Integer actual = paired.isEmpty() ? null : sum(paired, Day::actualMinutes);
        return new Summary(days.size(), recorded.size(), present.size(),
                (int) days.stream().filter(d -> d.attendance() == Attendance.ABSENT).count(),
                (int) requiredPlans.stream().filter(d -> d.submission() == Submission.SUBMITTED).count(),
                (int) requiredPlans.stream().filter(d -> d.submission() != Submission.UNKNOWN).count(),
                recorded.isEmpty() ? null : sum(recorded, Day::minutes), mean(present, Day::minutes),
                mean(starts, Day::startMinutes), starts.size(), planned, actual,
                planned == null ? null : percent(actual, planned), paired.size());
    }
    private static int sum(List<Day> days, ToIntFunction<Day> value) { return days.stream().mapToInt(value).sum(); }
    private static Double mean(List<Day> days, ToIntFunction<Day> value) { return days.isEmpty() ? null : sum(days, value) / (double) days.size(); }
    private static Double percent(int part, int whole) { return whole == 0 ? null : part * 100.0 / whole; }
}
