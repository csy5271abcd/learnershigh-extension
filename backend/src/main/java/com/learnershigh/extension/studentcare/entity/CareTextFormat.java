package com.learnershigh.extension.studentcare.entity;

import java.time.LocalDate;

/** 학생 기록 문구에 쓰는 날짜 / 시간 표기. */
public final class CareTextFormat {

    private CareTextFormat() {
    }

    /** 2026-10-07 → "10월 7일" */
    public static String monthDay(LocalDate date) {
        return date.getMonthValue() + "월 " + date.getDayOfMonth() + "일";
    }

    /** 570 → "9시간 30분", 540 → "9시간", 45 → "45분" */
    public static String hoursMinutes(int minutes) {
        int hours = minutes / 60;
        int rest = minutes % 60;
        if (hours == 0) {
            return rest + "분";
        }
        return rest == 0 ? hours + "시간" : hours + "시간 " + rest + "분";
    }

    /** 1300 → "21:40" */
    public static String clock(int minutesOfDay) {
        return String.format("%02d:%02d", minutesOfDay / 60, minutesOfDay % 60);
    }
}
