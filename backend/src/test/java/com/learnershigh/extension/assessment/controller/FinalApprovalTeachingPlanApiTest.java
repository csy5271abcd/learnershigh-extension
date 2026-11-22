package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
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
 * A28-08 통합 최종 승인: 학교알리미 공식 원본의 평가 정보(수행·지필)와 월별 운영계획을 한 요청·한 Transaction 으로 확정한다.
 * 어느 한쪽이 거절되면 둘 다 0건이다(부분 성공 없음). 학교알리미 수집 상태는 원본 기록·슬롯 연결 행으로 재현한다(실제 접속 없음).
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage-a28-08",
        "assessment.analysis-import.enabled=true", "assessment.analysis-import.contract03-enabled=true"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class FinalApprovalTeachingPlanApiTest {

    static final String OPERATOR = "adm_plan_operator";
    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final String SERVER = "\"sourceCheck\":{\"method\":\"SERVER_STORED_ORIGINAL\"}";

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;

    String planId;
    String revisionId;
    String analysisId;

    @BeforeEach
    void setUp() throws Exception {
        for (String table : new String[] {"assessment_plan_teaching_plan_row", "assessment_plan_teaching_plan_review",
                "assessment_plan_review_draft_event", "assessment_plan_review_draft", "assessment_school_assessment",
                "assessment_plan_confirmed_value", "assessment_plan_review", "assessment_schoolinfo_slot_link",
                "assessment_schoolinfo_source_file", "assessment_plan_analysis_run", "assessment_plan_revision",
                "assessment_evaluation_plan"}) {
            jdbc.update("delete from " + table);
        }
        byte[] pdf = MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/synthetic-e2e.pdf");
        String body = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "synthetic-e2e.pdf",
                                "application/octet-stream", pdf)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026").param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        planId = JsonPath.read(body, "$.planId");
        revisionId = JsonPath.read(body, "$.documentRevisionId");
        String payload = new String(MultiformatExperimentalApiTest.resource("/assessment/contract03/synthetic-0.3.analysis-import.json"),
                StandardCharsets.UTF_8);
        analysisId = JsonPath.read(mvc.perform(asAdmin(post(revision() + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.analysisId");
        // 학교알리미 자동 수집이 남기는 원본 기록 + 이 칸 연결
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(pdf));
        String source = "si_src_" + UUID.randomUUID().toString().substring(0, 12);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("insert into assessment_schoolinfo_source_file (id, school_id, requested_year, file_name, sha256, size_bytes, verification, downloaded_at) "
                + "values (?, 'school_001', 2026, 'synthetic-e2e.pdf', ?, 1, 'VERIFIED', ?)", source, sha, now);
        jdbc.update("insert into assessment_schoolinfo_slot_link (id, source_file_id, school_id, academic_year, grade, semester, plan_id, revision_id, created_at) "
                + "values (?, ?, 'school_001', 2026, 1, 2, ?, ?, ?)", "si_link_" + UUID.randomUUID().toString().substring(0, 12), source,
                planId, revisionId, now);
    }

    String revision() {
        return PLANS + "/" + planId + "/revisions/" + revisionId;
    }

    String approval(String extra, String teachingRows) {
        return """
                {"analysisId":"%s","decision":"CONFIRM",%s%s,"reviewedSubjects":[{"subjectId":"subj_02","analysisSubjectIndex":0,
                 "confirmedFields":[{"fieldPath":"performanceEvaluation.weightPercent","value":60,"pdfPageNumber":1}]}]%s}"""
                .formatted(analysisId, SERVER, extra, teachingRows == null ? ""
                        : ",\"teachingPlan\":{\"analysisId\":\"" + analysisId + "\",\"rows\":[" + teachingRows + "]}");
    }

    static String row(String key, String decision) {
        return "{\"subjectIndex\":0,\"rowKey\":\"" + key + "\",\"subjectId\":\"subj_02\",\"decision\":\"" + decision + "\"}";
    }

    int count(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Integer.class);
    }

    @Test
    void 최종_승인_한_번으로_평가_정보와_월별_운영계획이_함께_확정된다() throws Exception {
        mvc.perform(asAdmin(put(revision() + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(approval(",\"bulk\":true", row("T01", "CONFIRMED") + "," + row("T02", "CONFIRMED") + "," + row("T08", "EXCLUDED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"));
        assertThat(count("assessment_plan_review")).isEqualTo(1);
        assertThat(count("assessment_plan_teaching_plan_review")).isEqualTo(1);
        assertThat(jdbc.queryForList("select concat(row_key,':',decision) from assessment_plan_teaching_plan_row order by row_key", String.class))
                .containsExactly("T01:CONFIRMED", "T02:CONFIRMED", "T08:EXCLUDED");
        assertThat(jdbc.queryForObject("select source_check_method from assessment_plan_review", String.class)).isEqualTo("SERVER_STORED_ORIGINAL");
        // 확정된 운영계획은 운영계획 조회에도 그대로 보인다(같은 확정 기록)
        mvc.perform(asAdmin(get(revision() + "/teaching-plan-review"), OPERATOR))
                .andExpect(status().isOk()).andExpect(jsonPath("$.review.rows.length()").value(3));
    }

    @Test
    void 운영계획이_거절되면_평가_정보도_확정되지_않는다() throws Exception {
        String response = mvc.perform(asAdmin(put(revision() + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(approval(",\"bulk\":true", row("T01", "CONFIRMED") + "," + row("T99", "CONFIRMED"))))
                .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();
        assertThat(response).contains("{\"field\":\"teachingPlan.rows[1].rowKey\",\"reason\":\"unknown\"}");
        assertThat(count("assessment_plan_review")).as("부분 성공 없음").isZero();
        assertThat(count("assessment_plan_confirmed_value")).isZero();
        assertThat(count("assessment_plan_teaching_plan_review")).isZero();
        assertThat(jdbc.queryForObject("select review_status from assessment_plan_revision", String.class)).isNotEqualTo("CONFIRMED");
    }

    @Test
    void 운영계획_동시_확정은_서버_원본_한_번에_확정에서만_받고_분석_결과가_같아야_한다() throws Exception {
        String rows = row("T01", "CONFIRMED");
        assertThat(mvc.perform(asAdmin(put(revision() + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(approval("", rows)))
                .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString())
                .contains("{\"field\":\"teachingPlan\",\"reason\":\"not_allowed\"}");
        assertThat(mvc.perform(asAdmin(put(revision() + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(approval(",\"bulk\":true", rows).replace("\"teachingPlan\":{\"analysisId\":\"" + analysisId,
                                "\"teachingPlan\":{\"analysisId\":\"analysis_other")))
                .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString())
                .contains("{\"field\":\"teachingPlan.analysisId\",\"reason\":\"conflict\"}");
        assertThat(count("assessment_plan_review")).isZero();
        assertThat(count("assessment_plan_teaching_plan_review")).isZero();
    }
}
