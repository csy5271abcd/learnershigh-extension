package com.learnershigh.extension.common.integration.learnershigh;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class MockStudyScenariosTest {

    @Test
    void visualWeekIncludesIndependentAttendanceSubmissionAndMissingSource() {
        LocalDate anchor = LocalDate.of(2026, 10, 24);
        var week = IntStream.rangeClosed(-6, 0)
                .mapToObj(offset -> MockStudyScenarios.dayOf("stu_002", anchor.plusDays(offset), anchor, true)).toList();
        assertThat(week).anyMatch(d -> d.checkedIn() && !d.planSubmitted());
        assertThat(week).anyMatch(d -> !d.checkedIn() && d.planSubmitted());
        assertThat(IntStream.rangeClosed(-6, 0).mapToObj(offset ->
                MockStudyScenarios.dayOf("stu_008", anchor.plusDays(offset), anchor, true)))
                .anyMatch(d -> !d.recordAvailable())
                .anyMatch(d -> d.checkedIn() && d.firstCheckInTime() == null)
                .anyMatch(d -> d.checkedIn() && d.studyMinutes() == 0 && d.recordAvailable());
    }

    @Test
    void visualRecordsVaryByWeekdayWeekAndSubjectWithoutBreakingTimeConsistency() {
        LocalDate anchor = LocalDate.of(2026, 10, 24);
        var days = IntStream.rangeClosed(-34, 0).mapToObj(offset ->
                MockStudyScenarios.dayOf("stu_010", anchor.plusDays(offset), anchor, true)).toList();
        assertThat(days.stream().filter(ExistingDailyStudy::checkedIn)
                .map(d -> d.firstCheckInTime().getHour()).distinct().count()).isGreaterThanOrEqualTo(3);
        assertThat(days.stream().map(ExistingDailyStudy::plannedMinutesBySubject).distinct().count()).isGreaterThan(15);
        assertThat(days).anyMatch(d -> d.studyMinutes() > d.plannedMinutes() && d.planSubmitted());
        for (int student : new int[]{1,2,3,4,5,6,7,8,9,10,101,102,103}) {
            for (int offset = -34; offset <= 0; offset++) {
                String id = "stu_%03d".formatted(student);
                LocalDate date = anchor.plusDays(offset);
                ExistingDailyStudy day = MockStudyScenarios.dayOf(id, date, anchor, true);
                assertThat(day).isEqualTo(MockStudyScenarios.dayOf(id, date, anchor, true));
                assertThat(day.studyMinutes()).isNotNegative();
                if (!day.checkedIn()) assertThat(day.studyMinutes()).isZero();
                if (!day.planSubmitted()) assertThat(day.plannedMinutesBySubject()).isEmpty();
                if (day.firstCheckInTime() != null) {
                    assertThat(day.studyMinutes()).isLessThanOrEqualTo(1440 - day.firstCheckInTime().toSecondOfDay() / 60);
                }
            }
        }
    }

    @Test
    void movingAnchorKeepsWeekdayRoutinesAndIncludesIncompleteBaseline() {
        LocalDate saturday = LocalDate.of(2026, 10, 24), monday = saturday.plusDays(2);
        LocalDate sunday = saturday.plusDays(1);
        assertThat(MockStudyScenarios.dayOf("stu_010", sunday, monday, true).firstCheckInTime().getHour()).isEqualTo(11);
        assertThat(MockStudyScenarios.dayOf("stu_010", monday, monday, true).firstCheckInTime().getHour()).isEqualTo(18);
        assertThat(MockStudyScenarios.dayOf("stu_008", saturday.minusDays(19), saturday, true).recordAvailable()).isFalse();
        assertThat(MockStudyScenarios.dayOf("stu_008", saturday.minusDays(1), saturday, true).scheduled()).isNull();
    }

    @Test
    void visualExamplesIncludeMorningLongStudyAndExtremeSubjectShares() {
        LocalDate anchor = LocalDate.of(2026, 10, 24);
        ExistingDailyStudy morning = MockStudyScenarios.dayOf("stu_009", anchor, anchor, true);
        assertThat(morning.firstCheckInTime().getHour()).isEqualTo(10);
        assertThat(morning.studyMinutesBySubject().values().stream().mapToInt(Integer::intValue).sum()).isGreaterThan(500);
        ExistingDailyStudy extreme = MockStudyScenarios.dayOf("stu_005", anchor, anchor, true);
        double plan = extreme.plannedMinutesBySubject().values().stream().mapToInt(Integer::intValue).sum();
        double actual = extreme.studyMinutesBySubject().values().stream().mapToInt(Integer::intValue).sum();
        assertThat(extreme.plannedMinutesBySubject().get("수학") / plan * 100).isBetween(9.0, 11.0);
        assertThat(extreme.studyMinutesBySubject().get("수학") / actual * 100).isBetween(89.0, 91.0);
    }

    @Test
    void syntheticPresentAndAbsentDaysExplicitlyProvideScheduleAndRecords() {
        LocalDate anchor = LocalDate.of(2026, 10, 24);

        for (String studentId : new String[] {"stu_001", "stu_002", "stu_009"}) {
            ExistingDailyStudy day = MockStudyScenarios.dayOf(studentId, anchor, anchor);

            assertThat(day.scheduled()).as(studentId).isTrue();
            assertThat(day.recordAvailable()).as(studentId).isTrue();
        }
        assertThat(MockStudyScenarios.dayOf("stu_001", anchor, anchor).checkedIn()).isFalse();
        assertThat(MockStudyScenarios.dayOf("stu_009", anchor, anchor).checkedIn()).isTrue();
    }
}
