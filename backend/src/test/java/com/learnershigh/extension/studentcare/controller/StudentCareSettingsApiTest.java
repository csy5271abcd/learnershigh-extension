package com.learnershigh.extension.studentcare.controller;

import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.ANCHOR;
import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.BRANCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
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

/** 기준값 / 지점 요약 (api-contract.md §65-9, 65-10). */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentCareSettingsApiTest {

    static final String SETTINGS = """
            {"absenceDays":%d,"planMissingDays":3,"studyDropPercent":40,"executionRatePercent":60,
             "subjectShareGapPoints":15,"startShiftMinutes":90,"minValidDays":3,"cooldownDays":7}""";

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
    void defaultsWhenNothingSaved() throws Exception {
        mvc.perform(get("/api/admin/student-care/settings").param("branchId", BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.absenceDays").value(3))
                .andExpect(jsonPath("$.studyDropPercent").value(40))
                .andExpect(jsonPath("$.cooldownDays").value(7));
    }

    @Test
    void responsesCarryTheAllowedRangeOfEveryKey() throws Exception {
        String[][] expected = {
                {"absenceDays", "2", "14"}, {"planMissingDays", "1", "7"}, {"studyDropPercent", "10", "90"},
                {"executionRatePercent", "10", "100"}, {"subjectShareGapPoints", "5", "60"},
                {"startShiftMinutes", "30", "300"}, {"minValidDays", "1", "7"}, {"cooldownDays", "0", "30"}};
        for (var request : java.util.List.of(
                get("/api/admin/student-care/settings").param("branchId", BRANCH),
                put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content(SETTINGS.formatted(5)))) {
            var result = mvc.perform(request).andExpect(status().isOk())
                    .andExpect(jsonPath("$.ranges.*", org.hamcrest.Matchers.hasSize(8)));
            for (String[] range : expected) {
                result.andExpect(jsonPath("$.ranges." + range[0] + ".min").value(Integer.parseInt(range[1])))
                        .andExpect(jsonPath("$.ranges." + range[0] + ".max").value(Integer.parseInt(range[2])));
            }
        }
    }

    @Test
    void minValidDaysDecidesWhoIsDeferred() throws Exception {
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SETTINGS.formatted(3).replace("\"minValidDays\":3", "\"minValidDays\":1")))
                .andExpect(status().isOk());

        // stu_008(유효 학습일 2일)은 판단 보류가 아니라 학습량 신호로 올라온다.
        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.deferred", org.hamcrest.Matchers.hasSize(0)))
                .andExpect(jsonPath("$.needsCheck[?(@.studentId == 'stu_008')].signals[*].type",
                        org.hamcrest.Matchers.hasItem("STUDY_DROP")));
    }

    @Test
    void savedSettingsChangeTheBoard() throws Exception {
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content(SETTINGS.formatted(5)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.absenceDays").value(5));

        mvc.perform(get("/api/admin/student-care/settings").param("branchId", BRANCH))
                .andExpect(jsonPath("$.absenceDays").value(5));
        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.needsCheck[0].signals[*].type", not(hasItem("CONSECUTIVE_ABSENCE"))));

        // 다른 지점에는 영향이 없다.
        mvc.perform(get("/api/admin/student-care/settings").param("branchId", "br_bundang"))
                .andExpect(jsonPath("$.absenceDays").value(3));
    }

    @Test
    void outOfRangeValuesAre422WithFields() throws Exception {
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SETTINGS.formatted(1).replace("\"cooldownDays\":7", "\"cooldownDays\":99")))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("INVALID_CARE_SETTINGS"))
                .andExpect(jsonPath("$.details.fields[*].field", containsInAnyOrder("absenceDays", "cooldownDays")));

        mvc.perform(get("/api/admin/student-care/settings").param("branchId", BRANCH))
                .andExpect(jsonPath("$.absenceDays").value(3));
    }

    @Test
    void missingValueIsValidationError() throws Exception {
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"absenceDays\":3}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields", org.hamcrest.Matchers.hasSize(7)))
                .andExpect(jsonPath("$.details.fields[*].field", hasItem("cooldownDays")))
                .andExpect(jsonPath("$.details.fields[*].reason", org.hamcrest.Matchers.everyItem(
                        org.hamcrest.Matchers.is("required"))));
    }

    @Test
    void summaryCountsBoardAndRecentClosures() throws Exception {
        mvc.perform(post("/api/admin/student-care/cases").contentType(MediaType.APPLICATION_JSON).content("""
                {"branchId":"br_gangnam","studentId":"stu_002","reason":"RECORD_ISSUE"}""")).andExpect(status().isCreated());
        mvc.perform(post("/api/admin/student-care/cases").contentType(MediaType.APPLICATION_JSON).content("""
                {"branchId":"br_gangnam","studentId":"stu_003","reason":"ADJUSTMENT_NEEDED",
                 "plan":{"goal":"목표","action":"행동","recheckDate":"2026-10-07","agreedWithStudent":true}}"""))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/admin/student-care/summary").param("branchId", BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.asOf").value("2026-09-30"))
                .andExpect(jsonPath("$.needsCheckCount").value(5))
                .andExpect(jsonPath("$.deferredCount").value(1))
                .andExpect(jsonPath("$.inAdjustmentCount").value(1))
                .andExpect(jsonPath("$.recheckDueCount").value(0))
                .andExpect(jsonPath("$.signalCounts[?(@.type == 'STUDY_DROP')].count").value(1))
                .andExpect(jsonPath("$.signalCounts[?(@.type == 'CONSECUTIVE_ABSENCE')].label").value("연속 미입실"))
                .andExpect(jsonPath("$.closedLast30Days.recordIssue").value(1))
                .andExpect(jsonPath("$.closedLast30Days.expectedChange").value(0))
                .andExpect(jsonPath("$.closedLast30Days.afterRecheck").value(0));
    }

    @Test
    void summaryCountsRecheckDueAndAfterRecheckClosuresWithinThirtyDays() throws Exception {
        String early = startAdjustment("stu_003", "2026-10-03");
        startAdjustment("stu_005", "2026-10-07");

        clock.setDate(ANCHOR.plusDays(3));
        mvc.perform(get("/api/admin/student-care/summary").param("branchId", BRANCH))
                .andExpect(jsonPath("$.inAdjustmentCount").value(2))
                .andExpect(jsonPath("$.recheckDueCount").value(1));

        mvc.perform(post("/api/admin/student-care/cases/{caseId}/decisions", early).param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"CLOSE\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/admin/student-care/summary").param("branchId", BRANCH))
                .andExpect(jsonPath("$.inAdjustmentCount").value(1))
                .andExpect(jsonPath("$.recheckDueCount").value(0))
                .andExpect(jsonPath("$.closedLast30Days.afterRecheck").value(1));

        // 10/3 종결 → asOf−29 ~ asOf에 들어가는 마지막 날은 11/1, 11/2부터 빠진다.
        clock.setDate(java.time.LocalDate.of(2026, 11, 1));
        mvc.perform(get("/api/admin/student-care/summary").param("branchId", BRANCH))
                .andExpect(jsonPath("$.closedLast30Days.afterRecheck").value(1))
                .andExpect(jsonPath("$.recheckDueCount").value(1));
        clock.setDate(java.time.LocalDate.of(2026, 11, 2));
        mvc.perform(get("/api/admin/student-care/summary").param("branchId", BRANCH))
                .andExpect(jsonPath("$.closedLast30Days.afterRecheck").value(0));
    }

    @Test
    void integrationFailureOnSummaryIs503AndChangesNothing() throws Exception {
        startAdjustment("stu_003", "2026-10-03");
        String before = StudentCareApiTestSupport.snapshot(jdbc);
        integration.setStudyDataAvailable(false);

        mvc.perform(get("/api/admin/student-care/summary").param("branchId", BRANCH))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("EXISTING_STUDY_DATA_UNAVAILABLE"));

        assertThat(StudentCareApiTestSupport.snapshot(jdbc)).isEqualTo(before);
    }

    private String startAdjustment(String studentId, String recheckDate) throws Exception {
        String response = mvc.perform(post("/api/admin/student-care/cases").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"branchId":"br_gangnam","studentId":"%s","reason":"ADJUSTMENT_NEEDED",
                                 "plan":{"goal":"목표","action":"행동","recheckDate":"%s","agreedWithStudent":true}}"""
                                .formatted(studentId, recheckDate)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.caseId");
    }
}
