package com.learnershigh.extension.assessment.integration.ai;

import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AI Provider 선택 (P-31 PROPOSED, API-OD-A10 미결 — Provider·비용·재시도 정책은 팀 결정 전).
 * assessment.ai.provider=anthropic 이고 ANTHROPIC_API_KEY가 있을 때만 실제 Provider를 쓴다. 그 밖에는 "미연결" Client.
 * API Key는 환경 변수로만 받고 설정 파일·Frontend에 두지 않는다.
 */
@Configuration
public class AssessmentAiConfig {

    @Bean
    AssessmentAiClient assessmentAiClient(
            @Value("${assessment.ai.provider:none}") String provider,
            @Value("${assessment.ai.model:claude-opus-5-5}") String model,
            @Value("${assessment.ai.max-output-tokens:16000}") long maxTokens,
            @Value("${assessment.ai.timeout-seconds:300}") long timeoutSeconds) {
        String apiKey = System.getenv("ANTHROPIC_API_KEY");
        if (!"anthropic".equals(provider) || apiKey == null || apiKey.isBlank()) {
            return new UnconfiguredAssessmentAiClient();
        }
        return new AnthropicAssessmentAiClient(
                AnthropicOkHttpClient.builder().apiKey(apiKey).timeout(Duration.ofSeconds(timeoutSeconds)).maxRetries(1).build(),
                model,
                maxTokens);
    }
}
