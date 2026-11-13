package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * 외부 분석 결과 JSON을 엄격하게 읽는다: 알 수 없는 필드는 400 VALIDATION_ERROR(reason=unknown_field).
 * 공통 JSON 설정(알 수 없는 필드 무시)은 바꾸지 않고 이 수신 경로에서만 엄격 Mapper를 쓴다.
 */
@Component
public class AnalysisImportParser {

    private final JsonMapper strictMapper;
    private final Validator validator;

    public AnalysisImportParser(JsonMapper mapper, Validator validator) {
        this.strictMapper = mapper.rebuild().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();
        this.validator = validator;
    }

    public AnalysisImportRequest parse(String body) {
        AnalysisImportRequest request;
        try {
            request = strictMapper.readValue(body, AnalysisImportRequest.class);
        } catch (JacksonException exception) {
            String reason = exception.getClass().getSimpleName().contains("UnrecognizedProperty") ? "unknown_field" : "invalid";
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation(pathOf(exception), reason));
        }
        if (request == null) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation("body", "required"));
        }
        List<FieldViolation> violations = validator.validate(request).stream()
                .map(violation -> new FieldViolation(violation.getPropertyPath().toString(), reasonOf(violation)))
                .sorted(Comparator.comparing(FieldViolation::field))
                .toList();
        if (!violations.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, violations.toArray(FieldViolation[]::new));
        }
        return request;
    }

    private static String reasonOf(ConstraintViolation<?> violation) {
        String annotation = violation.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName();
        return switch (annotation) {
            case "NotNull", "NotBlank", "NotEmpty" -> "required";
            case "Size" -> "size";
            case "Pattern" -> "format";
            default -> "range";
        };
    }

    private static String pathOf(JacksonException exception) {
        StringBuilder path = new StringBuilder();
        for (JacksonException.Reference reference : exception.getPath()) {
            if (reference.getPropertyName() != null) {
                if (!path.isEmpty()) {
                    path.append('.');
                }
                path.append(reference.getPropertyName());
            } else if (reference.getIndex() >= 0) {
                path.append('[').append(reference.getIndex()).append(']');
            }
        }
        return path.isEmpty() ? "body" : path.toString();
    }
}
