package com.learnershigh.extension.assessment.service.plan.extract;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 수행평가 세부 표 → 과제 정보·채점 기준·기본 점수. 113개 학교 세부 표에서 채점 기준은 97곳에 있었고,
 * 세로형(요소 | 기준 | 배점, 큰 요소 › 세부 요소)과 가로형(A(40점) | B(38점) …) 두 서식으로 대부분 읽힌다.
 */
public final class RubricRules {

    private RubricRules() {
    }

    public record Level(String level, Double score, Double scoreTo, String description) {
    }

    public record Element(String element, Double maxScore, String kind, List<Level> levels) {
    }

    public record Base(double score, String condition) {
    }

    /** 수행 항목 하나의 세부. */
    public static final class Detail {
        public String taskName;
        public Double maxScore;
        public String timing;
        public String description;
        public List<String> method = List.of();
        public final List<Element> rubric = new ArrayList<>();
        public final List<Base> baseScore = new ArrayList<>();
        public final List<String> notes = new ArrayList<>();
        public final List<String> check = new ArrayList<>();
        public String info;
        public final List<SourceTable> sources = new ArrayList<>();
        /** 채점 기준을 읽은 원문 표 (근거 위치용) */
        public SourceTable rubricSource;
    }

    static String ns(String s) {
        return s == null ? "" : s.replaceAll("[\\s·ㆍ‧･・()（）\\[\\]:]", "");
    }

    static String sp(String s) {
        return s == null ? "" : s.replaceAll("\\s+", " ").strip();
    }

    static final Pattern SCORE = Pattern.compile("(?<![\\d.])(\\d{1,3}(?:\\.\\d+)?)\\s*(?:[~∼\\-–]\\s*(\\d{1,3}(?:\\.\\d+)?))?\\s*점");
    static final Pattern NUM_ONLY = Pattern.compile("^\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*(?:[~∼\\-–]\\s*(\\d{1,3}(?:\\.\\d+)?))?\\s*점?\\s*(이하|이상|미만)?\\s*$");
    static final Pattern GRADED = Pattern.compile("^(\\d{1,3}(?:\\.\\d+)?)\\s*점?\\s*[(（]\\s*(?:[A-E][+\\-]?|상|중|하)\\s*[)）]$");
    static final Pattern LEVEL = Pattern.compile("^\\s*(A|B|C|D|E|F|상|중상|중|중하|하|매우\\s*우수|우수|보통|미흡|미도달|[1-5]\\s*수준)\\s*(?:[(（].*)?$");
    static final Pattern CHECKED = Pattern.compile("[■☑▣◼√✔]\\s*([^□■☑▣◼◻☐√✔]+)");
    static final Pattern L_TASK = Pattern.compile("^(평가)?영역명?(만점)?$|^평가영역명|^NEIS수행평가영역명|^평가과제|^과제명|^평가명$|^수행평가명");
    static final Pattern L_MAX = Pattern.compile("^(영역)?만점$|^배점만점$|^총점$|^영역만점");
    static final Pattern L_DESC = Pattern.compile("^수행과제|^과제내용|^평가내용$|^내용$|^평가과제내용");
    static final Pattern L_TIME = Pattern.compile("^평가시기|^시기$|^실시시기");
    static final Pattern L_METHOD = Pattern.compile("^평가방법|^평가유형$");
    static final Pattern L_NOTE = Pattern.compile("유의사항|미응시|결시|처리기준|기타사항|학생안내");
    static final Pattern H_ELEM = Pattern.compile("^(채점|평가)?요소\\d*|^채점영역|^평가영역$|^세부요소|^평가항목");
    static final Pattern H_DESC = Pattern.compile("^채점기준|^평가기준|^기대수행|^수행수준|^수행특성|^세부기준|^성취수준별|^채점내용|^기준$");
    static final Pattern H_SCORE = Pattern.compile("^배점|^점수|^부여점수|^득점|^세부점수|^환산점");
    static final Pattern H_LEVEL = Pattern.compile("^등급|^수준$|^척도$|^성취수준$|^평가등급|^부여등급");
    static final Pattern MAX_IN_NAME = Pattern.compile("[(（]\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*점?\\s*[)）]");
    static final Pattern BASE_WORDS = Pattern.compile("기본\\s*점수|백지|미제출|미참여|미응시|불성실|결석|결시|미인정");
    static final Pattern LABEL_ROW = Pattern.compile("^(평가)?(시기|방법|유형|요소|기준|내용|과제|영역명?)$|^성취기준|^반영비율|^만점|^교육과정|^평가유의|^유의사항");

    static Double num(String s) {
        Matcher m = Pattern.compile("(\\d{1,3}(?:\\.\\d+)?)").matcher(s == null ? "" : s);
        return m.find() ? Double.valueOf(m.group(1)) : null;
    }

    /** '25점', '25', '24~25점', '40(A+)', '15점 이하' → {점수, 끝점수|null}. 점수가 아니면 null. */
    static double[] scoreOf(String s) {
        String t = sp(s);
        Matcher m = GRADED.matcher(t);
        if (m.matches()) {
            return new double[] {Double.parseDouble(m.group(1)), Double.NaN};
        }
        m = NUM_ONLY.matcher(t);
        if (m.matches()) {
            return new double[] {Double.parseDouble(m.group(1)), m.group(2) != null ? Double.parseDouble(m.group(2)) : Double.NaN};
        }
        m = SCORE.matcher(t);
        if (t.length() <= 25 && m.find()) {
            return new double[] {Double.parseDouble(m.group(1)), m.group(2) != null ? Double.parseDouble(m.group(2)) : Double.NaN};
        }
        return null;
    }

    static List<String> dedupeRow(List<String> row) {
        List<String> out = new ArrayList<>();
        for (String x : row) {
            if (out.isEmpty() || !x.equals(out.get(out.size() - 1))) {
                out.add(x);
            }
        }
        return out;
    }

    // ---------- 채점 기준 ----------
    public static List<Element> rubric(List<List<String>> grid) {
        List<List<String>> g = new ArrayList<>();
        int w = 0;
        for (List<String> r : grid) {
            w = Math.max(w, r.size());
        }
        for (List<String> r : grid) {
            List<String> row = new ArrayList<>();
            for (int c = 0; c < w; c++) {
                row.add(c < r.size() ? sp(r.get(c)) : "");
            }
            g.add(row);
        }
        if (g.isEmpty()) {
            return List.of();
        }
        final int W = w;
        int hi = -1;
        for (int i = 0; i < g.size() && hi < 0; i++) {
            List<String> n = g.get(i).stream().map(RubricRules::ns).toList();
            if (n.stream().anyMatch(x -> H_ELEM.matcher(x).find()) && n.stream().anyMatch(x -> H_DESC.matcher(x).find() || H_SCORE.matcher(x).find())) {
                hi = i;
            }
        }
        for (int i = 0; i < g.size() && hi < 0; i++) {
            List<String> n = g.get(i).stream().map(RubricRules::ns).toList();
            if (n.stream().anyMatch(x -> H_DESC.matcher(x).find()) && n.stream().anyMatch(x -> H_SCORE.matcher(x).find() || H_LEVEL.matcher(x).find())) {
                hi = i;
            }
        }
        for (int i = 0; i < Math.min(4, g.size()) && hi < 0; i++) {
            if (g.get(i).stream().map(RubricRules::ns).anyMatch(x -> x.matches("^(평가과제|평가영역|채점영역|영역)(배점|만점)?$"))) {
                hi = i;
            }
        }
        if (hi < 0) {
            return List.of();
        }
        List<String> head = new ArrayList<>(g.get(hi).stream().map(RubricRules::ns).toList());
        if (head.stream().noneMatch(x -> H_ELEM.matcher(x).find()) && head.get(0).matches("^(평가과제|평가영역|채점영역|영역).*")) {
            head.set(0, "요소");
        }
        Integer ecol = null, lcol = null;
        List<Integer> scols = new ArrayList<>();
        for (int c = 0; c < head.size(); c++) {
            String x = head.get(c);
            if (ecol == null && H_ELEM.matcher(x).find()) {
                ecol = c;
            }
            if (H_SCORE.matcher(x).find()) {
                scols.add(c);
            }
            if (lcol == null && H_LEVEL.matcher(x).find()) {
                lcol = c;
            }
        }
        Set<String> headLabels = new HashSet<>(head);
        final int h = hi;
        List<List<String>> body0 = g.subList(hi + 1, g.size());
        if (ecol != null && ecol > 0) {
            List<String> left = body0.stream().map(r -> r.get(0)).filter(x -> !x.isEmpty()).toList();
            long withMax = left.stream().filter(x -> MAX_IN_NAME.matcher(x).find()).count();
            if (!left.isEmpty() && withMax >= Math.max(1, new HashSet<>(left).size() / 2)) {
                ecol = 0;
            }
        }
        // 가로형: 서로 다른 점수 값이 3개 이상인 행(설명 칸 없음) 아래로 설명 행들
        List<Element> horiz = new ArrayList<>();
        boolean horizontal = false;
        int i = hi + 1;
        while (i < g.size()) {
            List<String> r = g.get(i);
            List<int[]> scIdx = new ArrayList<>();
            List<double[]> sc = new ArrayList<>();
            for (int c = 0; c < r.size(); c++) {
                double[] s = scoreOf(r.get(c));
                if (s != null && (ecol == null || c != ecol)) {
                    scIdx.add(new int[] {c});
                    sc.add(s);
                }
            }
            Set<Double> vals = new HashSet<>();
            sc.forEach(s -> vals.add(s[0]));
            if (vals.size() >= 3 && r.stream().noneMatch(x -> x.length() > 20)) {
                horizontal = true;
                int first = scIdx.get(0)[0];
                int j = i + 1;
                while (j < g.size() && g.get(j).stream().filter(x -> scoreOf(x) != null).count() < 3) {
                    List<String> rr = g.get(j);
                    String elem = "";
                    for (int c = 0; c < first; c++) {
                        if (!rr.get(c).isEmpty()) {
                            elem = rr.get(c);
                        }
                    }
                    if (elem.isEmpty() && first > 0) {
                        elem = r.get(first - 1);
                    }
                    List<Level> levels = new ArrayList<>();
                    for (int k = 0; k < sc.size(); k++) {
                        int c = scIdx.get(k)[0];
                        Matcher lab = LEVEL.matcher(r.get(c));
                        levels.add(new Level(lab.matches() ? lab.group(1) : null, sc.get(k)[0],
                                Double.isNaN(sc.get(k)[1]) ? null : sc.get(k)[1], rr.get(c)));
                    }
                    if (levels.stream().anyMatch(lv -> !lv.description().isEmpty())) {
                        Element e = elem(elem, levels);
                        if (e != null) {
                            horiz.add(e);
                        }
                    }
                    j++;
                }
                i = j;
                continue;
            }
            i++;
        }
        if (horizontal) {
            return horiz;
        }
        // 세로형
        List<List<String>> body = new ArrayList<>();
        for (List<String> r : body0) {
            if (r.stream().allMatch(String::isEmpty)) {
                continue;
            }
            if (r.subList(0, Math.min(2, r.size())).stream().anyMatch(x -> L_NOTE.matcher(ns(x)).find() || ns(x).matches("합계|총점|계|소계"))) {
                break;
            }
            body.add(r);
        }
        if (body.isEmpty()) {
            return List.of();
        }
        java.util.function.BiFunction<Integer, java.util.function.Predicate<String>, Integer> cnt = (c, f) ->
                (int) body.stream().filter(r -> c < r.size() && f.test(r.get(c))).count();
        Integer scol = scols.isEmpty() ? null : scols.get(0);
        if (scols.size() > 1) {   // '배점 | 점수': 값이 바뀌는 열이 수준 점수
            scol = scols.stream().max((a, b) -> {
                int da = (int) body.stream().map(r -> r.get(a)).filter(x -> scoreOf(x) != null).distinct().count();
                int db = (int) body.stream().map(r -> r.get(b)).filter(x -> scoreOf(x) != null).distinct().count();
                return da != db ? Integer.compare(da, db) : Integer.compare(cnt.apply(a, x -> scoreOf(x) != null), cnt.apply(b, x -> scoreOf(x) != null));
            }).orElse(null);
        }
        if (scol == null || cnt.apply(scol, x -> scoreOf(x) != null) == 0) {
            int best = 0;
            Integer bc = null;
            for (int c = 0; c < W; c++) {
                if (lcol != null && c == lcol) {
                    continue;
                }
                int n = cnt.apply(c, x -> NUM_ONLY.matcher(x).matches() || (scoreOf(x) != null && x.length() <= 12));
                if (n > best || (n == best && n > 0 && bc != null && c > bc)) {
                    best = n;
                    bc = c;
                }
            }
            scol = bc;
        }
        if (lcol == null) {
            int best = 1;
            for (int c = 0; c < W; c++) {
                if (scol != null && c == scol) {
                    continue;
                }
                int n = cnt.apply(c, x -> LEVEL.matcher(x).matches() && x.length() <= 12);
                if (n >= 2 && n >= best) {
                    best = n;
                    lcol = c;
                }
            }
        }
        Map<Integer, Double> avg = new HashMap<>();
        for (int c = 0; c < W; c++) {
            if ((scol != null && c == scol) || (lcol != null && c == lcol)) {
                continue;
            }
            final int cc = c;
            avg.put(c, body.stream().filter(r -> scoreOf(r.get(cc)) == null || r.get(cc).length() > 12)
                    .mapToInt(r -> r.get(cc).length()).sum() / (double) Math.max(1, body.size()));
        }
        Integer dcol = avg.isEmpty() ? null : avg.entrySet().stream().max(Map.Entry.comparingByValue()).get().getKey();
        if (ecol != null && dcol != null && dcol.equals(ecol) && avg.size() > 1) {
            avg.remove(ecol);
            dcol = avg.entrySet().stream().max(Map.Entry.comparingByValue()).get().getKey();
        }
        final Integer sc0 = scol, lc0 = lcol, dc = dcol, ec = ecol;
        List<Integer> keycols = new ArrayList<>();
        for (int c = 0; dc != null && c < dc; c++) {
            final int cc = c;
            if ((sc0 != null && c == sc0) || (lc0 != null && c == lc0) || scols.contains(c)) {
                continue;
            }
            if (body.stream().noneMatch(r -> !r.get(cc).isEmpty()) || Set.of("채점기준", "평가기준").contains(ns(g.get(h).get(c)))) {
                continue;
            }
            long distinct = body.stream().map(r -> r.get(cc)).filter(x -> !x.isEmpty()).distinct().count();
            if (distinct <= 1 && (ec == null || c != ec)) {
                continue;
            }
            List<List<String>> both = body.stream().filter(r -> !r.get(cc).isEmpty() && !r.get(dc).isEmpty()).toList();
            if (!both.isEmpty() && both.stream().filter(r -> r.get(cc).equals(r.get(dc))).count() >= 0.3 * both.size()) {
                continue;   // 설명 칸이 병합돼 복제된 열
            }
            List<String> vals = body.stream().map(r -> r.get(cc)).filter(x -> !x.isEmpty()).toList();
            if (!vals.isEmpty() && vals.stream().filter(x -> NUM_ONLY.matcher(x).matches()).count() >= 0.6 * vals.size()) {
                if (scol == null || cnt.apply(scol, x -> NUM_ONLY.matcher(x).matches()) < cnt.apply(c, x -> NUM_ONLY.matcher(x).matches())) {
                    scol = c;   // 숫자만 있는 열은 요소가 아니라 점수
                }
                continue;
            }
            keycols.add(c);
        }
        Map<Integer, String> carry = new HashMap<>();
        keycols.forEach(c -> carry.put(c, ""));
        List<Object[]> rows = new ArrayList<>();
        List<Base> base = new ArrayList<>();
        for (List<String> r : body) {
            for (int c : keycols) {
                if (!r.get(c).isEmpty()) {
                    carry.put(c, r.get(c));
                    for (int c2 : keycols) {
                        if (c2 > c && r.get(c2).isEmpty()) {
                            carry.put(c2, "");
                        }
                    }
                }
            }
            double[] s = scol != null ? scoreOf(r.get(scol)) : null;
            String desc = dc != null ? r.get(dc) : "";
            if (dc != null && scol != null && scol > dc + 1) {
                // 칸 안 줄바꿈이 선으로 잘려 설명이 옆 칸까지 나뉜 경우: 설명~점수 사이 칸 조각을 잇는다
                StringBuilder sb = new StringBuilder(fragment(desc) ? "" : desc);
                for (int c = dc + 1; c < scol; c++) {
                    String v = r.get(c);
                    if (!fragment(v) && !v.equals(r.get(c - 1)) && scoreOf(v) == null && sb.indexOf(v) < 0) {
                        sb.append(sb.length() == 0 || sb.toString().matches("(?s).*[·ㆍ]$") ? "" : " ").append(v);
                    }
                }
                desc = sb.toString();
            }
            if (fragment(desc) || headLabels.contains(ns(desc))) {
                desc = "";
            }
            String lab = null;
            if (lcol != null && LEVEL.matcher(r.get(lcol)).matches()) {
                Matcher m = LEVEL.matcher(r.get(lcol));
                m.matches();
                lab = m.group(1);
            }
            if (lab == null && scol != null) {
                Matcher m2 = Pattern.compile("[(（]\\s*([A-E][+\\-]?|상|중|하)\\s*[)）]").matcher(r.get(scol));
                lab = m2.find() ? m2.group(1) : null;
            }
            if (lab == null && s == null) {
                for (String x : r) {
                    Matcher m = LEVEL.matcher(x);
                    if (x.length() <= 12 && m.matches()) {
                        lab = m.group(1);
                        s = scoreOf(x);
                        break;
                    }
                }
            }
            List<String> key = keycols.stream().map(carry::get).filter(x -> !x.isEmpty()).toList();
            if (!key.isEmpty() && LABEL_ROW.matcher(ns(key.get(0))).find()) {
                continue;
            }
            String own = String.join(" ", keycols.stream().map(r::get).filter(x -> !x.isEmpty()).toList());
            if (own.isEmpty()) {
                own = desc;
            }
            if (BASE_WORDS.matcher(own).find() && s != null) {
                base.add(new Base(s[0], sp(String.join(" ", key) + " " + desc).substring(0, Math.min(80, sp(String.join(" ", key) + " " + desc).length()))));
                continue;
            }
            if (s == null && lab == null && desc.isEmpty()) {
                continue;
            }
            if (lab == null && Pattern.compile("기본\\s*점수").matcher(String.join(" ", key) + " " + desc).find()) {
                lab = "기본";
            }
            rows.add(new Object[] {String.join(" › ", new LinkedHashSet<>(key)), lab, s, desc});
        }
        LinkedHashMap<Integer, Object[]> dummy = new LinkedHashMap<>();
        List<String> names = new ArrayList<>();
        List<List<Level>> groups = new ArrayList<>();
        for (Object[] row : rows) {
            String e = (String) row[0];
            if (names.isEmpty() || !names.get(names.size() - 1).equals(e)) {
                names.add(e);
                groups.add(new ArrayList<>());
            }
            double[] s = (double[]) row[2];
            Level lv = new Level((String) row[1], s != null ? s[0] : null, s != null && !Double.isNaN(s[1]) ? s[1] : null, (String) row[3]);
            List<Level> grp = groups.get(groups.size() - 1);
            Level prev = grp.isEmpty() ? null : grp.get(grp.size() - 1);
            if (prev != null && java.util.Objects.equals(prev.score(), lv.score()) && java.util.Objects.equals(prev.level(), lv.level())
                    && continues(prev.description(), lv.description())) {
                // 같은 수준이 여러 줄로 나뉜 경우(칸 안 줄바꿈 · 병합 칸 반복): 한 수준으로 합친다
                String d = prev.description().isEmpty() ? lv.description()
                        : lv.description().isEmpty() || prev.description().contains(lv.description()) ? prev.description()
                        : prev.description() + (prev.description().matches(".*[·ㆍ]$") ? "" : " ") + lv.description();
                grp.set(grp.size() - 1, new Level(prev.level(), prev.score(), prev.scoreTo(), d));
                continue;
            }
            grp.add(lv);
        }
        dummy.clear();
        List<Element> out = new ArrayList<>();
        for (int k = 0; k < names.size(); k++) {
            Element e = elem(names.get(k), groups.get(k));
            if (e != null) {
                out.add(e);
            }
        }
        LAST_BASE.set(base);
        return out;
    }

    /** 마침표·기호만 있는 조각 */
    static boolean fragment(String s) {
        return s == null || s.isBlank() || s.strip().matches("[.,·ㆍ。\\-–—:;]+");
    }

    /** 같은 점수의 다음 줄이 앞 수준의 이어지는 글인가: 한쪽이 비었거나, 같은 글이거나, 앞 글이 문장 끝(함·음·다·.)으로 끝나지 않았을 때. */
    static boolean continues(String prev, String next) {
        if (prev.isEmpty() || next.isEmpty() || prev.equals(next) || prev.contains(next)) {
            return true;
        }
        return !prev.strip().matches(".*([.。]|함|음|임|됨|다|있음|없음)$");
    }

    /** rubric() 이 마지막으로 읽은 기본 점수 행 (같은 스레드). blocks() 가 가져간다. */
    private static final ThreadLocal<List<Base>> LAST_BASE = ThreadLocal.withInitial(ArrayList::new);

    static Element elem(String name0, List<Level> levels0) {
        List<Level> levels = levels0.stream().filter(lv -> lv.score() != null || lv.level() != null || !lv.description().isEmpty()).toList();
        String name = sp(name0);
        if (levels.isEmpty() || (levels.stream().noneMatch(lv -> lv.score() != null) && !Pattern.compile("[(（]\\s*\\d").matcher(name).find())) {
            return null;
        }
        String[] parts = name.split(" › ");
        Matcher m = MAX_IN_NAME.matcher(parts[parts.length - 1]);
        Double mx = m.find() ? Double.valueOf(m.group(1)) : null;
        String clean = sp(MAX_IN_NAME.matcher(name).replaceAll(""));
        // 한 칸에 '25점: … 20점: …' 처럼 수준이 이어 적힌 경우 나눈다
        List<Level> split = new ArrayList<>();
        for (Level lv : levels) {
            String d = lv.description() == null ? "" : lv.description();
            List<String> ps = new ArrayList<>();
            for (String p : d.split("(?=(?<![\\d.])\\d{1,3}\\s*점\\s*[:：])")) {
                String t = p.replaceAll("^[ /]+|[ /]+$", "");
                if (!t.isEmpty()) {
                    ps.add(t);
                }
            }
            List<String> scored = ps.stream().filter(p -> p.matches("^\\d{1,3}\\s*점\\s*[:：].*")).toList();
            if (scored.size() >= 2) {
                for (String p : scored) {
                    Matcher mm = Pattern.compile("^(\\d{1,3})").matcher(p);
                    mm.find();
                    split.add(new Level(null, Double.valueOf(mm.group(1)), null, p.replaceFirst("^\\d{1,3}\\s*점\\s*[:：]\\s*", "")));
                }
            } else {
                split.add(lv);
            }
        }
        levels = split;
        List<Level> labeled = levels.stream().filter(lv -> lv.level() != null && !"기본".equals(lv.level())).toList();
        if (labeled.size() >= 2 && labeled.stream().map(Level::score).distinct().count() == 1) {
            if (mx == null) {
                mx = labeled.get(0).score();
            }
            List<Level> nl = new ArrayList<>();
            for (Level lv : levels) {   // '상·중·하 | 배점 10점': 배점은 요소 만점이지 수준 점수가 아님
                nl.add(labeled.contains(lv) ? new Level(lv.level(), null, null, lv.description()) : lv);
            }
            levels = nl;
        }
        List<Double> scores = levels.stream().filter(lv -> lv.score() != null).map(lv -> lv.scoreTo() != null ? lv.scoreTo() : lv.score()).toList();
        String kind = "levels";
        if (!scores.isEmpty()) {
            double top = scores.stream().mapToDouble(Double::doubleValue).max().orElse(0);
            double total = levels.stream().filter(lv -> lv.score() != null).mapToDouble(Level::score).sum();
            if (mx == null) {
                mx = top;
            }
            if (scores.size() > 1 && Math.abs(total - mx) <= 0.01 && top < mx) {
                kind = "sum";
            }
        }
        return new Element(clean, mx, kind, levels);
    }

    // ---------- 표 하나 → 블록 ----------
    static void blocks(SourceTable t, Detail d, List<List<Element>> perTable) {
        List<List<String>> g = new ArrayList<>();
        for (List<String> r : t.cells()) {
            List<String> row = r.stream().map(RubricRules::sp).toList();
            if (row.stream().anyMatch(x -> !x.isEmpty())) {
                g.add(row);
            }
        }
        if (g.isEmpty()) {
            perTable.add(List.of());
            return;
        }
        String flat = String.join(" ", g.stream().map(r -> String.join(" ", r)).toList()) + " " + (t.ctx() == null ? "" : t.ctx());
        Matcher bm = Pattern.compile("기본\\s*점수\\s*[(（]?\\s*(\\d{1,3})\\s*점").matcher(flat);
        while (bm.find()) {
            addBase(d, new Base(Double.parseDouble(bm.group(1)), null));
        }
        LAST_BASE.get().clear();
        List<Element> rb = rubric(g);
        perTable.add(rb);
        for (Base b : LAST_BASE.get()) {
            addBase(d, b);
        }
        if (!rb.isEmpty()) {
            Set<String> have = new HashSet<>();
            d.rubric.forEach(e -> have.add(sig(e)));
            for (Element e : rb) {
                if (have.add(sig(e))) {
                    d.rubric.add(e);
                }
            }
            if (d.rubricSource == null) {
                d.rubricSource = t;
            }
        }
        for (List<String> r : g) {
            List<String> cells = dedupeRow(r).stream().filter(x -> !x.isEmpty()).toList();
            if (cells.size() < 2 || ns(cells.get(0)).length() > 16) {
                continue;
            }
            List<String[]> pairs = new ArrayList<>();
            if (cells.size() >= 4) {
                for (int k = 0; k + 1 < cells.size(); k += 2) {
                    pairs.add(new String[] {ns(cells.get(k)), cells.get(k + 1)});
                }
            } else {
                pairs.add(new String[] {ns(cells.get(0)), String.join(" ", cells.subList(1, cells.size()))});
            }
            for (String[] p : pairs) {
                String pl = p[0], pv = p[1];
                if (L_TASK.matcher(pl).find() && !L_MAX.matcher(pl).find()) {
                    if (d.taskName == null) {
                        d.taskName = sp(pv.replaceAll("[(（]\\s*\\d{1,3}(?:\\.\\d+)?\\s*%\\s*[)）]\\s*$", ""));
                    }
                } else if (pl.contains("기본점수") && num(pv) != null) {
                    addBase(d, new Base(num(pv), null));
                } else if (L_MAX.matcher(pl).find() && num(pv) != null) {
                    if (d.maxScore == null) {
                        d.maxScore = num(pv);
                    }
                } else if (L_DESC.matcher(pl).find()) {
                    if (d.description == null) {
                        d.description = sp(pv);
                    }
                } else if (L_TIME.matcher(pl).find()) {
                    if (d.timing == null) {
                        d.timing = sp(pv);
                    }
                } else if (L_METHOD.matcher(pl).find()) {
                    List<String> ms = checked(cells.subList(1, cells.size()));
                    if (d.method.isEmpty() && !ms.isEmpty()) {
                        d.method = ms;
                    }
                } else if (L_NOTE.matcher(pl).find()) {
                    String note = sp(String.join(" ", cells.subList(1, cells.size())));
                    if (!d.notes.contains(note)) {
                        d.notes.add(note);
                    }
                }
            }
        }
    }

    private static void addBase(Detail d, Base b) {
        for (Base x : d.baseScore) {
            if (x.score() == b.score() && java.util.Objects.equals(x.condition(), b.condition())) {
                return;
            }
        }
        d.baseScore.add(b);
    }

    private static String sig(Element e) {
        return ns(e.element()) + e.levels().stream().map(lv -> String.valueOf(lv.score())).toList();
    }

    static List<String> checked(List<String> cells) {
        String t = String.join(" ", cells);
        Matcher m = CHECKED.matcher(t);
        LinkedHashSet<String> items = new LinkedHashSet<>();
        while (m.find()) {
            String v = sp(m.group(1));
            if (!v.isEmpty()) {
                items.add(v);
            }
        }
        if (!items.isEmpty()) {
            return new ArrayList<>(items);
        }
        if (t.matches(".*[□☐◻].*")) {
            return List.of();
        }
        return new ArrayList<>(new LinkedHashSet<>(cells.stream().map(RubricRules::sp).filter(x -> !x.isEmpty()).toList()));
    }

    /** 한 수행 항목에 붙은 표들 → 세부. */
    public static Detail detailFor(List<SourceTable> tables) {
        Detail d = new Detail();
        List<List<Element>> per = new ArrayList<>();
        for (SourceTable t : tables) {
            blocks(t, d, per);
            d.sources.add(t);
        }
        Double mx = d.maxScore;
        if (mx != null && !d.rubric.isEmpty() && Math.abs(total(d.rubric) - mx) > 0.6) {
            for (List<Element> rb : per) {   // 혼자서 만점이 맞는 표 하나만 (같은 표를 다르게 읽은 중복 제거)
                if (!rb.isEmpty() && (Math.abs(total(rb) - mx) <= 0.6 || d.baseScore.stream().anyMatch(b -> Math.abs(total(rb) + b.score() - mx) <= 0.6))) {
                    d.rubric.clear();
                    d.rubric.addAll(rb);
                    break;
                }
            }
        }
        if (!d.rubric.isEmpty()) {
            double tot = total(d.rubric);
            if (mx != null && Math.abs(tot - mx) > 0.6 && d.baseScore.stream().noneMatch(b -> Math.abs(tot + b.score() - mx) <= 0.6)) {
                double gap = mx - tot;
                String text = String.join(" ", tables.stream().map(SourceTable::text).toList());
                if (gap > 0 && Pattern.compile("기본\\s*점수").matcher(text).find()) {
                    d.info = String.format("요소 합 %s점 + 기본 점수 %s점 = 만점 %s점으로 보임", fmt(tot), fmt(gap), fmt(mx));
                } else if (gap > 0 && tot > 0 && Math.abs(mx / tot - Math.round(mx / tot)) < 0.01 && Math.round(mx / tot) >= 2) {
                    d.info = String.format("채점 점수 %s점을 만점 %s점으로 환산하는 것으로 보임", fmt(tot), fmt(mx));
                } else {
                    d.check.add(String.format("채점 요소 만점 합 %s점 ≠ 과제 만점 %s점", fmt(tot), fmt(mx)));
                }
            }
            if (mx == null) {
                d.maxScore = tot;
            }
        }
        return d;
    }

    static double total(List<Element> rb) {
        return rb.stream().mapToDouble(e -> e.maxScore() == null ? 0 : e.maxScore()).sum();
    }

    static String fmt(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }

    /** 과목 평가표 뒤 세부 표들을 수행 항목별로 나눈다 (이름이 나온 표부터 다음 이름 전까지, 열마다 항목인 표는 열로 자른다). */
    public static List<List<SourceTable>> splitByItems(List<SourceTable> tables, List<String> names) {
        List<String> keys = names.stream().map(n -> {
            String k = ns(n);
            return k.length() > 6 ? k.substring(0, 6) : k;
        }).toList();
        List<List<SourceTable>> out = new ArrayList<>();
        names.forEach(n -> out.add(new ArrayList<>()));
        Integer cur = null;
        boolean hit = false;
        Map<Integer, Boolean> hasRubric = new HashMap<>();
        for (SourceTable t : tables) {
            List<List<String>> g = t.cells();
            Map<Integer, Integer> colhit = new LinkedHashMap<>();
            for (List<String> row : g.subList(0, Math.min(3, g.size()))) {
                for (int c = 1; c < row.size(); c++) {
                    String x = ns(row.get(c));
                    for (int k = 0; k < keys.size(); k++) {
                        if (keys.get(k).length() >= 3 && x.contains(keys.get(k))) {
                            colhit.putIfAbsent(k, c);
                            break;
                        }
                    }
                }
            }
            if (colhit.size() >= 2) {
                for (Map.Entry<Integer, Integer> e : colhit.entrySet()) {
                    int c = e.getValue();
                    List<List<String>> sub = g.stream().map(row -> List.of(row.get(0), c < row.size() ? row.get(c) : "")).toList();
                    out.get(e.getKey()).add(new SourceTable(t.page(), t.section(), t.path(), sub, null, t.ctx()));
                }
                hit = true;
                continue;
            }
            StringBuilder flat = new StringBuilder();
            g.subList(0, Math.min(6, g.size())).forEach(r -> flat.append(ns(String.join("", r))));
            Integer k = null;
            for (int j = 0; j < keys.size(); j++) {
                if (keys.get(j).length() >= 3 && flat.indexOf(keys.get(j)) >= 0) {
                    k = j;
                    break;
                }
            }
            boolean rb = !rubric(g).isEmpty();
            if (k != null) {
                cur = k;
                hit = true;
            } else if (cur != null && rb && Boolean.TRUE.equals(hasRubric.get(cur))) {
                cur = null;   // 이름 없는 새 채점표: 다른 과제의 것일 수 있어 붙이지 않음
            }
            if (cur != null) {
                out.get(cur).add(t);
                if (rb) {
                    hasRubric.put(cur, true);
                }
            }
        }
        if (hit) {
            return out;
        }
        List<Integer> starts = new ArrayList<>();
        for (int j = 0; j < tables.size(); j++) {
            if (taskHead(tables.get(j))) {
                starts.add(j);
            }
        }
        if (!names.isEmpty() && starts.size() == names.size()) {
            for (int s = 0; s < starts.size(); s++) {
                int en = s + 1 < starts.size() ? starts.get(s + 1) : tables.size();
                out.get(s).addAll(tables.subList(starts.get(s), en));
            }
        } else if (names.size() == 1) {
            out.get(0).addAll(tables);
        }
        return out;
    }

    static boolean taskHead(SourceTable t) {
        for (List<String> r : t.cells().subList(0, Math.min(3, t.cells().size()))) {
            for (String x : r.subList(0, Math.min(2, r.size()))) {
                String n = ns(x);
                if (L_TASK.matcher(n).find() || n.startsWith("수행과제")) {
                    return true;
                }
            }
        }
        return false;
    }

    /** 평가표에 수행 항목 이름이 없을 때: 과제 머리마다(없으면 채점 요소마다) 항목을 만든다. 최대 12개. */
    public static List<Detail> itemsFromDetails(List<SourceTable> tables) {
        List<Integer> starts = new ArrayList<>();
        for (int j = 0; j < tables.size(); j++) {
            if (taskHead(tables.get(j))) {
                starts.add(j);
            }
        }
        List<Detail> out = new ArrayList<>();
        for (int s = 0; s < starts.size(); s++) {
            int en = s + 1 < starts.size() ? starts.get(s + 1) : tables.size();
            Detail d = detailFor(tables.subList(starts.get(s), en));
            if (d.taskName != null) {
                out.add(d);
            }
        }
        if (!out.isEmpty()) {
            return out.subList(0, Math.min(12, out.size()));
        }
        Map<String, Detail> merged = new LinkedHashMap<>();
        for (SourceTable t : tables) {
            Detail all = detailFor(List.of(t));
            for (Element e : all.rubric) {
                if (e.element().isEmpty()) {
                    continue;
                }
                String name = e.element().split(" › ")[0];
                Detail d = merged.computeIfAbsent(ns(name), k -> {
                    Detail nd = new Detail();
                    nd.taskName = name;
                    nd.sources.add(t);
                    nd.rubricSource = t;
                    return nd;
                });
                d.rubric.add(e);
                d.maxScore = total(d.rubric);
            }
        }
        List<Detail> list = new ArrayList<>(merged.values());
        return list.subList(0, Math.min(12, list.size()));
    }
}
