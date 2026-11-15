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
import org.springframework.test.web.servlet.ResultActions;

/**
 * 분석기 v21.1 합성 PDF 결과 수신 + 학생 evaluationItemRef의 itemKey 존재 확인 (G-7 A안).
 * Fixture는 계정 B 산출물을 바이트 그대로 복사한 합성 자료다. 검토 확정은 합성 데이터 기반 API 시험이며 실제 사람 검토가 아니다.
 * 과목 매핑(가상과학탐구 → subj_14)은 시험용 가정이다.
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.analysis-import.enabled=true", "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class AnalyzerV211ImportAndItemKeyApiTest {

    static final String OPERATOR = "adm_plan_operator";
    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final String SUBJECT = "subj_14";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    @org.junit.jupiter.api.AfterEach
    void setUp() {
        // A12: 재검토 시작이 초안을 만들므로 분석 Run보다 먼저 지운다(끝난 뒤에도 지워 다른 시험 클래스의 정리를 막지 않는다)
        jdbc.update("delete from assessment_plan_review_draft_event");
        jdbc.update("delete from assessment_plan_review_draft");
        jdbc.update("delete from assessment_school_assessment");
        jdbc.update("delete from assessment_plan_confirmed_value");
        jdbc.update("delete from assessment_plan_review");
        jdbc.update("delete from assessment_plan_analysis_run");
        jdbc.update("delete from assessment_plan_revision");
        jdbc.update("delete from assessment_evaluation_plan");
    }

    static byte[] fixture(String name) throws IOException {
        try (InputStream in = AnalyzerV211ImportAndItemKeyApiTest.class
                .getResourceAsStream("/assessment/analyzer-v21_1/" + name)) {
            assertThat(in).as(name).isNotNull();
            return in.readAllBytes();
        }
    }

    record Revision(String planId, String revisionId) {
        String base() {
            return PLANS + "/" + planId + "/revisions/" + revisionId;
        }
    }

    Revision register(byte[] pdf) throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", "synthetic.pdf", "application/pdf", pdf)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "1"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return new Revision(JsonPath.read(body, "$.planId"), JsonPath.read(body, "$.documentRevisionId"));
    }

    String importRun(Revision revision, String payload) throws Exception {
        String body = mvc.perform(asAdmin(post(revision.base() + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.analysisId");
    }

    void confirm(Revision revision, String analysisId) throws Exception {
        mvc.perform(asAdmin(put(revision.base() + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"%s","confirmedFields":[
                                  {"fieldPath":"performanceEvaluation.weightPercent","value":60,"pdfPageNumber":1}]}]}"""
                                .formatted(analysisId, SUBJECT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"));
    }

    ResultActions reference(String revisionId, String itemKey) throws Exception {
        return mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), "stu_001")
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"title":"참조 시험","subjectId":"%s","academicYear":2026,"semester":1,
                         "evaluationItemRef":{"documentRevisionId":"%s","subjectId":"%s","itemKey":"%s"}}"""
                        .formatted(SUBJECT, revisionId, SUBJECT, itemKey)));
    }

    long assessments() {
        return jdbc.queryForObject("select count(*) from assessment_school_assessment", Long.class);
    }

    void expectUnknownItemKey(String revisionId, String itemKey) throws Exception {
        long before = assessments();
        reference(revisionId, itemKey)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value("evaluationItemRef.itemKey"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("unknown"));
        assertThat(assessments()).isEqualTo(before);
    }

    @Test
    void 분석기_v21_1_결과는_후보로만_저장되고_관리자에게_그대로_보인다() throws Exception {
        byte[] pdf = fixture("synthetic-e2e.pdf");
        String payload = new String(fixture("analysis-import.json"), StandardCharsets.UTF_8);
        Revision revision = register(pdf);
        assertThat(jdbc.queryForObject("select sha256 from assessment_plan_revision where id = ?", String.class,
                revision.revisionId())).isEqualTo("ab52297581ef154dbd0abe00a0cffcceec01513248bb60416fd2f5909173b404");
        String analysisId = importRun(revision, payload);
        mvc.perform(asAdmin(post(revision.base() + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisId").value(analysisId));
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_analysis_run", Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Long.class)).isZero();

        mvc.perform(asAdmin(get(revision.base() + "/analysis"), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisStatus").value("REVIEW_REQUIRED"))
                .andExpect(jsonPath("$.reviewStatus").value("UNREVIEWED"))
                .andExpect(jsonPath("$.confirmedFields").isEmpty())
                .andExpect(jsonPath("$.warnings").isEmpty())
                .andExpect(jsonPath("$.analyzer.version").value("v21.1/backend-adapter-0.2"))
                .andExpect(jsonPath("$.subjects.length()").value(1))
                .andExpect(jsonPath("$.subjects[0].subjectName").value("가상과학탐구"))
                .andExpect(jsonPath("$.subjects[0].writtenEvaluation.exams.length()").value(1))
                .andExpect(jsonPath("$.subjects[0].writtenEvaluation.exams[0].weightPercent").value(40))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items.length()").value(2))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].submissions[0]").value("탐구 보고서"))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].conditions.length()").value(2))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].rubric.length()").value(2))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[1].submissions").isEmpty())
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[1].conditions.length()").value(1))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[1].rubric.length()").value(1));

        // 2026-11-13 OD-A08: 관리자 확정 전 문서는 학생에게 공개하지 않는다 (존재도 드러내지 않음 → 404)
        String student = mvc.perform(asStudent(get("/api/student/assessment/evaluation-plans/" + revision.planId()), "stu_001"))
                .andExpect(status().isNotFound())
                .andReturn().getResponse().getContentAsString();
        assertThat(student).doesNotContain("탐구 보고서", "가상과학탐구", "subjects");
    }

    @Test
    void 검토_과목은_문서_슬롯의_학업_과목이어야_하고_관리자_응답은_원본_대조용_checksum을_준다() throws Exception {
        Revision v211 = register(fixture("synthetic-e2e.pdf"));
        String run = importRun(v211, new String(fixture("analysis-import.json"), StandardCharsets.UTF_8));
        mvc.perform(asAdmin(get(PLANS + "/" + v211.planId()), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisions[0].checksum").value("ab52297581ef154dbd0abe00a0cffcceec01513248bb60416fd2f5909173b404"));
        // subj_01은 2학기 과목, subj_999는 없는 과목: 1학년 1학기 문서에는 확정할 수 없다
        for (String subjectId : new String[] {"subj_01", "subj_999"}) {
            mvc.perform(asAdmin(put(v211.base() + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"%s","confirmedFields":[
                                      {"fieldPath":"performanceEvaluation.weightPercent","value":60,"pdfPageNumber":1}]}]}"""
                                    .formatted(run, subjectId)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.fields[0].field").value("reviewedSubjects[0].subjectId"))
                    .andExpect(jsonPath("$.details.fields[0].reason").value("unknown"));
        }
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Long.class)).isZero();
        assertThat(jdbc.queryForObject("select review_status from assessment_plan_revision where id = ?", String.class,
                v211.revisionId())).isEqualTo("UNREVIEWED");
        confirm(v211, run);
    }

    @Test
    void 검토_확정에_쓰인_분석_결과에_있는_itemKey만_참조할_수_있다() throws Exception {
        Revision v211 = register(fixture("synthetic-e2e.pdf"));
        String payload = new String(fixture("analysis-import.json"), StandardCharsets.UTF_8);
        String run1 = importRun(v211, payload);

        // 검토 전: Key가 있어도 not_confirmed
        reference(v211.revisionId(), "P01").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("not_confirmed"));

        confirm(v211, run1);
        String p01 = reference(v211.revisionId(), "P01").andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String p01Id = JsonPath.read(p01, "$.assessmentId");
        // 지필평가 Key(W01)는 분석 결과에 있어도 수행평가로 만들지 않는다 (§12)
        long before = assessments();
        reference(v211.revisionId(), "W01").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("evaluationItemRef.itemKey"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("not_allowed"));
        assertThat(assessments()).isEqualTo(before);
        expectUnknownItemKey(v211.revisionId(), "P99");

        // 다른 Revision에만 있는 Key: 합성 분석(written_01·performance_01·performance_02)으로 확정한 Revision에 P01 참조 → 거절
        byte[] other = EvaluationPlanApiTest.pdf(3, "itemkey-other-revision");
        Revision synthetic = register(other);
        String run2 = importRun(synthetic, EvaluationPlanApiTest.analysis(EvaluationPlanApiTest.sha256(other), 3));
        confirm(synthetic, run2);
        expectUnknownItemKey(synthetic.revisionId(), "P01");
        reference(synthetic.revisionId(), "performance_01").andExpect(status().isCreated());

        // 검토 뒤 새 Run(P77만 있음, 손으로 만든 합성 변형)이 들어와도 기준은 검토에 쓰인 Run이다
        String variant = payload.replace("\"P01\"", "\"P77\"");
        assertThat(variant).isNotEqualTo(payload);
        String run3 = importRun(v211, variant);
        // 회귀: 수신 시각이 같아도(테스트 고정 시계) 응답 analysisId는 방금 저장한 Run이다
        assertThat(run3).isNotEqualTo(run1);
        assertThat(jdbc.queryForObject("select result_json from assessment_plan_analysis_run where id = ?", String.class, run3))
                .contains("\"P77\"");
        expectUnknownItemKey(v211.revisionId(), "P77");
        reference(v211.revisionId(), "P01").andExpect(status().isCreated());

        // 그 Run으로 다시 검토하면 P77도 허용된다. 이전 검토의 P01도 계속 허용(대체 규칙 미확정), 이미 저장된 학생 참조는 바꾸지 않는다
        // A12: 확정된 Revision을 다시 확정하려면 먼저 재검토를 시작한다(§39-8, 이전 확정 기록은 그대로)
        mvc.perform(asAdmin(post(v211.base() + "/review-draft/reopen"), OPERATOR)).andExpect(status().isOk());
        confirm(v211, run3);
        reference(v211.revisionId(), "P77").andExpect(status().isCreated());
        reference(v211.revisionId(), "P01").andExpect(status().isCreated());
        expectUnknownItemKey(v211.revisionId(), "P98");
        mvc.perform(asStudent(get("/api/student/assessment/school-assessments/" + p01Id), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluationItemRef.itemKey").value("P01"))
                .andExpect(jsonPath("$.evaluationItemRef.documentRevisionId").value(v211.revisionId()));

        // 참조 없는 직접 등록은 그대로 된다
        mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"직접 등록\",\"subjectId\":\"subj_11\",\"academicYear\":2026,\"semester\":1}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.evaluationItemRef").doesNotExist());
    }
}
