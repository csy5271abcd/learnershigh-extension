package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.studentcare.entity.CareSettings;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.entity.CareTextFormat;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.TreeMap;

/**
 * 학생 케어 신호 계산 (docs/specs/wangyu/domain.md §2, §3). Spring / DB에 의존하지 않는 순수 계산이다.
 *
 * <p>입력 기록은 asOf-34 ~ asOf 범위를 기대한다. last7 = asOf-6~asOf, last14 = asOf-13~asOf, baseline28 = asOf-34~asOf-7.
 *
 * <p>Threshold 판정은 반올림하지 않은 값으로 한다 (domain.md §3). 비율 / 평균은 나눗셈 없이 정수 교차곱으로 비교해
 * 부동소수 오차도 없다. 화면 문구 / Baseline 값만 정수로 반올림한다.
 */
public final class CareSignalCalculator {

    /** 조회해야 하는 기록 일수 (baseline28 + last7). */
    public static final int HISTORY_DAYS = 35;
    /** 유효 학습일 기준 (그날 학습 분 이상). */
    static final int VALID_STUDY_MINUTES = 30;
    /** 시작 시각 평균에 필요한 기간별 입실일 수. */
    static final int MIN_START_SAMPLES = 3;
    /** baseline28은 4주라 평소 7일 학습량 = baseline28 합 ÷ 4. */
    private static final int USUAL_WEEKS = 4;

    private CareSignalCalculator() {
    }

    public static LocalDate historyFrom(LocalDate asOf) {
        return asOf.minusDays(HISTORY_DAYS - 1L);
    }

    public static SignalEvaluation evaluate(List<ExistingDailyStudy> days, LocalDate asOf, CareSettings.Values settings) {
        Window window = new Window(days, asOf);
        List<DetectedSignal> signals = new ArrayList<>();

        int absence = window.scheduledAbsenceDays();
        boolean absent = absence >= settings.absenceDays();
        if (absent) {
            signals.add(absenceSignal(window, absence));
        }

        int planMissing = window.planMissingDays();
        if (planMissing >= settings.planMissingDays()) {
            String summary = "최근 7일 중 " + planMissing + "일 미제출";
            signals.add(new DetectedSignal(CareSignalType.PLAN_MISSING, summary, List.of(summary), planMissing, null, null));
        }

        int validDays = window.validDays();
        boolean volumeSkipped = !absent && validDays < settings.minValidDays();

        if (!absent && !volumeSkipped) {
            Optional<DetectedSignal> drop = studyDrop(window, settings);
            drop.ifPresent(signals::add);
            executionGap(window, settings).ifPresent(signals::add);
            subjectShare(window, settings, drop.isPresent()).ifPresent(signals::add);
            startShift(window, settings).ifPresent(signals::add);
        }

        signals.sort(Comparator.comparing(DetectedSignal::type));
        return new SignalEvaluation(signals, volumeSkipped, validDays);
    }

    /**
     * 재점검: 건을 연 시점과 같은 공식으로 지표를 다시 계산한다 (domain.md §6). 값은 Baseline과 같은 정수 반올림이다.
     * 계산할 수 없으면(시작 시각 표본 부족, 계획 / 학습 기록 없음 등) 비어 있다.
     */
    public static OptionalInt measure(CareSignalType type, String subject, List<ExistingDailyStudy> days, LocalDate asOf) {
        Window window = new Window(days, asOf);
        if (window.last7.stream().noneMatch(ExistingDailyStudy::recordAvailable)) {
            return OptionalInt.empty();
        }
        return switch (type) {
            case CONSECUTIVE_ABSENCE -> window.completeAbsenceEvidence()
                    ? OptionalInt.of(window.scheduledAbsenceDays()) : OptionalInt.empty();
            case PLAN_MISSING -> window.completeRecent()
                    ? OptionalInt.of(window.planMissingDays()) : OptionalInt.empty();
            case STUDY_DROP -> window.completeRecent() ? OptionalInt.of(window.recentStudyMinutes()) : OptionalInt.empty();
            case EXECUTION_GAP -> window.plannedLast7() > 0
                    ? OptionalInt.of(roundedPercent(window.executedLast7(), window.plannedLast7()))
                    : OptionalInt.empty();
            case SUBJECT_SHARE -> {
                Map<String, Integer> actual = window.subjectMinutes(false);
                int total = sum(actual);
                yield subject == null || total <= 0
                        ? OptionalInt.empty()
                        : OptionalInt.of(roundedPercent(actual.getOrDefault(subject, 0), total));
            }
            case START_TIME_SHIFT -> window.startDeviation().average();
        };
    }

    /** 최근 14일 하루 학습량 (날짜 오름차순). */
    public static List<ExistingDailyStudy> last14(List<ExistingDailyStudy> days, LocalDate asOf) {
        return days.stream().filter(day -> !day.date().isBefore(asOf.minusDays(13)) && !day.date().isAfter(asOf))
                .sorted(Comparator.comparing(ExistingDailyStudy::date)).toList();
    }

    /** 기록이 있는 baseline28 날짜의 하루 평균 학습량 (호환 표시용, 분). */
    public static int usualDailyMinutes(List<ExistingDailyStudy> days, LocalDate asOf) {
        Window window = new Window(days, asOf);
        long recorded = window.baseline28.stream().filter(ExistingDailyStudy::recordAvailable).count();
        return recorded == 0 ? 0 : (int) Math.round(window.usualSumMinutes() / (double) recorded);
    }

    private static DetectedSignal absenceSignal(Window window, int absence) {
        List<String> evidence = new ArrayList<>();
        String summary = "최근 7일 중 " + absence + "일 미입실";
        evidence.add(summary);
        window.lastCheckIn().ifPresent(date -> evidence.add("마지막 등원 " + CareTextFormat.monthDay(date)));
        return new DetectedSignal(CareSignalType.CONSECUTIVE_ABSENCE, summary,
                List.copyOf(evidence), absence, null, null);
    }

    /** 평소(baseline28 합 ÷ 4) &gt; 0 이고 (평소 − last7) ÷ 평소 ≥ studyDropPercent%. */
    private static Optional<DetectedSignal> studyDrop(Window window, CareSettings.Values settings) {
        long usualSum = window.usualSumMinutes();
        long recent = window.recentStudyMinutes();
        if (!window.completeBaseline() || !window.completeRecent() || usualSum <= 0) {
            return Optional.empty();
        }
        // (usualSum/4 − recent) / (usualSum/4) ≥ p/100  ⇔  (usualSum − 4·recent)·100 ≥ p·usualSum
        if ((usualSum - USUAL_WEEKS * recent) * 100 < (long) settings.studyDropPercent() * usualSum) {
            return Optional.empty();
        }
        double usual = usualSum / (double) USUAL_WEEKS;
        int usualRounded = (int) Math.round(usual);
        String summary = "최근 7일 " + CareTextFormat.hoursMinutes(roundTo10((int) recent))
                + " · 평소 " + CareTextFormat.hoursMinutes(roundTo10(usualRounded));
        List<String> evidence = List.of(
                summary + " · " + Math.round((usual - recent) * 100 / usual) + "% 감소",
                "하루 평균 " + Math.round(usual / 7.0) + "분 → " + Math.round(recent / 7.0) + "분");
        return Optional.of(new DetectedSignal(CareSignalType.STUDY_DROP, summary, evidence, (int) recent, usualRounded,
                null));
    }

    /** last7 중 입실·양수계획·실제기록이 있는 날의 계획 분 합 &gt; 0 이고, 그날들의 실행 분 합 ÷ 계획 분 합 &lt; executionRatePercent%. */
    private static Optional<DetectedSignal> executionGap(Window window, CareSettings.Values settings) {
        long planned = window.plannedLast7();
        long executed = window.executedLast7();
        if (planned <= 0 || executed * 100 >= (long) settings.executionRatePercent() * planned) {
            return Optional.empty();
        }
        int rate = roundedPercent(executed, planned);
        String summary = "최근 7일 계획 달성률 " + rate + "%";
        String evidence = "계획 " + CareTextFormat.hoursMinutes(roundTo10((int) planned))
                + " 중 " + CareTextFormat.hoursMinutes(roundTo10((int) executed)) + " 달성";
        return Optional.of(new DetectedSignal(CareSignalType.EXECUTION_GAP, summary, List.of(evidence), rate,
                settings.executionRatePercent(), null));
    }

    /**
     * last7 계획 비중 − 실제 비중이 가장 큰 과목의 차이 ≥ subjectShareGapPoints%p.
     * 차이가 같은 과목이 여럿이면 과목명 순으로 앞선 과목을 쓴다(입력 Map 순서에 기대지 않는다).
     */
    private static Optional<DetectedSignal> subjectShare(Window window, CareSettings.Values settings, boolean dropFlagged) {
        Map<String, Integer> planned = window.subjectMinutes(true);
        Map<String, Integer> actual = window.subjectMinutes(false);
        long plannedTotal = sum(planned);
        long actualTotal = sum(actual);
        if (plannedTotal <= 0 || actualTotal <= 0) {
            return Optional.empty();
        }
        // 과목 s의 차이 = p_s/P − a_s/A = (p_s·A − a_s·P) / (P·A). 분모가 같으므로 분자로 비교한다.
        String worstSubject = null;
        long worstNumerator = Long.MIN_VALUE;
        for (Map.Entry<String, Integer> entry : planned.entrySet()) {
            long numerator = entry.getValue() * actualTotal - actual.getOrDefault(entry.getKey(), 0) * plannedTotal;
            if (numerator > worstNumerator) {
                worstNumerator = numerator;
                worstSubject = entry.getKey();
            }
        }
        // 차이 ≥ g/100  ⇔  분자·100 ≥ g·P·A
        if (worstSubject == null
                || worstNumerator * 100 < (long) settings.subjectShareGapPoints() * plannedTotal * actualTotal) {
            return Optional.empty();
        }
        int plannedShare = roundedPercent(planned.get(worstSubject), plannedTotal);
        int actualShare = roundedPercent(actual.getOrDefault(worstSubject, 0), actualTotal);
        String summary = worstSubject + " 계획 " + plannedShare + "% → 실제 " + actualShare + "%";
        boolean volumeComparable = window.completeBaseline() && window.completeRecent() && window.usualSumMinutes() > 0;
        String evidence = !dropFlagged && volumeComparable ? summary + " · 전체 공부 시간은 평소 수준" : summary;
        return Optional.of(new DetectedSignal(CareSignalType.SUBJECT_SHARE, summary, List.of(evidence),
                actualShare, plannedShare, worstSubject));
    }

    /** 최근 입실마다 본인의 이전 같은요일 시각을 뺀 편차 평균. 시각 구성 변화와 실제 지연을 구분한다. */
    private static Optional<DetectedSignal> startShift(Window window, CareSettings.Values settings) {
        StartDeviation shift = window.startDeviation();
        if (!shift.enough() || shift.scaledSum() < (long) settings.startShiftMinutes() * 12 * shift.count())
            return Optional.empty();
        int minutes = shift.average().getAsInt();
        String summary = "평소보다 " + minutes + "분 늦게 입실";
        String evidence = summary + " · 최근 7일 " + shift.count() + "일 비교";
        return Optional.of(new DetectedSignal(CareSignalType.START_TIME_SHIFT, summary, List.of(evidence),
                minutes, 0, null));
    }

    private static int roundTo10(int minutes) {
        return (int) (Math.round(minutes / 10.0) * 10);
    }

    /** part ÷ whole × 100 을 정수로 반올림한 표시 값 (whole &gt; 0). */
    private static int roundedPercent(long part, long whole) {
        return (int) Math.round(part * 100.0 / whole);
    }

    private static int sum(Map<String, Integer> minutes) {
        return minutes.values().stream().mapToInt(Integer::intValue).sum();
    }

    /** 첫 입실 시각(자정부터의 분) 표본. */
    private record Starts(long sum, int count) {

        static Starts of(List<ExistingDailyStudy> days) {
            List<LocalTime> starts = days.stream().filter(ExistingDailyStudy::recordAvailable).filter(ExistingDailyStudy::checkedIn)
                    .map(ExistingDailyStudy::firstCheckInTime)
                    .filter(Objects::nonNull).toList();
            return new Starts(starts.stream().mapToLong(time -> time.getHour() * 60L + time.getMinute()).sum(),
                    starts.size());
        }

        boolean enough() {
            return count >= MIN_START_SAMPLES;
        }

        OptionalInt average() {
            return enough() ? OptionalInt.of((int) Math.round(sum / (double) count)) : OptionalInt.empty();
        }
    }

    /** 같은요일은 이전28일에 최대4개. 공통 배수12로 편차를 정확히 보존하여 문턱 비교는 반올림하지 않는다. */
    private record StartDeviation(long scaledSum, int count) {
        boolean enough() { return count >= MIN_START_SAMPLES; }
        OptionalInt average() {
            return enough() ? OptionalInt.of((int) Math.round(scaledSum / (12.0 * count))) : OptionalInt.empty();
        }
    }

    /** asOf 기준 기간 구분. */
    private static final class Window {

        private final List<ExistingDailyStudy> last7;
        private final List<ExistingDailyStudy> baseline28;
        private final List<ExistingDailyStudy> all;

        Window(List<ExistingDailyStudy> days, LocalDate asOf) {
            List<ExistingDailyStudy> inRange = days.stream()
                    .filter(day -> !day.date().isAfter(asOf) && !day.date().isBefore(historyFrom(asOf)))
                    .sorted(Comparator.comparing(ExistingDailyStudy::date))
                    .toList();
            this.all = inRange;
            this.last7 = inRange.stream().filter(day -> !day.date().isBefore(asOf.minusDays(6))).toList();
            this.baseline28 = inRange.stream().filter(day -> day.date().isBefore(asOf.minusDays(6))).toList();
        }

        boolean completeBaseline() {
            return baseline28.stream().filter(ExistingDailyStudy::recordAvailable)
                    .map(ExistingDailyStudy::date).distinct().count() == 28;
        }

        boolean completeRecent() {
            return last7.stream().filter(ExistingDailyStudy::recordAvailable)
                    .map(ExistingDailyStudy::date).distinct().count() == 7;
        }

        boolean completeAbsenceEvidence() {
            return completeRecent() && last7.stream()
                    .noneMatch(day -> !day.checkedIn() && day.scheduled() == null);
        }

        int scheduledAbsenceDays() {
            return (int) last7.stream().filter(ExistingDailyStudy::recordAvailable)
                    .filter(day -> Boolean.TRUE.equals(day.scheduled()) && !day.checkedIn()).count();
        }

        Optional<LocalDate> lastCheckIn() {
            for (int i = all.size() - 1; i >= 0; i--) {
                if (all.get(i).recordAvailable() && all.get(i).checkedIn()) {
                    return Optional.of(all.get(i).date());
                }
            }
            return Optional.empty();
        }

        int planMissingDays() {
            return (int) last7.stream().filter(ExistingDailyStudy::recordAvailable)
                    .filter(day -> !Boolean.FALSE.equals(day.scheduled()))
                    .filter(day -> !day.planSubmitted()).count();
        }

        int validDays() {
            return (int) last7.stream().filter(ExistingDailyStudy::recordAvailable)
                    .filter(day -> day.studyMinutes() >= VALID_STUDY_MINUTES).count();
        }

        int recentStudyMinutes() {
            return last7.stream().filter(ExistingDailyStudy::recordAvailable)
                    .mapToInt(ExistingDailyStudy::studyMinutes).sum();
        }

        /** baseline28 기록된 학습 분 합. 완전한 28일일 때만 4주 비교에 쓴다. */
        long usualSumMinutes() {
            return baseline28.stream().filter(ExistingDailyStudy::recordAvailable)
                    .mapToLong(ExistingDailyStudy::studyMinutes).sum();
        }

        private List<ExistingDailyStudy> comparablePlanDays() {
            return last7.stream().filter(ExistingDailyStudy::recordAvailable).filter(ExistingDailyStudy::checkedIn)
                    .filter(ExistingDailyStudy::planSubmitted).filter(day -> day.plannedMinutes() > 0).toList();
        }

        /** 입실·양수계획·실제기록이 있는 날의 계획 분 합. */
        long plannedLast7() {
            return comparablePlanDays().stream()
                    .mapToLong(ExistingDailyStudy::plannedMinutes).sum();
        }

        /** 계획을 낸 날의 실행 분 합 (계획을 내지 않은 날의 학습은 넣지 않는다). */
        long executedLast7() {
            return comparablePlanDays().stream()
                    .mapToLong(ExistingDailyStudy::studyMinutes).sum();
        }

        /** last7 과목별 계획 / 실제 분 합. 과목명 순으로 정렬한다. */
        Map<String, Integer> subjectMinutes(boolean planned) {
            Map<String, Integer> sums = new TreeMap<>();
            for (ExistingDailyStudy day : last7) {
                if (!day.recordAvailable() || !day.checkedIn() || !day.planSubmitted() || day.plannedMinutes() <= 0) {
                    continue;
                }
                Map<String, Integer> bySubject = planned ? day.plannedMinutesBySubject() : day.studyMinutesBySubject();
                bySubject.forEach((subject, minutes) -> sums.merge(subject, minutes, Integer::sum));
            }
            return sums;
        }

        Starts recentStarts() {
            return Starts.of(last7);
        }

        Starts usualStarts() {
            return Starts.of(baseline28);
        }

        StartDeviation startDeviation() {
            long sum = 0;
            int count = 0;
            for (var day : last7) {
                if (!day.recordAvailable() || !day.checkedIn() || day.firstCheckInTime() == null) continue;
                Starts baseline = Starts.of(baseline28.stream()
                        .filter(old -> old.date().getDayOfWeek() == day.date().getDayOfWeek()).toList());
                if (baseline.count() == 0) continue;
                if (baseline.count() > 4) throw new IllegalArgumentException("duplicate weekday baseline records");
                long actual = day.firstCheckInTime().getHour() * 60L + day.firstCheckInTime().getMinute();
                sum += actual * 12 - baseline.sum() * (12 / baseline.count());
                count++;
            }
            return new StartDeviation(sum, count);
        }
    }
}
