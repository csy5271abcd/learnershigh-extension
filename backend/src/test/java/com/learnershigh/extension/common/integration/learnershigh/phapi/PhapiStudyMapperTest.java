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
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Contract Test (integration-boundary.md §43): phapi 표본 응답 → Integration Contract.
 * 형식이 깨진 응답(Inline JSON / Record)은 모두 ExistingIntegrationException(→ 503)이어야 한다.
 */
class PhapiStudyMapperTest {

    private static final String SAMPLES = "/learnershigh/phapi/v2/";
    private static final LocalDate FROM = LocalDate.of(2026, 9, 28);
    private static final LocalDate TO = LocalDate.of(2026, 9, 30);

    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void missingReportAndStatisticsRemainUnavailableWithUnknownSchedule() {
        ExistingDailyStudy day = PhapiStudyMapper.toDailyStudy(FROM, FROM, List.of(), List.of()).getFirst();

        assertThat(day.recordAvailable()).isFalse();
        assertThat(day.scheduled()).isNull();
    }

    @Test
    void reportWithoutStudyStillProvidesAnAvailableZeroRecord() {
        ExistingDailyStudy day = PhapiStudyMapper.toDailyStudy(FROM, FROM,
                List.of(report(FROM.toString(), null, "제출전")), List.of()).getFirst();

        assertThat(day.recordAvailable()).isTrue();
        assertThat(day.studyMinutes()).isZero();
        assertThat(day.scheduled()).isNull();
    }

    @Test
    void zeroStatisticsWithoutReportStillProvideAnAvailableRecord() {
        ExistingDailyStudy day = PhapiStudyMapper.toDailyStudy(FROM, FROM, List.of(),
                List.of(stat("수학", "00:00:00", "00:00:00", FROM.toString()))).getFirst();

        assertThat(day.recordAvailable()).isTrue();
        assertThat(day.studyMinutes()).isZero();
        assertThat(day.scheduled()).isNull();
    }

    @Test
    void mapsOnlyActiveStudentsWithGroupAsClassName() {
        List<ExistingStudent> students = PhapiStudyMapper.toStudents("501", students());

        // 표본에는 학생이 아닌 사용자(role_id=3, 2001)와 INACTIVE(1004) / DELETED(1005) 학생도 있다.
        assertThat(students()).extracting(PhapiStudent::id).contains(2001L, 1004L, 1005L);
        assertThat(students).containsExactly(
                new ExistingStudent("1001", "501", "김서준", "고3 A반"),
                new ExistingStudent("1002", "501", "최학생", "고3 A반"),
                new ExistingStudent("1003", "501", "박민지", null));
    }

    @Test
    void readsNoPlanModeFromSecondDigitOfUserSvcFlag() {
        assertThat(students()).extracting(PhapiStudent::noPlanMode)
                .containsExactly(false, true, false, false, false, false);
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
        assertThat(PhapiStudyMapper.parseHms("00:00:00")).isZero();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "1h 20m", "-01:00:00", "+01:00:00", "01:-5:00", "01:+5:00", "01:60:00",
            "01:00:60", "1:2:3", "01:00", "01:00:00:00", "１:00:00", "9999999:00:00"})
    void unexpectedTimeFormatIsIntegrationFailure(String value) {
        assertThatThrownBy(() -> PhapiStudyMapper.parseHms(value))
                .isInstanceOf(ExistingIntegrationException.class);
    }

    // ---- 형식 오류 (PhapiStudyMapper 클래스 설명의 정책): NPE / Jackson 예외가 아니라 연동 실패(503)다 ----

    @Test
    void subjectRowsUnderOneMinuteAreDropped() {
        List<ExistingDailyStudy> days = PhapiStudyMapper.toDailyStudy(FROM, FROM, reports().reportsOf(1001), List.of(
                stat("국어", "00:00:59", "00:00:59", "2026-09-28"),
                stat("수학", "00:01:00", "00:01:59", "2026-09-28")));

        assertThat(days.getFirst().studyMinutesBySubject()).isEqualTo(Map.of("수학", 1));
        assertThat(days.getFirst().plannedMinutesBySubject()).isEqualTo(Map.of("수학", 1));
    }

    @Test
    void plannedMinutesAreEmptyOnDaysWithoutSubmittedPlan() {
        // 9/30 report는 plan_status 제출전, 9/29에는 report가 없는 학생(1003)의 날. 과목 행에 계획 시간이 있어도 비운다.
        List<PhapiSubjectStudyStat> stats = List.of(stat("국어", "01:00:00", "00:30:00", "2026-09-30"));
        assertThat(PhapiStudyMapper.toDailyStudy(TO, TO, reports().reportsOf(1001), stats).getFirst())
                .satisfies(day -> {
                    assertThat(day.planSubmitted()).isFalse();
                    assertThat(day.plannedMinutesBySubject()).isEmpty();
                    assertThat(day.studyMinutesBySubject()).isEqualTo(Map.of("국어", 30));
                });
        assertThat(PhapiStudyMapper.toDailyStudy(TO, TO, List.of(), stats).getFirst().plannedMinutesBySubject())
                .isEmpty();
    }

    /**
     * 같은 날짜 안에서 범위를 넘는 분 / 초. 느슨하게 해석하면 다음 시각(10:75 → 11:15)으로 넘어가 날짜 검사로도 걸리지 않으므로
     * 해석 단계(ResolverStyle.STRICT)에서 막혀야 한다.
     */
    @ParameterizedTest
    @ValueSource(strings = {"2026-09-28 10:75:00", "2026-09-28 10:00:61"})
    void outOfRangeMinuteOrSecondOnTheSameDateIsIntegrationFailure(String loginFirst) {
        assertThatThrownBy(() -> PhapiStudyMapper.toDailyStudy(FROM, FROM,
                List.of(report("2026-09-28", loginFirst, "제출완료")), List.of()))
                .isInstanceOf(ExistingIntegrationException.class);
    }

    @Test
    void unparsableLoginFirstIsIntegrationFailureNotAbsence() {
        for (String loginFirst : new String[] {"", "2026-09-28T18:20:05", "2026-09-28 25:00:00", "2026-02-30 18:00:00",
                "어제 저녁"}) {
            assertThatThrownBy(() -> PhapiStudyMapper.toDailyStudy(FROM, FROM,
                    List.of(report("2026-09-28", loginFirst, "제출완료")), List.of()))
                    .as(loginFirst)
                    .isInstanceOf(ExistingIntegrationException.class);
        }
    }

    @Test
    void loginFirstOnAnotherDateThanReportDateIsIntegrationFailure() {
        // 시간 기준 UNCONFIRMED: 자정 이후 입실이 다음 날짜로 기록되는 경우를 추측하지 않는다.
        assertThatThrownBy(() -> PhapiStudyMapper.toDailyStudy(FROM, FROM,
                List.of(report("2026-09-28", "2026-09-29 00:30:00", "제출완료")), List.of()))
                .isInstanceOf(ExistingIntegrationException.class);
        assertThatThrownBy(() -> PhapiStudyMapper.toDailyStudy(FROM, FROM,
                List.of(report("2026-09-28", "2026-09-27 23:59:59", "제출완료")), List.of()))
                .isInstanceOf(ExistingIntegrationException.class);
        assertThat(PhapiStudyMapper.toDailyStudy(FROM, FROM,
                List.of(report("2026-09-28", "2026-09-28 00:00:00", "제출완료")), List.of()).getFirst().firstCheckInTime())
                .isEqualTo(LocalTime.MIDNIGHT);
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026/09/28", "2026-9-28", "2026-09-31", "", "20260928"})
    void unparsableReportDateIsIntegrationFailure(String reportDate) {
        assertThatThrownBy(() -> PhapiStudyMapper.toDailyStudy(FROM, TO,
                List.of(report(reportDate, null, "제출전")), List.of()))
                .isInstanceOf(ExistingIntegrationException.class);
    }

    @Test
    void duplicateReportRowsForTheSameDateAreIntegrationFailure() {
        assertThatThrownBy(() -> PhapiStudyMapper.toDailyStudy(FROM, TO, List.of(
                report("2026-09-28", "2026-09-28 18:00:00", "제출완료"),
                report("2026-09-28", null, "제출전")), List.of()))
                .isInstanceOf(ExistingIntegrationException.class);
    }

    @Test
    void subjectRowWithoutNameOrDateOrTimeIsIntegrationFailure() {
        for (PhapiSubjectStudyStat broken : List.of(
                stat(null, "01:00:00", "01:00:00", "2026-09-28"),
                stat(" ", "01:00:00", "01:00:00", "2026-09-28"),
                stat("국어", "01:00:00", "01:00:00", null),
                stat("국어", "01:00:00", "01:00:00", "2026-13-01"),
                stat("국어", null, "01:00:00", "2026-09-28"),
                stat("국어", "01:00:00", "-00:10:00", "2026-09-28"))) {
            assertThatThrownBy(() -> PhapiStudyMapper.toDailyStudy(FROM, TO, List.of(), List.of(broken)))
                    .as(broken.toString())
                    .isInstanceOf(ExistingIntegrationException.class);
        }
        assertThatThrownBy(() -> PhapiStudyMapper.toDailyStudy(FROM, TO, List.of(), Arrays.asList((PhapiSubjectStudyStat) null)))
                .isInstanceOf(ExistingIntegrationException.class);
    }

    @Test
    void malformedStudentsAreIntegrationFailure() {
        for (String body : new String[] {
                "[{\"id\":1,\"role_id\":5,\"real_name\":null,\"status\":\"ACTIVE\"}]",
                "[{\"id\":1,\"role_id\":5,\"real_name\":\" \",\"status\":\"ACTIVE\"}]",
                "[{\"id\":null,\"role_id\":5,\"real_name\":\"학생\",\"status\":\"ACTIVE\"}]",
                "[{\"id\":1,\"real_name\":\"학생\",\"status\":\"ACTIVE\"}]",
                "[{\"id\":1,\"role_id\":5,\"real_name\":\"학생\"}]",
                "[null]"}) {
            List<PhapiStudent> students = PhapiJson.read(json, body, new TypeReference<>() {
            });
            assertThatThrownBy(() -> PhapiStudyMapper.toStudents("501", students))
                    .as(body)
                    .isInstanceOf(ExistingIntegrationException.class);
        }
        assertThatThrownBy(() -> PhapiStudyMapper.toStudents("501", null))
                .isInstanceOf(ExistingIntegrationException.class);
        // 학생이 아니거나 재원이 아니면 이름이 없어도 연동 실패가 아니다(읽지 않는다).
        assertThat(PhapiStudyMapper.toStudents("501", PhapiJson.read(json, """
                [{"id":9,"role_id":3,"real_name":null,"status":"ACTIVE"},
                 {"id":8,"role_id":5,"real_name":null,"status":"INACTIVE"}]""", new TypeReference<List<PhapiStudent>>() {
                }))).isEmpty();
    }

    @Test
    void malformedStudyReportsAreIntegrationFailure() {
        for (String body : new String[] {
                "{}",
                "{\"student_list\":null}",
                "{\"student_list\":[{\"user\":null,\"report\":{\"report_date\":\"2026-09-28\"}}]}",
                "{\"student_list\":[{\"user\":{\"id\":null},\"report\":{\"report_date\":\"2026-09-28\"}}]}",
                "{\"student_list\":[{\"user\":{\"id\":1001},\"report\":null}]}",
                "{\"student_list\":[null]}",
                // report_date가 없는데 입실 시각이 있다: LEFT JOIN 자리표시 행이 아니다.
                "{\"student_list\":[{\"user\":{\"id\":1001},\"report\":{\"report_date\":null,"
                        + "\"login_first\":\"2026-09-28 18:00:00\"}}]}",
                // 자리표시 행과 실제 report 행이 함께 온다.
                "{\"student_list\":[{\"user\":{\"id\":1001},\"report\":{\"report_date\":null}},"
                        + "{\"user\":{\"id\":1001},\"report\":{\"report_date\":\"2026-09-28\"}}]}"}) {
            PhapiStudyReportsPeriodResponse response = PhapiJson.read(json, body, new TypeReference<>() {
            });
            assertThatThrownBy(() -> response.reportsOf(1001))
                    .as(body)
                    .isInstanceOf(ExistingIntegrationException.class);
        }
    }

    @Test
    void nullCountsAndOtherStudentsRowsAreTolerated() {
        PhapiStudyReportsPeriodResponse response = PhapiJson.read(json, """
                {"student_list":[
                  {"user":{"id":1001},"report":{"report_date":"2026-09-28","login_first":null,"todo_count":null,
                   "done_count":null,"plan_status":"제출전"}},
                  {"user":{"id":1002},"report":{"report_date":null,"todo_count":null,"done_count":null}}]}""",
                new TypeReference<>() {
                });

        assertThat(response.reportsOf(1001)).singleElement()
                .satisfies(report -> assertThat(report.todoCount()).isNull());
        assertThat(response.reportsOf(1002)).isEmpty();
    }

    @Test
    void unreadableJsonIsIntegrationFailureNotJacksonException() {
        for (String body : new String[] {"", "not json", "{\"student_list\":\"oops\"}",
                "{\"student_list\":[{\"user\":{\"id\":\"abc\"}}]}",
                "{\"student_list\":[{\"user\":{\"id\":1},\"report\":{\"todo_count\":\"many\"}}]}", "null"}) {
            assertThatThrownBy(() -> PhapiJson.read(json, body, new TypeReference<PhapiStudyReportsPeriodResponse>() {
            }))
                    .as(body)
                    .isInstanceOf(ExistingIntegrationException.class);
        }
    }

    private static PhapiDailyReport report(String reportDate, String loginFirst, String planStatus) {
        return new PhapiDailyReport(reportDate, null, loginFirst, null, "00:00:00", "00:00:00", null, null,
                "귀가", planStatus, "제출완료");
    }

    private static PhapiSubjectStudyStat stat(String name, String plan, String study, String date) {
        return new PhapiSubjectStudyStat(name, plan, study, date);
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
