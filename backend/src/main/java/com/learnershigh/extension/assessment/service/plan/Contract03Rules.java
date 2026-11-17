package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Issue;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Locator;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Schedule;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Subject;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.TeachingPlanRow;
import com.learnershigh.extension.common.error.FieldViolation;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * analysis-import-0.3 DRAFT 업무 규칙 (api-contract.md §39-3, 계정 B 제안 B3·B4 기준, 2026-11-15).
 * Shape(enum·길이)은 Bean Validation이 먼저 검사한다. 여기서는 값 사이의 모순과 근거를 본다.
 *
 * <ul>
 *   <li>failureReason: FAILED면 코드 5종 중 하나, 그 밖에는 null.</li>
 *   <li>issue fieldPath는 같은 과목 안 실제 경로(색인 범위 포함). 필드 상태 issue 3종은 값과 모순되면 거절,
 *       FIELD_NOT_PROVIDED는 근거 Locator 필수(근거 없는 "원문에 없음" 금지), 같은 경로에 상태 issue 2개 금지.</li>
 *   <li>teachingPlan: rowKey 유일, weekFrom ≤ weekTo, 행마다 근거, 빈 배열이면 TEACHING_PLAN_* issue 필수.</li>
 *   <li>schedule: calendarYear는 EXPLICIT_IN_CELL 근거가 있을 때만(학년도로 연도 계산 금지), 날짜 정밀도 ⇔ dateFrom.</li>
 * </ul>
 * 값은 고치지 않는다. 정밀도 8종을 다른 값으로 줄이지 않는다.
 */
final class Contract03Rules {

    static final Set<String> FAILURE_REASONS = Set.of("NEEDS_OCR", "NO_ASSESSMENTS_EXTRACTED", "NO_SEGMENTS",
            "PARSE_FAILED", "UNSUPPORTED_FORMAT");
    static final Set<String> FIELD_STATUS_CODES = Set.of("FIELD_NOT_PROVIDED", "FIELD_EXTRACTION_FAILED",
            "FIELD_REVIEW_REQUIRED");
    private static final Set<String> DATE_PRECISIONS = Set.of("EXACT_DATE", "DATE_RANGE");
    private static final Pattern PATH = Pattern.compile("[A-Za-z][A-Za-z0-9]{0,40}(?:\\.[A-Za-z][A-Za-z0-9]{0,40}|\\[(?:0|[1-9]\\d{0,2})])*");
    private static final Pattern SEGMENT = Pattern.compile("([A-Za-z][A-Za-z0-9]*)|\\[(\\d+)]");
    private static final JsonMapper TREE = JsonMapper.builder().build();

    private Contract03Rules() {
    }

    static void document(AnalysisImportRequest request, List<FieldViolation> errors) {
        boolean failed = "FAILED".equals(request.status());
        String reason = request.failureReason();
        if (failed && reason != null && !FAILURE_REASONS.contains(reason)) {
            errors.add(new FieldViolation("failureReason", "format"));
        }
        if (!failed && reason != null) {
            errors.add(new FieldViolation("failureReason", "not_allowed"));
        }
    }

    /** 과목 하나. locators: 형식별 Locator 검사(기존 PDF/HWP 규칙 재사용, 과목 쪽 범위는 적용하지 않음). */
    static void subject(String path, Subject subject, List<FieldViolation> errors,
            BiConsumer<String, List<Locator>> locators) {
        JsonNode tree = TREE.valueToTree(subject);
        List<Issue> issues = subject.extraction() == null || subject.extraction().issues() == null
                ? List.of() : subject.extraction().issues();
        Set<String> statusPaths = new HashSet<>();
        boolean teachingPlanStatus = false;
        for (int i = 0; i < issues.size(); i++) {
            Issue issue = issues.get(i);
            String at = path + ".extraction.issues[" + i + "]";
            if (issue.sources() != null) {
                locators.accept(at + ".sources", issue.sources());
            }
            if (issue.code().startsWith("TEACHING_PLAN_")) {
                teachingPlanStatus = true;
            }
            if (issue.fieldPath() == null) {
                if (FIELD_STATUS_CODES.contains(issue.code())) {
                    errors.add(new FieldViolation(at + ".fieldPath", "required"));
                }
                continue;
            }
            Lookup found = lookup(tree, issue.fieldPath());
            if (found == Lookup.MISMATCH) {
                errors.add(new FieldViolation(at + ".fieldPath", "path_mismatch"));
                continue;
            }
            if (!FIELD_STATUS_CODES.contains(issue.code())) {
                continue;
            }
            if (!statusPaths.add(issue.fieldPath())) {
                errors.add(new FieldViolation(at + ".fieldPath", "duplicate_field_status"));
            }
            boolean hasValue = found == Lookup.VALUE;
            if (!"FIELD_REVIEW_REQUIRED".equals(issue.code()) && hasValue) {
                errors.add(new FieldViolation(at + ".code", "status_value_conflict"));
            }
            if ("FIELD_NOT_PROVIDED".equals(issue.code()) && (issue.sources() == null || issue.sources().isEmpty())) {
                errors.add(new FieldViolation(at + ".sources", "evidence_required"));
            }
        }
        List<TeachingPlanRow> rows = subject.teachingPlan();
        if (rows == null) {
            return;
        }
        if (rows.isEmpty() && !teachingPlanStatus) {
            errors.add(new FieldViolation(path + ".teachingPlan", "teaching_plan_status_required"));
        }
        Set<String> keys = new HashSet<>();
        for (int r = 0; r < rows.size(); r++) {
            TeachingPlanRow row = rows.get(r);
            String at = path + ".teachingPlan[" + r + "]";
            if (!keys.add(row.rowKey())) {
                errors.add(new FieldViolation(at + ".rowKey", "duplicate"));
            }
            if (row.weekFrom() != null && row.weekTo() != null && row.weekFrom() > row.weekTo()) {
                errors.add(new FieldViolation(at + ".weekTo", "out_of_range"));
            }
            locators.accept(at + ".sources", row.sources());
            schedule(at + ".schedule", row.schedule(), errors);
        }
    }

    /** schedule 불변 규칙 (계정 B validate_03와 같은 4가지). 관리자 수정(§39-6)에도 같은 규칙을 쓴다. */
    static void schedule(String at, Schedule schedule, List<FieldViolation> errors) {
        if (schedule == null) {
            return;
        }
        if ((schedule.calendarYear() == null) != (schedule.calendarYearBasis() == null)) {
            errors.add(new FieldViolation(at + ".calendarYear", "explicit_basis_required"));
        }
        boolean datePrecision = DATE_PRECISIONS.contains(schedule.precision());
        if (datePrecision != (schedule.dateFrom() != null)) {
            errors.add(new FieldViolation(at + ".dateFrom", "precision_conflict"));
        }
        if (schedule.dateTo() != null && schedule.dateFrom() == null) {
            errors.add(new FieldViolation(at + ".dateTo", "not_allowed"));
        }
        if (schedule.weekFrom() != null && schedule.weekTo() != null && schedule.weekFrom() > schedule.weekTo()) {
            errors.add(new FieldViolation(at + ".weekTo", "out_of_range"));
        }
    }

    enum Lookup { VALUE, EMPTY, MISMATCH }

    /** 과목 JSON 안 경로. 부모가 없거나 색인 범위 밖이면 MISMATCH, 값이 null이면 EMPTY. */
    static Lookup lookup(JsonNode subject, String fieldPath) {
        if (!PATH.matcher(fieldPath).matches()) {
            return Lookup.MISMATCH;
        }
        JsonNode node = subject;
        Matcher matcher = SEGMENT.matcher(fieldPath);
        while (matcher.find()) {
            if (node == null || node.isNull() || node.isMissingNode()) {
                return Lookup.MISMATCH;
            }
            if (matcher.group(1) != null) {
                if (!node.isObject() || !node.has(matcher.group(1))) {
                    return Lookup.MISMATCH;
                }
                node = node.get(matcher.group(1));
            } else {
                int index = Integer.parseInt(matcher.group(2));
                if (!node.isArray() || index >= node.size()) {
                    return Lookup.MISMATCH;
                }
                node = node.get(index);
            }
        }
        if (node == null || node.isNull() || node.isMissingNode()) {
            return Lookup.EMPTY;
        }
        return Lookup.VALUE;
    }
}
