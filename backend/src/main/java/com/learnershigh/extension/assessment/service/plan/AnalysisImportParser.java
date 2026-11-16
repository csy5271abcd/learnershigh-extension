package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
    /** analysis-import-0.3 DRAFT 수신 (§39-3). 합의 전이라 기본 꺼짐 — 꺼져 있으면 0.3 필드는 unknown_field. */
    private final boolean contract03Enabled;

    public AnalysisImportParser(JsonMapper mapper, Validator validator) {
        this(mapper, validator, false);
    }

    @Autowired
    public AnalysisImportParser(JsonMapper mapper, Validator validator,
            @Value("${assessment.analysis-import.contract03-enabled:false}") boolean contract03Enabled) {
        this.strictMapper = mapper.rebuild().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();
        this.validator = validator;
        this.contract03Enabled = contract03Enabled;
    }

    public boolean contract03Enabled() {
        return contract03Enabled;
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
        List<FieldViolation> gate = versionGate(request, contract03Enabled);
        if (!gate.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, gate.toArray(FieldViolation[]::new));
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

    /**
     * 계약 버전별 허용 필드. contractVersion이 없으면 0.2: 0.3 필드(analyzer.profile·extraction·teachingPlan)는 지금처럼
     * unknown_field, payload status PARTIAL은 format(0.2는 Envelope로만 표현). 0.3은 설정이 켜졌을 때만 받는다.
     */
    static List<FieldViolation> versionGate(AnalysisImportRequest request, boolean contract03Enabled) {
        List<FieldViolation> violations = new ArrayList<>();
        if (request.contractVersion() != null) {
            if (!contract03Enabled) {
                violations.add(new FieldViolation("contractVersion", "unknown_field"));
            }
            return violations;
        }
        if (request.analyzer() != null && request.analyzer().profile() != null) {
            violations.add(new FieldViolation("analyzer.profile", "unknown_field"));
        }
        if ("PARTIAL".equals(request.status())) {
            violations.add(new FieldViolation("status", "format"));
        }
        List<AnalysisImportRequest.Subject> subjects = request.subjects() == null ? List.of() : request.subjects();
        for (int i = 0; i < subjects.size(); i++) {
            AnalysisImportRequest.Subject subject = subjects.get(i);
            if (subject == null) {
                continue;
            }
            if (subject.extraction() != null) {
                violations.add(new FieldViolation("subjects[" + i + "].extraction", "unknown_field"));
            }
            if (subject.teachingPlan() != null) {
                violations.add(new FieldViolation("subjects[" + i + "].teachingPlan", "unknown_field"));
            }
            // A15: 0.3 선택 확장 필드도 0.2에서는 지금처럼 unknown_field
            if (subject.grades() != null) {
                violations.add(new FieldViolation("subjects[" + i + "].grades", "unknown_field"));
            }
            List<AnalysisImportRequest.PerformanceItem> items = subject.performanceEvaluation() == null
                    || subject.performanceEvaluation().items() == null ? List.of() : subject.performanceEvaluation().items();
            for (int n = 0; n < items.size(); n++) {
                List<AnalysisImportRequest.RubricCriterion> rubric = items.get(n) == null || items.get(n).rubric() == null
                        ? List.of() : items.get(n).rubric();
                for (int r = 0; r < rubric.size(); r++) {
                    String at = "subjects[" + i + "].performanceEvaluation.items[" + n + "].rubric[" + r + "]";
                    if (rubric.get(r) != null && rubric.get(r).maxScore() != null) {
                        violations.add(new FieldViolation(at + ".maxScore", "unknown_field"));
                    }
                    if (rubric.get(r) != null && rubric.get(r).linkReview() != null) {
                        violations.add(new FieldViolation(at + ".linkReview", "unknown_field"));
                    }
                }
            }
        }
        return violations;
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
