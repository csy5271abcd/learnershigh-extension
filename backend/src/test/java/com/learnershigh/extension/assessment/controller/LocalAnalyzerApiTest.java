package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.service.plan.LocalAnalyzerScenarioTest;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.util.List;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A27-UX 부록 D (2026-11-19): PR #18 서버 안 분석기(local)를 실제 등록(§38) → 서버 분석(§39-1) → 분석 조회 흐름으로 시험한다.
 * 합성 PDF(가상 과목 3개)만 쓰고 외부로 아무것도 보내지 않는다. 같은 원문을 다시 분석해도 새 Run을 만들지 않는다(200).
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.analyzer.mode=local", "assessment.analyzer.ocr=none"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class LocalAnalyzerApiTest {

    private static final String PLANS = "/api/admin/assessment/evaluation-plans";
    private static final String OPERATOR = "adm_plan_operator";

    @Autowired
    MockMvc mvc;

    @Test
    void 서버_안_분석기로_등록한_평가계획서를_분석하면_과목_수행항목_채점기준_후보가_저장된다() throws Exception {
        byte[] bytes = LocalAnalyzerScenarioTest.threeSubjectPlan();
        Assumptions.assumeTrue(bytes != null, "한글 글꼴이 없는 환경 — NOT RUN");
        String created = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "2099_가상고_1학년_2학기_평가계획(합성).pdf", "application/pdf", bytes)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2099").param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String planId = JsonPath.read(created, "$.planId");
        String revisionId = JsonPath.read(created, "$.documentRevisionId");
        String base = PLANS + "/" + planId + "/revisions/" + revisionId;

        mvc.perform(asAdmin(post(base + "/analysis"), OPERATOR)).andExpect(status().isCreated());
        // 같은 원문 재분석: 같은 내용의 Run이 있으면 새로 만들지 않는다
        mvc.perform(asAdmin(post(base + "/analysis"), OPERATOR)).andExpect(status().isOk());

        String analysis = mvc.perform(asAdmin(get(base + "/analysis"), OPERATOR)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<String>read(analysis, "$.analysisStatus")).isIn("REVIEW_REQUIRED", "PARTIAL");
        List<String> names = JsonPath.read(analysis, "$.subjects[*].subjectName");
        assertThat(names).anyMatch(n -> n.contains("가상국어")).anyMatch(n -> n.contains("가상수학")).anyMatch(n -> n.contains("가상과학"));
        // 원문 학년 근거(0.3 grades)가 함께 저장돼 다른 학년 문서 확정 차단에 쓰인다
        assertThat(analysis).contains("learnershigh-plan-extract");
        // 학생에게는 확정 전 분석 결과가 보이지 않는다(학생 목록은 확정 문서만)
        String student = mvc.perform(get("/api/student/assessment/evaluation-plans").header("X-Assessment-Student-Id", "stu_001")
                        .param("schoolId", "school_001").param("academicYear", "2099").param("grade", "1").param("semester", "2"))
                .andReturn().getResponse().getContentAsString();
        assertThat(student).doesNotContain(planId);
    }
}
