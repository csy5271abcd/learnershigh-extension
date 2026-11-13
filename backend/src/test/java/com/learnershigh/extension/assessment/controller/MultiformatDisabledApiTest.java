package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

/** 다중 형식 실험 기능이 꺼진 기본 상태: HWP·HWPX 등록과 새 수신 필드는 지금까지와 같이 거절된다. */
@Tag("integration")
@SpringBootTest(properties = "assessment.analysis-import.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class MultiformatDisabledApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void 실험_기능이_꺼져_있으면_HWPX는_415이고_format_documentLocator는_unknown_field다() throws Exception {
        long revisions = jdbc.queryForObject("select count(*) from assessment_plan_revision", Long.class);
        mvc.perform(asAdmin(multipart("/api/admin/assessment/evaluation-plans")
                                .file(new MockMultipartFile("file", "plan.hwpx", "application/octet-stream",
                                        MultiformatExperimentalApiTest.resource("/assessment/multiformat/synthetic-plan.hwpx"))),
                        "adm_plan_operator")
                        .param("schoolId", "school_001").param("academicYear", "2026").param("grade", "1").param("semester", "1"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE_TYPE"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision", Long.class)).isEqualTo(revisions);

        String created = mvc.perform(asAdmin(multipart("/api/admin/assessment/evaluation-plans")
                                .file(new MockMultipartFile("file", "plan.pdf", "application/pdf",
                                        MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/synthetic-e2e.pdf"))),
                        "adm_plan_operator")
                        .param("schoolId", "school_001").param("academicYear", "2026").param("grade", "1").param("semester", "1"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String base = "/api/admin/assessment/evaluation-plans/" + JsonPath.read(created, "$.planId") + "/revisions/"
                + JsonPath.read(created, "$.documentRevisionId") + "/analysis-imports";
        String pdf = new String(MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/analysis-import.json"),
                StandardCharsets.UTF_8);
        mvc.perform(asAdmin(post(base), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(pdf.replaceFirst("\"pageCount\": 2", "\"pageCount\": 2, \"format\": \"PDF\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("source.format"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("unknown_field"));
        String withLocator = pdf.replaceFirst("\"pdfPageNumber\": 1,",
                "\"pdfPageNumber\": 1, \"documentLocator\": {\"kind\": \"HWPX_PARAGRAPH\", \"section\": 0, \"path\": \"p0\"},");
        assertThat(withLocator).isNotEqualTo(pdf);
        String body = mvc.perform(asAdmin(post(base), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON).content(withLocator))
                .andExpect(status().isBadRequest())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).contains("documentLocator\",\"reason\":\"unknown_field\"");
        mvc.perform(asAdmin(post(base), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON).content(pdf))
                .andExpect(status().isCreated());
        String stored = jdbc.queryForObject("select result_json from assessment_plan_analysis_run where revision_id = ?", String.class,
                (String) JsonPath.read(created, "$.documentRevisionId"));
        assertThat(stored).doesNotContain("documentLocator").doesNotContain("\"format\"");
        assertThat(tools.jackson.databind.json.JsonMapper.builder().build().readTree(stored))
                .isEqualTo(tools.jackson.databind.json.JsonMapper.builder().build().readTree(pdf).path("subjects"));
    }
}
