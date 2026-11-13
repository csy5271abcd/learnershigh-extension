package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.MultiformatExperimentalApiTest.HWPX_SHA;
import static com.learnershigh.extension.assessment.controller.MultiformatExperimentalApiTest.resource;
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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
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
 * Phase B: HWP·HWPX 공식 검토 (통제된 합성 시험). structured-confirm-dev=true는 격리 시험 전용이며,
 * 기록은 reviewer_auth=MOCK_HEADER(운영 검토 실적 아님)로 남는다.
 * HWPX: 합성 HWPX + 초안 수신 JSON. HWP: 서명 검사용 합성 바이트(실제 한글 문서 아님) + 같은 초안을 HWP Locator로 바꾼 JSON.
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage", "assessment.analysis-import.enabled=true", "assessment.multiformat.experimental=true",
        "assessment.plan-review.structured-confirm-dev=true"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StructuredPlanReviewApiTest {

    static final String OPERATOR = "adm_plan_operator";
    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final String ITEM0_CELL = """
            {"kind":"%s_TABLE_CELL","section":0,"path":"p3.c0.r2c4","table":1,"row":2,"col":4,"rowSpan":1,"colSpan":1}""";
    static final String ITEM1_CELL = """
            {"kind":"%s_TABLE_CELL","section":0,"path":"p3.c0.r2c5","table":1,"row":2,"col":5,"rowSpan":1,"colSpan":1}""";

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

    record Doc(String planId, String revisionId, String analysisId, String format, String sha) {
        String review() {
            return PLANS + "/" + planId + "/revisions/" + revisionId + "/review";
        }

        String cell0() {
            return ITEM0_CELL.formatted(format).strip();
        }

        String cell1() {
            return ITEM1_CELL.formatted(format).strip();
        }

        String check() {
            return """
                    "sourceCheck":{"method":"LOCAL_FILE_EXTERNAL_VIEWER","localFileSha256":"%s","manualComparisonConfirmed":true}"""
                    .formatted(sha).strip();
        }
    }

    static String sha256(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    Doc register(byte[] bytes, String fileName, String format, String importJson) throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", fileName, "application/octet-stream", bytes)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "1"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String planId = JsonPath.read(body, "$.planId");
        String revisionId = JsonPath.read(body, "$.documentRevisionId");
        String created = mvc.perform(asAdmin(post(PLANS + "/" + planId + "/revisions/" + revisionId + "/analysis-imports"),
                        OPERATOR).contentType(MediaType.APPLICATION_JSON).content(importJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return new Doc(planId, revisionId, JsonPath.read(created, "$.analysisId"), format, sha256(bytes));
    }

    String draft() throws Exception {
        return new String(resource("/assessment/multiformat/synthetic-plan.hwpx.draft-import.json"), StandardCharsets.UTF_8);
    }

    Doc hwpx() throws Exception {
        return register(resource("/assessment/multiformat/synthetic-plan.hwpx"), "synthetic-plan.hwpx", "HWPX", draft());
    }

    Doc hwp() throws Exception {
        byte[] bytes = DocumentFormatInspectorTest.hwpSignatureBytes(5, 0x1);
        String json = draft().replace(HWPX_SHA, sha256(bytes)).replace("HWPX_", "HWP_").replace("\"HWPX\"", "\"HWP\"");
        return register(bytes, "signature-only.hwp", "HWP", json);
    }

    String body(Doc doc, String sourceCheck, String subjectExtra, String fields) {
        return """
                {"analysisId":"%s","decision":"CONFIRM"%s,"reviewedSubjects":[{"subjectId":"subj_14"%s,"confirmedFields":[%s]}]}"""
                .formatted(doc.analysisId(), sourceCheck == null ? "" : "," + sourceCheck, subjectExtra, fields);
    }

    String reject(Doc doc, String body, String field, String reason) throws Exception {
        String response = mvc.perform(asAdmin(put(doc.review()), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andReturn().getResponse().getContentAsString();
        assertThat(response).as(field + " " + reason).contains("{\"field\":\"" + field + "\",\"reason\":\"" + reason + "\"}");
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).isZero();
        return response;
    }

    @Test
    void HWPX_원문_근거_검증_위반은_모두_거절하고_기록을_남기지_않는다() throws Exception {
        Doc doc = hwpx();
        String idx = ",\"analysisSubjectIndex\":0";
        String ok = "{\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\",\"value\":25,\"documentLocator\":" + doc.cell0() + "}";

        reject(doc, body(doc, null, idx, ok), "sourceCheck", "required");
        reject(doc, body(doc, doc.check().replace(doc.sha(), "0".repeat(64)), idx, ok), "sourceCheck.localFileSha256", "document_mismatch");
        reject(doc, body(doc, doc.check().replace(doc.sha(), "ABC"), idx, ok), "sourceCheck.localFileSha256", "format");
        reject(doc, body(doc, doc.check().replace("\"manualComparisonConfirmed\":true", "\"manualComparisonConfirmed\":false"), idx, ok),
                "sourceCheck.manualComparisonConfirmed", "required");
        reject(doc, body(doc, doc.check().replace("LOCAL_FILE_EXTERNAL_VIEWER", "SERVER_VERIFIED"), idx, ok), "sourceCheck.method", "not_allowed");
        reject(doc, body(doc, doc.check(), "", ok), "reviewedSubjects[0].analysisSubjectIndex", "required");
        reject(doc, body(doc, doc.check(), ",\"analysisSubjectIndex\":5", ok), "reviewedSubjects[0].analysisSubjectIndex", "unknown");
        // 다른 평가 항목(P02)의 근거를 P01 값에 붙임
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\",\"value\":25,\"documentLocator\":" + doc.cell1() + "}"),
                "reviewedSubjects[0].confirmedFields[0].documentLocator", "evidence_not_in_analysis");
        // 같은 칸이지만 병합 정보가 다른 Locator
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\",\"value\":25,\"documentLocator\":"
                        + doc.cell0().replace("\"rowSpan\":1", "\"rowSpan\":2") + "}"),
                "reviewedSubjects[0].confirmedFields[0].documentLocator", "evidence_not_in_analysis");
        reject(doc, body(doc, doc.check(), idx, "{\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\",\"value\":25}"),
                "reviewedSubjects[0].confirmedFields[0].documentLocator", "required");
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\",\"value\":25,\"pdfPageNumber\":1,\"documentLocator\":" + doc.cell0() + "}"),
                "reviewedSubjects[0].confirmedFields[0].pdfPageNumber", "not_allowed");
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\",\"value\":25,\"documentLocator\":"
                        + doc.cell0().replace("HWPX_TABLE_CELL", "HWP_TABLE_CELL") + "}"),
                "reviewedSubjects[0].confirmedFields[0].documentLocator.kind", "format_mismatch");
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\",\"value\":25,\"documentLocator\":"
                        + doc.cell0().replace("\"row\":2", "\"row\":3") + "}"),
                "reviewedSubjects[0].confirmedFields[0].documentLocator.path", "path_mismatch");
        // 근거 노드에 구조 Locator가 없는 채점 요소, 분석 결과 밖 영역
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"performanceEvaluation.items[0].rubric[0].element\",\"value\":\"x\",\"documentLocator\":" + doc.cell0() + "}"),
                "reviewedSubjects[0].confirmedFields[0].fieldPath", "evidence_scope_unavailable");
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"achievement.standards\",\"value\":\"x\",\"documentLocator\":" + doc.cell0() + "}"),
                "reviewedSubjects[0].confirmedFields[0].fieldPath", "evidence_scope_unavailable");
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"performanceEvaluation.items[9].weightPercent\",\"value\":25,\"documentLocator\":" + doc.cell0() + "}"),
                "reviewedSubjects[0].confirmedFields[0].fieldPath", "unknown");
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"performanceEvaluation.items[00].weightPercent\",\"value\":25,\"documentLocator\":" + doc.cell0() + "}"),
                "reviewedSubjects[0].confirmedFields[0].fieldPath", "unknown");
        reject(doc, body(doc, doc.check(), idx, ok + "," + ok), "reviewedSubjects[0].confirmedFields[1].fieldPath", "duplicate");
        // 값 null은 원문에 없음을 확인한 표시(absence)와 위치가 있어야 한다
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"performanceEvaluation.items[0].maxScore\",\"value\":null,\"documentLocator\":" + doc.cell0() + "}"),
                "reviewedSubjects[0].confirmedFields[0].absence", "required");
        reject(doc, body(doc, doc.check(), idx,
                "{\"fieldPath\":\"performanceEvaluation.items[0].maxScore\",\"value\":25,\"absence\":\"NOT_IN_SOURCE\",\"documentLocator\":" + doc.cell0() + "}"),
                "reviewedSubjects[0].confirmedFields[0].absence", "not_allowed");

        // 다른 Revision의 분석 Run
        Doc other = hwpx();
        reject(doc, body(new Doc(doc.planId(), doc.revisionId(), other.analysisId(), "HWPX", doc.sha()), doc.check(), idx, ok),
                "analysisId", "unknown");
        assertThat(jdbc.queryForList("select review_status from assessment_plan_revision", String.class)).containsOnly("UNREVIEWED");
    }

    @Test
    void HWPX_검토_확정_기록_재조회와_학생에게는_확정_상태만() throws Exception {
        Doc doc = hwpx();
        String response = mvc.perform(asAdmin(put(doc.review()), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(body(doc, doc.check(), ",\"analysisSubjectIndex\":0",
                                "{\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\",\"value\":25,\"documentLocator\":" + doc.cell0() + "},"
                                        + "{\"fieldPath\":\"performanceEvaluation.items[1].weightPercent\",\"value\":25,\"documentLocator\":" + doc.cell1() + "},"
                                        + "{\"fieldPath\":\"performanceEvaluation.items[1].content\",\"value\":null,\"absence\":\"NOT_IN_SOURCE\",\"documentLocator\":" + doc.cell1() + "}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.confirmedFields.length()").value(3))
                .andExpect(jsonPath("$.confirmedFields[0].analysisSubjectIndex").value(0))
                .andExpect(jsonPath("$.confirmedFields[0].documentLocator.path").value("p3.c0.r2c4"))
                .andExpect(jsonPath("$.confirmedFields[0].pdfPageNumber").isEmpty())
                .andExpect(jsonPath("$.confirmedFields[2].absence").value("NOT_IN_SOURCE"))
                .andExpect(jsonPath("$.review.sourceReview.reviewerAuth").value("MOCK_HEADER"))
                .andExpect(jsonPath("$.review.sourceReview.sourceCheckSha256").value(HWPX_SHA))
                .andExpect(jsonPath("$.review.sourceReview.manualComparisonConfirmed").value(true))
                .andReturn().getResponse().getContentAsString();
        assertThat(response).contains("\"value\":25");

        Map<String, Object> review = jdbc.queryForMap("select reviewed_by, source_check_method, source_check_sha256, "
                + "manual_comparison_confirmed, reviewer_auth from assessment_plan_review");
        assertThat(review).containsEntry("reviewed_by", OPERATOR).containsEntry("source_check_method", "LOCAL_FILE_EXTERNAL_VIEWER")
                .containsEntry("source_check_sha256", HWPX_SHA).containsEntry("reviewer_auth", "MOCK_HEADER");
        assertThat(jdbc.queryForList("select evidence_format from assessment_plan_confirmed_value", String.class)).containsOnly("HWPX");
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_confirmed_value where pdf_page_number is null "
                + "and analysis_subject_index = 0 and json_extract(evidence_locator_json, '$.section') = 0", Integer.class)).isEqualTo(3);

        // 재조회: 관리자 문서 화면에 검토 기록
        mvc.perform(asAdmin(get(PLANS + "/" + doc.planId()), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisions[0].reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.revisions[0].confirmedFields[1].documentLocator.col").value(5))
                .andExpect(jsonPath("$.revisions[0].sourceReview.confirmedFieldCount").value(3));

        // 학생: 확정 상태만, 근거 위치·후보·검토 기록 없음
        String student = mvc.perform(asStudent(get("/api/student/assessment/evaluation-plans/" + doc.planId()), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andReturn().getResponse().getContentAsString();
        assertThat(student).doesNotContain("documentLocator", "sourceReview", "subjects", "localFileSha256", "MOCK_HEADER");
    }

    @Test
    void HWP_합성_서명_문서도_같은_규칙으로_확정한다() throws Exception {
        Doc doc = hwp();
        reject(doc, body(doc, doc.check(), ",\"analysisSubjectIndex\":0",
                        "{\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\",\"value\":25,\"documentLocator\":"
                                + doc.cell0().replace("HWP_TABLE_CELL", "HWPX_TABLE_CELL") + "}"),
                "reviewedSubjects[0].confirmedFields[0].documentLocator.kind", "format_mismatch");
        mvc.perform(asAdmin(put(doc.review()), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(body(doc, doc.check(), ",\"analysisSubjectIndex\":0",
                                "{\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\",\"value\":25,\"documentLocator\":" + doc.cell0() + "}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.confirmedFields[0].documentLocator.kind").value("HWP_TABLE_CELL"));
        assertThat(jdbc.queryForList("select evidence_format from assessment_plan_confirmed_value", String.class)).containsOnly("HWP");
    }
}
