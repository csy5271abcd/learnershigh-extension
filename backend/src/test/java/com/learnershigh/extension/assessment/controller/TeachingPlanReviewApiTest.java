package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
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

/**
 * A6 월별 교수·학습 운영계획 (§39-3 0.3 수신 · §39-6 확정 · §10-1-2 학생 조회, 2026-11-15 DRAFT).
 * Stub 분석기가 Envelope PARTIAL + 합성 0.3 payload(contract03/synthetic-0.3.analysis-import.json, 정밀도 8종 9행)를 돌려준다.
 * 실제 학교 문서·실제 0.3 Adapter 출력이 아니다(계정 B 미합의).
 */
@Tag("integration")
@SpringBootTest(properties = {
    "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage",
    "assessment.analyzer.token=it-token-not-a-secret-0123456789abcdef",
    "assessment.analyzer.timeout-millis=3000",
    "assessment.analyzer.retry-delay-millis=10",
    "assessment.analysis-import.contract03-enabled=true"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class TeachingPlanReviewApiTest {

    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final String STUDENT = "/api/student/assessment/evaluation-plans/";
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

    String planId;
    String revisionId;
    String analysisId;

    static HttpServer startStub() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.setExecutor(Executors.newCachedThreadPool());
            server.createContext("/analyze-preview", exchange -> {
                exchange.getRequestBody().readAllBytes();
                String sha = com.jayway.jsonpath.JsonPath.read(payload, "$.source.sha256");
                String body = """
                        {"service":{"name":"stub-analyzer"},"requestId":"stub03","ok":true,"status":"PARTIAL",
                         "analyzerVersion":"synthetic","source":{"sha256":"%s"},
                         "backendImport":{"contract":"AnalysisImportRequest","variant":"OFFICIAL_PDF","importable":true,
                           "blockers":[],"payload":%s},"warnings":[],"errors":[{"code":"TEACHING_PLAN_PARTIAL"}],
                         "elapsedMs":3}""".formatted(sha, payload);
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
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
        payload = new String(MultiformatExperimentalApiTest.resource(
                "/assessment/contract03/synthetic-0.3.analysis-import.json"), StandardCharsets.UTF_8);
        String body = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "synthetic-e2e.pdf",
                                "application/octet-stream", pdf)), "adm_plan_operator")
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        planId = JsonPath.read(body, "$.planId");
        revisionId = JsonPath.read(body, "$.documentRevisionId");
        analysisId = JsonPath.read(mvc.perform(asAdmin(post(revisionPath() + "/analysis"), "adm_plan_operator"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.analysisStatus").value("PARTIAL"))
                .andExpect(jsonPath("$.analyzer.contractVersion").value("0.3"))
                .andExpect(jsonPath("$.analyzer.profile").value("synthetic-0.3"))
                .andExpect(jsonPath("$.subjects[0].teachingPlan.length()").value(9))
                .andExpect(jsonPath("$.subjects[0].teachingPlan[3].schedule.precision").value("TERM_WEEK"))
                .andExpect(jsonPath("$.subjects[0].extraction.issues.length()").value(3))
                .andReturn().getResponse().getContentAsString(), "$.analysisId");
    }

    String revisionPath() {
        return PLANS + "/" + planId + "/revisions/" + revisionId;
    }

    void confirmEvaluation() throws Exception {
        mvc.perform(asAdmin(put(revisionPath() + "/review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02",
                                 "confirmedFields":[{"fieldPath":"performanceEvaluation.weightPercent","value":60,"pdfPageNumber":1}]}]}"""
                                .formatted(analysisId)))
                .andExpect(status().isOk());
    }

    String rows(String... rows) {
        return """
                {"analysisId":"%s","rows":[%s]}""".formatted(analysisId, String.join(",", rows));
    }

    @Test
    void 운영계획_후보는_0_3_결과에_그대로_저장되고_학생에게는_확정_전_보이지_않는다() throws Exception {
        assertThat(jdbc.queryForMap("select contract_version, analyzer_profile, status from assessment_plan_analysis_run"))
                .containsEntry("contract_version", "0.3").containsEntry("analyzer_profile", "synthetic-0.3")
                .containsEntry("status", "PARTIAL");
        mvc.perform(asAdmin(get(revisionPath() + "/teaching-plan-review"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latestAnalysisId").value(analysisId))
                .andExpect(jsonPath("$.candidateRowCount").value(9))
                .andExpect(jsonPath("$.review").doesNotExist());
        // 평가 정보 확정 전: 문서 자체가 학생에게 없다
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001")).andExpect(status().isNotFound());
        // 평가 정보만 확정: 문서는 보이지만 운영계획은 확정 전 (오류 아님)
        confirmEvaluation();
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NOT_CONFIRMED"))
                .andExpect(jsonPath("$.rows.length()").value(0));
    }

    @Test
    void 관리자가_확정한_행만_수정값으로_학생에게_공개되고_제외_행과_후보는_나가지_않는다() throws Exception {
        confirmEvaluation();
        String confirmed = mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content(rows(
                                "{\"subjectIndex\":0,\"rowKey\":\"T01\",\"subjectId\":\"subj_02\",\"decision\":\"CONFIRMED\"}",
                                "{\"subjectIndex\":0,\"rowKey\":\"T03\",\"subjectId\":\"subj_02\",\"decision\":\"EDITED\","
                                        + "\"edits\":{\"unit\":\"3. 역학 시스템(수정)\",\"note\":\"\",\"schedule\":{\"precision\":\"WEEK_IN_MONTH\","
                                        + "\"monthFrom\":10,\"monthTo\":10,\"weekLabel\":\"10월 3주\",\"weekFrom\":3,\"weekTo\":3,"
                                        + "\"weekScope\":\"IN_MONTH\",\"weekScopeBasis\":\"LABEL\"}}}",
                                "{\"subjectIndex\":0,\"rowKey\":\"T04\",\"subjectId\":\"subj_02\",\"decision\":\"CONFIRMED\"}",
                                "{\"subjectIndex\":0,\"rowKey\":\"T08\",\"subjectId\":\"subj_02\",\"decision\":\"EXCLUDED\"}",
                                "{\"subjectIndex\":0,\"rowKey\":\"T09\",\"subjectId\":\"subj_02\",\"decision\":\"CONFIRMED\"}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.review.reviewedBy").value("adm_gangnam"))
                .andExpect(jsonPath("$.review.rows.length()").value(5))
                .andExpect(jsonPath("$.review.rows[1].row.unit").value("3. 역학 시스템(수정)"))
                .andExpect(jsonPath("$.review.rows[1].candidate.unit").value("3. 역학 시스템"))
                .andReturn().getResponse().getContentAsString();
        assertThat(confirmed).contains("\"decision\":\"EXCLUDED\"");
        assertThat(jdbc.queryForList("select precision_code from assessment_plan_teaching_plan_row order by sort_order",
                String.class)).containsExactly("EXACT_DATE", "WEEK_IN_MONTH", "TERM_WEEK", "UNKNOWN", "EXACT_DATE");
        // 확정해도 분석 후보(Run)는 그대로다
        assertThat(jdbc.queryForObject("select result_json from assessment_plan_analysis_run", String.class))
                .contains("\"unit\":\"3. 역학 시스템\"").doesNotContain("(수정)");

        String student = mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.rows.length()").value(4))
                .andExpect(jsonPath("$.rows[*].rowKey").value(containsInAnyOrder("T01", "T03", "T04", "T09")))
                .andExpect(jsonPath("$.rows[1].unit").value("3. 역학 시스템(수정)"))
                .andExpect(jsonPath("$.rows[1].schedule.weekFrom").value(3))
                .andExpect(jsonPath("$.rows[2].schedule.precision").value("TERM_WEEK"))
                .andExpect(jsonPath("$.rows[3].schedule.calendarYear").value(2027))
                .andExpect(jsonPath("$.rows[0].pdfPageNumber").value(1))
                .andReturn().getResponse().getContentAsString();
        assertThat(student).doesNotContain("candidate").doesNotContain("FIELD_NOT_PROVIDED")
                .doesNotContain("extraction").doesNotContain("2차 지필평가").doesNotContain("EXCLUDED");

        // 재확정은 정책 미결 → 409
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_plan_operator")
                        .contentType(MediaType.APPLICATION_JSON).content(rows(
                                "{\"subjectIndex\":0,\"rowKey\":\"T05\",\"subjectId\":\"subj_02\",\"decision\":\"CONFIRMED\"}")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("teaching_plan_already_confirmed"));
    }

    @Test
    void 없는_행_슬롯_밖_과목_수정_누락_연도_생성은_거절하고_아무것도_저장하지_않는다() throws Exception {
        String body = mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content(rows(
                                "{\"subjectIndex\":0,\"rowKey\":\"T99\",\"subjectId\":\"subj_02\",\"decision\":\"CONFIRMED\"}",
                                "{\"subjectIndex\":0,\"rowKey\":\"T01\",\"subjectId\":\"subj_99\",\"decision\":\"CONFIRMED\"}",
                                "{\"subjectIndex\":0,\"rowKey\":\"T02\",\"subjectId\":\"subj_02\",\"decision\":\"EDITED\"}",
                                "{\"subjectIndex\":0,\"rowKey\":\"T05\",\"subjectId\":\"subj_02\",\"decision\":\"EDITED\","
                                        + "\"edits\":{\"schedule\":{\"precision\":\"EXACT_DATE\",\"dateFrom\":{\"year\":2026,\"month\":11,\"day\":2},"
                                        + "\"calendarYear\":2026,\"calendarYearBasis\":\"EXPLICIT_IN_CELL\"}}}")))
                .andExpect(status().isBadRequest())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).contains("rows[0].rowKey").contains("rows[1].subjectId").contains("rows[2].edits")
                .contains("rows[3].edits.schedule.calendarYear");
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"analysisId":"analysis_unknown","rows":[{"subjectIndex":0,"rowKey":"T01","subjectId":"subj_02","decision":"CONFIRMED"}]}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("analysisId"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_teaching_plan_review", Integer.class)).isZero();
    }

    String draftBody(Long baseVersion, String decisions) {
        return """
                {"analysisId":"%s","baseVersion":%s,"decisions":[%s],"subjectLinks":[{"subjectIndex":0,"subjectId":"subj_02"}]}"""
                .formatted(analysisId, baseVersion == null ? "null" : baseVersion.toString(), decisions);
    }

    static final String EDIT_T03 = """
            {"subjectIndex":0,"fieldPath":"teachingPlan[2]","decision":"EDITED","value":"{\\"unit\\":\\"초안 단원 77\\"}","pdfPageNumber":1}""";
    static final String EXCLUDE_T08 = """
            {"subjectIndex":0,"fieldPath":"teachingPlan[7]","decision":"ABSENT","value":null,"pdfPageNumber":null}""";

    @Test
    void 운영계획_초안은_평가_정보_확정_전후_모두_저장되고_다른_관리자가_이어서_보며_충돌은_409() throws Exception {
        String draft = revisionPath() + "/teaching-plan-draft";
        // 1) 평가 정보 확정 전 저장
        mvc.perform(asAdmin(put(draft), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(null, EDIT_T03)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.version").value(0))
                .andExpect(jsonPath("$.draft.decisions[0].candidate.rowKey").value("T03"));
        // 평가 정보 초안에는 운영계획 경로를 받지 않는다 (범위 분리)
        mvc.perform(asAdmin(put(revisionPath() + "/review-draft"), "adm_plan_operator")
                        .contentType(MediaType.APPLICATION_JSON).content(draftBody(null, EDIT_T03)))
                .andExpect(status().isBadRequest());
        // 운영계획 초안에는 평가 정보 경로를 받지 않는다
        mvc.perform(asAdmin(put(draft), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(0L, """
                                {"subjectIndex":0,"fieldPath":"performanceEvaluation.weightPercent","decision":"CONFIRMED","value":"60","pdfPageNumber":1}""")))
                .andExpect(status().isBadRequest());

        // 2) 평가 정보 확정 → 평가 정보 초안만 닫히고 운영계획 초안은 그대로 열려 있다
        confirmEvaluation();
        String confirmedBefore = jdbc.queryForObject(
                "select group_concat(concat(field_path,'=',coalesce(value_json,'null')) order by field_path) from assessment_plan_confirmed_value",
                String.class);
        String candidateBefore = jdbc.queryForObject("select result_json from assessment_plan_analysis_run", String.class);
        mvc.perform(asAdmin(get(draft), "adm_gangnam"))
                .andExpect(jsonPath("$.draft.status").value("ACTIVE"))
                .andExpect(jsonPath("$.draft.decisions.length()").value(1));

        // 3) 평가 정보 확정 뒤에도 저장 (다른 관리자가 이어서)
        mvc.perform(asAdmin(put(draft), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(0L, EDIT_T03 + "," + EXCLUDE_T08)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.version").value(1))
                .andExpect(jsonPath("$.draft.updatedBy").value("adm_gangnam"));
        // 4) 다시 읽기(새로고침·다른 세션)에서 복원된다
        mvc.perform(asAdmin(get(draft), "adm_plan_operator"))
                .andExpect(jsonPath("$.draft.version").value(1))
                .andExpect(jsonPath("$.draft.decisions.length()").value(2))
                .andExpect(jsonPath("$.history.length()").value(2));
        // 5) 오래된 version으로 저장 → 409 (덮어쓰지 않음)
        mvc.perform(asAdmin(put(draft), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(0L, "")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.currentVersion").value(1))
                .andExpect(jsonPath("$.details.updatedBy").value("adm_gangnam"));

        // 6) 운영계획 확정 전: 학생에게 초안이 보이지 않는다
        String before = mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.status").value("NOT_CONFIRMED"))
                .andReturn().getResponse().getContentAsString();
        assertThat(before).doesNotContain("초안 단원 77");

        // 7) 운영계획 확정 → 운영계획 초안 닫힘 → 이후 초안 저장 409
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content(rows(
                                "{\"subjectIndex\":0,\"rowKey\":\"T03\",\"subjectId\":\"subj_02\",\"decision\":\"EDITED\",\"edits\":{\"unit\":\"초안 단원 77\"}}",
                                "{\"subjectIndex\":0,\"rowKey\":\"T08\",\"subjectId\":\"subj_02\",\"decision\":\"EXCLUDED\"}")))
                .andExpect(status().isOk());
        mvc.perform(asAdmin(get(draft), "adm_plan_operator"))
                .andExpect(jsonPath("$.draft.status").value("CLOSED"))
                .andExpect(jsonPath("$.draft.closedReason").value("CONFIRMED"));
        mvc.perform(asAdmin(put(draft), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(1L, "")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("teaching_plan_already_confirmed"));

        // 8) 확정 후 학생 Planner 반영 (제외 행 없음)
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.rows.length()").value(1))
                .andExpect(jsonPath("$.rows[0].unit").value("초안 단원 77"));

        // 9) 평가 확정값·분석 후보는 그대로다
        assertThat(jdbc.queryForObject(
                "select group_concat(concat(field_path,'=',coalesce(value_json,'null')) order by field_path) from assessment_plan_confirmed_value",
                String.class)).isEqualTo(confirmedBefore);
        assertThat(jdbc.queryForObject("select result_json from assessment_plan_analysis_run", String.class))
                .isEqualTo(candidateBefore);
    }

    @Test
    void 검토_화면은_문서_슬롯의_학업_과목을_고를_수_있고_슬롯이_없으면_빈_목록이다() throws Exception {
        mvc.perform(asAdmin(get(PLANS + "/" + planId + "/subjects"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.items[?(@.subjectId == 'subj_02')].name").value(containsInAnyOrder("통합과학2")))
                .andExpect(jsonPath("$.items.length()").value(4));
        String other = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "other.pdf",
                                "application/octet-stream", (new String(pdf, StandardCharsets.ISO_8859_1) + "\n% other\n")
                                        .getBytes(StandardCharsets.ISO_8859_1))), "adm_plan_operator")
                        .param("schoolId", "school_unknown").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(asAdmin(get(PLANS + "/" + JsonPath.read(other, "$.planId") + "/subjects"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get(PLANS + "/" + planId + "/subjects")).andExpect(status().isUnauthorized());
    }

    @Test
    void 평가_정보_확정이_없는_문서는_운영계획을_확정하면_그_Revision이_학생에게_공개된다_A8() throws Exception {
        // 운영계획만 있는 문서처럼 평가 정보를 확정하지 않은 상태
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001")).andExpect(status().isNotFound());
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content(rows(
                                "{\"subjectIndex\":0,\"rowKey\":\"T01\",\"subjectId\":\"subj_02\",\"decision\":\"CONFIRMED\"}")))
                .andExpect(status().isOk());
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.rows.length()").value(1));
        // 문서는 보이지만 평가 확정값은 없다(후보를 공개하지 않음)
        String detail = mvc.perform(asStudent(get(STUDENT + planId), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmedFields.length()").value(0))
                .andReturn().getResponse().getContentAsString();
        assertThat(detail).doesNotContain("analysisStatus").doesNotContain("candidate");
    }

    @Test
    void 인증_없는_학생_요청은_401() throws Exception {
        mvc.perform(get(STUDENT + planId + "/teaching-plan")).andExpect(status().isUnauthorized());
        mvc.perform(get(revisionPath() + "/teaching-plan-review")).andExpect(status().isUnauthorized());
    }

    String row(String key, String decision) {
        return "{\"subjectIndex\":0,\"rowKey\":\"" + key + "\",\"subjectId\":\"subj_02\",\"decision\":\"" + decision + "\"}";
    }

    @Test
    void 운영계획_재검토_재확정은_새_버전을_쌓고_학생은_최신_버전만_보며_평가정보_확정과_독립이다() throws Exception {
        confirmEvaluation();
        String edited = "{\"subjectIndex\":0,\"rowKey\":\"T03\",\"subjectId\":\"subj_02\",\"decision\":\"EDITED\",\"edits\":{\"unit\":\"1차 수정 단원\"}}";
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(rows(row("T01", "CONFIRMED"), edited, row("T08", "EXCLUDED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.review.versionNo").value(1));

        // 재검토 없이 다시 확정·초안 저장은 막힌다
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(rows(row("T05", "CONFIRMED"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("teaching_plan_already_confirmed"));

        // 재검토 시작: 확정으로 닫힌 운영계획 초안이 없으므로(API 확정) 1차 확정 행으로 새 초안을 채운다
        String reopened = mvc.perform(asAdmin(post(revisionPath() + "/teaching-plan-draft/reopen"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.status").value("ACTIVE"))
                .andExpect(jsonPath("$.draft.subjectLinks[0].subjectId").value("subj_02"))
                .andExpect(jsonPath("$.draft.decisions.length()").value(3))
                .andReturn().getResponse().getContentAsString();
        assertThat(reopened).contains("\"decision\":\"ABSENT\"").contains("1차 수정 단원");
        mvc.perform(asAdmin(post(revisionPath() + "/teaching-plan-draft/reopen"), "adm_gangnam"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("already_open"));
        // 재검토 중 초안 저장 가능, 학생에게는 1차 확정본(T01·T03)
        int version = JsonPath.read(reopened, "$.draft.version");
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-draft"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"analysisId":"%s","baseVersion":%d,"subjectLinks":[{"subjectIndex":0,"subjectId":"subj_02"}],
                                 "decisions":[{"subjectIndex":0,"fieldPath":"teachingPlan[4]","decision":"CONFIRMED","pdfPageNumber":1}]}"""
                                .formatted(analysisId, version)))
                .andExpect(status().isOk());
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.rows[*].rowKey").value(containsInAnyOrder("T01", "T03")));

        // 2차 확정: T01 제외, T05·T08 공개
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(rows(row("T01", "EXCLUDED"), row("T05", "CONFIRMED"), row("T08", "CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.review.versionNo").value(2))
                .andExpect(jsonPath("$.review.reviewedBy").value("adm_plan_operator"));
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.rows[*].rowKey").value(containsInAnyOrder("T05", "T08")));

        // 3차: 닫힌 운영계획 초안을 다시 열어 확정
        mvc.perform(asAdmin(post(revisionPath() + "/teaching-plan-draft/reopen"), "adm_gangnam")).andExpect(status().isOk());
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(rows(row("T09", "CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.review.versionNo").value(3));
        String history = mvc.perform(asAdmin(get(revisionPath() + "/teaching-plan-reviews"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reReviewOpen").value(false))
                .andExpect(jsonPath("$.items[*].versionNo").value(contains(3, 2, 1)))
                .andExpect(jsonPath("$.items[0].current").value(true))
                .andExpect(jsonPath("$.items[2].current").value(false))
                .andExpect(jsonPath("$.items[2].publishedRowCount").value(2))
                .andExpect(jsonPath("$.items[2].excludedRowCount").value(1))
                .andReturn().getResponse().getContentAsString();
        assertThat(history).contains("1차 수정 단원"); // 1차 확정 행은 그대로 남는다
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.rows[*].rowKey").value(contains("T09")));
        // 학생 응답에 이력·버전·제외 행 없음
        String student = mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andReturn().getResponse().getContentAsString();
        assertThat(student).doesNotContain("versionNo").doesNotContain("EXCLUDED").doesNotContain("1차 수정 단원");
        // 평가 정보 확정 이력은 그대로 1건, 평가 정보 재검토는 열리지 않았다
        mvc.perform(asAdmin(get(revisionPath() + "/reviews"), "adm_gangnam"))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.reReviewOpen").value(false));
        // 같은 Revision에 같은 버전은 DB가 거절한다(동시 재확정 방지)
        String reviewId = jdbc.queryForObject("select id from assessment_plan_teaching_plan_review where version_no = 3", String.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update("""
                insert into assessment_plan_teaching_plan_review (id, revision_id, analysis_id, version_no, row_count, reviewed_by, reviewed_at)
                select 'dup_version', revision_id, analysis_id, 3, 0, 'x', reviewed_at from assessment_plan_teaching_plan_review where id = ?""", reviewId))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void 운영계획을_확정하지_않은_문서는_재검토를_시작할_수_없다() throws Exception {
        mvc.perform(asAdmin(post(revisionPath() + "/teaching-plan-draft/reopen"), "adm_gangnam"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("teaching_plan_not_confirmed"));
        mvc.perform(asAdmin(get(revisionPath() + "/teaching-plan-reviews"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get(revisionPath() + "/teaching-plan-reviews")).andExpect(status().isUnauthorized());
    }

    // ---------------- A14 §39-11 관리자 직접 추가 행 ----------------

    String manualPath() {
        return revisionPath() + "/teaching-plan-draft/manual-rows";
    }

    String manualBody(Integer baseVersion, String status, String unit, String schedule, Integer page) {
        return """
                {"analysisId":"%s","baseVersion":%s,"row":{"subjectIndex":0,"status":"%s","unit":%s,
                 "content":"관리자 추가 학습 내용","teachingMethods":["실험"],"assessmentMethods":[],
                 "schedule":%s,"pdfPageNumber":%s}}""".formatted(analysisId, baseVersion, status,
                unit == null ? "null" : "\"" + unit + "\"", schedule, page);
    }

    static final String WEEK_3_OF_MARCH = "{\"precision\":\"WEEK_IN_MONTH\",\"monthFrom\":3,\"weekFrom\":3,\"weekTo\":3,\"weekLabel\":\"3주\"}";

    int draftVersion() throws Exception {
        return JsonPath.read(mvc.perform(asAdmin(get(revisionPath() + "/teaching-plan-draft"), "adm_gangnam"))
                .andReturn().getResponse().getContentAsString(), "$.draft.version");
    }

    String manual(String key, String decision) {
        return "{\"rowKey\":\"" + key + "\",\"subjectIndex\":0,\"subjectId\":\"subj_02\",\"decision\":\"" + decision + "\"}";
    }

    String confirmWith(String candidateRows, String manualRows) {
        return """
                {"analysisId":"%s","rows":[%s],"manualRows":[%s]}""".formatted(analysisId, candidateRows, manualRows);
    }

    @Test
    void 관리자_추가_행은_서버_키로_초안에_저장되고_확정_뒤에만_학생에게_보이며_재확정마다_버전별로_보존된다() throws Exception {
        confirmEvaluation();
        // 1) 새 행 M1 — 초안이 없으므로 baseVersion null. 키는 서버가 발급
        String created = mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(null, "INCLUDED", "세포 분열", WEEK_3_OF_MARCH, 1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.manualRows.length()").value(1))
                .andExpect(jsonPath("$.draft.manualRows[0].origin").value("MANUAL"))
                .andExpect(jsonPath("$.draft.manualRows[0].status").value("INCLUDED"))
                .andExpect(jsonPath("$.draft.manualRows[0].createdBy").value("adm_gangnam"))
                .andReturn().getResponse().getContentAsString();
        String m1 = JsonPath.read(created, "$.draft.manualRows[0].rowKey");
        assertThat(m1).startsWith("manual_").isNotIn("T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09");
        // 같은 요청 재시도(중복 클릭) → 409, 행은 하나
        mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(null, "INCLUDED", "세포 분열", WEEK_3_OF_MARCH, 1)))
                .andExpect(status().isConflict());
        // 행 결정 자동 저장(초안 PUT)은 추가 행을 지우지 않는다 · 새로고침(GET) 뒤에도 남는다
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-draft"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"analysisId":"%s","baseVersion":%d,"subjectLinks":[{"subjectIndex":0,"subjectId":"subj_02"}],
                                 "decisions":[{"subjectIndex":0,"fieldPath":"teachingPlan[0]","decision":"CONFIRMED","pdfPageNumber":1}]}"""
                                .formatted(analysisId, draftVersion())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.manualRows.length()").value(1));
        mvc.perform(asAdmin(get(revisionPath() + "/teaching-plan-draft"), "adm_plan_operator"))
                .andExpect(jsonPath("$.draft.manualRows[0].rowKey").value(m1))
                .andExpect(jsonPath("$.draft.manualRows[0].unit").value("세포 분열"))
                .andExpect(jsonPath("$.draft.decisions.length()").value(1));
        // 초안 단계: 학생에게 보이지 않는다(평가 정보만 확정된 상태 — 운영계획 미확정)
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.status").value("NOT_CONFIRMED"))
                .andExpect(jsonPath("$.rows.length()").value(0));

        // 2) 1차 확정: T01 + M1
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(confirmWith(row("T01", "CONFIRMED"), manual(m1, "CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.review.versionNo").value(1))
                .andExpect(jsonPath("$.review.rows[1].origin").value("MANUAL"))
                .andExpect(jsonPath("$.review.rows[1].candidate").doesNotExist())
                .andExpect(jsonPath("$.review.rows[0].origin").value("ANALYSIS"));
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.rows[*].rowKey").value(contains("T01", m1)))
                .andExpect(jsonPath("$.rows[1].unit").value("세포 분열"))
                .andExpect(jsonPath("$.rows[1].month").value(3))
                .andExpect(jsonPath("$.rows[1].weekFrom").value(3))
                .andExpect(jsonPath("$.rows[1].schedule.precision").value("WEEK_IN_MONTH"))
                .andExpect(jsonPath("$.rows[1].pdfPageNumber").value(1));
        // 확정된 운영계획: 재검토 전에는 추가 행을 만들 수 없다
        mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(draftVersion(), "INCLUDED", "x", WEEK_3_OF_MARCH, null)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].reason").value("teaching_plan_already_confirmed"));

        // 3) 재검토 → M1 수정 + M2 추가 → 2차 확정
        mvc.perform(asAdmin(post(revisionPath() + "/teaching-plan-draft/reopen"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.manualRows[0].rowKey").value(m1));
        mvc.perform(asAdmin(put(manualPath() + "/" + m1), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(draftVersion(), "INCLUDED", "세포 분열과 염색체", WEEK_3_OF_MARCH, 1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.manualRows[0].unit").value("세포 분열과 염색체"))
                .andExpect(jsonPath("$.draft.manualRows[0].createdBy").value("adm_gangnam"));
        String withM2 = mvc.perform(asAdmin(post(manualPath()), "adm_plan_operator").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(draftVersion(), "INCLUDED", "생식세포 형성", "{\"precision\":\"MONTH\",\"monthFrom\":4}", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.manualRows.length()").value(2))
                .andReturn().getResponse().getContentAsString();
        String m2 = JsonPath.read(withM2, "$.draft.manualRows[1].rowKey");
        assertThat(m2).startsWith("manual_").isNotEqualTo(m1);
        // 재검토 중 학생은 1차 그대로
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.rows[1].unit").value("세포 분열"));
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(confirmWith(row("T01", "CONFIRMED"), manual(m1, "CONFIRMED") + "," + manual(m2, "CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.review.versionNo").value(2));
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.rows[*].rowKey").value(contains("T01", m1, m2)))
                .andExpect(jsonPath("$.rows[1].unit").value("세포 분열과 염색체"))
                .andExpect(jsonPath("$.rows[2].pdfPageNumber").doesNotExist());

        // 4) 재검토 → M1 제외 → 3차: 학생에게 M1 없음, M2 있음
        mvc.perform(asAdmin(post(revisionPath() + "/teaching-plan-draft/reopen"), "adm_gangnam")).andExpect(status().isOk());
        mvc.perform(asAdmin(put(manualPath() + "/" + m1), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(draftVersion(), "EXCLUDED", "세포 분열과 염색체", WEEK_3_OF_MARCH, 1)))
                .andExpect(status().isOk());
        // 화면이 오래된 초안(제외 전)을 보고 CONFIRMED로 보내면 거절
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(confirmWith(row("T01", "CONFIRMED"), manual(m1, "CONFIRMED") + "," + manual(m2, "CONFIRMED"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("manualRows[0].decision"));
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(confirmWith(row("T01", "CONFIRMED"), manual(m1, "EXCLUDED") + "," + manual(m2, "CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.review.versionNo").value(3));
        String student3 = mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.rows[*].rowKey").value(contains("T01", m2)))
                .andReturn().getResponse().getContentAsString();
        assertThat(student3).doesNotContain("세포 분열").doesNotContain("versionNo").doesNotContain("MANUAL");

        // 5) 복원 → 4차: M1 다시 공개
        mvc.perform(asAdmin(post(revisionPath() + "/teaching-plan-draft/reopen"), "adm_gangnam")).andExpect(status().isOk());
        mvc.perform(asAdmin(put(manualPath() + "/" + m1), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(draftVersion(), "INCLUDED", "세포 분열과 염색체", WEEK_3_OF_MARCH, 1)))
                .andExpect(status().isOk());
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(confirmWith(row("T01", "CONFIRMED"), manual(m1, "CONFIRMED") + "," + manual(m2, "CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.review.versionNo").value(4));
        mvc.perform(asStudent(get(STUDENT + planId + "/teaching-plan"), "stu_001"))
                .andExpect(jsonPath("$.rows[*].rowKey").value(contains("T01", m1, m2)));

        // 6) 이력: 버전마다 그 시점의 추가 행이 그대로 남는다
        String history = mvc.perform(asAdmin(get(revisionPath() + "/teaching-plan-reviews"), "adm_gangnam"))
                .andExpect(jsonPath("$.items[*].versionNo").value(contains(4, 3, 2, 1)))
                .andExpect(jsonPath("$.items[3].rows.length()").value(2))
                .andExpect(jsonPath("$.items[3].rows[1].row.unit").value("세포 분열"))
                .andExpect(jsonPath("$.items[2].rows[1].row.unit").value("세포 분열과 염색체"))
                .andExpect(jsonPath("$.items[1].rows[1].decision").value("EXCLUDED"))
                .andExpect(jsonPath("$.items[1].excludedRowCount").value(1))
                .andExpect(jsonPath("$.items[0].rows[1].decision").value("CONFIRMED"))
                .andReturn().getResponse().getContentAsString();
        assertThat(history).contains("\"origin\":\"MANUAL\"").contains("\"origin\":\"ANALYSIS\"");
        // 저장: 출처 MANUAL · 후보 없음 · sources 비어 있음(분석 근거로 위장하지 않음), 분석 결과(Run)는 바뀌지 않음
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_teaching_plan_row where row_origin = 'MANUAL' and candidate_json is null", Integer.class)).isEqualTo(7);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_teaching_plan_row where row_origin = 'ANALYSIS' and candidate_json is not null", Integer.class)).isEqualTo(4);
        assertThat(jdbc.queryForObject("select row_json from assessment_plan_teaching_plan_row where row_key = ? limit 1", String.class, m1))
                .contains("\"sources\":[]").contains("\"manualPdfPageNumber\":1");
        assertThat(jdbc.queryForObject("select result_json from assessment_plan_analysis_run where id = ?", String.class, analysisId))
                .doesNotContain("manual_").doesNotContain("세포 분열");
        // DB 제약: 관리자 추가 행에 후보를 넣거나 분석 행의 후보를 비울 수 없다
        String reviewId = jdbc.queryForObject("select id from assessment_plan_teaching_plan_review where version_no = 4", String.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update("""
                insert into assessment_plan_teaching_plan_row (id, review_id, sort_order, subject_id, analysis_subject_index, row_key, row_origin, decision, row_json, candidate_json)
                values ('bad_manual', ?, 9, 'subj_02', 0, 'manual_x', 'MANUAL', 'EDITED', '{}', null)""", reviewId))
                .isInstanceOf(org.springframework.dao.DataAccessException.class).hasMessageContaining("ck_assessment_plan_teaching_plan_row_origin_candidate");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update("""
                insert into assessment_plan_teaching_plan_row (id, review_id, sort_order, subject_id, analysis_subject_index, row_key, row_origin, decision, row_json, candidate_json)
                values ('bad_analysis', ?, 9, 'subj_02', 0, 'T09', 'ANALYSIS', 'CONFIRMED', '{}', null)""", reviewId))
                .isInstanceOf(org.springframework.dao.DataAccessException.class).hasMessageContaining("ck_assessment_plan_teaching_plan_row_origin_candidate");
    }

    @Test
    void 관리자_추가_행의_잘못된_입력_다른_과목_다른_초안_키_오래된_버전은_거절하고_아무것도_바꾸지_않는다() throws Exception {
        String created = mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(null, "INCLUDED", "세포 분열", WEEK_3_OF_MARCH, null)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String m1 = JsonPath.read(created, "$.draft.manualRows[0].rowKey");
        int version = draftVersion();
        // 빈 필수값(단원·학습 내용·특별 일정 모두 없음)
        mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"analysisId":"%s","baseVersion":%d,"row":{"subjectIndex":0,"status":"INCLUDED","unit":" ","content":"",
                                 "schedule":{"precision":"UNKNOWN"}}}""".formatted(analysisId, version)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("row.content"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("required"));
        // 잘못된 월(13) · 범위 밖 주차(26) — 요청 형식 검증
        mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version, "INCLUDED", "x", "{\"precision\":\"MONTH\",\"monthFrom\":13}", null)))
                .andExpect(status().isBadRequest());
        mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version, "INCLUDED", "x", "{\"precision\":\"TERM_WEEK\",\"weekFrom\":26}", null)))
                .andExpect(status().isBadRequest());
        // 주차 거꾸로 · 정밀도에 필요한 값 없음 · 연도 입력 · 문서 밖 쪽 · 없는 과목 슬롯
        mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version, "INCLUDED", "x", "{\"precision\":\"WEEK_IN_MONTH\",\"monthFrom\":3,\"weekFrom\":3,\"weekTo\":2}", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("row.schedule.weekTo"));
        mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version, "INCLUDED", "x", "{\"precision\":\"WEEK_IN_MONTH\",\"weekFrom\":3}", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("row.schedule.monthFrom"));
        mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version, "INCLUDED", "x", "{\"precision\":\"MONTH\",\"monthFrom\":3,\"calendarYear\":2026,\"calendarYearBasis\":\"EXPLICIT_IN_CELL\"}", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("row.schedule.calendarYear"));
        mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version, "INCLUDED", "x", WEEK_3_OF_MARCH, 999)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("row.pdfPageNumber"));
        mvc.perform(asAdmin(post(manualPath()), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version, "INCLUDED", "x", WEEK_3_OF_MARCH, null).replace("\"subjectIndex\":0", "\"subjectIndex\":1")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("row.subjectIndex"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("out_of_range"));
        // 서버와 다른 초안 version으로 수정 → 409 (덮어쓰지 않음)
        mvc.perform(asAdmin(put(manualPath() + "/" + m1), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version + 1, "INCLUDED", "덮어쓰기", WEEK_3_OF_MARCH, null)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PLAN_REVIEW_DRAFT_CONFLICT"));
        // 이 초안에 없는 키(다른 Revision·위조) → 404
        mvc.perform(asAdmin(put(manualPath() + "/manual_0000000000000000"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version, "INCLUDED", "x", WEEK_3_OF_MARCH, null)))
                .andExpect(status().isNotFound());
        // 인증 없음 · 학생 → 401
        mvc.perform(post(manualPath()).contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version, "INCLUDED", "x", WEEK_3_OF_MARCH, null)))
                .andExpect(status().isUnauthorized());
        mvc.perform(asStudent(post(manualPath()), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content(manualBody(version, "INCLUDED", "x", WEEK_3_OF_MARCH, null)))
                .andExpect(status().isUnauthorized());
        // 확정: 없는 키 · 다른 과목 ID · 후보 행과 다른 과목 연결 · 중복
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(confirmWith(row("T01", "CONFIRMED"), manual("manual_0000000000000000", "CONFIRMED"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("manualRows[0].rowKey"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("unknown"));
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(confirmWith(row("T01", "CONFIRMED"), manual(m1, "CONFIRMED").replace("subj_02", "subj_99"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("manualRows[0].subjectId"));
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(confirmWith(row("T01", "CONFIRMED").replace("subj_02", "subj_01"), manual(m1, "CONFIRMED"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[*].reason").value(org.hamcrest.Matchers.hasItem("conflict")));
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(confirmWith("", manual(m1, "CONFIRMED") + "," + manual(m1, "CONFIRMED"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("duplicate"));
        // 아무것도 바뀌지 않았다: 초안의 추가 행 1개(원래 값), 확정 없음, 학생 미공개
        mvc.perform(asAdmin(get(revisionPath() + "/teaching-plan-draft"), "adm_gangnam"))
                .andExpect(jsonPath("$.draft.version").value(version))
                .andExpect(jsonPath("$.draft.manualRows.length()").value(1))
                .andExpect(jsonPath("$.draft.manualRows[0].unit").value("세포 분열"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_teaching_plan_review", Integer.class)).isZero();
        // 추가 행만으로도 확정할 수 있다(후보 행 0개) — 분석 결과에 운영계획 후보가 있는 문서에서
        mvc.perform(asAdmin(put(revisionPath() + "/teaching-plan-review"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content(confirmWith("", manual(m1, "CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.review.rows.length()").value(1));
    }
}
