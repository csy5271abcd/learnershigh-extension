package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CompletableFuture;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A5 관리자 공유 검토 초안 (DRAFT §39-4, 2026-11-14). 분석 결과는 계정 B 분석기 v21.1 Fixture(합성 PDF)를 Run으로 넣어 쓴다.
 * 초안 ≠ 확정값 ≠ 학생 공개값을 확인한다.
 */
@Tag("integration")
@SpringBootTest(properties = "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage")
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class PlanReviewDraftApiTest {

    static final String PLANS = "/api/admin/assessment/evaluation-plans";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    JsonMapper mapper;

    String planId;
    String revisionId;
    String analysisId;

    @BeforeEach
    void setUp() throws Exception {
        jdbc.update("delete from assessment_school_assessment");
        jdbc.update("delete from assessment_plan_review_draft");
        jdbc.update("delete from assessment_plan_confirmed_value");
        jdbc.update("delete from assessment_plan_review");
        jdbc.update("delete from assessment_plan_analysis_run");
        jdbc.update("delete from assessment_plan_revision");
        jdbc.update("delete from assessment_evaluation_plan");
        byte[] pdf = MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/synthetic-e2e.pdf");
        String body = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "synthetic-e2e.pdf",
                                "application/pdf", pdf)), "adm_plan_operator")
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        planId = JsonPath.read(body, "$.planId");
        revisionId = JsonPath.read(body, "$.documentRevisionId");
        analysisId = insertRun("run_a5_first", "a".repeat(64), "2026-11-14 01:00:00");
    }

    /** Fixture payload의 subjects를 결과로 가진 Run (서버 분석 Stub 대신 직접 넣는다) */
    String insertRun(String id, String payloadSha, String receivedAt) throws Exception {
        String payload = new String(MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/analysis-import.json"),
                StandardCharsets.UTF_8);
        JsonNode subjects = mapper.readTree(payload).get("subjects");
        jdbc.update("""
                insert into assessment_plan_analysis_run (id, revision_id, status, origin, analyzer_name, analyzer_version,
                  payload_sha256, result_json, warnings_json, received_by, received_at)
                values (?, ?, 'PARTIAL', 'SERVER_ANALYZER', 'curriculum-analysis', 'v21.1/backend-adapter-0.2', ?, ?, '[]', 'adm_plan_operator', ?)""",
                id, revisionId, payloadSha, mapper.writeValueAsString(subjects), receivedAt);
        return id;
    }

    String draftPath() {
        return PLANS + "/" + planId + "/revisions/" + revisionId + "/review-draft";
    }

    String body(String analysis, Long baseVersion, String weight, String subjectId) {
        return """
                {"analysisId":"%s","baseVersion":%s,
                 "decisions":[
                   {"subjectIndex":0,"fieldPath":"performanceEvaluation.weightPercent","decision":"EDITED","value":"%s","pdfPageNumber":1},
                   {"subjectIndex":0,"fieldPath":"performanceEvaluation.items[0].label","decision":"CONFIRMED","value":"탐구 보고서","pdfPageNumber":2}],
                 "subjectLinks":[{"subjectIndex":0,"subjectId":"%s"}]}""".formatted(analysis, baseVersion == null ? "null" : baseVersion, weight, subjectId);
    }

    @Test
    void 공유_초안을_저장하고_다른_관리자가_같은_초안을_이어서_저장한다() throws Exception {
        mvc.perform(asAdmin(put(draftPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(body(analysisId, null, "55", "subj_02")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latestAnalysisId").value(analysisId))
                .andExpect(jsonPath("$.draft.version").value(0))
                .andExpect(jsonPath("$.draft.status").value("ACTIVE"))
                .andExpect(jsonPath("$.draft.decisionCount").value(2))
                // 후보값은 서버가 분석 결과에서 읽는다
                .andExpect(jsonPath("$.draft.decisions[0].candidate").value(60))
                .andExpect(jsonPath("$.draft.decisions[0].value").value("55"))
                .andExpect(jsonPath("$.draft.updatedBy").value("adm_plan_operator"));

        // 다른 관리자(다른 브라우저)도 같은 초안을 본다
        mvc.perform(asAdmin(get(draftPath()), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.version").value(0))
                .andExpect(jsonPath("$.draft.subjectLinks[0].subjectId").value("subj_02"))
                .andExpect(jsonPath("$.history.length()").value(1))
                .andExpect(jsonPath("$.history[0].savedBy").value("adm_plan_operator"))
                .andExpect(jsonPath("$.history[0].changedCount").value(3));

        mvc.perform(asAdmin(put(draftPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(body(analysisId, 0L, "50", "subj_02")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.version").value(1))
                .andExpect(jsonPath("$.draft.createdBy").value("adm_plan_operator"))
                .andExpect(jsonPath("$.draft.updatedBy").value("adm_gangnam"))
                .andExpect(jsonPath("$.history.length()").value(2))
                .andExpect(jsonPath("$.history[0].savedBy").value("adm_gangnam"))
                .andExpect(jsonPath("$.history[0].changedFields[0]").value("0|performanceEvaluation.weightPercent"));
    }

    @Test
    void 오래된_version으로_저장하면_409이고_다른_관리자의_값을_덮어쓰지_않는다() throws Exception {
        mvc.perform(asAdmin(put(draftPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                .content(body(analysisId, null, "55", "subj_02"))).andExpect(status().isOk());
        mvc.perform(asAdmin(put(draftPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                .content(body(analysisId, 0L, "50", "subj_02"))).andExpect(status().isOk());

        // 다른 관리자가 version 0을 보고 저장 → 충돌
        mvc.perform(asAdmin(put(draftPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(body(analysisId, 0L, "99", "subj_02")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PLAN_REVIEW_DRAFT_CONFLICT"))
                .andExpect(jsonPath("$.details.currentVersion").value(1))
                .andExpect(jsonPath("$.details.updatedBy").value("adm_gangnam"));
        // 초안이 있는데 '새 초안'으로 저장 → 충돌
        mvc.perform(asAdmin(put(draftPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(body(analysisId, null, "99", "subj_02")))
                .andExpect(status().isConflict());

        mvc.perform(asAdmin(get(draftPath()), "adm_plan_operator"))
                .andExpect(jsonPath("$.draft.version").value(1))
                .andExpect(jsonPath("$.draft.decisions[0].value").value("50"));
    }

    @Test
    void 같은_version으로_동시에_저장하면_하나만_반영된다() throws Exception {
        mvc.perform(asAdmin(put(draftPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                .content(body(analysisId, null, "55", "subj_02"))).andExpect(status().isOk());
        List<CompletableFuture<Integer>> calls = List.of("70", "80").stream()
                .map(weight -> CompletableFuture.supplyAsync(() -> {
                    try {
                        return mvc.perform(asAdmin(put(draftPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                                .content(body(analysisId, 0L, weight, "subj_02"))).andReturn().getResponse().getStatus();
                    } catch (Exception failure) {
                        throw new IllegalStateException(failure);
                    }
                }))
                .toList();
        List<Integer> statuses = calls.stream().map(CompletableFuture::join).sorted().toList();
        assertThat(statuses).containsExactly(200, 409);
        assertThat(jdbc.queryForObject("select version from assessment_plan_review_draft", Long.class)).isEqualTo(1L);
        assertThat(jdbc.queryForObject("select json_length(history_json) from assessment_plan_review_draft", Integer.class)).isEqualTo(2);
    }

    @Test
    void 허용되지_않은_경로_범위_밖_과목_원문에_없음의_값은_400() throws Exception {
        String bad = """
                {"analysisId":"%s","baseVersion":null,
                 "decisions":[
                   {"subjectIndex":0,"fieldPath":"subjects.secret","decision":"CONFIRMED","value":"x","pdfPageNumber":1},
                   {"subjectIndex":5,"fieldPath":"performanceEvaluation.weightPercent","decision":"CONFIRMED","value":"60","pdfPageNumber":1},
                   {"subjectIndex":0,"fieldPath":"performanceEvaluation.maxScore","decision":"ABSENT","value":"100","pdfPageNumber":null},
                   {"subjectIndex":0,"fieldPath":"writtenEvaluation.weightPercent","decision":"CONFIRMED","value":"40","pdfPageNumber":9}],
                 "subjectLinks":[]}""".formatted(analysisId);
        mvc.perform(asAdmin(put(draftPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON).content(bad))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[?(@.field == 'decisions[0].fieldPath')].reason").value(org.hamcrest.Matchers.contains("not_allowed")))
                .andExpect(jsonPath("$.details.fields[?(@.field == 'decisions[1].subjectIndex')].reason").value(org.hamcrest.Matchers.contains("out_of_range")))
                .andExpect(jsonPath("$.details.fields[?(@.field == 'decisions[2].value')].reason").value(org.hamcrest.Matchers.contains("not_allowed")))
                .andExpect(jsonPath("$.details.fields[?(@.field == 'decisions[3].pdfPageNumber')].reason").value(org.hamcrest.Matchers.contains("out_of_range")));
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review_draft", Integer.class)).isZero();
    }

    @Test
    void 재분석되면_이전_초안은_보존만_하고_새_결과에_적용하지_않는다() throws Exception {
        mvc.perform(asAdmin(put(draftPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                .content(body(analysisId, null, "55", "subj_02"))).andExpect(status().isOk());
        String second = insertRun("run_a5_second", "b".repeat(64), "2026-11-14 02:00:00");

        mvc.perform(asAdmin(get(draftPath()), "adm_plan_operator"))
                .andExpect(jsonPath("$.latestAnalysisId").value(second))
                .andExpect(jsonPath("$.draft").doesNotExist())
                .andExpect(jsonPath("$.previousDrafts.length()").value(1))
                .andExpect(jsonPath("$.previousDrafts[0].analysisId").value(analysisId))
                .andExpect(jsonPath("$.previousDrafts[0].decisionCount").value(2));
        // 예전 결과로 저장 시도 → 409 STALE (덮어쓰지 않음)
        mvc.perform(asAdmin(put(draftPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(body(analysisId, 0L, "66", "subj_02")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PLAN_REVIEW_DRAFT_STALE"))
                .andExpect(jsonPath("$.details.latestAnalysisId").value(second));
        assertThat(jdbc.queryForObject("select payload_json from assessment_plan_review_draft where analysis_id = ?", String.class, analysisId))
                .contains("\"55\"");
    }

    @Test
    void 초안은_학생에게_공개되지_않고_확정되면_닫히며_확정값만_공개된다() throws Exception {
        mvc.perform(asAdmin(put(draftPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                .content(body(analysisId, null, "77", "subj_02"))).andExpect(status().isOk());
        String student = "/api/student/assessment/evaluation-plans/" + planId;
        mvc.perform(asStudent(get(student), "stu_001")).andExpect(status().isNotFound());

        mvc.perform(asAdmin(put(PLANS + "/" + planId + "/revisions/" + revisionId + "/review"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":55,"pdfPageNumber":1}]}]}""".formatted(analysisId)))
                .andExpect(status().isOk());

        mvc.perform(asAdmin(get(draftPath()), "adm_plan_operator"))
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.draft.status").value("CLOSED"))
                .andExpect(jsonPath("$.draft.closedReason").value("CONFIRMED"));
        mvc.perform(asAdmin(put(draftPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(body(analysisId, 0L, "88", "subj_02")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("already_confirmed"));

        String body = mvc.perform(asStudent(get(student), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmedFields.length()").value(1))
                .andReturn().getResponse().getContentAsString();
        // 초안 값(77)·초안 정보는 학생 응답에 없다
        assertThat(body).doesNotContain("\"value\":77").doesNotContain("draft").doesNotContain("candidate");
    }

    @Test
    void 인증_없음과_학생은_401() throws Exception {
        mvc.perform(get(draftPath())).andExpect(status().isUnauthorized());
        mvc.perform(asStudent(get(draftPath()), "stu_001")).andExpect(status().isUnauthorized());
        mvc.perform(asStudent(put(draftPath()), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content(body(analysisId, null, "55", "subj_02"))).andExpect(status().isUnauthorized());
    }
}
