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
        Field<LocalDate> deadlineDate, Field<String> assessmentType, Field<LocalDate> evaluationDate,
        Field<Integer> weightPercent, Field<String> submissions, Field<String> personalMemo,
        Field<String> assessmentTypeLabel) {
    private static final Set<String> EDITABLE = Set.of("title", "description", "deadlineDate", "assessmentType",
            "evaluationDate", "weightPercent", "submissions", "personalMemo", "assessmentTypeLabel");
    private static final Set<String> TYPES = Set.of("PRESENTATION", "REPORT", "PROJECT", "EXPERIMENT", "DEBATE",
            "PORTFOLIO", "OTHER");

    /** 이전 호출(A27-UX 이전 필드만) 호환 */
    public UpdateSchoolAssessmentRequest(Field<String> title, Field<String> description, Field<LocalDate> deadlineDate) {
        this(title, description, deadlineDate, Field.absent(), Field.absent(), Field.absent(), Field.absent(),
                Field.absent(), Field.absent());
    }

    /** A27-UX(2026-11-17) 필드까지 호환 */
    public UpdateSchoolAssessmentRequest(Field<String> title, Field<String> description, Field<LocalDate> deadlineDate,
            Field<String> assessmentType, Field<LocalDate> evaluationDate, Field<Integer> weightPercent,
            Field<String> submissions, Field<String> personalMemo) {
        this(title, description, deadlineDate, assessmentType, evaluationDate, weightPercent, submissions, personalMemo,
                Field.absent());
    }

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
        Field<LocalDate> deadline = date(body, "deadlineDate", violations);
        Field<String> type = text(body, "assessmentType", 20, false, violations);
        if (type.present() && type.value() != null && !TYPES.contains(type.value())) {
            violations.add(new FieldViolation("assessmentType", "unknown"));
        }
        Field<LocalDate> evaluationDate = date(body, "evaluationDate", violations);
        Field<Integer> weight = percent(body, violations);
        Field<String> submissions = text(body, "submissions", 500, false, violations);
        Field<String> memo = text(body, "personalMemo", 2000, false, violations);
        Field<String> typeLabel = text(body, "assessmentTypeLabel", 50, false, violations);
        if (!violations.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, violations.toArray(FieldViolation[]::new));
        }
        return new UpdateSchoolAssessmentRequest(title, description, deadline, type, evaluationDate, weight, submissions,
                memo, typeLabel);
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

    /** 0~100 정수. null = 비우기(0으로 바꾸지 않는다) */
    private static Field<Integer> percent(Map<String, Object> body, List<FieldViolation> violations) {
        if (!body.containsKey("weightPercent")) {
            return Field.absent();
        }
        Object value = body.get("weightPercent");
        if (value == null) {
            return new Field<>(true, null);
        }
        if (value instanceof Integer number) {
            if (number < 0 || number > 100) {
                violations.add(new FieldViolation("weightPercent", "range"));
                return Field.absent();
            }
            return new Field<>(true, number);
        }
        violations.add(new FieldViolation("weightPercent", "type"));
        return Field.absent();
    }

    private static Field<LocalDate> date(Map<String, Object> body, String key, List<FieldViolation> violations) {
        if (!body.containsKey(key)) {
            return Field.absent();
        }
        Object value = body.get(key);
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
        violations.add(new FieldViolation(key, "format"));
        return Field.absent();
    }
}
