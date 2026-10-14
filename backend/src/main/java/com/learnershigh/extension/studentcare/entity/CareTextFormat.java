package com.learnershigh.extension.studentcare.entity;

import java.time.LocalDate;

/** 이력 / 특이사항 문구에 쓰는 표기 (docs/design/student-care-ux.md 용어). */
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

    /** "상담 · 통화 — 내용", 내용이 없으면 "상담 · 통화" */
    public static String counseling(NoteChannel channel, String memo) {
        String head = "상담 · " + channel.label();
        return memo == null || memo.isEmpty() ? head : head + " — " + memo;
    }

    /** "계속 관리 · 다음 점검 10월 7일" */
    public static String continued(LocalDate recheckDate) {
        return "계속 관리 · 다음 점검 " + monthDay(recheckDate);
    }
}
