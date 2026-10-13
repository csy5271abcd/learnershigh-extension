package com.learnershigh.extension.common.error;

import com.learnershigh.extension.common.integration.learnershigh.ExistingIntegrationException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** 모든 예외를 api-contract.md §5 공통 Error 형식으로 바꾼다. Controller / Service는 Error Response를 직접 만들지 않는다. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ErrorResponse> handleBusiness(BusinessException exception) {
        ErrorCode errorCode = exception.errorCode();
        return ResponseEntity.status(errorCode.status())
                .body(ErrorResponse.of(errorCode.code(), exception.getMessage(), exception.details()));
    }

    @ExceptionHandler(ExistingIntegrationException.class)
    ResponseEntity<ErrorResponse> handleIntegration(ExistingIntegrationException exception) {
        // Integration 실패는 Empty로 숨기지 않는다 (api-contract.md §6). 원인은 로그로만 남긴다.
        log.warn("Existing LearnersHigh integration failed: {}", exception.getMessage());
        return of(CommonErrorCode.EXISTING_STUDY_DATA_UNAVAILABLE, Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> handleInvalidBody(MethodArgumentNotValidException exception) {
        List<FieldViolation> fields = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldViolation(error.getField(), reasonOf(error.getCode())))
                .toList();
        return of(CommonErrorCode.VALIDATION_ERROR, Map.of("fields", fields));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<ErrorResponse> handleInvalidParameter(HandlerMethodValidationException exception) {
        List<FieldViolation> fields = exception.getParameterValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream()
                        .map(error -> new FieldViolation(
                                result.getMethodParameter().getParameterName(), reasonOf(error.getCodes()))))
                .toList();
        return of(CommonErrorCode.VALIDATION_ERROR, Map.of("fields", fields));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ErrorResponse> handleMissingParameter(MissingServletRequestParameterException exception) {
        return of(CommonErrorCode.VALIDATION_ERROR,
                Map.of("fields", List.of(new FieldViolation(exception.getParameterName(), "required"))));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return of(CommonErrorCode.VALIDATION_ERROR,
                Map.of("fields", List.of(new FieldViolation(exception.getName(), "invalid"))));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException exception) {
        return of(CommonErrorCode.VALIDATION_ERROR, Map.of("fields", List.of(new FieldViolation("body", "invalid"))));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException exception) {
        return of(CommonErrorCode.NOT_FOUND, Map.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorResponse> handleMethod(HttpRequestMethodNotSupportedException exception) {
        return of(CommonErrorCode.METHOD_NOT_ALLOWED, Map.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> handleUnexpected(Exception exception) {
        log.error("Unexpected error", exception);
        return of(CommonErrorCode.INTERNAL_ERROR, Map.of());
    }

    private static ResponseEntity<ErrorResponse> of(ErrorCode errorCode, Map<String, Object> details) {
        return ResponseEntity.status(errorCode.status())
                .body(ErrorResponse.of(errorCode.code(), errorCode.message(), details));
    }

    private static String reasonOf(String[] codes) {
        return codes == null || codes.length == 0 ? "invalid" : reasonOf(codes[codes.length - 1]);
    }

    private static String reasonOf(String constraint) {
        if (constraint == null) {
            return "invalid";
        }
        return switch (constraint) {
            case "NotNull", "NotBlank", "NotEmpty" -> "required";
            case "Size", "Length" -> "length";
            case "Min", "Max", "Range" -> "range";
            default -> "invalid";
        };
    }
}
