package com.learnershigh.extension.assessment.service.plan.extract;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 월별 교수·학습 운영 계획(진도표) 읽기. 머리 줄에 '월·시기' 열과 '단원·성취기준' 열이 있는 표를 행으로 편다.
 * 2줄 머리("시기/월", "시기/주")는 열마다 머리 글자를 이어 붙여 판단한다. 병합 칸은 표 읽기에서 같은 글자로 펼쳐져 있다.
 *
 * <p>A28-27: 월이 표 밖 제목('■ 8월', '8월', '2026년 8월', '[9월] 교수·학습 운영 계획')에 있고 표에는 '주' 열만 있는 형식은
 * {@link #rows(List, Integer)} 에 그 제목의 월(contextMonth)을 넘겨 읽는다. 월 제목은 {@link #headingMonth(String)} — 표 바로 앞 마지막 본문 줄이
 * 월 제목 하나뿐일 때만 인정한다(본문 문장 속 월·날짜는 쓰지 않음). 행의 주 칸에 월이 적혀 있으면('9월 1주') 그 월이 우선한다.
 * 날짜는 만들지 않는다('8월 2주' = 8월·2주).
 */
public final class TeachingPlanRules {

    private TeachingPlanRules() {
    }

    public record Standard(String code, String text) {
    }

    public record Row(Integer month, Integer monthTo, String weekLabel, Integer weekFrom, Integer weekTo, String unit, String content,
            List<Standard> standards, List<String> teachingMethods, List<String> assessmentMethods, String note,
            String specialSchedule, String evidence) {
    }

    static final Pattern MONTH = Pattern.compile("(\\d{1,2})\\s*(?:월|[.]\\s*\\d{1,2}|$|\\s*[~∼-])");
    static final Pattern MONTH_RANGE = Pattern.compile("^(\\d{1,2})\\s*월?\\s*[~∼-]\\s*(\\d{1,2})\\s*월?$");
    static final Pattern WEEK = Pattern.compile("(\\d{1,2})\\s*주?\\s*(?:[~∼-]\\s*(\\d{1,2})\\s*주?)?");
    static final Pattern STD = Pattern.compile("\\[([^\\[\\]]{3,30})\\]\\s*([^\\[]*)");
    static final Pattern HEAD = Pattern.compile("(교육과정)?성취기준|(대|중|소)?단원(명)?([(（].{0,20}[)）])?");
    static final Pattern EVENT =Pattern.compile("고사|시험|방학|축제|체험학습|수학여행|개학|종업|졸업|휴업");

    private enum Role { MONTH, WEEK, UNIT, CONTENT, STANDARD, TEACH, ASSESS, NOTE, EVENT }

    /** 진도표면 행 목록, 아니면 null. 머리 줄에 월·시기 열이 있어야 한다(표 밖 월 제목은 {@link #rows(List, Integer)}). */
    public static List<Row> rows(List<List<String>> g) {
        return rows(g, (MonthHeading) null);
    }

    /** 표 밖 월 제목: 한 달('■ 8월') 이면 to = null, 두 달('■ 12월, 1월')이면 to = 끝 월. */
    public record MonthHeading(int from, Integer to) {
        public boolean range() {
            return to != null && to != from;
        }
    }

    /** contextMonth: 표 밖 월 제목의 월(없으면 null) — {@link #rows(List, MonthHeading)} 와 같다. */
    public static List<Row> rows(List<List<String>> g, Integer contextMonth) {
        return rows(g, contextMonth == null ? null : new MonthHeading(contextMonth, null));
    }

    /**
     * ctx: 표 밖 월 제목(없으면 null). 머리 줄에 월·시기 열이 있으면 쓰지 않는다(기존 규칙 그대로).
     * 월 열이 없을 때는 '주' 열과 '단원·성취기준' 열이 있고 ctx 가 있을 때만 진도표로 읽는다.
     * 두 달 제목('■ 12월, 1월')의 주는 어느 달의 주인지 원문만으로 정할 수 없어 월 범위(MONTH_RANGE)로 두고 주 위치는 비운다(원문 주 표기는 weekLabel).
     */
    public static List<Row> rows(List<List<String>> g, MonthHeading ctx) {
        Integer contextMonth = ctx == null ? null : ctx.from();
        Head h = head(g);
        if (h == null) {
            return null;
        }
        Map<Role, Integer> col = h.col();
        int headEnd = h.end();
        boolean fromContext = !col.containsKey(Role.MONTH);
        if (fromContext && (contextMonth == null || contextMonth < 1 || contextMonth > 12 || !col.containsKey(Role.WEEK))) {
            return null;
        }
        List<Row> out = new ArrayList<>();
        String prev = null;
        Set<String> seen = new java.util.HashSet<>();
        for (List<String> r : g.subList(headEnd + 1, g.size())) {
            if (fromContext && !seen.add(String.join("|", r))) {
                continue;   // 표 밖 월 제목 형식: 같은 표 안에서 완전히 같은 줄은 한 번만(쪽 넘김 반복)
            }
            String mt = fromContext ? "" : RatioRules.cell(r, col.get(Role.MONTH)).strip();
            String unit = get(r, col, Role.UNIT, 300);
            String std = get(r, col, Role.STANDARD, 4000);
            String content = get(r, col, Role.CONTENT, 4000);
            String key = String.join("|", r);
            String wkHead = col.containsKey(Role.WEEK) ? RatioRules.norm(RatioRules.cell(r, col.get(Role.WEEK))) : "";
            if (key.equals(prev) || (unit == null && std == null && content == null) || MONTH_HEADS.contains(RatioRules.norm(mt))
                    || RatioRules.norm(mt).equals("시기") || (fromContext && WEEK_HEADS.contains(wkHead))) {
                prev = key;
                continue;   // 같은 줄 반복 · 빈 줄 · 머리 반복
            }
            prev = key;
            String wk = col.containsKey(Role.WEEK) ? RatioRules.cell(r, col.get(Role.WEEK)).strip() : weekIn(mt);
            Integer[] m = month(mt);
            if (fromContext) {
                // 행의 주 칸이 월로 시작하면('9월 1주') 그 월이 우선. 주 칸 중간에 다른 달이 나오면('5 - 1월 2주' = 제목 달 5주 ~ 1월 2주)
                // 제목 달부터 그 달까지의 범위로 두고 주 위치는 정하지 않는다. 그 밖은 표 밖 월 제목.
                Integer[] own = LEADING_MONTH.matcher(wk).find() ? month(wk) : new Integer[] {null, null};
                Integer[] inner = own[0] == null && wk.contains("월") ? month(wk) : new Integer[] {null, null};
                if (own[0] != null) {
                    m = own;
                } else if (inner[0] != null && !inner[inner.length - 1].equals(contextMonth)) {
                    m = new Integer[] {contextMonth, inner[inner.length - 1]};
                } else {
                    m = new Integer[] {contextMonth, ctx.range() ? ctx.to() : null};
                }
            }
            Integer wf = null, wt = null;
            if (wk != null && !wk.isBlank()) {
                Matcher w = WEEK.matcher(wk.replaceAll("\\(.*?\\)", "").replaceAll("^\\s*\\d{1,2}\\s*월\\s*", ""));
                if (w.find()) {
                    wf = Integer.valueOf(w.group(1));
                    wt = w.group(2) != null ? Integer.valueOf(w.group(2)) : wf;
                    if (wf < 1 || wt > 25 || wf > wt) {
                        wf = null;
                        wt = null;
                    }
                }
            }
            if (fromContext && !wk.matches(".*\\d.*")) {
                continue;   // 표 밖 월 제목 형식: 주 칸에 숫자가 없는 줄(빈 칸·소계·안내)은 행으로 만들지 않는다
            }
            if (fromContext && m[1] != null && !m[1].equals(m[0])) {
                wf = null;   // 두 달에 걸친 행: 주 위치를 정하지 않는다(원문 주 표기 weekLabel 은 남긴다)
                wt = null;
            }
            String note = get(r, col, Role.NOTE, 1000);
            String event = get(r, col, Role.EVENT, 200);
            if (event == null && note != null && EVENT.matcher(note).find() && note.length() <= 200) {
                event = note;
                note = null;
            }
            Row row = new Row(m[0], m[1], wk == null || wk.isBlank() ? null : ImportPayload.trim(wk, 100), wf, wt, unit, content,
                    standards(std), list(get(r, col, Role.TEACH, 2000)), list(get(r, col, Role.ASSESS, 2000)), note, event,
                    mt.isBlank() ? (unit != null ? unit : std) : mt);
            Row last = out.isEmpty() ? null : out.get(out.size() - 1);
            if (fromContext && last != null && sameSlot(last, row)) {
                // 표 밖 월 제목 형식: PDF 표 읽기가 한 행을 병합 칸 경계마다 여러 줄로 나눈 것 — 같은 주·단원·성취기준이면 한 행으로 합친다
                out.set(out.size() - 1, merge(last, row));
                continue;
            }
            out.add(row);
            if (out.size() >= 400) {
                break;
            }
        }
        return out.isEmpty() ? null : out;
    }

    /** 같은 칸(월·주 표기·단원·성취기준)인가 — 나뉜 줄 합치기 판단. */
    private static boolean sameSlot(Row a, Row b) {
        return java.util.Objects.equals(a.month(), b.month()) && java.util.Objects.equals(a.monthTo(), b.monthTo())
                && java.util.Objects.equals(a.weekLabel(), b.weekLabel()) && java.util.Objects.equals(a.unit(), b.unit())
                && a.standards().equals(b.standards());
    }

    /** 나뉜 줄 합치기: 목록은 합집합(순서 유지), 글은 다르면 이어 붙인다. 원문에 없는 값은 만들지 않는다. */
    private static Row merge(Row a, Row b) {
        return new Row(a.month(), a.monthTo(), a.weekLabel(), a.weekFrom(), a.weekTo(), a.unit(), join(a.content(), b.content(), 4000),
                a.standards(), union(a.teachingMethods(), b.teachingMethods()), union(a.assessmentMethods(), b.assessmentMethods()),
                join(a.note(), b.note(), 1000), join(a.specialSchedule(), b.specialSchedule(), 200), a.evidence());
    }

    private static List<String> union(List<String> a, List<String> b) {
        java.util.LinkedHashSet<String> s = new java.util.LinkedHashSet<>(a);
        s.addAll(b);
        return new ArrayList<>(s).subList(0, Math.min(20, s.size()));
    }

    private static String join(String a, String b, int n) {
        if (a == null || b == null || a.contains(b)) {
            return a != null ? a : b;
        }
        return b.contains(a) ? b : ImportPayload.trim(a + " " + b, n);
    }

    private record Head(int end, Map<Role, Integer> col) {
    }

    /** 머리 줄과 열 역할. '단원·성취기준' 열이 없으면 null. */
    private static Head head(List<List<String>> g) {
        if (g == null || g.size() < 2 || g.get(0).size() < 3) {
            return null;
        }
        int width = g.get(0).size();
        // 머리 줄: 처음 3줄 중 '단원' 또는 '성취기준'이 있는 마지막 줄까지
        int headEnd = -1;
        for (int i = 0; i < Math.min(3, g.size()); i++) {
            if (g.get(i).stream().anyMatch(x -> HEAD.matcher(RatioRules.norm(x)).matches())) {
                headEnd = i;
            }
        }
        if (headEnd < 0) {
            return null;
        }
        Map<Role, Integer> col = new LinkedHashMap<>();
        for (int c = 0; c < width; c++) {
            StringBuilder h = new StringBuilder();
            for (int i = 0; i <= headEnd; i++) {
                String v = RatioRules.norm(RatioRules.cell(g.get(i), c));
                if (h.indexOf(v) < 0) {
                    h.append(v).append('|');
                }
            }
            Role r = role(h.toString());
            if (r != null && !col.containsKey(r)) {
                col.put(r, c);
            }
        }
        if (!(col.containsKey(Role.UNIT) || col.containsKey(Role.STANDARD))) {
            return null;
        }
        return new Head(headEnd, col);
    }

    /** 표 밖 월 제목 형식의 표인가: 머리 줄에 월 열은 없고 '주' 열과 '단원·성취기준' 열이 있다. */
    public static boolean weekOnlyPlanTable(List<List<String>> g) {
        Head h = head(g);
        return h != null && !h.col().containsKey(Role.MONTH) && h.col().containsKey(Role.WEEK);
    }

    /** 머리 줄 글자(공백 제거) — 쪽을 넘어 이어지는 표가 같은 형식인지 비교용. 머리가 없으면 null. */
    public static String headSignature(List<List<String>> g) {
        Head h = head(g);
        if (h == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i <= h.end(); i++) {
            // 병합 칸은 같은 글자로 펼쳐지고 쪽마다 펼쳐진 칸 수가 다를 수 있다 — 이웃한 같은 머리 글자는 하나로 본다
            String last = null;
            for (String c : g.get(i)) {
                String v = RatioRules.norm(c);
                if (!v.equals(last)) {
                    sb.append(v).append('|');
                }
                last = v;
            }
            sb.append('/');
        }
        return sb.toString();
    }

    static final Pattern LEADING_MONTH = Pattern.compile("^\\s*(1[0-2]|0?[1-9])\\s*월");

    static final Set<String> WEEK_HEADS = Set.of("주", "주차", "주(시수)", "주차(시수)");

    /** 월 제목 줄: 기호·괄호·'2026년'·'교수·학습 (운영) 계획' 말고는 'N월'(또는 'N월, M월'·'N~M월') 하나뿐인 줄. */
    static final Pattern MONTH_HEADING = Pattern.compile(
            "^(?:[■□◆◇▶▷►●○◎•ㆍ·※▣◈\\-]\\s*)?[<〈《\\[【(（]?\\s*(?:(?:19|20)\\d{2}\\s*년\\s*)?(1[0-2]|0?[1-9])\\s*월?"
                    + "\\s*(?:[,，·ㆍ~∼\\-]\\s*(?:(?:19|20)\\d{2}\\s*년\\s*)?(1[0-2]|0?[1-9])\\s*)?월\\s*[>〉》\\]】)）]?"
                    + "\\s*(?:(?:교수\\s*[·・ㆍ‧∙.]?\\s*학습|수업)\\s*(?:및\\s*평가\\s*)?(?:운영\\s*)?계획|진도\\s*계획)?\\s*[:：]?$");
    /** 쪽 번호·장식만 있는 줄('- 3 -', '3', '- 3 / 20 -') — 월 제목을 찾을 때 건너뛴다. */
    static final Pattern PAGE_NO = Pattern.compile("^[-–—]?\\s*\\d{1,3}\\s*(?:/\\s*\\d{1,3}\\s*)?[-–—]?$|^[■□\\s]*$");

    static final Pattern MONTH_LIKE = Pattern.compile("^[^가-힣0-9]{0,4}(?:(?:19|20)\\d{2}\\s*년\\s*)?(1[0-2]|0?[1-9])\\s*월(?!\\s*\\d)");

    /**
     * ctx 의 <b>가장 마지막</b> 월 표시 줄(짧은 줄이 'N월'로 시작: '■ 10월', '10월 (계속)', '10월 교수학습 계획(1)')이 inherited 와 다른 월인가.
     * 앞 표의 월을 이어받을지 판단할 때, 인정하지 못한 다른 월 제목이 그 사이에 있을 수 있으면 이어받지 않는다(틀린 월보다 빠짐이 낫다).
     * PDF ctx 는 앞 쪽 끝 글자를 포함하므로 그보다 앞의 월 제목(예: 앞 쪽의 '■ 8월' 뒤 '■ 9월' 표)은 따지지 않는다 — 읽는 순서상 마지막 월 표시만 본다.
     */
    public static boolean otherMonthLine(String ctx, MonthHeading inherited) {
        if (ctx == null) {
            return false;
        }
        Integer last = null;
        for (String line : RatioRules.fw(ctx).split("\\R")) {
            String l = line.replace('\u00a0', ' ').strip();
            Matcher m = MONTH_LIKE.matcher(l);
            if (l.length() <= 40 && m.find()) {
                last = Integer.valueOf(m.group(1));
            }
        }
        return last != null && last != inherited.from() && !last.equals(inherited.to());
    }

    /**
     * 표 바로 앞 문맥(ctx)의 마지막 본문 줄이 월 제목이면 그 월, 아니면 null. 쪽 번호 줄은 건너뛴다.
     * 본문 문장 속 월('8월 2주에 발표한다', '평가 시기 10월 3주')·날짜는 월 제목이 아니다.
     */
    public static Integer headingMonth(String ctx) {
        MonthHeading h = heading(ctx);
        return h == null ? null : h.from();
    }

    /** {@link #headingMonth(String)} 와 같은 규칙으로 한 달·두 달 제목을 읽는다. */
    public static MonthHeading heading(String ctx) {
        if (ctx == null || ctx.isBlank()) {
            return null;
        }
        String[] lines = RatioRules.fw(ctx).split("\\R");
        for (int i = lines.length - 1; i >= 0; i--) {
            String line = lines[i].replace('\u00a0', ' ').strip();
            if (PAGE_NO.matcher(line).matches()) {
                continue;
            }
            Matcher m = MONTH_HEADING.matcher(line);
            if (!m.matches()) {
                return null;
            }
            int from = Integer.parseInt(m.group(1));
            Integer to = m.group(2) == null ? null : Integer.valueOf(m.group(2));
            return new MonthHeading(from, to == null || to == from ? null : to);
        }
        return null;
    }

    static final java.util.Set<String> MONTH_HEADS = java.util.Set.of("월", "시기", "기간", "학습시기", "월(주)", "월/주", "일정", "시기(행사)", "월별");

    /** h: 열의 머리 글자들(공백 제거, '|'로 이음). 예: "시기|월|", "시기|주(시수)|", "단원명|". */
    private static Role role(String h) {
        if (h.contains("단원")) {
            return Role.UNIT;
        }
        if (h.contains("성취기준")) {
            return Role.STANDARD;
        }
        if (h.contains("평가방법")) {
            return Role.ASSESS;
        }
        if (h.matches(".*(수업방법|교수학습방법|교수·학습방법|교수‧학습방법).*")) {
            return Role.TEACH;
        }
        if (h.matches(".*(범교과|비고).*")) {
            return Role.NOTE;
        }
        List<String> tokens = List.of(h.split("\\|"));
        if (tokens.stream().anyMatch(t -> t.matches("주|주차|주\\(.*\\)"))) {
            return Role.WEEK;
        }
        if (tokens.stream().anyMatch(MONTH_HEADS::contains)) {
            return Role.MONTH;
        }
        if (h.contains("행사") || h.contains("학사일정")) {
            return Role.EVENT;
        }
        if (h.matches(".*(학습내용|주요내용|학습주제|^내용).*")) {
            return Role.CONTENT;
        }
        return null;
    }

    private static String get(List<String> r, Map<Role, Integer> col, Role role, int n) {
        Integer c = col.get(role);
        return c == null ? null : ImportPayload.trim(RatioRules.cell(r, c), n);
    }

    /** "3", "3월", "3~4월", "8월 2주~3주", "9.1~9.5" → [월, 끝 월]. */
    static Integer[] month(String s) {
        String t = RatioRules.fw(s).replaceAll("\\s+", " ").strip();
        Matcher r = MONTH_RANGE.matcher(t);
        if (r.matches()) {
            return new Integer[] {ok(r.group(1)), ok(r.group(2))};
        }
        // 주 표기가 섞이면("8월 2~3주") '월'이 붙은 숫자만 월로 본다
        Matcher m = (t.contains("주") ? Pattern.compile("(\\d{1,2})\\s*월") : MONTH).matcher(t);
        List<Integer> found = new ArrayList<>();
        while (m.find()) {
            Integer v = ok(m.group(1));
            if (v != null && (found.isEmpty() || !found.get(found.size() - 1).equals(v))) {
                found.add(v);
            }
        }
        if (found.isEmpty()) {
            return new Integer[] {null, null};
        }
        return new Integer[] {found.get(0), found.get(found.size() - 1)};
    }

    private static Integer ok(String s) {
        int v = Integer.parseInt(s);
        return v >= 1 && v <= 12 ? v : null;
    }

    /** 월 칸 안의 주 표기("8월 2주~3주") — 주 열이 없을 때. */
    private static String weekIn(String mt) {
        return mt.contains("주") ? mt : null;
    }

    static List<Standard> standards(String s) {
        if (s == null) {
            return List.of();
        }
        List<Standard> out = new ArrayList<>();
        Matcher m = STD.matcher(s);
        while (m.find() && out.size() < 30) {
            out.add(new Standard(ImportPayload.trim(m.group(1), 50), ImportPayload.trim(m.group(2), 1000)));
        }
        if (out.isEmpty()) {
            out.add(new Standard(null, ImportPayload.trim(s, 1000)));
        }
        return out;
    }

    static List<String> list(String s) {
        if (s == null) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (String p : s.split("\\s*[,，/]\\s*")) {
            String t = ImportPayload.trim(p, 300);
            if (t != null && !t.matches("[○●◯◎OoVv✓√■□\\-]+") && out.size() < 20) {   // 표시 기호만 있는 칸은 값이 아니다
                out.add(t);
            }
        }
        return out;
    }
}
