package com.learnershigh.extension.common.error;

import java.io.IOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import org.apache.catalina.connector.Request;
import org.apache.catalina.connector.Response;
import org.apache.catalina.valves.ErrorReportValve;
import tools.jackson.databind.json.JsonMapper;

/**
 * Tomcat Host의 오류 본문을 HTML 대신 공통 Error 형식 JSON으로 쓴다 (api-contract.md §5).
 * Spring MVC까지 오지 못하고 Container가 바로 거절한 요청(예: Path의 {@code %2F}, {@code %5C})에 쓰인다.
 * 예외 이름 / Stack / Server 정보는 본문에 넣지 않는다.
 */
public class JsonErrorReportValve extends ErrorReportValve {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Override
    protected void report(Request request, Response response, Throwable throwable) {
        int status = response.getStatus();
        if (status < 400 || response.getContentWritten() > 0 || !response.setErrorReported()) {
            return;
        }
        ErrorResponses.Body body = throwable != null && MalformedQuery.isCause(throwable)
                ? new ErrorResponses.Body(400, ErrorResponse.of(CommonErrorCode.VALIDATION_ERROR.code(),
                        CommonErrorCode.VALIDATION_ERROR.message(), ErrorResponses.field("query", "invalid")))
                : ErrorResponses.forStatus(status);
        try {
            response.setStatus(body.status());
            response.setContentType("application/json");
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            Writer writer = response.getReporter();
            if (writer != null) {
                writer.write(JSON.writeValueAsString(body.response()));
                response.finishResponse();
            }
        } catch (IOException | IllegalStateException e) {
            // 응답을 더 쓸 수 없다. Container 기본 처리에 맡긴다.
        }
    }
}
