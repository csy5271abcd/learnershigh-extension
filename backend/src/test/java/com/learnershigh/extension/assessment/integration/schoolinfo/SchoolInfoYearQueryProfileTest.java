package com.learnershigh.extension.assessment.integration.schoolinfo;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

/**
 * 부록 H: year-query-verified=true 는 운영 프로필(local-run) 한 곳에만 명시돼 있고, 기본·e2e 문서에는 없다.
 * 부록 O: 코드 기본값은 true(설정 없이 동작). false 는 긴급 차단 스위치로만 남는다(파일마다 연도 검증은 그대로).
 */
class SchoolInfoYearQueryProfileTest {

    private static final String KEY = "assessment.schoolinfo.year-query-verified";

    @Test
    void 연도_조회_신뢰는_local_run_프로필에서만_켜진다() throws IOException {
        List<PropertySource<?>> docs = new YamlPropertySourceLoader().load("application", new ClassPathResource("application.yml"));
        int on = 0;
        for (PropertySource<?> d : docs) {
            Object v = d.getProperty(KEY);
            Object profile = d.getProperty("spring.config.activate.on-profile");
            if (v != null) {
                assertThat(String.valueOf(profile)).as("true 는 local-run 프로필 문서에만").isEqualTo("local-run");
                assertThat(String.valueOf(v)).isEqualTo("true");
                on++;
            }
        }
        assertThat(on).isEqualTo(1);
        assertThat(docs.getFirst().getProperty(KEY)).as("기본 문서에는 없음 → @Value 기본 true(부록 O)").isNull();
    }
}
