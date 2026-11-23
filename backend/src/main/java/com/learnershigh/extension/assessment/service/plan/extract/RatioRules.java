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
            "^(평가)?영역\\s*\\d+$|^수행\\s*평가\\s*\\d*$|^\\d+\\s*(차|회)(\\s*시험)?$|^\\d+\\s*순위$|^[\\d.]+\\s*[%점]?$|^[•▸⦁∙·Ÿ\\-–―_]|^(합계|계|미실시|해당\\s*없음)$"
                    + "|^[(（]?[\u2460-\u2473\u2776-\u277F가-하]?[)）.]?$|^[(（]?\\d{1,2}[)）.]$"
                    + "|^(평가\\s*)?(영역|과제|항목)\\s*명$|^수행\\s*(평가\\s*)?과제\\s*명?$|^평가\\s*(과제\\s*)?명$");
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

    /** 평가 방법 낱말로만 된 칸 (프로젝트, 서술·논술, 조사·관찰보고서, 실험·실습, 구술·발표, 실기 …). */
    static final Pattern METHOD_ONLY = Pattern.compile(
            "^(서술|논술|서답|서|논|구술|발표|토의|토론|프로젝트|실험|실습|실기|시연|포트폴리오|조사|관찰|보고서|기록|자기평가|동료평가|기타|형|평가"
                    + "|선택|단답|[・·ㆍ･‧/,.()（）])+$");

    static boolean methodOnly(String s) {
        String n = norm(s);
        return !n.isEmpty() && METHOD_ONLY.matcher(n).matches();
    }

    static final Pattern UNIT_LABEL = Pattern.compile("교육과정|단원|내용체계");

    /** 표 머리 라벨 종류: ratio · max_ratio · max · name · unit · timing · element · method · null */
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
        if (UNIT_LABEL.matcher(n).find() && !n.contains("과제") && !n.contains("평가명") && !n.contains("성취기준")) {
            return "unit";   // 교육과정 영역·단원 — 항목 이름 행으로는 마지막에만 쓴다
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
    /** 비율표 왼쪽의 학년·학점·학기 같은 안내 열 이름. 이 열들 뒤에 '구분' 라벨 열이 온다. */
    static final Set<String> META_COLS = Set.of("학년", "단위", "단위(학점)", "학점", "학기", "학년도", "시수", "과목", "과목명", "교과", "학급");

    /**
     * 학년 | 단위(학점) | 학기 | 구분 | 수행평가 … 처럼 라벨 열 앞에 안내 열이 붙은 표: 안내 열을 떼어 라벨 열이 첫 열이 되게 한다.
     * 머리 행의 앞 칸이 모두 안내 열 이름이고, 그 뒤 열에 비율 라벨이 실제로 있을 때만.
     */
    static List<List<String>> dropMetaCols(List<List<String>> g) {
        if (g.isEmpty()) {
            return g;
        }
        List<String> h = g.get(0);
        int k = 0;
        while (k < h.size() && k < 4 && META_COLS.contains(norm(h.get(k)))) {
            k++;
        }
        if (k == 0 || k + 2 >= h.size()) {
            return g;
        }
        final int kk = k;
        boolean ratioLabel = g.stream().anyMatch(r -> r.size() > kk && "ratio".equals(labelOf(r.get(kk))));
        if (!ratioLabel) {
            return g;
        }
        return g.stream().map(r -> r.size() > kk ? r.subList(kk, r.size()) : r).toList();
    }

    static List<List<String>> dropDupLabelCol(List<List<String>> g) {
        g = dropMetaCols(g);
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
        // 수행·정기시험 칸 아래 유형 열과 '소계' 열이 함께 있는 표: 총비율은 소계 칸 값 (소계 열은 항목이 아니다)
        if (!perfOnly && !ratioRows.isEmpty()) {
            List<String> rr0 = ratioRows.get(0);
            for (List<String> sub : g.subList(ti + 1, Math.min(g.size(), ti + 4))) {
                List<Integer> pSub = pcols.stream().filter(c -> norm(cell(sub, c)).matches("소계|계")).toList();
                List<Integer> eSub = ecols.stream().filter(c -> norm(cell(sub, c)).matches("소계|계")).toList();
                if (pSub.size() != 1 || pcols.size() < 2) {
                    continue;
                }
                Double pv = pctLoose(cell(rr0, pSub.get(0)));
                // 실시하지 않는 시험은 '•', '-' 처럼 숫자 없이 적는다 → 0
                List<Double> ev = eSub.stream().map(c -> cell(rr0, c).matches("\\D*") ? Double.valueOf(0) : pctLoose(cell(rr0, c))).toList();
                if (pv != null && !eSub.isEmpty() && ev.stream().allMatch(Objects::nonNull) && Math.abs(pv + sum(ev) - 100) <= 0.6) {
                    total = pv;
                    examTotal = sum(ev);
                    pcols.removeAll(pSub);
                    ecols.removeAll(eSub);
                }
                break;
            }
        }
        // 수행·정기시험 칸이 평가 유형(서·논술형 / 그 외 유형 …) 하위 열로만 나뉜 표: 총비율은 하위 열의 합.
        // 하위 열이 모두 유형 낱말이고 지필+수행 합이 100일 때만 (항목 이름은 세부 표에서 찾는다)
        List<String> typeSub = null;
        if (!perfOnly && pct(tr.get(pcols.get(0))) == null && !ratioRows.isEmpty() && pcols.size() > 1 && ti + 1 < g.size()) {
            List<String> sub = g.get(ti + 1);
            List<String> rr0 = ratioRows.get(0);
            if (pcols.stream().allMatch(c -> TYPE_WORD.matcher(norm(cell(sub, c))).matches())) {
                List<Double> pv = pcols.stream().map(c -> pctLoose(cell(rr0, c))).toList();
                List<Double> ev = ecols.stream().map(c -> pctLoose(cell(rr0, c))).toList();
                if (pv.stream().allMatch(Objects::nonNull) && ev.stream().allMatch(Objects::nonNull)
                        && Math.abs(sum(pv) + sum(ev) - 100) <= 0.6) {
                    total = sum(pv);
                    examTotal = sum(ev);
                    typeSub = sub;
                }
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
        // 첫 반영비율 행이 열마다(정기시험 하위 열 포함) 비율을 적은 표: 수행 열 합 + 정기시험 열 합 = 100 이면 그 합이 총비율이다.
        // (첫 칸 하나만 읽으면 지필 0%·수행 25% 처럼 한 열 값이 총비율로 잡힌다)
        if (!perfOnly && typeSub == null && !ratioRows.isEmpty() && !ecols.isEmpty()) {
            List<String> rr0 = ratioRows.get(0);
            List<Double> pv = pVals.apply(rr0);
            List<Double> ev = ecols.stream().filter(c -> !empty(cell(rr0, c))).map(c -> pctLoose(cell(rr0, c))).toList();
            if (pv != null && !ev.isEmpty() && ev.stream().allMatch(Objects::nonNull) && Math.abs(sum(pv) + sum(ev) - 100) <= 0.6
                    && (total == null || Math.abs(total - sum(pv)) > 0.6)) {
                total = sum(pv);
                examTotal = sum(ev);
            }
        }
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
        List<List<String>> methodRows = rows.getOrDefault("method", List.of());
        labelRows.addAll(methodRows);
        labelRows.addAll(rows.getOrDefault("element", List.of()));
        labelRows.addAll(rows.getOrDefault("unit", List.of()));
        List<List<String>> mx = rows.containsKey("max") ? rows.get("max") : rows.get("max_ratio");
        List<List<String>> timing = rows.get("timing");
        List<Item> items = new ArrayList<>();
        List<Integer> itemCols = new ArrayList<>();
        List<Integer> cols = itemRatio != null ? uniqCols.apply(itemRatio) : pcols;
        for (int c : cols) {
            String name = "";
            String methodWord = null;
            for (List<String> r : labelRows) {
                if (c < r.size() && acceptableLabel(r.get(c))) {
                    // 평가 방법 행의 '프로젝트'·'서술·논술' 같은 방법 낱말은 과제 이름이 아니다 — 다음 행(영역 등)을 먼저 본다
                    if (methodRows.contains(r) && (methodOnly(r.get(c)) || NOT_ITEM.matcher(r.get(c).replaceAll("\\s+", " ").strip()).matches())) {
                        if (methodWord == null) {
                            methodWord = r.get(c);
                        }
                        continue;
                    }
                    name = r.get(c);
                    break;
                }
            }
            Double rv = itemRatio != null ? val.apply(itemRatio, c) : null;
            if (norm(name).isEmpty() && itemRatio != null) {
                // 비율 칸 자체가 '문제해결 (40)'처럼 과제 이름을 품은 경우 — 방법 낱말보다 먼저
                name = cell(itemRatio, c).split("[(（]")[0];
                if (!acceptableLabel(name) || methodOnly(name)) {
                    name = "";
                }
            }
            if (norm(name).isEmpty() && methodWord != null) {
                name = methodWord;   // 다른 이름이 없으면 그대로 (방식별 비율표는 뒤에서 비율만 쓴다)
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
            itemCols.add(c);
        }
        // 병합 칸 복제로 같은 항목이 두 번 들어간 경우(이름·비율·만점·시기 모두 같음) 하나로. 합이 맞을 때만
        if (items.size() > 1 && total != null) {
            List<Item> uniq = new ArrayList<>();
            List<Integer> uniqCols2 = new ArrayList<>();
            Set<String> seen = new HashSet<>();
            for (int k = 0; k < items.size(); k++) {
                Item it = items.get(k);
                String key = norm(it.label()) + "|" + it.weightPercent() + "|" + it.maxScore() + "|" + norm(it.timing());
                if (seen.contains(key) && !norm(it.label()).isEmpty()) {
                    continue;
                }
                seen.add(key);
                uniq.add(it);
                uniqCols2.add(itemCols.get(k));
            }
            if (Math.abs(sumW(uniq) - total) <= 0.6 && Math.abs(sumW(items) - total) > 0.6) {
                items = uniq;
                itemCols = uniqCols2;
            }
        }
        // 과제 이름이 있을 수 있는 행: 평가유형 행 아래 ~ 항목 비율 행 위 (머리·설명 행은 빼고)
        int ratioAt = -1;
        for (int k = 0; k < g.size() && itemRatio != null; k++) {
            if (g.get(k) == itemRatio) {
                ratioAt = k;
            }
        }
        List<List<String>> headRows = ratioAt > ti + 1 ? g.subList(ti + 1, ratioAt) : List.of();
        List<Item> beforeMerge = items;
        items = mergeUnderParent(items, itemCols, rows.getOrDefault("name", List.of()), headRows, total);
        items = foldSameName(items, total, items == beforeMerge ? itemCols : null, headRows);
        if (typeSub != null) {
            // 유형별 비율뿐: 유형 이름으로 두면 clean()이 항목이 아님을 알고 '방식별 비율만' 표로 다룬다
            items = new ArrayList<>();
            for (int c : pcols) {
                Double v = pctLoose(cell(ratioRows.get(0), c));
                if (v != null && v != 0) {
                    String type = clean(cell(typeSub, c), 40);
                    // NOT_ITEM 이 모르는 유형 낱말(기타·실기형 …)도 항목이 아니다
                    items.add(new Item(NOT_ITEM.matcher(type.replaceAll("\\s+", " ").strip()).matches() ? type : "그 외 유형", v, null, null));
                }
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

    /**
     * 이름 칸이 병합돼 이웃한 두 열에 같은 이름이 들어가고 비율은 열마다 나뉜 표 (민족 운동 5% + 15%):
     * 항목 비율 합이 수행 비율과 맞을 때만 한 항목으로 합친다 (합은 그대로라 검사 결과는 바뀌지 않는다).
     */
    static List<Item> foldSameName(List<Item> items, Double total) {
        return foldSameName(items, total, null, List.of());
    }

    /** cols 가 있으면(항목과 열이 1:1) 다른 행에 열마다 다른 과제 이름이 있는 이웃 쌍은 합치지 않는다. */
    static List<Item> foldSameName(List<Item> items, Double total, List<Integer> cols, List<List<String>> otherRows) {
        if (items.size() < 2 || total == null || items.stream().anyMatch(i -> i.weightPercent() == null)
                || Math.abs(sumW(items) - total) > 0.6) {
            return items;
        }
        List<Item> out = new ArrayList<>();
        for (int k = 0; k < items.size(); k++) {
            Item it = items.get(k);
            Item last = out.isEmpty() ? null : out.get(out.size() - 1);
            boolean separate = cols != null && k > 0 && distinctBelow(otherRows, null, List.of(cols.get(k - 1), cols.get(k)));
            if (last != null && !separate && !norm(it.label()).isEmpty() && norm(it.label()).equals(norm(last.label()))) {
                Double mx = last.maxScore() != null && it.maxScore() != null ? round2(last.maxScore() + it.maxScore()) : null;
                out.set(out.size() - 1, new Item(last.label(), round2(last.weightPercent() + it.weightPercent()), mx,
                        last.timing() != null && !last.timing().isBlank() ? last.timing() : it.timing()));
            } else {
                out.add(it);
            }
        }
        return out;
    }

    /**
     * 행 방향 표에서 한 과제가 평가 방법별로 여러 행에 나뉜 경우 (같은 과제명·같은 시기, 실험·실습 5 + 프로젝트 20):
     * 이웃한 행을 한 항목으로 합친다. 비율이 모두 있을 때만 (합은 그대로라 검사 결과는 바뀌지 않는다).
     */
    static List<Item> foldSameTaskRows(List<Item> items) {
        if (items.size() < 2 || items.stream().anyMatch(i -> i.weightPercent() == null)) {
            return items;
        }
        List<Item> out = new ArrayList<>();
        for (Item it : items) {
            Item last = out.isEmpty() ? null : out.get(out.size() - 1);
            if (last != null && !norm(it.label()).isEmpty() && norm(it.label()).equals(norm(last.label()))
                    && norm(it.timing()).equals(norm(last.timing()))) {
                Double mx = last.maxScore() != null && it.maxScore() != null ? round2(last.maxScore() + it.maxScore()) : null;
                out.set(out.size() - 1, new Item(last.label(), round2(last.weightPercent() + it.weightPercent()), mx, last.timing()));
            } else {
                out.add(it);
            }
        }
        return out;
    }

    /** 평가 유형 낱말로만 된 칸 (서·논술형, 실습형, 활동형 …) — 항목 이름이 아니다. */
    static final Pattern TYPE_ONLY = Pattern.compile(
            "^(서|논술|서술|선택|단답|구술|실습|활동|수행|실기|지필|그외|기타|형|포트폴리오|발표|토론|토의|관찰|실험|보고서|프로젝트|[・·ㆍ･‧/,()（）\\[\\]])+$");

    static boolean typeOnly(String s) {
        String n = norm(s);
        return n.isEmpty() || TYPE_ONLY.matcher(n).matches() || NOT_ITEM.matcher(s.replaceAll("\\s+", " ").strip()).matches();
    }

    /**
     * 한 항목이 여러 열을 차지하는 표: 위쪽 '영역·과제' 행의 병합 칸(이웃 열에 같은 이름)이 그 열들을 덮을 때.
     * 자식 열이 같은 칸의 복제거나 유형 칸(논술형·활동형)뿐이면 한 항목으로 합친다(비율·만점 합, 시기는 첫 값).
     * 자식이 서로 다른 실제 과제면 합치지 않고 이름만 '부모 › 자식'으로 붙인다.
     */
    static List<Item> mergeUnderParent(List<Item> items, List<Integer> cols, List<List<String>> nameRows, List<List<String>> otherRows, Double total) {
        if (items.size() < 2 || nameRows.isEmpty()) {
            return items;
        }
        // 자식 열이 병합 칸 복제인지(하나로), 한 과제를 나눈 열인지(합), 같은 비율이 복제된 열인지(한 값)는 수행 비율 합으로 가린다
        List<Item> dedup = mergeUnderParent(items, cols, nameRows, otherRows, DEDUPE);
        if (total == null || Math.abs(sumW(dedup) - total) <= 0.6) {
            return dedup;
        }
        List<Item> collapsed = mergeUnderParent(items, cols, nameRows, otherRows, COLLAPSE);
        List<Item> summed = mergeUnderParent(items, cols, nameRows, otherRows, SUM);
        if (Math.abs(sumW(collapsed) - total) <= 0.6) {
            return collapsed;
        }
        if (Math.abs(sumW(summed) - total) <= 0.6) {
            return summed;
        }
        if (Math.abs(sumW(items) - total) <= 0.6) {
            return items;   // 합치면 합이 깨지고 합치기 전에는 맞았다면 합치지 않는다
        }
        // 맞는 쪽이 없으면 합치지 않는다: 자식 이름을 살리고, 부풀린 합이 '항목 비율=수행 안 비중'으로 오인되지 않게
        return mergeUnderParent(items, cols, nameRows, otherRows, NO_SUM);
    }

    private static final int DEDUPE = 0;
    private static final int SUM = 1;
    private static final int COLLAPSE = 2;
    private static final int NO_SUM = 3;   // 이름만 붙이고 비율은 열마다 그대로

    private static List<Item> mergeUnderParent(List<Item> items, List<Integer> cols, List<List<String>> nameRows,
            List<List<String>> otherRows, int mode) {
        for (List<String> parent : nameRows) {
            List<Item> out = new ArrayList<>();
            boolean changed = false;
            int i = 0;
            while (i < items.size()) {
                String p = cell(parent, cols.get(i));
                int j = i;
                while (j + 1 < items.size() && cols.get(j + 1) == cols.get(j) + 1 && !norm(p).isEmpty()
                        && norm(cell(parent, cols.get(j + 1))).equals(norm(p))) {
                    j++;
                }
                if (j == i || !acceptableLabel(p) || labelOf(p) != null || isPerf(p) || isExam(p) || typeOnly(p)) {
                    out.addAll(items.subList(i, j + 1));
                    i = j + 1;
                    continue;
                }
                // 병합 칸 복제로 똑같이 들어간 자식은 하나로 (더하지 않는다)
                List<Item> part = new ArrayList<>();
                Set<String> seen = new HashSet<>();
                for (Item it : items.subList(i, j + 1)) {
                    if (mode == SUM || seen.add(norm(it.label()) + "|" + it.weightPercent() + "|" + it.maxScore() + "|" + norm(it.timing()))) {
                        part.add(it);
                    }
                }
                String parentName = clean(p, 120);
                boolean sameTask = part.stream().allMatch(it -> typeOnly(it.label()) || norm(it.label()).equals(norm(p)));
                Double w0 = part.get(0).weightPercent();
                if (mode == COLLAPSE && part.size() > 1 && w0 != null && part.stream().allMatch(x -> w0.equals(x.weightPercent()))) {
                    // 같은 비율이 자식 열마다 복제된 표: 한 과제 한 비율
                    Item first = part.get(0);
                    out.add(new Item(parentName, w0, first.maxScore(), first.timing()));
                } else if (part.size() == 1) {
                    Item it = part.get(0);
                    out.add(new Item(typeOnly(it.label()) ? parentName : it.label(), it.weightPercent(), it.maxScore(), it.timing()));
                } else if (sameTask && mode == SUM && distinctBelow(otherRows, parent, cols.subList(i, j + 1))) {
                    // 같은 글자가 이웃 칸에 되풀이됐을 뿐 다른 행에 열마다 다른 과제 이름이 있으면 서로 다른 과제다 (더하지 않는다)
                    out.addAll(items.subList(i, j + 1));
                    i = j + 1;
                    continue;
                } else if (sameTask && mode != NO_SUM) {
                    boolean allW = part.stream().allMatch(x -> x.weightPercent() != null);
                    boolean allM = part.stream().allMatch(x -> x.maxScore() != null);
                    out.add(new Item(parentName, allW ? round2(sumW(part)) : null,
                            allM ? round2(part.stream().mapToDouble(Item::maxScore).sum()) : null, part.get(0).timing()));
                } else {
                    for (Item it : part) {
                        String name = typeOnly(it.label()) || norm(it.label()).equals(norm(p)) ? parentName
                                : norm(it.label()).startsWith(norm(p)) ? it.label() : parentName + " › " + it.label();
                        out.add(new Item(name, it.weightPercent(), it.maxScore(), it.timing()));
                    }
                }
                changed = true;
                i = j + 1;
            }
            if (changed) {
                return out;
            }
        }
        return items;
    }

    static final Pattern DESC_ROW = Pattern.compile("성취|요소|기준|시기|방법|단원|내용|유의|비고|주안점|척도");

    /** 다른 행 하나가 이 열들마다 서로 다른 과제 이름(유형 낱말·라벨 아님)을 갖는가 */
    private static boolean distinctBelow(List<List<String>> rows, List<String> parent, List<Integer> cols) {
        // 이름이 되풀이된 행(부모)이 머리 행 안에 있으면 그보다 위 행만 본다: 아래 행의 하위 칸(탐구과정·탐구결과)은 한 과제의 구성이다
        int top = rows.size();
        for (int k = 0; k < rows.size(); k++) {
            List<String> r = rows.get(k);
            boolean repeats = parent != null ? r == parent
                    : cols.stream().map(c -> norm(cell(r, c))).distinct().count() == 1 && acceptableLabel(cell(r, cols.get(0)))
                            && !typeOnly(cell(r, cols.get(0))) && labelOf(cell(r, cols.get(0))) == null;
            if (repeats) {
                top = k;
                break;
            }
        }
        for (List<String> r : rows.subList(0, top)) {
            // 과제 이름 행만: 성취기준·평가요소·채점 기준·시기·방법 같은 설명 행은 열마다 글이 달라도 과제 구분이 아니다
            String rowLabel = labelOf(cell(r, 0));
            if (r == parent || DESC_ROW.matcher(norm(cell(r, 0))).find()
                    || "ratio".equals(rowLabel) || "max".equals(rowLabel) || "max_ratio".equals(rowLabel) || "timing".equals(rowLabel)) {
                continue;
            }
            Set<String> names = new HashSet<>();
            for (int c : cols) {
                String v = cell(r, c);
                if (acceptableLabel(v) && !typeOnly(v) && labelOf(v) == null && norm(v).length() <= 40 && !v.contains("[") && !v.matches(".*\\d\\s*[%점].*")) {
                    names.add(norm(v));
                }
            }
            if (names.size() == cols.size()) {
                return true;
            }
        }
        return false;
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
            items.add(new Item(nc != null ? clean(rowName(r, head, nc), 120) : null, pctLoose(cell(r, rc)), mxv,
                    col.containsKey("timing") ? clean(cell(r, col.get("timing")), 40) : null));
        }
        Double total = items.isEmpty() ? null : items.stream().filter(i -> i.weightPercent() != null).mapToDouble(Item::weightPercent).sum();
        items = foldSameTaskRows(items);
        List<Double> ev = examRows.stream().map(r -> pctLoose(cell(r, rc))).filter(Objects::nonNull).toList();
        Double examTotal = examRows.isEmpty() ? null : sum(ev);
        return new Result(total, examTotal, items, 0);
    }

    /**
     * 행 방향 표의 항목 이름: 머리 '평가 영역'이 두 열에 병합돼 '영역1 | 감성과 논리로 …'처럼 번호 칸과 이름 칸이 나뉘면
     * 번호(자리표시) 칸 대신 같은 머리 아래의 이름 칸을 쓴다.
     */
    static String rowName(List<String> r, List<String> head, int nc) {
        String v = cell(r, nc);
        if (acceptableLabel(v)) {
            return v;
        }
        for (int c = nc + 1; c < head.size() && norm(head.get(c)).equals(norm(head.get(nc))); c++) {
            if (acceptableLabel(cell(r, c)) && labelOf(cell(r, c)) == null) {
                return cell(r, c);
            }
        }
        return v;
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
    /** 평가 유형 하위 열 이름 (공백 뺀 값). */
    static final Pattern TYPE_WORD = Pattern.compile(
            "^(서[ㆍ·･・]?논술형?|서술형?|논술형?|선택형|단답형|구술형?|서답형|실기형?|실습형?|활동형?|그외(유형)?|기타(유형)?|서[ㆍ·･・]?논술형?외(유형)?)$");
    static final Pattern NOT_ITEM = Pattern.compile("^(서\\s*[ㆍ·･・‧]?\\s*논술형?|논술형|선택형|단답형|구술형?|그\\s*외(\\s*유형)?.*|서\\s*[ㆍ·･・‧]?\\s*논술형?\\s*.*형|"
            + "서\\s*[ㆍ·･・‧]?\\s*논술형?\\s*외(\\s*유형)?|소계|합계|계|총점|"
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
            } else if (perf != null && Math.abs(perf - s) > 0.6) {
                // 항목 합 100, 수행 비율은 100 아님: 항목이 수행 안 비중일 수도, 수행 비율을 한 항목 칸에서 잘못 읽었을 수도 있다
                final double pf = perf;
                if (exam != null && Math.abs(exam + s - 100) <= 0.6) {
                    perf = s;   // 적힌 지필 비율(예: 0%)이 항목 합과 맞는다 → 수행 = 항목 합
                } else if (exam != null && Math.abs(exam + perf - 100) > 0.6) {
                    mismatch = true;   // 적힌 지필 비율이 어느 쪽과도 안 맞는다
                } else if (items.size() > 1 && items.stream().anyMatch(i -> Math.abs(i.weightPercent() - pf) <= 0.6)) {
                    mismatch = true;   // 수행 비율이 한 항목 비율과 같다: 항목 칸 하나를 수행 총비율로 읽은 것일 수 있다
                }
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
