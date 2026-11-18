package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.BeforeEach;
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

/** A5 학교 검색 (DRAFT §38-3): 평가계획서가 등록된 학교만, 전체 목록이 아님을 응답에 표시. 이름은 학업 Context로 확인될 때만. */
@Tag("integration")
@SpringBootTest(properties = "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage")
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class AdminSchoolSearchApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void setUp() throws Exception {
        jdbc.update("delete from assessment_school_assessment");
        jdbc.update("delete from assessment_plan_review_draft");
        jdbc.update("delete from assessment_plan_confirmed_value");
        jdbc.update("delete from assessment_plan_review");
        jdbc.update("delete from assessment_plan_analysis_run");
        jdbc.update("delete from assessment_plan_revision");
        jdbc.update("delete from assessment_evaluation_plan");
        byte[] a = MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/synthetic-e2e.pdf");
        byte[] b = MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21/synthetic-plan.pdf");
        register("school_001", a, "2");
        register("school_001", b, "1");
        // 학업 Context에 없는 학교도 운영할 수 있다 (OD-A08) — 이름은 지어내지 않는다
        register("school_unknown_77", a, "2");
    }

    void register(String schoolId, byte[] pdf, String semester) throws Exception {
        mvc.perform(asAdmin(multipart("/api/admin/assessment/evaluation-plans")
                                .file(new MockMultipartFile("file", "plan.pdf", "application/pdf", pdf)), "adm_plan_operator")
                        .param("schoolId", schoolId).param("academicYear", "2026").param("grade", "1").param("semester", semester))
                .andExpect(status().isCreated());
    }

    @Test
    void 등록된_학교만_돌려주고_전체_목록이_아님을_표시한다() throws Exception {
        mvc.perform(asAdmin(get("/api/admin/assessment/schools"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coverage").value("REGISTERED_PLANS_ONLY"))
                .andExpect(jsonPath("$.masterConnected").value(false))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].schoolId").value("school_001"))
                .andExpect(jsonPath("$.items[0].planCount").value(2))
                .andExpect(jsonPath("$.items[0].name").value("예시고등학교"))
                .andExpect(jsonPath("$.items[0].nameSource").value("ACADEMIC_CONTEXT"))
                .andExpect(jsonPath("$.items[1].schoolId").value("school_unknown_77"))
                .andExpect(jsonPath("$.items[1].name").doesNotExist());
    }

    @Test
    void 학교_코드와_이름으로_찾고_개수를_제한한다() throws Exception {
        mvc.perform(asAdmin(get("/api/admin/assessment/schools").param("query", "예시"), "adm_plan_operator"))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].schoolId").value("school_001"));
        mvc.perform(asAdmin(get("/api/admin/assessment/schools").param("query", "UNKNOWN"), "adm_plan_operator"))
                .andExpect(jsonPath("$.items[0].schoolId").value("school_unknown_77"));
        mvc.perform(asAdmin(get("/api/admin/assessment/schools").param("limit", "1"), "adm_plan_operator"))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.truncated").value(true));
    }

    @Test
    void 인증_없음과_학생은_401() throws Exception {
        mvc.perform(get("/api/admin/assessment/schools")).andExpect(status().isUnauthorized());
        mvc.perform(asStudent(get("/api/admin/assessment/schools"), "stu_001")).andExpect(status().isUnauthorized());
    }
}
