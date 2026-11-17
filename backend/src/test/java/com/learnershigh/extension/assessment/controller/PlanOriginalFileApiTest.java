package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.integration.storage.PlanDocumentStorage;
import com.learnershigh.extension.assessment.service.plan.DocumentFormatInspectorTest;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
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
 * 평가계획서 원문 저장·조회 (S-4·S-5, 2026-11-13 승인) + 모든 관리자 평가계획서 운영 (OD-A08, 2026-11-13 결정).
 * 원문은 형식(PDF·HWP·HWPX) 그대로 격리 Storage에 보관하고, 내려받을 때 크기·SHA-256을 다시 확인한다.
 * 학생은 자기 슬롯의 "확정된" 문서 원문만 본다. 모든 파일은 합성 데이터다(실제 학교 문서 아님).
 */
@Tag("integration")
@SpringBootTest(properties = "assessment.analysis-import.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class PlanOriginalFileApiTest {

    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final String STUDENT_PLANS = "/api/student/assessment/evaluation-plans";
    static final Path STORAGE = createStorage();

    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry registry) {
        registry.add("assessment.plan-storage.root", STORAGE::toString);
    }

    static Path createStorage() {
        try {
            return Files.createTempDirectory("lh-plan-original-test-");
        } catch (Exception failure) {
            throw new IllegalStateException(failure);
        }
    }

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

    record Uploaded(String planId, String revisionId, String body) {
    }

    Uploaded register(String adminId, String schoolId, String fileName, byte[] bytes) throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", fileName, "application/octet-stream", bytes)), adminId)
                        .param("schoolId", schoolId).param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return new Uploaded(JsonPath.read(body, "$.planId"), JsonPath.read(body, "$.documentRevisionId"), body);
    }

    String filePath(Uploaded uploaded) {
        return PLANS + "/" + uploaded.planId() + "/revisions/" + uploaded.revisionId() + "/file";
    }

    String previewPath(Uploaded uploaded) {
        return PLANS + "/" + uploaded.planId() + "/revisions/" + uploaded.revisionId() + "/preview";
    }

    String storageKey(Uploaded uploaded) {
        return jdbc.queryForObject("select file_ref from assessment_plan_revision where id = ?", String.class,
                uploaded.revisionId());
    }

    static long storedFiles() throws Exception {
        try (Stream<Path> files = Files.walk(STORAGE)) {
            return files.filter(Files::isRegularFile).count();
        }
    }

    @Test
    void PDF_HWP_HWPX_원문을_형식_그대로_보관하고_내려받으면_같은_바이트다_재시작과_같은_새_Storage로도_읽힌다() throws Exception {
        byte[] pdf = EvaluationPlanApiTest.pdf(3, "original-pdf");
        byte[] hwp = DocumentFormatInspectorTest.hwpSignatureBytes(5, 0x1);
        byte[] hwpx = MultiformatExperimentalApiTest.resource("/assessment/multiformat/synthetic-plan.hwpx");
        long before = storedFiles();

        Object[][] cases = {
            {"2026_합성고_1학년_2학기_평가계획.pdf", pdf, "PDF", "application/pdf", true},
            {"2026_합성고_수학과.hwp", hwp, "HWP", "application/x-hwp", false},
            {"2026_합성고_과학과.hwpx", hwpx, "HWPX", "application/hwp+zip", false}};
        for (Object[] c : cases) {
            String fileName = (String) c[0];
            byte[] bytes = (byte[]) c[1];
            Uploaded uploaded = register("adm_plan_operator", "school_001", fileName, bytes);
            assertThat((String) JsonPath.read(uploaded.body(), "$.fileRef")).isEqualTo("plan_file_" + uploaded.revisionId());
            // 저장 키(UUID)는 응답에 나오지 않는다
            assertThat(uploaded.body()).doesNotContain(storageKey(uploaded));

            // 관리자 상세: 원문 보관·미리보기 상태와 SHA
            mvc.perform(asAdmin(get(PLANS + "/" + uploaded.planId()), "adm_plan_operator"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.revisions[0].file.available").value(true))
                    .andExpect(jsonPath("$.revisions[0].file.documentFormat").value(c[2]))
                    .andExpect(jsonPath("$.revisions[0].file.contentType").value(c[3]))
                    .andExpect(jsonPath("$.revisions[0].file.sizeBytes").value(bytes.length))
                    .andExpect(jsonPath("$.revisions[0].file.checksum").value(EvaluationPlanApiTest.sha256(bytes)))
                    .andExpect(jsonPath("$.revisions[0].file.previewAvailable").value(c[4]));

            // 원문 내려받기: 형식 그대로, attachment, 같은 바이트
            byte[] downloaded = mvc.perform(asAdmin(get(filePath(uploaded)), "adm_plan_operator").accept(MediaType.ALL))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", (String) c[3]))
                    .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment")))
                    .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                    .andExpect(header().string("Cache-Control", "private, no-store"))
                    .andReturn().getResponse().getContentAsByteArray();
            assertThat(downloaded).isEqualTo(bytes);

            // 애플리케이션 메모리가 아니라 디스크에 있다: 같은 Root로 새로 만든 Storage(재시작 상황)로 읽어도 같다
            try (InputStream in = new PlanDocumentStorage(STORAGE.toString()).open(storageKey(uploaded))) {
                assertThat(EvaluationPlanApiTest.sha256(in.readAllBytes())).isEqualTo(EvaluationPlanApiTest.sha256(bytes));
            }

            // 미리보기: PDF는 inline, HWP·HWPX는 변환 Rendition이 없어 415
            if ((Boolean) c[4]) {
                byte[] inline = mvc.perform(asAdmin(get(previewPath(uploaded)), "adm_plan_operator").accept(MediaType.ALL))
                        .andExpect(status().isOk())
                        .andExpect(header().string("Content-Type", "application/pdf"))
                        .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("inline")))
                        .andReturn().getResponse().getContentAsByteArray();
                assertThat(inline).isEqualTo(bytes);
            } else {
                mvc.perform(asAdmin(get(previewPath(uploaded)), "adm_plan_operator"))
                        .andExpect(status().isUnsupportedMediaType())
                        .andExpect(jsonPath("$.code").value("PREVIEW_UNAVAILABLE"));
            }
        }
        assertThat(storedFiles()).isEqualTo(before + 3);
    }

    @Test
    void 같은_문서에_같은_파일은_409이고_파일이_남지_않는다_같은_슬롯의_여러_문서와_다른_문서의_같은_파일은_허용한다() throws Exception {
        byte[] first = EvaluationPlanApiTest.pdf(2, "dup-first");
        Uploaded uploaded = register("adm_plan_operator", "school_001", "plan.pdf", first);
        long afterFirst = storedFiles();

        mvc.perform(asAdmin(multipart(PLANS + "/" + uploaded.planId() + "/revisions")
                        .file(new MockMultipartFile("file", "다시.pdf", "application/pdf", first)), "adm_plan_operator"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PLAN_FILE_DUPLICATE"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("duplicate_revision"));
        assertThat(storedFiles()).isEqualTo(afterFirst);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision where plan_id = ?", Integer.class,
                uploaded.planId())).isEqualTo(1);

        // 다른 파일은 개정본으로 추가된다
        mvc.perform(asAdmin(multipart(PLANS + "/" + uploaded.planId() + "/revisions")
                        .file(new MockMultipartFile("file", "개정.pdf", "application/pdf",
                                EvaluationPlanApiTest.pdf(2, "dup-second"))), "adm_plan_operator"))
                .andExpect(status().isCreated());
        // 같은 슬롯(학교·학년도·학년·학기)에 여러 문서 허용(계약 §38). 다른 문서라면 같은 파일도 받는다.
        register("adm_plan_operator", "school_001", "다른과목.pdf", EvaluationPlanApiTest.pdf(2, "dup-other"));
        register("adm_plan_operator", "school_001", "같은파일_다른문서.pdf", first);
        mvc.perform(asAdmin(get(PLANS), "adm_plan_operator").param("schoolId", "school_001")
                        .param("academicYear", "2026").param("grade", "1").param("semester", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(3));
    }

    @Test
    void 모든_관리자가_어느_학교든_업로드_개정_분석수신_검토_조회를_한다_인증없는_요청은_401() throws Exception {
        // 관리자 A(강남 지점)가 다른 학교(운정고 가정, 실제 문서 아님) 평가계획서를 등록
        byte[] bytes = EvaluationPlanApiTest.pdf(3, "unjeong-synthetic");
        Uploaded uploaded = register("adm_gangnam", "school_unjeong_demo", "운정고_합성.pdf", bytes);
        // 관리자 B(분당 지점)도 같은 문서를 조회·개정·분석 수신
        mvc.perform(asAdmin(get(PLANS + "/" + uploaded.planId()), "adm_bundang"))
                .andExpect(status().isOk());
        mvc.perform(asAdmin(get(PLANS), "adm_bundang").param("schoolId", "school_unjeong_demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(asAdmin(post(PLANS + "/" + uploaded.planId() + "/revisions/" + uploaded.revisionId()
                        + "/analysis-imports"), "adm_bundang").contentType(MediaType.APPLICATION_JSON)
                        .content(EvaluationPlanApiTest.analysis(EvaluationPlanApiTest.sha256(bytes), 3)))
                .andExpect(status().isCreated());
        byte[] downloaded = mvc.perform(asAdmin(get(filePath(uploaded)), "adm_bundang").accept(MediaType.ALL))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(downloaded).isEqualTo(bytes);
        mvc.perform(asAdmin(multipart(PLANS + "/" + uploaded.planId() + "/revisions")
                        .file(new MockMultipartFile("file", "개정.pdf", "application/pdf",
                                EvaluationPlanApiTest.pdf(3, "unjeong-rev2"))), "adm_bundang"))
                .andExpect(status().isCreated());
        assertThat(jdbc.queryForList("select uploaded_by from assessment_plan_revision where plan_id = ? order by revision_number",
                String.class, uploaded.planId())).containsExactly("adm_gangnam", "adm_bundang");

        // 인증 없음 / 알 수 없는 관리자 / 학생 Header → 관리자 원문 API 401
        mvc.perform(get(filePath(uploaded))).andExpect(status().isUnauthorized());
        mvc.perform(asAdmin(get(filePath(uploaded)), "adm_unknown")).andExpect(status().isUnauthorized());
        mvc.perform(asStudent(get(filePath(uploaded)), "stu_001")).andExpect(status().isUnauthorized());
    }

    @Test
    void 학생은_자기_슬롯의_확정된_문서_원문만_본다() throws Exception {
        byte[] bytes = EvaluationPlanApiTest.pdf(3, "student-file");
        Uploaded own = register("adm_plan_operator", "school_001", "plan.pdf", bytes);
        Uploaded other = register("adm_plan_operator", "school_999", "other.pdf", EvaluationPlanApiTest.pdf(3, "other"));

        // 확정 전: 원문·미리보기 모두 404 (존재를 드러내지 않음)
        mvc.perform(asStudent(get(STUDENT_PLANS + "/" + own.planId() + "/file"), "stu_001"))
                .andExpect(status().isNotFound());
        mvc.perform(asStudent(get(STUDENT_PLANS + "/" + own.planId() + "/preview"), "stu_001"))
                .andExpect(status().isNotFound());

        String analysisId = JsonPath.read(mvc.perform(asAdmin(post(PLANS + "/" + own.planId() + "/revisions/"
                                + own.revisionId() + "/analysis-imports"), "adm_demo_gangnam")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EvaluationPlanApiTest.analysis(EvaluationPlanApiTest.sha256(bytes), 3)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.analysisId");
        mvc.perform(asAdmin(put(PLANS + "/" + own.planId() + "/revisions/" + own.revisionId() + "/review"),
                        "adm_demo_gangnam").contentType(MediaType.APPLICATION_JSON).content("""
                        {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"subj_02","confirmedFields":[
                          {"fieldPath":"performanceEvaluation.weightPercent","value":40,"pdfPageNumber":3}]}]}"""
                        .formatted(analysisId)))
                .andExpect(status().isOk());

        // 확정 후: 자기 슬롯 문서 원문·미리보기
        byte[] downloaded = mvc.perform(asStudent(get(STUDENT_PLANS + "/" + own.planId() + "/file"), "stu_001")
                        .accept(MediaType.ALL))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment")))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(downloaded).isEqualTo(bytes);
        mvc.perform(asStudent(get(STUDENT_PLANS + "/" + own.planId() + "/preview"), "stu_001").accept(MediaType.ALL))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"));
        mvc.perform(asStudent(get(STUDENT_PLANS + "/" + own.planId()), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.file.fileRef").value("plan_file_" + own.revisionId()))
                .andExpect(jsonPath("$.file.previewAvailable").value(true));

        // 확정 뒤 새 개정본을 올려도 학생에게는 확정본 원문이 그대로다(미확정 개정본 비공개)
        mvc.perform(asAdmin(multipart(PLANS + "/" + own.planId() + "/revisions")
                        .file(new MockMultipartFile("file", "개정.pdf", "application/pdf",
                                EvaluationPlanApiTest.pdf(4, "unconfirmed-rev2"))), "adm_plan_operator"))
                .andExpect(status().isCreated());
        assertThat(mvc.perform(asStudent(get(STUDENT_PLANS + "/" + own.planId() + "/file"), "stu_001").accept(MediaType.ALL))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray()).isEqualTo(bytes);
        mvc.perform(asStudent(get(STUDENT_PLANS + "/" + own.planId()), "stu_001"))
                .andExpect(jsonPath("$.documentRevisionId").value(own.revisionId()));

        // 다른 학교 문서(확정 여부 무관) → 404, 인증 없음 → 401
        mvc.perform(asStudent(get(STUDENT_PLANS + "/" + other.planId() + "/file"), "stu_001"))
                .andExpect(status().isNotFound());
        mvc.perform(get(STUDENT_PLANS + "/" + own.planId() + "/file")).andExpect(status().isUnauthorized());
    }

    @Test
    void 저장된_원문이_바뀌면_409_원문이_없는_이전_등록분은_available_false와_404() throws Exception {
        byte[] bytes = EvaluationPlanApiTest.pdf(2, "integrity");
        Uploaded uploaded = register("adm_plan_operator", "school_001", "plan.pdf", bytes);
        String key = storageKey(uploaded);
        Path stored = STORAGE.resolve(key.substring(0, 2)).resolve(key);
        Files.write(stored, "tampered".getBytes());
        mvc.perform(asAdmin(get(filePath(uploaded)), "adm_plan_operator"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FILE_INTEGRITY_FAILED"));
        Files.delete(stored);
        mvc.perform(asAdmin(get(filePath(uploaded)), "adm_plan_operator"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FILE_INTEGRITY_FAILED"));

        // S-4 이전 등록분(원문 미보관, file_ref NULL): 다른 파일을 만들어 연결하지 않고 "없음"으로 응답
        jdbc.update("""
                insert into assessment_evaluation_plan (id, school_id, academic_year, grade, semester, revision_count, created_by, created_at, version)
                values ('plan_legacy_01', 'school_001', 2026, 1, 2, 1, 'adm_plan_operator', now(6), 0)""");
        jdbc.update("""
                insert into assessment_plan_revision (id, plan_id, revision_number, file_name, content_type, size_bytes, sha256, page_count, file_ref, source_url, review_status, uploaded_by, uploaded_at)
                values ('plan_rev_legacy_01', 'plan_legacy_01', 1, 'legacy.pdf', 'application/pdf', 100, ?, 1, null, null, 'UNREVIEWED', 'adm_plan_operator', now(6))""",
                "a".repeat(64));
        mvc.perform(asAdmin(get(PLANS + "/plan_legacy_01"), "adm_plan_operator"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisions[0].fileRef").doesNotExist())
                .andExpect(jsonPath("$.revisions[0].file.available").value(false))
                .andExpect(jsonPath("$.revisions[0].file.previewAvailable").value(false));
        mvc.perform(asAdmin(get(PLANS + "/plan_legacy_01/revisions/plan_rev_legacy_01/file"), "adm_plan_operator"))
                .andExpect(status().isNotFound());
        mvc.perform(asAdmin(get(PLANS + "/plan_legacy_01/revisions/plan_rev_legacy_01/preview"), "adm_plan_operator"))
                .andExpect(status().isNotFound());
    }
}
