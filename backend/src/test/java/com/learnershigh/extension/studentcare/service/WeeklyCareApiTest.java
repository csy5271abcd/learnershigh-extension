package com.learnershigh.extension.studentcare.service;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.learnershigh.extension.common.integration.learnershigh.*;
import com.learnershigh.extension.studentcare.controller.StudentCareController;
import com.learnershigh.extension.studentcare.repository.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** 실제 조회/계산 서비스와 HTTP 직렬화를 DB 없이 검증한다. */
class WeeklyCareApiTest {
    private final LocalDate asOf = LocalDate.of(2026, 10, 24);
    private ExistingStudyClient study;
    private ExistingStudentClient students;
    private MockMvc mvc;

    @BeforeEach void setup() {
        students = mock(ExistingStudentClient.class);
        study = mock(ExistingStudyClient.class);
        var cases = mock(CareCaseRepository.class);
        var settings = mock(CareSettingsRepository.class);
        var events = mock(CareEventRepository.class);
        when(students.findBranch("b")).thenReturn(Optional.of(new ExistingBranch("b", "강남점")));
        var student = new ExistingStudent("s", "b", "정상학생", "A");
        when(students.findStudents("b")).thenReturn(List.of(student));
        when(students.findStudent("b", "s")).thenReturn(Optional.of(student));
        when(settings.findById("b")).thenReturn(Optional.empty());
        when(cases.findWithEventsByBranchIdAndStudentIdAndStatus(any(), any(), any())).thenReturn(Optional.empty());
        when(study.findDailyStudy(eq("s"), any(), any())).thenAnswer(inv -> {
            LocalDate from = inv.getArgument(1), to = inv.getArgument(2);
            return from.datesUntil(to.plusDays(1)).map(date -> new ExistingDailyStudy(date, true,
                    LocalTime.of(19, 0), Map.of("수학", 120), true, Map.of("수학", 100))).toList();
        });
        var clock = Clock.fixed(Instant.parse("2026-10-25T03:00:00Z"), ZoneId.of("Asia/Seoul"));
        var reader = new StudentCareReader(clock, students, study, settings, cases);
        var query = new StudentCareQueryService(reader, cases, events);
        mvc = MockMvcBuilders.standaloneSetup(new StudentCareController(query, mock(StudentCareService.class)))
                .setControllerAdvice(new com.learnershigh.extension.common.error.GlobalExceptionHandler()).build();
    }

    @Test void boardContainsNormalStudentsAndUsesCompletedObservationDate() throws Exception {
        mvc.perform(get("/api/admin/student-care/board").param("branchId", "b"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.asOf").value("2026-10-24"))
                .andExpect(jsonPath("$.students", hasSize(1)))
                .andExpect(jsonPath("$.students[0].studentName").value("정상학생"));
    }

    @Test void detailIncludesDisjointPeriodsSevenDatesAndUncappedExecution() throws Exception {
        mvc.perform(get("/api/admin/student-care/students/s").param("branchId", "b"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.today").value("2026-10-25"))
                .andExpect(jsonPath("$.review.baselineFrom").value("2026-09-20"))
                .andExpect(jsonPath("$.review.baselineTo").value("2026-10-17"))
                .andExpect(jsonPath("$.review.days", hasSize(7)))
                .andExpect(jsonPath("$.review.days[0].excused").doesNotExist())
                .andExpect(jsonPath("$.review.days[0].date").value("2026-10-18"))
                .andExpect(jsonPath("$.review.current.executionRate").value(120.0))
                .andExpect(jsonPath("$.review.baseline.recordedDays").value(28))
                .andExpect(jsonPath("$.review.weekdayBaseline[0].samples").value(4));
        verify(study).findDailyStudy("s", asOf.minusDays(34), asOf);
    }

    @Test void branchMetricsContainsEveryStudentAndSevenMeanSampleCounts() throws Exception {
        mvc.perform(get("/api/admin/student-care/metrics").param("branchId", "b"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.students", hasSize(1)))
                .andExpect(jsonPath("$.students[0].student.studentId").value("s"))
                .andExpect(jsonPath("$.dailyAverages", hasSize(7)))
                .andExpect(jsonPath("$.dailyAverages[0].minutes").value(120.0))
                .andExpect(jsonPath("$.dailyAverages[0].samples").value(1));
    }

    @Test void branchMeanIncludesObservedZeroAndExcludesMissingStudentRecords() throws Exception {
        when(students.findStudents("b")).thenReturn(List.of(
                new ExistingStudent("s", "b", "정상학생", "A"),
                new ExistingStudent("zero", "b", "영", "A"),
                new ExistingStudent("unknown", "b", "미기록", "A")));
        when(study.findDailyStudy(eq("zero"), any(), any())).thenReturn(List.of(
                new ExistingDailyStudy(asOf.minusDays(6), false, null, Map.of(), false, Map.of())));
        when(study.findDailyStudy(eq("unknown"), any(), any())).thenReturn(List.of());
        mvc.perform(get("/api/admin/student-care/metrics").param("branchId", "b"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.students", hasSize(3)))
                .andExpect(jsonPath("$.dailyAverages[0].minutes").value(60.0))
                .andExpect(jsonPath("$.dailyAverages[0].samples").value(2))
                .andExpect(jsonPath("$.dailyAverages[1].minutes").value(120.0))
                .andExpect(jsonPath("$.dailyAverages[1].samples").value(1));
    }

    @Test void metricsFailureIs503RatherThanPartialOrEmptySuccess() throws Exception {
        when(study.findDailyStudy(any(), any(), any())).thenThrow(new ExistingIntegrationException("unavailable"));
        mvc.perform(get("/api/admin/student-care/metrics").param("branchId", "b"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("EXISTING_STUDY_DATA_UNAVAILABLE"));
    }

    @Test void emptyBranchIsEmptyAndInvalidBranchIs404() throws Exception {
        when(students.findStudents("b")).thenReturn(List.of());
        mvc.perform(get("/api/admin/student-care/metrics").param("branchId", "b"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.students", hasSize(0)))
                .andExpect(jsonPath("$.dailyAverages", hasSize(0)));
        mvc.perform(get("/api/admin/student-care/metrics").param("branchId", "other"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/student-care/metrics"))
                .andExpect(status().isBadRequest());
    }
}
