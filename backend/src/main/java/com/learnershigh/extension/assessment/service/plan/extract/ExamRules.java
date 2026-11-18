package com.learnershigh.extension.assessment.service.plan.extract;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 정기시험 회차(중간·기말, 1회·2회 고사) 읽기. 평가표에서 회차 이름이 적힌 열(또는 행)을 묶고,
 * 회차별 비율을 (1) 이름 칸의 % (2) 반영 비율 줄의 같은 값 (3) 반영 비율 줄의 문항 유형별 값 합 순서로 찾는다.
 * 회차 비율 합이 지필 비율과 맞을 때만 내보낸다(틀린 회차보다 없는 편이 낫다).
 */
public final class ExamRules {

    private ExamRules() {
    }

    public record Exam(int round, String label, Double weightPercent, Double maxScore, String timing) {
    }

    static final Pattern ROUND = Pattern.compile("중간|기말|[1-4]\\s*[회차]\\s*(고사|시험|지필|평가)|[1-4]\\s*회$|[1-4]\\s*차$|학기말\\s*고사");

    public static List<Exam> exams(List<List<String>> g, Double examTotal) {
        if (g == null || g.isEmpty() || examTotal == null || examTotal <= 0) {
            return List.of();
        }
        try {
            List<Exam> r = fromCol(g, examTotal);
            return r.isEmpty() ? fromRow(g, examTotal) : r;
        } catch (RuntimeException e) {
            return List.of();   // 서식이 안 맞는 표
        }
    }

    private static boolean round(String s) {
        return ROUND.matcher(RatioRules.norm(s)).find() && !RatioRules.norm(s).contains("수행");
    }

    private record Group(String label, List<Integer> cols) {
    }

    /** 열 방향: 회차 이름이 한 줄에 열로 놓인 표. */
    static List<Exam> fromCol(List<List<String>> g, double examTotal) {
        int ti = -1;
        for (int i = 0; i < g.size(); i++) {
            List<String> r = g.get(i);
            if (r.size() > 2 && r.subList(1, r.size()).stream().anyMatch(RatioRules::isPerf)
                    && r.subList(1, r.size()).stream().anyMatch(RatioRules::isExam)) {
                ti = i;
                break;
            }
        }
        if (ti < 0) {
            return List.of();
        }
        List<String> tr = g.get(ti);
        List<Integer> ecols = new ArrayList<>();
        for (int c = 1; c < tr.size(); c++) {
            if (RatioRules.isExam(tr.get(c)) && !RatioRules.norm(tr.get(c)).contains("합계")) {
                ecols.add(c);
            }
        }
        if (ecols.isEmpty()) {
            return List.of();
        }
        for (int ri = ti; ri < Math.min(g.size(), ti + 4); ri++) {
            List<String> row = g.get(ri);
            List<Group> groups = new ArrayList<>();
            for (int c : ecols) {
                String v = RatioRules.cell(row, c);
                if (!round(v)) {
                    continue;
                }
                Group last = groups.isEmpty() ? null : groups.get(groups.size() - 1);
                if (last != null && RatioRules.norm(last.label()).equals(RatioRules.norm(v)) && last.cols().get(last.cols().size() - 1) == c - 1) {
                    last.cols().add(c);
                } else {
                    List<Integer> cs = new ArrayList<>();
                    cs.add(c);
                    groups.add(new Group(v, cs));
                }
            }
            if (groups.isEmpty()) {
                continue;
            }
            List<Double> w = weightsFromLabels(groups);
            if (!fits(w, examTotal)) {
                w = null;
                for (List<String> r : g.subList(ti, g.size())) {
                    if (r == row || r.isEmpty() || !RatioRules.norm(r.get(0)).matches(".*(비율|비중).*")) {
                        continue;
                    }
                    List<Double> same = new ArrayList<>(), summed = new ArrayList<>();
                    for (Group gr : groups) {
                        List<Double> vs = gr.cols().stream().map(c -> RatioRules.pctLoose(RatioRules.cell(r, c))).toList();
                        boolean uniform = vs.stream().allMatch(x -> x != null && x.equals(vs.get(0)));
                        same.add(uniform ? vs.get(0) : null);
                        summed.add(vs.stream().allMatch(x -> x == null) ? null : vs.stream().filter(x -> x != null).mapToDouble(Double::doubleValue).sum());
                    }
                    if (fits(same, examTotal)) {
                        w = same;
                        break;
                    }
                    if (fits(summed, examTotal)) {
                        w = summed;
                        break;
                    }
                }
            }
            if (w == null) {
                return List.of();
            }
            List<Exam> out = new ArrayList<>();
            for (int k = 0; k < groups.size(); k++) {
                Group gr = groups.get(k);
                Double max = RatioRules.pts(gr.label());
                String timing = null;
                for (List<String> r : g.subList(ti, g.size())) {
                    String lab = r.isEmpty() ? null : RatioRules.labelOf(r.get(0));
                    if (max == null && "max".equals(lab)) {
                        String v = RatioRules.cell(r, gr.cols().get(0));
                        max = RatioRules.pts(v) != null ? RatioRules.pts(v) : RatioRules.pctLoose(v);
                    }
                    if (timing == null && "timing".equals(lab)) {
                        timing = RatioRules.clean(RatioRules.cell(r, gr.cols().get(0)), 100);
                    }
                }
                out.add(new Exam(k + 1, label(gr.label()), w.get(k), max != null && max > 0 ? max : null, timing));
            }
            return out;
        }
        return List.of();
    }

    /** 행 방향: 회차가 줄마다 놓이고 '반영 비율' 열이 있는 표. */
    static List<Exam> fromRow(List<List<String>> g, double examTotal) {
        int hi = -1;
        for (int i = 0; i < Math.min(3, g.size()); i++) {
            if (g.get(i).stream().filter(x -> RatioRules.labelOf(x) != null).count() >= 2) {
                hi = i;
                break;
            }
        }
        if (hi < 0) {
            return List.of();
        }
        List<String> head = g.get(hi);
        int rc = -1, mc = -1, tc = -1;
        for (int c = 0; c < head.size(); c++) {
            String k = RatioRules.labelOf(head.get(c));
            if (rc < 0 && ("ratio".equals(k) || "max_ratio".equals(k))) {
                rc = c;
            } else if (mc < 0 && "max".equals(k)) {
                mc = c;
            } else if (tc < 0 && "timing".equals(k)) {
                tc = c;
            }
        }
        if (rc < 0) {
            return List.of();
        }
        List<Exam> out = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (List<String> r : g.subList(hi + 1, g.size())) {
            String lab = null;
            for (int c = 0; c < Math.min(rc, r.size()); c++) {
                if (round(r.get(c))) {
                    lab = r.get(c);
                }
            }
            if (lab == null || !seen.add(RatioRules.norm(lab))) {
                continue;
            }
            Double w = RatioRules.pctLoose(RatioRules.cell(r, rc));
            if (w == null) {
                return List.of();
            }
            Double max = mc >= 0 ? RatioRules.pts(RatioRules.cell(r, mc)) : RatioRules.pts(lab);
            out.add(new Exam(out.size() + 1, label(lab), w, max != null && max > 0 ? max : null,
                    tc >= 0 ? RatioRules.clean(RatioRules.cell(r, tc), 100) : null));
        }
        return fits(out.stream().map(Exam::weightPercent).toList(), examTotal) ? out : List.of();
    }

    private static List<Double> weightsFromLabels(List<Group> groups) {
        List<Double> w = new ArrayList<>();
        for (Group gr : groups) {
            w.add(RatioRules.pct(gr.label()));
        }
        return w;
    }

    private static boolean fits(List<Double> w, double examTotal) {
        return w != null && !w.isEmpty() && w.stream().allMatch(x -> x != null && x > 0)
                && Math.abs(w.stream().mapToDouble(Double::doubleValue).sum() - examTotal) <= 0.6;
    }

    /** "중간고사 (30%, 100점 만점)" → "중간고사". */
    static String label(String s) {
        String t = s.replaceAll("[(（][^)）]*[)）]", " ").replaceAll("\\s+", " ").strip();
        Matcher m = Pattern.compile("^(.{1,30})").matcher(t);
        return m.find() ? m.group(1).strip() : t;
    }
}
