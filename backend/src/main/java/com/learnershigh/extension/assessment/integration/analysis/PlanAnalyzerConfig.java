package com.learnershigh.extension.assessment.integration.analysis;

import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.ConfigurableEnvironment;
import tools.jackson.databind.json.JsonMapper;

/**
 * 평가계획서 분석기 Client 선택 (A3, 2026-11-13 · A23·A24 2026-11-16 갱신).
 * <ul>
 *   <li>연결값은 {@code application.yml}의 {@code assessment.analyzer.*}에 있다(A23). 주소가 비면 "미설정" Client(503).</li>
 *   <li><b>인증 토큰({@code assessment.analyzer.token})은 설정 파일에서만 읽는다(A24 사용자 결정)</b> — {@link AnalyzerTokenSource}.
 *       {@code ASSESSMENT_ANALYZER_TOKEN} 환경 변수·시스템 속성·실행 인자는 무시한다. 토큰이 비면 "미설정".</li>
 *   <li>그 밖의 키({@code base-url}·{@code version}·{@code contract03-version}·{@code timeout-millis}·{@code max-retries} …)는
 *       Spring 기본 우선순위 그대로다(환경 변수 {@code ASSESSMENT_ANALYZER_*}로 덮어쓸 수 있다 — 로컬 분석기 시험용).</li>
 * </ul>
 * A18 시연 결정: 원격(Railway) 분석기 120초 + 이 Backend 150000ms(30초 여유). Timeout은 재시도하지 않는다(최대 대기 = 이 값).
 */
@Configuration
public class PlanAnalyzerConfig {

    private static final Logger log = LoggerFactory.getLogger(PlanAnalyzerConfig.class);

    @Bean
    PlanAnalyzerClient planAnalyzerClient(
            @Value("${assessment.analyzer.base-url:}") String baseUrl,
            @Value("${assessment.analyzer.connect-timeout-seconds:5}") long connectTimeoutSeconds,
            @Value("${assessment.analyzer.timeout-millis:130000}") long timeoutMillis,
            @Value("${assessment.analyzer.max-retries:2}") int maxRetries,
            @Value("${assessment.analyzer.retry-delay-millis:500}") long retryDelayMillis,
            ConfigurableEnvironment environment,
            JsonMapper mapper) {
        String token = AnalyzerTokenSource.resolve(environment);
        if (AnalyzerTokenSource.overrideAttempted(environment)) {
            // 값은 출력하지 않는다 — 이름만 알린다
            log.info("plan analyzer token override ignored ({} / {}): the token comes from the config file (application.yml) only", AnalyzerTokenSource.IGNORED_ENV, AnalyzerTokenSource.KEY);
        }
        if (baseUrl == null || baseUrl.isBlank() || token.isBlank()) {
            return new UnconfiguredPlanAnalyzerClient();
        }
        return new HttpPlanAnalyzerClient(baseUrl.strip(), token, Duration.ofSeconds(connectTimeoutSeconds),
                Duration.ofMillis(timeoutMillis), maxRetries, retryDelayMillis, mapper);
    }
}
