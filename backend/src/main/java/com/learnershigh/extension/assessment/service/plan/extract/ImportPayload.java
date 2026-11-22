package com.learnershigh.extension.assessment.service.plan.extract;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 추출 결과 → 평가계획 수신 계약(analysis-import, AnalysisImportRequest) 모양의 Map.
 * 숫자마다 원문 근거(sources)를 단다: PDF 는 쪽 번호, HWP·HWPX 는 표 칸 위치(documentLocator).
 */
public final class ImportPayload {

    private ImportPayload() {
    }

    private static final Pattern CELL = Pattern.compile("^r(\\d+)c(\\d+)$");

    public static Map<String, Object> build(List<PlanExtractor.Subject> subjects, PlanDocumentFormat format, String sha256,
            Integer pageCount, boolean contract03, String version) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (contract03) {
            out.put("contractVersion", "0.3");
        }
        out.put("analyzer", map("name", "learnershigh-plan-extract", "version", version, "profile", contract03 ? "rules-0.3" : null));
        Map<String, Object> source = map("sha256", sha256, "pageCount", format == PlanDocumentFormat.PDF ? pageCount : null,
                "format", format == PlanDocumentFormat.PDF ? null : format.name());
        out.put("source", source);
        List<Map<String, Object>> subs = new ArrayList<>();
        Map<String, List<List<Integer>>> byName = new LinkedHashMap<>();
        for (PlanExtractor.Subject s : subjects) {
            if (s.examPercent == null && s.performancePercent == null && s.items.isEmpty()) {
                continue;
            }
            List<List<Integer>> same = byName.computeIfAbsent(s.name.strip(), k -> new ArrayList<>());
            List<Integer> gs = contract03 ? s.grades : List.of();   // 0.2 는 grades 를 보내지 않는다
            boolean clash = same.stream().anyMatch(g -> g.isEmpty() || gs.isEmpty() || !java.util.Collections.disjoint(g, gs));
            if (clash || subs.size() >= 40) {
                continue;   // 계약: 같은 이름은 양쪽 학년이 있고 겹치지 않을 때만(§39-12), 과목 40개 이하
            }
            same.add(gs);
            subs.add(subject(s, format, contract03, subs.size() + 1));
        }
        out.put("status", subs.isEmpty() ? "FAILED" : "REVIEW_REQUIRED");
        if (subs.isEmpty()) {
            out.put("failureReason", contract03 ? "NO_ASSESSMENTS_EXTRACTED" : "평가 비율 표를 찾지 못했습니다");
        }
        out.put("subjects", subs);
        out.put("warnings", List.of());
        return out;
    }

    private static Map<String, Object> subject(PlanExtractor.Subject s, PlanDocumentFormat f, boolean c03, int index) {
        SourceTable t = s.source;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("subjectName", trim(s.name, 100));
        List<Integer> pages = new ArrayList<>();
        if (t.page() != null) {
            pages.add(t.page());
        }
        m.put("sources", List.of(loc(t, s.name, f)));
        if (c03 && !s.grades.isEmpty()) {
            m.put("grades", s.grades);   // 원문 머리 표의 학년 — 다른 학년 문서에서는 확정되지 않는다(§39-12)
        }
        if (s.examPercent != null) {
            List<Map<String, Object>> exams = new ArrayList<>();
            for (ExamRules.Exam e : s.exams) {
                exams.add(map("itemKey", String.format("W%02d", e.round()), "round", e.round(), "weightPercent", e.weightPercent(),
                        "maxScore", e.maxScore(), "timing", trim(e.timing(), 100), "questionTypes", List.of(),
                        "sources", List.of(loc(t, e.label(), f))));
            }
            m.put("writtenEvaluation", map("weightPercent", s.examPercent, "sources", List.of(loc(t, fmt(s.examPercent) + "%", f)),
                    "exams", exams));
        }
        List<Map<String, Object>> items = new ArrayList<>();
        int k = 0;
        for (PlanExtractor.Item it : s.items) {
            if (k >= 50) {
                break;
            }
            k++;
            RubricRules.Detail d = it.detail();
            SourceTable rt = d != null && d.rubricSource != null ? d.rubricSource : t;
            if (rt.page() != null) {
                pages.add(rt.page());
            }
            Map<String, Object> im = new LinkedHashMap<>();
            im.put("itemKey", String.format("P%02d", k));
            im.put("label", trim(it.name() == null || it.name().isBlank() ? "수행 " + k : it.name(), 200));
            putIf(im, "timing", trim(it.timing(), 100));
            putIf(im, "weightPercent", it.weightPercent());
            putIf(im, "maxScore", it.maxScore() != null && it.maxScore() > 0 ? it.maxScore() : null);
            putIf(im, "content", d != null ? trim(d.description, 4000) : null);
            List<Map<String, Object>> rubric = new ArrayList<>();
            if (d != null) {
                for (RubricRules.Element e : d.rubric.subList(0, Math.min(30, d.rubric.size()))) {
                    List<Map<String, Object>> levels = new ArrayList<>();
                    for (RubricRules.Level lv : e.levels().subList(0, Math.min(10, e.levels().size()))) {
                        String desc = lv.description() != null && !lv.description().isBlank() ? lv.description()
                                : lv.level() != null ? lv.level() : lv.score() != null ? fmt(lv.score()) + "점" : "-";
                        levels.add(map("description", trim(desc, 1000), "score", lv.score()));
                    }
                    Map<String, Object> cm = map("element", trim(e.element().isBlank() ? "채점 기준" : e.element(), 300), "levels", levels,
                            "sources", List.of(loc(rt, e.element(), f)));
                    if (c03 && e.maxScore() != null && e.maxScore() <= 1000) {
                        cm.put("maxScore", e.maxScore());
                    }
                    rubric.add(cm);
                }
            }
            im.put("rubric", rubric);
            im.put("sources", List.of(loc(t, it.name(), f)));
            items.add(im);
        }
        m.put("performanceEvaluation", map("weightPercent", s.performancePercent,
                "sources", s.performancePercent != null ? List.of(loc(t, fmt(s.performancePercent) + "%", f)) : List.of(), "items", items));
        if (c03 && !s.plan.isEmpty()) {
            m.put("teachingPlan", plan(s, f, index));
        }
        if (f == PlanDocumentFormat.PDF && !pages.isEmpty()) {
            m.put("pageRange", map("from", pages.stream().min(Integer::compare).get(), "to", pages.stream().max(Integer::compare).get()));
        }
        return m;
    }

    /** 진도표 행 → 계약 teachingPlan[] (시기 정밀도는 원문이 준 만큼만: 월+월 안 주 · 월 · 월 범위 · 주만 · 모름). */
    private static List<Map<String, Object>> plan(PlanExtractor.Subject s, PlanDocumentFormat f, int index) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int k = 0; k < s.plan.size(); k++) {
            TeachingPlanRules.Row r = s.plan.get(k);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rowKey", String.format("S%02d.T%03d", index, k + 1));
            putIf(m, "month", r.month());
            putIf(m, "monthTo", r.monthTo());
            putIf(m, "weekLabel", r.weekLabel());
            putIf(m, "weekFrom", r.weekFrom());
            putIf(m, "weekTo", r.weekTo());
            putIf(m, "unit", r.unit());
            putIf(m, "content", r.content());
            putIf(m, "note", r.note());
            List<Map<String, Object>> std = new ArrayList<>();
            for (TeachingPlanRules.Standard st : r.standards()) {
                std.add(map("code", st.code(), "text", st.text()));
            }
            m.put("achievementStandards", std);
            m.put("teachingMethods", r.teachingMethods());
            m.put("assessmentMethods", r.assessmentMethods());
            putIf(m, "specialSchedule", r.specialSchedule());
            String precision = r.month() != null && r.weekFrom() != null && r.weekTo() <= 5 ? "WEEK_IN_MONTH"
                    : r.month() != null && r.monthTo() != null && !r.month().equals(r.monthTo()) ? "MONTH_RANGE"
                    : r.month() != null ? "MONTH" : r.weekFrom() != null ? "WEEK_UNRESOLVED" : "UNKNOWN";
            Map<String, Object> sc = map("precision", precision, "monthFrom", r.month(), "monthTo", r.monthTo(),
                    "monthBasis", r.month() != null ? "MONTH" : null, "weekLabel", r.weekLabel(), "weekFrom", r.weekFrom(), "weekTo", r.weekTo());
            if ("WEEK_IN_MONTH".equals(precision)) {
                sc.put("weekScope", "IN_MONTH");
                sc.put("weekScopeBasis", "TABLE_PATTERN");
            }
            m.put("schedule", sc);
            m.put("sources", List.of(loc(s.planSource.get(k), r.evidence(), f)));
            rows.add(m);
        }
        return rows;
    }

    /** 근거: PDF 는 표가 있는 쪽, HWP·HWPX 는 글자가 들어 있는 칸(없으면 표 첫 칸)의 위치. */
    static Map<String, Object> loc(SourceTable t, String text, PlanDocumentFormat f) {
        if (f == PlanDocumentFormat.PDF) {
            return map("pdfPageNumber", t.page(), "printedPageLabel", null, "extractedText", trim(text, 2000));
        }
        String path = null;
        if (t.cellPaths() != null) {
            String needle = text == null ? "" : text.replaceAll("\\s+", "");
            outer:
            for (int r = 0; r < t.cells().size(); r++) {
                for (int c = 0; c < t.cells().get(r).size(); c++) {
                    String p = t.cellPaths().get(r).get(c);
                    if (p != null && (path == null || (!needle.isEmpty() && t.cells().get(r).get(c).replaceAll("\\s+", "").contains(needle)))) {
                        path = p;
                        if (!needle.isEmpty() && t.cells().get(r).get(c).replaceAll("\\s+", "").contains(needle)) {
                            break outer;
                        }
                    }
                }
            }
        }
        if (path == null) {
            path = t.path() != null ? t.path() : "p0";
        }
        Integer row = null, col = null;
        for (String seg : path.split("\\.")) {
            Matcher m = CELL.matcher(seg);
            if (m.matches()) {
                row = Integer.valueOf(m.group(1));
                col = Integer.valueOf(m.group(2));
            }
        }
        String kind = (f == PlanDocumentFormat.HWP ? "HWP" : "HWPX") + (row != null ? "_TABLE_CELL" : "_PARAGRAPH");
        Map<String, Object> dl = map("kind", kind, "section", t.section() == null ? 0 : t.section(), "path", path, "row", row, "col", col);
        return map("pdfPageNumber", null, "printedPageLabel", null, "extractedText", trim(text, 2000), "documentLocator", dl);
    }

    static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            if (kv[i + 1] != null) {
                m.put((String) kv[i], kv[i + 1]);
            }
        }
        return m;
    }

    static void putIf(Map<String, Object> m, String k, Object v) {
        if (v != null) {
            m.put(k, v);
        }
    }

    static String trim(String s, int n) {
        if (s == null) {
            return null;
        }
        String t = s.replaceAll("\\s+", " ").strip();
        return t.isEmpty() ? null : t.length() > n ? t.substring(0, n) : t;
    }

    static String fmt(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }
}
