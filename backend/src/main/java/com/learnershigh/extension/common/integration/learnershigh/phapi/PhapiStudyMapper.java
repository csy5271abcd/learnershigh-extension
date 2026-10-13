package com.learnershigh.extension.common.integration.learnershigh.phapi;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.common.integration.learnershigh.ExistingIntegrationException;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * phapi 응답 → Integration Contract 변환 (Anti-Corruption Layer, integration-boundary.md §28).
 * 실제 Adapter(RealExisting*Client)는 phapi를 호출한 뒤 이 Mapper만 거친다.
 *
 * <pre>
 * ExistingStudent      ← select_students.php
 * ExistingDailyStudy   ← select_study_reports_period.php (입실 / 계획 제출)
 *                        + subject_study_stats.php?period_type=PDFBYDAY (과목별 순공 / 계획)
 * </pre>
 */
public final class PhapiStudyMapper {

    static final int STUDENT_ROLE_ID = 5;

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private PhapiStudyMapper() {
    }

    /** 학생(role_id=5)만 변환한다. 반이 없으면 className은 null이다. */
    public static List<ExistingStudent> toStudents(String branchId, List<PhapiStudent> students) {
        return students.stream()
                .filter(student -> student.roleId() == STUDENT_ROLE_ID)
                .map(student -> new ExistingStudent(
                        String.valueOf(student.id()),
                        branchId,
                        student.realName(),
                        student.group() == null ? null : student.group().name()))
                .toList();
    }

    /**
     * 기간 안의 모든 날짜를 오름차순으로 돌려준다 ({@code ExistingStudyClient} Contract).
     * report가 없는 날은 미입실 / 계획 미제출 / 기록 없음이다.
     *
     * @param reports      한 학생의 report ({@link PhapiStudyReportsPeriodResponse#reportsOf})
     * @param subjectStats 같은 학생 / 기간의 PDFBYDAY 행
     */
    public static List<ExistingDailyStudy> toDailyStudy(
            LocalDate from, LocalDate to, List<PhapiDailyReport> reports, List<PhapiSubjectStudyStat> subjectStats) {
        Map<LocalDate, PhapiDailyReport> reportByDate = reports.stream()
                .collect(Collectors.toMap(report -> parseDate(report.reportDate()), Function.identity(),
                        (first, second) -> first));
        Map<LocalDate, List<PhapiSubjectStudyStat>> statsByDate = subjectStats.stream()
                .filter(stat -> stat.offset() != null)
                .collect(Collectors.groupingBy(stat -> parseDate(stat.offset())));

        List<ExistingDailyStudy> days = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            days.add(toDay(date, reportByDate.get(date), statsByDate.getOrDefault(date, List.of())));
        }
        return days;
    }

    private static ExistingDailyStudy toDay(LocalDate date, PhapiDailyReport report, List<PhapiSubjectStudyStat> stats) {
        LocalDateTime loginFirst = report == null ? null : parseDateTime(report.loginFirst());
        boolean planSubmitted = report != null && report.planSubmitted();
        return new ExistingDailyStudy(
                date,
                loginFirst != null,
                loginFirst == null ? null : loginFirst.toLocalTime(),
                minutesBySubject(stats, PhapiSubjectStudyStat::totalTimeStudy),
                planSubmitted,
                planSubmitted ? minutesBySubject(stats, PhapiSubjectStudyStat::totalTimePlan) : Map.of());
    }

    /** 같은 과목 코드명의 item을 초 단위로 합친 뒤 분으로 내린다. 0분 과목은 뺀다. */
    private static Map<String, Integer> minutesBySubject(
            List<PhapiSubjectStudyStat> stats, Function<PhapiSubjectStudyStat, String> time) {
        Map<String, Long> seconds = new LinkedHashMap<>();
        for (PhapiSubjectStudyStat stat : stats) {
            seconds.merge(stat.name(), parseHms(time.apply(stat)), Long::sum);
        }
        Map<String, Integer> minutes = new LinkedHashMap<>();
        seconds.forEach((subject, total) -> {
            if (total >= 60) {
                minutes.put(subject, (int) (total / 60));
            }
        });
        return minutes;
    }

    /** {@code formatSecToTime()}의 "HH:MM:SS". 시간 자리는 99를 넘을 수 있다. */
    static long parseHms(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }
        String[] parts = value.split(":");
        if (parts.length != 3) {
            throw new ExistingIntegrationException("unexpected phapi time format: " + value);
        }
        try {
            return Long.parseLong(parts[0]) * 3600 + Long.parseLong(parts[1]) * 60 + Long.parseLong(parts[2]);
        } catch (NumberFormatException e) {
            throw new ExistingIntegrationException("unexpected phapi time format: " + value);
        }
    }

    private static LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw new ExistingIntegrationException("unexpected phapi date format: " + value);
        }
    }

    private static LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value, DATE_TIME);
        } catch (DateTimeParseException e) {
            throw new ExistingIntegrationException("unexpected phapi datetime format: " + value);
        }
    }
}
