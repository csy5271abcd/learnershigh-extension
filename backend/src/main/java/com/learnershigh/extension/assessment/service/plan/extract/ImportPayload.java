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
        java.util.Set<String> names = new java.util.HashSet<>();
        for (PlanExtractor.Subject s : subjects) {
            if (s.examPercent == null && s.performancePercent == null && s.items.isEmpty()) {
                continue;
            }
            if (!names.add(s.name.strip()) || subs.size() >= 40) {
                continue;   // 계약: 과목 이름 중복 불가, 과목 40개 이하
            }
            subs.add(subject(s, format, contract03));
        }
        out.put("status", subs.isEmpty() ? "FAILED" : "REVIEW_REQUIRED");
        if (subs.isEmpty()) {
            out.put("failureReason", contract03 ? "NO_ASSESSMENTS_EXTRACTED" : "평가 비율 표를 찾지 못했습니다");
        }
        out.put("subjects", subs);
        out.put("warnings", List.of());
        return out;
    }

    private static Map<String, Object> subject(PlanExtractor.Subject s, PlanDocumentFormat f, boolean c03) {
        SourceTable t = s.source;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("subjectName", trim(s.name, 100));
        List<Integer> pages = new ArrayList<>();
        if (t.page() != null) {
            pages.add(t.page());
        }
        m.put("sources", List.of(loc(t, s.name, f)));
        if (s.examPercent != null) {
            m.put("writtenEvaluation", map("weightPercent", s.examPercent, "sources", List.of(loc(t, fmt(s.examPercent) + "%", f)),
                    "exams", List.of()));
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
        if (f == PlanDocumentFormat.PDF && !pages.isEmpty()) {
            m.put("pageRange", map("from", pages.stream().min(Integer::compare).get(), "to", pages.stream().max(Integer::compare).get()));
        }
        return m;
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
