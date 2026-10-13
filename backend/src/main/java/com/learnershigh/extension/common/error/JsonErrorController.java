package com.learnershigh.extension.common.error;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Servlet 오류 Dispatch({@code /error})도 공통 Error 형식(api-contract.md §5)으로 응답한다.
 * Spring Boot 기본 BasicErrorController(timestamp / status 999 형식, text/plain이면 빈 본문)를 대신한다.
 *
 * <ul>
 *   <li>Filter 등 Spring MVC 밖에서 난 오류: Container가 정한 Status를 그대로, 예외만 있으면 500.</li>
 *   <li>Query 문자열을 해석할 수 없음(예: {@code %zz}): 400 VALIDATION_ERROR, field {@code query}.</li>
 *   <li>{@code /error}를 직접 요청: 그런 API가 없으므로 404 NOT_FOUND.</li>
 * </ul>
 */
@RestController
public class JsonErrorController implements ErrorController {

    @RequestMapping("${server.error.path:${error.path:/error}}")
    public ResponseEntity<ErrorResponse> error(HttpServletRequest request) {
        Object exception = request.getAttribute(RequestDispatcher.ERROR_EXCEPTION);
        if (exception instanceof Throwable throwable && MalformedQuery.isCause(throwable)) {
            return ErrorResponses.of(CommonErrorCode.VALIDATION_ERROR, ErrorResponses.field("query", "invalid"));
        }
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        if (status instanceof Integer code && code >= 400) {
            return ErrorResponses.forStatus(code).toEntity();
        }
        if (exception != null) {
            return ErrorResponses.forStatus(500).toEntity();
        }
        return ErrorResponses.of(CommonErrorCode.NOT_FOUND, Map.of());
    }
}
