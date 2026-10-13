package com.learnershigh.extension.common.integration.learnershigh.phapi;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.common.integration.learnershigh.ExistingIntegrationException;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * phapi 응답 → Integration Contract 변환 (Anti-Corruption Layer, integration-boundary.md §28).
 * 실제 Adapter(RealExisting*Client)는 phapi를 호출한 뒤 {@link PhapiJson}과 이 Mapper만 거친다.
 *
 * <pre>
 * ExistingStudent      ← select_students.php
 * ExistingDailyStudy   ← select_study_reports_period.php (입실 / 계획 제출)
 *                        + subject_study_stats.php?period_type=PDFBYDAY (과목별 순공 / 계획)
 * </pre>
 *
 * <h2>형식 오류 정책</h2>
 * 형식이 깨진 응답은 빈 기록(미입실 / 기록 없음)으로 바꾸지 않고 {@link ExistingIntegrationException}(→ 503)으로 알린다.
 * NullPointerException / Jackson 예외가 밖으로 나가지 않는다. 연동 실패로 보는 경우:
 * <ul>
 *   <li>학생: {@code id} / {@code role_id} / {@code status} 없음, 학생(role_id=5, ACTIVE)인데 {@code real_name} 없음</li>
 *   <li>report: {@code report_date} / {@code login_first}를 해석할 수 없음, 같은 날짜의 report 행이 둘 이상</li>
 *   <li>{@code login_first}의 날짜가 {@code report_date}와 다름 (아래 시간 기준)</li>
 *   <li>과목 행: {@code name} 없음, {@code offset}(PDFBYDAY의 report_date) 없음 / 해석 불가,
 *       시간이 {@code "H+:MM:SS"}(부호 없음, 분 / 초 0~59)가 아님</li>
 * </ul>
 * 해석할 수 없는 {@code login_first}를 "미입실"로 보지 않는다: 그러면 연속 미입실 신호가 거짓으로 올라온다.
 *
 * <h2>시간 기준 (UNCONFIRMED)</h2>
 * {@code login_first}는 Asia/Seoul 벽시계 값으로 가정한다(원본 DB / PHP Timezone 미확인,
 * docs/architecture/existing-learnershigh-data.md §2-0). 그 날짜가 {@code report_date}와 다르면(예: 자정 이후 입실이
 * 다음 날짜로 기록됨) 학습일 경계 규칙을 확인하기 전까지 추측하지 않고 연동 실패로 본다.
 *
 * <h2>삭제된 할 일</h2>
 * {@code activity_item.status}(DELETED 등)는 과목별 통계 응답에 없다. 원본 API가 삭제된 할 일을 빼고 합산하는지
 * 이 응답만으로는 알 수 없으므로 Mapper는 받은 행을 모두 더한다(확인 필요).
 */
public final class PhapiStudyMapper {

    static final int STUDENT_ROLE_ID = 5;
    static final String ACTIVE_STATUS = "ACTIVE";

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss")
            .withResolverStyle(ResolverStyle.STRICT);
    /** {@code formatSecToTime()}: 시간 자리는 2자리를 넘을 수 있고, 분 / 초는 2자리. 부호는 없다. */
    private static final Pattern HMS = Pattern.compile("(\\d{1,6}):([0-5]\\d):([0-5]\\d)");

    private PhapiStudyMapper() {
    }

    /**
     * 지점의 재원 학생만 변환한다: {@code role_id = 5}이고 {@code status = ACTIVE}.
     * INACTIVE / DELETED 학생과 학생이 아닌 사용자는 뺀다. 반이 없으면 className은 null이다.
     */
    public static List<ExistingStudent> toStudents(String branchId, List<PhapiStudent> students) {
        if (students == null) {
            throw new ExistingIntegrationException("phapi students: missing list");
        }
        List<ExistingStudent> result = new ArrayList<>();
        for (PhapiStudent student : students) {
            if (student == null || student.id() == null || student.roleId() == null || student.status() == null) {
                throw new ExistingIntegrationException("phapi students: row without id / role_id / status");
            }
            if (student.roleId() != STUDENT_ROLE_ID || !ACTIVE_STATUS.equals(student.status())) {
                continue;
            }
            if (student.realName() == null || student.realName().isBlank()) {
                throw new ExistingIntegrationException("phapi students: student without real_name");
            }
            result.add(new ExistingStudent(
                    String.valueOf(student.id()),
                    branchId,
                    student.realName(),
                    student.group() == null ? null : student.group().name()));
        }
        return List.copyOf(result);
    }

    /**
     * 기간 안의 모든 날짜를 오름차순으로 돌려준다 ({@code ExistingStudyClient} Contract).
     * report가 없는 날은 미입실 / 계획 미제출 / 기록 없음이다. 형식 오류는 클래스 설명의 정책을 따른다.
     *
     * @param reports      한 학생의 report ({@link PhapiStudyReportsPeriodResponse#reportsOf})
     * @param subjectStats 같은 학생 / 기간의 PDFBYDAY 행
     */
    public static List<ExistingDailyStudy> toDailyStudy(
            LocalDate from, LocalDate to, List<PhapiDailyReport> reports, List<PhapiSubjectStudyStat> subjectStats) {
        if (reports == null || subjectStats == null) {
            throw new ExistingIntegrationException("phapi study: missing reports / subject stats");
        }
        Map<LocalDate, PhapiDailyReport> reportByDate = new HashMap<>();
        for (PhapiDailyReport report : reports) {
            if (report == null) {
                throw new ExistingIntegrationException("phapi study reports: null report");
            }
            LocalDate date = parseDate(report.reportDate());
            if (reportByDate.putIfAbsent(date, report) != null) {
                // 학생 × 날짜당 DAILY report는 하나다. 둘 중 하나를 고르지 않는다.
                throw new ExistingIntegrationException("phapi study reports: duplicate report_date " + date);
            }
        }
        Map<LocalDate, List<PhapiSubjectStudyStat>> statsByDate = new HashMap<>();
        for (PhapiSubjectStudyStat stat : subjectStats) {
            if (stat == null || stat.name() == null || stat.name().isBlank()) {
                throw new ExistingIntegrationException("phapi subject stats: row without name");
            }
            statsByDate.computeIfAbsent(parseDate(stat.offset()), date -> new ArrayList<>()).add(stat);
        }

        List<ExistingDailyStudy> days = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            days.add(toDay(date, reportByDate.get(date), statsByDate.getOrDefault(date, List.of())));
        }
        return days;
    }

    private static ExistingDailyStudy toDay(LocalDate date, PhapiDailyReport report, List<PhapiSubjectStudyStat> stats) {
        LocalDateTime loginFirst = report == null ? null : parseDateTime(report.loginFirst());
        if (loginFirst != null && !loginFirst.toLocalDate().equals(date)) {
            throw new ExistingIntegrationException("phapi study reports: login_first date differs from report_date " + date);
        }
        boolean planSubmitted = report != null && report.planSubmitted();
        // 시간 형식은 계획 미제출일에도 검사한다(형식 오류를 숨기지 않는다).
        Map<String, Integer> study = minutesBySubject(stats, PhapiSubjectStudyStat::totalTimeStudy);
        Map<String, Integer> planned = minutesBySubject(stats, PhapiSubjectStudyStat::totalTimePlan);
        return new ExistingDailyStudy(
                date,
                loginFirst != null,
                loginFirst == null ? null : loginFirst.toLocalTime(),
                study,
                planSubmitted,
                planSubmitted ? planned : Map.of());
    }

    /** 같은 과목 코드명의 item을 초 단위로 합친 뒤 분으로 내린다. 1분 미만(0분) 과목은 뺀다. */
    private static Map<String, Integer> minutesBySubject(
            List<PhapiSubjectStudyStat> stats, Function<PhapiSubjectStudyStat, String> time) {
        Map<String, Long> seconds = new LinkedHashMap<>();
        for (PhapiSubjectStudyStat stat : stats) {
            seconds.merge(stat.name(), parseHms(time.apply(stat)), Long::sum);
        }
        Map<String, Integer> minutes = new LinkedHashMap<>();
        seconds.forEach((subject, total) -> {
            if (total >= 60) {
                minutes.put(subject, Math.toIntExact(total / 60));
            }
        });
        return minutes;
    }

    /**
     * {@code formatSecToTime()}의 "HH:MM:SS" → 초. 시간 자리는 99를 넘을 수 있다(최대 6자리).
     * null / 빈 값, 부호(-, +), 분 / 초 60 이상, 다른 형식은 연동 실패다.
     */
    static long parseHms(String value) {
        if (value == null) {
            throw new ExistingIntegrationException("unexpected phapi time format: null");
        }
        Matcher matcher = HMS.matcher(value);
        if (!matcher.matches()) {
            throw new ExistingIntegrationException("unexpected phapi time format: " + value);
        }
        return Long.parseLong(matcher.group(1)) * 3600 + Long.parseLong(matcher.group(2)) * 60
                + Long.parseLong(matcher.group(3));
    }

    private static LocalDate parseDate(String value) {
        if (value == null) {
            throw new ExistingIntegrationException("unexpected phapi date format: null");
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw new ExistingIntegrationException("unexpected phapi date format: " + value);
        }
    }

    /** 미입실(null)만 비어 있다. 빈 문자열 / 해석할 수 없는 값은 미입실이 아니라 연동 실패다. */
    private static LocalDateTime parseDateTime(String value) {
        if (value == null) {
            return null;
        }
        try {
            return LocalDateTime.parse(value, DATE_TIME);
        } catch (DateTimeParseException e) {
            throw new ExistingIntegrationException("unexpected phapi datetime format: " + value);
        }
    }
}
