package com.learnershigh.extension.studentcare.controller;

import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.BRANCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.common.integration.learnershigh.MockIntegrationSwitch;
import com.learnershigh.extension.common.time.AdjustableClock;
import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** 공통 Error (api-contract.md §5-1): 415 / 406 / 형식 오류의 JSON 경로 / 길이 / 소수. */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentCareErrorApiTest {

    static final String SETTINGS = """
            {"absenceDays":%s,"planMissingDays":3,"studyDropPercent":40,"executionRatePercent":60,
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

    ResultActions open(String body) throws Exception {
        return mvc.perform(post("/api/admin/student-care/cases").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void nonJsonBodyIs415AndNothingIsSaved() throws Exception {
        mvc.perform(post("/api/admin/student-care/cases").contentType(MediaType.TEXT_PLAIN)
                        .content("branchId=br_gangnam&studentId=stu_002&reason=RECORD_ISSUE"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED).content("absenceDays=5"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));

        assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isZero();
    }

    @Test
    void acceptWithoutJsonIs406WithJsonBodyBeforeTheHandlerRuns() throws Exception {
        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH).accept(MediaType.TEXT_PLAIN))
                .andExpect(status().isNotAcceptable())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("NOT_ACCEPTABLE"));

        // 변경 요청도 Handler 실행 전에 거부되어 아무것도 저장되지 않는다.
        mvc.perform(post("/api/admin/student-care/cases").contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_XML)
                        .content("""
                                {"branchId":"br_gangnam","studentId":"stu_003","channel":"CALL","reason":"RECORD_ISSUE"}"""))
                .andExpect(status().isNotAcceptable())
                .andExpect(jsonPath("$.code").value("NOT_ACCEPTABLE"));
        assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isZero();
    }

    @Test
    void floatInIntegerFieldIs400WithFieldAndNotSaved() throws Exception {
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content(SETTINGS.formatted("2.5")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value("absenceDays"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("invalid"));
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content(SETTINGS.formatted("5.0")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("absenceDays"));

        assertThat(StudentCareApiTestSupport.count(jdbc, "care_settings")).isZero();
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content(SETTINGS.formatted("5")))
                .andExpect(status().isOk());
    }

    @Test
    void numberAsStringIs400WithFieldAndNotSaved() throws Exception {
        mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content(SETTINGS.formatted("\"3\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value("absenceDays"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("invalid"));
        assertThat(StudentCareApiTestSupport.count(jdbc, "care_settings")).isZero();
    }

    @Test
    void enumAsNumberOrWrongTypeIs400() throws Exception {
        open("""
                {"branchId":"br_gangnam","studentId":"stu_001","reason":0}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("reason"));
        open("""
                {"branchId":"br_gangnam","studentId":"stu_001","channel":"CALL","reason":"EXPECTED_CHANGE","memo":123}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("memo"));
        assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isZero();
    }

    /** 문자열 자리의 Boolean / 소수는 문자열로 바꿔 넣지 않는다 (StrictJsonConfig, api-contract.md §5-1). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "true | memo | EXPECTED_CHANGE",
            "false | memo | RECORD_ISSUE",
            "1.5 | memo | EXPECTED_CHANGE",
            "true | memo | ADJUSTMENT_NEEDED"})
    void booleanOrFloatInStringFieldIs400WithFieldPath(String value, String field, String reason) throws Exception {
        open("""
                {"branchId":"br_gangnam","studentId":"stu_005","channel":"CALL","reason":"%s","memo":%s,
                 "recheckDate":"2026-10-07"}"""
                .formatted(reason, value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value(field))
                .andExpect(jsonPath("$.details.fields[0].reason").value("invalid"));

        assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isZero();
    }

    @Test
    void integerOverflowIs400OnTheFieldNotBody() throws Exception {
        for (String tooBig : new String[] {"2147483648", "99999999999999999999", "-2147483649"}) {
            mvc.perform(put("/api/admin/student-care/settings").param("branchId", BRANCH)
                            .contentType(MediaType.APPLICATION_JSON).content(SETTINGS.formatted(tooBig)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.details.fields[0].field").value("absenceDays"));
        }
        assertThat(StudentCareApiTestSupport.count(jdbc, "care_settings")).isZero();
    }

    @Test
    void invalidValuesReportTheirJsonPath() throws Exception {
        open("""
                {"branchId":"br_gangnam","studentId":"stu_005","reason":"UNKNOWN"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value("reason"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("invalid"));
        open("""
                {"branchId":"br_gangnam","studentId":"stu_005","channel":"CALL","reason":"ADJUSTMENT_NEEDED",
                 "recheckDate":"2026-13-40"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("recheckDate"));
        open("""
                {"branchId":"br_gangnam","studentId":"stu_005","channel":"FAX","reason":"RECORD_ISSUE"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("channel"));
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/decisions", "care_none").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"MAYBE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("decision"));
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/notes", "care_none").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"channel\":\"FAX\",\"content\":\"메모\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("channel"));
    }

    @Test
    void malformedJsonIsReportedOnBody() throws Exception {
        open("{\"branchId\":")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value("body"));
    }

    @Test
    void decisionBodyErrorsReportFieldPathsEvenWithBranchQuery() throws Exception {
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/decisions", "care_none").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("decision"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("required"));
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/notes", "care_none").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"channel":"CALL","content":"%s"}""".formatted("가".repeat(1001))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("content"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("length"));
    }

    @Test
    void memoOverLimitIs400() throws Exception {
        open("""
                {"branchId":"br_gangnam","studentId":"stu_002","channel":"CALL","reason":"RECORD_ISSUE","memo":"%s"}"""
                .formatted("가".repeat(1001)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("memo"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("length"));
    }
}
