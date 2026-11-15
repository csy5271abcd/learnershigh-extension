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
}
