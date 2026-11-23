package com.learnershigh.extension.assessment.service.plan.extract;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 평가표(지필·수행 반영 비율 표) 해석 규칙. 113개 학교 실측에서 값의 98%가 아래 세 서식에서 나왔다.
 * <ul>
 *   <li>COL: 열마다 평가 하나 (종류 행 '정기시험 | 수행평가', 아래 '반영 비율' 행) — 90%</li>
 *   <li>ROW: 행마다 평가 하나 (머리 행에 라벨, 한 열이 평가 종류) — 8%</li>
 *   <li>AREA: 비율 표 + 세부 표의 '평가영역 | 이름 (20%) | …' 행 — 1%</li>
 * </ul>
 */
public final class RatioRules {

    private RatioRules() {
    }

    /** 해석 결과. 비율은 %, 항목 비율 합이 수행 총비율과 같아야 검증을 통과한다. */
    public record Item(String label, Double weightPercent, Double maxScore, String timing) {
    }

    public record Result(Double perfTotal, Double examTotal, List<Item> items, int namesInTable) {
    }

    // ---------- 글자 도구 ----------
    static final Pattern STRIP = Pattern.compile("[()\\[\\]·ㆍ・%\\s]");
    static final Pattern PCT = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*\\)?\\s*[%％]");
    static final Pattern PTS = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*점");
    static final Pattern PAREN_NUM = Pattern.compile("\\((\\d+(?:\\.\\d+)?)\\)");
    static final Pattern BARE_NUM = Pattern.compile("\\s*(\\d+(?:\\.\\d+)?)\\s*");
    static final Pattern PLACEHOLDER = Pattern.compile(
            "^(평가)?영역\\s*\\d+$|^수행\\s*평가\\s*\\d*$|^\\d+\\s*(차|회)(\\s*시험)?$|^\\d+\\s*순위$|^[\\d.]+\\s*[%점]?$|^[•▸⦁∙·Ÿ\\-–―_]|^(합계|계|미실시|해당\\s*없음)$");
    static final Set<String> TYPE_LABELS = Set.of("평가유형", "평가종류", "종류", "구분", "유형", "평가구분", "평가유형및반영비율",
            "평가방법반영비율", "평가종류반영비율", "평가종류및반영비율", "평가유형반영비율");
    static final Pattern AREA_CELL = Pattern.compile("^(?<name>.+?)\\s*[(（]\\s*(?<w>\\d{1,3}(?:\\.\\d+)?)\\s*%\\s*[)）]\\s*$");
    static final Pattern CHECKBOX = Pattern.compile("^[□■☑☐▣◻◼]|^gfedc");

    static String norm(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "");
    }

    static String strip(String s) {
        return s == null ? "" : STRIP.matcher(s).replaceAll("");
    }

    static String fw(String s) {
        if (s == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(s.length());
        for (char ch : s.toCharArray()) {
            sb.append(ch >= '０' && ch <= '９' ? (char) (ch - '０' + '0') : ch == '．' ? '.' : ch);
        }
        return sb.toString();
    }

    static Double pct(String s) {
        Matcher m = PCT.matcher(fw(s));
        return m.find() ? Double.valueOf(m.group(1)) : null;
    }

    static Double pctLoose(String s) {
        Double v = pct(s);
        if (v != null) {
            return v;
        }
        Matcher m = PAREN_NUM.matcher(fw(s));
        if (m.find()) {
            return Double.valueOf(m.group(1));
        }
        m = BARE_NUM.matcher(fw(s));
        return m.matches() ? Double.valueOf(m.group(1)) : null;
    }

    static Double pts(String s) {
        Matcher m = PTS.matcher(fw(s));
        return m.find() ? Double.valueOf(m.group(1)) : null;
    }

    static String clean(String s, int n) {
        String t = s == null ? "" : s.replaceAll("\\s+", " ").strip();
        return t.isEmpty() ? null : (t.length() > n ? t.substring(0, n) : t);
    }

    static boolean empty(String x) {
        String n = norm(x);
        return n.isEmpty() || Set.of("-", "·", "․", "ㆍ", "•", "‧", "－", "—").contains(n);
    }

    /** 표 머리 라벨 종류: ratio · max_ratio · max · name · timing · element · method · null */
    static String labelOf(String s) {
        String n = strip(s);
        if (n.isEmpty() || n.length() > 16) {
            return null;
        }
        if (n.contains("비율") || n.contains("비중")) {
            return n.contains("만점") || n.contains("배점") ? "max_ratio" : "ratio";
        }
        if (n.contains("만점") || n.contains("배점")) {
            return "max";
        }
        if (n.contains("영역") || n.contains("횟수") || n.contains("과제") || n.contains("평가명") || n.equals("항목")) {
            return "name";
        }
        if (n.contains("시기") || n.contains("일정")) {
            return "timing";
        }
        if (n.contains("요소") || n.contains("내용")) {
            return "element";
        }
        if (n.contains("방법") || n.contains("유형")) {
            return "method";
        }
        return null;
    }

    static boolean isPerf(String v) {
        return norm(v).contains("수행");
    }

    static boolean isExam(String v) {
        String n = norm(v);
        if (CHECKBOX.matcher(n).find()) {
            return false;
        }
        n = n.replace("학기말", "");
        return n.contains("정기") || n.contains("지필") || n.contains("중간") || n.contains("기말") || n.matches(".*[1-4](차|회)(시험|고사).*");
    }

    static boolean acceptableLabel(String s) {
        String t = s == null ? "" : s.replaceAll("\\s+", " ").strip();
        return !t.isEmpty() && !PLACEHOLDER.matcher(t).find() && pct(t) == null && t.length() <= 80;
    }

    static String cell(List<String> r, int c) {
        return c >= 0 && c < r.size() && r.get(c) != null ? r.get(c) : "";
    }

    /** 라벨 열 정리: 앞 과목 열 · 모든 행이 같은 첫 열 · 병합으로 복제된 라벨 열. */
    static List<List<String>> dropDupLabelCol(List<List<String>> g) {
        boolean subjCol = g.stream().anyMatch(r -> r.size() > 2 && Set.of("과목", "과목명").contains(norm(r.get(0)))
                && TYPE_LABELS.contains(strip(r.get(1))));
        if (subjCol) {
            g = g.stream().map(r -> r.size() > 1 ? r.subList(1, r.size()) : r).toList();
        }
        Set<String> first = new HashSet<>();
        for (List<String> r : g) {
            if (!r.isEmpty()) {
                first.add(norm(r.get(0)));
            }
        }
        if (g.size() >= 3 && first.size() == 1 && !first.iterator().next().isEmpty() && g.stream().allMatch(r -> r.size() > 2)) {
            g = g.stream().map(r -> r.subList(1, r.size())).toList();
        }
        List<List<String>> rows = g.stream().filter(r -> r.size() > 2 && !norm(r.get(0)).isEmpty()).toList();
        if (!rows.isEmpty() && rows.stream().filter(r -> r.get(0).equals(r.get(1))).count() >= 0.6 * rows.size()) {
            List<List<String>> out = new ArrayList<>();
            for (List<String> r : g) {
                if (r.size() <= 1) {
                    out.add(r);
                    continue;
                }
                List<String> nr = new ArrayList<>();
                nr.add(r.get(0).equals(r.get(1)) || norm(r.get(1)).isEmpty() ? r.get(0) : r.get(0) + " " + r.get(1));
                nr.addAll(r.subList(2, r.size()));
                out.add(nr);
            }
            return out;
        }
        return g;
    }

    static boolean perfOnlyRow(List<String> r) {
        if (r.size() < 2 || !TYPE_LABELS.contains(strip(r.get(0)))) {
            return false;
        }
        List<String> vals = r.subList(1, r.size()).stream()
                .filter(x -> !norm(x).isEmpty() && !norm(x).matches(".*(합계|총합).*|^계$")).toList();
        return !vals.isEmpty() && vals.stream().allMatch(x -> isPerf(x) && !isExam(x));
    }

    // ---------- COL ----------
    public static Result famCol(List<List<String>> g0) {
        List<List<String>> g = dropDupLabelCol(g0);
        int ti = -1;
        for (int i = 0; i < g.size(); i++) {
            List<String> r = g.get(i);
            if (r.size() > 2 && r.subList(1, r.size()).stream().anyMatch(RatioRules::isPerf)
                    && r.subList(1, r.size()).stream().anyMatch(RatioRules::isExam)) {
                ti = i;
                break;
            }
        }
        boolean perfOnly = false;
        if (ti < 0) {
            for (int i = 0; i < g.size(); i++) {
                if (perfOnlyRow(g.get(i))) {
                    ti = i;
                    perfOnly = true;
                    break;
                }
            }
        }
        if (ti < 0) {
            return null;
        }
        List<String> tr = new ArrayList<>(g.get(ti));
        for (int c = 2; c < tr.size(); c++) {
            if (norm(tr.get(c)).isEmpty()) {
                tr.set(c, tr.get(c - 1));
            }
        }
        Map<String, List<List<String>>> rows = new HashMap<>();
        for (List<String> r : g.subList(ti + 1, g.size())) {
            String k = r.isEmpty() ? null : labelOf(r.get(0));
            if ("method".equals(k) && !Set.of("평가방법", "방법", "평가유형", "유형", "평가방법유형").contains(strip(r.get(0)))) {
                continue;
            }
            if (("ratio".equals(k) || "max_ratio".equals(k)) && norm(r.get(0)).matches(".*(서논술|서술|논술|서답|선택형|단답).*")) {
                rows.computeIfAbsent("ratio_method", x -> new ArrayList<>()).add(r);
                continue;
            }
            if (k != null) {
                rows.computeIfAbsent(k, x -> new ArrayList<>()).add(r);
            }
        }
        List<Integer> pcols = new ArrayList<>();
        List<Integer> ecols = new ArrayList<>();
        for (int c = 1; c < tr.size(); c++) {
            if (isPerf(tr.get(c)) && !norm(tr.get(c)).contains("합계")) {
                pcols.add(c);
            }
            if (isExam(tr.get(c))) {
                ecols.add(c);
            }
        }
        if (pcols.isEmpty()) {
            return null;
        }
        final int tIndex = ti;
        final List<List<String>> gg = g;
        List<List<String>> ratioRows = rows.getOrDefault("ratio", List.of());
        Double total = pct(tr.get(pcols.get(0)));
        if (total == null && !ratioRows.isEmpty()) {
            total = pctLoose(cell(ratioRows.get(0), pcols.get(0)));
        }
        if (perfOnly) {
            total = 100.0;
        }
        Double examTotal = ecols.isEmpty() ? null : pct(tr.get(ecols.get(0)));
        if (examTotal == null && !ratioRows.isEmpty() && !ecols.isEmpty()) {
            List<String> cells = ecols.stream().map(c -> cell(ratioRows.get(0), c)).toList();
            List<Double> filled = cells.stream().filter(x -> !empty(x)).map(RatioRules::pctLoose).toList();
            if (filled.size() > 1 && cells.stream().anyMatch(RatioRules::empty) && filled.stream().allMatch(Objects::nonNull)) {
                examTotal = filled.stream().mapToDouble(Double::doubleValue).sum();
            } else {
                examTotal = pctLoose(cell(ratioRows.get(0), ecols.get(0)));
            }
        }
        List<List<String>> labeled = new ArrayList<>();
        if (ratioRows.size() > 1) {
            labeled.addAll(ratioRows.subList(1, ratioRows.size()));
        }
        labeled.addAll(rows.getOrDefault("max_ratio", List.of()));
        if (!ratioRows.isEmpty()) {
            labeled.add(ratioRows.get(0));
        }
        List<List<String>> cand = new ArrayList<>(labeled);
        for (List<String> r : g.subList(ti + 1, g.size())) {
            if (!labeled.contains(r) && pcols.stream().allMatch(c -> pct(cell(r, c)) != null)) {
                cand.add(r);
            }
        }
        java.util.function.BiFunction<List<String>, Integer, Double> val = (row, c) -> {
            String lab = labelOf(row.get(0));
            if ("max_ratio".equals(lab)) {
                Double v = pct(cell(row, c));
                if (v == null) {
                    Matcher m = PAREN_NUM.matcher(cell(row, c));
                    v = m.find() ? Double.valueOf(m.group(1)) : null;
                }
                return v;
            }
            return lab == null || "name".equals(lab) ? pct(cell(row, c)) : pctLoose(cell(row, c));
        };
        java.util.function.IntPredicate dupCol = c -> pcols.contains(c - 1)
                && gg.subList(tIndex + 1, gg.size()).stream().filter(r -> r.size() > c).allMatch(r -> r.get(c).equals(r.get(c - 1)));
        java.util.function.Function<List<String>, List<Integer>> uniqCols = row -> pcols.stream()
                .filter(c -> !dupCol.test(c) && !empty(cell(row, c))).toList();
        java.util.function.Predicate<List<String>> goodNames = r -> {
            List<String> vs = pcols.stream().filter(c -> !dupCol.test(c)).map(c -> norm(cell(r, c))).toList();
            return !vs.isEmpty() && vs.stream().noneMatch(String::isEmpty) && new HashSet<>(vs).size() == vs.size()
                    && pcols.stream().noneMatch(c -> pct(cell(r, c)) != null);
        };
        List<List<String>> nameRows = rows.getOrDefault("name", List.of());
        List<String> nameRow = nameRows.stream().filter(r -> r.get(0).contains("영역") && goodNames.test(r)).findFirst()
                .orElse(nameRows.stream().filter(goodNames).findFirst().orElse(null));
        if (nameRow == null && ti + 1 < g.size() && goodNames.test(g.get(ti + 1))) {
            nameRow = g.get(ti + 1);
        }
        if (nameRow == null) {
            List<List<String>> me = new ArrayList<>(rows.getOrDefault("method", List.of()));
            me.addAll(rows.getOrDefault("element", List.of()));
            nameRow = me.stream().filter(goodNames).findFirst().orElse(null);
        }
        java.util.function.Function<List<String>, List<Double>> pVals = row -> {
            List<Integer> cs = uniqCols.apply(row);
            List<Double> vs = cs.stream().map(c -> val.apply(row, c)).toList();
            return !vs.isEmpty() && vs.stream().allMatch(Objects::nonNull) ? vs : null;
        };
        final List<String> nameRowF = nameRow;
        java.util.function.Function<List<String>, List<Double>> exVals = row -> {
            Set<String> seen = new HashSet<>();
            List<Double> vs = new ArrayList<>();
            for (int c : ecols) {
                if (empty(cell(row, c))) {
                    continue;
                }
                if (nameRowF == null && ecols.contains(c - 1) && cell(row, c).equals(cell(row, c - 1))) {
                    continue;
                }
                String k = (nameRowF != null ? norm(cell(nameRowF, c)) : String.valueOf(c)) + "|" + cell(row, c);
                if (!seen.add(k)) {
                    continue;
                }
                vs.add("ratio".equals(labelOf(row.get(0))) ? pctLoose(cell(row, c)) : pct(cell(row, c)));
            }
            return !vs.isEmpty() && vs.stream().allMatch(Objects::nonNull) ? vs : null;
        };
        List<String> itemRatio = null;
        boolean derived = false;
        int bestN = 0;
        List<Double> targets = new ArrayList<>();
        if (total != null) {
            targets.add(total);
        }
        targets.add(100.0);
        for (double target : targets) {
            for (List<String> rr : cand) {
                List<Double> vals = pVals.apply(rr);
                if (vals == null) {
                    continue;
                }
                double s = vals.stream().mapToDouble(Double::doubleValue).sum();
                if (total != null && Math.abs(s - target) <= 0.6 && vals.size() > bestN) {
                    itemRatio = rr;
                    bestN = vals.size();
                }
            }
            if (itemRatio != null) {
                break;
            }
        }
        if (itemRatio == null) {
            for (List<String> rr : cand) {
                List<Double> pv = pVals.apply(rr), ev = exVals.apply(rr);
                if (pv != null && ev != null && Math.abs(sum(pv) + sum(ev) - 100) <= 0.6) {
                    itemRatio = rr;
                    total = sum(pv);
                    examTotal = sum(ev);
                    derived = true;
                    break;
                }
            }
        }
        if (itemRatio == null && examTotal != null) {
            for (List<String> rr : cand) {
                List<Double> pv = pVals.apply(rr);
                if (pv != null && Math.abs(sum(pv) + examTotal - 100) <= 0.6) {
                    itemRatio = rr;
                    total = sum(pv);
                    derived = true;
                    break;
                }
            }
        }
        if (itemRatio == null && !cand.isEmpty()) {
            itemRatio = cand.get(0);
        }
        if (itemRatio != null && !derived && total != null) {
            List<Double> ev = exVals.apply(itemRatio);
            if (ev != null && Math.abs(sum(ev) + total - 100) <= 0.6) {
                examTotal = sum(ev);
            }
        }
        if (nameRow == null && rows.containsKey("element")) {
            nameRow = rows.get("element").get(0);
        }
        // 항목 이름 후보 행: 이름 행(서로 다른 값이 많은 순) > 라벨 없는 행 > 평가방법 행 > 평가요소 행
        List<List<String>> labelRows = new ArrayList<>(rows.getOrDefault("name", List.of()));
        for (List<String> r : g.subList(ti + 1, g.size())) {
            if (!r.isEmpty() && norm(r.get(0)).isEmpty()) {
                labelRows.add(r);
            }
        }
        labelRows.sort((a, b) -> Integer.compare(distinct(b, pcols, dupCol), distinct(a, pcols, dupCol)));
        labelRows.addAll(rows.getOrDefault("method", List.of()));
        labelRows.addAll(rows.getOrDefault("element", List.of()));
        List<List<String>> mx = rows.containsKey("max") ? rows.get("max") : rows.get("max_ratio");
        List<List<String>> timing = rows.get("timing");
        List<Item> items = new ArrayList<>();
        List<Integer> cols = itemRatio != null ? uniqCols.apply(itemRatio) : pcols;
        for (int c : cols) {
            String name = "";
            for (List<String> r : labelRows) {
                if (c < r.size() && acceptableLabel(r.get(c))) {
                    name = r.get(c);
                    break;
                }
            }
            Double rv = itemRatio != null ? val.apply(itemRatio, c) : null;
            if (norm(name).isEmpty() && itemRatio != null) {
                name = cell(itemRatio, c).split("[(（]")[0];
                if (!acceptableLabel(name)) {
                    name = "";
                }
            }
            if (rv != null && rv == 0) {
                continue;
            }
            Double mxv = null;
            if (mx != null && !mx.isEmpty()) {
                List<String> last = mx.get(mx.size() - 1);
                mxv = pts(cell(last, c));
                if (mxv == null && "max".equals(labelOf(last.get(0)))) {
                    mxv = pctLoose(cell(last, c));
                }
            }
            items.add(new Item(clean(name, 120), rv, mxv, timing != null ? clean(cell(timing.get(0), c), 40) : null));
        }
        // 병합 칸 복제로 같은 항목이 두 번 들어간 경우(이름·비율·만점·시기 모두 같음) 하나로. 합이 맞을 때만
        if (items.size() > 1 && total != null) {
            List<Item> uniq = new ArrayList<>();
            Set<String> seen = new HashSet<>();
            for (Item it : items) {
                String k = norm(it.label()) + "|" + it.weightPercent() + "|" + it.maxScore() + "|" + norm(it.timing());
                if (seen.contains(k) && !norm(it.label()).isEmpty()) {
                    continue;
                }
                seen.add(k);
                uniq.add(it);
            }
            if (Math.abs(sumW(uniq) - total) <= 0.6 && Math.abs(sumW(items) - total) > 0.6) {
                items = uniq;
            }
        }
        if (perfOnly) {
            examTotal = 0.0;
        }
        int nNames = 0;
        if (nameRow != null) {
            Set<String> ns = new LinkedHashSet<>();
            for (int c : pcols) {
                String v = norm(cell(nameRow, c));
                boolean explicitlyNone = itemRatio != null && (empty(cell(itemRatio, c)) || Objects.equals(val.apply(itemRatio, c), 0.0));
                if (!dupCol.test(c) && !v.isEmpty() && !explicitlyNone && !v.matches("[\\d.%점]+|합계|계|-")) {
                    ns.add(v);
                }
            }
            nNames = ns.size();
        }
        return new Result(total, examTotal, items, nNames);
    }

    private static int distinct(List<String> r, List<Integer> pcols, java.util.function.IntPredicate dupCol) {
        Set<String> s = new HashSet<>();
        for (int c : pcols) {
            if (!dupCol.test(c) && c < r.size() && acceptableLabel(r.get(c))) {
                s.add(norm(r.get(c)));
            }
        }
        return s.size();
    }

    static double sum(List<Double> v) {
        return v.stream().mapToDouble(Double::doubleValue).sum();
    }

    static double sumW(List<Item> items) {
        return items.stream().mapToDouble(i -> i.weightPercent() == null ? 0 : i.weightPercent()).sum();
    }

    // ---------- ROW ----------
    public static Result famRow(List<List<String>> g) {
        if (g.isEmpty() || g.get(0).size() < 3) {
            return null;
        }
        int hi = -1;
        for (int i = 0; i < Math.min(3, g.size()); i++) {
            if (g.get(i).stream().filter(x -> labelOf(x) != null).count() >= 2) {
                hi = i;
                break;
            }
        }
        if (hi < 0) {
            return null;
        }
        List<String> head = g.get(hi);
        List<List<String>> body = new ArrayList<>();
        for (List<String> r : g.subList(hi + 1, g.size())) {
            if (r.stream().anyMatch(x -> !norm(x).isEmpty())) {
                body.add(new ArrayList<>(r));
            }
        }
        int tcol = -1;
        for (int c = 0; c < head.size(); c++) {
            final int cc = c;
            if (body.stream().anyMatch(r -> isPerf(cell(r, cc))) && body.stream().anyMatch(r -> isExam(cell(r, cc)))) {
                tcol = c;
                break;
            }
        }
        if (tcol < 0) {
            return noTypeColumn(g, hi, body);
        }
        for (int i = 1; i < body.size(); i++) {
            List<String> r = body.get(i);
            if (norm(cell(r, tcol)).isEmpty() && r.stream().noneMatch(x -> norm(x).matches(".*합계.*|^계$|.*총계.*|.*합$"))) {
                r.set(tcol, cell(body.get(i - 1), tcol));
            }
        }
        final int tc = tcol;
        body = body.stream().filter(r -> isPerf(cell(r, tc)) || isExam(cell(r, tc))).toList();
        Map<String, Integer> col = new HashMap<>();
        for (int c = 0; c < head.size(); c++) {
            String k = labelOf(head.get(c));
            if (k != null && !col.containsKey(k) && c != tcol) {
                col.put(k, c);
            }
        }
        if (!col.containsKey("ratio") && !col.containsKey("max_ratio")) {
            return null;
        }
        int rc = col.getOrDefault("ratio", col.get("max_ratio"));
        Integer nc = col.get("name");
        List<List<String>> perfRows = new ArrayList<>();
        Set<List<String>> seenP = new HashSet<>();
        for (List<String> r : body) {
            if (isPerf(cell(r, tc)) && hasContent(r, tc) && seenP.add(r)) {
                perfRows.add(r);
            }
        }
        List<List<String>> examRows = new ArrayList<>();
        Set<String> seenE = new HashSet<>();
        for (List<String> r : body) {
            if (isExam(cell(r, tc)) && seenE.add((nc != null ? norm(cell(r, nc)) : "") + "|" + cell(r, rc))) {
                examRows.add(r);
            }
        }
        List<Item> items = new ArrayList<>();
        for (List<String> r : perfRows) {
            Double mxv = null;
            if (col.containsKey("max")) {
                mxv = pts(cell(r, col.get("max")));
                if (mxv == null) {
                    mxv = pctLoose(cell(r, col.get("max")));
                }
            }
            items.add(new Item(nc != null ? clean(cell(r, nc), 120) : null, pctLoose(cell(r, rc)), mxv,
                    col.containsKey("timing") ? clean(cell(r, col.get("timing")), 40) : null));
        }
        Double total = items.isEmpty() ? null : items.stream().filter(i -> i.weightPercent() != null).mapToDouble(Item::weightPercent).sum();
        List<Double> ev = examRows.stream().map(r -> pctLoose(cell(r, rc))).filter(Objects::nonNull).toList();
        Double examTotal = examRows.isEmpty() ? null : sum(ev);
        return new Result(total, examTotal, items, 0);
    }

    /**
     * '지필/수행' 구분 열이 없는 행 방향 표(스캔본에서 세로 글자 칸을 OCR 이 못 읽은 경우 등): 첫 열이 평가 영역 이름이고
     * '1차시험·중간고사' 같은 시험 행과 그 밖의 행이 함께 있으면, 시험 행은 지필·나머지는 수행으로 보고 다시 읽는다.
     */
    private static Result noTypeColumn(List<List<String>> g, int hi, List<List<String>> body) {
        if (!"name".equals(labelOf(cell(g.get(hi), 0)))) {
            return null;
        }
        List<List<String>> named = body.stream().filter(r -> !norm(cell(r, 0)).isEmpty() && labelOf(cell(r, 0)) == null
                && !norm(cell(r, 0)).matches(".*합계.*|^계$|.*총계.*|.*합$")).toList();
        long exams = named.stream().filter(r -> isExam(cell(r, 0))).count();
        if (exams == 0 || exams == named.size()) {
            return null;
        }
        List<List<String>> ng = new ArrayList<>();
        List<String> head = new ArrayList<>(g.get(hi));
        head.add(0, "구분");
        ng.add(head);
        for (List<String> r : named) {
            List<String> nr = new ArrayList<>(r);
            nr.add(0, isExam(cell(r, 0)) ? "지필평가" : "수행평가");
            ng.add(nr);
        }
        return famRow(ng);
    }

    private static boolean hasContent(List<String> r, int tcol) {
        for (int i = 0; i < r.size(); i++) {
            if (i == tcol) {
                continue;
            }
            String x = r.get(i);
            Double v = pctLoose(x);
            if ((v != null && v != 0.0) || (!norm(x).isEmpty() && v == null)) {
                return true;
            }
        }
        return false;
    }

    // ---------- AREA ----------
    /** 세부 표의 항목 행 '평가영역 | 이름 (20%) | …' (+ 같은 표의 시기 행). 없으면 null. */
    public static List<Item> areaItems(List<List<String>> g) {
        for (int i = 0; i < g.size(); i++) {
            List<String> r = g.get(i);
            if (r.size() < 2 || !"name".equals(labelOf(r.get(0)))) {
                continue;
            }
            List<int[]> cs = new ArrayList<>();
            List<Matcher> ms = new ArrayList<>();
            boolean ok = true;
            for (int c = 1; c < r.size(); c++) {
                String x = r.get(c).replaceAll("\\s+", " ").strip();
                if (norm(x).isEmpty() || x.equals(r.get(c - 1).replaceAll("\\s+", " ").strip())) {
                    continue;
                }
                Matcher m = AREA_CELL.matcher(x);
                if (!m.matches()) {
                    ok = false;
                    break;
                }
                cs.add(new int[] {c});
                ms.add(m);
            }
            if (!ok || ms.isEmpty()) {
                continue;
            }
            List<String> timing = null;
            for (List<String> row : g.subList(i + 1, g.size())) {
                if (!row.isEmpty() && "timing".equals(labelOf(row.get(0)))) {
                    timing = row;
                    break;
                }
            }
            List<Item> out = new ArrayList<>();
            for (int k = 0; k < ms.size(); k++) {
                int c = cs.get(k)[0];
                out.add(new Item(ms.get(k).group("name").strip(), Double.valueOf(ms.get(k).group("w")), null,
                        timing != null ? clean(cell(timing, c), 40) : null));
            }
            return out;
        }
        return null;
    }

    // ---------- 평가표인지 ----------
    public static boolean isUnit(List<List<String>> g) {
        if (g.isEmpty()) {
            return false;
        }
        String flat = String.join(" ", g.stream().map(r -> String.join(" ", r)).toList());
        if (!g.get(0).isEmpty() && norm(g.get(0).get(0)).matches(".*(방안|동점자).*")) {
            return false;
        }
        boolean hasExam = g.stream().flatMap(List::stream).anyMatch(RatioRules::isExam);
        if (flat.contains("수행") && !hasExam) {
            return perfOnlyUnit(g);
        }
        if (!flat.contains("수행") && hasExam) {
            // 구분 열 없이 '1차시험 · 과제명…' 행만 있는 표 (noTypeColumn)
            try {
                Result r = famRow(g);
                return r != null && r.perfTotal() != null && r.perfTotal() > 0 && r.examTotal() != null;
            } catch (RuntimeException e) {
                return false;
            }
        }
        if (!flat.contains("수행") || !hasExam) {
            return false;
        }
        boolean sepRow = g.stream().anyMatch(r -> r.size() > 1
                && r.subList(1, r.size()).stream().anyMatch(x -> isPerf(x) && !isExam(x))
                && r.subList(1, r.size()).stream().anyMatch(x -> isExam(x) && !isPerf(x)));
        boolean sepCol = false;
        int w = g.get(0).size();
        if (g.stream().allMatch(r -> r.size() == w)) {
            for (int c = 0; c < w && !sepCol; c++) {
                boolean p = false, e = false;
                for (int r = 1; r < g.size(); r++) {
                    String x = g.get(r).get(c);
                    p |= isPerf(x) && !isExam(x);
                    e |= isExam(x) && !isPerf(x);
                }
                sepCol = p && e;
            }
        }
        if (!(sepRow || sepCol)) {
            return perfOnlyUnit(g);
        }
        boolean ratioLabel = g.stream().flatMap(List::stream).anyMatch(x -> {
            String l = labelOf(x);
            return "ratio".equals(l) || "max_ratio".equals(l);
        });
        boolean perfPct = g.stream().flatMap(List::stream).anyMatch(x -> isPerf(x) && pct(x) != null);
        boolean belowPct = false;
        for (int i = 0; i + 1 < g.size() && !belowPct; i++) {
            for (int c = 0; c < g.get(i).size(); c++) {
                if (isPerf(g.get(i).get(c)) && pct(cell(g.get(i + 1), c)) != null) {
                    belowPct = true;
                    break;
                }
            }
        }
        return ratioLabel || perfPct || belowPct;
    }

    private static boolean perfOnlyUnit(List<List<String>> g) {
        List<List<String>> gg = dropDupLabelCol(g);
        if (gg.stream().noneMatch(RatioRules::perfOnlyRow)) {
            return false;
        }
        if (gg.stream().flatMap(List::stream).noneMatch(x -> "ratio".equals(labelOf(x)) || "max_ratio".equals(labelOf(x)))) {
            return false;
        }
        Result r = famCol(g);
        return r != null && !r.items().isEmpty() && r.items().stream().allMatch(i -> i.weightPercent() != null)
                && Math.abs(sumW(r.items()) - 100) <= 0.6;
    }

    // ---------- 검증 · 정리 ----------
    static final Pattern NOT_ITEM = Pattern.compile("^(서\\s*[ㆍ·･]?\\s*논술형?|논술형|선택형|단답형|구술형?|그\\s*외(\\s*유형)?.*|서\\s*[ㆍ·･]?\\s*논술형?\\s*.*형|소계|합계|계|총점|"
            + "학기말\\s*반영\\s*비율.*|반영\\s*비율|중간(고사|평가)?|기말(고사|평가)?|정기\\s*시험|지필(평가)?|수행\\s*평가\\s*환산.*|"
            + "듣기|말하기|읽기|쓰기|어휘|문법|\\d+|없음|-|수행\\s*\\d+)$");
    static final Pattern CODE = Pattern.compile("^\\[?\\s*\\d{1,2}\\s*[가-힣ⅠⅡ]{1,6}\\s*\\d?\\s*-?\\s*\\d{2}\\s*-\\s*\\d{2}");

    /** 정리된 결과와 확인 사유. ratioOnly: 항목 이름은 없고(방식별 비율뿐) 지필+수행이 100으로 맞는 표. */
    public record Cleaned(Result result, List<String> reasons, boolean ratioOnly) {
    }

    public static Cleaned clean(Result r) {
        if (r == null) {
            return new Cleaned(null, List.of("표 구조 해석 실패"), false);
        }
        List<Item> items = r.items().stream().filter(it -> {
            String l = it.label() == null ? "" : it.label().replaceAll("\\s+", " ").strip();
            return !NOT_ITEM.matcher(l).matches() && !CODE.matcher(l).find();
        }).toList();
        boolean droppedAll = !r.items().isEmpty() && items.isEmpty();
        // 병합 칸으로 모든 (이름, 비율)이 정확히 두 번씩 → 하나로
        if (!items.isEmpty() && items.size() % 2 == 0) {
            Map<String, Integer> cnt = new HashMap<>();
            for (Item it : items) {
                cnt.merge(norm(it.label()) + "|" + it.weightPercent(), 1, Integer::sum);
            }
            if (cnt.values().stream().allMatch(v -> v == 2)) {
                Set<String> seen = new HashSet<>();
                items = items.stream().filter(it -> seen.add(norm(it.label()) + "|" + it.weightPercent())).toList();
            }
        }
        Double perf = r.perfTotal(), exam = r.examTotal();
        boolean mismatch = false;
        if (!items.isEmpty() && items.stream().allMatch(i -> i.weightPercent() != null)) {
            double s = sumW(items);
            if (perf == null && s > 0 && s <= 100) {
                perf = s;
            } else if (perf != null && Math.abs(perf - s) > 0.6 && Math.abs(s - 100) > 0.6) {
                mismatch = true;
            }
            if (!mismatch && perf != null && (exam == null || Math.abs(exam + perf - 100) > 0.6)) {
                exam = round2(100 - perf);
            }
        }
        // 방식별 비율만(서·논술형/그 외) 있는 표: 지필+수행이 100이면 비율만 채운다
        if (droppedAll && r.perfTotal() != null && r.examTotal() != null && Math.abs(r.perfTotal() + r.examTotal() - 100) <= 0.6
                && Math.abs(sumW(r.items()) - r.perfTotal()) <= 0.6) {
            return new Cleaned(new Result(r.perfTotal(), r.examTotal(), List.of(), 0), List.of(), true);
        }
        List<String> reasons = new ArrayList<>();
        if (mismatch) {
            reasons.add("항목 비율 합 불일치");
        }
        if (items.isEmpty()) {
            reasons.add("수행 항목 없음");
        } else if (items.stream().anyMatch(i -> i.weightPercent() == null)) {
            reasons.add("항목 비율 빠짐");
        }
        if (perf == null || !(perf > 0 && perf <= 100)) {
            reasons.add("수행 총비율 없음");
        }
        boolean noNames = !items.isEmpty() && items.stream().allMatch(i -> i.label() == null || i.label().isBlank());
        if (noNames && reasons.isEmpty()) {
            return new Cleaned(new Result(perf, exam, List.of(), 0), List.of(), true);
        }
        return new Cleaned(new Result(perf, exam, items, r.namesInTable()), reasons, false);
    }

    static double round2(double v) {
        return Math.round(v * 100) / 100.0;
    }
}
