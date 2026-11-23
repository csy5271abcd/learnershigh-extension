package com.learnershigh.extension.assessment.service.plan.simple;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 낱말 사전(resources/assessment/simple-words.txt)과 숫자 읽기. */
final class Words {

    private Words() {
    }

    private static final Map<String, Pattern> P = new HashMap<>();

    static {
        try (BufferedReader r = new BufferedReader(new InputStreamReader(
                Words.class.getResourceAsStream("/assessment/simple-words.txt"), StandardCharsets.UTF_8))) {
            String line;
            while ((line = r.readLine()) != null) {
                int eq = line.indexOf('=');
                if (!line.startsWith("#") && eq > 0) {
                    P.put(line.substring(0, eq).strip(), Pattern.compile(line.substring(eq + 1).strip()));
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("simple-words.txt", e);
        }
    }

    static String norm(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "").replace('ㆍ', '·').replace('‧', '·').replace('･', '·').replace('・', '·');
    }

    static boolean has(String key, String s) {
        return P.get(key).matcher(norm(s)).find();
    }

    static boolean isRatioTable(List<List<String>> g) {
        StringBuilder sb = new StringBuilder();
        g.forEach(r -> r.forEach(c -> sb.append(c).append(' ')));
        String t = sb.toString();
        return has("perf", t) && has("ratioTable", t) && t.matches("(?s).*\\d.*");
    }

    static boolean isTaskName(String s) {
        String n = norm(s);
        return n.length() >= 2 && n.length() <= 80 && !has("nonTask", s) && n.matches(".*[가-힣A-Za-z].*");
    }

    private static final Pattern PAREN_PCT = Pattern.compile("[(（]\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*%\\s*[)）]");
    private static final Pattern PCT = Pattern.compile("(\\d{1,3}(?:\\.\\d+)?)\\s*%");
    private static final Pattern BARE = Pattern.compile("^\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*(점)?\\s*$");

    /** 칸의 비율 값: '20점(20%)' → 20, '25%' → 25, '25' → 25. 아니면 null. */
    static Double pct(String s) {
        if (s == null) {
            return null;
        }
        Matcher m = PAREN_PCT.matcher(s);
        if (!m.find()) {
            m = PCT.matcher(s);
            if (!m.find()) {
                m = BARE.matcher(s);
                if (!m.find()) {
                    return null;
                }
            }
        }
        double v = Double.parseDouble(m.group(1));
        return v <= 100 ? v : null;
    }
}
