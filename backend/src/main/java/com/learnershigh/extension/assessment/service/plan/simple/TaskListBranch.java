package com.learnershigh.extension.assessment.service.plan.simple;

import com.learnershigh.extension.assessment.service.plan.extract.SourceTable;
import java.util.ArrayList;
import java.util.List;

/**
 * 가지 하나: 평가표에 과제 이름이 없을 때, 뒤따르는 표(다음 평가표 전까지)에서 과제 이름과 비율을 읽는다.
 *   목록 표: 머리 행에 '과제명'류 칸과 '반영비율'류 칸 → 아래 행마다 과제 하나.
 *   과제별 표: '과제명'류 머리 칸 오른쪽 = 이름, '반영비율'류 머리 칸 오른쪽 = 비율.
 * 비율 합이 수행 비율과 같고 이름이 모두 사전을 통과할 때만 쓴다.
 */
final class TaskListBranch {

    private TaskListBranch() {
    }

    static List<Grid.Task> read(List<SourceTable> tables, int from, double perf, String otherSemester) {
        List<Grid.Task> out = new ArrayList<>();
        boolean skipping = false;   // 다른 학기 제목('가. 1학기') 뒤의 과제 표는 다음 학기 제목까지 건너뛴다
        for (int i = from; i < Math.min(tables.size(), from + 15); i++) {
            List<List<String>> g = tables.get(i).cells();
            boolean taskSheet = !g.isEmpty() && !g.get(0).isEmpty() && Words.has("taskHead", g.get(0).get(0));   // '평가명 | …' 과제별 표
            if (!taskSheet && Words.isRatioTable(g) && looksLikeRatioTable(g)) {
                break;
            }
            String sem = Semester.ofTitle(tables.get(i).ctx());
            if (sem != null) {
                skipping = sem.equals(otherSemester);
            }
            if (skipping) {
                continue;
            }
            if (!listTable(g, out)) {
                perTaskTable(g, out);
            }
        }
        double sum = out.stream().mapToDouble(Grid.Task::weight).sum();
        return !out.isEmpty() && Grid.eq(sum, perf) && out.stream().allMatch(t -> Words.isTaskName(t.name())) ? out : null;
    }

    private static boolean looksLikeRatioTable(List<List<String>> g) {
        return g.stream().anyMatch(r -> !r.isEmpty() && Words.has("exam", r.get(0)) || r.stream().anyMatch(c -> Words.has("exam", c)));
    }

    private static boolean listTable(List<List<String>> g, List<Grid.Task> out) {
        for (int h = 0; h < Math.min(3, g.size()); h++) {
            int nc = -1;
            int vc = -1;
            List<String> row = g.get(h);
            for (int c = 0; c < row.size(); c++) {
                if (nc < 0 && Words.has("taskHead", row.get(c))) {
                    nc = c;
                } else if (vc < 0 && Words.has("ratioLabel", row.get(c))) {
                    vc = c;
                }
            }
            if (nc < 0 || vc < 0) {
                continue;
            }
            int before = out.size();
            for (int r = h + 1; r < g.size(); r++) {
                String name = Grid.cell(g, r, nc).strip();
                Double v = Words.pct(Grid.cell(g, r, vc));
                if (v != null && v > 0 && !Words.has("total", name)) {
                    out.add(new Grid.Task(name, v));
                }
            }
            return out.size() > before;
        }
        return false;
    }

    private static void perTaskTable(List<List<String>> g, List<Grid.Task> out) {
        String name = null;
        Double v = null;
        for (List<String> r : g) {
            for (int c = 0; c + 1 < r.size(); c++) {
                String next = r.get(c + 1);
                if (name == null && Words.has("taskHead", r.get(c)) && !Words.has("taskHead", next)) {
                    name = next.strip();
                } else if (v == null && Words.has("ratioLabel", r.get(c))) {
                    v = Words.pct(next);
                }
            }
        }
        if (name != null && v != null && v > 0) {
            out.add(new Grid.Task(name, v));
        }
    }
}
