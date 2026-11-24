package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.service.plan.extract.PlanExtractor;
import com.learnershigh.extension.assessment.service.plan.extract.SourceTable;
import com.learnershigh.extension.assessment.service.plan.simple.SectionText;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 규칙 추출이 확정하지 못한 과목만 외부 모델로 다시 읽는 경계 (기본 꺼짐).
 * 보내는 것은 그 과목의 평가표와 뒤따르는 과제 표 글뿐이다(SectionText). 결과는 후보로만 쓰고, 확인 필요 표시를 남긴다.
 */
public interface PlanTaskRefiner {

    record Task(String name, double percent) {
    }

    record Refined(String subject, double examPercent, double performancePercent, List<Task> tasks, int inputTokens, int outputTokens) {
    }

    /** section: 과목 범위 표 글. 읽지 못하면 empty. */
    Optional<Refined> refine(String section);

    String CHECK_MARK = "AI 보정 결과 — 원문 확인";

    /** 숫자 구조가 틀린 과목만 다시 읽는다 (비율 합·과제 없음·과제 합). */
    java.util.Set<String> STRUCTURAL = java.util.Set.of("지필·수행 비율 확인", "수행 항목 없음", "항목 비율 합 불일치");

    /**
     * 확인 필요 과목을 다시 읽어, 결과가 판정 규칙(지필+수행=100, 과제 합=수행)을 통과할 때만 바꾼다.
     * 바꾼 과목에는 {@link #CHECK_MARK}를 남겨 자동 확정되지 않게 한다. 돌려주는 값은 보정한 과목 수.
     */
    static int apply(PlanTaskRefiner refiner, List<SourceTable> tables, List<PlanExtractor.Subject> subjects) {
        int changed = 0;
        for (PlanExtractor.Subject s : subjects) {
            if (s.source == null || s.check.stream().noneMatch(STRUCTURAL::contains)) {
                continue;   // 이름만 의심인 과목은 보내지 않는다: 시험(45과목)에서 맞던 과제 이름을 망가뜨린 경우가 이쪽에서 나왔다
            }
            String section = SectionText.of(tables, s.source);
            if (section.isBlank()) {
                continue;
            }
            Optional<Refined> r = refiner.refine(section);
            if (r.isEmpty() || !passes(r.get())) {
                continue;
            }
            Refined x = r.get();
            s.examPercent = x.examPercent();
            s.performancePercent = x.performancePercent();
            s.items.clear();
            for (Task t : x.tasks()) {
                s.items.add(new PlanExtractor.Item(t.name(), t.percent(), null, null, null));
            }
            List<String> check = new ArrayList<>();
            if (s.name == null || s.name.startsWith("과목명 미확인")) {
                check.add("과목명 확인 필요");
            }
            check.add(CHECK_MARK);
            s.check = check;
            changed++;
        }
        return changed;
    }

    static boolean passes(Refined r) {
        double sum = r.tasks().stream().mapToDouble(Task::percent).sum();
        boolean ratio = Math.abs(r.examPercent() + r.performancePercent() - 100) <= 0.6;
        boolean tasks = r.performancePercent() <= 0 ? r.tasks().isEmpty() : !r.tasks().isEmpty() && Math.abs(sum - r.performancePercent()) <= 0.6;
        return ratio && tasks && r.tasks().stream().allMatch(t -> t.name() != null && !t.name().isBlank() && t.percent() > 0);
    }
}
