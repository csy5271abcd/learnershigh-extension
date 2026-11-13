package com.learnershigh.extension.assessment.integration.analysis;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

/**
 * 평가계획서 분석기 Client 선택 (A3, 2026-11-13). 설정은 환경 변수로만 넣는다(Shared application.yml은 바꾸지 않는다):
 * <ul>
 *   <li>{@code ASSESSMENT_ANALYZER_BASE_URL} (예: http://127.0.0.1:8765) — 없으면 "미설정" Client(503)</li>
 *   <li>{@code ASSESSMENT_ANALYZER_TOKEN} — 분석기 X-Analysis-Token. 없으면 "미설정"</li>
 *   <li>{@code ASSESSMENT_ANALYZER_VERSION} (기본 v21.1), {@code ASSESSMENT_ANALYZER_TIMEOUT_MILLIS} (기본 130000 = 분석기 120초 + 여유),
 *       {@code ASSESSMENT_ANALYZER_MAX_RETRIES} (기본 2, 연결 실패·BUSY만)</li>
 * </ul>
 */
@Configuration
public class PlanAnalyzerConfig {

    @Bean
    PlanAnalyzerClient planAnalyzerClient(
            @Value("${assessment.analyzer.base-url:}") String baseUrl,
            @Value("${assessment.analyzer.token:}") String token,
            @Value("${assessment.analyzer.connect-timeout-seconds:5}") long connectTimeoutSeconds,
            @Value("${assessment.analyzer.timeout-millis:130000}") long timeoutMillis,
            @Value("${assessment.analyzer.max-retries:2}") int maxRetries,
            @Value("${assessment.analyzer.retry-delay-millis:500}") long retryDelayMillis,
            JsonMapper mapper) {
        if (baseUrl == null || baseUrl.isBlank() || token == null || token.isBlank()) {
            return new UnconfiguredPlanAnalyzerClient();
        }
        return new HttpPlanAnalyzerClient(baseUrl.strip(), token.strip(), Duration.ofSeconds(connectTimeoutSeconds),
                Duration.ofMillis(timeoutMillis), maxRetries, retryDelayMillis, mapper);
    }
}
