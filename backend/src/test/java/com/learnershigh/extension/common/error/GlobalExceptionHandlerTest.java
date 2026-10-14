package com.learnershigh.extension.common.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

/** 공통 Error 변환 (api-contract.md §5-1): 동시 변경 409, JSON 형식 오류의 필드 경로. */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final JsonMapper mapper = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .build();

    record Item(Integer minutes) {
    }

    record Body(String name, Inner plan, List<Item> items) {
    }

    record Inner(java.time.LocalDate recheckDate) {
    }

    private Map<String, Object> unreadable(String json) {
        JacksonException cause = catchThrowableOfType(JacksonException.class, () -> mapper.readValue(json, Body.class));
        HttpInputMessage input = new MockHttpInputMessage(json.getBytes());
        ResponseEntity<ErrorResponse> response = handler.handleUnreadable(
                new HttpMessageNotReadableException("JSON parse error", cause, input));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().code()).isEqualTo("VALIDATION_ERROR");
        return response.getBody().details();
    }

    @Test
    void optimisticAndPessimisticLockFailuresAreConcurrentModification() {
        for (RuntimeException exception : List.of(
                new ObjectOptimisticLockingFailureException(Object.class, "care_1"),
                new CannotAcquireLockException("lock wait timeout"))) {
            ResponseEntity<ErrorResponse> response = handler.handleConcurrentModification(exception);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(response.getBody().code()).isEqualTo("CONCURRENT_MODIFICATION");
        }
    }

    @Test
    void bindingErrorsReportTheJsonPath() {
        assertThat(unreadable("{\"plan\":{\"recheckDate\":\"2026-13-40\"}}"))
                .isEqualTo(Map.of("fields", List.of(new FieldViolation("plan.recheckDate", "invalid"))));
        assertThat(unreadable("{\"items\":[{\"minutes\":1},{\"minutes\":2.5}]}"))
                .isEqualTo(Map.of("fields", List.of(new FieldViolation("items[1].minutes", "invalid"))));
    }

    @Test
    void syntaxErrorsReportTheBody() {
        assertThat(unreadable("{\"name\":"))
                .isEqualTo(Map.of("fields", List.of(new FieldViolation("body", "invalid"))));
    }
}
