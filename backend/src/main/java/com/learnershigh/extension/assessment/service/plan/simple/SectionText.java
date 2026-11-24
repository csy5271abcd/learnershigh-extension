package com.learnershigh.extension.assessment.service.plan.simple;

import com.learnershigh.extension.assessment.service.plan.extract.SourceTable;
import java.util.List;

/**
 * 외부 분석(LLM)에 보낼 최소 글: 과목의 평가표와 뒤따르는 과제 표(다음 평가표 전까지)만,
 * 병합 칸 되풀이를 한 번으로, 긴 칸(채점 기준 문장·성취기준)은 앞부분만 남긴다. 토큰을 줄이려는 것.
 */
public final class SectionText {

    private SectionText() {
    }

    static final int MAX_TABLES = 8;
    static final int MAX_CELL = 40;
    static final int MAX_CHARS = 6000;

    public static String of(List<SourceTable> tables, SourceTable ratioTable) {
        int start = tables.indexOf(ratioTable);
        if (start < 0) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < Math.min(tables.size(), start + MAX_TABLES); i++) {
            SourceTable t = tables.get(i);
            boolean taskSheet = !t.cells().isEmpty() && !t.cells().get(0).isEmpty() && Words.has("taskHead", t.cells().get(0).get(0));
            if (i > start && Words.isRatioTable(t.cells()) && !taskSheet) {
                break;   // 다음 과목의 평가표
            }
            String title = lastLine(t.ctx());
            if (!title.isEmpty()) {
                sb.append('[').append(title).append("]\n");
            }
            for (List<String> row : t.cells()) {
                String prev = null;
                StringBuilder line = new StringBuilder();
                for (String c : row) {
                    String v = c == null ? "" : c.replaceAll("\\s+", " ").strip();
                    if (v.length() > MAX_CELL) {
                        v = v.substring(0, MAX_CELL) + "…";
                    }
                    if (!v.equals(prev)) {
                        if (line.length() > 0) {
                            line.append(" | ");
                        }
                        line.append(v);
                    }
                    prev = v;
                }
                if (!line.toString().replace("|", "").isBlank()) {
                    sb.append(line).append('\n');
                }
            }
            sb.append('\n');
            if (sb.length() > MAX_CHARS) {
                return sb.substring(0, MAX_CHARS);
            }
        }
        return sb.toString();
    }

    private static String lastLine(String ctx) {
        if (ctx == null || ctx.isBlank()) {
            return "";
        }
        String[] lines = ctx.strip().split("\\R");
        String l = lines[lines.length - 1].strip();
        return l.length() > 60 ? l.substring(0, 60) : l;
    }
}
