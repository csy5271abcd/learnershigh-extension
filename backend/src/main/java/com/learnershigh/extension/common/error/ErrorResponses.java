package com.learnershigh.extension.common.error;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * api-contract.md §5 공통 Error 응답을 만든다. 모든 Error 응답은 {@code Content-Type: application/json}을 미리 정해
 * {@code Accept}(예: text/plain)와 관계없이 JSON 본문을 쓴다(협상 실패로 본문이 비지 않게).
 */
public final class ErrorResponses {

    private ErrorResponses() {
    }

    public static ResponseEntity<ErrorResponse> of(ErrorCode errorCode, String message, Map<String, Object> details) {
        return ResponseEntity.status(errorCode.status())
                .contentType(MediaType.APPLICATION_JSON)
                .body(ErrorResponse.of(errorCode.code(), message, details));
    }

    public static ResponseEntity<ErrorResponse> of(ErrorCode errorCode, Map<String, Object> details) {
        return of(errorCode, errorCode.message(), details);
    }

    /** 원인 필드 하나를 담은 400 VALIDATION_ERROR (api-contract.md §5-2). */
    public static Map<String, Object> field(String field, String reason) {
        return Map.of("fields", List.of(new FieldViolation(field, reason)));
    }

    /**
     * Spring MVC 밖(Servlet Container / 오류 Dispatch)에서 정해진 HTTP Status를 공통 Error 형식으로 옮긴다.
     * Status는 그대로 두고 code만 고른다: 400 VALIDATION_ERROR(field {@code request}), 404 NOT_FOUND,
     * 405 METHOD_NOT_ALLOWED, 406 NOT_ACCEPTABLE, 415 UNSUPPORTED_MEDIA_TYPE, 그 밖의 4xx VALIDATION_ERROR,
     * 5xx INTERNAL_ERROR.
     */
    public static Body forStatus(int status) {
        CommonErrorCode code = switch (status) {
            case 404 -> CommonErrorCode.NOT_FOUND;
            case 405 -> CommonErrorCode.METHOD_NOT_ALLOWED;
            case 406 -> CommonErrorCode.NOT_ACCEPTABLE;
            case 415 -> CommonErrorCode.UNSUPPORTED_MEDIA_TYPE;
            default -> status >= 500 ? CommonErrorCode.INTERNAL_ERROR : CommonErrorCode.VALIDATION_ERROR;
        };
        Map<String, Object> details = code == CommonErrorCode.VALIDATION_ERROR ? field("request", "invalid") : Map.of();
        return new Body(status, ErrorResponse.of(code.code(), code.message(), details));
    }

    /** HTTP Status와 공통 Error 본문. */
    public record Body(int status, ErrorResponse response) {

        public ResponseEntity<ErrorResponse> toEntity() {
            return ResponseEntity.status(HttpStatus.valueOf(status)).contentType(MediaType.APPLICATION_JSON).body(response);
        }
    }
}
