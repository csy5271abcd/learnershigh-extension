package com.learnershigh.extension.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * Query 해석 실패(InvalidParameterException)가 Spring MVC 밖으로 나가는 경로 (JsonErrorController / MalformedQuery).
 * DispatcherServlet DEBUG 로깅을 켜면 DispatcherServlet은 Handler 처리 전(doDispatch 밖)에 요청 로그를 남기며
 * 파라미터를 읽는다. 그때 난 예외는 GlobalExceptionHandler가 아니라 Container 오류 Dispatch(/error)로 간다.
 * 운영에서 로깅 Level만 바꿔도 400이 500으로 바뀌지 않아야 한다.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "logging.level.org.springframework.web.servlet.DispatcherServlet=DEBUG")
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class MalformedQueryOutsideMvcHttpTest {

    @LocalServerPort
    int port;

    @ParameterizedTest
    @ValueSource(strings = {"?branchId=%zz", "?branchId=br_gangnam&x=%E0%A4", "?branchId=%"})
    void malformedQueryReadBeforeTheHandlerIsStill400OnQuery(String query) throws Exception {
        for (String accept : new String[] {null, "application/json", "text/html"}) {
            RawHttp.Response response = RawHttp.send(port, "GET", "/api/admin/student-care/board" + query, accept);

            assertThat(response.status()).isEqualTo(400);
            assertThat(response.contentType()).startsWith("application/json");
            assertThat(JsonPath.<String>read(response.body(), "$.code")).isEqualTo("VALIDATION_ERROR");
            assertThat(JsonPath.<String>read(response.body(), "$.details.fields[0].field")).isEqualTo("query");
            assertThat(JsonPath.<String>read(response.body(), "$.details.fields[0].reason")).isEqualTo("invalid");
            assertThat(response.body()).doesNotContain("Exception", "%zz", "<html");
        }
    }
}
