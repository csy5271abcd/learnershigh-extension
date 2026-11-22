package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.EvaluationPlanApiTest.OPERATOR;
import static com.learnershigh.extension.assessment.controller.EvaluationPlanApiTest.PLANS;
import static com.learnershigh.extension.assessment.controller.EvaluationPlanApiTest.analysis;
import static com.learnershigh.extension.assessment.controller.EvaluationPlanApiTest.pdf;
import static com.learnershigh.extension.assessment.controller.EvaluationPlanApiTest.sha256;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.util.List;
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
 * A12 재검토·재확정(§39-8), 채점기준 수동 보완(§39-9), 관리자 현황 집계(§33). 분석 결과는 합성 Fixture다.
 * 규칙: 이전 확정 기록은 불변, 재검토 중 학생 공개값 불변, 재확정은 새 확정 기록, 학생은 최신 확정 기록을 본다.
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.analysis-import.enabled=true", "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class PlanReReviewApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    @org.junit.jupiter.api.AfterEach // 남긴 초안이 다른 시험 클래스의 정리(분석 Run 삭제)를 막지 않게 끝난 뒤에도 지운다
    void setUp() {
        jdbc.update("delete from assessment_school_assessment");
        jdbc.update("delete from assessment_plan_review_draft_event");
        jdbc.update("delete from assessment_plan_review_draft");
        jdbc.update("delete from assessment_plan_confirmed_value");
        jdbc.update("delete from assessment_plan_review");
        jdbc.update("delete from assessment_plan_analysis_run");
        jdbc.update("delete from assessment_plan_revision");
        jdbc.update("delete from assessment_evaluation_plan");
    }

    record Doc(String planId, String revisionId, String analysisId) {
        String path(String tail) {
            return PLANS + "/" + planId + "/revisions/" + revisionId + tail;
        }
    }

    Doc registerAndImport() throws Exception {
        byte[] bytes = pdf(3, "re-review");
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", "2026_재검토(합성).pdf", "application/pdf", bytes)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String planId = JsonPath.read(body, "$.planId");
        String revisionId = JsonPath.read(body, "$.documentRevisionId");
        String imported = mvc.perform(asAdmin(post(PLANS + "/" + planId + "/revisions/" + revisionId + "/analysis-imports"),
                        OPERATOR).contentType(MediaType.APPLICATION_JSON).content(analysis(sha256(bytes), 3)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new Doc(planId, revisionId, JsonPath.read(imported, "$.analysisId"));
    }

    static final String RUBRIC = """
            [{"element":"탐구 설계(관리자 보완)","levels":[{"description":"변인을 모두 통제함","score":10},{"description":"일부 통제함","score":5}]},
             {"element":"보고서","levels":[{"description":"근거가 명확함","score":15}]}]""";

    String confirmBody(Doc doc, int weight, String rubric) {
        return """
                {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","analysisSubjectIndex":0,"confirmedFields":[
                  {"fieldPath":"performanceEvaluation.weightPercent","value":%d,"pdfPageNumber":3}%s]}]}"""
                .formatted(doc.analysisId(), weight, rubric == null ? ""
                        : ",{\"fieldPath\":\"performanceEvaluation.items[0].rubric\",\"value\":" + rubric + ",\"pdfPageNumber\":3}");
    }

    @Test
    void 확정본을_재검토해_재확정하면_새_확정_기록이_쌓이고_학생은_최신값을_보며_이전_기록은_그대로다() throws Exception {
        Doc doc = registerAndImport();
        String student = "/api/student/assessment/evaluation-plans/" + doc.planId();
        mvc.perform(asAdmin(put(doc.path("/review")), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(confirmBody(doc, 40, null)))
                .andExpect(status().isOk());

        // 재검토를 시작하지 않으면 초안 저장·재확정 모두 막힌다(기존 동작 유지)
        mvc.perform(asAdmin(put(doc.path("/review-draft")), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"analysisId\":\"%s\",\"baseVersion\":null,\"decisions\":[],\"subjectLinks\":[]}".formatted(doc.analysisId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("already_confirmed"));
        mvc.perform(asAdmin(put(doc.path("/review")), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(confirmBody(doc, 45, null)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("re_review_not_started"));

        // 재검토 시작: 초안이 없던 확정(API 확정)이라 최신 확정값으로 채운 새 초안
        String reopened = mvc.perform(asAdmin(post(doc.path("/review-draft/reopen")), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.status").value("ACTIVE"))
                .andExpect(jsonPath("$.draft.subjectLinks[0].subjectId").value("subj_02"))
                .andExpect(jsonPath("$.draft.decisions[0].fieldPath").value("performanceEvaluation.weightPercent"))
                .andExpect(jsonPath("$.draft.decisions[0].value").value("40"))
                .andReturn().getResponse().getContentAsString();
        mvc.perform(asAdmin(post(doc.path("/review-draft/reopen")), OPERATOR))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("already_open"));
        mvc.perform(asAdmin(get(doc.path("/reviews")), OPERATOR))
                .andExpect(jsonPath("$.reReviewOpen").value(true))
                .andExpect(jsonPath("$.items.length()").value(1));
        // 현황: 재검토 진행 중 1
        mvc.perform(asAdmin(get("/api/admin/assessment/overview"), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluationPlans.documents").value(1))
                .andExpect(jsonPath("$.evaluationPlans.evaluationConfirmed").value(1))
                .andExpect(jsonPath("$.evaluationPlans.reReviewInProgress").value(1))
                .andExpect(jsonPath("$.evaluationPlans.reviewPending").value(0));

        // 재검토 초안 저장(수정값 + 채점기준 수동 보완) — 학생 공개값은 그대로 40
        int version = JsonPath.read(reopened, "$.draft.version");
        mvc.perform(asAdmin(put(doc.path("/review-draft")), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","baseVersion":%d,"subjectLinks":[{"subjectIndex":0,"subjectId":"subj_02"}],"decisions":[
                          {"subjectIndex":0,"fieldPath":"performanceEvaluation.weightPercent","decision":"EDITED","value":"45","pdfPageNumber":3},
                          {"subjectIndex":0,"fieldPath":"performanceEvaluation.items[0].rubric","decision":"EDITED","value":%s,"pdfPageNumber":3}]}"""
                        .formatted(doc.analysisId(), version, tools.jackson.databind.json.JsonMapper.builder().build()
                                .writeValueAsString(RUBRIC.replace("\n", "")))))
                .andExpect(status().isOk());
        mvc.perform(asStudent(get(student), "stu_001"))
                .andExpect(jsonPath("$.confirmedFields[0].value").value(40));

        // 잘못된 채점표 모양은 거절
        mvc.perform(asAdmin(put(doc.path("/review")), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(confirmBody(doc, 45, "[{\"element\":\"\",\"levels\":[]}]")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[?(@.reason == 'rubric_shape')]").isNotEmpty());

        // 재확정
        mvc.perform(asAdmin(put(doc.path("/review")), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(confirmBody(doc, 45, RUBRIC)))
                .andExpect(status().isOk());
        String history = mvc.perform(asAdmin(get(doc.path("/reviews")), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reReviewOpen").value(false))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].current").value(true))
                .andExpect(jsonPath("$.items[1].current").value(false))
                .andReturn().getResponse().getContentAsString();
        // 이전 기록은 바뀌지 않았다(40 그대로)
        assertThat(JsonPath.<List<Object>>read(history, "$.items[1].confirmedFields[?(@.fieldPath == 'performanceEvaluation.weightPercent')].value"))
                .containsExactly(40);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).isEqualTo(2);

        // 학생: 최신 확정값(45)과 관리자 보완 채점기준, 이력·분석 번호는 없다
        String studentBody = mvc.perform(asStudent(get(student), "stu_001"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<Object>>read(studentBody, "$.confirmedFields[?(@.fieldPath == 'performanceEvaluation.weightPercent')].value"))
                .containsExactly(45);
        assertThat(JsonPath.<List<Object>>read(studentBody, "$.confirmedFields[?(@.fieldPath == 'performanceEvaluation.items[0].rubric')].value[0].element"))
                .containsExactly("탐구 설계(관리자 보완)");
        assertThat(studentBody).doesNotContain("analysisSubjectIndex", "reviewedBy");
        // 분석 후보 채점기준은 그대로다(관리자 값으로 덮어쓰지 않음)
        mvc.perform(asAdmin(get(doc.path("/analysis")), OPERATOR))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].rubric[0].element").value("탐구 설계"));
        // 재확정 뒤 재검토는 다시 열 수 있다(닫힌 초안 다시 열기)
        mvc.perform(asAdmin(post(doc.path("/review-draft/reopen")), OPERATOR)).andExpect(status().isOk());
    }

    @Test
    void 확정되지_않은_문서는_재검토를_시작할_수_없고_현황은_검토_대기로_센다() throws Exception {
        Doc doc = registerAndImport();
        mvc.perform(asAdmin(post(doc.path("/review-draft/reopen")), OPERATOR))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("not_confirmed"));
        mvc.perform(asAdmin(get("/api/admin/assessment/overview"), OPERATOR).param("schoolId", "school_001").param("academicYear", "2026"))
                .andExpect(jsonPath("$.evaluationPlans.documents").value(1))
                .andExpect(jsonPath("$.evaluationPlans.analysis.reviewRequired").value(1))
                .andExpect(jsonPath("$.evaluationPlans.reviewPending").value(1))
                .andExpect(jsonPath("$.evaluationPlans.evaluationConfirmed").value(0))
                .andExpect(jsonPath("$.recentActivity[?(@.type == 'PLAN_ANALYZED')].detail").value(org.hamcrest.Matchers.contains("REVIEW_REQUIRED")))
                .andExpect(jsonPath("$.recentActivity[?(@.type == 'PLAN_UPLOADED')]").isNotEmpty())
                .andExpect(jsonPath("$.kpi.enrichmentTasks").value(0))
                .andExpect(jsonPath("$.contentCounts.mockExamMaterials").doesNotExist());
        mvc.perform(asAdmin(get("/api/admin/assessment/overview"), OPERATOR).param("schoolId", "school_none"))
                .andExpect(jsonPath("$.evaluationPlans.documents").value(0));
        mvc.perform(get("/api/admin/assessment/overview")).andExpect(status().isUnauthorized());
        mvc.perform(asStudent(get("/api/admin/assessment/overview"), "stu_001")).andExpect(status().isUnauthorized());
    }
}
