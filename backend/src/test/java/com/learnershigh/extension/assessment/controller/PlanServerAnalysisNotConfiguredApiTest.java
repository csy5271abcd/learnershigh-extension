package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** 분석기 미설정(기본 상태): 서버 분석 실행은 가짜 결과 없이 503 PLAN_ANALYZER_NOT_CONFIGURED, Run을 만들지 않는다. */
@Tag("integration")
@SpringBootTest(properties = "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage")
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class PlanServerAnalysisNotConfiguredApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void 분석기가_설정되지_않으면_503이고_Run이_없다() throws Exception {
        long before = jdbc.queryForObject("select count(*) from assessment_plan_analysis_run", Long.class);
        String body = mvc.perform(asAdmin(multipart("/api/admin/assessment/evaluation-plans")
                                .file(new MockMultipartFile("file", "plan.pdf", "application/pdf",
                                        EvaluationPlanApiTest.pdf(2, "not-configured"))), "adm_plan_operator")
                        .param("schoolId", "school_001").param("academicYear", "2026").param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(asAdmin(post("/api/admin/assessment/evaluation-plans/" + JsonPath.read(body, "$.planId")
                        + "/revisions/" + JsonPath.read(body, "$.documentRevisionId") + "/analysis"), "adm_plan_operator"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("PLAN_ANALYZER_NOT_CONFIGURED"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_analysis_run", Long.class)).isEqualTo(before);
    }
}
