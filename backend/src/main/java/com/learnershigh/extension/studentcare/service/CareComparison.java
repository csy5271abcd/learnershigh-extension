package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.util.List;

/** 점검 비교 결과 (domain.md §6). 표시용이며 상태를 바꾸지 않는다. */
public record CareComparison(List<Row> rows, Result result) {

    public enum Trend {
        IMPROVED,
        SAME,
        WORSENED
    }

    public enum Result {
        IMPROVED("좋아짐"),
        NO_CHANGE("그대로"),
        WORSENED("나빠짐"),
        MIXED("일부 좋아짐");

        private final String label;

        Result(String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }
    }

    /** {@code now}가 null이면 지금 기록으로는 계산할 수 없는 지표다(SAME으로 본다). */
    public record Row(CareSignalType type, String subject, int before, Integer now, Integer target, Trend trend) {
    }

    /** 이력에 남기는 한 줄. 예: "점검 · 좋아짐 — 수학 비중 12% → 24%" */
    public String text() {
        if (rows.stream().noneMatch(row -> row.now() != null)) return "점검 · 비교 기록 없음";
        String rowsText = rows.stream()
                .filter(row -> row.now() != null)
                .map(row -> StudentCareTexts.comparisonRow(row.type(), row.subject(), row.before(), row.now()))
                .reduce((a, b) -> a + ", " + b)
                .orElse("기록 없음");
        return "점검 · " + result.label() + " — " + rowsText;
    }
}
