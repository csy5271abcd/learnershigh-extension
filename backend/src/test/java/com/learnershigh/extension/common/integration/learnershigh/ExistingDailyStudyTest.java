package com.learnershigh.extension.common.integration.learnershigh;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Existing 과목 코드명은 자유 명명이라 Extension 저장 길이(100자)에 맞춘다. */
class ExistingDailyStudyTest {

    @Test
    void longSubjectNamesAreCappedAndMergedByCodePoint() {
        String prefix = "수".repeat(ExistingDailyStudy.SUBJECT_KEY_MAX - 1);
        String a = prefix + "학(미적분)";
        String b = prefix + "학(기하)";
        String emoji = "😀".repeat(ExistingDailyStudy.SUBJECT_KEY_MAX + 5);

        ExistingDailyStudy day = new ExistingDailyStudy(LocalDate.of(2026, 9, 30), true, null,
                Map.of(a, 30, b, 20, "국어", 10, emoji, 5), true, Map.of(a, 40));

        assertThat(day.studyMinutesBySubject()).containsOnlyKeys(prefix + "학", "국어", "😀".repeat(100));
        assertThat(day.studyMinutesBySubject().get(prefix + "학")).isEqualTo(50);
        assertThat(day.plannedMinutesBySubject()).containsExactly(Map.entry(prefix + "학", 40));
        assertThat(day.studyMinutes()).isEqualTo(65);
    }

    @Test
    void shortNamesAreKeptAsIs() {
        ExistingDailyStudy day = new ExistingDailyStudy(LocalDate.of(2026, 9, 30), true, null,
                Map.of("수학(미적분)", 30), false, Map.of());

        assertThat(day.studyMinutesBySubject()).containsExactly(Map.entry("수학(미적분)", 30));
    }
}
