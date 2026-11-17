package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.common.error.BusinessException;
import jakarta.validation.Validation;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/**
 * 계정 B 분석 결과 계약 호환 기준선 (A5, 2026-11-14). 현재 Backend는 backend-adapter-0.2만 받는다.
 * 0.3 초안 필드(contractVersion · subjects[].teachingPlan · subjects[].extraction · payload status PARTIAL)는
 * 합의 전이라 <b>조용히 버리거나 저장하지 않고 거절</b>해야 한다. 0.3이 합의되면 버전별 Parser로 바꾸고 이 시험을 함께 고친다.
 */
class AnalysisImportContractCompatibilityTest {

    final AnalysisImportParser parser = new AnalysisImportParser(JsonMapper.builder().build(),
            Validation.buildDefaultValidatorFactory().getValidator());

    static String fixture() throws IOException {
        try (InputStream in = AnalysisImportContractCompatibilityTest.class
                .getResourceAsStream("/assessment/analyzer-v21_1/analysis-import.json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    static String reason(BusinessException exception) {
        return String.valueOf(exception.details());
    }

    @Test
    void 계정B_v21_1_backend_adapter_0_2_결과는_그대로_받는다() throws IOException {
        AnalysisImportRequest request = parser.parse(fixture());
        assertThat(request.analyzer().version()).isEqualTo("v21.1/backend-adapter-0.2");
        assertThat(request.status()).isEqualTo("REVIEW_REQUIRED");
        assertThat(request.subjects()).hasSize(1);
    }

    @Test
    void contractVersion_필드는_합의_전이라_거절한다() throws IOException {
        String body = fixture().replaceFirst("[{]","{\"contractVersion\":\"0.3\",");
        assertThatThrownBy(() -> parser.parse(body)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(reason((BusinessException) e)).contains("contractVersion").contains("unknown_field"));
    }

    @Test
    void 과목별_teachingPlan과_extraction은_합의_전이라_거절한다() throws IOException {
        String withPlan = fixture().replaceFirst("\"subjectName\"", "\"teachingPlan\":[],\"subjectName\"");
        assertThatThrownBy(() -> parser.parse(withPlan)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(reason((BusinessException) e)).contains("teachingPlan").contains("unknown_field"));
        String withExtraction = fixture().replaceFirst("\"subjectName\"", "\"extraction\":{\"status\":\"PARTIAL\"},\"subjectName\"");
        assertThatThrownBy(() -> parser.parse(withExtraction)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(reason((BusinessException) e)).contains("extraction"));
    }

    @Test
    void payload_status_PARTIAL은_0_2에서_받지_않는다_Envelope_PARTIAL로만_표현한다() throws IOException {
        String body = fixture().replace("\"status\": \"REVIEW_REQUIRED\"", "\"status\": \"PARTIAL\"");
        assertThat(body).contains("\"status\": \"PARTIAL\"");
        assertThatThrownBy(() -> parser.parse(body)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(reason((BusinessException) e)).contains("status"));
    }
}
