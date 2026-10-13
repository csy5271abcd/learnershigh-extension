package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.studentcare.entity.CareSettings;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.entity.CareTextFormat;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalInt;

/**
 * 학생 케어 신호 계산 (docs/specs/wangyu/domain.md §2, §3). Spring / DB에 의존하지 않는 순수 계산이다.
 *
 * <p>입력 기록은 asOf-27 ~ asOf 범위를 기대한다. last7 = asOf-6~asOf, last14 = asOf-13~asOf, prev21 = asOf-27~asOf-7.
 */
public final class CareSignalCalculator {

    /** 조회해야 하는 기록 일수 (prev21 + last7). */
    public static final int HISTORY_DAYS = 28;
    static final int VALID_STUDY_MINUTES = 30;
    private static final int MIN_START_SAMPLES = 3;

    private CareSignalCalculator() {
    }

    public static LocalDate historyFrom(LocalDate asOf) {
        return asOf.minusDays(HISTORY_DAYS - 1L);
    }

    public static SignalEvaluation evaluate(List<ExistingDailyStudy> days, LocalDate asOf, CareSettings.Values settings) {
        Window window = new Window(days, asOf);
        List<DetectedSignal> signals = new ArrayList<>();

        int absence = window.absenceStreak();
        if (absence >= settings.absenceDays()) {
            signals.add(absenceSignal(window, absence));
        }

        int planMissing = window.planMissingDays();
        if (planMissing >= settings.planMissingDays()) {
            signals.add(new DetectedSignal(CareSignalType.PLAN_MISSING,
                    "최근 7일 중 " + planMissing + "일 계획 미제출",
                    List.of("최근 7일 중 " + planMissing + "일 계획 미제출"),
                    planMissing, 0, null));
        }

        int validDays = window.validDays();
        boolean absent = absence >= settings.absenceDays();
        boolean deferred = !absent && validDays < settings.minValidDays();

        if (!absent && !deferred) {
            Optional<DetectedSignal> drop = studyDrop(window, settings);
            drop.ifPresent(signals::add);
            executionGap(window, settings).ifPresent(signals::add);
            subjectShare(window, settings, drop.isPresent()).ifPresent(signals::add);
            startShift(window, settings).ifPresent(signals::add);
        }

        signals.sort(Comparator.comparing(DetectedSignal::type));
        return new SignalEvaluation(List.copyOf(signals), deferred && signals.isEmpty(), validDays);
    }

    /**
     * 재점검: 건을 연 시점과 같은 공식으로 지표를 다시 계산한다 (domain.md §6).
     * 계산할 수 없으면(시작 시각 표본 부족 등) 비어 있다.
     */
    public static OptionalInt measure(CareSignalType type, String subject, List<ExistingDailyStudy> days, LocalDate asOf) {
        Window window = new Window(days, asOf);
        return switch (type) {
            case CONSECUTIVE_ABSENCE -> OptionalInt.of(window.absenceStreak());
            case PLAN_MISSING -> OptionalInt.of(window.planMissingDays());
            case STUDY_DROP -> OptionalInt.of(window.recentStudyMinutes());
            case EXECUTION_GAP -> window.executionRate();
            case SUBJECT_SHARE -> window.actualShare(subject);
            case START_TIME_SHIFT -> window.recentAverageStart();
        };
    }

    /** 최근 14일 하루 학습량 (날짜 오름차순). */
    public static List<ExistingDailyStudy> last14(List<ExistingDailyStudy> days, LocalDate asOf) {
        return days.stream().filter(day -> !day.date().isBefore(asOf.minusDays(13)) && !day.date().isAfter(asOf))
                .sorted(Comparator.comparing(ExistingDailyStudy::date)).toList();
    }

    /** 평소 하루 평균 학습량 (prev21 기준, 분). */
    public static int usualDailyMinutes(List<ExistingDailyStudy> days, LocalDate asOf) {
        return (int) Math.round(new Window(days, asOf).usualWeeklyMinutes() / 7.0);
    }

    private static DetectedSignal absenceSignal(Window window, int absence) {
        List<String> evidence = new ArrayList<>();
        evidence.add(absence + "일째 입실 기록 없음");
        window.lastCheckIn().ifPresent(date -> evidence.add("마지막 입실 " + CareTextFormat.monthDay(date)));
        return new DetectedSignal(CareSignalType.CONSECUTIVE_ABSENCE, absence + "일째 입실 기록 없음",
                List.copyOf(evidence), absence, 0, null);
    }

    private static Optional<DetectedSignal> studyDrop(Window window, CareSettings.Values settings) {
        double usual = window.usualWeeklyMinutes();
        int recent = window.recentStudyMinutes();
        if (usual <= 0) {
            return Optional.empty();
        }
        double dropPercent = (usual - recent) * 100.0 / usual;
        if (dropPercent < settings.studyDropPercent()) {
            return Optional.empty();
        }
        int usualRounded = (int) Math.round(usual);
        String summary = "최근 7일 " + CareTextFormat.hoursMinutes(roundTo10(recent))
                + " · 평소 같은 기간 " + CareTextFormat.hoursMinutes(roundTo10(usualRounded));
        List<String> evidence = List.of(
                summary + " (" + Math.round(dropPercent) + "% 감소)",
                "하루 평균 " + Math.round(usual / 7.0) + "분 → " + Math.round(recent / 7.0) + "분");
        return Optional.of(new DetectedSignal(CareSignalType.STUDY_DROP, summary, evidence, recent, usualRounded, null));
    }

    private static Optional<DetectedSignal> executionGap(Window window, CareSettings.Values settings) {
        OptionalInt rate = window.executionRate();
        if (rate.isEmpty() || rate.getAsInt() >= settings.executionRatePercent()) {
            return Optional.empty();
        }
        String summary = "최근 2주 계획 " + CareTextFormat.hoursMinutes(roundTo10(window.plannedLast14()))
                + " 중 " + CareTextFormat.hoursMinutes(roundTo10(window.executedLast14()))
                + " 실행 (" + rate.getAsInt() + "%)";
        return Optional.of(new DetectedSignal(CareSignalType.EXECUTION_GAP, summary, List.of(summary),
                rate.getAsInt(), settings.executionRatePercent(), null));
    }

    private static Optional<DetectedSignal> subjectShare(Window window, CareSettings.Values settings, boolean dropFlagged) {
        Map<String, Integer> planned = window.plannedShares();
        Map<String, Integer> actual = window.actualShares();
        if (planned.isEmpty() || actual.isEmpty()) {
            return Optional.empty();
        }
        String worstSubject = null;
        int worstGap = Integer.MIN_VALUE;
        for (Map.Entry<String, Integer> entry : planned.entrySet()) {
            int gap = entry.getValue() - actual.getOrDefault(entry.getKey(), 0);
            if (gap > worstGap) {
                worstGap = gap;
                worstSubject = entry.getKey();
            }
        }
        if (worstSubject == null || worstGap < settings.subjectShareGapPoints()) {
            return Optional.empty();
        }
        int plannedShare = planned.get(worstSubject);
        int actualShare = actual.getOrDefault(worstSubject, 0);
        String summary = "계획한 " + worstSubject + " 비중 " + plannedShare + "% → 최근 " + actualShare + "%";
        String evidence = dropFlagged ? summary : summary + " (전체 학습량은 평소 수준)";
        return Optional.of(new DetectedSignal(CareSignalType.SUBJECT_SHARE, summary, List.of(evidence),
                actualShare, plannedShare, worstSubject));
    }

    private static Optional<DetectedSignal> startShift(Window window, CareSettings.Values settings) {
        OptionalInt recent = window.recentAverageStart();
        OptionalInt usual = window.usualAverageStart();
        if (recent.isEmpty() || usual.isEmpty() || recent.getAsInt() - usual.getAsInt() < settings.startShiftMinutes()) {
            return Optional.empty();
        }
        String summary = "평소 " + CareTextFormat.clock(usual.getAsInt()) + " 시작 → 최근 "
                + CareTextFormat.clock(recent.getAsInt());
        String evidence = summary + " (최근 7일 입실 " + window.recentCheckInDays() + "일 평균)";
        return Optional.of(new DetectedSignal(CareSignalType.START_TIME_SHIFT, summary, List.of(evidence),
                recent.getAsInt(), usual.getAsInt(), null));
    }

    private static int roundTo10(int minutes) {
        return (int) (Math.round(minutes / 10.0) * 10);
    }

    /** asOf 기준 기간 구분. */
    private static final class Window {

        private final List<ExistingDailyStudy> last7;
        private final List<ExistingDailyStudy> last14;
        private final List<ExistingDailyStudy> prev21;
        private final List<ExistingDailyStudy> all;

        Window(List<ExistingDailyStudy> days, LocalDate asOf) {
            List<ExistingDailyStudy> inRange = days.stream()
                    .filter(day -> !day.date().isAfter(asOf) && !day.date().isBefore(historyFrom(asOf)))
                    .sorted(Comparator.comparing(ExistingDailyStudy::date))
                    .toList();
            this.all = inRange;
            this.last7 = inRange.stream().filter(day -> !day.date().isBefore(asOf.minusDays(6))).toList();
            this.last14 = inRange.stream().filter(day -> !day.date().isBefore(asOf.minusDays(13))).toList();
            this.prev21 = inRange.stream().filter(day -> day.date().isBefore(asOf.minusDays(6))).toList();
        }

        int absenceStreak() {
            int streak = 0;
            for (int i = all.size() - 1; i >= 0 && !all.get(i).checkedIn(); i--) {
                streak++;
            }
            return streak;
        }

        Optional<LocalDate> lastCheckIn() {
            for (int i = all.size() - 1; i >= 0; i--) {
                if (all.get(i).checkedIn()) {
                    return Optional.of(all.get(i).date());
                }
            }
            return Optional.empty();
        }

        int planMissingDays() {
            return (int) last7.stream().filter(day -> !day.planSubmitted()).count();
        }

        int validDays() {
            return (int) last7.stream().filter(day -> day.studyMinutes() >= VALID_STUDY_MINUTES).count();
        }

        int recentStudyMinutes() {
            return last7.stream().mapToInt(ExistingDailyStudy::studyMinutes).sum();
        }

        /** prev21 합 ÷ 3 = 평소 7일 학습량. */
        double usualWeeklyMinutes() {
            return prev21.stream().mapToInt(ExistingDailyStudy::studyMinutes).sum() / 3.0;
        }

        int plannedLast14() {
            return last14.stream().filter(ExistingDailyStudy::planSubmitted)
                    .mapToInt(ExistingDailyStudy::plannedMinutes).sum();
        }

        /** 계획을 낸 날의 실행 분. */
        int executedLast14() {
            return last14.stream().filter(ExistingDailyStudy::planSubmitted)
                    .mapToInt(ExistingDailyStudy::studyMinutes).sum();
        }

        OptionalInt executionRate() {
            int planned = plannedLast14();
            if (planned <= 0) {
                return OptionalInt.empty();
            }
            return OptionalInt.of((int) Math.round(executedLast14() * 100.0 / planned));
        }

        Map<String, Integer> plannedShares() {
            return shares(sumBySubject(last7, true));
        }

        Map<String, Integer> actualShares() {
            return shares(sumBySubject(last7, false));
        }

        OptionalInt actualShare(String subject) {
            Map<String, Integer> actual = actualShares();
            return actual.isEmpty() || subject == null ? OptionalInt.empty() : OptionalInt.of(actual.getOrDefault(subject, 0));
        }

        int recentCheckInDays() {
            return (int) last7.stream().filter(day -> day.firstCheckInTime() != null).count();
        }

        OptionalInt recentAverageStart() {
            return averageStart(last7);
        }

        OptionalInt usualAverageStart() {
            return averageStart(prev21);
        }

        private static OptionalInt averageStart(List<ExistingDailyStudy> days) {
            List<LocalTime> starts = days.stream().map(ExistingDailyStudy::firstCheckInTime)
                    .filter(java.util.Objects::nonNull).toList();
            if (starts.size() < MIN_START_SAMPLES) {
                return OptionalInt.empty();
            }
            double average = starts.stream().mapToInt(time -> time.getHour() * 60 + time.getMinute()).average().orElse(0);
            return OptionalInt.of((int) Math.round(average));
        }

        private static Map<String, Integer> sumBySubject(List<ExistingDailyStudy> days, boolean planned) {
            Map<String, Integer> sums = new LinkedHashMap<>();
            for (ExistingDailyStudy day : days) {
                Map<String, Integer> bySubject = planned ? day.plannedMinutesBySubject() : day.studyMinutesBySubject();
                bySubject.forEach((subject, minutes) -> sums.merge(subject, minutes, Integer::sum));
            }
            return sums;
        }

        private static Map<String, Integer> shares(Map<String, Integer> sums) {
            int total = sums.values().stream().mapToInt(Integer::intValue).sum();
            Map<String, Integer> shares = new LinkedHashMap<>();
            if (total <= 0) {
                return shares;
            }
            sums.forEach((subject, minutes) -> shares.put(subject, (int) Math.round(minutes * 100.0 / total)));
            return shares;
        }
    }
}
