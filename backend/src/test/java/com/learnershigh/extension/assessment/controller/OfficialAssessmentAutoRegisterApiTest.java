package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import java.util.List;
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
 * A28-20 학교 확정 수행평가 자동 등록(§12-c). 문서 슬롯 school_001 2026 고1 2학기 · 과목 subj_02(Mock 학적: stu_* 모두 이 슬롯).
 * 승인 관리자 adm_demo_gangnam(지점 br_gangnam: stu_001…) → 확정 Transaction 에서 등록. 다른 지점 학생(stu_101)은 목록 조회 때 등록.
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage-a28-08",
        "assessment.analysis-import.enabled=true", "assessment.analysis-import.contract03-enabled=true"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class OfficialAssessmentAutoRegisterApiTest {

    static final String ADMIN = "adm_demo_gangnam";
    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final String LIST = "/api/student/assessment/school-assessments";
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
        for (String table : new String[] {"assessment_school_assessment_status_event", "assessment_school_assessment",
                "assessment_plan_teaching_plan_row", "assessment_plan_teaching_plan_review", "assessment_plan_review_draft_event",
                "assessment_plan_review_draft", "assessment_plan_confirmed_value", "assessment_plan_review",
                "assessment_schoolinfo_slot_link", "assessment_schoolinfo_source_file", "assessment_plan_analysis_run",
                "assessment_plan_revision", "assessment_evaluation_plan"}) {
            jdbc.update("delete from " + table);
        }
        byte[] pdf = MultiformatExperimentalApiTest.resource("/assessment/analyzer-v21_1/synthetic-e2e.pdf");
        String body = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "synthetic-e2e.pdf",
                                "application/octet-stream", pdf)), ADMIN)
                        .param("schoolId", "school_001").param("academicYear", "2026").param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        planId = JsonPath.read(body, "$.planId");
        revisionId = JsonPath.read(body, "$.documentRevisionId");
        String payload = new String(MultiformatExperimentalApiTest.resource("/assessment/contract03/synthetic-0.3.analysis-import.json"),
                StandardCharsets.UTF_8);
        analysisId = JsonPath.read(mvc.perform(asAdmin(post(revision() + "/analysis-imports"), ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.analysisId");
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

    /** 수행 2개(이름·반영·시기) + 지필 반영. teachingRows 가 있으면 운영계획도 함께 */
    String approval(String items, String teachingRows) {
        return """
                {"analysisId":"%s","decision":"CONFIRM",%s,"bulk":true,"reviewedSubjects":[{"subjectId":"subj_02","analysisSubjectIndex":0,
                 "confirmedFields":[%s,{"fieldPath":"writtenEvaluation.weightPercent","value":60,"pdfPageNumber":1}]}]%s}"""
                .formatted(analysisId, SERVER, items, teachingRows == null ? ""
                        : ",\"teachingPlan\":{\"analysisId\":\"" + analysisId + "\",\"rows\":[" + teachingRows + "]}");
    }

    static String item(int index, String label, int weight, String timing) {
        return """
                {"fieldPath":"performanceEvaluation.items[%d].label","value":"%s","pdfPageNumber":1},
                {"fieldPath":"performanceEvaluation.items[%d].weightPercent","value":%d,"pdfPageNumber":1},
                {"fieldPath":"performanceEvaluation.items[%d].timing","value":"%s","pdfPageNumber":1}"""
                .formatted(index, label, index, weight, index, timing);
    }

    static final String TWO = item(0, "탐구 보고서", 20, "9월") + "," + item(1, "실험 활동", 20, "10월");

    List<Map<String, Object>> official(String studentId) {
        return jdbc.queryForList("select id, title, status, official_key, official_status, official_timing, official_weight_percent,"
                + " evaluation_date, deadline_date, personal_memo, deleted_at from assessment_school_assessment"
                + " where student_id = ? and official_key is not null order by official_key", studentId);
    }

    void confirm(String body) throws Exception {
        mvc.perform(asAdmin(put(revision() + "/review"), ADMIN).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
    }

    @Test
    void 최종_승인하면_슬롯_수강_학생에게_수행평가만_자동_등록되고_날짜는_만들지_않는다() throws Exception {
        confirm(approval(TWO, "{\"subjectIndex\":0,\"rowKey\":\"T01\",\"subjectId\":\"subj_02\",\"decision\":\"CONFIRMED\"}"));
        List<Map<String, Object>> rows = official("stu_001");
        assertThat(rows).hasSize(2);
        assertThat(rows).extracting(r -> r.get("title")).containsExactly("탐구 보고서", "실험 활동");
        assertThat(rows).extracting(r -> r.get("official_key")).containsExactly(planId + "|subj_02|P01", planId + "|subj_02|P02");
        assertThat(rows).allSatisfy(r -> {
            assertThat(r.get("status")).isEqualTo("BEFORE_START");
            assertThat(r.get("evaluation_date")).isNull();
            assertThat(r.get("deadline_date")).isNull();
            assertThat(r.get("official_status")).isEqualTo("ACTIVE");
        });
        assertThat(rows.getFirst().get("official_timing")).isEqualTo("9월");
        assertThat(jdbc.queryForObject("select count(*) from assessment_school_assessment where official_key is null", Integer.class))
                .as("지필평가·운영계획 행은 수행평가로 만들지 않는다").isZero();
        // 학생 목록·상세에 같은 행이 학교 확정으로 보인다
        mvc.perform(asStudent(get(LIST), "stu_001").param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].official.status").value("ACTIVE"))
                .andExpect(jsonPath("$.items[0].official.timing").exists());
        // 담당 밖 학생(분당 지점)은 확정 때 등록되지 않았다가, 자기 목록을 열면 같은 규칙으로 등록된다 — 두 번 열어도 2건
        assertThat(official("stu_101")).isEmpty();
        for (int i = 0; i < 2; i++) {
            mvc.perform(asStudent(get(LIST), "stu_101").param("academicYear", "2026").param("semester", "2"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(2));
        }
        assertThat(official("stu_101")).hasSize(2);
        // 다른 학기(2025-2) 학적에는 등록하지 않는다
        mvc.perform(asStudent(get(LIST), "stu_001").param("academicYear", "2025").param("semester", "2")).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void 승인이_거절되면_학생_수행평가도_0건이다() throws Exception {
        mvc.perform(asAdmin(put(revision() + "/review"), ADMIN).contentType(MediaType.APPLICATION_JSON)
                        .content(approval(TWO, "{\"subjectIndex\":0,\"rowKey\":\"T99\",\"subjectId\":\"subj_02\",\"decision\":\"CONFIRMED\"}")))
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select count(*) from assessment_school_assessment", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).isZero();
    }

    @Test
    void 재확정은_같은_행의_공식_값만_바꾸고_학생_기록은_보존하며_빠진_항목은_지우지_않는다() throws Exception {
        confirm(approval(TWO, null));
        List<Map<String, Object>> before = official("stu_001");
        String first = (String) before.getFirst().get("id");
        String second = (String) before.get(1).get("id");
        // 학생 개인 기록: 상태·메모·내 평가일
        mvc.perform(asStudent(patch(LIST + "/" + first + "/status"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_PROGRESS\"}")).andExpect(status().isOk());
        mvc.perform(asStudent(patch(LIST + "/" + first), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content("{\"personalMemo\":\"준비물 챙기기\",\"evaluationDate\":\"2026-09-20\"}")).andExpect(status().isOk());
        // 이름은 학교 확정 값 — 학생이 바꿀 수 없다
        mvc.perform(asStudent(patch(LIST + "/" + first), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"내 마음대로\"}")).andExpect(status().isBadRequest());
        // 다른 학생은 이 행에 접근할 수 없다
        mvc.perform(asStudent(get(LIST + "/" + first), "stu_002")).andExpect(status().isNotFound());

        // 재검토 → 반영 비율 변경, 두 번째 항목 제외(첫 항목만)
        mvc.perform(asAdmin(post(revision() + "/review-draft/reopen"), ADMIN)).andExpect(status().isOk());
        confirm(approval(item(0, "탐구 보고서", 30, "9월"), null));
        List<Map<String, Object>> after = official("stu_001");
        assertThat(after).hasSize(2).as("새 행 없음");
        Map<String, Object> kept = after.stream().filter(r -> r.get("id").equals(first)).findFirst().orElseThrow();
        assertThat(((java.math.BigDecimal) kept.get("official_weight_percent")).intValue()).isEqualTo(30);
        assertThat(kept.get("status")).isEqualTo("IN_PROGRESS");
        assertThat(kept.get("personal_memo")).isEqualTo("준비물 챙기기");
        assertThat(kept.get("evaluation_date").toString()).isEqualTo("2026-09-20");
        Map<String, Object> dropped = after.stream().filter(r -> r.get("id").equals(second)).findFirst().orElseThrow();
        assertThat(dropped.get("official_status")).isEqualTo("WITHDRAWN");
        assertThat(dropped.get("deleted_at")).isNull();
    }

    @Test
    void 학생이_지운_공식_항목은_다시_만들지_않고_학생_직접_등록_항목은_그대로다() throws Exception {
        String own = JsonPath.read(mvc.perform(asStudent(post(LIST), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"탐구 보고서 준비\",\"subjectId\":\"subj_02\",\"academicYear\":2026,\"semester\":2}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.assessmentId");
        confirm(approval(TWO, null));
        String officialId = (String) official("stu_001").getFirst().get("id");
        mvc.perform(asStudent(delete(LIST + "/" + officialId), "stu_001")).andExpect(status().is2xxSuccessful());
        for (int i = 0; i < 2; i++) {
            mvc.perform(asStudent(get(LIST), "stu_001").param("academicYear", "2026").param("semester", "2")).andExpect(status().isOk())
                    .andExpect(jsonPath("$.items.length()").value(2));
        }
        assertThat(official("stu_001")).hasSize(2);
        assertThat(jdbc.queryForObject("select title from assessment_school_assessment where id = ?", String.class, own))
                .as("비슷한 이름의 직접 등록 항목은 병합·변경하지 않는다").isEqualTo("탐구 보고서 준비");
        mvc.perform(get(LIST).param("academicYear", "2026").param("semester", "2")).andExpect(status().isUnauthorized());
    }
}
