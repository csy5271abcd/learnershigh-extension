package com.learnershigh.extension.common.error;

/** VALIDATION_ERROR / 422 입력 오류의 details.fields 항목. */
public record FieldViolation(String field, String reason) {
}
