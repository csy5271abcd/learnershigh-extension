package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.DocumentLocator;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Locator;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.PerformanceItem;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.RubricCriterion;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Subject;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.WrittenExam;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * HWP·HWPX 검토 근거 범위 판정 (M-4 승인 요청안의 준비 코드, 2026-11-10). 2026-11-11 Phase B에서 검토 API(ReviewFieldRules)에 연결했다
 * — HWP·HWPX review는 계약·D-1·원문 검토 절차 승인 전까지 {@code review_not_supported}로 막혀 있다.
 *
 * <p>분석 결과 JSON은 근거(sources)를 값마다가 아니라 노드마다 붙인다: 영역(writtenEvaluation·performanceEvaluation),
 * 지필 시험(exams[i]), 평가 항목(items[i]), 채점 요소(rubric[j]). 그래서 fieldPath의 근거 범위는
 * <b>경로에서 가장 가까운 근거 노드의 sources</b>다. 상위 노드로 넘어가지 않는다(items[0]의 값에 영역 전체 표의 근거를 쓰지 못함).
 * 같은 평가 항목 안의 평가명·반영비율·만점은 같은 근거 범위를 공유한다 — 분석 JSON이 그 이상을 구분하지 않기 때문이다(계약에 한계로 기록).
 *
 * <p>Locator는 그 분석 Run 안에서만 의미가 있다. 다른 Run·Revision의 Locator가 좌표까지 같으면 값으로는 구분되지 않으며,
 * 그때는 "이 Run의 이 노드에 있는 근거"로 판정된다.
 */
public final class ReviewEvidenceScope {

    public enum Status { OK, SUBJECT_UNKNOWN, FIELD_UNKNOWN, FIELD_NOT_IN_ANALYSIS, NO_EVIDENCE_IN_SCOPE }

    /** ownerPath: 근거 노드 경로(과목 기준), locators: 그 노드의 HWP·HWPX Locator. */
    public record Result(Status status, String ownerPath, List<DocumentLocator> locators) {
        public boolean contains(DocumentLocator candidate) {
            return status == Status.OK && candidate != null && locators.stream().anyMatch(candidate::equals);
        }
    }

    // 색인은 정규형만(0 또는 선행 0 없는 수). "[01]"과 "[1]"이 같은 필드로 풀리면 문자열 기준 duplicate 검사를 우회해 한 필드에 확정값이 둘 생긴다.
    private static final Pattern SEGMENT = Pattern.compile("\\.([A-Za-z][A-Za-z0-9]{0,40})|\\[(0|[1-9]\\d{0,2})]");
    private static final Set<String> WRITTEN_AREA = Set.of("weightPercent");
    private static final Set<String> EXAM = Set.of("itemKey", "round", "weightPercent", "maxScore", "timing");
    private static final Set<String> PERFORMANCE_AREA = Set.of("weightPercent");
    private static final Set<String> ITEM = Set.of("itemKey", "label", "area", "timing", "weightPercent", "maxScore", "content");
    private static final Set<String> ITEM_LISTS = Set.of("submissions", "conditions");
    private static final Set<String> RUBRIC = Set.of("element");
    private static final Set<String> LEVEL = Set.of("description", "score");

    private ReviewEvidenceScope() {
    }

    public static Result resolve(List<Subject> subjects, Integer analysisSubjectIndex, String fieldPath) {
        if (subjects == null || analysisSubjectIndex == null || analysisSubjectIndex < 0 || analysisSubjectIndex >= subjects.size()) {
            return fail(Status.SUBJECT_UNKNOWN);
        }
        Subject subject = subjects.get(analysisSubjectIndex);
        if (fieldPath == null) {
            return fail(Status.FIELD_UNKNOWN);
        }
        int dot = fieldPath.indexOf('.');
        int bracket = fieldPath.indexOf('[');
        int end = dot < 0 ? bracket : bracket < 0 ? dot : Math.min(dot, bracket);
        String area = end < 0 ? fieldPath : fieldPath.substring(0, end);
        List<Object> segments = segments(end < 0 ? "" : fieldPath.substring(end));
        if (segments == null) {
            return fail(Status.FIELD_UNKNOWN);
        }
        return switch (area) {
            case "writtenEvaluation" -> written(subject, segments);
            case "performanceEvaluation" -> performance(subject, segments);
            // 분석 결과에 없는 영역(성취기준·수업 계획)은 근거 범위를 판정할 수 없다 → 확정 차단.
            case "achievement", "teachingPlan" -> fail(Status.FIELD_NOT_IN_ANALYSIS);
            default -> fail(Status.FIELD_UNKNOWN);
        };
    }

    private static Result written(Subject subject, List<Object> s) {
        var area = subject.writtenEvaluation();
        if (area == null) {
            return fail(Status.FIELD_UNKNOWN);
        }
        if (s.size() == 1 && WRITTEN_AREA.contains(s.get(0))) {
            return scope("writtenEvaluation", area.sources());
        }
        Integer i = index(s, 1);
        if (s.size() >= 3 && "exams".equals(s.get(0)) && i != null && area.exams() != null && i < area.exams().size()) {
            WrittenExam exam = area.exams().get(i);
            String owner = "writtenEvaluation.exams[" + i + "]";
            if (s.size() == 3 && EXAM.contains(s.get(2))) {
                return scope(owner, exam.sources());
            }
            if (s.size() == 4 && "questionTypes".equals(s.get(2)) && listIndex(s, 3, exam.questionTypes())) {
                return scope(owner, exam.sources());
            }
        }
        return fail(Status.FIELD_UNKNOWN);
    }

    private static Result performance(Subject subject, List<Object> s) {
        var area = subject.performanceEvaluation();
        if (area == null) {
            return fail(Status.FIELD_UNKNOWN);
        }
        if (s.size() == 1 && PERFORMANCE_AREA.contains(s.get(0))) {
            return scope("performanceEvaluation", area.sources());
        }
        Integer i = index(s, 1);
        if (s.size() < 3 || !"items".equals(s.get(0)) || i == null || area.items() == null || i >= area.items().size()) {
            return fail(Status.FIELD_UNKNOWN);
        }
        PerformanceItem item = area.items().get(i);
        String owner = "performanceEvaluation.items[" + i + "]";
        Object property = s.get(2);
        if (s.size() == 3 && ITEM.contains(property)) {
            return scope(owner, item.sources());
        }
        if (s.size() == 4 && ITEM_LISTS.contains(property)
                && listIndex(s, 3, "submissions".equals(property) ? item.submissions() : item.conditions())) {
            return scope(owner, item.sources());
        }
        Integer j = index(s, 3);
        if (s.size() >= 5 && "rubric".equals(property) && j != null && item.rubric() != null && j < item.rubric().size()) {
            RubricCriterion criterion = item.rubric().get(j);
            String rubricOwner = owner + ".rubric[" + j + "]";
            if (s.size() == 5 && RUBRIC.contains(s.get(4))) {
                return scope(rubricOwner, criterion.sources());
            }
            Integer k = index(s, 5);
            if (s.size() == 7 && "levels".equals(s.get(4)) && k != null && criterion.levels() != null
                    && k < criterion.levels().size() && LEVEL.contains(s.get(6))) {
                return scope(rubricOwner, criterion.sources());
            }
        }
        return fail(Status.FIELD_UNKNOWN);
    }

    private static Result scope(String ownerPath, List<Locator> sources) {
        List<DocumentLocator> locators = new ArrayList<>();
        if (sources != null) {
            sources.stream().map(Locator::documentLocator).filter(Objects::nonNull).forEach(locators::add);
        }
        return locators.isEmpty() ? new Result(Status.NO_EVIDENCE_IN_SCOPE, ownerPath, List.of())
                : new Result(Status.OK, ownerPath, List.copyOf(locators));
    }

    private static Result fail(Status status) {
        return new Result(status, null, List.of());
    }

    /** ".a[0].b" → ["a", 0, "b"]. 문법이 어긋나면 null. */
    private static List<Object> segments(String rest) {
        List<Object> out = new ArrayList<>();
        Matcher m = SEGMENT.matcher(rest);
        int at = 0;
        while (at < rest.length()) {
            if (!m.find(at) || m.start() != at) {
                return null;
            }
            out.add(m.group(1) != null ? m.group(1) : Integer.valueOf(m.group(2)));
            at = m.end();
        }
        return out;
    }

    private static Integer index(List<Object> s, int at) {
        return at < s.size() && s.get(at) instanceof Integer value ? value : null;
    }

    private static boolean listIndex(List<Object> s, int at, List<?> list) {
        Integer i = index(s, at);
        return i != null && list != null && i < list.size();
    }
}
