package com.learnershigh.extension.common.integration.learnershigh;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.Time;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import tools.jackson.databind.json.JsonMapper;

class DemoStudyDataStoreTest {

    private static final LocalDate AS_OF = LocalDate.of(2026, 10, 27);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final DemoStudyDataStore store = new DemoStudyDataStore(jdbc, JsonMapper.builder().build());

    @Test
    void mapsJsonAndNullableSourceScheduleWithoutTurningMissingIntoRecordedZero() throws Exception {
        ResultSet row = row(false, null, null, null);
        queryReturns(row);
        ExistingDailyStudy day = store.findDailyStudy("demo_s001", AS_OF, AS_OF).getFirst();
        assertThat(day.recordAvailable()).isFalse();
        assertThat(day.scheduled()).isNull();
        assertThat(day.firstCheckInTime()).isNull();
        assertThat(day.studyMinutesBySubject()).isEmpty();
        assertThat(day.plannedMinutesBySubject()).isEmpty();
    }

    @Test
    void mapsRecordedZeroAndSubjectMinutesFaithfully() throws Exception {
        ResultSet row = row(true, false, "{}", "{}");
        queryReturns(row);
        ExistingDailyStudy offDay = store.findDailyStudy("demo_s001", AS_OF, AS_OF).getFirst();
        assertThat(offDay.recordAvailable()).isTrue();
        assertThat(offDay.scheduled()).isFalse();
        assertThat(offDay.planSubmitted()).isFalse();
        assertThat(offDay.studyMinutes()).isZero();

        when(row.getBoolean("checked_in")).thenReturn(true);
        when(row.getBoolean("plan_submitted")).thenReturn(true);
        when(row.getTime("first_check_in_time")).thenReturn(Time.valueOf("19:35:00"));
        when(row.getString("study_minutes_by_subject")).thenReturn("{\"수학\":74,\"국어\":56}");
        when(row.getString("planned_minutes_by_subject")).thenReturn("{\"수학\":80,\"국어\":60}");
        ExistingDailyStudy attended = store.findDailyStudy("demo_s001", AS_OF, AS_OF).getFirst();
        assertThat(attended.studyMinutesBySubject()).isEqualTo(Map.of("수학", 74, "국어", 56));
        assertThat(attended.plannedMinutes()).isEqualTo(140);
        assertThat(attended.firstCheckInTime().toString()).isEqualTo("19:35");
    }

    @Test
    void corruptPersistedJsonIsAnErrorRatherThanEmptyStudy() throws Exception {
        queryReturns(row(true, true, "broken", "{}"));
        assertThatThrownBy(() -> store.findDailyStudy("demo_s001", AS_OF, AS_OF))
                .isInstanceOf(ExistingIntegrationException.class);
    }

    @Test
    void optionalStoreDelegatesWithoutSynthesizingUnknownStudentsOrDates() {
        DemoStudyDataStore demo = mock(DemoStudyDataStore.class);
        MockExistingStudentClient students = new MockExistingStudentClient();
        students.setDemoStudyDataStore(demo);
        when(demo.findStudent("demo_large", "stu_001")).thenReturn(Optional.empty());
        assertThat(students.findStudent("demo_large", "stu_001")).isEmpty();
        when(demo.findBranches()).thenReturn(List.of(new ExistingBranch("demo_large", "강남점 · 대형")));
        assertThat(students.findBranches()).extracting(ExistingBranch::branchId).containsExactly("demo_large");

        MockExistingStudyClient study = new MockExistingStudyClient(Clock.systemUTC(), AS_OF.toString());
        study.setDemoStudyDataStore(demo);
        when(demo.findDailyStudy("unknown", AS_OF, AS_OF)).thenReturn(List.of());
        assertThat(study.findDailyStudy("unknown", AS_OF, AS_OF)).isEmpty();
    }

    @Test
    void availabilitySwitchStillPrecedesDatabaseAccess() {
        DemoStudyDataStore demo = mock(DemoStudyDataStore.class);
        MockExistingStudyClient study = new MockExistingStudyClient(Clock.systemUTC(), AS_OF.toString());
        study.setDemoStudyDataStore(demo);
        study.setStudyDataAvailable(false);
        assertThatThrownBy(() -> study.findDailyStudy("demo_s001", AS_OF, AS_OF))
                .isInstanceOf(ExistingIntegrationException.class);
        verifyNoInteractions(demo);
    }

    private ResultSet row(boolean available, Boolean scheduled, String study, String planned) throws Exception {
        ResultSet row = mock(ResultSet.class);
        when(row.getDate("study_date")).thenReturn(Date.valueOf(AS_OF));
        when(row.getBoolean("record_available")).thenReturn(available);
        when(row.getBoolean("scheduled")).thenReturn(Boolean.TRUE.equals(scheduled));
        when(row.wasNull()).thenReturn(scheduled == null);
        when(row.getString("study_minutes_by_subject")).thenReturn(study);
        when(row.getString("planned_minutes_by_subject")).thenReturn(planned);
        return row;
    }

    private void queryReturns(ResultSet row) {
        doAnswer(invocation -> {
            RowMapper<ExistingDailyStudy> rowMapper = invocation.getArgument(1);
            return List.of(rowMapper.mapRow(row, 0));
        }).when(jdbc).query(anyString(), ArgumentMatchers.<RowMapper<ExistingDailyStudy>>any(),
                eq("demo_s001"), eq(AS_OF), eq(AS_OF));
    }
}
