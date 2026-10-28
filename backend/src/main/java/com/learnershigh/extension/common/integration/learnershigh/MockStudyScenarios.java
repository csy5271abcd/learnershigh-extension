package com.learnershigh.extension.common.integration.learnershigh;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * 학생별 하루 기록 시나리오. {@code anchor}(시연 기준일) 이전은 "달라진" 기록, 이후는 조정 뒤 기록이다.
 * 같은 학생 / 날짜는 항상 같은 값을 돌려준다 (hash 기반 noise).
 *
 * <pre>
 * stu_001 김서준  anchor-3 ~ anchor+2 미입실 (연속 미입실, 계획 미제출) → anchor+3부터 등원
 * stu_002 최학생  최근 7일 중 4일 계획 미제출 → anchor+1부터 매일 제출
 * stu_003 한유진  최근 7일 학습량 약 53% 감소 → anchor+1부터 평소의 85%
 * stu_004 정예준  최근 14일 계획을 크게 늘려 실행률 약 53% → anchor+1부터 계획을 줄여 약 83%
 * stu_005 윤서연  수학 비중 계획 30% → 최근 12% → anchor+1부터 24%
 * stu_006 이학생  시작 19:10 → 최근 21:40 → anchor+1부터 20:00
 * stu_007 오시윤  최근 7일 학습량 약 44% 감소 → 이후에도 그대로
 * stu_008 장하준  최근 7일 유효 학습일 2일 (판단 보류)
 * stu_102 서지우  최근 7일 학습량 약 60% 감소 → anchor+1부터 평소
 * 그 외          평소 기록
 * </pre>
 */
final class MockStudyScenarios {

    private static final Map<String, Integer> DEFAULT_SHARE = shares(25, 30, 25, 20);

    private MockStudyScenarios() {
    }

    static ExistingDailyStudy dayOf(String studentId, LocalDate date, LocalDate anchor) {
        return dayOf(studentId, date, anchor, false);
    }

    /** Optional visual examples preserve the original domain/regression fixture. */
    static ExistingDailyStudy dayOf(String studentId, LocalDate date, LocalDate anchor, boolean visualExamples) {
        if (visualExamples) return MockVisualStudyScenarios.dayOf(studentId, date, anchor);
        long d = ChronoUnit.DAYS.between(anchor, date);
        Day day = Day.usual(studentId, date, usualMinutes(studentId), usualStart(studentId));
        adjust(studentId, d, day);
        return day.toRecord(date);
    }

    private static int usualMinutes(String studentId) {
        return switch (studentId) {
            case "stu_003" -> 163;
            case "stu_004" -> 75;
            case "stu_007" -> 154;
            case "stu_009" -> 280;
            default -> 250;
        };
    }

    private static LocalTime usualStart(String studentId) {
        return switch (studentId) {
            case "stu_006" -> LocalTime.of(19, 10);
            case "stu_009" -> LocalTime.of(17, 30);
            default -> LocalTime.of(18, 20);
        };
    }

    private static void adjust(String studentId, long d, Day day) {
        boolean recent = d >= -6 && d <= 0;
        boolean after = d >= 1;
        switch (studentId) {
            case "stu_001" -> {
                if (d >= -3 && d <= 2) {
                    day.absent();
                }
            }
            case "stu_002" -> {
                if (d == -6 || d == -4 || d == -2 || d == 0) {
                    day.noPlan();
                }
            }
            case "stu_003" -> {
                if (recent) {
                    day.scaleStudy(77.0 / 163);
                } else if (after) {
                    day.scaleStudy(0.86);
                }
            }
            case "stu_004" -> {
                if (d >= -13 && d <= 0) {
                    day.scalePlan(141.0 / 75);
                } else if (after) {
                    day.scalePlan(90.0 / 75);
                }
            }
            case "stu_005" -> {
                if (recent) {
                    day.actualShare = shares(31, 12, 31, 26);
                } else if (after) {
                    day.actualShare = shares(27, 24, 27, 22);
                }
            }
            case "stu_006" -> {
                if (recent) {
                    day.start = LocalTime.of(21, 40).plusMinutes(day.startJitter);
                    day.scaleStudy(0.85);
                } else if (after) {
                    day.start = LocalTime.of(20, 0).plusMinutes(day.startJitter);
                }
            }
            case "stu_007" -> {
                if (d >= -6) {
                    day.scaleStudy(0.56);
                }
            }
            case "stu_008" -> {
                if (recent && d != -5 && d != -2) {
                    day.study = 10;
                }
            }
            case "stu_102" -> {
                if (recent) {
                    day.scaleStudy(0.4);
                }
            }
            default -> {
                // 평소 기록
            }
        }
    }

    private static Map<String, Integer> shares(int korean, int math, int english, int inquiry) {
        Map<String, Integer> shares = new LinkedHashMap<>();
        shares.put("국어", korean);
        shares.put("수학", math);
        shares.put("영어", english);
        shares.put("탐구", inquiry);
        return shares;
    }

    /** 0 ~ range-1 범위의 결정적 값. */
    private static int hash(String studentId, LocalDate date, String salt, int range) {
        return Math.floorMod(Objects.hash(studentId, date.toEpochDay(), salt), range);
    }

    private static final class Day {

        boolean checkedIn = true;
        LocalTime start;
        int startJitter;
        int study;
        boolean planSubmitted = true;
        int planned;
        Map<String, Integer> plannedShare = DEFAULT_SHARE;
        Map<String, Integer> actualShare = DEFAULT_SHARE;

        static Day usual(String studentId, LocalDate date, int usualMinutes, LocalTime usualStart) {
            Day day = new Day();
            double weekday = date.getDayOfWeek() == DayOfWeek.SUNDAY ? 0.7 : 1.0;
            double noise = 1 + (hash(studentId, date, "study", 17) - 8) / 100.0;
            day.study = (int) Math.round(usualMinutes * weekday * noise);
            day.planned = (int) Math.round(usualMinutes * weekday * 1.05);
            day.startJitter = hash(studentId, date, "start", 21) - 10;
            day.start = usualStart.plusMinutes(day.startJitter);
            return day;
        }

        void absent() {
            checkedIn = false;
            start = null;
            study = 0;
            noPlan();
        }

        void noPlan() {
            planSubmitted = false;
            planned = 0;
        }

        void scaleStudy(double ratio) {
            study = (int) Math.round(study * ratio);
        }

        void scalePlan(double ratio) {
            planned = (int) Math.round(planned * ratio);
        }

        ExistingDailyStudy toRecord(LocalDate date) {
            return new ExistingDailyStudy(
                    date,
                    checkedIn,
                    checkedIn ? start : null,
                    split(study, actualShare),
                    planSubmitted,
                    planSubmitted ? split(planned, plannedShare) : Map.of(),
                    true, // 시연용 합성 시나리오의 명시적 등원 일정
                    true);
        }

        private static Map<String, Integer> split(int total, Map<String, Integer> shares) {
            Map<String, Integer> minutes = new LinkedHashMap<>();
            if (total <= 0) {
                return minutes;
            }
            int assigned = 0;
            int index = 0;
            for (Map.Entry<String, Integer> share : shares.entrySet()) {
                index++;
                int value = index == shares.size()
                        ? total - assigned
                        : (int) Math.round(total * share.getValue() / 100.0);
                assigned += value;
                minutes.put(share.getKey(), value);
            }
            return minutes;
        }
    }
}
