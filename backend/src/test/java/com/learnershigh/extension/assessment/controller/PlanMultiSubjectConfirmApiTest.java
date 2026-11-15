package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.EvaluationPlanApiTest.OPERATOR;
import static com.learnershigh.extension.assessment.controller.EvaluationPlanApiTest.PLANS;
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
import java.util.Map;
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
 * A10 다과목 PDF 확정값 ↔ 분석 과목 연결 (§39 PUT review, reviewedSubjects[].analysisSubjectIndex 선택 항목).
 * 분석 결과는 합성 Fixture다. 한 PDF에 과목 4개: 통합과학2(수행 2) · 통합사회2(수행 1, 이름이 비슷함) ·
 * 과학탐구실험2(수행 3) · 과학탐구실험2 심화(이름이 겹침, 수행 1). 과목별 채점기준도 서로 다르다.
 * 같은 과목명이 한 결과 안에 반복되면 기존 수신 규칙대로 거절된다(과목을 이름으로 구분할 수 없으므로 저장하지 않음).
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.analysis-import.enabled=true", "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class PlanMultiSubjectConfirmApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
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

    static String subject(String name, int items, String rubricElement) {
        StringBuilder list = new StringBuilder();
        for (int i = 0; i < items; i++) {
            if (i > 0) {
                list.append(',');
            }
            list.append("""
                    {"itemKey":"performance_%02d","label":"%s 수행 %d","timing":"%d월","weightPercent":10,"maxScore":%d,
                     "rubric":[{"element":"%s %d","levels":[{"description":"기준 %d","score":10}],"sources":[{"pdfPageNumber":2}]}],
                     "sources":[{"pdfPageNumber":2}]}""".formatted(i + 1, name, i + 1, 9 + i, 20 + i, rubricElement, i + 1, i + 1));
        }
        return """
                {"subjectName":"%s","pageRange":{"from":1,"to":2},
                 "writtenEvaluation":{"weightPercent":60,"sources":[{"pdfPageNumber":1}],"exams":[]},
                 "performanceEvaluation":{"weightPercent":40,"sources":[{"pdfPageNumber":2}],"items":[%s]},
                 "sources":[{"pdfPageNumber":1}]}""".formatted(name, list);
    }

    static String analysis(String sha) {
        return analysis(sha, "과학탐구실험2 심화");
    }

    static String analysis(String sha, String fourthName) {
        return """
                {"analyzer":{"name":"curriculum-analysis","version":"v20-test"},
                 "source":{"sha256":"%s","pageCount":2},"status":"REVIEW_REQUIRED",
                 "subjects":[%s,%s,%s,%s],"warnings":[]}""".formatted(sha,
                subject("통합과학2", 2, "탐구 설계"), subject("통합사회2", 1, "자료 해석"),
                subject("과학탐구실험2", 3, "실험 안전"), subject(fourthName, 1, "보고서"));
    }

    record Doc(String planId, String revisionId, String analysisId) {
        String path(String tail) {
            return PLANS + "/" + planId + "/revisions/" + revisionId + tail;
        }
    }

    Doc registerAndImport() throws Exception {
        byte[] bytes = pdf(2, "multi-subject");
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", "2026_다과목_평가계획(합성).pdf", "application/pdf", bytes)),
                        OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String planId = JsonPath.read(body, "$.planId");
        String revisionId = JsonPath.read(body, "$.documentRevisionId");
        String imported = mvc.perform(asAdmin(post(PLANS + "/" + planId + "/revisions/" + revisionId + "/analysis-imports"),
                        OPERATOR).contentType(MediaType.APPLICATION_JSON).content(analysis(sha256(bytes))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new Doc(planId, revisionId, JsonPath.read(imported, "$.analysisId"));
    }

    static String field(String path, Object value) {
        return "{\"fieldPath\":\"%s\",\"value\":%s,\"pdfPageNumber\":2}".formatted(path, value);
    }

    static String reviewed(String subjectId, Integer index, String... fields) {
        return "{\"subjectId\":\"%s\"%s,\"confirmedFields\":[%s]}".formatted(subjectId,
                index == null ? "" : ",\"analysisSubjectIndex\":" + index, String.join(",", fields));
    }

    String confirmBody(Doc doc, String... subjects) {
        return "{\"analysisId\":\"%s\",\"decision\":\"CONFIRM\",\"reviewedSubjects\":[%s]}"
                .formatted(doc.analysisId(), String.join(",", subjects));
    }

    @Test
    void 다과목_PDF는_확정_시점의_분석_과목_번호를_저장하고_초안이_닫힌_뒤에도_과목별로_돌려준다() throws Exception {
        Doc doc = registerAndImport();

        // 범위 밖 번호·같은 번호 두 번은 거절, 아무것도 저장하지 않는다
        mvc.perform(asAdmin(put(doc.path("/review")), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(confirmBody(doc, reviewed("subj_02", 4, field("performanceEvaluation.weightPercent", 40)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("reviewedSubjects[0].analysisSubjectIndex"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("unknown"));
        mvc.perform(asAdmin(put(doc.path("/review")), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(confirmBody(doc,
                                reviewed("subj_02", 2, field("performanceEvaluation.weightPercent", 40)),
                                reviewed("subj_04", 2, field("performanceEvaluation.weightPercent", 40)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("reviewedSubjects[1].analysisSubjectIndex"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("duplicate"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).isZero();

        // 검토 초안(과목 연결 포함)을 저장한 뒤 확정 — 확정이 초안을 닫는다
        mvc.perform(asAdmin(put(doc.path("/review-draft")), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","baseVersion":null,"decisions":[],"subjectLinks":[{"subjectIndex":0,"subjectId":"subj_02"}]}"""
                        .formatted(doc.analysisId())))
                .andExpect(status().isOk());

        // 일부 과목만 확정: 분석 과목 3(같은 이름 반복)은 확정하지 않는다. 번호는 이름이 아니라 관리자가 고른 분석 과목이다.
        String confirmed = mvc.perform(asAdmin(put(doc.path("/review")), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(confirmBody(doc,
                                reviewed("subj_02", 0, field("performanceEvaluation.weightPercent", 40),
                                        field("performanceEvaluation.items[1].maxScore", 21)),
                                reviewed("subj_03", 1, field("performanceEvaluation.weightPercent", 30)),
                                reviewed("subj_04", 2, field("performanceEvaluation.items[2].maxScore", 22)))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(indexBySubject(JsonPath.read(confirmed, "$.confirmedFields")))
                .containsEntry("subj_02", 0).containsEntry("subj_03", 1).containsEntry("subj_04", 2).hasSize(3);
        assertThat(jdbc.queryForList("select analysis_subject_index from assessment_plan_confirmed_value order by position", Integer.class))
                .containsExactly(0, 0, 1, 2);
        assertThat(jdbc.queryForList("select distinct evidence_format from assessment_plan_confirmed_value", String.class))
                .containsExactly("PDF");

        // 초안은 닫혔다(확정 뒤 저장 불가) — 다시 읽어도(새로고침) 과목 연결은 확정값에 남아 있다
        mvc.perform(asAdmin(get(doc.path("/review-draft")), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.status").value("CLOSED"));
        String reread = mvc.perform(asAdmin(get(doc.path("/analysis")), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subjects.length()").value(4))
                .andExpect(jsonPath("$.subjects[2].performanceEvaluation.items.length()").value(3))
                .andExpect(jsonPath("$.subjects[3].performanceEvaluation.items.length()").value(1))
                .andExpect(jsonPath("$.subjects[1].performanceEvaluation.items[0].rubric[0].element").value("자료 해석 1"))
                .andReturn().getResponse().getContentAsString();
        assertThat(indexBySubject(JsonPath.read(reread, "$.confirmedFields")))
                .containsEntry("subj_02", 0).containsEntry("subj_03", 1).containsEntry("subj_04", 2);
        assertThat(confirmed).doesNotContain("documentLocator", "sourceReview", "absence");

        // 학생: 자기 과목 ID별 확정값만, 관리자용 분석 과목 번호는 내보내지 않는다
        String student = mvc.perform(asStudent(get("/api/student/assessment/evaluation-plans/" + doc.planId()), "stu_001"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(student).doesNotContain("analysisSubjectIndex");
        List<Map<String, Object>> studentFields = JsonPath.read(student, "$..confirmedFields[*]");
        assertThat(studentFields).extracting(f -> f.get("subjectId")).containsOnly("subj_02", "subj_03", "subj_04");
        assertThat(studentFields).filteredOn(f -> "subj_04".equals(f.get("subjectId")))
                .extracting(f -> f.get("fieldPath")).containsExactly("performanceEvaluation.items[2].maxScore");
    }

    @Test
    void 한_결과_안에_같은_과목명이_반복되면_수신을_거절한다() throws Exception {
        byte[] bytes = pdf(2, "repeat-name");
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", "반복과목(합성).pdf", "application/pdf", bytes)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(asAdmin(post(PLANS + "/" + JsonPath.read(body, "$.planId") + "/revisions/"
                                + JsonPath.read(body, "$.documentRevisionId") + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(analysis(sha256(bytes), "과학탐구실험2")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("subjects[3].subjectName"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("duplicate"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_analysis_run", Integer.class)).isZero();
    }

    @Test
    void 과목_번호_없이_확정한_PDF는_이전과_같이_연결_정보_없이_저장된다() throws Exception {
        Doc doc = registerAndImport();
        String confirmed = mvc.perform(asAdmin(put(doc.path("/review")), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(confirmBody(doc, reviewed("subj_02", null, field("performanceEvaluation.weightPercent", 40)))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(confirmed).doesNotContain("analysisSubjectIndex");
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_confirmed_value where analysis_subject_index is null",
                Integer.class)).isEqualTo(1);
    }

    @SuppressWarnings("unchecked")
    static Map<String, Integer> indexBySubject(Object fields) {
        Map<String, Integer> out = new java.util.LinkedHashMap<>();
        for (Map<String, Object> f : (List<Map<String, Object>>) fields) {
            out.put((String) f.get("subjectId"), (Integer) f.get("analysisSubjectIndex"));
        }
        return out;
    }
}
