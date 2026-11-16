package com.learnershigh.extension.assessment.dto.school;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * §12 PATCH: 학생이 편집 가능한 개인 관리 필드만 받는다 (title / description / deadlineDate).
 * 보내지 않은 필드는 그대로 두고, null을 보낸 필드는 비운다(title은 비울 수 없다).
 * 과목·학기·평가계획서 참조·상태는 이 요청으로 바꾸지 않는다: 보내면 400 VALIDATION_ERROR(reason=not_editable).
 * 상태 변경은 §13 PATCH .../status를 쓴다.
 */
public record UpdateSchoolAssessmentRequest(Field<String> title, Field<String> description,
        Field<LocalDate> deadlineDate) {

    private static final Set<String> EDITABLE = Set.of("title", "description", "deadlineDate");

    /** present=false면 요청에 없던 필드. */
    public record Field<T>(boolean present, T value) {

        static <T> Field<T> absent() {
            return new Field<>(false, null);
        }
    }

    public static UpdateSchoolAssessmentRequest from(Map<String, Object> body) {
        List<FieldViolation> violations = new ArrayList<>();
        if (body == null || body.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation("body", "required"));
        }
        for (String key : body.keySet()) {
            if (!EDITABLE.contains(key)) {
                violations.add(new FieldViolation(key, "not_editable"));
            }
        }
        Field<String> title = text(body, "title", 200, true, violations);
        Field<String> description = text(body, "description", 2000, false, violations);
        Field<LocalDate> deadline = date(body, violations);
        if (!violations.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, violations.toArray(FieldViolation[]::new));
        }
        return new UpdateSchoolAssessmentRequest(title, description, deadline);
    }

    private static Field<String> text(Map<String, Object> body, String key, int max, boolean required,
            List<FieldViolation> violations) {
        if (!body.containsKey(key)) {
            return Field.absent();
        }
        Object value = body.get(key);
        if (value == null) {
            if (required) {
                violations.add(new FieldViolation(key, "required"));
            }
            return new Field<>(true, null);
        }
        if (!(value instanceof String text)) {
            violations.add(new FieldViolation(key, "type"));
            return Field.absent();
        }
        if (required && text.isBlank()) {
            violations.add(new FieldViolation(key, "required"));
        } else if (text.strip().length() > max) {
            violations.add(new FieldViolation(key, "size"));
        }
        return new Field<>(true, text);
    }

    private static Field<LocalDate> date(Map<String, Object> body, List<FieldViolation> violations) {
        if (!body.containsKey("deadlineDate")) {
            return Field.absent();
        }
        Object value = body.get("deadlineDate");
        if (value == null) {
            return new Field<>(true, null);
        }
        if (value instanceof String text && text.matches("\\d{4}-\\d{2}-\\d{2}")) {
            try {
                return new Field<>(true, LocalDate.parse(text));
            } catch (DateTimeParseException ignored) {
                // 아래에서 format 오류로 처리
            }
        }
        violations.add(new FieldViolation("deadlineDate", "format"));
        return Field.absent();
    }
}
