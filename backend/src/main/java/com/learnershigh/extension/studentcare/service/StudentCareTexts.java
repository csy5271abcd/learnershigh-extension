package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.entity.CareTextFormat;
import java.time.LocalDate;

/**
 * 확인할 질문 / 약속 예시 문구 (domain.md §7). 규칙 기반 템플릿이며 AI 결과가 아니다.
 * 신호는 판정이 아니므로 질문은 사유를 단정하지 않는다.
 */
public final class StudentCareTexts {

    /** 약속 예시의 기본 재점검 간격. */
    public static final int SUGGESTED_RECHECK_DAYS = 7;

    private StudentCareTexts() {
    }

    public static String question(DetectedSignal signal) {
        return switch (signal.type()) {
            case CONSECUTIVE_ABSENCE -> "아픈지, 학원을 옮기려는지, 다른 일정이 생겼는지";
            case PLAN_MISSING -> "계획 세울 시간이 부족한지, 계획 작성이 부담스러운지";
            case STUDY_DROP -> "시험이 끝나 쉬는 중인지, 다른 학원·일정이 생겼는지";
            case EXECUTION_GAP -> "계획이 너무 많은지, 중간에 흐름이 끊기는지";
            case SUBJECT_SHARE -> "의도한 시험 대비인지, " + signal.subject() + " 항목이 너무 커서 미루고 있는지";
            case START_TIME_SHIFT -> "하교·이동 시간이 바뀌었는지, 앞에 다른 일정이 생겼는지";
        };
    }

    public static Suggestion suggestion(DetectedSignal primary, LocalDate asOf) {
        LocalDate recheckDate = asOf.plusDays(SUGGESTED_RECHECK_DAYS);
        return switch (primary.type()) {
            case CONSECUTIVE_ABSENCE -> new Suggestion("다음 주 등원 일정 다시 정하기",
                    "등원할 수 있는 요일과 시간을 학생과 정해 기록하기", "주 3회부터", recheckDate);
            case PLAN_MISSING -> new Suggestion("매일 계획 제출하기",
                    "입실 직후 5분 안에 오늘 계획 3개 작성하기", "하루 계획 3개까지", recheckDate);
            case STUDY_DROP -> new Suggestion("주간 학습량을 평소의 80%까지 회복",
                    "하루 공부를 50분 단위로 나눠 기록하기", "주 2시간 추가까지", recheckDate);
            case EXECUTION_GAP -> new Suggestion("계획 대비 실행률 70% 이상",
                    "하루 계획 시간을 실제로 할 수 있는 만큼 줄여 세우기", "하루 계획 4시간까지", recheckDate);
            case SUBJECT_SHARE -> new Suggestion(
                    primary.subject() + " 비중을 계획한 " + primary.target() + "% 가까이",
                    "큰 " + primary.subject() + " 항목을 30분씩 4회로 나누기", "주 2시간 추가까지", recheckDate);
            case START_TIME_SHIFT -> new Suggestion(
                    "평소 시작 시각(" + CareTextFormat.clock(primary.target()) + ")으로 돌아가기",
                    "입실 후 10분 안에 첫 과목 시작하기", "주 3회부터", recheckDate);
        };
    }

    /** 재점검 비교 행 문구. 예: "수학 비중 12% → 24%" */
    public static String comparisonRow(CareSignalType type, String subject, int before, int now) {
        return switch (type) {
            case CONSECUTIVE_ABSENCE -> "연속 미입실 " + before + "일 → " + now + "일";
            case PLAN_MISSING -> "최근 7일 계획 미제출 " + before + "일 → " + now + "일";
            case STUDY_DROP -> "최근 7일 학습량 " + CareTextFormat.hoursMinutes(before) + " → "
                    + CareTextFormat.hoursMinutes(now);
            case EXECUTION_GAP -> "계획 대비 실행률 " + before + "% → " + now + "%";
            case SUBJECT_SHARE -> subject + " 비중 " + before + "% → " + now + "%";
            case START_TIME_SHIFT -> "평균 시작 " + CareTextFormat.clock(before) + " → " + CareTextFormat.clock(now);
        };
    }

    public record Suggestion(String goal, String action, String loadLimit, LocalDate recheckDate) {
    }
}
