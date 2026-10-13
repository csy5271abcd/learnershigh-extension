package com.learnershigh.extension.common.integration.learnershigh;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;

class MockExistingStudyClientTest {

    private static final LocalDate ANCHOR = LocalDate.of(2026, 9, 30);

    private final MockExistingStudyClient client =
            new MockExistingStudyClient(Clock.systemUTC(), ANCHOR.toString());

    @Test
    void returnsEveryDateInRangeInOrder() {
        List<ExistingDailyStudy> days = client.findDailyStudy("stu_009", ANCHOR.minusDays(13), ANCHOR);

        assertThat(days).hasSize(14);
        assertThat(days.getFirst().date()).isEqualTo(ANCHOR.minusDays(13));
        assertThat(days.getLast().date()).isEqualTo(ANCHOR);
    }

    @Test
    void sameStudentAndDateAlwaysReturnSameRecord() {
        assertThat(client.findDailyStudy("stu_003", ANCHOR, ANCHOR))
                .isEqualTo(client.findDailyStudy("stu_003", ANCHOR, ANCHOR));
    }

    @Test
    void absentDayHasNoCheckInNoStudyAndNoPlan() {
        ExistingDailyStudy day = client.findDailyStudy("stu_001", ANCHOR, ANCHOR).getFirst();

        assertThat(day.checkedIn()).isFalse();
        assertThat(day.firstCheckInTime()).isNull();
        assertThat(day.studyMinutes()).isZero();
        assertThat(day.planSubmitted()).isFalse();
        assertThat(day.plannedMinutes()).isZero();
    }

    @Test
    void subjectMinutesAddUpToDailyTotal() {
        ExistingDailyStudy day = client.findDailyStudy("stu_005", ANCHOR, ANCHOR).getFirst();

        assertThat(day.studyMinutesBySubject()).containsOnlyKeys("국어", "수학", "영어", "탐구");
        assertThat(day.studyMinutesBySubject().get("수학") * 100.0 / day.studyMinutes()).isBetween(11.0, 13.0);
    }

    @Test
    void anchorDefaultsToClockToday() {
        Clock clock = Clock.fixed(ANCHOR.atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant(), ZoneId.of("Asia/Seoul"));
        MockExistingStudyClient defaultAnchor = new MockExistingStudyClient(clock, "");

        assertThat(defaultAnchor.findDailyStudy("stu_001", ANCHOR, ANCHOR).getFirst().checkedIn()).isFalse();
    }

    @Test
    void failsInsteadOfReturningEmptyWhenSwitchedOff() {
        client.setStudyDataAvailable(false);

        assertThatThrownBy(() -> client.findDailyStudy("stu_001", ANCHOR, ANCHOR))
                .isInstanceOf(ExistingIntegrationException.class);
    }
}
