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
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
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
 * 평가계획서 등록·개정 → 외부 분석 결과 수신(합성 Fixture) → 관리자 확정 → 학생 열람·항목 참조 등록 (§10-1, §12, §38, §39, PROPOSED 수신).
 * 분석 결과는 테스트용 합성 데이터이며 실제 학교 평가계획서가 아니다.
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.analysis-import.enabled=true", "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class EvaluationPlanApiTest {

    static final String OPERATOR = "adm_plan_operator";
    static final String PLANS = "/api/admin/assessment/evaluation-plans";

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

    static byte[] pdf(int pages, String marker) throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (int i = 0; i < pages; i++) {
                document.addPage(new PDPage());
            }
            document.getDocumentInformation().setTitle(marker);
            document.save(out);
            return out.toByteArray();
        }
    }

    static String sha256(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    record Uploaded(String planId, String revisionId) {
    }

    Uploaded register(byte[] bytes) throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", "2026_예시고_1학년_2학기_평가계획(합성).pdf",
                                        "application/pdf", bytes)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileRef").value(org.hamcrest.Matchers.startsWith("plan_file_")))
                .andExpect(jsonPath("$.analysisStatus").value("NOT_REQUESTED"))
                .andExpect(jsonPath("$.reviewStatus").value("UNREVIEWED"))
                .andReturn().getResponse().getContentAsString();
        return new Uploaded(JsonPath.read(body, "$.planId"), JsonPath.read(body, "$.documentRevisionId"));
    }

    /** §11 Shape 기반 합성 분석 결과. 통합과학2: 지필 60 + 수행 40, 수행 항목 25 + 10 (합계 35 ≠ 40 → 경고). */
    static String analysis(String sha, int pageCount) {
        return """
                {"analyzer":{"name":"curriculum-analysis","version":"v20-test"},
                 "source":{"sha256":"%s","pageCount":%d},
                 "status":"REVIEW_REQUIRED",
                 "subjects":[{
                   "subjectName":"통합과학2","pageRange":{"from":2,"to":3},
                   "writtenEvaluation":{"weightPercent":60,"sources":[{"pdfPageNumber":2,"printedPageLabel":"1","extractedText":"지필 60%%"}],
                     "exams":[{"itemKey":"written_01","round":1,"weightPercent":30,"maxScore":100,"timing":null,"questionTypes":["선택형"],
                               "sources":[{"pdfPageNumber":2}]}]},
                   "performanceEvaluation":{"weightPercent":40,"sources":[{"pdfPageNumber":3}],
                     "items":[
                       {"itemKey":"performance_01","label":"탐구 보고서","area":null,"timing":"10월","weightPercent":25,"maxScore":null,
                        "content":"지역 하천 수질 조사","submissions":["보고서"],"conditions":[],
                        "rubric":[{"element":"탐구 설계","levels":[{"description":"변인 통제가 명확함","score":10}],"sources":[{"pdfPageNumber":3}]}],
                        "sources":[{"pdfPageNumber":3,"printedPageLabel":"2","extractedText":"탐구 보고서 25%%"}]},
                       {"itemKey":"performance_02","label":"발표","weightPercent":10,"sources":[{"pdfPageNumber":3}]}
                     ]},
                   "sources":[{"pdfPageNumber":2}]
                 }],
                 "warnings":["2쪽 표 일부 판독 불가"]}""".formatted(sha, pageCount);
    }

    String importPath(Uploaded uploaded) {
        return PLANS + "/" + uploaded.planId() + "/revisions/" + uploaded.revisionId() + "/analysis-imports";
    }

    String importAnalysis(Uploaded uploaded, String body) throws Exception {
        String response = mvc.perform(asAdmin(post(importPath(uploaded)), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.analysisId");
    }

    String confirm(Uploaded uploaded, String analysisId) throws Exception {
        return mvc.perform(asAdmin(put(PLANS + "/" + uploaded.planId() + "/revisions/" + uploaded.revisionId()
                        + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":40,"pdfPageNumber":3},
                          {"fieldPath":"performanceEvaluation.items[0].maxScore","value":null,"pdfPageNumber":null}]}]}"""
                        .formatted(analysisId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void 인증된_관리자만_등록하고_지원하지_않는_형식은_415() throws Exception {
        byte[] bytes = pdf(3, "a");
        // 인증 없음 → 401 (평가계획서 권한 정책이 인증을 대신하지 않는다)
        mvc.perform(multipart(PLANS).file(new MockMultipartFile("file", "plan.pdf", "application/pdf", bytes))
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isUnauthorized());
        // 알 수 없는 관리자 ID → 401, 학생 Header로 관리자 API → 401
        mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "plan.pdf", "application/pdf", bytes)),
                        "adm_unknown")
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isUnauthorized());
        mvc.perform(asStudent(multipart(PLANS).file(new MockMultipartFile("file", "plan.pdf", "application/pdf", bytes)),
                        "stu_001")
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("select count(*) from assessment_evaluation_plan", Integer.class)).isZero();
        mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "plan.pdf", "application/pdf",
                                "not a pdf".getBytes())), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE_TYPE"));
        mvc.perform(asAdmin(multipart(PLANS), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("file"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_evaluation_plan", Integer.class)).isZero();
    }

    /** A9: 학년도는 독립된 열람 단위다. 학년도별 목록·분석은 섞이지 않고, 제거한 학년도 비교 API는 더 이상 없다. */
    @Test
    void 학년도별_목록과_분석은_해당_학년도_문서만_돌려주고_학년도_비교_API는_없다() throws Exception {
        byte[] bytes2026 = pdf(3, "y2026");
        Uploaded y2026 = register(bytes2026);
        byte[] bytes2025 = pdf(3, "y2025");
        String body2025 = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", "2025_예시고_1학년_2학기(합성).pdf", "application/pdf",
                                        bytes2025)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2025")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Uploaded y2025 = new Uploaded(JsonPath.read(body2025, "$.planId"), JsonPath.read(body2025, "$.documentRevisionId"));
        importAnalysis(y2026, analysis(sha256(bytes2026), 3));

        mvc.perform(asAdmin(get(PLANS), OPERATOR).param("schoolId", "school_001").param("academicYear", "2025"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].planId").value(y2025.planId()))
                .andExpect(jsonPath("$.items[0].academicYear").value(2025));
        mvc.perform(asAdmin(get(PLANS), OPERATOR).param("schoolId", "school_001").param("academicYear", "2026"))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].planId").value(y2026.planId()));
        // 2026 분석 결과는 2025 문서의 분석으로 보이지 않는다
        mvc.perform(asAdmin(get(PLANS + "/" + y2025.planId() + "/revisions/" + y2025.revisionId() + "/analysis"), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisStatus").value("NOT_REQUESTED"))
                .andExpect(jsonPath("$.subjects").isEmpty());
        mvc.perform(asAdmin(get(PLANS + "/" + y2026.planId() + "/revisions/" + y2026.revisionId() + "/analysis"), OPERATOR))
                .andExpect(jsonPath("$.subjects[0].subjectName").value("통합과학2"))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].rubric[0].element").value("탐구 설계"));
        // 다른 학년도 문서의 Revision 경로를 섞어 쓰면 거절된다
        mvc.perform(asAdmin(get(PLANS + "/" + y2025.planId() + "/revisions/" + y2026.revisionId() + "/analysis"), OPERATOR))
                .andExpect(status().isNotFound());
        // A7 학년도 비교 API 제거: 비교 처리기가 없어 문서 조회(planId="comparison")로 해석되고 404
        mvc.perform(asAdmin(get(PLANS + "/comparison"), OPERATOR).param("schoolId", "school_001")
                        .param("grade", "1").param("semester", "2").param("years", "2025,2026"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.years").doesNotExist());
    }

    @Test
    void 개정본을_추가해도_이전_Revision은_보존된다() throws Exception {
        byte[] first = pdf(3, "first");
        Uploaded uploaded = register(first);
        mvc.perform(asAdmin(multipart(PLANS + "/" + uploaded.planId() + "/revisions")
                        .file(new MockMultipartFile("file", "개정.pdf", "application/pdf", pdf(4, "second"))), OPERATOR))
                .andExpect(status().isCreated());

        mvc.perform(asAdmin(get(PLANS + "/" + uploaded.planId()), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisions.length()").value(2))
                .andExpect(jsonPath("$.revisions[0].documentRevisionId").value(uploaded.revisionId()))
                .andExpect(jsonPath("$.revisions[0].revisionNumber").value(1))
                .andExpect(jsonPath("$.revisions[0].pageCount").value(3))
                .andExpect(jsonPath("$.revisions[1].revisionNumber").value(2))
                .andExpect(jsonPath("$.revisions[1].pageCount").value(4));
        assertThat(jdbc.queryForObject("select sha256 from assessment_plan_revision where id = ?", String.class,
                uploaded.revisionId())).isEqualTo(sha256(first));

        mvc.perform(asAdmin(get(PLANS), OPERATOR).param("schoolId", "school_001"))
                .andExpect(jsonPath("$.items.length()").value(1));
        // 2026-11-13 OD-A08: 모든 관리자가 모든 학교 평가계획서를 운영한다 (학생 기록 지점과 무관)
        mvc.perform(asAdmin(get(PLANS), "adm_gangnam").param("schoolId", "school_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(asAdmin(get(PLANS + "/" + uploaded.planId()), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisions.length()").value(2));
    }

    @Test
    void 분석결과는_후보로만_저장되고_검토상태를_바꾸지_않는다_같은_내용_재전송은_중복_생성하지_않는다() throws Exception {
        byte[] bytes = pdf(3, "import");
        Uploaded uploaded = register(bytes);
        String body = analysis(sha256(bytes), 3);

        mvc.perform(asAdmin(post(importPath(uploaded)), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.analysisStatus").value("REVIEW_REQUIRED"))
                .andExpect(jsonPath("$.reviewStatus").value("UNREVIEWED"))
                .andExpect(jsonPath("$.confirmedFields.length()").value(0))
                .andExpect(jsonPath("$.review").doesNotExist())
                // 원문 값은 고치지 않는다 (합계 35 ≠ 40이어도 그대로)
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].weightPercent").value(25))
                .andExpect(jsonPath("$.subjects[0].performanceEvaluation.items[0].maxScore").doesNotExist())
                .andExpect(jsonPath("$.warnings[0].source").value("ANALYZER"))
                .andExpect(jsonPath("$.warnings[?(@.source == 'SERVER')]").isNotEmpty());

        mvc.perform(asAdmin(post(importPath(uploaded)), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_analysis_run", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select review_status from assessment_plan_revision where id = ?", String.class,
                uploaded.revisionId())).isEqualTo("UNREVIEWED");
    }

    @Test
    void 잘못된_분석결과는_거절하고_아무것도_저장하지_않는다() throws Exception {
        byte[] bytes = pdf(3, "invalid");
        Uploaded uploaded = register(bytes);
        String valid = analysis(sha256(bytes), 3);

        // 다른 문서의 결과
        expectRejected(uploaded, analysis("0".repeat(64), 3), "source.sha256", "document_mismatch");
        // 분석기 내부 신뢰도 필드는 받지 않는다
        expectRejected(uploaded, valid.replace("\"status\":\"REVIEW_REQUIRED\",",
                "\"status\":\"REVIEW_REQUIRED\",\"confidence\":\"CONFIDENT\","), "confidence", "unknown_field");
        // 자동 확정 시도
        expectRejected(uploaded, valid.replace("\"status\":\"REVIEW_REQUIRED\"", "\"status\":\"CONFIRMED\""),
                "status", "format");
        // 범위 밖 원문 쪽 (과목 범위 2~3쪽)
        expectRejected(uploaded, valid.replace("\"sources\":[{\"pdfPageNumber\":2}]}]}",
                "\"sources\":[{\"pdfPageNumber\":9}]}]}"), null, "out_of_range");
        // 평가 Key 중복
        expectRejected(uploaded, valid.replace("\"itemKey\":\"performance_02\"", "\"itemKey\":\"performance_01\""),
                "subjects[0].performanceEvaluation.items[1].itemKey", "duplicate");
        // 근거 없는 비율
        expectRejected(uploaded, valid.replace(
                "{\"itemKey\":\"performance_02\",\"label\":\"발표\",\"weightPercent\":10,\"sources\":[{\"pdfPageNumber\":3}]}",
                "{\"itemKey\":\"performance_02\",\"label\":\"발표\",\"weightPercent\":10}"),
                "subjects[0].performanceEvaluation.items[1].sources", "evidence_required");
        // 타입 불일치
        expectRejected(uploaded, valid.replace("\"weightPercent\":60", "\"weightPercent\":\"육십\""), null, "invalid");

        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_analysis_run", Integer.class)).isZero();
    }

    @Test
    void A16_과목_본문_밖_머리글_근거는_그대로_저장하고_문서_밖_쪽과_평가_근거_범위_위반은_거절한다() throws Exception {
        byte[] bytes = pdf(3, "a16-subject-locator");
        Uploaded uploaded = register(bytes);
        String valid = analysis(sha256(bytes), 3);
        // 과목 근거 줄 (시험 근거 줄은 뒤에 }]}가 붙어 겹치지 않음)
        String subjectSources = "\"sources\":[{\"pdfPageNumber\":2}]\n";

        // 평가 근거는 과목 본문 범위(2~3쪽) 밖이면 계속 거절
        expectRejected(uploaded, valid.replace("\"sources\":[{\"pdfPageNumber\":2,\"printedPageLabel\":\"1\"",
                                "\"sources\":[{\"pdfPageNumber\":1,\"printedPageLabel\":\"1\""),
                "subjects[0].writtenEvaluation.sources[0].pdfPageNumber", "out_of_range");
        // 과목 근거라도 문서 쪽 수(3) 밖이면 거절
        expectRejected(uploaded, valid.replace(subjectSources,
                        "\"sources\":[{\"pdfPageNumber\":2},{\"pdfPageNumber\":4}]\n"),
                "subjects[0].sources[1].pdfPageNumber", "out_of_range");
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_analysis_run", Integer.class)).isZero();

        // F01664 모양: 과목 본문 2~3쪽, 과목 근거에 1쪽 공통 머리글 포함 → 받는다
        String header = valid.replace(subjectSources,
                "\"sources\":[{\"pdfPageNumber\":2},{\"pdfPageNumber\":1,\"extractedText\":\"과목 머리글\"}]\n");
        assertThat(header).isNotEqualTo(valid);
        mvc.perform(asAdmin(post(importPath(uploaded)), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(header))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.analysisStatus").value("REVIEW_REQUIRED"));
        // 재조회: 근거·과목 범위를 받은 그대로 보존 (범위를 넓히거나 근거를 지우지 않음)
        mvc.perform(asAdmin(get(importPath(uploaded).replace("/analysis-imports", "/analysis")), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subjects[0].pageRange.from").value(2))
                .andExpect(jsonPath("$.subjects[0].pageRange.to").value(3))
                .andExpect(jsonPath("$.subjects[0].sources.length()").value(2))
                .andExpect(jsonPath("$.subjects[0].sources[1].pdfPageNumber").value(1))
                .andExpect(jsonPath("$.subjects[0].sources[1].extractedText").value("과목 머리글"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_analysis_run", Integer.class)).isEqualTo(1);
    }

    void expectRejected(Uploaded uploaded, String body, String field, String reason) throws Exception {
        var result = mvc.perform(asAdmin(post(importPath(uploaded)), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[?(@.reason == '" + reason + "')]").isNotEmpty());
        if (field != null) {
            result.andExpect(jsonPath("$.details.fields[?(@.field == '" + field + "')]").isNotEmpty());
        }
    }

    @Test
    void PDF_검토_중복_fieldPath와_비정규_색인과_HWP전용_필드는_거절하고_정상_확정은_PDF_근거로_저장한다() throws Exception {
        byte[] bytes = pdf(3, "dedupe");
        Uploaded uploaded = register(bytes);
        String analysisId = importAnalysis(uploaded, analysis(sha256(bytes), 3));
        String reviewPath = PLANS + "/" + uploaded.planId() + "/revisions/" + uploaded.revisionId() + "/review";

        mvc.perform(asAdmin(put(reviewPath), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.items[0].maxScore","value":30,"pdfPageNumber":3},
                          {"fieldPath":"performanceEvaluation.items[0].maxScore","value":40,"pdfPageNumber":3}]}]}"""
                        .formatted(analysisId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("reviewedSubjects[0].confirmedFields[1].fieldPath"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("duplicate"));
        mvc.perform(asAdmin(put(reviewPath), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.items[01].maxScore","value":30,"pdfPageNumber":3}]}]}"""
                        .formatted(analysisId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("unknown"));
        mvc.perform(asAdmin(put(reviewPath), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[
                          {"subjectId":"subj_02","confirmedFields":[{"fieldPath":"performanceEvaluation.weightPercent","value":40,"pdfPageNumber":3}]},
                          {"subjectId":"subj_02","confirmedFields":[{"fieldPath":"performanceEvaluation.weightPercent","value":40,"pdfPageNumber":3}]}]}"""
                        .formatted(analysisId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("reviewedSubjects[1].subjectId"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("duplicate"));
        mvc.perform(asAdmin(put(reviewPath), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","sourceCheck":{"method":"LOCAL_FILE_EXTERNAL_VIEWER","localFileSha256":"%s","manualComparisonConfirmed":true},
                         "reviewedSubjects":[{"subjectId":"subj_02","analysisSubjectIndex":0,"confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":40,"pdfPageNumber":3,"absence":"NOT_IN_SOURCE"}]}]}"""
                        .formatted(analysisId, sha256(bytes))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[?(@.field == 'sourceCheck')].reason").value("not_allowed"))
                // A10: PDF analysisSubjectIndex는 선택 항목이 되어 더 이상 not_allowed가 아니다(PlanMultiSubjectConfirmApiTest)
                .andExpect(jsonPath("$.details.fields[?(@.field == 'reviewedSubjects[0].analysisSubjectIndex')]").isEmpty())
                .andExpect(jsonPath("$.details.fields[?(@.field == 'reviewedSubjects[0].confirmedFields[0].absence')].reason").value("not_allowed"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).isZero();

        // 정규 색인 [0]·[1]·[10]은 그대로 받는다(문법). 정상 PDF 확정은 기존 응답 모양 그대로, DB에는 evidence_format=PDF
        String confirmed = confirm(uploaded, analysisId);
        assertThat(confirmed).doesNotContain("documentLocator", "analysisSubjectIndex", "sourceReview", "absence");
        assertThat(jdbc.queryForList("select evidence_format from assessment_plan_confirmed_value", String.class))
                .containsOnly("PDF");
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_confirmed_value where evidence_locator_json is not null or analysis_subject_index is not null", Integer.class))
                .isZero();
        assertThat(jdbc.queryForMap("select source_check_method, manual_comparison_confirmed, reviewer_auth from assessment_plan_review"))
                .containsEntry("source_check_method", null).containsEntry("manual_comparison_confirmed", null)
                .containsEntry("reviewer_auth", "MOCK_HEADER");
    }

    @Test
    void 사람이_확정한_값만_확정값이_되고_실패한_분석과_허용되지_않은_경로는_거절한다() throws Exception {
        byte[] bytes = pdf(3, "review");
        Uploaded uploaded = register(bytes);
        String analysisId = importAnalysis(uploaded, analysis(sha256(bytes), 3));
        String reviewPath = PLANS + "/" + uploaded.planId() + "/revisions/" + uploaded.revisionId() + "/review";

        mvc.perform(asAdmin(put(reviewPath), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"student.score","value":1,"pdfPageNumber":3}]}]}""".formatted(analysisId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("not_allowed"));
        mvc.perform(asAdmin(put(reviewPath), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":40}]}]}""".formatted(analysisId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("evidence_required"));
        mvc.perform(asAdmin(put(reviewPath), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"REJECT","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":40,"pdfPageNumber":3}]}]}"""
                        .formatted(analysisId)))
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_review", Integer.class)).isZero();

        String confirmed = confirm(uploaded, analysisId);
        assertThat((String) JsonPath.read(confirmed, "$.reviewStatus")).isEqualTo("CONFIRMED");
        assertThat((Integer) JsonPath.read(confirmed, "$.confirmedFields[0].value")).isEqualTo(40);
        assertThat((Object) JsonPath.read(confirmed, "$.confirmedFields[1].value")).isNull();
        assertThat((String) JsonPath.read(confirmed, "$.review.reviewedBy")).isEqualTo(OPERATOR);
        // AI 후보는 확정 뒤에도 그대로 (서로 다른 데이터)
        assertThat((Integer) JsonPath.read(confirmed, "$.subjects[0].performanceEvaluation.weightPercent")).isEqualTo(40);

        // 실패 결과에는 확정할 수 없다
        byte[] other = pdf(2, "failed");
        Uploaded failedPlan = register(other);
        String failedId = importAnalysis(failedPlan, """
                {"analyzer":{"name":"curriculum-analysis","version":"v20-test"},
                 "source":{"sha256":"%s","pageCount":2},"status":"FAILED","failureReason":"표 구조를 읽지 못함","subjects":[]}"""
                .formatted(sha256(other)));
        mvc.perform(asAdmin(put(PLANS + "/" + failedPlan.planId() + "/revisions/" + failedPlan.revisionId()
                        + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":40,"pdfPageNumber":1}]}]}"""
                        .formatted(failedId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("analysis_failed"));
        // 다른 Revision의 분석 ID로 확정할 수 없다
        mvc.perform(asAdmin(put(PLANS + "/" + failedPlan.planId() + "/revisions/" + failedPlan.revisionId()
                        + "/review"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":40,"pdfPageNumber":1}]}]}"""
                        .formatted(analysisId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("unknown"));
    }

    @Test
    void 학생은_자기_학교_문서만_보고_확정된_항목만_참조해_등록한다_중복은_막지_않는다() throws Exception {
        byte[] bytes = pdf(3, "student");
        Uploaded uploaded = register(bytes);
        String studentPlans = "/api/student/assessment/evaluation-plans";

        // 확정 전: 학생에게 보이지 않는다 (2026-11-13 OD-A08 — 업로드·분석만으로 공개하지 않음)
        mvc.perform(asStudent(get(studentPlans), "stu_001").param("schoolId", "school_001")
                        .param("academicYear", "2026").param("grade", "1").param("semester", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(asStudent(get(studentPlans + "/" + uploaded.planId()), "stu_001"))
                .andExpect(status().isNotFound());
        mvc.perform(asStudent(get(studentPlans), "stu_001").param("schoolId", "school_999")
                        .param("academicYear", "2026").param("grade", "1").param("semester", "2"))
                .andExpect(status().isForbidden());

        String ref = """
                {"title":"탐구 보고서","subjectId":"subj_02","academicYear":2026,"semester":2,
                 "evaluationItemRef":{"documentRevisionId":"%s","subjectId":"%s","itemKey":"performance_01"}}""";
        // 확정 전에는 참조할 수 없다
        mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(ref.formatted(uploaded.revisionId(), "subj_02")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("not_confirmed"));

        confirm(uploaded, importAnalysis(uploaded, analysis(sha256(bytes), 3)));
        mvc.perform(asStudent(get(studentPlans), "stu_001").param("schoolId", "school_001")
                        .param("academicYear", "2026").param("grade", "1").param("semester", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].planId").value(uploaded.planId()))
                .andExpect(jsonPath("$.items[0].reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.items[0].file.available").value(true))
                .andExpect(jsonPath("$.items[0].subjects").doesNotExist());

        for (int i = 0; i < 2; i++) {
            mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), "stu_001")
                            .contentType(MediaType.APPLICATION_JSON).content(ref.formatted(uploaded.revisionId(), "subj_02")))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.evaluationItemRef.itemKey").value("performance_01"));
        }
        assertThat(jdbc.queryForObject("select count(*) from assessment_school_assessment", Integer.class)).isEqualTo(2);
        mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(ref.formatted(uploaded.revisionId(), "subj_01")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("mismatch"));
        mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(ref.formatted("plan_rev_unknown", "subj_02")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("unknown"));

        // 관리자가 개정본을 올려도 학생 수행평가의 참조·제목은 바뀌지 않는다
        mvc.perform(asAdmin(multipart(PLANS + "/" + uploaded.planId() + "/revisions")
                        .file(new MockMultipartFile("file", "개정.pdf", "application/pdf", pdf(3, "rev2"))), OPERATOR))
                .andExpect(status().isCreated());
        assertThat(jdbc.queryForList("select distinct eval_document_revision_id from assessment_school_assessment",
                String.class)).containsExactly(uploaded.revisionId());
    }
}
