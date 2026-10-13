package com.learnershigh.extension.studentcare.controller;

import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.BRANCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
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
                                {"branchId":"br_gangnam","studentId":"stu_003","reason":"RECORD_ISSUE"}"""))
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
        // Boolean 자리의 문자열도 바꿔 넣지 않는다.
        open("""
                {"branchId":"br_gangnam","studentId":"stu_005","reason":"ADJUSTMENT_NEEDED",
                 "plan":{"goal":"목표","action":"행동","recheckDate":"2026-10-07","agreedWithStudent":"true"}}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("plan.agreedWithStudent"));

        assertThat(StudentCareApiTestSupport.count(jdbc, "care_settings")).isZero();
        assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isZero();
    }

    @Test
    void enumAsNumberOrWrongTypeIs400() throws Exception {
        open("""
                {"branchId":"br_gangnam","studentId":"stu_001","reason":0}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("reason"));
        open("""
                {"branchId":"br_gangnam","studentId":"stu_001","reason":"EXPECTED_CHANGE","memo":123}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("memo"));
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
    void planIsIgnoredEntirelyUnlessAdjustmentIsNeeded() throws Exception {
        String longPlan = """
                {"branchId":"br_gangnam","studentId":"%s","reason":"%s",
                 "plan":{"goal":"%s","action":"%s","loadLimit":"%s","recheckDate":"2026-01-01","agreedWithStudent":false}}""";
        open(longPlan.formatted("stu_001", "EXPECTED_CHANGE", "가".repeat(500), "나".repeat(500), "다".repeat(500)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.plan").doesNotExist());
        open(longPlan.formatted("stu_002", "RECORD_ISSUE", "가".repeat(500), "", ""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.closeType").value("RECORD_ISSUE"));

        // 같은 plan이라도 ADJUSTMENT_NEEDED면 검증한다.
        open(longPlan.formatted("stu_005", "ADJUSTMENT_NEEDED", "가".repeat(201), "행동", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("plan.goal"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("length"));
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
                {"branchId":"br_gangnam","studentId":"stu_005","reason":"ADJUSTMENT_NEEDED",
                 "plan":{"goal":"목표","action":"행동","recheckDate":"2026-13-40","agreedWithStudent":true}}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("plan.recheckDate"));
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
    void planLengthOverLimitIs400WithPlanFieldPath() throws Exception {
        String body = """
                {"branchId":"br_gangnam","studentId":"stu_005","reason":"ADJUSTMENT_NEEDED",
                 "plan":{"goal":"%s","action":"%s","loadLimit":"%s","recheckDate":"2026-10-07","agreedWithStudent":true}}""";
        open(body.formatted("가".repeat(201), "나".repeat(201), "다".repeat(101)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[*].field",
                        containsInAnyOrder("plan.goal", "plan.action", "plan.loadLimit")))
                .andExpect(jsonPath("$.details.fields[*].reason", containsInAnyOrder("length", "length", "length")));
        assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isZero();

        open(body.formatted("가".repeat(200), "나".repeat(200), "다".repeat(100)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.plan.goal").value("가".repeat(200)));
    }

    @Test
    void decisionBodyErrorsReportFieldPathsEvenWithBranchQuery() throws Exception {
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/decisions", "care_none").param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("decision"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("required"));
        // REVISE plan 길이는 Domain이 검사하므로 건이 있어야 한다 (StudentCareRecheckApiTest.reviseWithTooLongGoalIs400OnThePlanField).
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
                {"branchId":"br_gangnam","studentId":"stu_002","reason":"RECORD_ISSUE","memo":"%s"}"""
                .formatted("가".repeat(1001)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("memo"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("length"));
    }

    @Test
    void unprocessableErrorsCarryTheCauseField() throws Exception {
        String adjustment = """
                {"branchId":"br_gangnam","studentId":"stu_005","reason":"ADJUSTMENT_NEEDED",
                 "plan":{"goal":%s,"action":"행동","recheckDate":%s,"agreedWithStudent":%s}}""";
        open("""
                {"branchId":"br_gangnam","studentId":"stu_005","reason":"ADJUSTMENT_NEEDED"}""")
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("PLAN_REQUIRED"))
                .andExpect(jsonPath("$.details.fields[0].field").value("plan"));
        open(adjustment.formatted("\" \"", "\"2026-10-07\"", "true"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("PLAN_REQUIRED"))
                .andExpect(jsonPath("$.details.fields[0].field").value("plan.goal"));
        open(adjustment.formatted("\"목표\"", "\"2026-10-07\"", "false"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("STUDENT_AGREEMENT_REQUIRED"))
                .andExpect(jsonPath("$.details.fields[0].field").value("plan.agreedWithStudent"));
        open(adjustment.formatted("\"목표\"", "\"2026-10-29\"", "true"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("INVALID_RECHECK_DATE"))
                .andExpect(jsonPath("$.details.fields[0].field").value("plan.recheckDate"));
        open(adjustment.formatted("\"목표\"", "null", "true"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("INVALID_RECHECK_DATE"))
                .andExpect(jsonPath("$.details.fields[0].field").value("plan.recheckDate"));

        assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isZero();
    }
}
