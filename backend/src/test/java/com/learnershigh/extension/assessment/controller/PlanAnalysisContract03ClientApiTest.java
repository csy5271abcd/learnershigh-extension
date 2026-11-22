package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.service.plan.PlanAnalysisService;
import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerClient;
import com.learnershigh.extension.assessment.integration.analysis.StubPlanAnalyzer;
import com.learnershigh.extension.support.MySqlContainerConfig;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import java.nio.charset.StandardCharsets;
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
 * A8 (2026-11-15): Backend → 분석기 0.3 요청 경계. 0.3 Gate가 켜졌을 때만 multipart에 contract=0.3 + analyzerVersion=v21.4-dev를 보내고,
 * 계정 B B6 응답 규칙(0.3 실패는 HTTP 422 본문 Envelope)을 HTTP 코드와 분석 상태로 나눠 처리한다. 0.2로 조용히 대체하지 않는다.
 * Stub은 계정 B B6 응답 모양을 흉내 낸다(합성 Fixture). 실제 B6 연결 검증은 A8 보고서의 실분석기 E2E에 따로 기록한다.
 */
@Tag("integration")
@SpringBootTest(properties = {
    "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage",
    "assessment.analysis-import.contract03-enabled=true"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class PlanAnalysisContract03ClientApiTest {

    static final String PLANS = "/api/admin/assessment/evaluation-plans";

    enum Mode { OK03, FAILED_422, PAYLOAD_02, REJECT_400, NO_RESULT_200 }

    static volatile Mode mode = Mode.OK03;
    static final StubPlanAnalyzer ANALYZER = new StubPlanAnalyzer(PlanAnalysisContract03ClientApiTest::respond);
    static String payload03;
    static String payload02;
    static byte[] pdf;

    /** 서버 분석기 자리에 Envelope 를 돌려주는 시험용 분석기를 넣는다. */
    @TestConfiguration
    static class AnalyzerStub {
        @Bean
        @Primary
        PlanAnalyzerClient stubPlanAnalyzer() {
            return ANALYZER;
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    static String envelope03(String status, String analyzerStatus, String sha, String payload) {
        return """
                {"ok":true,"status":"%s","analyzerStatus":"%s","contractVersion":"0.3","analyzerVersion":"v21.4-dev",
                 "analyzerChannel":"EXPERIMENTAL_DEV","source":{"sha256":"%s"},
                 "backendImport":{"variant":"CONTRACT03_DEV","contractVersion":"0.3","importable":true,"blockers":[],
                   "payload":%s,"localValidation":{"ok":true,"violations":[]},"adapterReport":{"dropped":[]}},
                 "warnings":["EXPERIMENTAL/DEV: stub"],"errors":[],"elapsedMs":1}""".formatted(status, analyzerStatus, sha, payload);
    }

    static String failed03(String sha, String reason) {
        return """
                {"contractVersion":"0.3","analyzer":{"name":"curriculum-analysis","version":"v21.4-dev/stub","profile":"v21.4-dev"},
                 "source":{"sha256":"%s","pageCount":2},"status":"FAILED","failureReason":"%s","subjects":[],"warnings":[]}"""
                .formatted(sha, reason);
    }

    static StubPlanAnalyzer.Reply respond(PlanAnalyzerClient.Request request) {
        String sha;
        try {
            sha = PlanServerAnalysisApiTest.sha256(request.bytes());
        } catch (Exception broken) {
            throw new IllegalStateException(broken);
        }
        return switch (mode) {
            case OK03 -> StubPlanAnalyzer.Reply.ok(envelope03("PARTIAL", "PARTIAL", sha, swap(payload03, sha)));
            case FAILED_422 -> new StubPlanAnalyzer.Reply(422,
                    envelope03("PARSE_FAILED", "PARSE_FAILED", sha, failed03(sha, "PARSE_FAILED")));
            case NO_RESULT_200 -> StubPlanAnalyzer.Reply.ok(envelope03("NO_ASSESSMENTS_EXTRACTED", "NO_ASSESSMENTS_EXTRACTED", sha,
                    failed03(sha, "NO_ASSESSMENTS_EXTRACTED")));
            case PAYLOAD_02 -> StubPlanAnalyzer.Reply.ok(
                    PlanServerAnalysisApiTest.envelope("OK_REVIEW_REQUIRED", sha, true, swap(payload02, sha)));
            case REJECT_400 -> new StubPlanAnalyzer.Reply(400,
                    "{\"ok\":false,\"status\":\"ERROR\",\"errors\":[{\"code\":\"CONTRACT_PROFILE_MISMATCH\"}]}");
        };
    }

    static String swap(String payload, String sha) {
        return payload.replace(JsonPath.<String>read(payload, "$.source.sha256"), sha);
    }

    @BeforeEach
    void setUp() throws Exception {
        jdbc.update("delete from assessment_plan_teaching_plan_row");
        jdbc.update("delete from assessment_plan_teaching_plan_review");
        jdbc.update("delete from assessment_plan_review_draft_event");
        jdbc.update("delete from assessment_plan_review_draft");
        jdbc.update("delete from assessment_school_assessment");
        jdbc.update("delete from assessment_plan_confirmed_value");
        jdbc.update("delete from assessment_plan_review");
        jdbc.update("delete from assessment_plan_analysis_run");
        jdbc.update("delete from assessment_plan_revision");
        jdbc.update("delete from assessment_evaluation_plan");
        pdf = MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/synthetic-e2e.pdf");
        payload03 = new String(MultiformatExperimentalApiTest.resource("/assessment/contract03/synthetic-0.3.analysis-import.json"),
                StandardCharsets.UTF_8);
        payload02 = new String(MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/analysis-import.json"),
                StandardCharsets.UTF_8);
        mode = Mode.OK03;
    }

    String[] register() throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "synthetic-e2e.pdf",
                                "application/octet-stream", pdf)), "adm_plan_operator")
                        .param("schoolId", "school_001").param("academicYear", "2026").param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new String[] {JsonPath.read(body, "$.planId"), JsonPath.read(body, "$.documentRevisionId")};
    }

    String analysis(String[] doc) {
        return PLANS + "/" + doc[0] + "/revisions/" + doc[1] + "/analysis";
    }

    int runs() {
        return jdbc.queryForObject("select count(*) from assessment_plan_analysis_run", Integer.class);
    }

    @Test
    void Gate가_켜지면_contract_0_3과_v21_4_dev를_함께_보내고_0_3_결과를_저장한다() throws Exception {
        String[] doc = register();
        mvc.perform(asAdmin(post(analysis(doc)), "adm_plan_operator"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.analysisStatus").value("PARTIAL"))
                .andExpect(jsonPath("$.analyzer.contractVersion").value("0.3"));
        assertThat(ANALYZER.lastRequest.get().contract()).isEqualTo("0.3");
        assertThat(ANALYZER.lastRequest.get().analyzerVersion()).isEqualTo("v21.4-dev");
    }

    @Test
    void 분석기가_0_3_실패를_HTTP_422_본문으로_보내면_FAILED_Run으로_저장하고_확정할_수_없다() throws Exception {
        String[] doc = register();
        mode = Mode.FAILED_422;
        String body = mvc.perform(asAdmin(post(analysis(doc)), "adm_plan_operator"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.analysisStatus").value("FAILED"))
                .andReturn().getResponse().getContentAsString();
        mvc.perform(asAdmin(put(PLANS + "/" + doc[0] + "/revisions/" + doc[1] + "/review"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                                  {"fieldPath":"performanceEvaluation.weightPercent","value":60,"pdfPageNumber":1}]}]}"""
                                .formatted((String) JsonPath.read(body, "$.analysisId"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("analysis_failed"));
        // 0.3에서 '결과 없음'(HTTP 200)도 FAILED Run (§39-3 표) — 확정 대상 아님
        mode = Mode.NO_RESULT_200;
        String[] other = register2();
        mvc.perform(asAdmin(post(analysis(other)), "adm_plan_operator"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.analysisStatus").value("FAILED"));
    }

    String[] register2() throws Exception {
        byte[] bytes = (new String(pdf, StandardCharsets.ISO_8859_1) + "\n% other\n").getBytes(StandardCharsets.ISO_8859_1);
        String body = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "other.pdf",
                                "application/octet-stream", bytes)), "adm_plan_operator")
                        .param("schoolId", "school_001").param("academicYear", "2026").param("grade", "1").param("semester", "1"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new String[] {JsonPath.read(body, "$.planId"), JsonPath.read(body, "$.documentRevisionId")};
    }

    @Test
    void 계약_0_3을_요청했는데_0_2가_오면_저장하지_않는다_대체_없음() throws Exception {
        String[] doc = register();
        mode = Mode.PAYLOAD_02;
        mvc.perform(asAdmin(post(analysis(doc)), "adm_plan_operator"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.details.fields[0].reason").value("contract_mismatch"));
        assertThat(runs()).isZero();
    }

    @Test
    void 분석기가_0_3_요청을_거절하면_422로_알리고_0_2로_다시_요청하지_않는다() throws Exception {
        String[] doc = register();
        mode = Mode.REJECT_400;
        mvc.perform(asAdmin(post(analysis(doc)), "adm_plan_operator"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.details.fields[0].reason").value("analyzer_rejected:contract_profile_mismatch"));
        assertThat(runs()).isZero();
        assertThat(ANALYZER.lastRequest.get().contract()).isEqualTo("0.3");
    }

    @Test
    void 계약과_프로필의_잘못된_짝은_기동하지_않는다() {
        assertThatThrownBy(() -> PlanAnalysisService.checkProfiles("v21.4-dev", "v21.4-dev")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> PlanAnalysisService.checkProfiles("v21.4-dev", "v21.5-dev")).isInstanceOf(IllegalStateException.class);
        PlanAnalysisService.checkProfiles("v21.1", "v21.4-dev");
    }
}
