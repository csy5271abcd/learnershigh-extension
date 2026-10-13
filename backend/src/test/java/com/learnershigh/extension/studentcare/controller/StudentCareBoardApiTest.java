package com.learnershigh.extension.studentcare.controller;

import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.BRANCH;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.common.integration.learnershigh.MockIntegrationSwitch;
import com.learnershigh.extension.common.time.AdjustableClock;
import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
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
        StudentCareApiTestSupport.reset(jdbc, clock);
    }

    @AfterEach
    void tearDown() {
        integration.setStudyDataAvailable(true);
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
                .andExpect(jsonPath("$.needsCheck[0].signals[*].label", contains("연속 미입실", "계획 미제출 반복")))
                .andExpect(jsonPath("$.needsCheck[0].signals[0].summary").value("4일째 입실 기록 없음"))
                .andExpect(jsonPath("$.needsCheck[*].studentName", containsInAnyOrder(
                        "김서준", "최학생", "한유진", "정예준", "윤서연", "이학생", "오시윤")))
                .andExpect(jsonPath("$.inAdjustment", hasSize(0)))
                .andExpect(jsonPath("$.deferred[0].studentName").value("장하준"))
                .andExpect(jsonPath("$.deferred[0].validDays").value(2));
    }

    @Test
    void detailHasEvidenceQuestionChartAndSuggestion() throws Exception {
        mvc.perform(get("/api/admin/student-care/students/stu_005").param("branchId", BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student.studentName").value("윤서연"))
                .andExpect(jsonPath("$.signals[0].type").value("SUBJECT_SHARE"))
                .andExpect(jsonPath("$.signals[0].summary").value("계획한 수학 비중 30% → 최근 12%"))
                .andExpect(jsonPath("$.signals[0].evidence[0]").value("계획한 수학 비중 30% → 최근 12% (전체 학습량은 평소 수준)"))
                .andExpect(jsonPath("$.signals[0].question").value("의도한 시험 대비인지, 수학 항목이 너무 커서 미루고 있는지"))
                .andExpect(jsonPath("$.dailyStudy", hasSize(14)))
                .andExpect(jsonPath("$.dailyStudy[0].date").value("2026-09-17"))
                .andExpect(jsonPath("$.usualDailyMinutes").isNumber())
                .andExpect(jsonPath("$.planSuggestion.goal").value("수학 비중을 계획한 30% 가까이"))
                .andExpect(jsonPath("$.planSuggestion.action").value("큰 수학 항목을 30분씩 4회로 나누기"))
                .andExpect(jsonPath("$.planSuggestion.recheckDate").value("2026-10-07"))
                .andExpect(jsonPath("$.deferred").value(nullValue()))
                .andExpect(jsonPath("$.activeCase").value(nullValue()));
    }

    @Test
    void detailOfDeferredStudentHasNoSuggestion() throws Exception {
        mvc.perform(get("/api/admin/student-care/students/stu_008").param("branchId", BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.signals", hasSize(0)))
                .andExpect(jsonPath("$.deferred.validDays").value(2))
                .andExpect(jsonPath("$.planSuggestion").value(nullValue()));
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
