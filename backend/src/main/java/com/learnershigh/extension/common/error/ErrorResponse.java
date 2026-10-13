package com.learnershigh.extension.common.error;

import java.util.Map;

/** api-contract.md §5 공통 Error 형식. */
public record ErrorResponse(String code, String message, Map<String, Object> details, String traceId) {

    public static ErrorResponse of(String code, String message, Map<String, Object> details) {
        return new ErrorResponse(code, message, details, null);
    }
}
