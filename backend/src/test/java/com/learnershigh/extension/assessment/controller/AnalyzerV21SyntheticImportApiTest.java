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
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.io.IOException;
import java.io.InputStream;
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
 * 분석기 v21 실제 파이프라인 출력(합성 PDF) × Backend 수신 흐름.
 * Fixture: src/test/resources/assessment/analyzer-v21/ — PDF와 그 PDF의 분석 결과를 수정 없이 사용한다(합성 자료).
 * 검토 확정은 합성 데이터 기반 API 시험이며 실제 사람 검토가 아니다.
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.analysis-import.enabled=true", "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class AnalyzerV21SyntheticImportApiTest {

    static final String OPERATOR = "adm_plan_operator";
    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final String FIXTURE = "/assessment/analyzer-v21/";

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

    static byte[] fixture(String name) throws IOException {
        try (InputStream in = AnalyzerV21SyntheticImportApiTest.class.getResourceAsStream(FIXTURE + name)) {
            assertThat(in).as(name).isNotNull();
            return in.readAllBytes();
        }
    }

    String register(byte[] pdf) throws Exception {
        return mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", "synthetic-plan.pdf", "application/pdf", pdf)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "1"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    long count(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Long.class);
    }

    @Test
    void 분석기_v21_합성PDF_결과는_같은_PDF에_후보로_저장되고_확정_전에는_학생에게_보이지_않는다() throws Exception {
        byte[] pdf = fixture("synthetic-plan.pdf");
        String payload = new String(fixture("synthetic-plan.backend-import.json"), StandardCharsets.UTF_8);
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(pdf));
        assertThat(JsonPath.<String>read(payload, "$.source.sha256")).isEqualTo(sha);
        assertThat(JsonPath.<Integer>read(payload, "$.source.pageCount")).isEqualTo(2);

        String created = register(pdf);
        String planId = JsonPath.read(created, "$.planId");
        String revisionId = JsonPath.read(created, "$.documentRevisionId");
        Map<String, Object> revision = jdbc.queryForMap(
                "select sha256, page_count, file_ref from assessment_plan_revision where id = ?", revisionId);
        assertThat(revision.get("sha256")).isEqualTo(sha);
        assertThat(revision.get("page_count")).isEqualTo(2);
        // S-4 (2026-11-13): 원문을 Storage에 보관하고 저장 키(UUID)를 남긴다
        assertThat((String) revision.get("file_ref")).matches("[0-9a-f-]{36}");

        String base = PLANS + "/" + planId + "/revisions/" + revisionId;
        String imported = mvc.perform(asAdmin(post(base + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.analysisStatus").value("REVIEW_REQUIRED"))
                .andExpect(jsonPath("$.reviewStatus").value("UNREVIEWED"))
                .andReturn().getResponse().getContentAsString();
        String analysisId = JsonPath.read(imported, "$.analysisId");
        mvc.perform(asAdmin(post(base + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisId").value(analysisId));
        assertThat(count("assessment_plan_analysis_run")).isEqualTo(1);
        assertThat(count("assessment_plan_review")).isZero();

        // 관리자 후보 조회: 분석기가 보낸 값 그대로(내용 없는 P02는 null·빈 배열 유지), 확정값 없음
        mvc.perform(asAdmin(get(base + "/analysis"), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("UNREVIEWED"))
                .andExpect(jsonPath("$.confirmedFields").isEmpty())
                .andExpect(jsonPath("$.analyzer.version").value("v21/backend-adapter-0.1"))
                .andExpect(jsonPath("$.subjects[0].subjectName").value("과학"))
                .andExpect(jsonPath("$.subjects[0].writtenEvaluation.exams[0].itemKey").value("W01"))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].itemKey").value("P01"))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].submissions[0]").value("탐구 보고서"))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].conditions.length()").value(2))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].rubric[1].levels[1].score").value(8))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].rubric[0].sources[0].pdfPageNumber").value(2))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[1].content").doesNotExist())
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[1].rubric").isEmpty());

        // 학생: 관리자 확정 전 문서는 목록·상세 모두 보이지 않는다(2026-11-13 OD-A08), AI 후보 없음, 미확정 항목 참조 불가
        String studentList = mvc.perform(asStudent(get("/api/student/assessment/evaluation-plans")
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "1"), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0))
                .andReturn().getResponse().getContentAsString();
        assertThat(studentList).doesNotContain("탐구 보고서", "extractedText", "subjects");
        mvc.perform(asStudent(get("/api/student/assessment/evaluation-plans/" + planId), "stu_001"))
                .andExpect(status().isNotFound());
        String reference = """
                {"title":"탐구 보고서","subjectId":"subj_12","academicYear":2026,"semester":1,
                 "evaluationItemRef":{"documentRevisionId":"%s","subjectId":"subj_12","itemKey":"P01"}}""".formatted(revisionId);
        mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(reference))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("not_confirmed"));
        assertThat(count("assessment_school_assessment")).isZero();

        // 합성 데이터 기반 검토 API 시험 → 학생 참조 등록 → 관리자 같은 ID·상태
        mvc.perform(asAdmin(put(base + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_12","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.items[0].weightPercent","value":25,"pdfPageNumber":1}]}]}"""
                        .formatted(analysisId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"));
        assertThat(jdbc.queryForObject("select status from assessment_plan_analysis_run where id = ?", String.class, analysisId))
                .isEqualTo("REVIEW_REQUIRED");
        String assessment = mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(reference))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.evaluationItemRef.itemKey").value("P01"))
                .andReturn().getResponse().getContentAsString();
        String assessmentId = JsonPath.read(assessment, "$.assessmentId");
        mvc.perform(asAdmin(get("/api/admin/assessment/students/stu_001/school-assessments")
                        .param("academicYear", "2026").param("semester", "1"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].assessmentId").value(assessmentId))
                .andExpect(jsonPath("$.items[0].evaluationItemRef.documentRevisionId").value(revisionId));
    }

    @Test
    void 분석기_결과를_다른_PDF_Revision에_보내면_거절하고_저장하지_않는다() throws Exception {
        byte[] pdf = fixture("synthetic-plan.pdf");
        byte[] tail = "\n% another revision\n".getBytes(StandardCharsets.US_ASCII);
        byte[] other = java.util.Arrays.copyOf(pdf, pdf.length + tail.length);  // 같은 2쪽 PDF, 끝에 주석만 추가 → SHA-256만 다르다
        System.arraycopy(tail, 0, other, pdf.length, tail.length);
        String created = register(other);
        String base = PLANS + "/" + JsonPath.read(created, "$.planId") + "/revisions/" + JsonPath.read(created, "$.documentRevisionId");
        mvc.perform(asAdmin(post(base + "/analysis-imports"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(new String(fixture("synthetic-plan.backend-import.json"), StandardCharsets.UTF_8)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("source.sha256"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("document_mismatch"));
        assertThat(count("assessment_plan_analysis_run")).isZero();
    }
}
