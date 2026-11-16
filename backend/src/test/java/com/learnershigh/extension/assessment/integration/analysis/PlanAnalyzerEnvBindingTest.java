package com.learnershigh.extension.assessment.integration.analysis;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/**
 * A18 시간 제한 결정(분석기 120초 / Backend 150초): 시연 환경에서 넣는 환경 변수 이름이 {@link PlanAnalyzerConfig}의
 * {@code @Value} 키에 실제로 연결되는지 확인한다(Spring 환경 변수 이름 규칙). 기본값(130000)은 바꾸지 않는다.
 */
class PlanAnalyzerEnvBindingTest {

    private static String resolve(Map<String, Object> env, String placeholder) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new SystemEnvironmentPropertySource("a18-env", env));
        return environment.resolveRequiredPlaceholders(placeholder);
    }

    @Test
    void 시연_환경_변수가_분석기_Client_설정에_연결된다() {
        Map<String, Object> env = Map.of(
                "ASSESSMENT_ANALYZER_TIMEOUT_MILLIS", "150000",
                "ASSESSMENT_ANALYZER_CONTRACT03_VERSION", "v21.10-b16-dev",
                "ASSESSMENT_ANALYZER_BASE_URL", "https://analyzer.example.invalid");
        assertThat(resolve(env, "${assessment.analyzer.timeout-millis:130000}")).isEqualTo("150000");
        assertThat(resolve(env, "${assessment.analyzer.contract03-version:v21.4-dev}")).isEqualTo("v21.10-b16-dev");
        assertThat(resolve(env, "${assessment.analyzer.base-url:}")).isEqualTo("https://analyzer.example.invalid");
    }

    @Test
    void 환경_변수가_없으면_기존_기본값_그대로다() {
        assertThat(resolve(Map.of(), "${assessment.analyzer.timeout-millis:130000}")).isEqualTo("130000");
        assertThat(resolve(Map.of(), "${assessment.analyzer.max-retries:2}")).isEqualTo("2");
    }
}
