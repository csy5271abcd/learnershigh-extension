package com.learnershigh.extension.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import jakarta.servlet.Filter;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * 공통 Error 형식 (api-contract.md §5)을 실제 HTTP(Tomcat)로 확인한다. MockMvc는 Tomcat의 Query 해석 / URI 검사 /
 * 오류 Dispatch를 거치지 않으므로 여기서만 드러나는 경로를 본다: 모든 오류 응답은 Accept와 관계없이 JSON 본문이다.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("e2e")
@Import({MySqlContainerConfig.class, ErrorResponseHttpTest.FailingFilterConfig.class})
class ErrorResponseHttpTest {

    private static final String BOARD = "/api/admin/student-care/board";
    /** 이 Test에서만 등록하는 Filter의 경로. 실제 API와 겹치지 않는다. */
    private static final String FAILING_FILTER_PATH = "/test-only/failing-filter";
    private static final String FILTER_SECRET = "filter-internal-detail-7f3a";

    /** Spring MVC 밖(Servlet Filter)에서 예외가 나는 경로. Container 오류 Dispatch → 공통 Error 형식이어야 한다. */
    @TestConfiguration(proxyBeanMethods = false)
    static class FailingFilterConfig {

        @Bean
        FilterRegistrationBean<Filter> failingFilter() {
            FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>((request, response, chain) -> {
                throw new IllegalStateException(FILTER_SECRET);
            });
            registration.addUrlPatterns(FAILING_FILTER_PATH);
            return registration;
        }
    }

    @LocalServerPort
    int port;

    private RawHttp.Response get(String target, String accept) throws Exception {
        return RawHttp.send(port, "GET", target, accept);
    }

    private static void assertJsonError(RawHttp.Response response, int status, String code) {
        assertThat(response.status()).isEqualTo(status);
        assertThat(response.contentType()).startsWith("application/json");
        assertThat(JsonPath.<String>read(response.body(), "$.code")).isEqualTo(code);
        assertThat(JsonPath.<String>read(response.body(), "$.message")).isNotBlank();
    }

    @ParameterizedTest
    @ValueSource(strings = {"?branchId=%zz", "?branchId=br_gangnam&x=%E0%A4", "?branchId=%"})
    void malformedPercentEncodingInQueryIs400OnQuery(String query) throws Exception {
        for (String accept : new String[] {null, "application/json", "*/*"}) {
            RawHttp.Response response = get(BOARD + query, accept);

            assertJsonError(response, 400, "VALIDATION_ERROR");
            assertThat(JsonPath.<String>read(response.body(), "$.details.fields[0].field")).isEqualTo("query");
            assertThat(JsonPath.<String>read(response.body(), "$.details.fields[0].reason")).isEqualTo("invalid");
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/admin/student-care/students/a%2Fb?branchId=br_gangnam",
            "/api/admin/student-care/students/a%5Cb?branchId=br_gangnam"})
    void pathRejectedByTheContainerIsJson400(String target) throws Exception {
        for (String accept : new String[] {null, "text/plain", "text/html"}) {
            RawHttp.Response response = get(target, accept);

            assertJsonError(response, 400, "VALIDATION_ERROR");
            // Container가 거절한 요청은 어느 파라미터 문제인지 알 수 없다 → field request (ErrorResponses.forStatus).
            assertThat(JsonPath.<String>read(response.body(), "$.details.fields[0].field")).isEqualTo("request");
            assertThat(JsonPath.<String>read(response.body(), "$.details.fields[0].reason")).isEqualTo("invalid");
            assertThat(response.body()).doesNotContain("<html", "Tomcat", "Exception");
        }
    }

    @Test
    void directErrorPathIsJson404NotStatus999() throws Exception {
        for (String accept : new String[] {null, "text/plain", "text/html"}) {
            RawHttp.Response response = get("/error", accept);

            assertJsonError(response, 404, "NOT_FOUND");
            assertThat(response.body()).doesNotContain("999", "timestamp");
        }
    }

    @Test
    void notFoundIsJsonEvenWhenAcceptIsTextPlain() throws Exception {
        for (String accept : new String[] {null, "text/plain", "text/html"}) {
            assertJsonError(get("/api/admin/student-care/nope", accept), 404, "NOT_FOUND");
            assertJsonError(get("/nope", accept), 404, "NOT_FOUND");
        }
    }

    @Test
    void methodNotAllowedIsJsonEvenWhenAcceptIsTextPlain() throws Exception {
        for (String accept : new String[] {null, "text/plain"}) {
            assertJsonError(RawHttp.send(port, "DELETE", BOARD + "?branchId=br_gangnam", accept),
                    405, "METHOD_NOT_ALLOWED");
        }
    }

    /** TRACE는 Tomcat(allowTrace=false)이 Spring MVC 전에 405로 거절한다. 본문은 HTML이 아니라 공통 Error JSON이다. */
    @Test
    void traceRejectedByTheContainerIsJson405() throws Exception {
        for (String accept : new String[] {null, "text/plain", "text/html"}) {
            RawHttp.Response response = RawHttp.send(port, "TRACE", BOARD + "?branchId=br_gangnam", accept);

            assertJsonError(response, 405, "METHOD_NOT_ALLOWED");
            assertThat(response.body()).doesNotContain("<html", "Tomcat", "fields");
        }
    }

    /** Filter 예외는 500 INTERNAL_ERROR JSON이다. 예외 이름 / 메시지 / Stack은 본문에 넣지 않는다. */
    @Test
    void filterExceptionOutsideMvcIsJson500WithoutStackTrace() throws Exception {
        for (String accept : new String[] {null, "application/json", "text/html"}) {
            RawHttp.Response response = get(FAILING_FILTER_PATH, accept);

            assertJsonError(response, 500, "INTERNAL_ERROR");
            assertThat(response.body()).doesNotContain(FILTER_SECRET, "IllegalStateException", "Exception", "\tat ",
                    "at com.", "<html", "fields");
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"PUT", "PATCH", "DELETE", "POST"})
    void formBodyOnJsonApiIs415NotServerError(String method) throws Exception {
        String target = "/api/admin/student-care/settings?branchId=br_gangnam";
        RawHttp.Response response = RawHttp.send(port, method, target, "application/json", "a=%zz",
                "application/x-www-form-urlencoded");
        assertThat(response.status()).isIn(405, 415);
        assertThat(response.body()).contains("\"code\"");
        if (method.equals("PUT") || method.equals("POST")) {
            assertThat(response.status()).isEqualTo(method.equals("PUT") ? 415 : 405);
        }
    }

    @Test
    void notAcceptableAndBusinessErrorsAreJson() throws Exception {
        assertJsonError(get(BOARD + "?branchId=br_gangnam", "text/plain"), 406, "NOT_ACCEPTABLE");
        assertJsonError(get(BOARD + "?branchId=br_nope", "application/json"), 404, "BRANCH_NOT_FOUND");
        RawHttp.Response missing = get(BOARD, "application/json");
        assertJsonError(missing, 400, "VALIDATION_ERROR");
        assertThat(JsonPath.<String>read(missing.body(), "$.details.fields[0].field")).isEqualTo("branchId");
    }
}
