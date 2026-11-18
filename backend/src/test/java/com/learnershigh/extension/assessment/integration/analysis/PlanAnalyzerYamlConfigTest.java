package com.learnershigh.extension.assessment.integration.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.json.JsonMapper;

/** 분석기는 서버 안(local)이 기본이고, 외부 분석기 주소·토큰은 설정에 남지 않는다. */
class PlanAnalyzerYamlConfigTest {

    /** main application.yml의 기본 문서(Profile 없는 첫 문서)만 읽는다. 시험용 config/application.yml은 섞지 않는다. */
    private static StandardEnvironment mainYaml() throws IOException {
        List<PropertySource<?>> docs = new YamlPropertySourceLoader().load("main-application-yml", new ClassPathResource("application.yml"));
        StandardEnvironment environment = new StandardEnvironment();
        MutablePropertySources sources = environment.getPropertySources();
        sources.remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME); // 이 PC의 실제 환경 변수는 판정에서 뺀다
        sources.remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        sources.addLast(docs.get(0));
        return environment;
    }

    @Test
    void 기본은_서버_안_분석이고_외부_분석기_주소와_토큰은_없다() throws IOException {
        StandardEnvironment env = mainYaml();
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.mode:}")).isEqualTo("local");
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.ocr:}")).isEqualTo("auto");
        assertThat(env.containsProperty("assessment.analyzer.base-url")).isFalse();
        assertThat(env.containsProperty("assessment.analyzer.token")).isFalse();
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.version:}")).isEqualTo("v21.1");
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.contract03-version:}")).isEqualTo("v21.10-b16-dev");
    }

    @Test
    void 시험_클래스패스는_분석기를_미설정으로_둔다() throws IOException {
        List<PropertySource<?>> test = new YamlPropertySourceLoader().load("test-config", new ClassPathResource("config/application.yml"));
        StandardEnvironment env = mainYaml();
        env.getPropertySources().addFirst(test.get(0));
        assertThat(env.resolveRequiredPlaceholders("${assessment.analyzer.mode:}")).isEqualTo("none");
        assertThat(env.resolveRequiredPlaceholders("${assessment.analysis-import.contract03-enabled:false}")).isEqualTo("false");
        assertThat(env.resolveRequiredPlaceholders("${assessment.multiformat.experimental:false}")).isEqualTo("false");
    }

    @Test
    void 알_수_없는_분석_방식은_기동하지_않는다() {
        PlanAnalyzerConfig config = new PlanAnalyzerConfig();
        JsonMapper mapper = JsonMapper.builder().build();
        assertThat(config.planAnalyzerClient("none", 1000, "none", mapper).configured()).isFalse();
        assertThatThrownBy(() -> config.planAnalyzerClient("http", 1000, "none", mapper)).isInstanceOf(IllegalStateException.class);
    }
}
