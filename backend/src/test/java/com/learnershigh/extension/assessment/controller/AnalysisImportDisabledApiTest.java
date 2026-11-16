package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** 기본 설정(assessment.analysis-import.enabled 미지정 = false)에서는 외부 분석 결과 수신 Endpoint가 등록되지 않는다. */
@Tag("integration")
@SpringBootTest(properties = "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage")
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class AnalysisImportDisabledApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void 수신_기능이_꺼져_있으면_분석결과_수신은_404이고_저장하지_않는다() throws Exception {
        byte[] pdf = AnalyzerV21SyntheticImportApiTest.fixture("synthetic-plan.pdf");
        String created = mvc.perform(asAdmin(multipart("/api/admin/assessment/evaluation-plans")
                                .file(new MockMultipartFile("file", "synthetic-plan.pdf", "application/pdf", pdf)),
                        "adm_plan_operator")
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "1"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String revisionId = JsonPath.read(created, "$.documentRevisionId");
        mvc.perform(asAdmin(post("/api/admin/assessment/evaluation-plans/" + JsonPath.read(created, "$.planId")
                                + "/revisions/" + revisionId + "/analysis-imports"), "adm_plan_operator")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new String(AnalyzerV21SyntheticImportApiTest.fixture("synthetic-plan.backend-import.json"),
                                StandardCharsets.UTF_8)))
                .andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_analysis_run where revision_id = ?",
                Long.class, revisionId)).isZero();
    }
}
