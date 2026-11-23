package com.learnershigh.extension.assessment.service.plan.extract;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 비율표에 과제 이름이 없을 때(서·논술형/그 외 비율만), 세부 표에서 과제 이름과 반영 비율을 읽는다.
 * 채점 요소(채점표 행)가 아니라 '과제 단위' 칸만 본다. 세 서식:
 * <ol>
 * <li>과제 머리 표: 첫 칸 '수행과제1 | 과제 이름', 같은 표 안 '반영 비율 | 10%'</li>
 * <li>과제 목록 표: '평가 영역(명칭)/평가명 | 이름 | 이름 …' 행과 '만점(비율)/반영 비율/배점' 행이 열로 맞물린 표</li>
 * <li>과제 행 표: '평가 내용 및 항목(배점)' 같은 열에 '과제 이름 (20점)' 칸이 행마다 있는 표</li>
 * </ol>
 * 과제 비율 합이 수행 비율과 같을 때만 결과를 낸다 (아니면 null).
 */
final class TaskSheetRules {

    private TaskSheetRules() {
    }

    static final Pattern TASK_HEAD = Pattern.compile("^수행\\s*(평가)?\\s*과제\\s*\\d*$|^과제\\s*\\d+$|^수행\\s*평가\\s*\\d+$");
    static final Pattern NAME_PAREN = Pattern.compile("^(?<name>.+?)\\s*[(（]\\s*(?<v>\\d{1,3}(?:\\.\\d+)?)\\s*(?<u>점|%)?\\s*[)）]\\s*$");
    static final Pattern NAME_PAREN_INNER = Pattern.compile("[(（]\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*%\\s*[)）]");
    static final Pattern TOTAL = Pattern.compile("총점|합계|^계$|소계");

    static List<RatioRules.Item> read(List<SourceTable> details, double perf) {
        for (int style = 0; style < 3; style++) {
            List<RatioRules.Item> res = collect(details, style, perf);
            if (res.size() >= 1 && res.stream().allMatch(i -> i.weightPercent() != null && i.weightPercent() > 0)
                    && Math.abs(RatioRules.sumW(res) - perf) <= 0.6) {
                return res;
            }
        }
        return null;
    }

    /** 합이 맞지 않아도 세부 표에서 읽은 과제 단위 이름 (가장 많이 읽은 서식). 채점 요소를 과제로 착각했는지 가릴 때 쓴다. */
    static List<String> partialNames(List<SourceTable> details, double perf) {
        List<RatioRules.Item> best = List.of();
        for (int style = 0; style < 3; style++) {
            List<RatioRules.Item> res = collect(details, style, perf);
            if (res.size() > best.size()) {
                best = res;
            }
        }
        return best.stream().map(RatioRules.Item::label).toList();
    }

    private static List<RatioRules.Item> collect(List<SourceTable> details, int style, double perf) {
        Map<String, RatioRules.Item> out = new LinkedHashMap<>();
        for (SourceTable t : details) {
            List<RatioRules.Item> its = style == 0 ? header(t.cells()) : style == 1 ? sheet(t.cells(), perf) : rows(t.cells());
            if (its == null) {
                continue;
            }
            for (RatioRules.Item it : its) {
                out.putIfAbsent(RatioRules.norm(it.label()), it);
            }
            if (Math.abs(RatioRules.sumW(new ArrayList<>(out.values())) - perf) <= 0.6) {
                break;
            }
        }
        return new ArrayList<>(out.values());
    }

    private static String c(List<String> r, int i) {
        return RatioRules.cell(r, i).replaceAll("\\s+", " ").strip();
    }

    private static boolean goodName(String s) {
        String n = RatioRules.norm(s);
        return n.length() >= 2 && n.length() <= 80 && RatioRules.acceptableLabel(s) && !RatioRules.methodOnly(s)
                && !RatioRules.typeOnly(s) && RatioRules.labelOf(s) == null && !TOTAL.matcher(n).find()
                && !RatioRules.CHECKBOX.matcher(n).find() && !n.startsWith("[");
    }

    /** 1) 과제 머리 표: 첫 행 '수행과제N | 이름', 표 안 '반영 비율 | NN%'. */
    static List<RatioRules.Item> header(List<List<String>> g) {
        if (g.isEmpty() || g.get(0).size() < 2) {
            return null;
        }
        List<String> r0 = g.get(0);
        int lc = 0;
        while (lc < r0.size() - 1 && c(r0, lc + 1).equals(c(r0, lc))) {
            lc++;   // 병합으로 복제된 라벨 칸
        }
        String head = RatioRules.norm(c(r0, 0));
        if (!TASK_HEAD.matcher(head).matches()) {
            return null;
        }
        String name = c(r0, lc + 1);
        if (!goodName(name)) {
            return null;
        }
        Double w = null;
        for (List<String> r : g) {
            for (int i = 0; i + 1 < r.size() && w == null; i++) {
                if ("ratio".equals(RatioRules.labelOf(c(r, i)))) {
                    for (int j = i + 1; j < r.size(); j++) {
                        if (!c(r, j).isEmpty() && !c(r, j).equals(c(r, i))) {
                            w = RatioRules.pct(c(r, j));
                            break;
                        }
                    }
                }
            }
        }
        return w == null ? null : List.of(new RatioRules.Item(RatioRules.clean(name, 120), w, null, null));
    }

    /** 2) 과제 목록 표: 이름 행과 비율(배점) 행이 같은 열. 라벨은 첫 몇 열 안 어디든. */
    static List<RatioRules.Item> sheet(List<List<String>> g, double perf) {
        for (int ri = 0; ri < g.size(); ri++) {
            List<String> r = g.get(ri);
            for (int lc = 0; lc < Math.min(5, r.size() - 1); lc++) {
                String lab = c(r, lc);
                if (!"name".equals(RatioRules.labelOf(lab)) || RatioRules.norm(lab).contains("단원")) {
                    continue;
                }
                List<Integer> cols = new ArrayList<>();
                List<String> names = new ArrayList<>();
                int totalCol = -1;
                for (int j = lc + 1; j < r.size(); j++) {
                    String v = c(r, j);
                    if (v.isEmpty() || v.equals(lab) || (j > lc + 1 && v.equals(c(r, j - 1)))) {
                        continue;
                    }
                    if (TOTAL.matcher(RatioRules.norm(v)).find()) {
                        totalCol = j;
                        break;
                    }
                    if (!goodName(v)) {
                        cols.clear();
                        break;
                    }
                    cols.add(j);
                    names.add(v);
                }
                if (cols.isEmpty()) {
                    continue;
                }
                // 같은 라벨 열에서 비율·배점 행 찾기
                for (List<String> vr : g) {
                    if (vr == r) {
                        continue;
                    }
                    String vl = RatioRules.labelOf(c(vr, lc));
                    if (vl == null || !(vl.equals("ratio") || vl.equals("max_ratio") || vl.equals("max"))) {
                        continue;
                    }
                    List<Double> ws = new ArrayList<>();
                    boolean allPct = true;
                    for (int j : cols) {
                        String v = c(vr, j);
                        Matcher m = NAME_PAREN_INNER.matcher(v);
                        Double w = m.find() ? Double.valueOf(m.group(1)) : RatioRules.pct(v);
                        if (w == null) {
                            allPct = false;
                            Double p = RatioRules.pts(v);
                            if (p == null) {
                                Matcher bm = Pattern.compile("^\\s*(\\d{1,3}(?:\\.\\d+)?)").matcher(v);
                                p = bm.find() ? Double.valueOf(bm.group(1)) : null;
                            }
                            w = p;
                        }
                        if (w == null) {
                            ws = null;
                            break;
                        }
                        ws.add(w);
                    }
                    if (ws == null) {
                        continue;
                    }
                    double sm = ws.stream().mapToDouble(Double::doubleValue).sum();
                    if (!allPct && Math.abs(sm - perf) > 0.6) {
                        // 배점이면 총점 칸과 합이 같을 때만 수행 비율로 환산한다
                        Double tot = null;
                        if (totalCol >= 0) {
                            Matcher bm = Pattern.compile("^\\s*(\\d{1,3}(?:\\.\\d+)?)").matcher(c(vr, totalCol));
                            tot = bm.find() ? Double.valueOf(bm.group(1)) : null;
                        }
                        if (tot == null || Math.abs(tot - sm) > 0.6) {
                            continue;
                        }
                        List<Double> sc = new ArrayList<>();
                        for (double w : ws) {
                            sc.add(Math.round(w * perf / sm * 100) / 100.0);
                        }
                        ws = sc;
                    }
                    List<RatioRules.Item> out = new ArrayList<>();
                    for (int k = 0; k < cols.size(); k++) {
                        out.add(new RatioRules.Item(RatioRules.clean(names.get(k), 120), ws.get(k), null, null));
                    }
                    return out;
                }
            }
        }
        return null;
    }

    /** 3) 과제 행 표: 머리 칸에 '항목/과제/평가명/내용'과 '배점'이 있는 열에 '이름 (20점)' 칸이 행마다. */
    static List<RatioRules.Item> rows(List<List<String>> g) {
        if (g.size() < 2) {
            return null;
        }
        int width = g.stream().mapToInt(List::size).max().orElse(0);
        for (int col = 0; col < width; col++) {
            boolean headOk = false;
            int start = -1;
            for (int ri = 0; ri < Math.min(3, g.size()); ri++) {
                String h = RatioRules.norm(c(g.get(ri), col));
                if ((h.contains("항목") || h.contains("과제") || h.contains("평가명") || h.contains("내용")) && (h.contains("배점") || h.contains("비율"))) {
                    headOk = true;
                    start = ri + 1;
                }
            }
            if (!headOk) {
                continue;
            }
            List<RatioRules.Item> out = new ArrayList<>();
            for (List<String> r : g.subList(start, g.size())) {
                String v = c(r, col);
                if (v.isEmpty()) {
                    continue;
                }
                Matcher m = NAME_PAREN.matcher(v);
                if (!m.matches() || !goodName(m.group("name"))) {
                    return null;
                }
                out.add(new RatioRules.Item(RatioRules.clean(m.group("name"), 120), Double.valueOf(m.group("v")), null, null));
            }
            if (out.size() >= 1) {
                return out;
            }
        }
        return null;
    }
}
