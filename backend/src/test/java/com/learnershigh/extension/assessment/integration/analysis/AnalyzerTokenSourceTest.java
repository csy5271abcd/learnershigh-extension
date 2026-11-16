package com.learnershigh.extension.assessment.integration.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.lang.reflect.Field;
import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.json.JsonMapper;

/**
 * A24(2026-11-16 사용자 결정): 분석기 토큰은 설정 파일(application.yml)의 값만 쓴다. 실제 Spring Boot Config Data 로딩으로
 * PlanAnalyzerConfig를 띄워, 만들어진 Client가 가진 토큰이 main application.yml 값과 같은지 본다.
 * 토큰 값은 출력하지 않는다 — 같은지(참/거짓)만 단언한다. 네트워크 호출은 하지 않는다(Client를 만들기만 한다).
 */
class AnalyzerTokenSourceTest {

    @Configuration
    @Import(PlanAnalyzerConfig.class)
    static class Minimal {
        @Bean
        JsonMapper jsonMapper() {
            return JsonMapper.builder().build();
        }
    }

    /** 가짜 OS 환경 변수·시스템 속성으로 만든 Environment (이 PC의 실제 환경 변수는 섞지 않는다) */
    static final class FakeEnvironment extends StandardEnvironment {
        private final Map<String, Object> env;
        private final Map<String, Object> sys;

        FakeEnvironment(Map<String, Object> env, Map<String, Object> sys) {
            super();
            this.env = env;
            this.sys = sys;
            getPropertySources().replace(SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                    new org.springframework.core.env.SystemEnvironmentPropertySource(SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, env));
            getPropertySources().replace(SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME, new MapPropertySource(SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME, sys));
        }
    }

    private static String mainYamlToken() throws Exception {
        Object value = new YamlPropertySourceLoader().load("main", new ClassPathResource("application.yml")).get(0).getProperty(AnalyzerTokenSource.KEY);
        return String.valueOf(value);
    }

    private record Built(PlanAnalyzerClient client, ConfigurableApplicationContext context) implements AutoCloseable {
        @Override
        public void close() {
            context.close();
        }
    }

    /** mainOnly=true면 main application.yml만(운영과 같은 조건), false면 시험 클래스패스의 config/application.yml도 함께(시험 기본 조건) */
    private static Built build(boolean mainOnly, Map<String, Object> env, Map<String, Object> sys, String... extraArgs) {
        SpringApplication app = new SpringApplication(Minimal.class);
        app.setWebApplicationType(WebApplicationType.NONE);
        app.setEnvironment(new FakeEnvironment(env, sys));
        app.setLogStartupInfo(false);
        List<String> args = new ArrayList<>(List.of(extraArgs));
        if (mainOnly) args.add("--spring.config.location=classpath:/application.yml");
        ConfigurableApplicationContext context = app.run(args.toArray(String[]::new));
        return new Built(context.getBean(PlanAnalyzerClient.class), context);
    }

    private static String tokenOf(PlanAnalyzerClient client) throws Exception {
        Field field = HttpPlanAnalyzerClient.class.getDeclaredField("token");
        field.setAccessible(true);
        return (String) field.get(client);
    }

    private static URI endpointOf(PlanAnalyzerClient client) throws Exception {
        Field field = HttpPlanAnalyzerClient.class.getDeclaredField("endpoint");
        field.setAccessible(true);
        return (URI) field.get(client);
    }

    private static void assertUsesYamlToken(Built built) throws Exception {
        assertThat(built.client()).isInstanceOf(HttpPlanAnalyzerClient.class);
        assertThat(tokenOf(built.client()).equals(mainYamlToken())).as("Client 토큰 == application.yml 토큰 (값은 출력하지 않음)").isTrue();
    }

    @Test
    void Case1_환경_변수가_없으면_YAML_토큰으로_Client를_만든다() throws Exception {
        try (Built built = build(true, Map.of(), Map.of())) {
            assertUsesYamlToken(built);
        }
    }

    @Test
    void Case2_올바른_토큰_환경_변수가_있어도_YAML_토큰을_쓴다() throws Exception {
        try (Built built = build(true, Map.of("ASSESSMENT_ANALYZER_TOKEN", mainYamlToken()), Map.of())) {
            assertUsesYamlToken(built);
        }
    }

    @Test
    void Case3_잘못된_토큰_환경_변수는_무시한다() throws Exception {
        try (Built built = build(true, Map.of("ASSESSMENT_ANALYZER_TOKEN", "wrong-token-from-env"), Map.of())) {
            // 대조: Spring의 일반 조회는 환경 변수가 이긴다(= 예전 @Value 방식이면 덮어써졌다)
            assertThat("wrong-token-from-env".equals(built.context().getEnvironment().getProperty(AnalyzerTokenSource.KEY))).as("일반 조회는 환경 변수 값").isTrue();
            assertThat(AnalyzerTokenSource.overrideAttempted(built.context().getEnvironment())).isTrue();
            assertUsesYamlToken(built);
        }
    }

    @Test
    void Case4_빈_토큰_환경_변수는_무시한다() throws Exception {
        try (Built built = build(true, Map.of("ASSESSMENT_ANALYZER_TOKEN", ""), Map.of())) {
            assertUsesYamlToken(built);
        }
    }

    @Test
    void 시스템_속성과_실행_인자로도_토큰을_바꿀_수_없다() throws Exception {
        try (Built built = build(true, Map.of(), Map.of("assessment.analyzer.token", "wrong-token-from-sysprop"), "--assessment.analyzer.token=wrong-token-from-arg")) {
            assertUsesYamlToken(built);
        }
    }

    @Test
    void Case5_시험_클래스패스_설정은_토큰을_비워_원격_Client를_만들지_않는다() throws Exception {
        Map<String, Object> env = new HashMap<>(Map.of("ASSESSMENT_ANALYZER_TOKEN", "wrong-token-from-env"));
        try (Built built = build(false, env, Map.of())) {
            assertThat(built.client()).isInstanceOf(UnconfiguredPlanAnalyzerClient.class);
        }
    }

    @Test
    void Case6_토큰_외_분석기_설정은_환경_변수로_덮어쓸_수_있다() throws Exception {
        Map<String, Object> env = Map.of(
                "ASSESSMENT_ANALYZER_BASE_URL", "http://127.0.0.1:18870",
                "ASSESSMENT_ANALYZER_CONTRACT03_VERSION", "v21.9-b13-dev",
                "ASSESSMENT_ANALYZER_TIMEOUT_MILLIS", "3000",
                "DB_URL", "jdbc:mysql://127.0.0.1:1/never");
        try (Built built = build(true, env, Map.of())) {
            // 주소는 로컬로 바뀌었다 → 이 Client는 Railway로 보내지 않는다. 토큰은 여전히 YAML 값
            assertThat(endpointOf(built.client())).isEqualTo(URI.create("http://127.0.0.1:18870/analyze-preview"));
            assertUsesYamlToken(built);
            assertThat(built.context().getEnvironment().getProperty("assessment.analyzer.contract03-version")).isEqualTo("v21.9-b13-dev");
            assertThat(built.context().getEnvironment().getProperty("assessment.analyzer.timeout-millis")).isEqualTo("3000");
            assertThat(built.context().getEnvironment().getProperty("DB_URL")).isEqualTo("jdbc:mysql://127.0.0.1:1/never");
        }
    }

    @Test
    void 설정_파일_토큰이_자리표시자면_기동을_거부한다() {
        StandardEnvironment env = new StandardEnvironment();
        env.getPropertySources().addFirst(new MapPropertySource("Config resource 'class path resource [x.yml]' via location 'x'",
                Map.of(AnalyzerTokenSource.KEY, "${ASSESSMENT_ANALYZER_TOKEN}")));
        assertThatThrownBy(() -> AnalyzerTokenSource.resolve(env)).isInstanceOf(IllegalStateException.class).hasMessageNotContaining("ASSESSMENT_ANALYZER_TOKEN}");
    }
}
