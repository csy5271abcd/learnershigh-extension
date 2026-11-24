package com.learnershigh.extension.assessment.service.plan.simple;

import java.util.ArrayList;
import java.util.List;

/**
 * 평가표 한 장 읽기 — 줄기 규칙 하나.
 * 표를 '머리 칸이 왼쪽 열에 있는 모양'으로 보고(세로 모양이면 뒤집어서 한 번 더) 다음을 읽는다.
 *   칸 종류: 위쪽 머리 글자에 '수행'이 있으면 수행 칸, 지필·정기·중간·기말이면 지필 칸.
 *   비율 행: 머리가 '반영비율'류인 행 중 값이 가장 잘게 나뉜 행.
 *   과제 이름 행: 수행 칸에 과제 이름다운 글자가 가장 많은 행 (머리가 과제·영역이면 먼저, 단원·시기·유형이면 제외).
 *   합 맞추기: 병합 칸이 펼쳐져 같은 값이 이웃 칸에 되풀이된 경우를 한 번으로 볼지 더할지는 지필+수행=100, 과제 합=수행으로 고른다.
 */
final class Grid {

    private Grid() {
    }

    record Task(String name, double weight) {
    }

    static final class Reading {
        Double exam;
        Double perf;
        List<Task> tasks = new ArrayList<>();
        String nameLabel;
        int score;

        Reading withTasks(List<Task> t) {
            Reading r = new Reading();
            r.exam = exam;
            r.perf = perf;
            r.tasks = t;
            r.nameLabel = nameLabel;
            r.score = score;
            return r;
        }
    }

    /** 같은 파일(학교) 안에서 확정된 표의 과제 이름 행 머리. 다음 표에서 먼저 고른다. */
    static final class Memory {
        String nameLabel;

        void remember(Reading r) {
            if (r.nameLabel != null && !r.nameLabel.isEmpty()) {
                nameLabel = r.nameLabel;
            }
        }
    }

    /** 지필 칸의 시험 묶음 (중간고사·기말고사·1차·2차). */
    private static final java.util.regex.Pattern EXAM_GROUP = java.util.regex.Pattern.compile("중간|기말|[0-9]차|[0-9]회");

    static boolean eq(double a, double b) {
        return Math.abs(a - b) <= 0.6;
    }

    /** 가로·세로 두 방향으로 읽어 합이 더 잘 맞는 쪽. */
    static Reading best(List<List<String>> g, Memory m) {
        return best(g, m, false);
    }

    /** fallbackNames: 이름 행 머리가 없을 때 '평가 방법' 같은 행도 이름 행으로 본다 (과제 표 가지가 실패한 뒤에만). */
    static Reading best(List<List<String>> g, Memory m, boolean fallbackNames) {
        Reading a = read(g, m, fallbackNames);
        Reading b = read(transpose(g), m, fallbackNames);
        if (a == null) {
            return b;
        }
        return b != null && b.score > a.score ? b : a;
    }

    static Reading read(List<List<String>> g, Memory m, boolean fallbackNames) {
        int rows = g.size();
        int cols = g.stream().mapToInt(List::size).max().orElse(0);
        if (rows < 2 || cols < 2) {
            return null;
        }
        // 비율 행
        List<Integer> ratioRows = new ArrayList<>();
        for (int r = 0; r < rows; r++) {
            String label = cell(g, r, 0);
            boolean ratioLabel = Words.has("ratioLabel", label);
            // 머리 없는 % 행은 비율 행이지만, '정기 시험 (60%) | 수행 평가 (40%)' 같은 칸 종류 머리 행은 아니다
            String row = String.join(" ", g.get(r));
            // 머리 없는 % 행은 숫자 칸이 둘 이상일 때만 (병합된 '학기말 총 100%' 합계 칸 하나 때문에 머리 행이 비율 행이 되지 않게)
            int n = numbers(g, r, cols);
            if (n >= 1 && (ratioLabel || n >= 2 && !Words.has("nameLabel", label) && row.contains("%") && !Words.has("perf", row))) {
                ratioRows.add(r);
            }
        }
        if (ratioRows.isEmpty()) {
            return null;
        }
        int first = ratioRows.get(0);
        // 칸 종류 (비율 행 위쪽 머리 글자)
        char[] kind = new char[cols];
        String[] heads = new String[cols];
        boolean anyPerf = false;
        for (int c = 1; c < cols; c++) {
            StringBuilder head = new StringBuilder();
            for (int r = 0; r < first; r++) {
                head.append(cell(g, r, c)).append(' ');
            }
            String h = head.toString();
            heads[c] = Words.norm(h);
            kind[c] = Words.has("total", h.strip()) || Words.has("total", cell(g, first, c)) ? 'T'
                    : Words.has("perf", h) ? 'P' : Words.has("exam", h) ? 'E' : '?';
            anyPerf |= kind[c] == 'P';
        }
        // '수행평가 합계'·'서·논술형 합계' 같은 소계 칸: 같은 종류의 다른 칸이 있으면 합계로 본다 (두 번 더하지 않게)
        for (int c = 1; c < cols; c++) {
            if ((kind[c] == 'P' || kind[c] == 'E' || kind[c] == '?') && Words.has("subtotal", heads[c])) {
                for (int d = 1; d < cols; d++) {
                    if (d != c && (kind[d] == kind[c] || kind[c] == '?') && kind[d] != 'T' && !Words.has("subtotal", heads[d])) {
                        kind[c] = 'T';
                        break;
                    }
                }
            }
        }
        if (!anyPerf) {
            String all = String.join(" ", g.get(0)) + " " + cell(g, 0, 0);
            if (!Words.has("perf", all) || Words.has("exam", all)) {
                return null;
            }
            for (int c = 1; c < cols; c++) {
                kind[c] = kind[c] == 'T' ? 'T' : 'P';   // 수행평가만 있는 표 (지필 0)
            }
        }
        // 과제 이름 행
        int nr = -1;
        int bestScore = 0;
        for (int r = 0; r < rows; r++) {
            if (ratioRows.contains(r)) {
                continue;
            }
            String label = Words.norm(cell(g, r, 0));
            boolean named = Words.has("nameLabel", label);
            if (!named && Words.has("nonNameLabel", label)) {
                continue;
            }
            int good = 0;
            for (int c = 1; c < cols; c++) {
                if (kind[c] == 'P' && Words.isTaskName(cell(g, r, c)) && !Words.has("perf", cell(g, r, c))) {
                    good++;
                }
            }
            int sc = good == 0 ? 0 : good + (named ? 100 : 0) + (m != null && label.equals(m.nameLabel) ? 1000 : 0);
            if (sc > bestScore) {
                bestScore = sc;
                nr = r;
            }
        }
        // 이름 행 머리가 없고 '평가 방법'처럼 이름 행이 될 수 없는 머리만 있을 때: 수행 칸이 모두 과제 이름다운 행을 쓴다
        if (nr < 0 && fallbackNames) {
            for (int r = 0; r < rows; r++) {
                if (ratioRows.contains(r)) {
                    continue;
                }
                int good = 0;
                int filled = 0;
                for (int c = 1; c < cols; c++) {
                    if (kind[c] == 'P' && !cell(g, r, c).isBlank()) {
                        filled++;
                        if (Words.isTaskName(cell(g, r, c)) && !Words.has("perf", cell(g, r, c))) {
                            good++;
                        }
                    }
                }
                if (good > 0 && good == filled && good > bestScore) {
                    bestScore = good;
                    nr = r;
                }
            }
        }
        // 합 맞추기: 지필 값을 읽을 행 × 과제 값을 읽을 행 × 되풀이 값을 한 번으로/더해서 — 합이 가장 잘 맞는 조합
        Reading best = null;
        for (int er : ratioRows) {
            for (int tr : ratioRows) {
                for (boolean collapseExam : new boolean[] {true, false}) {
                    for (boolean collapseTask : new boolean[] {true, false}) {
                        Reading r = build(g, cols, kind, heads, er, tr, nr, collapseExam, collapseTask);
                        if (best == null || r.score > best.score) {
                            best = r;
                        }
                    }
                }
            }
        }
        best.nameLabel = nr >= 0 ? Words.norm(cell(g, nr, 0)) : null;
        return best;
    }

    private static Reading build(List<List<String>> g, int cols, char[] kind, String[] heads, int er, int tr, int nr, boolean collapseExam, boolean collapseTask) {
        Reading out = new Reading();
        double exam = 0;
        boolean anyExam = false;
        String prevExam = null;   // 병합 칸 되풀이는 같은 머리(중간고사·기말고사) 안에서만 한 번으로 본다
        List<Task> tasks = new ArrayList<>();
        double perfCells = 0;
        String prevName = null;
        String prevVal = null;
        for (int c = 1; c < cols; c++) {
            String raw = cell(g, kind[c] == 'E' ? er : tr, c);
            Double v = Words.pct(raw);
            if (kind[c] == 'E' && v != null) {
                anyExam = true;
                java.util.regex.Matcher gm = EXAM_GROUP.matcher(heads[c]);
                String key = (gm.find() ? gm.group() : heads[c]) + "|" + raw;
                if (!(collapseExam && key.equals(prevExam))) {
                    exam += v;
                }
                prevExam = key;
            } else if (kind[c] == 'P' && v != null) {
                String name = nr >= 0 ? cell(g, nr, c).strip() : "";
                boolean same = !tasks.isEmpty() && name.equals(prevName);
                boolean dup = same && raw.equals(prevVal);
                if (same) {
                    if (!(collapseTask && dup)) {
                        Task last = tasks.remove(tasks.size() - 1);
                        tasks.add(new Task(last.name(), last.weight() + v));
                        perfCells += v;
                    }
                } else {
                    tasks.add(new Task(name, v));
                    perfCells += v;
                }
                prevName = name;
                prevVal = raw;
            }
        }
        tasks.removeIf(t -> t.weight() == 0);
        out.exam = anyExam ? exam : 0.0;
        out.perf = perfCells;
        if (nr >= 0) {
            out.tasks = tasks;
        }
        // 점수: 합이 맞을수록, 과제 이름이 많을수록
        boolean pctRow = String.join(" ", g.get(tr)).contains("%");
        out.score = (eq(out.exam + out.perf, 100) ? 20 : 0) + (pctRow ? 3 : 0) + (er == tr ? 1 : 0)
                + (nr >= 0 && !tasks.isEmpty() ? 5 : 0) + (int) tasks.stream().filter(t -> Words.isTaskName(t.name())).count();
        return out;
    }

    private static int numbers(List<List<String>> g, int r, int cols) {
        int n = 0;
        for (int c = 1; c < cols; c++) {
            if (Words.pct(cell(g, r, c)) != null) {
                n++;
            }
        }
        return n;
    }

    static String cell(List<List<String>> g, int r, int c) {
        return r < g.size() && c < g.get(r).size() && g.get(r).get(c) != null ? g.get(r).get(c) : "";
    }

    static List<List<String>> transpose(List<List<String>> g) {
        int cols = g.stream().mapToInt(List::size).max().orElse(0);
        List<List<String>> t = new ArrayList<>();
        for (int c = 0; c < cols; c++) {
            List<String> row = new ArrayList<>();
            for (List<String> r : g) {
                row.add(c < r.size() ? r.get(c) : "");
            }
            t.add(row);
        }
        return t;
    }
}
