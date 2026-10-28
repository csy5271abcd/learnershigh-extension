package com.learnershigh.extension.studentcare.service;

import static org.assertj.core.api.Assertions.*;
import com.learnershigh.extension.common.integration.learnershigh.*;
import com.learnershigh.extension.studentcare.dto.CareWeeklyReview.Attendance;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class CareWeeklyReviewsTest {
    private static final LocalDate AS_OF = LocalDate.of(2026, 10, 24);
    @Test void missingDaysStayNullWhileScheduledZeroAndUnknownScheduleKeepDistinctStates() {
        var zero = new ExistingDailyStudy(AS_OF, false, null, Map.of(), false, Map.of(), true, true);
        var unknown = new ExistingDailyStudy(AS_OF.minusDays(1), false, null, Map.of(), false, Map.of(), null, true);
        var unavailable = new ExistingDailyStudy(AS_OF.minusDays(2), false, null, Map.of(), false, Map.of(), true, false);
        var review = CareWeeklyReviews.build(List.of(zero, unknown, unavailable), AS_OF);
        assertThat(review.days()).hasSize(7);
        assertThat(review.days().get(4).minutes()).isNull();
        assertThat(review.days().get(4).attendance()).isEqualTo(Attendance.UNKNOWN);
        assertThat(review.days().get(5).attendance()).isEqualTo(Attendance.UNKNOWN);
        assertThat(review.days().get(5).minutes()).isZero();
        assertThat(review.days().get(6).attendance()).isEqualTo(Attendance.ABSENT);
        assertThat(review.current().studyMinutes()).isZero();
        assertThat(review.current().recordedDays()).isEqualTo(2);
        assertThat(review.current().scheduledAbsenceDays()).isEqualTo(1);
        assertThat(review.baseline().recordedDays()).isZero();
        assertThat(review.baseline().studyMinutes()).isNull();
        assertThat(review.weekdayBaseline()).allSatisfy(day -> assertThat(day.minutes()).isNull());
    }
    @Test void submissionAndStudyRemainIndependentAndOnlyPresentPositivePlansEnterExecution() {
        var one = new ExistingDailyStudy(AS_OF, true, LocalTime.of(19, 30), Map.of("수학", 120), false, Map.of(), true, true);
        var two = new ExistingDailyStudy(AS_OF.minusDays(1), true, LocalTime.of(19, 0), Map.of("수학", 120), true, Map.of("수학", 60), true, true);
        var off = new ExistingDailyStudy(AS_OF.minusDays(2), false, null, Map.of(), true, Map.of("수학", 30), false, true);
        var review = CareWeeklyReviews.build(List.of(one, two, off), AS_OF);
        assertThat(review.current().comparablePlanDays()).isEqualTo(1);
        assertThat(review.current().executionRate()).isEqualTo(200.0);
        assertThat(review.current().studyMinutes()).isEqualTo(240);
        assertThat(review.current().minutesPerAttendance()).isEqualTo(120.0);
        assertThat(review.current().averageStartMinutes()).isEqualTo(1155.0);
        assertThat(review.current().submissionDays()).isEqualTo(1);
        assertThat(review.current().submissionRecordedDays()).isEqualTo(2);
        assertThat(review.days().get(4).submission()).isEqualTo(com.learnershigh.extension.studentcare.dto.CareWeeklyReview.Submission.SUBMITTED);
        // 과목 계획/실제는 같은 입실·계획 제출 날짜만 비교한다. 별도 총 학습240분과는 다른 표본이다.
        assertThat(review.subjects().getFirst().actualMinutes()).isEqualTo(120);
        assertThat(review.subjects().getFirst().plannedMinutes()).isEqualTo(60);
    }
    @Test void duplicateDatesFailRatherThanDoubleCountingTotals() {
        var day = new ExistingDailyStudy(AS_OF, true, null, Map.of("수학", 1), false, Map.of());
        assertThatThrownBy(() -> CareWeeklyReviews.build(List.of(day, day), AS_OF))
                .isInstanceOf(ExistingIntegrationException.class);
    }
}
