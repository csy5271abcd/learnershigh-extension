package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
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
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
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
 * A3 서버 분석 실행 (§39 POST .../analysis, 2026-11-13). Backend가 보관한 원문을 분석기로 보내고 결과를 저장한다.
 * 실제 분석기 대신 `/analyze-preview` 계약 모양을 돌려주는 Stub HTTP 서버를 쓴다. payload는 계정 B 분석기 v21.1이 합성 PDF에 대해
 * 실제로 낸 결과 Fixture(analyzer-v21_1/analysis-import.json)다. 실제 학교 문서는 쓰지 않는다.
 */
@Tag("integration")
@SpringBootTest(properties = {
    "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage",
    "assessment.analyzer.token=it-token-not-a-secret-0123456789abcdef",
    "assessment.analyzer.timeout-millis=1500",
    "assessment.analyzer.retry-delay-millis=10",
    "assessment.analyzer.max-retries=2"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class PlanServerAnalysisApiTest {

    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final String TOKEN = "it-token-not-a-secret-0123456789abcdef";

    enum Mode { OK, PARTIAL, PARTIAL_FAILED_PAYLOAD, NO_RESULT, SHA_MISMATCH, NOT_JSON, NOT_IMPORTABLE, UNKNOWN_FIELD, BUSY, SLOW, DELAYED_OK }

    static volatile Mode mode = Mode.OK;
    static final AtomicInteger calls = new AtomicInteger();
    static final AtomicReference<String> receivedToken = new AtomicReference<>();
    static final AtomicReference<String> receivedFileSha = new AtomicReference<>();
    static final HttpServer ANALYZER = startStub();

    @DynamicPropertySource
    static void analyzer(DynamicPropertyRegistry registry) {
        registry.add("assessment.analyzer.mode", () -> "http");   // 외부 분석기 Stub 경로 시험 (기본은 local)
        registry.add("assessment.analyzer.base-url", () -> "http://127.0.0.1:" + ANALYZER.getAddress().getPort());
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    static byte[] pdf;
    static String payload;
    static String pdfSha;

    @BeforeEach
    void setUp() throws Exception {
        jdbc.update("delete from assessment_school_assessment");
        jdbc.update("delete from assessment_plan_confirmed_value");
        jdbc.update("delete from assessment_plan_review");
        jdbc.update("delete from assessment_plan_analysis_run");
        jdbc.update("delete from assessment_plan_revision");
        jdbc.update("delete from assessment_evaluation_plan");
        pdf = MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/synthetic-e2e.pdf");
        payload = new String(MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/analysis-import.json"),
                StandardCharsets.UTF_8);
        pdfSha = sha256(pdf);
        mode = Mode.OK;
        calls.set(0);
        receivedToken.set(null);
        receivedFileSha.set(null);
    }

    static String sha256(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    static HttpServer startStub() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.setExecutor(Executors.newCachedThreadPool());
            server.createContext("/analyze-preview", exchange -> {
                calls.incrementAndGet();
                receivedToken.set(exchange.getRequestHeaders().getFirst("X-Analysis-Token"));
                byte[] body = exchange.getRequestBody().readAllBytes();
                receivedFileSha.set(filePartSha(body, exchange.getRequestHeaders().getFirst("Content-Type")));
                int status = 200;
                String response;
                try {
                    response = switch (mode) {
                        case OK, DELAYED_OK -> {
                            if (mode == Mode.DELAYED_OK) {
                                Thread.sleep(1000);
                            }
                            // 받은 원문의 SHA로 답한다(개정본 시험). 기본 원문이면 pdfSha와 같다.
                            String sha = receivedFileSha.get() == null ? pdfSha : receivedFileSha.get();
                            yield envelope("OK_REVIEW_REQUIRED", sha, true, payload.replace(pdfSha, sha));
                        }
                        case PARTIAL -> envelope("PARTIAL", pdfSha, true, payload)
                                .replace("\"errors\":[]", "\"errors\":[{\"code\":\"SUBJECT_SECTION_NOT_FOUND\"}]");
                        case PARTIAL_FAILED_PAYLOAD -> envelope("PARTIAL", pdfSha, true, failedPayload());
                        // 실제 분석기 v21.1이 평가계획서가 아닌 문서에 보내는 응답 모양 (A6 실분석기 확인)
                        case NO_RESULT -> envelope("NO_ASSESSMENTS_EXTRACTED", pdfSha, true, failedPayload());
                        case SHA_MISMATCH -> envelope("OK_REVIEW_REQUIRED", "0".repeat(64), true, payload);
                        case NOT_JSON -> "<html>gateway</html>";
                        case NOT_IMPORTABLE -> envelope("OK_REVIEW_REQUIRED", pdfSha, false, payload)
                                .replace("\"blockers\":[]", "\"blockers\":[{\"code\":\"LOCAL_VALIDATION\"}]");
                        case UNKNOWN_FIELD -> envelope("OK_REVIEW_REQUIRED", pdfSha, true,
                                payload.replaceFirst("\\{", "{\"confidence\":\"HIGH\","));
                        case BUSY -> {
                            status = 503;
                            yield "{\"ok\":false,\"status\":\"ERROR\",\"errors\":[{\"code\":\"BUSY\"}]}";
                        }
                        case SLOW -> {
                            Thread.sleep(3000);
                            yield envelope("OK_REVIEW_REQUIRED", pdfSha, true, payload);
                        }
                    };
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    response = "{}";
                }
                byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
                try {
                    exchange.sendResponseHeaders(status, bytes.length);
                    exchange.getResponseBody().write(bytes);
                } catch (IOException clientGone) {
                    // Timeout 시험: Client가 먼저 끊는다
                } finally {
                    exchange.close();
                }
            });
            server.start();
            return server;
        } catch (IOException failure) {
            throw new IllegalStateException(failure);
        }
    }

    static String envelope(String status, String sha, boolean importable, String payloadJson) {
        return """
                {"service":{"name":"stub-analyzer"},"requestId":"stub1","ok":true,"status":"%s","analyzerVersion":"v21.1",
                 "analyzerChannel":"DEFAULT","source":{"sha256":"%s"},
                 "backendImport":{"contract":"AnalysisImportRequest","variant":"OFFICIAL_PDF","importable":%s,"blockers":[],
                   "payload":%s},
                 "warnings":["구간 2개 미추출(합성)"],"errors":[],"elapsedMs":7}""".formatted(status, sha, importable, payloadJson);
    }

    /** 같은 원문에 대한 FAILED payload (과목 없음 + 실패 사유). */
    static String failedPayload() {
        return """
                {"analyzer":{"name":"curriculum-analysis","version":"v21.1/backend-adapter-0.2"},
                 "source":{"sha256":"%s","pageCount":2},"status":"FAILED","failureReason":"stub","subjects":[],
                 "warnings":[]}""".formatted(pdfSha);
    }

    /** multipart 본문에서 file 부분 바이트의 SHA-256 (Backend가 보관 원문을 그대로 보냈는지 확인). */
    static String filePartSha(byte[] body, String contentType) {
        try {
            String boundary = "--" + contentType.substring(contentType.indexOf("boundary=") + 9);
            String text = new String(body, StandardCharsets.ISO_8859_1);
            int part = text.indexOf("name=\"file\"");
            int start = text.indexOf("\r\n\r\n", part) + 4;
            int end = text.indexOf("\r\n" + boundary, start);
            return sha256(text.substring(start, end).getBytes(StandardCharsets.ISO_8859_1));
        } catch (Exception broken) {
            return null;
        }
    }

    record Uploaded(String planId, String revisionId) {
        String analysis() {
            return PLANS + "/" + planId + "/revisions/" + revisionId + "/analysis";
        }
    }

    Uploaded register(String admin, String fileName, byte[] bytes) throws Exception {
        return register(admin, fileName, bytes, 1);
    }

    Uploaded register(String admin, String fileName, byte[] bytes, int semester) throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", fileName,
                                "application/octet-stream", bytes)), admin)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", String.valueOf(semester)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new Uploaded(JsonPath.read(body, "$.planId"), JsonPath.read(body, "$.documentRevisionId"));
    }

    int runs() {
        return jdbc.queryForObject("select count(*) from assessment_plan_analysis_run", Integer.class);
    }

    @Test
    void 서버가_원문을_분석기로_보내고_결과를_저장한다_같은_결과_재요청은_새_Run이_없다() throws Exception {
        Uploaded uploaded = register("adm_gangnam", "synthetic-e2e.pdf", pdf);
        // 다른 관리자(지점 무관)도 분석을 실행한다 (OD-A08)
        String created = mvc.perform(asAdmin(post(uploaded.analysis()), "adm_bundang"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.analysisStatus").value("REVIEW_REQUIRED"))
                .andExpect(jsonPath("$.reviewStatus").value("UNREVIEWED"))
                .andExpect(jsonPath("$.analyzer.origin").value("SERVER_ANALYZER"))
                .andExpect(jsonPath("$.subjects.length()").value(1))
                .andExpect(jsonPath("$.confirmedFields.length()").value(0))
                .andReturn().getResponse().getContentAsString();
        // Backend가 보관한 원문을 그대로, 토큰과 함께 보냈다
        assertThat(receivedFileSha.get()).isEqualTo(pdfSha);
        assertThat(receivedToken.get()).isEqualTo(TOKEN);
        assertThat(created).doesNotContain(TOKEN);
        assertThat(jdbc.queryForMap("select origin, status, received_by from assessment_plan_analysis_run"))
                .containsEntry("origin", "SERVER_ANALYZER").containsEntry("status", "REVIEW_REQUIRED")
                .containsEntry("received_by", "adm_bundang");
        // 저장된 결과를 다시 조회한다
        String analysisId = JsonPath.read(created, "$.analysisId");
        mvc.perform(asAdmin(get(uploaded.analysis()), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisId").value(analysisId))
                .andExpect(jsonPath("$.warnings[?(@.source == 'ANALYZER')]").isNotEmpty());
        // 같은 결과 → 200, 새 Run 없음
        mvc.perform(asAdmin(post(uploaded.analysis()), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisId").value(analysisId));
        assertThat(runs()).isEqualTo(1);
        // 분석·저장만으로 학생에게 공개되지 않는다
        mvc.perform(asStudent(get("/api/student/assessment/evaluation-plans/" + uploaded.planId()), "stu_001"))
                .andExpect(status().isNotFound());
    }

    @Test
    void 분석기의_PARTIAL은_PARTIAL_Run으로_저장되고_재조회된다() throws Exception {
        // A3.5: REVIEW_REQUIRED로 바꾸지 않는다 (DB 제약 V202611140100)
        Uploaded uploaded = register("adm_plan_operator", "synthetic-e2e.pdf", pdf);
        mode = Mode.PARTIAL;
        String created = mvc.perform(asAdmin(post(uploaded.analysis()), "adm_plan_operator"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.analysisStatus").value("PARTIAL"))
                .andExpect(jsonPath("$.reviewStatus").value("UNREVIEWED"))
                .andExpect(jsonPath("$.subjects.length()").value(1))
                // 분석기 경고와 오류 코드(누락 사유)를 값 수정 없이 보존한다
                .andExpect(jsonPath("$.warnings[?(@.source == 'ANALYZER')]").isNotEmpty())
                .andExpect(jsonPath("$.warnings[?(@.source == 'ANALYZER_ERROR')].message")
                        .value(contains("SUBJECT_SECTION_NOT_FOUND")))
                .andReturn().getResponse().getContentAsString();
        assertThat(jdbc.queryForObject("select status from assessment_plan_analysis_run", String.class))
                .isEqualTo("PARTIAL");
        String analysisId = JsonPath.read(created, "$.analysisId");
        mvc.perform(asAdmin(get(uploaded.analysis()), "adm_gangnam"))
                .andExpect(jsonPath("$.analysisId").value(analysisId))
                .andExpect(jsonPath("$.analysisStatus").value("PARTIAL"));
        mvc.perform(asAdmin(get(PLANS + "/" + uploaded.planId()), "adm_plan_operator"))
                .andExpect(jsonPath("$.revisions[0].analysisStatus").value("PARTIAL"));
        // 같은 PARTIAL 결과 재요청 → 200, 새 Run 없음
        mvc.perform(asAdmin(post(uploaded.analysis()), "adm_plan_operator")).andExpect(status().isOk());
        assertThat(runs()).isEqualTo(1);
    }

    @Test
    void PARTIAL인데_payload가_FAILED면_모순이라_저장하지_않는다() throws Exception {
        Uploaded uploaded = register("adm_plan_operator", "synthetic-e2e.pdf", pdf);
        expectFailure(uploaded, Mode.PARTIAL_FAILED_PAYLOAD, 502, "PLAN_ANALYZER_BAD_RESPONSE", "status_conflict");
        assertThat(runs()).isZero();
    }

    @Test
    void 평가항목을_찾지_못한_문서는_장애가_아니라_422_사유로_알리고_저장하지_않는다() throws Exception {
        Uploaded uploaded = register("adm_plan_operator", "synthetic-e2e.pdf", pdf);
        expectFailure(uploaded, Mode.NO_RESULT, 422, "PLAN_ANALYSIS_NO_RESULT", "no_assessments_extracted");
        assertThat(runs()).isZero();
        // 재시도해도 같은 사유 (분석기 장애처럼 재시도를 유도하지 않는다)
        expectFailure(uploaded, Mode.NO_RESULT, 422, "PLAN_ANALYSIS_NO_RESULT", "no_assessments_extracted");
        assertThat(calls.get()).isEqualTo(2);
    }

    @Test
    void PARTIAL_결과를_관리자가_정정해_확정하면_학생에게_확정값만_공개된다() throws Exception {
        Uploaded uploaded = register("adm_plan_operator", "synthetic-e2e.pdf", pdf, 2);
        mode = Mode.PARTIAL;
        String analysisId = JsonPath.read(mvc.perform(asAdmin(post(uploaded.analysis()), "adm_plan_operator"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.analysisId");
        String student = "/api/student/assessment/evaluation-plans/" + uploaded.planId();
        // 확정 전: 학생에게 없음
        mvc.perform(asStudent(get(student), "stu_001")).andExpect(status().isNotFound());

        String review = PLANS + "/" + uploaded.planId() + "/revisions/" + uploaded.revisionId() + "/review";
        // 관리자 정정값(후보 60 → 55)과 '원문에 없음' 확인(null)을 함께 저장한다
        mvc.perform(asAdmin(put(review), "adm_gangnam").contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":55,"pdfPageNumber":1},
                          {"fieldPath":"performanceEvaluation.items[0].timing","value":null,"pdfPageNumber":null}]}]}"""
                        .formatted(analysisId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisStatus").value("PARTIAL"))
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                // AI 후보는 그대로, 확정값은 따로
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.weightPercent").value(60))
                .andExpect(jsonPath("$.confirmedFields.length()").value(2));

        // 확정 후: 학생 상세에 확정값만 (AI 후보·분석 상태·경고·근거 위치 없음)
        String body = mvc.perform(asStudent(get(student), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.confirmedFields.length()").value(2))
                .andExpect(jsonPath("$.confirmedFields[?(@.fieldPath == 'performanceEvaluation.weightPercent')].value")
                        .value(contains(55)))
                .andExpect(jsonPath("$.confirmedFields[?(@.fieldPath == 'performanceEvaluation.items[0].timing')].value")
                        .value(contains(nullValue())))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("\"subjects\"").doesNotContain("analysisStatus")
                .doesNotContain("documentLocator").doesNotContain("warnings");
        // 목록에는 확정값을 붙이지 않는다
        mvc.perform(asStudent(get("/api/student/assessment/evaluation-plans"), "stu_001").param("schoolId", "school_001")
                        .param("academicYear", "2026").param("grade", "1").param("semester", "2"))
                .andExpect(jsonPath("$.items[0].planId").value(uploaded.planId()))
                .andExpect(jsonPath("$.items[0].confirmedFields").doesNotExist());
        // 원래 분석 Run은 그대로다
        assertThat(jdbc.queryForObject("select status from assessment_plan_analysis_run", String.class))
                .isEqualTo("PARTIAL");
    }

    @Test
    void 새_개정본은_확정되기_전까지_학생에게_이전_확정값을_보이고_확정되면_새_값으로_바뀐다() throws Exception {
        Uploaded first = register("adm_plan_operator", "synthetic-e2e.pdf", pdf, 2);
        String firstAnalysis = JsonPath.read(mvc.perform(asAdmin(post(first.analysis()), "adm_plan_operator"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.analysisId");
        confirm(first, firstAnalysis, 55);
        String student = "/api/student/assessment/evaluation-plans/" + first.planId();

        // 개정본 업로드(원문 끝에 주석 1줄 → SHA가 다른 같은 PDF)
        byte[] revised = (new String(pdf, StandardCharsets.ISO_8859_1) + "\n% revised\n").getBytes(StandardCharsets.ISO_8859_1);
        String revisionBody = mvc.perform(asAdmin(multipart(PLANS + "/" + first.planId() + "/revisions")
                        .file(new MockMultipartFile("file", "synthetic-e2e-v2.pdf", "application/octet-stream", revised)),
                        "adm_plan_operator"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Uploaded second = new Uploaded(first.planId(), JsonPath.read(revisionBody, "$.documentRevisionId"));
        String secondAnalysis = JsonPath.read(mvc.perform(asAdmin(post(second.analysis()), "adm_plan_operator"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.analysisId");
        assertThat(receivedFileSha.get()).isEqualTo(sha256(revised));

        // 개정본 분석만 됨 → 학생은 여전히 1차 확정 Revision과 그 값
        mvc.perform(asStudent(get(student), "stu_001"))
                .andExpect(jsonPath("$.documentRevisionId").value(first.revisionId()))
                .andExpect(jsonPath("$.confirmedFields[0].value").value(55));

        // 개정본 확정 → 새 Revision의 값만 (이전 값과 섞이지 않음)
        confirm(second, secondAnalysis, 70);
        String body = mvc.perform(asStudent(get(student), "stu_001"))
                .andExpect(jsonPath("$.documentRevisionId").value(second.revisionId()))
                .andExpect(jsonPath("$.confirmedFields.length()").value(1))
                .andExpect(jsonPath("$.confirmedFields[0].value").value(70))
                .andReturn().getResponse().getContentAsString();
        // 이전 값(55)이 확정값에 섞이지 않는다. 본문 전체 문자열 검사는 무작위 ID(UUID)에 "55"가 들어가면 우연히 실패했다(A10에서 확인)
        assertThat(JsonPath.<java.util.List<Object>>read(body, "$.confirmedFields[*].value")).containsExactly(70);
    }

    void confirm(Uploaded uploaded, String analysisId, int weight) throws Exception {
        String review = PLANS + "/" + uploaded.planId() + "/revisions/" + uploaded.revisionId() + "/review";
        mvc.perform(asAdmin(put(review), "adm_gangnam").contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":%d,"pdfPageNumber":1}]}]}"""
                        .formatted(analysisId, weight)))
                .andExpect(status().isOk());
    }

    @Test
    void 응답_오류는_저장하지_않고_이전_결과를_보존한다() throws Exception {
        Uploaded uploaded = register("adm_plan_operator", "synthetic-e2e.pdf", pdf);
        String first = JsonPath.read(mvc.perform(asAdmin(post(uploaded.analysis()), "adm_plan_operator"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.analysisId");

        expectFailure(uploaded, Mode.SHA_MISMATCH, 502, "PLAN_ANALYZER_BAD_RESPONSE", "sha_mismatch");
        expectFailure(uploaded, Mode.NOT_JSON, 502, "PLAN_ANALYZER_BAD_RESPONSE", "invalid_response");
        expectFailure(uploaded, Mode.NOT_IMPORTABLE, 502, "PLAN_ANALYZER_BAD_RESPONSE", "not_importable:local_validation");
        expectFailure(uploaded, Mode.UNKNOWN_FIELD, 502, "PLAN_ANALYZER_BAD_RESPONSE", "payload_invalid");

        assertThat(runs()).isEqualTo(1);
        mvc.perform(asAdmin(get(uploaded.analysis()), "adm_plan_operator"))
                .andExpect(jsonPath("$.analysisId").value(first))
                .andExpect(jsonPath("$.analysisStatus").value("REVIEW_REQUIRED"));
        assertThat(jdbc.queryForObject("select review_status from assessment_plan_revision where id = ?", String.class,
                uploaded.revisionId())).isEqualTo("UNREVIEWED");
    }

    @Test
    void BUSY는_재시도_후_503_Timeout은_재시도_없이_503() throws Exception {
        Uploaded uploaded = register("adm_plan_operator", "synthetic-e2e.pdf", pdf);
        expectFailure(uploaded, Mode.BUSY, 503, "PLAN_ANALYZER_UNAVAILABLE", "busy");
        assertThat(calls.get()).isEqualTo(3);
        calls.set(0);
        expectFailure(uploaded, Mode.SLOW, 503, "PLAN_ANALYZER_UNAVAILABLE", "timeout");
        assertThat(calls.get()).isEqualTo(1);
        assertThat(runs()).isZero();
    }

    @Test
    void 같은_개정본_동시_분석은_409() throws Exception {
        Uploaded uploaded = register("adm_plan_operator", "synthetic-e2e.pdf", pdf);
        mode = Mode.DELAYED_OK;
        CompletableFuture<Integer> first = CompletableFuture.supplyAsync(() -> {
            try {
                return mvc.perform(asAdmin(post(uploaded.analysis()), "adm_plan_operator")).andReturn().getResponse().getStatus();
            } catch (Exception failure) {
                throw new IllegalStateException(failure);
            }
        });
        long deadline = System.currentTimeMillis() + 5000;
        while (calls.get() == 0 && System.currentTimeMillis() < deadline) {
            Thread.sleep(20);
        }
        mvc.perform(asAdmin(post(uploaded.analysis()), "adm_gangnam"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PLAN_ANALYSIS_IN_PROGRESS"));
        assertThat(first.get()).isEqualTo(201);
        assertThat(runs()).isEqualTo(1);
        assertThat(calls.get()).isEqualTo(1);
    }

    @Test
    void HWP_HWPX는_계약_대기라_분석기를_부르지_않고_원문_없는_개정본은_422() throws Exception {
        byte[] hwpx = MultiformatExperimentalApiTest.resource("/assessment/multiformat/synthetic-plan.hwpx");
        Uploaded uploaded = register("adm_plan_operator", "synthetic-plan.hwpx", hwpx);
        mvc.perform(asAdmin(post(uploaded.analysis()), "adm_plan_operator"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("PLAN_ANALYSIS_UNSUPPORTED"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("format_contract_pending"));
        assertThat(calls.get()).isZero();

        jdbc.update("""
                insert into assessment_evaluation_plan (id, school_id, academic_year, grade, semester, revision_count, created_by, created_at, version)
                values ('plan_legacy_a3', 'school_001', 2026, 1, 1, 1, 'adm_plan_operator', now(6), 0)""");
        jdbc.update("""
                insert into assessment_plan_revision (id, plan_id, revision_number, file_name, content_type, size_bytes, sha256, page_count, file_ref, source_url, review_status, uploaded_by, uploaded_at)
                values ('plan_rev_legacy_a3', 'plan_legacy_a3', 1, 'legacy.pdf', 'application/pdf', 10, ?, 1, null, null, 'UNREVIEWED', 'adm_plan_operator', now(6))""",
                "b".repeat(64));
        mvc.perform(asAdmin(post(PLANS + "/plan_legacy_a3/revisions/plan_rev_legacy_a3/analysis"), "adm_plan_operator"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.details.fields[0].reason").value("original_missing"));
        assertThat(calls.get()).isZero();
    }

    @Test
    void 인증_없는_요청과_학생은_401_없는_문서는_404() throws Exception {
        Uploaded uploaded = register("adm_plan_operator", "synthetic-e2e.pdf", pdf);
        mvc.perform(post(uploaded.analysis())).andExpect(status().isUnauthorized());
        mvc.perform(asAdmin(post(uploaded.analysis()), "adm_unknown")).andExpect(status().isUnauthorized());
        mvc.perform(asStudent(post(uploaded.analysis()), "stu_001")).andExpect(status().isUnauthorized());
        mvc.perform(asAdmin(post(PLANS + "/plan_nope/revisions/rev_nope/analysis"), "adm_plan_operator"))
                .andExpect(status().isNotFound());
        assertThat(calls.get()).isZero();
    }

    void expectFailure(Uploaded uploaded, Mode failure, int httpStatus, String code, String reason) throws Exception {
        mode = failure;
        String body = mvc.perform(asAdmin(post(uploaded.analysis()), "adm_plan_operator"))
                .andExpect(status().is(httpStatus))
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.details.fields[0].reason").value(reason))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain(TOKEN);
    }
}
