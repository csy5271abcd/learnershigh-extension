package com.learnershigh.extension.assessment.integration.analysis;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.core.io.ClassPathResource;

/**
 * A23(2026-11-16, 사용자 결정): Railway 분석기 연결을 main application.yml에 고정했다. 환경 변수 없이도 연결되는지,
 * 환경 변수가 있으면 Spring 규칙대로 우선하는지, 시험 클래스패스는 원격 호출을 막는지 확인한다. 토큰 값은 출력하지 않는다.
 */
class PlanAnalyzerYamlConfigTest {

    private static final String RAILWAY = "https://learnershigh-assessment-analyzer-production.up.railway.app";

    /** main application.yml의 기본 문서(Profile 없는 첫 문서)만 읽는다. 시험용 config/application.yml은 섞지 않는다. */
    private static StandardEnvironment mainYaml(Map<String, Object> env) throws IOException {
        List<PropertySource<?>> docs = new YamlPropertySourceLoader().load("main-application-yml", new ClassPathResource("application.yml"));
        StandardEnvironment environment = new StandardEnvironment();
        MutablePropertySources sources = environment.getPropertySources();
        sources.remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME); // 이 PC의 실제 환경 변수는 판정에서 뺀다
        sources.remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        sources.addLast(docs.get(0));
        sources.addFirst(new SystemEnvironmentPropertySource("given-env", env));
        return environment;
    }

    @Test
    void 환경_변수_없이_Railway_분석기_연결값이_YAML에서_정해진다() throws IOException {
        StandardEnvironment env = mainYaml(Map.of());
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.base-url:}")).isEqualTo(RAILWAY);
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.contract03-version:v21.4-dev}")).isEqualTo("v21.10-b16-dev");
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.version:v21.1}")).isEqualTo("v21.1");
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.timeout-millis:130000}")).isEqualTo("150000");
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.token:}")).as("token(값은 출력하지 않음)").matches("[0-9a-f]{64}");
        assertThat(env.resolveRequiredPlaceholders("${assessment.analysis-import.contract03-enabled:false}")).isEqualTo("true");
        assertThat(env.resolveRequiredPlaceholders("${assessment.multiformat.experimental:false}")).isEqualTo("true");
        // 실험 기능 활성화와 HWP·HWPX 공식 확정 권한은 별개 — 보호는 그대로 꺼져 있다
        assertThat(env.resolveRequiredPlaceholders("${assessment.plan-review.structured-confirm-dev:false}")).isEqualTo("false");
    }

    @Test
    void 토큰_외_분석기_설정은_환경_변수가_있으면_YAML보다_우선한다() throws IOException { // 토큰은 예외 — AnalyzerTokenSourceTest
        StandardEnvironment env = mainYaml(Map.of(
                "ASSESSMENT_ANALYZER_BASE_URL", "http://127.0.0.1:18870",
                "ASSESSMENT_ANALYZER_TIMEOUT_MILLIS", "3000",
                "ASSESSMENT_ANALYZER_CONTRACT03_VERSION", "v21.9-b13-dev"));
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.base-url:}")).isEqualTo("http://127.0.0.1:18870");
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.timeout-millis:130000}")).isEqualTo("3000");
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.contract03-version:v21.4-dev}")).isEqualTo("v21.9-b13-dev");
    }

    @Test
    void 시험_클래스패스는_분석기를_미설정으로_되돌려_원격_호출을_막는다() throws IOException {
        List<PropertySource<?>> test = new YamlPropertySourceLoader().load("test-config", new ClassPathResource("config/application.yml"));
        StandardEnvironment env = mainYaml(Map.of());
        env.getPropertySources().addAfter("given-env", test.get(0));
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.base-url:}")).isEmpty();
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.token:}")).isEmpty();
        assertThat(env.resolveRequiredPlaceholders("${assessment.analysis-import.contract03-enabled:false}")).isEqualTo("false");
        assertThat(env.resolveRequiredPlaceholders("${assessment.multiformat.experimental:false}")).isEqualTo("false");
    }
}
