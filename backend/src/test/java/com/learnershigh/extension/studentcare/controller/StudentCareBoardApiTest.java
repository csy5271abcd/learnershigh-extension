package com.learnershigh.extension.studentcare.controller;

import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.ANCHOR;
import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.BRANCH;
import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.OTHER_BRANCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.common.integration.learnershigh.MockIntegrationSwitch;
import com.learnershigh.extension.common.time.AdjustableClock;
import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** 케어 보드 / 학생 상세 / 지점 (api-contract.md §65-1~3). 실제 MySQL + Mock Existing 시나리오. */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentCareBoardApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    AdjustableClock clock;

    @Autowired
    MockIntegrationSwitch integration;

    @BeforeEach
    void setUp() {
        StudentCareApiTestSupport.reset(jdbc, clock, integration);
    }

    @Test
    void branchesListStudentCounts() throws Exception {
        mvc.perform(get("/api/admin/student-care/branches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].branchId", contains("br_gangnam", "br_bundang")))
                .andExpect(jsonPath("$.items[0].name").value("러너스하이 강남점"))
                .andExpect(jsonPath("$.items[0].studentCount").value(10));
    }

    @Test
    void boardGroupsFlaggedAndDeferredStudents() throws Exception {
        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.asOf").value("2026-09-30"))
                .andExpect(jsonPath("$.branch.name").value("러너스하이 강남점"))
                .andExpect(jsonPath("$.needsCheck", hasSize(7)))
                .andExpect(jsonPath("$.needsCheck[0].studentName").value("김서준"))
                .andExpect(jsonPath("$.needsCheck[0].signals[*].label", contains("연속 결석", "계획 미제출")))
                .andExpect(jsonPath("$.needsCheck[0].signals[0].summary").value("4일째 결석"))
                .andExpect(jsonPath("$.needsCheck[*].studentName", containsInAnyOrder(
                        "김서준", "최학생", "한유진", "정예준", "윤서연", "이학생", "오시윤")))
                .andExpect(jsonPath("$.inAdjustment", hasSize(0)))
                .andExpect(jsonPath("$.deferred[0].studentName").value("장하준"))
                .andExpect(jsonPath("$.deferred[0].validDays").value(2));
    }

    @Test
    void needsCheckIsOrderedBySignalCountThenName() throws Exception {
        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.needsCheck[*].studentName", contains(
                        "김서준", "오시윤", "윤서연", "이학생", "정예준", "최학생", "한유진")))
                .andExpect(jsonPath("$.needsCheck[0].signals", hasSize(2)))
                .andExpect(jsonPath("$.needsCheck[1].signals", hasSize(1)));
    }

    @Test
    void inAdjustmentIsOrderedByRecheckDueThenRecheckDate() throws Exception {
        startAdjustment("stu_005", "2026-10-07");
        startAdjustment("stu_003", "2026-10-02");
        startAdjustment("stu_007", "2026-10-05");

        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.inAdjustment[*].studentId", contains("stu_003", "stu_007", "stu_005")))
                .andExpect(jsonPath("$.inAdjustment[*].recheckDue", contains(false, false, false)));

        clock.setDate(ANCHOR.plusDays(5));
        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.inAdjustment[*].studentId", contains("stu_003", "stu_007", "stu_005")))
                .andExpect(jsonPath("$.inAdjustment[*].recheckDue", contains(true, true, false)))
                .andExpect(jsonPath("$.inAdjustment[*].recheckDate", contains("2026-10-02", "2026-10-05", "2026-10-07")));
    }

    @Test
    void boardWithNobodyFlaggedIsAnEmptyListNotAnError() throws Exception {
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", OTHER_BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"absenceDays":14,"planMissingDays":7,"studyDropPercent":90,"executionRatePercent":10,
                                 "subjectShareGapPoints":60,"startShiftMinutes":300,"minValidDays":1,"cooldownDays":7}"""))
                .andExpect(status().isOk());

        mvc.perform(get("/api/admin/student-care/board").param("branchId", OTHER_BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.needsCheck", hasSize(0)))
                .andExpect(jsonPath("$.inAdjustment", hasSize(0)))
                .andExpect(jsonPath("$.deferred", hasSize(0)));
    }

    @Test
    void integrationFailureOnDetailIs503AndChangesNothing() throws Exception {
        startAdjustment("stu_005", "2026-10-07");
        String before = StudentCareApiTestSupport.snapshot(jdbc);
        integration.setStudyDataAvailable(false);

        mvc.perform(get("/api/admin/student-care/students/stu_005").param("branchId", BRANCH))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("EXISTING_STUDY_DATA_UNAVAILABLE"));

        assertThat(StudentCareApiTestSupport.snapshot(jdbc)).isEqualTo(before);
    }

    private void startAdjustment(String studentId, String recheckDate) throws Exception {
        mvc.perform(post("/api/admin/student-care/cases").contentType(MediaType.APPLICATION_JSON).content("""
                        {"branchId":"br_gangnam","studentId":"%s","channel":"CALL","reason":"ADJUSTMENT_NEEDED",
                         "recheckDate":"%s"}"""
                        .formatted(studentId, recheckDate)))
                .andExpect(status().isCreated());
    }

    @Test
    void detailHasEvidenceAndChart() throws Exception {
        mvc.perform(get("/api/admin/student-care/students/stu_005").param("branchId", BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student.studentName").value("윤서연"))
                .andExpect(jsonPath("$.signals[0].type").value("SUBJECT_SHARE"))
                .andExpect(jsonPath("$.signals[0].label").value("과목 편중"))
                .andExpect(jsonPath("$.signals[0].summary").value("수학 계획 30% → 실제 12%"))
                .andExpect(jsonPath("$.signals[0].evidence[0]").value("수학 계획 30% → 실제 12% · 전체 공부 시간은 평소 수준"))
                .andExpect(jsonPath("$.signals[0].question").doesNotExist())
                .andExpect(jsonPath("$.dailyStudy", hasSize(14)))
                .andExpect(jsonPath("$.dailyStudy[0].date").value("2026-09-17"))
                .andExpect(jsonPath("$.usualDailyMinutes").isNumber())
                .andExpect(jsonPath("$.planSuggestion").doesNotExist())
                .andExpect(jsonPath("$.deferred").value(nullValue()))
                .andExpect(jsonPath("$.activeCase").value(nullValue()));
    }

    @Test
    void detailOfDeferredStudentHasNoSignals() throws Exception {
        mvc.perform(get("/api/admin/student-care/students/stu_008").param("branchId", BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.signals", hasSize(0)))
                .andExpect(jsonPath("$.deferred.validDays").value(2));
    }

    @Test
    void unknownBranchAndStudentAre404() throws Exception {
        mvc.perform(get("/api/admin/student-care/board").param("branchId", "br_none"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BRANCH_NOT_FOUND"));
        mvc.perform(get("/api/admin/student-care/students/stu_101").param("branchId", BRANCH))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("STUDENT_NOT_FOUND"));
    }

    /** 학생 상세 / 학생 기록도 지점부터 확인한다: 없는 지점은 학생이 있어도 BRANCH_NOT_FOUND (api-contract.md §65-3, 65-8). */
    @Test
    void detailAndHistoryWithUnknownBranchAre404BranchNotFound() throws Exception {
        for (String path : new String[] {"/api/admin/student-care/students/stu_005",
                "/api/admin/student-care/students/stu_005/history"}) {
            mvc.perform(get(path).param("branchId", "br_none"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("BRANCH_NOT_FOUND"));
        }
    }

    @Test
    void missingBranchIdIsValidationError() throws Exception {
        mvc.perform(get("/api/admin/student-care/board"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value("branchId"));
    }

    @Test
    void integrationFailureIsNotAnEmptyBoard() throws Exception {
        integration.setStudyDataAvailable(false);

        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("EXISTING_STUDY_DATA_UNAVAILABLE"));
    }
}
