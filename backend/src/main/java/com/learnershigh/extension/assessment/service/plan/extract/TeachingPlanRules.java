package com.learnershigh.extension.assessment.service.plan.extract;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 월별 교수·학습 운영 계획(진도표) 읽기. 머리 줄에 '월·시기' 열과 '단원·성취기준' 열이 있는 표를 행으로 편다.
 * 2줄 머리("시기/월", "시기/주")는 열마다 머리 글자를 이어 붙여 판단한다. 병합 칸은 표 읽기에서 같은 글자로 펼쳐져 있다.
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

    /** 진도표면 행 목록, 아니면 null. */
    public static List<Row> rows(List<List<String>> g) {
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
        if (!col.containsKey(Role.MONTH) || !(col.containsKey(Role.UNIT) || col.containsKey(Role.STANDARD))) {
            return null;
        }
        List<Row> out = new ArrayList<>();
        String prev = null;
        for (List<String> r : g.subList(headEnd + 1, g.size())) {
            String mt = RatioRules.cell(r, col.get(Role.MONTH)).strip();
            String unit = get(r, col, Role.UNIT, 300);
            String std = get(r, col, Role.STANDARD, 4000);
            String content = get(r, col, Role.CONTENT, 4000);
            String key = String.join("|", r);
            if (key.equals(prev) || (unit == null && std == null && content == null) || MONTH_HEADS.contains(RatioRules.norm(mt))
                    || RatioRules.norm(mt).equals("시기")) {
                prev = key;
                continue;   // 같은 줄 반복 · 빈 줄 · 머리 반복
            }
            prev = key;
            Integer[] m = month(mt);
            String wk = col.containsKey(Role.WEEK) ? RatioRules.cell(r, col.get(Role.WEEK)).strip() : weekIn(mt);
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
            String note = get(r, col, Role.NOTE, 1000);
            String event = get(r, col, Role.EVENT, 200);
            if (event == null && note != null && EVENT.matcher(note).find() && note.length() <= 200) {
                event = note;
                note = null;
            }
            out.add(new Row(m[0], m[1], wk == null || wk.isBlank() ? null : ImportPayload.trim(wk, 100), wf, wt, unit, content,
                    standards(std), list(get(r, col, Role.TEACH, 2000)), list(get(r, col, Role.ASSESS, 2000)), note, event,
                    mt.isBlank() ? (unit != null ? unit : std) : mt));
            if (out.size() >= 400) {
                break;
            }
        }
        return out.isEmpty() ? null : out;
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
