package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanComparisonResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanComparisonResponse.Cell;
import com.learnershigh.extension.assessment.dto.plan.PlanComparisonResponse.ItemCell;
import com.learnershigh.extension.assessment.dto.plan.PlanComparisonResponse.ItemRow;
import com.learnershigh.extension.assessment.dto.plan.PlanComparisonResponse.Row;
import com.learnershigh.extension.assessment.dto.plan.PlanComparisonResponse.Transition;
import com.learnershigh.extension.assessment.dto.plan.PlanComparisonResponse.YearColumn;
import com.learnershigh.extension.assessment.dto.plan.StudentConfirmedFieldView;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.entity.TeachingPlanReviewRow;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.repository.TeachingPlanReviewRepository;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * §38-5 학년도별 평가계획서 비교 (A7, 2026-11-15 DRAFT). 학년도마다 독립적으로 등록·분석·확정한 문서의 <b>확정값</b>만 비교한다.
 *
 * <ul>
 *   <li>Revision(같은 문서의 개정·재분석)과 학년도 비교(서로 다른 문서)를 섞지 않는다. 각 학년도는 그 슬롯 문서의 가장 최근 확정 Revision.</li>
 *   <li>과목: 학년도마다 관리자가 고른 학업 과목 ID. 이름이 비슷해도 자동으로 같은 과목으로 보지 않는다.</li>
 *   <li>수행평가 항목: 확정된 이름이 정확히 같을 때만 같은 항목. 1:1로 빠지고 생기면 POSSIBLE_RENAME(관리자 확인)로만 표시.</li>
 *   <li>채점기준은 확정 대상이 아니라 비교하지 않는다(NOT_COMPARABLE, 원문 확인). 값을 요약하거나 지어내지 않는다.</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class PlanComparisonQueryService {

    static final String SAME = "SAME";
    static final String CHANGED = "CHANGED";
    static final String ADDED = "ADDED";
    static final String REMOVED = "REMOVED";
    static final String POSSIBLE_RENAME = "POSSIBLE_RENAME";
    static final String NOT_COMPARABLE = "NOT_COMPARABLE";
    static final String NEEDS_REVIEW = "NEEDS_REVIEW";
    private static final Pattern ITEM = Pattern.compile("performanceEvaluation\\.items\\[(\\d+)]\\.(label|weightPercent|maxScore|timing)");
    private static final Pattern YEAR_VALUE = Pattern.compile("(\\d{4}):([A-Za-z0-9_.-]{1,64})");

    private final PlanAccess access;
    private final EvaluationPlanRepository plans;
    private final PlanRevisionRepository revisions;
    private final TeachingPlanReviewRepository teachingPlans;
    private final PlanViews views;
    private final AcademicContextProvider contexts;

    public PlanComparisonQueryService(PlanAccess access, EvaluationPlanRepository plans,
            PlanRevisionRepository revisions, TeachingPlanReviewRepository teachingPlans, PlanViews views,
            AcademicContextProvider contexts) {
        this.access = access;
        this.plans = plans;
        this.revisions = revisions;
        this.teachingPlans = teachingPlans;
        this.views = views;
        this.contexts = contexts;
    }

    /** 한 학년도 열의 비교 재료 (CONFIRMED가 아니면 fields가 비어 있다) */
    private record Column(YearColumn view, List<StudentConfirmedFieldView> fields, String sha256) {

        boolean comparable() {
            return "CONFIRMED".equals(view.status());
        }
    }

    public PlanComparisonResponse compare(AdminActor admin, String schoolId, int grade, int semester,
            List<Integer> years, List<String> subjectParams, List<String> planParams) {
        access.requireOperator(admin);
        List<Integer> sorted = years.stream().distinct().sorted().toList();
        if (sorted.size() < 2 || sorted.size() > 5) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation("years", "size"));
        }
        Map<Integer, String> subjects = yearValues("subjects", subjectParams);
        Map<Integer, String> chosenPlans = yearValues("plans", planParams);

        List<Column> columns = new ArrayList<>();
        String schoolName = null;
        for (int year : sorted) {
            Optional<AcademicContextRecord> slot = contexts.findSlot(schoolId, year, grade, semester);
            if (schoolName == null && slot.isPresent()) {
                schoolName = slot.get().schoolName();
            }
            columns.add(column(schoolId, year, grade, semester, slot, subjects.get(year), chosenPlans.get(year)));
        }

        List<Row> rows = new ArrayList<>();
        rows.add(scalarRow("writtenEvaluation.weightPercent", "지필평가 반영비율", columns, sorted, null));
        rows.add(scalarRow("performanceEvaluation.weightPercent", "수행평가 반영비율", columns, sorted, null));
        rows.add(countRow(columns, sorted));
        rows.add(rubricRow(columns, sorted));
        rows.add(teachingPlanRow(columns, sorted));
        List<ItemRow> items = itemRows(columns, sorted);

        List<String> warnings = new ArrayList<>();
        Map<String, List<Integer>> bySha = new LinkedHashMap<>();
        for (Column column : columns) {
            if (column.sha256() != null) {
                bySha.computeIfAbsent(column.sha256(), key -> new ArrayList<>()).add(column.view().academicYear());
            }
        }
        bySha.values().stream().filter(list -> list.size() > 1).forEach(list -> warnings.add(
                "같은 원문 파일(SHA-256 동일)이 " + list + "학년도에 함께 등록되어 있어요. 학년도가 맞는지 원문을 확인해 주세요."));
        return new PlanComparisonResponse(schoolId, schoolName, grade, semester,
                PlanComparisonResponse.BASIS_CONFIRMED_ONLY, columns.stream().map(Column::view).toList(), rows, items,
                warnings);
    }

    private static Map<Integer, String> yearValues(String field, List<String> params) {
        Map<Integer, String> result = new HashMap<>();
        for (String param : params == null ? List.<String>of() : params) {
            Matcher matcher = YEAR_VALUE.matcher(param);
            if (!matcher.matches()) {
                throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation(field, "format"));
            }
            result.put(Integer.parseInt(matcher.group(1)), matcher.group(2));
        }
        return result;
    }

    private Column column(String schoolId, int year, int grade, int semester, Optional<AcademicContextRecord> slot,
            String subjectId, String chosenPlanId) {
        List<EvaluationPlan> found = plans.search(schoolId, year, grade, semester);
        List<PlanRevision> all = found.isEmpty() ? List.of()
                : revisions.findByPlanIds(found.stream().map(EvaluationPlan::id).toList());
        Map<String, List<PlanRevision>> byPlan = all.stream().collect(Collectors.groupingBy(PlanRevision::planId));
        List<PlanComparisonResponse.PlanOption> options = new ArrayList<>();
        Map<String, PlanRevision> confirmedByPlan = new LinkedHashMap<>();
        for (EvaluationPlan plan : found) {
            List<PlanRevision> list = byPlan.getOrDefault(plan.id(), List.of());
            Optional<PlanRevision> latest = list.stream().max(Comparator.comparingInt(PlanRevision::revisionNumber));
            Optional<PlanRevision> confirmed = list.stream().filter(PlanRevision::isConfirmed)
                    .max(Comparator.comparingInt(PlanRevision::revisionNumber));
            confirmed.ifPresent(revision -> confirmedByPlan.put(plan.id(), revision));
            options.add(new PlanComparisonResponse.PlanOption(plan.id(), latest.map(PlanRevision::id).orElse(null),
                    confirmed.map(PlanRevision::id).orElse(null), latest.map(PlanRevision::fileName).orElse(null),
                    latest.map(r -> r.reviewStatus().name()).orElse(null)));
        }
        List<AcademicContextRecord.Subject> slotSubjects = slot.map(AcademicContextRecord::subjects).orElse(List.of());

        String status;
        PlanRevision revision = null;
        String planId = null;
        if (found.isEmpty()) {
            status = "NO_PLAN";
        } else if (chosenPlanId != null && confirmedByPlan.containsKey(chosenPlanId)) {
            planId = chosenPlanId;
            revision = confirmedByPlan.get(chosenPlanId);
            status = null;
        } else if (confirmedByPlan.isEmpty()) {
            status = "NOT_CONFIRMED";
        } else if (confirmedByPlan.size() > 1) {
            status = "AMBIGUOUS_PLAN";
        } else {
            planId = confirmedByPlan.keySet().iterator().next();
            revision = confirmedByPlan.get(planId);
            status = null;
        }
        List<StudentConfirmedFieldView> allFields = revision == null ? List.of() : views.studentConfirmedFields(revision.id());
        List<PlanComparisonResponse.SubjectOption> subjectOptions = slotSubjects.stream()
                .map(subject -> new PlanComparisonResponse.SubjectOption(subject.subjectId(), subject.name(),
                        allFields.stream().anyMatch(field -> field.subjectId().equals(subject.subjectId()))))
                .toList();
        List<StudentConfirmedFieldView> fields = List.of();
        Integer teachingRows = null;
        String subjectName = subjectId == null ? null : slot.flatMap(s -> s.subjectName(subjectId)).orElse(null);
        if (status == null) {
            if (subjectId == null) {
                status = "NO_SUBJECT_SELECTED";
            } else if (slot.isEmpty() || !slot.get().hasSubject(subjectId)) {
                status = "SUBJECT_UNKNOWN";
            } else {
                fields = allFields.stream().filter(field -> field.subjectId().equals(subjectId)).toList();
                status = fields.isEmpty() ? "SUBJECT_NOT_CONFIRMED" : "CONFIRMED";
                String revisionId = revision.id();
                teachingRows = teachingPlans.findByRevisionId(revisionId)
                        .map(review -> (int) review.rows().stream()
                                .filter(TeachingPlanReviewRow::published)
                                .filter(row -> row.subjectId().equals(subjectId))
                                .count())
                        .orElse(null);
            }
        }
        YearColumn view = new YearColumn(year, status, planId, revision == null ? null : revision.id(),
                revision == null ? null : revision.fileName(), revision == null ? null : revision.format().name(),
                revision != null && PlanViews.previewAvailable(revision), subjectId, subjectName,
                "CONFIRMED".equals(status) ? teachingRows : null, options, subjectOptions, slot.isPresent());
        return new Column(view, fields, revision == null ? null : revision.sha256());
    }

    // ---- 값 행 ----

    private static Cell cellOf(Column column, String fieldPath) {
        if (!column.comparable()) {
            return new Cell("NOT_AVAILABLE", null, null);
        }
        return column.fields().stream().filter(field -> field.fieldPath().equals(fieldPath)).findFirst()
                .map(field -> field.value() == null ? new Cell("ABSENT", null, field.pdfPageNumber())
                        : new Cell("VALUE", field.value(), field.pdfPageNumber()))
                .orElse(new Cell("NOT_CONFIRMED", null, null));
    }

    private static Row scalarRow(String key, String label, List<Column> columns, List<Integer> years, String note) {
        List<Cell> cells = columns.stream().map(column -> cellOf(column, key)).toList();
        List<Transition> transitions = transitions(years, cells);
        return new Row(key, label, cells, overall(transitions), transitions, note);
    }

    static List<Transition> transitions(List<Integer> years, List<Cell> cells) {
        List<Transition> list = new ArrayList<>();
        for (int i = 1; i < cells.size(); i++) {
            list.add(new Transition(years.get(i - 1), years.get(i), compareCells(cells.get(i - 1), cells.get(i))));
        }
        return list;
    }

    static String compareCells(Cell before, Cell after) {
        boolean known = isKnown(before) && isKnown(after);
        if (!known) {
            return NOT_COMPARABLE;
        }
        if ("ABSENT".equals(before.state()) && "ABSENT".equals(after.state())) {
            return SAME;
        }
        if ("ABSENT".equals(before.state())) {
            return ADDED;
        }
        if ("ABSENT".equals(after.state())) {
            return REMOVED;
        }
        return sameValue(before.value(), after.value()) ? SAME : CHANGED;
    }

    private static boolean isKnown(Cell cell) {
        return "VALUE".equals(cell.state()) || "ABSENT".equals(cell.state());
    }

    /** 숫자는 수치로, 글자는 앞뒤 공백·연속 공백만 정리해 비교한다(의미 유사도는 쓰지 않는다). */
    static boolean sameValue(Object a, Object b) {
        if (a instanceof Number x && b instanceof Number y) {
            return new java.math.BigDecimal(x.toString()).compareTo(new java.math.BigDecimal(y.toString())) == 0;
        }
        return Objects.equals(normalize(a), normalize(b));
    }

    static String normalize(Object value) {
        return value == null ? null : value.toString().strip().replaceAll("\\s+", " ");
    }

    /** 전체 상태: 변화가 하나라도 있으면 그 상태, 비교 가능한 구간이 없으면 NOT_COMPARABLE */
    static String overall(List<Transition> transitions) {
        List<String> statuses = transitions.stream().map(Transition::status).toList();
        for (String status : List.of(NEEDS_REVIEW, POSSIBLE_RENAME, CHANGED, ADDED, REMOVED)) {
            if (statuses.contains(status)) {
                return status;
            }
        }
        return statuses.contains(SAME) ? SAME : NOT_COMPARABLE;
    }

    private static Map<Integer, Map<String, StudentConfirmedFieldView>> itemsOf(Column column) {
        Map<Integer, Map<String, StudentConfirmedFieldView>> items = new TreeMap<>();
        for (StudentConfirmedFieldView field : column.fields()) {
            Matcher matcher = ITEM.matcher(field.fieldPath());
            if (matcher.matches()) {
                items.computeIfAbsent(Integer.parseInt(matcher.group(1)), index -> new HashMap<>())
                        .put(matcher.group(2), field);
            }
        }
        return items;
    }

    private static Row countRow(List<Column> columns, List<Integer> years) {
        List<Cell> cells = columns.stream()
                .map(column -> column.comparable() ? new Cell("VALUE", itemsOf(column).size(), null)
                        : new Cell("NOT_AVAILABLE", null, null))
                .toList();
        List<Transition> transitions = transitions(years, cells);
        return new Row("performanceEvaluation.itemCount", "확정된 수행평가 항목 수", cells, overall(transitions),
                transitions, "관리자가 확정한 항목만 셉니다. 원문 전체 항목 수와 다를 수 있어요.");
    }

    private static Row rubricRow(List<Column> columns, List<Integer> years) {
        List<Cell> cells = columns.stream().map(column -> new Cell("NOT_AVAILABLE", null, null)).toList();
        List<Transition> transitions = new ArrayList<>();
        for (int i = 1; i < years.size(); i++) {
            transitions.add(new Transition(years.get(i - 1), years.get(i), NOT_COMPARABLE));
        }
        return new Row("performanceEvaluation.rubric", "채점기준", cells, NOT_COMPARABLE, transitions,
                "채점기준은 관리자 확정 대상이 아니라 자동 비교하지 않아요. 학년도별 원문에서 직접 확인해 주세요.");
    }

    private static Row teachingPlanRow(List<Column> columns, List<Integer> years) {
        List<Cell> cells = columns.stream()
                .map(column -> !column.comparable() ? new Cell("NOT_AVAILABLE", null, null)
                        : column.view().teachingPlanRows() == null ? new Cell("NOT_CONFIRMED", null, null)
                                : new Cell("VALUE", column.view().teachingPlanRows(), null))
                .toList();
        List<Transition> transitions = transitions(years, cells).stream()
                .map(t -> CHANGED.equals(t.status()) ? new Transition(t.fromYear(), t.toYear(), NEEDS_REVIEW) : t)
                .toList();
        return new Row("teachingPlan.rowCount", "확정된 운영계획 행 수", cells, overall(transitions), transitions,
                "행 수만 비교해요. 내용 변화는 학년도별 월별 운영계획에서 확인해 주세요.");
    }

    // ---- 수행평가 항목 ----

    private static List<ItemRow> itemRows(List<Column> columns, List<Integer> years) {
        Map<String, String> labels = new LinkedHashMap<>(); // 정규화 이름 → 화면 이름
        List<Map<Integer, Map<String, StudentConfirmedFieldView>>> perYear = columns.stream()
                .map(PlanComparisonQueryService::itemsOf).toList();
        for (int y = columns.size() - 1; y >= 0; y--) {
            for (Map<String, StudentConfirmedFieldView> item : perYear.get(y).values()) {
                StudentConfirmedFieldView label = item.get("label");
                if (label != null && label.value() != null) {
                    labels.putIfAbsent(normalize(label.value()), normalize(label.value()));
                }
            }
        }
        List<ItemRow> rows = new ArrayList<>();
        for (String key : labels.keySet()) {
            List<ItemCell> cells = new ArrayList<>();
            for (int y = 0; y < columns.size(); y++) {
                if (!columns.get(y).comparable()) {
                    cells.add(new ItemCell("NOT_AVAILABLE", null, null, null, null, null));
                    continue;
                }
                Optional<Map.Entry<Integer, Map<String, StudentConfirmedFieldView>>> match = perYear.get(y).entrySet()
                        .stream()
                        .filter(entry -> entry.getValue().get("label") != null
                                && key.equals(normalize(entry.getValue().get("label").value())))
                        .findFirst();
                cells.add(match.map(entry -> itemCell(entry.getKey(), entry.getValue()))
                        .orElse(new ItemCell("MISSING", null, null, null, null, null)));
            }
            List<Transition> transitions = new ArrayList<>();
            for (int i = 1; i < cells.size(); i++) {
                transitions.add(new Transition(years.get(i - 1), years.get(i), compareItems(cells.get(i - 1), cells.get(i))));
            }
            rows.add(new ItemRow(key, cells, overall(transitions), transitions, null));
        }
        // 이름이 확정되지 않은 항목: 같은 항목인지 알 수 없다 → 관리자 확인
        for (int y = 0; y < columns.size(); y++) {
            for (Map.Entry<Integer, Map<String, StudentConfirmedFieldView>> entry : perYear.get(y).entrySet()) {
                StudentConfirmedFieldView label = entry.getValue().get("label");
                if (label != null && label.value() != null) {
                    continue;
                }
                List<ItemCell> cells = new ArrayList<>();
                for (int other = 0; other < columns.size(); other++) {
                    cells.add(other == y ? itemCell(entry.getKey(), entry.getValue())
                            : new ItemCell("NOT_AVAILABLE", null, null, null, null, null));
                }
                List<Transition> transitions = new ArrayList<>();
                for (int i = 1; i < years.size(); i++) {
                    transitions.add(new Transition(years.get(i - 1), years.get(i), NEEDS_REVIEW));
                }
                rows.add(new ItemRow(null, cells, NEEDS_REVIEW, transitions,
                        years.get(y) + "학년도 항목 " + (entry.getKey() + 1) + "의 이름이 확정되지 않아 다른 학년도와 맞출 수 없어요."));
            }
        }
        markPossibleRenames(rows, years);
        return rows;
    }

    private static ItemCell itemCell(int index, Map<String, StudentConfirmedFieldView> fields) {
        Integer page = fields.values().stream().map(StudentConfirmedFieldView::pdfPageNumber).filter(Objects::nonNull)
                .min(Integer::compare).orElse(null);
        return new ItemCell("PRESENT", index, fieldCell(fields.get("weightPercent")), fieldCell(fields.get("maxScore")),
                fieldCell(fields.get("timing")), page);
    }

    private static Cell fieldCell(StudentConfirmedFieldView field) {
        if (field == null) {
            return new Cell("NOT_CONFIRMED", null, null);
        }
        return field.value() == null ? new Cell("ABSENT", null, field.pdfPageNumber())
                : new Cell("VALUE", field.value(), field.pdfPageNumber());
    }

    static String compareItems(ItemCell before, ItemCell after) {
        if ("NOT_AVAILABLE".equals(before.state()) || "NOT_AVAILABLE".equals(after.state())) {
            return NOT_COMPARABLE;
        }
        if ("MISSING".equals(before.state()) && "MISSING".equals(after.state())) {
            return NOT_COMPARABLE;
        }
        if ("MISSING".equals(before.state())) {
            return ADDED;
        }
        if ("MISSING".equals(after.state())) {
            return REMOVED;
        }
        List<String> statuses = List.of(compareCells(before.weightPercent(), after.weightPercent()),
                compareCells(before.maxScore(), after.maxScore()), compareCells(before.timing(), after.timing()));
        if (statuses.stream().anyMatch(status -> !SAME.equals(status) && !NOT_COMPARABLE.equals(status))) {
            return CHANGED;
        }
        return statuses.contains(SAME) ? SAME : NEEDS_REVIEW;
    }

    /** 한 구간에서 정확히 하나가 빠지고(REMOVED) 하나가 생겼으면(ADDED) 이름이 바뀐 같은 평가일 수 있다 — 확정하지 않고 표시만 한다 */
    private static void markPossibleRenames(List<ItemRow> rows, List<Integer> years) {
        for (int t = 0; t < years.size() - 1; t++) {
            final int index = t;
            List<ItemRow> removed = rows.stream().filter(r -> REMOVED.equals(r.transitions().get(index).status())).toList();
            List<ItemRow> added = rows.stream().filter(r -> ADDED.equals(r.transitions().get(index).status())).toList();
            if (removed.size() != 1 || added.size() != 1) {
                continue;
            }
            for (ItemRow row : List.of(removed.getFirst(), added.getFirst())) {
                int position = rows.indexOf(row);
                List<Transition> changed = new ArrayList<>(row.transitions());
                Transition old = changed.get(index);
                changed.set(index, new Transition(old.fromYear(), old.toYear(), POSSIBLE_RENAME));
                ItemRow other = row == removed.getFirst() ? added.getFirst() : removed.getFirst();
                rows.set(position, new ItemRow(row.label(), row.cells(), overall(changed), changed,
                        old.fromYear() + "→" + old.toYear() + ": ‘" + other.label() + "’과(와) 이름만 바뀐 같은 평가일 수 있어요. 원문으로 확인해 주세요."));
            }
        }
    }
}
