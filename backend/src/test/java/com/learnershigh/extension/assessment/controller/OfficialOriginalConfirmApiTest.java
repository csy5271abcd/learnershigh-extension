package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.MultiformatExperimentalApiTest.HWPX_SHA;
import static com.learnershigh.extension.assessment.controller.MultiformatExperimentalApiTest.resource;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
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
 * A28-05 원클릭 최종 승인: 학교알리미 공식 수집 원본은 서버가 보관 원본을 직접 검증한다(SERVER_STORED_ORIGINAL).
 * structured-confirm-dev 는 기본값(false) 그대로 — 관리자 로컬 파일 대조(LOCAL) 경로의 기존 보호는 유지되는지 함께 본다.
 * 학교알리미 수집 상태는 원본 기록·슬롯 연결 행으로 재현한다(합성 HWPX, 실제 학교알리미 접속 없음).
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage-a28", "assessment.analysis-import.enabled=true",
        "assessment.multiformat.experimental=true"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class OfficialOriginalConfirmApiTest {

    static final String OPERATOR = "adm_plan_operator";
    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final String CELL0 = """
            {"kind":"HWPX_TABLE_CELL","section":0,"path":"p3.c0.r2c4","table":1,"row":2,"col":4,"rowSpan":1,"colSpan":1}""".strip();
    static final String SERVER = "\"sourceCheck\":{\"method\":\"SERVER_STORED_ORIGINAL\"}";

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;

    record Doc(String planId, String revisionId, String analysisId) {
        String review() {
            return PLANS + "/" + planId + "/revisions/" + revisionId + "/review";
        }
    }

    @BeforeEach
    void setUp() {
        jdbc.update("delete from assessment_school_assessment");
        jdbc.update("delete from assessment_plan_confirmed_value");
        jdbc.update("delete from assessment_plan_review");
        jdbc.update("delete from assessment_plan_review_draft_event");
        jdbc.update("delete from assessment_plan_review_draft");
        jdbc.update("delete from assessment_schoolinfo_slot_link");
        jdbc.update("delete from assessment_schoolinfo_source_file");
        jdbc.update("delete from assessment_plan_analysis_run");
        jdbc.update("delete from assessment_plan_revision");
        jdbc.update("delete from assessment_evaluation_plan");
    }

    Doc hwpx() throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", "synthetic-plan.hwpx", "application/octet-stream",
                                        resource("/assessment/multiformat/synthetic-plan.hwpx"))), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026").param("grade", "1").param("semester", "1"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String planId = JsonPath.read(body, "$.planId");
        String revisionId = JsonPath.read(body, "$.documentRevisionId");
        String draft = new String(resource("/assessment/multiformat/synthetic-plan.hwpx.draft-import.json"), StandardCharsets.UTF_8);
        String created = mvc.perform(asAdmin(post(PLANS + "/" + planId + "/revisions/" + revisionId + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(draft))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new Doc(planId, revisionId, JsonPath.read(created, "$.analysisId"));
    }

    /** 학교알리미 자동 수집이 남기는 원본 기록 + 슬롯 연결(그 문서·Revision) */
    void linkAsSchoolInfo(Doc doc, String sha, int grade) {
        String source = "si_src_" + UUID.randomUUID().toString().substring(0, 12);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("insert into assessment_schoolinfo_source_file (id, school_id, requested_year, file_name, sha256, size_bytes, verification, downloaded_at) "
                + "values (?, 'school_001', 2026, 'synthetic-plan.hwpx', ?, 1, 'VERIFIED', ?)", source, sha, now);
        jdbc.update("insert into assessment_schoolinfo_slot_link (id, source_file_id, school_id, academic_year, grade, semester, plan_id, revision_id, created_at) "
                + "values (?, ?, 'school_001', 2026, ?, 1, ?, ?, ?)", "si_link_" + UUID.randomUUID().toString().substring(0, 12), source, grade,
                doc.planId(), doc.revisionId(), now);
    }

    String body(Doc doc, String sourceCheck) {
        return """
                {"analysisId":"%s","decision":"CONFIRM",%s,"bulk":true,"reviewedSubjects":[{"subjectId":"subj_14","analysisSubjectIndex":0,
                "confirmedFields":[{"fieldPath":"performanceEvaluation.items[0].weightPercent","value":25,"documentLocator":%s}]}]}"""
                .formatted(doc.analysisId(), sourceCheck, CELL0);
    }

    String reject(Doc doc, String body, int status, String expected) throws Exception {
        String response = mvc.perform(asAdmin(put(doc.review()), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString();
        assertThat(response).as(expected).contains(expected);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).as("확정 0건").isZero();
        return response;
    }

    @Test
    void 학교알리미_공식_원본은_파일_재선택_없이_서버_검증으로_HWPX_를_확정하고_수동_대조로_기록하지_않는다() throws Exception {
        Doc doc = hwpx();
        linkAsSchoolInfo(doc, HWPX_SHA, 1);
        mvc.perform(asAdmin(put(doc.review()), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body(doc, SERVER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.confirmedFields.length()").value(1));
        Map<String, Object> review = jdbc.queryForMap("select source_check_method, source_check_sha256, manual_comparison_confirmed, reviewer_auth "
                + "from assessment_plan_review");
        assertThat(review).containsEntry("source_check_method", "SERVER_STORED_ORIGINAL").containsEntry("source_check_sha256", HWPX_SHA)
                .containsEntry("reviewer_auth", "MOCK_HEADER");
        assertThat(review.get("manual_comparison_confirmed")).as("서버 검증은 수동 대조가 아니다").isIn(false, 0, (byte) 0);
    }

    @Test
    void 학교알리미_원본이_아니거나_다른_칸이거나_원본_기록이_다르면_서버_검증을_거절한다() throws Exception {
        Doc doc = hwpx();
        // 직접 업로드 문서(슬롯 연결 없음)
        reject(doc, body(doc, SERVER), 400, "{\"field\":\"sourceCheck.method\",\"reason\":\"not_official_original\"}");
        // 다른 학년 칸 연결(학교·학년도·학년·학기 불일치)
        linkAsSchoolInfo(doc, HWPX_SHA, 2);
        reject(doc, body(doc, SERVER), 400, "not_official_original");
        jdbc.update("delete from assessment_schoolinfo_slot_link");
        jdbc.update("delete from assessment_schoolinfo_source_file");
        // 학교알리미 원본 기록 SHA ≠ Revision SHA
        linkAsSchoolInfo(doc, "0".repeat(64), 1);
        reject(doc, body(doc, SERVER), 400, "official_source_mismatch");
    }

    @Test
    void 서버_검증에는_로컬_파일_값을_섞지_못하고_기존_로컬_대조_보호는_그대로다() throws Exception {
        Doc doc = hwpx();
        linkAsSchoolInfo(doc, HWPX_SHA, 1);
        reject(doc, body(doc, "\"sourceCheck\":{\"method\":\"SERVER_STORED_ORIGINAL\",\"localFileSha256\":\"" + HWPX_SHA + "\",\"manualComparisonConfirmed\":true}"),
                400, "{\"field\":\"sourceCheck.localFileSha256\",\"reason\":\"not_allowed\"}");
        // structured-confirm-dev=false 기본값: 관리자 로컬 파일 대조(LOCAL) 경로의 HWPX 확정은 여전히 거절
        reject(doc, body(doc, "\"sourceCheck\":{\"method\":\"LOCAL_FILE_EXTERNAL_VIEWER\",\"localFileSha256\":\"" + HWPX_SHA + "\",\"manualComparisonConfirmed\":true}"),
                400, "verified_auth_required");
        // 인증 없음
        mvc.perform(put(doc.review()).contentType(MediaType.APPLICATION_JSON).content(body(doc, SERVER))).andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).isZero();
    }

    @Test
    void 서버_검증으로_확정한_뒤_재검토를_시작해_다시_확정하면_새_기록이_쌓이고_이전_기록은_그대로다() throws Exception {
        Doc doc = hwpx();
        linkAsSchoolInfo(doc, HWPX_SHA, 1);
        mvc.perform(asAdmin(put(doc.review()), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body(doc, SERVER))).andExpect(status().isOk());
        // 재검토 시작 전 재확정은 거절
        reject409(doc);
        mvc.perform(asAdmin(post(doc.review() + "-draft/reopen"), OPERATOR)).andExpect(status().isOk());
        mvc.perform(asAdmin(put(doc.review()), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(body(doc, SERVER).replace("\"value\":25", "\"value\":30")))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForList("select value_json from assessment_plan_confirmed_value order by value_json", String.class)).containsExactly("25", "30");
    }

    void reject409(Doc doc) throws Exception {
        mvc.perform(asAdmin(put(doc.review()), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body(doc, SERVER)))
                .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).isEqualTo(1);
    }
}
