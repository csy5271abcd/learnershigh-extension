package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.integration.preview.PlanPreviewConverter;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A25 HWP·HWPX 미리보기 변환(§38-10 DRAFT). 실제 LibreOffice 대신 시험용 변환기(합성 PDF 바이트)를 쓴다 — 변환 품질은 별도 실측(보고서).
 * 확인: 변환 PDF 응답·표시 헤더, 캐시(두 번째는 변환 안 함), 실패 기록(같은 원본 재시도 안 함 → 422 반복),
 * 원본 다운로드는 계속 HWPX 원본, PDF 원문은 변환하지 않음.
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage-preview",
        "assessment.multiformat.experimental=true"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import({MySqlContainerConfig.class, PlanPreviewRenditionApiTest.FakeConverterConfig.class})
class PlanPreviewRenditionApiTest {

    static final String OPERATOR = "adm_plan_operator";
    static final String PLANS = "/api/admin/assessment/evaluation-plans";
    static final byte[] FAKE_PDF = "%PDF-1.4\n% synthetic preview\n%%EOF\n".getBytes(java.nio.charset.StandardCharsets.US_ASCII);

    static final AtomicInteger CALLS = new AtomicInteger();
    static volatile boolean failNext;

    @TestConfiguration
    static class FakeConverterConfig {
        @Bean
        @Primary
        PlanPreviewConverter fakePreviewConverter() {
            return new PlanPreviewConverter() {
                @Override
                public boolean enabled() {
                    return true;
                }

                @Override
                public String id() {
                    return "fake";
                }

                @Override
                public Result convert(byte[] source, String extension) {
                    CALLS.incrementAndGet();
                    return failNext ? Result.failure("conversion_failed") : Result.success(FAKE_PDF);
                }
            };
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
        CALLS.set(0);
        failNext = false;
    }

    /** 합성 HWPX에 고유 표식을 덧붙이면 SHA가 달라져 시험끼리 캐시가 섞이지 않는다(ZIP 끝 뒤 바이트는 HWPX 판독에 영향 없음 — 아래 등록 201로 확인). */
    String register(String fileName, byte[] bytes) throws Exception {
        String body = mvc.perform(asAdmin(multipart(PLANS)
                                .file(new MockMultipartFile("file", fileName, "application/octet-stream", bytes)), OPERATOR)
                        .param("schoolId", "school_001").param("academicYear", "2026")
                        .param("grade", "1").param("semester", "1"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return PLANS + "/" + JsonPath.read(body, "$.planId") + "/revisions/" + JsonPath.read(body, "$.documentRevisionId");
    }

    byte[] uniqueHwpx() throws Exception {
        byte[] hwpx = MultiformatExperimentalApiTest.resource("/assessment/multiformat/synthetic-plan.hwpx");
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        try (java.util.zip.ZipInputStream in = new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(hwpx));
                java.util.zip.ZipOutputStream zip = new java.util.zip.ZipOutputStream(out)) {
            java.util.zip.ZipEntry entry;
            boolean first = true;
            while ((entry = in.getNextEntry()) != null) {
                java.util.zip.ZipEntry copy = new java.util.zip.ZipEntry(entry.getName());
                if (first && entry.getName().equals("mimetype")) {
                    byte[] data = in.readAllBytes();
                    java.util.zip.CRC32 crc = new java.util.zip.CRC32();
                    crc.update(data);
                    copy.setMethod(java.util.zip.ZipEntry.STORED);
                    copy.setSize(data.length);
                    copy.setCrc(crc.getValue());
                    zip.putNextEntry(copy);
                    zip.write(data);
                } else {
                    zip.putNextEntry(copy);
                    in.transferTo(zip);
                }
                first = false;
                zip.closeEntry();
            }
            zip.setComment("a25-" + UUID.randomUUID());
        }
        return out.toByteArray();
    }

    @Test
    void HWPX_미리보기는_변환_PDF로_주고_캐시하며_원본_다운로드는_HWPX_그대로다() throws Exception {
        byte[] hwpx = uniqueHwpx();
        String base = register("합성_평가계획.hwpx", hwpx);

        byte[] first = mvc.perform(asAdmin(get(base + "/preview"), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(header().string("X-Preview-Rendition", "converted-pdf"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("inline")))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(first).isEqualTo(FAKE_PDF);
        mvc.perform(asAdmin(get(base + "/preview"), OPERATOR)).andExpect(status().isOk());
        assertThat(CALLS.get()).as("두 번째 요청은 캐시").isEqualTo(1);

        byte[] original = mvc.perform(asAdmin(get(base + "/file"), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("X-Preview-Rendition"))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(original).as("다운로드는 원본 HWPX").isEqualTo(hwpx);
    }

    @Test
    void 변환_실패는_422이고_같은_원본은_다시_변환하지_않는다() throws Exception {
        failNext = true;
        String base = register("합성_실패.hwpx", uniqueHwpx());
        mvc.perform(asAdmin(get(base + "/preview"), OPERATOR))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("PLAN_PREVIEW_FAILED"));
        failNext = false;
        mvc.perform(asAdmin(get(base + "/preview"), OPERATOR))
                .andExpect(status().isUnprocessableContent());
        assertThat(CALLS.get()).as("실패 기록 — 무한 재시도 없음").isEqualTo(1);
    }

    @Test
    void PDF_원문은_변환하지_않고_원문_그대로_미리보기한다() throws Exception {
        byte[] pdf = EvaluationPlanApiTest.pdf(2, "preview-pdf");
        String base = register("합성.pdf", pdf);
        byte[] body = mvc.perform(asAdmin(get(base + "/preview"), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("X-Preview-Rendition"))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(body).isEqualTo(pdf);
        assertThat(CALLS.get()).isZero();
    }
}
