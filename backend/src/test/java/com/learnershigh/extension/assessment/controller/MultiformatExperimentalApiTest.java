package com.learnershigh.extension.assessment.controller;

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
import com.learnershigh.extension.assessment.service.plan.DocumentFormatInspectorTest;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.function.UnaryOperator;
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
import tools.jackson.databind.node.ObjectNode;

/**
 * HWP·HWPX 다중 형식 실험 (assessment.multiformat.experimental=true, 기본 false).
 * Fixture: 합성 HWPX(계정 A 생성기, 계정 B 실제 HWPX 파서로 읽힘) + 계정 A 임시 변환기가 만든 초안 수신 JSON(계정 B Adapter 출력 아님).
 * HWP는 서명 검사용 합성 바이트뿐이다(실제 한글 문서 아님).
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage", "assessment.analysis-import.enabled=true", "assessment.multiformat.experimental=true"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class MultiformatExperimentalApiTest {

    static final String OPERATOR = "adm_plan_operator";
    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final String HWPX_SHA = "19cd28b637611e1e72f40ad823c2842122ddf9bcff77833100ddd712ec81beaf";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    final JsonMapper json = JsonMapper.builder().build();

    @BeforeEach
    void setUp() {
        jdbc.update("delete from assessment_school_assessment");
        jdbc.update("delete from assessment_plan_confirmed_value");
        jdbc.update("delete from assessment_plan_review");
        jdbc.update("delete from assessment_plan_analysis_run");
        jdbc.update("delete from assessment_plan_revision");
        jdbc.update("delete from assessment_evaluation_plan");
    }

    static byte[] resource(String path) throws IOException {
        try (InputStream in = MultiformatExperimentalApiTest.class.getResourceAsStream(path)) {
            assertThat(in).as(path).isNotNull();
            return in.readAllBytes();
        }
    }

    record Revision(String planId, String revisionId) {
        String base() {
            return PLANS + "/" + planId + "/revisions/" + revisionId;
        }
    }

    Revision register(byte[] bytes, String fileName) throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", fileName, "application/octet-stream", bytes)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "1"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return new Revision(JsonPath.read(body, "$.planId"), JsonPath.read(body, "$.documentRevisionId"));
    }

    String draft() throws IOException {
        return new String(resource("/assessment/multiformat/synthetic-plan.hwpx.draft-import.json"), StandardCharsets.UTF_8);
    }

    String mutate(UnaryOperator<ObjectNode> change) throws IOException {
        return json.writeValueAsString(change.apply((ObjectNode) json.readTree(draft())));
    }

    long count(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Long.class);
    }

    void expectRejected(Revision revision, String body, String field, String reason) throws Exception {
        long runs = count("assessment_plan_analysis_run");
        String response = mvc.perform(asAdmin(post(revision.base() + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andReturn().getResponse().getContentAsString();
        assertThat(response).as(field).contains("\"field\":\"" + field + "\"", "\"reason\":\"" + reason + "\"");
        assertThat(count("assessment_plan_analysis_run")).isEqualTo(runs);
    }

    static ObjectNode firstItemSource(ObjectNode root) {
        return (ObjectNode) root.path("subjects").get(0).path("performanceEvaluation").path("items").get(0).path("sources").get(0);
    }

    @Test
    void 합성_HWPX_등록_수신_조회_후보는_UNREVIEWED이고_쪽번호는_없다() throws Exception {
        Revision hwpx = register(resource("/assessment/multiformat/synthetic-plan.hwpx"), "synthetic-plan.hwpx");
        Map<String, Object> row = jdbc.queryForMap("select content_type, page_count, sha256, file_ref from assessment_plan_revision where id = ?",
                hwpx.revisionId());
        assertThat(row.get("content_type")).isEqualTo("application/hwp+zip");
        assertThat(row.get("page_count")).isNull();
        assertThat(row.get("sha256")).isEqualTo(HWPX_SHA);
        // S-4 (2026-11-13): HWPX 원문도 Storage에 그대로 보관한다
        assertThat((String) row.get("file_ref")).matches("[0-9a-f-]{36}");
        mvc.perform(asAdmin(get(PLANS + "/" + hwpx.planId()), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisions[0].documentFormat").value("HWPX"))
                .andExpect(jsonPath("$.revisions[0].pageCount").doesNotExist())
                .andExpect(jsonPath("$.revisions[0].checksum").value(HWPX_SHA));

        String created = mvc.perform(asAdmin(post(hwpx.base() + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(draft()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.analysisStatus").value("REVIEW_REQUIRED"))
                .andExpect(jsonPath("$.reviewStatus").value("UNREVIEWED"))
                .andReturn().getResponse().getContentAsString();
        mvc.perform(asAdmin(post(hwpx.base() + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(draft()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisId").value((String) JsonPath.read(created, "$.analysisId")));
        assertThat(count("assessment_plan_analysis_run")).isEqualTo(1);
        assertThat(count("assessment_plan_review")).isZero();

        mvc.perform(asAdmin(get(hwpx.base() + "/analysis"), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("UNREVIEWED"))
                .andExpect(jsonPath("$.subjects[0].subjectName").value("과학"))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].itemKey").value("P01"))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].sources[0].documentLocator.kind").value("HWPX_TABLE_CELL"))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].sources[0].documentLocator.section").value(0))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].sources[0].pdfPageNumber").doesNotExist());
        JsonNode stored = json.readTree(jdbc.queryForObject("select result_json from assessment_plan_analysis_run", String.class));
        assertThat(stored.toString()).contains("documentLocator").doesNotContain("pdfPageNumber\":1");

        // 학생: 미확정 문서는 보이지 않음(2026-11-13 OD-A08 → 404), 후보 미노출, 미확정 문서 참조 불가
        String students = mvc.perform(asStudent(get("/api/student/assessment/evaluation-plans/" + hwpx.planId()), "stu_001"))
                .andExpect(status().isNotFound())
                .andReturn().getResponse().getContentAsString();
        assertThat(students).doesNotContain("탐구 보고서", "documentLocator");
        mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"x","subjectId":"subj_14","academicYear":2026,"semester":1,
                                 "evaluationItemRef":{"documentRevisionId":"%s","subjectId":"subj_14","itemKey":"P01"}}""".formatted(hwpx.revisionId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("not_confirmed"));

        // 검토 확정: 실제 관리자 인증 없이(structured-confirm-dev=false) HWP·HWPX 공식 확정은 거절한다(검토 기록 생성 없음)
        mvc.perform(asAdmin(put(hwpx.base() + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_14","confirmedFields":[
                                  {"fieldPath":"performanceEvaluation.weightPercent","value":null,"pdfPageNumber":null}]}]}"""
                                .formatted((String) JsonPath.read(created, "$.analysisId"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("revision.documentFormat"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("verified_auth_required"));
        assertThat(count("assessment_plan_review")).isZero();
        assertThat(jdbc.queryForObject("select review_status from assessment_plan_revision where id = ?", String.class, hwpx.revisionId()))
                .isEqualTo("UNREVIEWED");
    }

    @Test
    void HWPX_수신의_형식별_Locator_규칙과_기존_공통_규칙() throws Exception {
        Revision hwpx = register(resource("/assessment/multiformat/synthetic-plan.hwpx"), "plan.hwpx");
        expectRejected(hwpx, mutate(root -> {
            firstItemSource(root).put("pdfPageNumber", 1);
            return root;
        }), "subjects[0].performanceEvaluation.items[0].sources[0].pdfPageNumber", "not_allowed");
        expectRejected(hwpx, mutate(root -> {
            firstItemSource(root).remove("documentLocator");
            return root;
        }), "subjects[0].performanceEvaluation.items[0].sources[0].documentLocator", "required");
        expectRejected(hwpx, mutate(root -> {
            ((ObjectNode) firstItemSource(root).path("documentLocator")).put("kind", "HWP_TABLE_CELL");
            return root;
        }), "subjects[0].performanceEvaluation.items[0].sources[0].documentLocator.kind", "format_mismatch");
        expectRejected(hwpx, mutate(root -> {
            ((ObjectNode) firstItemSource(root).path("documentLocator")).remove("row");
            return root;
        }), "subjects[0].performanceEvaluation.items[0].sources[0].documentLocator", "cell_position_required");
        expectRejected(hwpx, mutate(root -> {
            ((ObjectNode) root.path("source")).put("pageCount", 1);
            return root;
        }), "source.pageCount", "not_allowed");
        expectRejected(hwpx, mutate(root -> {
            ((ObjectNode) root.path("subjects").get(0)).putObject("pageRange").put("from", 1).put("to", 1);
            return root;
        }), "subjects[0].pageRange", "not_allowed");
        expectRejected(hwpx, mutate(root -> {
            ((ObjectNode) root.path("source")).put("format", "PDF");
            return root;
        }), "source.format", "format_mismatch");
        expectRejected(hwpx, mutate(root -> {
            ((ObjectNode) firstItemSource(root).path("documentLocator")).put("id", "SYNHWPX01#s0.p3");
            return root;
        }), "subjects[0].performanceEvaluation.items[0].sources[0].documentLocator.id", "unknown_field");
        expectRejected(hwpx, mutate(root -> {
            ((ObjectNode) root.path("subjects").get(0).path("performanceEvaluation").path("items").get(1)).put("itemKey", "P01");
            return root;
        }), "subjects[0].performanceEvaluation.items[1].itemKey", "duplicate");
        expectRejected(hwpx, mutate(root -> {
            ((ObjectNode) root.path("subjects").get(0).path("performanceEvaluation").path("items").get(1)).putArray("sources");
            return root;
        }), "subjects[0].performanceEvaluation.items[1].sources", "evidence_required");
        expectRejected(hwpx, mutate(root -> {
            root.put("status", "CONFIRMED");
            return root;
        }), "status", "format");
        expectRejected(hwpx, mutate(root -> {
            ((ObjectNode) root.path("source")).put("sha256", "0".repeat(64));
            return root;
        }), "source.sha256", "document_mismatch");
        // 표 칸 좌표와 path 마지막 r<row>c<col> 구간이 다르면 거절
        expectRejected(hwpx, mutate(root -> {
            ((ObjectNode) firstItemSource(root).path("documentLocator")).put("row", 9);
            return root;
        }), "subjects[0].performanceEvaluation.items[0].sources[0].documentLocator.path", "path_mismatch");
        expectRejected(hwpx, mutate(root -> {
            ObjectNode at = (ObjectNode) firstItemSource(root).path("documentLocator");
            at.put("path", at.path("path").asString() + ".p0.c0.r0c1"); // 중첩 표인데 바깥 칸 좌표를 그대로 둠
            return root;
        }), "subjects[0].performanceEvaluation.items[0].sources[0].documentLocator.path", "path_mismatch");
        assertThat(count("assessment_plan_analysis_run")).isZero();
    }

    @Test
    void 칸_안_문단과_중첩_표의_안쪽_칸_경로는_정상으로_받는다() throws Exception {
        Revision hwpx = register(resource("/assessment/multiformat/synthetic-plan.hwpx"), "plan.hwpx");
        String body = mutate(root -> {
            ArrayNodeHolder.items(root).forEach(item -> {
                for (JsonNode source : item.path("sources")) {
                    ObjectNode at = (ObjectNode) source.path("documentLocator");
                    at.put("path", at.path("path").asString() + ".p0"); // 칸 안 문단
                }
            });
            ObjectNode nested = (ObjectNode) firstItemSource(root).path("documentLocator");
            nested.put("path", nested.path("path").asString() + ".c0.r0c1"); // 칸 안 문단 속 중첩 표의 칸
            nested.put("row", 0).put("col", 1);
            return root;
        });
        mvc.perform(asAdmin(post(hwpx.base() + "/analysis-imports"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reviewStatus").value("UNREVIEWED"));
    }

    /** 초안 JSON에서 수행 항목 노드를 꺼내는 보조 함수 */
    static final class ArrayNodeHolder {
        static java.util.List<JsonNode> items(ObjectNode root) {
            java.util.List<JsonNode> list = new java.util.ArrayList<>();
            root.path("subjects").get(0).path("performanceEvaluation").path("items").forEach(list::add);
            return list;
        }
    }

    @Test
    void PDF와_HWPX_결과를_서로_다른_형식_Revision에_섞어_넣을_수_없다() throws Exception {
        byte[] pdf = resource("/assessment/analyzer-v21_1/synthetic-e2e.pdf");
        String pdfPayload = new String(resource("/assessment/analyzer-v21_1/analysis-import.json"), StandardCharsets.UTF_8);
        Revision pdfRevision = register(pdf, "plan.pdf");
        Revision hwpx = register(resource("/assessment/multiformat/synthetic-plan.hwpx"), "plan.hwpx");
        // HWPX 결과 → PDF Revision
        String hwpxOnPdf = mutate(root -> {
            ((ObjectNode) root.path("source")).put("sha256", "ab52297581ef154dbd0abe00a0cffcceec01513248bb60416fd2f5909173b404");
            return root;
        });
        expectRejected(pdfRevision, hwpxOnPdf, "source.format", "format_mismatch");
        expectRejected(pdfRevision, hwpxOnPdf, "subjects[0].performanceEvaluation.items[0].sources[0].documentLocator", "not_allowed");
        // PDF 결과 → HWPX Revision
        expectRejected(hwpx, pdfPayload, "source.format", "format_mismatch");
        expectRejected(hwpx, pdfPayload, "source.pageCount", "not_allowed");
        // 기존 PDF 결과는 PDF Revision에 그대로 들어간다(format 생략 = PDF)
        mvc.perform(asAdmin(post(pdfRevision.base() + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(pdfPayload))
                .andExpect(status().isCreated());
        // 회귀: 새 필드(documentLocator·format)가 PDF 저장 JSON에 null로 붙지 않는다 → 보낸 subjects와 같은 JSON
        JsonNode stored = json.readTree(jdbc.queryForObject("select result_json from assessment_plan_analysis_run", String.class));
        assertThat(stored).isEqualTo(json.readTree(pdfPayload).path("subjects"));
        assertThat(stored.toString()).doesNotContain("documentLocator");
        mvc.perform(asAdmin(get(PLANS + "/" + pdfRevision.planId()), OPERATOR))
                .andExpect(jsonPath("$.revisions[0].documentFormat").value("PDF"))
                .andExpect(jsonPath("$.revisions[0].pageCount").value(2));
    }

    @Test
    void 형식은_확장자가_아니라_바이트로_판별하고_잘못된_파일은_저장하지_않는다() throws Exception {
        // 확장자 위장: PDF 바이트를 .hwp로, HWPX 바이트를 .pdf로 올려도 실제 형식으로 저장된다
        Revision pdfAsHwp = register(resource("/assessment/analyzer-v21_1/synthetic-e2e.pdf"), "disguised.hwp");
        Revision hwpxAsPdf = register(resource("/assessment/multiformat/synthetic-plan.hwpx"), "disguised.pdf");
        assertThat(jdbc.queryForObject("select content_type from assessment_plan_revision where id = ?", String.class, pdfAsHwp.revisionId()))
                .isEqualTo("application/pdf");
        assertThat(jdbc.queryForObject("select content_type from assessment_plan_revision where id = ?", String.class, hwpxAsPdf.revisionId()))
                .isEqualTo("application/hwp+zip");
        // HWP 서명 검사용 합성 바이트(실제 한글 문서 아님): 등록 가능 = 형식 서명만 확인됨
        Revision hwp = register(DocumentFormatInspectorTest.hwpSignatureBytes(5, 0x1), "signature-only.hwp");
        assertThat(jdbc.queryForObject("select content_type from assessment_plan_revision where id = ?", String.class, hwp.revisionId()))
                .isEqualTo("application/x-hwp");
        long before = count("assessment_plan_revision");
        for (Object[] bad : new Object[][] {
            {"text.hwp", "plain".getBytes(StandardCharsets.UTF_8), "not_supported_format"},
            {"locked.hwp", DocumentFormatInspectorTest.hwpSignatureBytes(5, 0x2), "encrypted"},
            {"evil.hwpx", DocumentFormatInspectorTest.zipUnchecked(Map.of("mimetype", "application/hwp+zip", "../x.xml", "x")), "unsafe_entry_path"},
            {"bomb.hwpx", DocumentFormatInspectorTest.bomb(), "uncompressed_too_large"},
            {"nozip.hwpx", DocumentFormatInspectorTest.zipUnchecked(Map.of("Contents/section0.xml", "<x/>")), "not_hwpx_package"}}) {
            String response = mvc.perform(asAdmin(multipart(PLANS)
                                    .file(new MockMultipartFile("file", (String) bad[0], "application/octet-stream", (byte[]) bad[1])), OPERATOR)
                            .param("schoolId", "school_001").param("academicYear", "2026")
                            .param("grade", "1").param("semester", "1"))
                    .andExpect(status().isUnsupportedMediaType())
                    .andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE_TYPE"))
                    .andReturn().getResponse().getContentAsString();
            assertThat(response).as((String) bad[0]).contains("\"reason\":\"" + bad[2] + "\"");
        }
        assertThat(count("assessment_plan_revision")).isEqualTo(before);
    }
}
