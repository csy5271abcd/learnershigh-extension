package com.learnershigh.extension.studentcare.controller;

import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.BRANCH;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

/** 기준값 / 지점 요약 (api-contract.md §65-9, 65-10). */
@Tag("integration")
@SpringBootTest(properties = "learnershigh.mock.anchor-date=2026-09-29")
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
        jdbc.update("delete from care_settings");
        mvc.perform(get("/api/admin/student-care/settings").param("branchId", BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.absenceDays").value(1))
                .andExpect(jsonPath("$.planMissingDays").value(2))
                .andExpect(jsonPath("$.studyDropPercent").value(30))
                .andExpect(jsonPath("$.executionRatePercent").value(60))
                .andExpect(jsonPath("$.subjectShareGapPoints").value(20))
                .andExpect(jsonPath("$.startShiftMinutes").value(60))
                .andExpect(jsonPath("$.minValidDays").value(3))
                .andExpect(jsonPath("$.cooldownDays").value(7));
    }

    @Test
    void responsesCarryTheAllowedRangeOfEveryKey() throws Exception {
        String[][] expected = {
                {"absenceDays", "1", "14"}, {"planMissingDays", "1", "7"}, {"studyDropPercent", "10", "90"},
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
                .andExpect(jsonPath("$.absenceDays").value(1));
    }

    @Test
    void outOfRangeValuesAre422WithFields() throws Exception {
        jdbc.update("delete from care_settings");
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SETTINGS.formatted(0).replace("\"cooldownDays\":7", "\"cooldownDays\":99")))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("INVALID_CARE_SETTINGS"))
                .andExpect(jsonPath("$.details.fields[*].field", containsInAnyOrder("absenceDays", "cooldownDays")));

        mvc.perform(get("/api/admin/student-care/settings").param("branchId", BRANCH))
                .andExpect(jsonPath("$.absenceDays").value(1));
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
    void branchSummaryEndpointIsRemoved() throws Exception {
        mvc.perform(get("/api/admin/student-care/summary").param("branchId", BRANCH))
                .andExpect(status().isNotFound());
    }
}
