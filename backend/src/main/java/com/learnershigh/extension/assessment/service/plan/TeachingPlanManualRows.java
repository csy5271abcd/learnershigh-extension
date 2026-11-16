package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewDraftResponse;
import com.learnershigh.extension.assessment.dto.plan.TeachingPlanManualRowRequest;
import com.learnershigh.extension.assessment.entity.TeachingPlanReviewRow;
import com.learnershigh.extension.common.error.FieldViolation;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * A14 §39-11 운영계획 관리자 직접 추가 행 규칙. 분석 후보 행과 섞지 않는다.
 *
 * <ul>
 *   <li>행 키는 서버가 발급한다({@code manual_} + 무작위 16자리). 같은 과목의 분석 후보 rowKey·기존 추가 행 키와 겹치면 다시 뽑는다.</li>
 *   <li>단원·학습 내용·특별 일정 중 하나는 있어야 한다. 시기는 schedule(§39-3 정밀도 8종)과 기존 0.3 일정 규칙으로 검사한다.
 *       정밀도별로 그 정밀도를 말할 수 있는 최소 값만 요구한다(예: 월 단위 = 시작 월). 서버는 월·주차를 추정하지 않는다.</li>
 *   <li>연도(calendarYear)는 받지 않는다(원문 칸에 적힌 연도라는 근거를 관리자 입력으로 만들 수 없음).</li>
 *   <li>관리자가 확인한 원문 쪽은 PDF 쪽 수 안에서만, 분석 근거(sources)가 아닌 별도 값으로 둔다. HWP·HWPX(쪽 수 없음)는 받지 않는다.</li>
 * </ul>
 */
final class TeachingPlanManualRows {

    static final String KEY_PREFIX = "manual_";
    static final int MAX_ROWS = 200;
    static final String INCLUDED = "INCLUDED";
    static final String EXCLUDED = "EXCLUDED";

    private TeachingPlanManualRows() {
    }

    static void validate(String at, TeachingPlanManualRowRequest.Row row, int subjectCount, Integer pageCount,
            List<FieldViolation> violations) {
        if (row.subjectIndex() >= subjectCount) {
            violations.add(new FieldViolation(at + ".subjectIndex", "out_of_range"));
        }
        if (blank(row.unit()) && blank(row.content()) && blank(row.specialSchedule())) {
            violations.add(new FieldViolation(at + ".content", "required"));
        }
        AnalysisImportRequest.Schedule schedule = row.schedule();
        Contract03Rules.schedule(at + ".schedule", schedule, violations);
        if (schedule.calendarYear() != null || schedule.calendarYearBasis() != null) {
            violations.add(new FieldViolation(at + ".schedule.calendarYear", "not_allowed"));
        }
        String precision = schedule.precision();
        if (Set.of("MONTH", "MONTH_RANGE", "WEEK_IN_MONTH").contains(precision) && schedule.monthFrom() == null) {
            violations.add(new FieldViolation(at + ".schedule.monthFrom", "required"));
        }
        if ("MONTH_RANGE".equals(precision) && schedule.monthTo() == null) {
            violations.add(new FieldViolation(at + ".schedule.monthTo", "required"));
        }
        if (Set.of("WEEK_IN_MONTH", "TERM_WEEK").contains(precision) && schedule.weekFrom() == null) {
            violations.add(new FieldViolation(at + ".schedule.weekFrom", "required"));
        }
        if ("DATE_RANGE".equals(precision) && schedule.dateTo() == null) {
            violations.add(new FieldViolation(at + ".schedule.dateTo", "required"));
        }
        if (row.pdfPageNumber() != null) {
            if (pageCount == null) {
                violations.add(new FieldViolation(at + ".pdfPageNumber", "not_allowed"));
            } else if (row.pdfPageNumber() > pageCount) {
                violations.add(new FieldViolation(at + ".pdfPageNumber", "out_of_range"));
            }
        }
    }

    /** 같은 과목의 분석 후보 rowKey·이미 있는 추가 행 키와 겹치지 않는 새 키 */
    static String newKey(JsonNode subjects, int subjectIndex, List<PlanReviewDraftResponse.ManualRow> existing) {
        Set<String> taken = new HashSet<>();
        existing.forEach(row -> taken.add(row.rowKey()));
        if (subjects != null && subjects.isArray() && subjectIndex < subjects.size()) {
            JsonNode rows = subjects.get(subjectIndex).get("teachingPlan");
            if (rows != null && rows.isArray()) {
                rows.forEach(row -> taken.add(row.path("rowKey").asString("")));
            }
        }
        while (true) {
            String key = KEY_PREFIX + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            if (!taken.contains(key)) {
                return key;
            }
        }
    }

    static PlanReviewDraftResponse.ManualRow of(String rowKey, TeachingPlanManualRowRequest.Row row, String createdBy,
            OffsetDateTime createdAt, String updatedBy, OffsetDateTime updatedAt) {
        return new PlanReviewDraftResponse.ManualRow(rowKey, TeachingPlanReviewRow.ORIGIN_MANUAL, row.subjectIndex(),
                row.status(), strip(row.unit()), strip(row.content()), strip(row.note()), strip(row.specialSchedule()),
                row.achievementStandards() == null ? List.of() : List.copyOf(row.achievementStandards()),
                row.teachingMethods() == null ? List.of() : row.teachingMethods().stream().map(String::strip).toList(),
                row.assessmentMethods() == null ? List.of() : row.assessmentMethods().stream().map(String::strip).toList(),
                row.schedule(), row.pdfPageNumber(), createdBy, createdAt, updatedBy, updatedAt);
    }

    /**
     * 확정 행 JSON(§39-3 행 모양 + origin·manualPdfPageNumber). 월·주차 칸은 관리자가 고른 schedule 값 그대로 옮긴다.
     * sources는 비운다 — 분석 근거가 없는 행이다.
     */
    static ObjectNode rowJson(JsonMapper mapper, PlanReviewDraftResponse.ManualRow row) {
        AnalysisImportRequest.Schedule schedule = row.schedule();
        ObjectNode node = mapper.createObjectNode();
        node.put("rowKey", row.rowKey());
        node.put("origin", TeachingPlanReviewRow.ORIGIN_MANUAL);
        node.put("month", schedule.monthFrom());
        node.put("monthTo", schedule.monthTo());
        node.put("weekLabel", schedule.weekLabel());
        node.put("weekFrom", schedule.weekFrom());
        node.put("weekTo", schedule.weekTo());
        node.put("unit", row.unit());
        node.put("content", row.content());
        node.put("note", row.note());
        node.set("achievementStandards", mapper.valueToTree(row.achievementStandards()));
        node.putNull("inquiryProcess");
        node.set("teachingMethods", mapper.valueToTree(row.teachingMethods()));
        node.set("assessmentMethods", mapper.valueToTree(row.assessmentMethods()));
        node.putNull("linkageFocus");
        node.put("specialSchedule", row.specialSchedule());
        node.set("schedule", mapper.valueToTree(schedule));
        node.putArray("sources");
        node.put("manualPdfPageNumber", row.pdfPageNumber());
        return node;
    }

    /** 확정 행 JSON → 초안의 추가 행 (A13 재검토 시작 때 확정본으로 초안을 채움) */
    static PlanReviewDraftResponse.ManualRow fromConfirmed(JsonMapper mapper, TeachingPlanReviewRow stored,
            String by, OffsetDateTime at) {
        JsonNode node = mapper.readTree(stored.rowJson());
        AnalysisImportRequest.Standard[] standards = node.hasNonNull("achievementStandards")
                ? mapper.treeToValue(node.get("achievementStandards"), AnalysisImportRequest.Standard[].class)
                : new AnalysisImportRequest.Standard[0];
        String[] teaching = node.hasNonNull("teachingMethods") ? mapper.treeToValue(node.get("teachingMethods"), String[].class) : new String[0];
        String[] assessment = node.hasNonNull("assessmentMethods") ? mapper.treeToValue(node.get("assessmentMethods"), String[].class) : new String[0];
        return new PlanReviewDraftResponse.ManualRow(stored.rowKey(), TeachingPlanReviewRow.ORIGIN_MANUAL,
                stored.analysisSubjectIndex(), stored.published() ? INCLUDED : EXCLUDED, text(node, "unit"),
                text(node, "content"), text(node, "note"), text(node, "specialSchedule"), List.of(standards),
                List.of(teaching), List.of(assessment),
                mapper.treeToValue(node.get("schedule"), AnalysisImportRequest.Schedule.class),
                node.path("manualPdfPageNumber").isNumber() ? node.get("manualPdfPageNumber").intValue() : null,
                by, at, by, at);
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asString();
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String strip(String value) {
        return blank(value) ? null : value.strip();
    }
}
