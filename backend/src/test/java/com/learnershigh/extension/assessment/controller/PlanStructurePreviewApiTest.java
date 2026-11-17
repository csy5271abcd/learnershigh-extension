package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.service.plan.DocumentFormatInspectorTest;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
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
 * A10 §38-6 HWP·HWPX 원문 구조 미리보기 API. 원본은 바뀌지 않고(SHA·Storage 파일 수 그대로) 파생 파일을 만들지 않는다.
 * Fixture는 합성 문서다(2099학년도 가상 과목).
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class PlanStructurePreviewApiTest {

    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final Path STORAGE = createStorage();

    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry registry) {
        registry.add("assessment.plan-storage.root", STORAGE::toString);
    }

    static Path createStorage() {
        try {
            return Files.createTempDirectory("lh-plan-structure-test-");
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

    record Uploaded(String planId, String revisionId) {
        String path(String tail) {
            return PLANS + "/" + planId + "/revisions/" + revisionId + tail;
        }
    }

    Uploaded register(String fileName, byte[] bytes) throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", fileName, "application/octet-stream", bytes)), "adm_plan_operator")
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new Uploaded(JsonPath.read(body, "$.planId"), JsonPath.read(body, "$.documentRevisionId"));
    }

    static long storedFiles() throws Exception {
        try (Stream<Path> files = Files.walk(STORAGE)) {
            return files.filter(Files::isRegularFile).count();
        }
    }

    @Test
    void HWP와_HWPX_원문을_PDF로_바꾸지_않고_구조로_돌려주며_원본은_그대로다() throws Exception {
        Object[][] cases = {
            {"2099_가상고_과학탐구.hwp", MultiformatExperimentalApiTest.resource("/assessment/multiformat/synthetic-plan.hwp"), "HWP", "p3.c0.r0c1"},
            {"2099_가상고_과학탐구.hwpx", MultiformatExperimentalApiTest.resource("/assessment/multiformat/synthetic-plan.hwpx"), "HWPX", null}};
        for (Object[] c : cases) {
            byte[] bytes = (byte[]) c[1];
            Uploaded uploaded = register((String) c[0], bytes);
            long files = storedFiles();
            mvc.perform(asAdmin(get(PLANS + "/" + uploaded.planId()), "adm_plan_operator"))
                    .andExpect(jsonPath("$.revisions[0].file.previewAvailable").value(false))
                    .andExpect(jsonPath("$.revisions[0].file.structurePreviewAvailable").value(true));

            String body = mvc.perform(asAdmin(get(uploaded.path("/structure")), "adm_plan_operator"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                    .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                    .andExpect(jsonPath("$.documentFormat").value(c[2]))
                    .andExpect(jsonPath("$.sha256").value(EvaluationPlanApiTest.sha256(bytes)))
                    .andExpect(jsonPath("$.stats.tables").value(org.hamcrest.Matchers.greaterThan(0)))
                    .andExpect(jsonPath("$.blocks[0].type").value("PARAGRAPH"))
                    .andReturn().getResponse().getContentAsString();
            if (c[3] != null) {
                List<Object> cell = JsonPath.read(body, "$..cells[?(@.path == '" + c[3] + "')].colSpan");
                assertThat(cell).containsExactly(2);
            }
            // 원본 불변: 같은 바이트 내려받기, 저장 파일 수 그대로(PDF Rendition·임시 파일 없음)
            byte[] downloaded = mvc.perform(asAdmin(get(uploaded.path("/file")), "adm_plan_operator").accept(MediaType.ALL))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
            assertThat(downloaded).isEqualTo(bytes);
            assertThat(storedFiles()).isEqualTo(files);
            assertThat(jdbc.queryForObject("select sha256 from assessment_plan_revision where id = ?", String.class,
                    uploaded.revisionId())).isEqualTo(EvaluationPlanApiTest.sha256(bytes));
            // 기존 /preview(PDF 전용)는 그대로 415
            mvc.perform(asAdmin(get(uploaded.path("/preview")), "adm_plan_operator"))
                    .andExpect(status().isUnsupportedMediaType());
        }
    }

    @Test
    void PDF는_415_권한_없으면_401_다른_문서_Revision은_404() throws Exception {
        Uploaded pdf = register("plan.pdf", EvaluationPlanApiTest.pdf(2, "structure-pdf"));
        mvc.perform(asAdmin(get(PLANS + "/" + pdf.planId()), "adm_plan_operator"))
                .andExpect(jsonPath("$.revisions[0].file.structurePreviewAvailable").value(false));
        mvc.perform(asAdmin(get(pdf.path("/structure")), "adm_plan_operator"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("PREVIEW_UNAVAILABLE"));

        Uploaded hwpx = register("plan.hwpx", MultiformatExperimentalApiTest.resource("/assessment/multiformat/synthetic-plan.hwpx"));
        mvc.perform(get(hwpx.path("/structure"))).andExpect(status().isUnauthorized());
        mvc.perform(asAdmin(get(hwpx.path("/structure")), "adm_unknown")).andExpect(status().isUnauthorized());
        mvc.perform(asStudent(get(hwpx.path("/structure")), "stu_001")).andExpect(status().isUnauthorized());
        mvc.perform(asAdmin(get(PLANS + "/" + pdf.planId() + "/revisions/" + hwpx.revisionId() + "/structure"), "adm_plan_operator"))
                .andExpect(status().isNotFound());
        // 다른 관리자도 평가계획서 운영 권한(OD-A08)으로 열람한다
        mvc.perform(asAdmin(get(hwpx.path("/structure")), "adm_bundang")).andExpect(status().isOk());
    }

    @Test
    void 읽을_수_없는_HWP는_422_PLAN_PREVIEW_FAILED_바뀐_원문은_409() throws Exception {
        // 서명 검사만 통과하는 합성 바이트(본문 Stream 없음): 등록·보관은 되지만 구조를 읽을 수 없다
        Uploaded unreadable = register("signature-only.hwp", DocumentFormatInspectorTest.hwpSignatureBytes(5, 0x1));
        mvc.perform(asAdmin(get(unreadable.path("/structure")), "adm_plan_operator"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("PLAN_PREVIEW_FAILED"))
                .andExpect(jsonPath("$.details.fields[0].field").value("file"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("parse_failed"));

        Uploaded hwp = register("plan.hwp", MultiformatExperimentalApiTest.resource("/assessment/multiformat/synthetic-plan.hwp"));
        String key = jdbc.queryForObject("select file_ref from assessment_plan_revision where id = ?", String.class, hwp.revisionId());
        Files.write(STORAGE.resolve(key.substring(0, 2)).resolve(key), "tampered".getBytes());
        mvc.perform(asAdmin(get(hwp.path("/structure")), "adm_plan_operator"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FILE_INTEGRITY_FAILED"));
    }
}
