package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A25 평가계획서 문서 삭제(논리 삭제, api-contract.md §38-9 DRAFT). 합성 PDF·합성 분석 결과만 쓴다.
 * 확정 전 삭제 · 공개 중 삭제는 추가 확인 필요 · 다시 삭제 404 · 다른 학교 schoolId 404 · 학생 비공개 · 기록 보존 · 다른 문서 영향 없음.
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.analysis-import.enabled=true", "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class EvaluationPlanDeletionApiTest {

    static final String OPERATOR = EvaluationPlanApiTest.OPERATOR;
    static final String PLANS = EvaluationPlanApiTest.PLANS;
    static final String STUDENT_PLANS = "/api/student/assessment/evaluation-plans";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc.update("delete from assessment_school_assessment");
        jdbc.update("delete from assessment_plan_confirmed_value");
        jdbc.update("delete from assessment_plan_review");
        jdbc.update("delete from assessment_plan_analysis_run");
        jdbc.update("delete from assessment_plan_revision");
        jdbc.update("delete from assessment_evaluation_plan");
    }

    record Uploaded(String planId, String revisionId, byte[] bytes) {
    }

    Uploaded register(String marker) throws Exception {
        byte[] bytes = EvaluationPlanApiTest.pdf(3, marker);
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", "합성_평가계획_" + marker + ".pdf", "application/pdf", bytes)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Uploaded uploaded = new Uploaded(JsonPath.read(body, "$.planId"), JsonPath.read(body, "$.documentRevisionId"), bytes);
        return uploaded;
    }

    void confirm(Uploaded uploaded, String marker) throws Exception {
        String sha = EvaluationPlanApiTest.sha256(uploaded.bytes());
        String base = PLANS + "/" + uploaded.planId() + "/revisions/" + uploaded.revisionId();
        String imported = mvc.perform(asAdmin(post(base + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(EvaluationPlanApiTest.analysis(sha, 3)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(asAdmin(put(base + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":40,"pdfPageNumber":3},
                          {"fieldPath":"performanceEvaluation.items[0].maxScore","value":null,"pdfPageNumber":null}]}]}"""
                        .formatted((String) JsonPath.read(imported, "$.analysisId"))))
                .andExpect(status().isOk());
    }

    org.springframework.test.web.servlet.ResultActions deletePlan(String planId, String schoolId, boolean confirm) throws Exception {
        return mvc.perform(asAdmin(delete(PLANS + "/" + planId), OPERATOR)
                .param("schoolId", schoolId).param("confirmPublished", String.valueOf(confirm)));
    }

    int adminListCount() throws Exception {
        String body = mvc.perform(asAdmin(get(PLANS), OPERATOR).param("schoolId", "school_001"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.items.length()");
    }

    org.springframework.test.web.servlet.ResultActions studentList() throws Exception {
        return mvc.perform(asStudent(get(STUDENT_PLANS), "stu_001").param("schoolId", "school_001")
                .param("academicYear", "2026").param("grade", "1").param("semester", "2"));
    }

    @Test
    void 확정_전_문서는_삭제되고_목록에서_빠지며_다시_삭제하면_404이고_기록은_보존된다() throws Exception {
        Uploaded target = register("draft-a");
        Uploaded other = register("draft-b");
        assertThat(adminListCount()).isEqualTo(2);

        deletePlan(target.planId(), "school_001", false).andExpect(status().isOk())
                .andExpect(jsonPath("$.planId").value(target.planId()))
                .andExpect(jsonPath("$.wasPublished").value(false))
                .andExpect(jsonPath("$.revisionCount").value(1));

        // 목록·상세에서 빠지고(새로 조회해도 = 새로고침 후에도) 다른 문서는 그대로
        assertThat(adminListCount()).isEqualTo(1);
        mvc.perform(asAdmin(get(PLANS + "/" + target.planId()), OPERATOR)).andExpect(status().isNotFound());
        mvc.perform(asAdmin(get(PLANS + "/" + other.planId()), OPERATOR)).andExpect(status().isOk());
        mvc.perform(asAdmin(get(PLANS + "/" + target.planId() + "/revisions/" + target.revisionId() + "/file"), OPERATOR))
                .andExpect(status().isNotFound());

        // 다시 삭제 → 404 (이미 삭제됨 = 보이지 않음)
        deletePlan(target.planId(), "school_001", false).andExpect(status().isNotFound());

        // 행은 지우지 않는다: 문서·Revision 보존, 삭제자·시각 기록
        assertThat(jdbc.queryForObject("select count(*) from assessment_evaluation_plan where id = ? and deleted_at is not null and deleted_by = ?",
                Integer.class, target.planId(), OPERATOR)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision where plan_id = ?", Integer.class, target.planId()))
                .isEqualTo(1);
        // 새 문서 등록에는 영향이 없다
        register("draft-c");
        assertThat(adminListCount()).isEqualTo(2);
    }

    @Test
    void 학생에게_공개_중인_문서는_확인_없이_지우지_않고_확인하면_학생_화면에서도_사라진다() throws Exception {
        Uploaded published = register("pub-a");
        confirm(published, "pub-a");
        Uploaded other = register("pub-b");
        confirm(other, "pub-b");
        studentList().andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(2));

        deletePlan(published.planId(), "school_001", false).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PLAN_DELETE_CONFIRMATION_REQUIRED"));
        studentList().andExpect(jsonPath("$.items.length()").value(2));

        deletePlan(published.planId(), "school_001", true).andExpect(status().isOk())
                .andExpect(jsonPath("$.wasPublished").value(true));

        studentList().andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].planId").value(other.planId()));
        mvc.perform(asStudent(get(STUDENT_PLANS + "/" + published.planId()), "stu_001")).andExpect(status().isNotFound());
        mvc.perform(asStudent(get(STUDENT_PLANS + "/" + published.planId() + "/teaching-plan"), "stu_001")).andExpect(status().isNotFound());
        mvc.perform(asStudent(get(STUDENT_PLANS + "/" + published.planId() + "/file"), "stu_001")).andExpect(status().isNotFound());
        // 확정 기록은 감사용으로 보존
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review r join assessment_plan_revision v on v.id = r.revision_id where v.plan_id = ?",
                Integer.class, published.planId())).isGreaterThanOrEqualTo(1);
    }

    @Test
    void 다른_학교를_지정하면_404이고_학생과_인증없는_요청은_지우지_못한다() throws Exception {
        Uploaded uploaded = register("scope");
        deletePlan(uploaded.planId(), "school_999", false).andExpect(status().isNotFound());
        mvc.perform(asStudent(delete(PLANS + "/" + uploaded.planId()), "stu_001").param("schoolId", "school_001"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete(PLANS + "/" + uploaded.planId()).param("schoolId", "school_001"))
                .andExpect(status().isUnauthorized());
        mvc.perform(asAdmin(delete(PLANS + "/" + uploaded.planId()), OPERATOR)).andExpect(status().isBadRequest());
        assertThat(adminListCount()).isEqualTo(1);
    }
}
