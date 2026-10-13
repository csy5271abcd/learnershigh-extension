package com.learnershigh.extension.studentcare.controller;

import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.ANCHOR;
import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.BRANCH;
import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.OTHER_BRANCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
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
import org.springframework.test.web.servlet.ResultActions;

/** 점검 비교 / 관리 종료 · 계속 관리 (api-contract.md §65-5, 65-6). */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentCareRecheckApiTest {

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

    private String startAdjustment(String studentId, String recheckDate) throws Exception {
        String body = """
                {"branchId":"br_gangnam","studentId":"%s","channel":"CALL","reason":"ADJUSTMENT_NEEDED",
                 "memo":"수학을 30분씩 나눠 하기로","recheckDate":"%s"}""".formatted(studentId, recheckDate);
        String response = mvc.perform(post("/api/admin/student-care/cases")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.caseId");
    }

    private ResultActions decide(String caseId, String body) throws Exception {
        return mvc.perform(post("/api/admin/student-care/cases/{caseId}/decisions", caseId).param("branchId", BRANCH)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    /** 재점검 후 종결하면 진행 중 표시(active_student_id)가 풀려, 쉬는 기간이 0일이면 같은 학생의 새 건을 바로 열 수 있다. */
    @Test
    void closingAfterRecheckFreesTheStudentForANewCase() throws Exception {
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"absenceDays":3,"planMissingDays":3,"studyDropPercent":40,"executionRatePercent":60,
                                 "subjectShareGapPoints":15,"startShiftMinutes":90,"minValidDays":3,"cooldownDays":0}"""))
                .andExpect(status().isOk());
        // stu_001은 anchor-3 ~ anchor+2 미입실이라 재점검일(anchor+1)에도 신호가 남아 있다.
        String caseId = startAdjustment("stu_001", "2026-10-01");
        clock.setDate(ANCHOR.plusDays(1));

        decide(caseId, "{\"decision\":\"CLOSE\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
        assertThat(jdbc.queryForObject("select active_student_id from care_case where id = ?", String.class, caseId))
                .isNull();

        String next = startAdjustment("stu_001", "2026-10-08");
        assertThat(next).isNotEqualTo(caseId);
        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.inAdjustment[*].caseId", contains(next)));
        assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isEqualTo(2);
    }

    @Test
    void decisionBeforeRecheckDateIsConflict() throws Exception {
        String caseId = startAdjustment("stu_005", "2026-10-07");
        clock.setDate(ANCHOR.plusDays(6));

        decide(caseId, "{\"decision\":\"CLOSE\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RECHECK_NOT_DUE"));
    }

    @Test
    void recheckComparesSameCriteriaThenTeacherCloses() throws Exception {
        String caseId = startAdjustment("stu_005", "2026-10-07");
        clock.setDate(ANCHOR.plusDays(7));

        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.asOf").value("2026-10-07"))
                .andExpect(jsonPath("$.inAdjustment[0].recheckDue").value(true));

        mvc.perform(get("/api/admin/student-care/students/stu_005").param("branchId", BRANCH))
                .andExpect(jsonPath("$.activeCase.recheckDue").value(true))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].label").value("과목 편중"))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].before").value(12))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].now").value(24))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].target").value(30))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].trend").value("IMPROVED"))
                .andExpect(jsonPath("$.activeCase.comparison.result").value("IMPROVED"))
                .andExpect(jsonPath("$.activeCase.comparison.resultLabel").value("좋아짐"));

        decide(caseId, "{\"decision\":\"CLOSE\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.closeType").value("AFTER_RECHECK"))
                .andExpect(jsonPath("$.closedOn").value("2026-10-07"))
                .andExpect(jsonPath("$.events[*].type",
                        contains("REASON_CONFIRMED", "ADJUSTMENT_STARTED", "RECHECKED", "CLOSED")))
                .andExpect(jsonPath("$.events[3].content").value("관리 종료"))
                .andExpect(jsonPath("$.events[2].content").value("점검 · 좋아짐 — 수학 비중 12% → 24%"));

        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.inAdjustment", hasSize(0)))
                .andExpect(jsonPath("$.needsCheck[*].studentId", not(hasItem("stu_005"))));

        decide(caseId, "{\"decision\":\"CLOSE\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STATE_TRANSITION"));
    }

    @Test
    void unchangedStudentShowsNoChangeAndContinues() throws Exception {
        String caseId = startAdjustment("stu_007", "2026-10-07");
        clock.setDate(ANCHOR.plusDays(7));

        mvc.perform(get("/api/admin/student-care/students/stu_007").param("branchId", BRANCH))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].trend").value("SAME"))
                .andExpect(jsonPath("$.activeCase.comparison.resultLabel").value("그대로"));

        decide(caseId, "{\"decision\":\"CONTINUE\"}")
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("INVALID_RECHECK_DATE"));

        decide(caseId, "{\"decision\":\"CONTINUE\",\"recheckDate\":\"2026-10-14\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_ADJUSTMENT"))
                .andExpect(jsonPath("$.recheckDate").value("2026-10-14"))
                .andExpect(jsonPath("$.recheckDue").value(false))
                .andExpect(jsonPath("$.events[-1].content").value("계속 관리 · 다음 점검 10월 14일"));
    }

    @Test
    void nextRecheckDateMustBeTomorrowUntilTwentyEightDaysLater() throws Exception {
        String caseId = startAdjustment("stu_007", "2026-10-07");
        clock.setDate(ANCHOR.plusDays(7));
        String before = StudentCareApiTestSupport.snapshot(jdbc);

        for (String invalid : java.util.List.of("2026-10-07", "2026-11-05")) {
            decide(caseId, "{\"decision\":\"CONTINUE\",\"recheckDate\":\"%s\"}".formatted(invalid))
                    .andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.code").value("INVALID_RECHECK_DATE"))
                    .andExpect(jsonPath("$.details.fields[0].field").value("recheckDate"));
        }
        // 실패한 결정은 학생 기록에 아무것도 남기지 않는다.
        assertThat(StudentCareApiTestSupport.snapshot(jdbc)).isEqualTo(before);

        decide(caseId, "{\"decision\":\"CONTINUE\",\"recheckDate\":\"2026-10-08\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recheckDate").value("2026-10-08"));
        clock.setDate(ANCHOR.plusDays(8));
        decide(caseId, "{\"decision\":\"CONTINUE\",\"recheckDate\":\"2026-10-09\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recheckDate").value("2026-10-09"));
    }

    @Test
    void attendanceSignalsHaveNoTargetInBaselineAndComparison() throws Exception {
        String caseId = startAdjustment("stu_002", "2026-10-07");
        mvc.perform(get("/api/admin/student-care/students/stu_002").param("branchId", BRANCH))
                .andExpect(jsonPath("$.activeCase.caseId").value(caseId))
                .andExpect(jsonPath("$.activeCase.baseline[0].type").value("PLAN_MISSING"))
                .andExpect(jsonPath("$.activeCase.baseline[0].value").value(4))
                .andExpect(jsonPath("$.activeCase.baseline[0].target").value(org.hamcrest.Matchers.nullValue()));

        clock.setDate(ANCHOR.plusDays(7));
        mvc.perform(get("/api/admin/student-care/students/stu_002").param("branchId", BRANCH))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].before").value(4))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].now").value(0))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].target").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].trend").value("IMPROVED"));
    }

    @Test
    void startAdjustmentAcceptsTomorrowAsRecheckDate() throws Exception {
        startAdjustment("stu_005", "2026-10-01");
    }

    @Test
    void historyKeepsEveryEventTypeNewestFirst() throws Exception {
        String caseId = startAdjustment("stu_007", "2026-10-07");
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/notes", caseId).param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"channel\":\"MEETING\",\"content\":\"면담\"}"))
                .andExpect(status().isCreated());
        clock.setDate(ANCHOR.plusDays(7));
        decide(caseId, "{\"decision\":\"CONTINUE\",\"recheckDate\":\"2026-10-14\"}").andExpect(status().isOk());
        clock.setDate(ANCHOR.plusDays(14));
        decide(caseId, "{\"decision\":\"CONTINUE\",\"recheckDate\":\"2026-10-21\"}").andExpect(status().isOk());
        clock.setDate(ANCHOR.plusDays(21));
        decide(caseId, "{\"decision\":\"CLOSE\"}").andExpect(status().isOk());

        mvc.perform(get("/api/admin/student-care/students/stu_007/history").param("branchId", BRANCH))
                .andExpect(jsonPath("$.items[*].type", contains("CLOSED", "RECHECKED", "CONTINUED", "RECHECKED",
                        "CONTINUED", "RECHECKED", "NOTE", "ADJUSTMENT_STARTED", "REASON_CONFIRMED")))
                .andExpect(jsonPath("$.items[*].occurredOn", contains("2026-10-21", "2026-10-21", "2026-10-14",
                        "2026-10-14", "2026-10-07", "2026-10-07", "2026-09-30", "2026-09-30", "2026-09-30")))
                .andExpect(jsonPath("$.items[2].content").value("계속 관리 · 다음 점검 10월 21일"))
                .andExpect(jsonPath("$.items[6].content").value("상담 · 면담 — 면담"));
    }

    @Test
    void decisionsAndNotesAreScopedToTheBranch() throws Exception {
        String caseId = startAdjustment("stu_005", "2026-10-07");
        clock.setDate(ANCHOR.plusDays(7));
        String before = StudentCareApiTestSupport.snapshot(jdbc);

        mvc.perform(post("/api/admin/student-care/cases/{caseId}/decisions", caseId).param("branchId", OTHER_BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"CLOSE\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CARE_CASE_NOT_FOUND"));
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/notes", caseId).param("branchId", OTHER_BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"channel\":\"CALL\",\"content\":\"메모\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CARE_CASE_NOT_FOUND"));
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/decisions", caseId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"CLOSE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("branchId"));
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/notes", caseId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"channel\":\"CALL\",\"content\":\"메모\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("branchId"));

        assertThat(StudentCareApiTestSupport.snapshot(jdbc)).isEqualTo(before);
    }

    @Test
    void integrationFailureOnDecisionIs503AndChangesNothing() throws Exception {
        String caseId = startAdjustment("stu_005", "2026-10-07");
        clock.setDate(ANCHOR.plusDays(7));
        String before = StudentCareApiTestSupport.snapshot(jdbc);
        integration.setStudyDataAvailable(false);

        decide(caseId, "{\"decision\":\"CLOSE\"}")
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("EXISTING_STUDY_DATA_UNAVAILABLE"));
        decide(caseId, "{\"decision\":\"CONTINUE\",\"recheckDate\":\"2026-10-14\"}")
                .andExpect(status().isServiceUnavailable());

        assertThat(StudentCareApiTestSupport.snapshot(jdbc)).isEqualTo(before);
        assertThat(jdbc.queryForObject("select status from care_case where id = ?", String.class, caseId))
                .isEqualTo("IN_ADJUSTMENT");
    }

    @Test
    void reviseIsNoLongerADecision() throws Exception {
        String caseId = startAdjustment("stu_003", "2026-10-03");
        clock.setDate(ANCHOR.plusDays(3));

        decide(caseId, "{\"decision\":\"REVISE\",\"recheckDate\":\"2026-10-10\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value("decision"));
    }

    @Test
    void unknownCaseIs404() throws Exception {
        decide("care_none", "{\"decision\":\"CLOSE\"}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CARE_CASE_NOT_FOUND"));
    }
}
