package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * A7 학년도별 평가계획서 비교 (§38-5 DRAFT, 2026-11-15). 2024·2025·2026학년도 문서를 각각 등록·분석·확정한 뒤 확정값만 비교한다.
 * Stub 분석기가 계정 B v21.1 0.2 결과 Fixture를 받은 원문 SHA로 돌려준다(합성). 과거 학년도 슬롯은 개발용 Mock(2025는 과목 ID 유지,
 * 2024는 이름이 비슷한 다른 과목 ID).
 */
@Tag("integration")
@SpringBootTest(properties = {
    "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage",
    "assessment.analyzer.token=it-token-not-a-secret-0123456789abcdef",
    "assessment.analyzer.timeout-millis=3000",
    "assessment.analyzer.retry-delay-millis=10"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class PlanComparisonApiTest {

    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final HttpServer ANALYZER = startStub();
    static String payload;
    static byte[] pdf;

    @DynamicPropertySource
    static void analyzer(DynamicPropertyRegistry registry) {
        registry.add("assessment.analyzer.base-url", () -> "http://127.0.0.1:" + ANALYZER.getAddress().getPort());
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    static HttpServer startStub() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.setExecutor(Executors.newCachedThreadPool());
            server.createContext("/analyze-preview", exchange -> {
                byte[] body = exchange.getRequestBody().readAllBytes();
                String sha = PlanServerAnalysisApiTest.filePartSha(body, exchange.getRequestHeaders().getFirst("Content-Type"));
                String original = JsonPath.read(payload, "$.source.sha256");
                String response = PlanServerAnalysisApiTest.envelope("OK_REVIEW_REQUIRED", sha, true,
                        payload.replace(original, sha));
                byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
                exchange.sendResponseHeaders(200, bytes.length);
                exchange.getResponseBody().write(bytes);
                exchange.close();
            });
            server.start();
            return server;
        } catch (IOException failure) {
            throw new IllegalStateException(failure);
        }
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
        payload = new String(MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/analysis-import.json"),
                StandardCharsets.UTF_8);
    }

    record Doc(String planId, String revisionId, String analysisId) {
    }

    static byte[] variant(String tag) {
        return (new String(pdf, StandardCharsets.ISO_8859_1) + "\n% " + tag + "\n").getBytes(StandardCharsets.ISO_8859_1);
    }

    Doc registerAndAnalyze(int year, byte[] bytes) throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "plan-" + year + ".pdf",
                                "application/octet-stream", bytes)), "adm_plan_operator")
                        .param("schoolId", "school_001").param("academicYear", String.valueOf(year))
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String planId = JsonPath.read(body, "$.planId");
        String revisionId = JsonPath.read(body, "$.documentRevisionId");
        String analysis = mvc.perform(asAdmin(post(PLANS + "/" + planId + "/revisions/" + revisionId + "/analysis"),
                        "adm_plan_operator"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new Doc(planId, revisionId, JsonPath.read(analysis, "$.analysisId"));
    }

    void confirm(Doc doc, String subjectId, String fields) throws Exception {
        mvc.perform(asAdmin(put(PLANS + "/" + doc.planId() + "/revisions/" + doc.revisionId() + "/review"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"%s","confirmedFields":[%s]}]}"""
                                .formatted(doc.analysisId(), subjectId, fields)))
                .andExpect(status().isOk());
    }

    static String field(String path, String valueJson, Integer page) {
        return "{\"fieldPath\":\"" + path + "\",\"value\":" + valueJson + ",\"pdfPageNumber\":" + page + "}";
    }

    /** 2024(다른 과목 ID) · 2025 · 2026 세 학년도를 각각 확정한다 */
    void threeYears() throws Exception {
        confirm(registerAndAnalyze(2024, variant("y2024")), "subj24_02", String.join(",",
                field("writtenEvaluation.weightPercent", "50", 1), field("performanceEvaluation.weightPercent", "50", 1),
                field("performanceEvaluation.items[0].label", "\"탐구 보고서\"", 1),
                field("performanceEvaluation.items[0].weightPercent", "25", 1),
                field("performanceEvaluation.items[1].label", "\"토론 활동\"", 2),
                field("performanceEvaluation.items[1].weightPercent", "25", 2)));
        confirm(registerAndAnalyze(2025, variant("y2025")), "subj_02", String.join(",",
                field("writtenEvaluation.weightPercent", "40", 1), field("performanceEvaluation.weightPercent", "60", 1),
                field("performanceEvaluation.items[0].label", "\"탐구  보고서 \"", 1),
                field("performanceEvaluation.items[0].weightPercent", "30", 1),
                field("performanceEvaluation.items[0].timing", "\"4월\"", 1),
                field("performanceEvaluation.items[1].label", "\"토론 활동\"", 2),
                field("performanceEvaluation.items[1].weightPercent", "30", 2)));
        confirm(registerAndAnalyze(2026, variant("y2026")), "subj_02", String.join(",",
                field("writtenEvaluation.weightPercent", "40", 1), field("performanceEvaluation.weightPercent", "60", 1),
                field("performanceEvaluation.items[0].label", "\"탐구 보고서\"", 1),
                field("performanceEvaluation.items[0].weightPercent", "30", 1),
                field("performanceEvaluation.items[0].timing", "\"4월\"", 1),
                field("performanceEvaluation.items[1].label", "\"발표 활동\"", 2),
                field("performanceEvaluation.items[1].weightPercent", "30", 2)));
    }

    MockHttpServletRequestBuilder compare(String... extra) {
        MockHttpServletRequestBuilder request = asAdmin(get(PLANS + "/comparison"), "adm_gangnam")
                .param("schoolId", "school_001").param("grade", "1").param("semester", "2");
        for (int i = 0; i < extra.length; i += 2) {
            request.param(extra[i], extra[i + 1]);
        }
        return request;
    }

    @Test
    void 세_학년도의_확정값을_비교해_비율_변화_항목_추가_삭제와_명칭_변경_가능성을_보여_준다() throws Exception {
        threeYears();
        String body = mvc.perform(compare("years", "2024", "years", "2025", "years", "2026",
                        "subjects", "2024:subj24_02", "subjects", "2025:subj_02", "subjects", "2026:subj_02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.basis").value("CONFIRMED_ONLY"))
                .andExpect(jsonPath("$.columns[*].status").value(contains("CONFIRMED", "CONFIRMED", "CONFIRMED")))
                .andExpect(jsonPath("$.columns[0].subjectName").value("통합과학"))
                .andExpect(jsonPath("$.columns[2].subjectName").value("통합과학2"))
                // 수행평가 반영비율 50 → 60 → 60
                .andExpect(jsonPath("$.rows[?(@.key == 'performanceEvaluation.weightPercent')].transitions[*].status")
                        .value(contains("CHANGED", "SAME")))
                .andExpect(jsonPath("$.rows[?(@.key == 'performanceEvaluation.weightPercent')].status").value(contains("CHANGED")))
                // 채점기준은 비교하지 않는다
                .andExpect(jsonPath("$.rows[?(@.key == 'performanceEvaluation.rubric')].status").value(contains("NOT_COMPARABLE")))
                // 이름 공백만 다른 '탐구 보고서'는 같은 항목: 2024→2025 반영 25→30(CHANGED), 2025→2026 SAME
                .andExpect(jsonPath("$.items[?(@.label == '탐구 보고서')].transitions[*].status").value(contains("CHANGED", "SAME")))
                // '토론 활동'이 빠지고 '발표 활동'이 생김 → 확정하지 않고 '명칭 변경 가능성'
                .andExpect(jsonPath("$.items[?(@.label == '토론 활동')].transitions[1].status").value(contains("POSSIBLE_RENAME")))
                .andExpect(jsonPath("$.items[?(@.label == '발표 활동')].transitions[1].status").value(contains("POSSIBLE_RENAME")))
                .andExpect(jsonPath("$.items[?(@.label == '발표 활동')].cells[0].state").value(contains("MISSING")))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("candidate").doesNotContain("REVIEW_REQUIRED");
    }

    @Test
    void 없는_학년도와_미확정_문서는_비교하지_않고_상태로_알린다() throws Exception {
        threeYears();
        registerAndAnalyze(2023, variant("y2023")); // 분석만, 확정 안 함
        mvc.perform(compare("years", "2022", "years", "2023", "years", "2026",
                        "subjects", "2023:subj_02", "subjects", "2026:subj_02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.columns[*].status").value(contains("NO_PLAN", "NOT_CONFIRMED", "CONFIRMED")))
                .andExpect(jsonPath("$.columns[1].revisionId").doesNotExist())
                .andExpect(jsonPath("$.rows[?(@.key == 'performanceEvaluation.weightPercent')].cells[1].state")
                        .value(contains("NOT_AVAILABLE")))
                .andExpect(jsonPath("$.rows[?(@.key == 'performanceEvaluation.weightPercent')].status")
                        .value(contains("NOT_COMPARABLE")));
    }

    @Test
    void 이름이_비슷한_다른_학년도_과목을_자동으로_맞추지_않는다() throws Exception {
        threeYears();
        // 2024 슬롯에는 subj_02가 없다(교육과정이 다른 '통합과학' = subj24_02) → 같은 ID라고 맞추지 않는다
        mvc.perform(compare("years", "2024", "years", "2026", "subjects", "2024:subj_02", "subjects", "2026:subj_02"))
                .andExpect(jsonPath("$.columns[0].status").value("SUBJECT_UNKNOWN"))
                .andExpect(jsonPath("$.columns[0].subjects[*].subjectId").value(hasItem("subj24_02")));
        // 과목을 고르지 않으면 자동 선택하지 않는다
        mvc.perform(compare("years", "2024", "years", "2026", "subjects", "2026:subj_02"))
                .andExpect(jsonPath("$.columns[0].status").value("NO_SUBJECT_SELECTED"))
                .andExpect(jsonPath("$.columns[0].subjects[?(@.subjectId == 'subj24_02')].confirmed").value(contains(true)));
    }

    @Test
    void 같은_원문이_다른_학년도에_등록되면_경고한다() throws Exception {
        byte[] same = variant("same-file");
        confirm(registerAndAnalyze(2024, same), "subj24_02", field("performanceEvaluation.weightPercent", "50", 1));
        confirm(registerAndAnalyze(2025, same), "subj_02", field("performanceEvaluation.weightPercent", "50", 1));
        mvc.perform(compare("years", "2024", "years", "2025", "subjects", "2024:subj24_02", "subjects", "2025:subj_02"))
                .andExpect(jsonPath("$.warnings.length()").value(1))
                .andExpect(jsonPath("$.warnings[0]").value(org.hamcrest.Matchers.containsString("SHA-256")));
    }

    @Test
    void 학년도_수와_형식을_검사하고_학생과_인증_없는_요청은_401() throws Exception {
        mvc.perform(compare("years", "2026")).andExpect(status().isBadRequest());
        mvc.perform(compare("years", "2025", "years", "2026", "subjects", "2026-subj_02")).andExpect(status().isBadRequest());
        mvc.perform(get(PLANS + "/comparison").param("schoolId", "school_001").param("grade", "1").param("semester", "2")
                .param("years", "2025", "2026")).andExpect(status().isUnauthorized());
        mvc.perform(asStudent(get(PLANS + "/comparison"), "stu_001").param("schoolId", "school_001").param("grade", "1")
                .param("semester", "2").param("years", "2025", "2026")).andExpect(status().isUnauthorized());
    }
}
