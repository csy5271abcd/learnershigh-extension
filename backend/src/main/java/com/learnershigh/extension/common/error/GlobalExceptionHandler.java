package com.learnershigh.extension.common.error;

import com.learnershigh.extension.common.integration.learnershigh.ExistingIntegrationException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DatabindException;

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

    /**
     * Query 파라미터 제약(@NotBlank branchId 등)이 있는 Method는 Body(@Valid) 오류도 여기로 온다.
     * Body 오류는 파라미터 이름이 아니라 필드 경로(예: {@code content}, {@code plan.goal})로 알린다.
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<ErrorResponse> handleInvalidParameter(HandlerMethodValidationException exception) {
        List<FieldViolation> fields = exception.getParameterValidationResults().stream()
                .flatMap(result -> result instanceof ParameterErrors errors
                        ? errors.getFieldErrors().stream()
                                .map(error -> new FieldViolation(error.getField(), reasonOf(error.getCode())))
                        : result.getResolvableErrors().stream()
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

    /**
     * JSON 형식 오류. 값의 형식 / Enum / 정수 필드의 소수처럼 위치를 알 수 있으면 JSON 경로(예: {@code plan.recheckDate})로,
     * 문법 오류처럼 위치를 알 수 없으면 {@code body}로 알린다 (api-contract.md §5-1).
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException exception) {
        String field = jsonPathOf(exception);
        return of(CommonErrorCode.VALIDATION_ERROR,
                Map.of("fields", List.of(new FieldViolation(field == null ? "body" : field, "invalid"))));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ErrorResponse> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException exception) {
        return of(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE, Map.of());
    }

    /**
     * Accept가 JSON을 허용하지 않는다. Content-Type을 미리 정해 두면 Accept 협상 없이 JSON 오류 본문을 쓴다.
     * (협상이 다시 실패하는 경우에도 Spring이 본문 없이 406으로 응답한다.)
     */
    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    ResponseEntity<ErrorResponse> handleNotAcceptable(HttpMediaTypeNotAcceptableException exception) {
        return ResponseEntity.status(CommonErrorCode.NOT_ACCEPTABLE.status())
                .contentType(MediaType.APPLICATION_JSON)
                .body(ErrorResponse.of(CommonErrorCode.NOT_ACCEPTABLE.code(), CommonErrorCode.NOT_ACCEPTABLE.message(),
                        Map.of()));
    }

    /** 같은 자원을 동시에 바꿔 이번 요청이 반영되지 않았다 (@Version 충돌, 잠금 대기 실패). 500이 아니라 409로 알린다. */
    @ExceptionHandler({OptimisticLockingFailureException.class, PessimisticLockingFailureException.class})
    ResponseEntity<ErrorResponse> handleConcurrentModification(RuntimeException exception) {
        log.warn("Concurrent modification: {}", exception.getClass().getSimpleName());
        return of(CommonErrorCode.CONCURRENT_MODIFICATION, Map.of());
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

    /** Jackson 바인딩 오류의 JSON 경로. 예: [plan, recheckDate] → "plan.recheckDate", [items, 0] → "items[0]". */
    private static String jsonPathOf(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof DatabindException databind && !databind.getPath().isEmpty()) {
                StringBuilder path = new StringBuilder();
                for (JacksonException.Reference reference : databind.getPath()) {
                    if (reference.getPropertyName() != null) {
                        if (!path.isEmpty()) {
                            path.append('.');
                        }
                        path.append(reference.getPropertyName());
                    } else if (reference.getIndex() >= 0) {
                        path.append('[').append(reference.getIndex()).append(']');
                    }
                }
                return path.isEmpty() ? null : path.toString();
            }
        }
        return null;
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
