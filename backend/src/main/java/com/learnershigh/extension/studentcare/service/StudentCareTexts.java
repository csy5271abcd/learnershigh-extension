package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.entity.CareTextFormat;

/** 점검 비교 문구 (docs/design/student-care-ux.md 용어). */
public final class StudentCareTexts {

    private StudentCareTexts() {
    }

    /** 점검 비교 한 줄. 예: "수학 비중 12% → 24%" */
    public static String comparisonRow(CareSignalType type, String subject, int before, int now) {
        return switch (type) {
            case CONSECUTIVE_ABSENCE -> "연속 결석 " + before + "일 → " + now + "일";
            case PLAN_MISSING -> "계획 미제출 " + before + "일 → " + now + "일";
            case STUDY_DROP -> "7일 공부 " + CareTextFormat.hoursMinutes(before) + " → "
                    + CareTextFormat.hoursMinutes(now);
            case EXECUTION_GAP -> "달성률 " + before + "% → " + now + "%";
            case SUBJECT_SHARE -> subject + " 비중 " + before + "% → " + now + "%";
            case START_TIME_SHIFT -> "평소 대비 입실 " + before + "분 → " + now + "분";
        };
    }
}
