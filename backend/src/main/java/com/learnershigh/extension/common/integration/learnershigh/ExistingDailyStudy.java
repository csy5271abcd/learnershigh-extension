package com.learnershigh.extension.common.integration.learnershigh;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

/**
 * Existing LearnersHigh 학생 하루 기록 (Read only).
 *
 * @param checkedIn                  입실 기록이 있는지
 * @param firstCheckInTime           첫 입실 시각, 미입실이면 null
 * @param studyMinutesBySubject      과목별 순공 분
 * @param planSubmitted              그날 학습계획을 제출했는지
 * @param plannedMinutesBySubject    과목별 계획 분 (미제출이면 비어 있다)
 */
public record ExistingDailyStudy(
        LocalDate date,
        boolean checkedIn,
        LocalTime firstCheckInTime,
        Map<String, Integer> studyMinutesBySubject,
        boolean planSubmitted,
        Map<String, Integer> plannedMinutesBySubject) {

    public ExistingDailyStudy {
        studyMinutesBySubject = Map.copyOf(studyMinutesBySubject);
        plannedMinutesBySubject = Map.copyOf(plannedMinutesBySubject);
    }

    public int studyMinutes() {
        return studyMinutesBySubject.values().stream().mapToInt(Integer::intValue).sum();
    }

    public int plannedMinutes() {
        return plannedMinutesBySubject.values().stream().mapToInt(Integer::intValue).sum();
    }
}
