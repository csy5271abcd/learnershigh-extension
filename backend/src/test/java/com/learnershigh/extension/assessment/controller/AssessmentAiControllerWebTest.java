package com.learnershigh.extension.assessment.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.assessment.integration.ai.AssessmentAiClient;
import com.learnershigh.extension.assessment.integration.ai.UnconfiguredAssessmentAiClient;
import com.learnershigh.extension.assessment.service.ai.AssessmentAiService;
import com.learnershigh.extension.assessment.service.ai.PdfTextExtractor;
import java.time.Clock;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

/** AI 분석 API의 HTTP 계약: Provider 미연결은 503 JSON, 입력 오류는 400/415/422 JSON (가짜 성공 응답 없음). */
@WebMvcTest(AssessmentAiController.class)
@Import({AssessmentAiService.class, PdfTextExtractor.class, AssessmentAiControllerWebTest.Beans.class})
class AssessmentAiControllerWebTest {

    @TestConfiguration
    static class Beans {
        @Bean
        AssessmentAiClient assessmentAiClient() {
            return new UnconfiguredAssessmentAiClient();
        }

        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }
    }

    @Autowired
    MockMvc mvc;

    @Test
    void statusReportsNotConfiguredAndNoOcr() throws Exception {
        mvc.perform(get("/api/admin/assessment/ai/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(false))
                .andExpect(jsonPath("$.provider").value("none"))
                .andExpect(jsonPath("$.ocrSupported").value(false));
    }

    @Test
    void analysisWithoutProviderIs503NotFakeResult() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "plan.pdf", "application/pdf", "%PDF-1.7 test".getBytes());
        mvc.perform(multipart("/api/admin/assessment/ai/evaluation-plan-analyses").file(file))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("AI_PROVIDER_NOT_CONFIGURED"));
    }

    @Test
    void missingFilePartIs400() throws Exception {
        mvc.perform(multipart("/api/admin/assessment/ai/university-exam-analyses"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value("file"));
    }

    @Test
    void mockExamWithoutTransferConfirmationIs422BeforeProviderCheck() throws Exception {
        mvc.perform(post("/api/admin/assessment/ai/mock-exam-analyses").contentType(MediaType.APPLICATION_JSON).content("""
                        {"subjectName":"영어","academicYear":2026,"examMonth":3,"grade":1,"questionNumber":"22번",
                         "passageText":"%s","aiTransferConfirmed":false}""".formatted("a".repeat(60))))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("AI_TRANSFER_NOT_ALLOWED"));
    }

    @Test
    void tooShortPassageIs400() throws Exception {
        mvc.perform(post("/api/admin/assessment/ai/mock-exam-analyses").contentType(MediaType.APPLICATION_JSON).content("""
                        {"subjectName":"영어","passageText":"short","aiTransferConfirmed":true}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
