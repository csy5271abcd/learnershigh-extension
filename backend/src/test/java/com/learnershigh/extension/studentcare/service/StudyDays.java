package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

/** 신호 계산 Test용 35일 기록 Builder. 기본은 매일 18:00 입실, 240분(국어/수학/영어/탐구 균등), 계획 제출. */
final class StudyDays {

    static final LocalDate AS_OF = LocalDate.of(2026, 9, 30);

    private StudyDays() {
    }

    /** offset = date - AS_OF (−34 ~ 0). */
    static List<ExistingDailyStudy> build(BiFunction<Integer, Day, Day> adjust) {
        List<ExistingDailyStudy> days = new ArrayList<>();
        for (int offset = -34; offset <= 0; offset++) {
            Day day = adjust.apply(offset, new Day());
            days.add(day.toRecord(AS_OF.plusDays(offset)));
        }
        return days;
    }

    static List<ExistingDailyStudy> usual() {
        return build((offset, day) -> day);
    }

    static final class Day {

        boolean checkedIn = true;
        Boolean scheduled = true;
        boolean recordAvailable = true;
        LocalTime start = LocalTime.of(18, 0);
        Map<String, Integer> study = even(240);
        boolean planSubmitted = true;
        Map<String, Integer> planned = even(240);

        Day absent() {
            checkedIn = false;
            start = null;
            study = Map.of();
            return noPlan();
        }

        Day unavailable() { recordAvailable = false; return this; }

        Day schedule(Boolean value) { scheduled = value; return this; }

        Day noPlan() {
            planSubmitted = false;
            planned = Map.of();
            return this;
        }

        Day study(int minutes) {
            study = even(minutes);
            return this;
        }

        Day planned(int minutes) {
            planned = even(minutes);
            return this;
        }

        Day studyBySubject(int korean, int math, int english, int inquiry) {
            study = subjects(korean, math, english, inquiry);
            return this;
        }

        Day start(LocalTime time) {
            start = time;
            return this;
        }

        ExistingDailyStudy toRecord(LocalDate date) {
            return new ExistingDailyStudy(date, checkedIn, checkedIn ? start : null, study, planSubmitted, planned, scheduled, recordAvailable);
        }

        static Map<String, Integer> even(int minutes) {
            return minutes <= 0 ? Map.of() : subjects(minutes / 4, minutes / 4, minutes / 4, minutes - 3 * (minutes / 4));
        }

        static Map<String, Integer> subjects(int korean, int math, int english, int inquiry) {
            Map<String, Integer> map = new LinkedHashMap<>();
            map.put("국어", korean);
            map.put("수학", math);
            map.put("영어", english);
            map.put("탐구", inquiry);
            return map;
        }
    }
}
