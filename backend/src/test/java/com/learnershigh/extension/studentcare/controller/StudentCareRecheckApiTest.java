package com.learnershigh.extension.studentcare.controller;

import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.ANCHOR;
import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.BRANCH;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
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

/** 재점검 비교 / 선생님 결정 (api-contract.md §65-5, 65-6). */
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

    @BeforeEach
    void setUp() {
        StudentCareApiTestSupport.reset(jdbc, clock);
    }

    private String startAdjustment(String studentId, String recheckDate) throws Exception {
        String body = """
                {"branchId":"br_gangnam","studentId":"%s","reason":"ADJUSTMENT_NEEDED",
                 "plan":{"goal":"목표 한 가지","action":"행동 한 가지","loadLimit":"주 2시간 추가까지",
                         "recheckDate":"%s","agreedWithStudent":true}}""".formatted(studentId, recheckDate);
        String response = mvc.perform(post("/api/admin/student-care/cases")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.caseId");
    }

    private ResultActions decide(String caseId, String body) throws Exception {
        return mvc.perform(post("/api/admin/student-care/cases/{caseId}/decisions", caseId)
                .contentType(MediaType.APPLICATION_JSON).content(body));
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
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].label").value("과목 배분 차이"))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].before").value(12))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].now").value(24))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].target").value(30))
                .andExpect(jsonPath("$.activeCase.comparison.rows[0].trend").value("IMPROVED"))
                .andExpect(jsonPath("$.activeCase.comparison.result").value("IMPROVED"))
                .andExpect(jsonPath("$.activeCase.comparison.resultLabel").value("변화 관찰"));

        decide(caseId, "{\"decision\":\"CLOSE\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.closeType").value("AFTER_RECHECK"))
                .andExpect(jsonPath("$.closedOn").value("2026-10-07"))
                .andExpect(jsonPath("$.events[*].type",
                        contains("REASON_CONFIRMED", "ADJUSTMENT_STARTED", "RECHECKED", "CLOSED")))
                .andExpect(jsonPath("$.events[2].content").value("재점검 — 변화 관찰: 수학 비중 12% → 24%"));

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
                .andExpect(jsonPath("$.activeCase.comparison.resultLabel").value("변화 없음"));

        decide(caseId, "{\"decision\":\"CONTINUE\"}")
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("INVALID_RECHECK_DATE"));

        decide(caseId, "{\"decision\":\"CONTINUE\",\"recheckDate\":\"2026-10-14\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_ADJUSTMENT"))
                .andExpect(jsonPath("$.recheckDate").value("2026-10-14"))
                .andExpect(jsonPath("$.recheckDue").value(false))
                .andExpect(jsonPath("$.events[-1].content").value("같은 약속으로 계속 (다음 재점검 10월 14일)"));
    }

    @Test
    void reviseReplacesPlan() throws Exception {
        String caseId = startAdjustment("stu_003", "2026-10-03");
        clock.setDate(ANCHOR.plusDays(3));

        decide(caseId, """
                {"decision":"REVISE","plan":{"goal":"주 15시간 이상","action":"주말 오전 2시간 추가",
                 "loadLimit":"주 3시간 추가까지","recheckDate":"2026-10-10","agreedWithStudent":true}}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan.goal").value("주 15시간 이상"))
                .andExpect(jsonPath("$.recheckDate").value("2026-10-10"))
                .andExpect(jsonPath("$.events[*].type", contains(
                        "REASON_CONFIRMED", "ADJUSTMENT_STARTED", "RECHECKED", "REVISED")));

        decide(caseId, "{\"decision\":\"REVISE\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RECHECK_NOT_DUE"));
    }

    @Test
    void reviseWithoutPlanIs422() throws Exception {
        String caseId = startAdjustment("stu_003", "2026-10-03");
        clock.setDate(ANCHOR.plusDays(3));

        decide(caseId, "{\"decision\":\"REVISE\"}")
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("PLAN_REQUIRED"));
    }

    @Test
    void unknownCaseIs404() throws Exception {
        decide("care_none", "{\"decision\":\"CLOSE\"}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CARE_CASE_NOT_FOUND"));
    }
}
