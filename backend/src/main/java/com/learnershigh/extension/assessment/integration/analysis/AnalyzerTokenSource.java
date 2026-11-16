package com.learnershigh.extension.assessment.integration.analysis;

import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;

/**
 * 분석기 인증 토큰은 설정 파일(application.yml 등 Spring Config Data 파일)에서만 읽는다 (A24, 2026-11-16 사용자 결정).
 * <p>
 * Spring은 보통 실행 인자 > 시스템 속성 > OS 환경 변수 > 설정 파일 순으로 값을 고른다. 토큰만은 이 순서를 따르지 않고
 * 설정 파일 소스({@code Config resource '…'})만 우선순위대로 본다. 그래서 {@code ASSESSMENT_ANALYZER_TOKEN}(Windows User 포함)·
 * {@code -Dassessment.analyzer.token}·{@code --assessment.analyzer.token}은 값이 무엇이든(빈 문자열 포함) 무시된다.
 * 설정 파일끼리의 우선순위는 Spring 그대로다 — 시험 클래스패스의 {@code config/application.yml}이 main application.yml보다 앞서
 * 시험은 계속 '미설정'(원격 호출 없음)으로 돈다. 시험 프레임워크가 넣는 소스({@code @SpringBootTest(properties)}·
 * {@code @DynamicPropertySource})는 시험 실행 중에만 존재하므로 허용한다(Stub 분석기 시험용).
 * 다른 설정 키의 우선순위는 바꾸지 않는다. 토큰 값은 로그·예외에 넣지 않는다.
 */
final class AnalyzerTokenSource {

    static final String KEY = "assessment.analyzer.token";
    static final String IGNORED_ENV = "ASSESSMENT_ANALYZER_TOKEN";

    /** Spring Boot Config Data가 설정 파일마다 만드는 PropertySource 이름 접두어 */
    private static final String CONFIG_FILE_PREFIX = "Config resource '";
    /** spring-test가 시험 중에만 넣는 소스 (TestPropertySourceUtils / DynamicPropertySource) */
    private static final String INLINED_TEST = "Inlined Test Properties";
    private static final String DYNAMIC_TEST = "Dynamic Test Properties";

    private AnalyzerTokenSource() {
    }

    /** 설정 파일(또는 시험 소스)에 있는 토큰. 없으면 빈 문자열(→ 미설정 Client). */
    static String resolve(ConfigurableEnvironment environment) {
        for (PropertySource<?> source : environment.getPropertySources()) {
            if (!allowed(source.getName())) {
                continue;
            }
            Object value = source.getProperty(KEY);
            if (value == null) {
                continue;
            }
            String token = String.valueOf(value).strip();
            if (token.contains("${")) {
                // 자리표시자는 환경 변수를 다시 끌어온다 — 설정 파일의 토큰은 실제 값이어야 한다
                throw new IllegalStateException(KEY + " in a config file must be a literal value, not a placeholder");
            }
            return token;
        }
        return "";
    }

    static boolean allowed(String sourceName) {
        return sourceName.startsWith(CONFIG_FILE_PREFIX) || INLINED_TEST.equals(sourceName) || DYNAMIC_TEST.equals(sourceName);
    }

    /** 무시된 토큰 덮어쓰기가 있었는지(값은 보지 않고 이름만) — 기동 로그 안내용 */
    static boolean overrideAttempted(ConfigurableEnvironment environment) {
        for (PropertySource<?> source : environment.getPropertySources()) {
            if (!allowed(source.getName()) && (source.containsProperty(KEY) || source.containsProperty(IGNORED_ENV))) {
                return true;
            }
        }
        return false;
    }
}
