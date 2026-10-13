package com.learnershigh.extension.common.integration.learnershigh.phapi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.common.integration.learnershigh.ExistingIntegrationException;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** Contract Test (integration-boundary.md §43): phapi 표본 응답 → Integration Contract. */
class PhapiStudyMapperTest {

    private static final String SAMPLES = "/learnershigh/phapi/v2/";
    private static final LocalDate FROM = LocalDate.of(2026, 9, 28);
    private static final LocalDate TO = LocalDate.of(2026, 9, 30);

    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void mapsStudentsWithGroupAsClassName() {
        List<ExistingStudent> students = PhapiStudyMapper.toStudents("501", students());

        assertThat(students).containsExactly(
                new ExistingStudent("1001", "501", "김서준", "고3 A반"),
                new ExistingStudent("1002", "501", "최학생", "고3 A반"),
                new ExistingStudent("1003", "501", "박민지", null));
    }

    @Test
    void readsNoPlanModeFromSecondDigitOfUserSvcFlag() {
        assertThat(students()).extracting(PhapiStudent::noPlanMode).containsExactly(false, true, false);
    }

    @Test
    void mapsCheckInAndSubjectMinutesPerDay() {
        List<ExistingDailyStudy> days = dailyStudyOf(1001, subjectStats());

        assertThat(days).extracting(ExistingDailyStudy::date)
                .containsExactly(FROM, FROM.plusDays(1), TO);

        ExistingDailyStudy first = days.getFirst();
        assertThat(first.checkedIn()).isTrue();
        assertThat(first.firstCheckInTime()).isEqualTo(LocalTime.of(18, 20, 5));
        // 같은 과목 코드의 item 2개(4,830초 + 2,700초)를 합친 뒤 분으로 내린다. 0분 과목은 빠진다.
        assertThat(first.studyMinutesBySubject()).isEqualTo(Map.of("수학(미적분)", 125, "국어", 50));
        assertThat(first.planSubmitted()).isTrue();
        assertThat(first.plannedMinutesBySubject()).isEqualTo(Map.of("수학(미적분)", 120, "국어", 60, "영어단어", 40));

        assertThat(days.get(1).planSubmitted()).as("컨펌완료도 제출로 본다").isTrue();
        assertThat(days.get(1).studyMinutes()).isEqualTo(105);
    }

    @Test
    void reportWithoutLoginIsAbsentAndUnsubmittedPlanHasNoPlannedMinutes() {
        ExistingDailyStudy last = dailyStudyOf(1001, subjectStats()).getLast();

        assertThat(last.checkedIn()).isFalse();
        assertThat(last.firstCheckInTime()).isNull();
        assertThat(last.planSubmitted()).isFalse();
        assertThat(last.plannedMinutesBySubject()).isEmpty();
        assertThat(last.studyMinutes()).isZero();
    }

    @Test
    void dateWithoutReportRowIsAbsent() {
        ExistingDailyStudy last = dailyStudyOf(1002, List.of()).getLast();

        assertThat(last.date()).isEqualTo(TO);
        assertThat(last.checkedIn()).isFalse();
        assertThat(last.planSubmitted()).isFalse();
    }

    @Test
    void leftJoinRowWithoutReportIsIgnored() {
        assertThat(reports().reportsOf(1003)).isEmpty();
        assertThat(dailyStudyOf(1003, List.of())).hasSize(3).noneMatch(ExistingDailyStudy::checkedIn);
    }

    @Test
    void parsesHoursBeyondTwoDigits() {
        assertThat(PhapiStudyMapper.parseHms("120:05:09")).isEqualTo(120 * 3600 + 5 * 60 + 9);
        assertThat(PhapiStudyMapper.parseHms(null)).isZero();
    }

    @Test
    void unexpectedTimeFormatIsIntegrationFailure() {
        assertThatThrownBy(() -> PhapiStudyMapper.parseHms("1h 20m"))
                .isInstanceOf(ExistingIntegrationException.class);
    }

    private List<ExistingDailyStudy> dailyStudyOf(long studentId, List<PhapiSubjectStudyStat> stats) {
        return PhapiStudyMapper.toDailyStudy(FROM, TO, reports().reportsOf(studentId), stats);
    }

    private List<PhapiStudent> students() {
        return read("branches/select_students.json", new TypeReference<>() {
        });
    }

    private PhapiStudyReportsPeriodResponse reports() {
        return read("branches/select_study_reports_period.json", new TypeReference<>() {
        });
    }

    private List<PhapiSubjectStudyStat> subjectStats() {
        return read("items/stats/subject_study_stats_PDFBYDAY.json", new TypeReference<>() {
        });
    }

    private <T> T read(String path, TypeReference<T> type) {
        try (InputStream in = getClass().getResourceAsStream(SAMPLES + path)) {
            assertThat(in).as(path).isNotNull();
            return json.readValue(in, type);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
