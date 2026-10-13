package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.util.List;

/** 재점검 비교 결과 (domain.md §6). 표시용이며 상태를 바꾸지 않는다. */
public record CareComparison(List<Row> rows, Result result) {

    public enum Trend {
        IMPROVED,
        SAME,
        WORSENED
    }

    public enum Result {
        IMPROVED("변화 관찰"),
        NO_CHANGE("변화 없음"),
        WORSENED("더 나빠짐"),
        MIXED("일부 변화");

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

    /** 학생 기록에 남기는 한 줄. 예: "재점검 — 변화 관찰: 수학 비중 12% → 24%" */
    public String text() {
        String rowsText = rows.stream()
                .filter(row -> row.now() != null)
                .map(row -> StudentCareTexts.comparisonRow(row.type(), row.subject(), row.before(), row.now()))
                .reduce((a, b) -> a + ", " + b)
                .orElse("비교할 기록 없음");
        return "재점검 — " + result.label() + ": " + rowsText;
    }
}
