package com.learnershigh.extension.common.integration.learnershigh;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Existing LearnersHigh 학생 하루 기록 (Read only).
 *
 * @param checkedIn                  입실 기록이 있는지
 * @param firstCheckInTime           첫 입실 시각, 미입실이면 null
 * @param studyMinutesBySubject      과목별 순공 분
 * @param planSubmitted              그날 학습계획을 제출했는지
 * @param plannedMinutesBySubject    과목별 계획 분 (미제출이면 비어 있다)
 * @param scheduled                  등원 예정 여부, 원본 일정 미확인이면 null
 * @param recordAvailable            원본 report 또는 과목별 통계 기록이 있는지 (실제 0분과 미기록 구분)
 *
 * <p>과목 Key는 Existing 지점별 과목 코드명(자유 명명)이다. Extension에서는 {@link #SUBJECT_KEY_MAX}자(code point)까지만 쓰고,
 * 더 긴 이름은 앞부분만 남긴다(같아지면 분을 합친다). 이후 저장 / 문구가 이 길이를 넘지 않는다.
 */
public record ExistingDailyStudy(
        LocalDate date,
        boolean checkedIn,
        LocalTime firstCheckInTime,
        Map<String, Integer> studyMinutesBySubject,
        boolean planSubmitted,
        Map<String, Integer> plannedMinutesBySubject,
        Boolean scheduled,
        boolean recordAvailable) {

    /** 과목 Key 최대 길이 (code point). */
    public static final int SUBJECT_KEY_MAX = 100;

    /** 기존 호출은 기록이 있는 것으로 유지하되, 등원 일정은 추정하지 않는다. */
    public ExistingDailyStudy(
            LocalDate date,
            boolean checkedIn,
            LocalTime firstCheckInTime,
            Map<String, Integer> studyMinutesBySubject,
            boolean planSubmitted,
            Map<String, Integer> plannedMinutesBySubject) {
        this(date, checkedIn, firstCheckInTime, studyMinutesBySubject, planSubmitted, plannedMinutesBySubject,
                null, true);
    }

    public ExistingDailyStudy {
        studyMinutesBySubject = normalizeSubjects(studyMinutesBySubject);
        plannedMinutesBySubject = normalizeSubjects(plannedMinutesBySubject);
    }

    private static Map<String, Integer> normalizeSubjects(Map<String, Integer> minutesBySubject) {
        Map<String, Integer> normalized = new LinkedHashMap<>();
        minutesBySubject.forEach((subject, minutes) -> normalized.merge(capSubject(subject), minutes, Integer::sum));
        return Map.copyOf(normalized);
    }

    private static String capSubject(String subject) {
        return subject.codePointCount(0, subject.length()) <= SUBJECT_KEY_MAX
                ? subject
                : subject.substring(0, subject.offsetByCodePoints(0, SUBJECT_KEY_MAX));
    }

    public int studyMinutes() {
        return studyMinutesBySubject.values().stream().mapToInt(Integer::intValue).sum();
    }

    public int plannedMinutes() {
        return plannedMinutesBySubject.values().stream().mapToInt(Integer::intValue).sum();
    }
}
