package com.learnershigh.extension.assessment.service.plan.extract;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 평가계획서 표 목록 → 과목별 지필·수행 비율, 수행 항목, 항목별 채점 기준.
 * 순서: (1) 표마다 과목명(머리 표·제목 줄, 없으면 앞 과목 이어받기) (2) 평가표 찾기 (3) COL·ROW·AREA 해석
 * (4) 평가표 뒤 다음 평가표 전까지의 세부 표를 항목별로 나눠 채점 기준 읽기.
 */
public final class PlanExtractor {

    private PlanExtractor() {
    }

    public record Item(String name, Double weightPercent, Double maxScore, String timing, RubricRules.Detail detail) {
    }

    public static final class Subject {
        public String name;
        public Double examPercent;
        public Double performancePercent;
        public final List<Item> items = new ArrayList<>();
        public List<String> check = List.of();
        public boolean ratioOnly;
        /** 비율을 읽은 원문 표 */
        public SourceTable source;
        public List<ExamRules.Exam> exams = List.of();
        /** 과목 머리 표에 적힌 학년 (없으면 빈 목록) */
        public List<Integer> grades = List.of();
        /** 진도표 행과 그 행이 있는 표 */
        public final List<TeachingPlanRules.Row> plan = new ArrayList<>();
        public final List<SourceTable> planSource = new ArrayList<>();
    }

    public static List<Subject> extract(List<SourceTable> tables, String fileName, String school) {
        // (1) 표마다 과목
        String fileSubj = SubjectRules.tidy(SubjectRules.fromFileName(fileName));
        if (SubjectRules.bad(fileSubj, school)) {
            fileSubj = null;
        }
        String cur = fileSubj;
        String[] subjAt = new String[tables.size()];
        boolean[] header = new boolean[tables.size()];
        int[] setAt = new int[tables.size()];   // 과목명이 정해진 표 번호 (같은 머리를 이어받은 평가표 구분용)
        int curAt = -1;
        List<List<Integer>> gradeAt = new ArrayList<>();
        List<Integer> curGrades = List.of();
        for (int i = 0; i < tables.size(); i++) {
            String s = SubjectRules.forTable(tables.get(i), school);
            if (s != null) {
                header[i] = SubjectRules.tidy(SubjectRules.fromHeaderTable(tables.get(i).cells())) != null;
                List<Integer> g = header[i] ? SubjectRules.gradesFromHeaderTable(tables.get(i).cells()) : List.of();
                if (!g.isEmpty() || !SubjectRules.norm(s).equals(SubjectRules.norm(cur == null ? "" : cur))) {
                    curGrades = g;   // 학년은 머리 표에서만 바뀐다 — 같은 과목의 다음 표(제목 줄)는 학년을 지우지 않는다
                }
                cur = s;
                curAt = i;
            }
            gradeAt.add(curGrades);
            subjAt[i] = cur;
            setAt[i] = curAt;
        }
        // (2) 평가표
        List<Integer> units = new ArrayList<>();
        for (int i = 0; i < tables.size(); i++) {
            if (!tables.get(i).cells().isEmpty() && RatioRules.isUnit(tables.get(i).cells())) {
                units.add(i);
            }
        }
        if (fileSubj != null && units.size() <= 2) {
            for (int i : units) {
                if (!header[i]) {
                    subjAt[i] = fileSubj;
                }
            }
        }
        Map<String, Subject> bySubject = new LinkedHashMap<>();
        java.util.Set<Integer> usedHead = new java.util.HashSet<>();
        for (int n = 0; n < units.size(); n++) {
            int i = units.get(n);
            int next = n + 1 < units.size() ? units.get(n + 1) : tables.size();
            SourceTable t = tables.get(i);
            String subj = subjAt[i] != null ? subjAt[i] : SubjectRules.tidy(SubjectRules.fromVocab(t.ctx()));
            if (subj == null || SubjectRules.bad(subj, school)) {
                subj = "과목명 미확인 (" + (t.page() != null ? "p." + t.page() : "표 " + (i + 1)) + ")";
            }
            // 세부 표: 다음 평가표 전까지, 다른 과목 머리 표가 나오면 끊는다 (최대 40개)
            List<SourceTable> details = new ArrayList<>();
            for (int j = i + 1; j < Math.min(next, i + 41); j++) {
                String hj = SubjectRules.tidy(SubjectRules.fromHeaderTable(tables.get(j).cells()));
                if (hj != null && !SubjectRules.bad(hj, school) && !SubjectRules.norm(hj).equals(SubjectRules.norm(subj))) {
                    break;
                }
                details.add(tables.get(j));
            }
            Subject s = interpret(t, details);
            // 앞 과목 머리를 이어받은 평가표가 이미 값이 찬 과목에 또 붙으려 하면: 다른 과목의 표일 가능성이 커 따로 둔다
            boolean carried = setAt[i] >= 0 && !usedHead.add(setAt[i]);
            Subject prev = bySubject.get(key(subj, gradeAt.get(i)));
            if (carried && prev != null && prev.check.isEmpty()) {
                subj = "과목명 미확인 (" + (t.page() != null ? "p." + t.page() : "표 " + (i + 1)) + ")";
            }
            s.name = subj;
            if (!subj.startsWith("과목명 미확인")) {
                s.grades = gradeAt.get(i);
            }
            Subject old = bySubject.get(key(subj, s.grades));
            if (old == null || (!old.check.isEmpty() && s.check.isEmpty())) {
                bySubject.put(key(subj, s.grades), s);   // 검증 통과한 표를 우선
            }
        }
        // (5) 진도표: 표가 속한 과목(머리 표·제목 기준)에 붙인다
        TeachingPlanRules.MonthHeading[] ctxMonth = contextMonths(tables, subjAt, setAt);
        for (int i = 0; i < tables.size(); i++) {
            Subject s = subjAt[i] == null ? null : bySubject.get(key(subjAt[i], gradeAt.get(i)));
            if (s == null || s.plan.size() >= 400) {
                continue;
            }
            List<TeachingPlanRules.Row> rows;
            try {
                rows = TeachingPlanRules.rows(tables.get(i).cells(), ctxMonth[i]);
            } catch (RuntimeException e) {
                rows = null;   // 서식이 안 맞는 표
            }
            if (rows != null) {
                for (TeachingPlanRules.Row r : rows.subList(0, Math.min(rows.size(), 400 - s.plan.size()))) {
                    s.plan.add(r);
                    s.planSource.add(tables.get(i));
                }
            }
        }
        return new ArrayList<>(bySubject.values());
    }

    /**
     * A28-27 표 밖 월 제목: '주' 열만 있는 진도표마다 월을 정한다(월 열이 있는 표·다른 표는 null).
     * (a) 표 바로 앞 마지막 본문 줄이 월 제목('■ 8월', 두 달 '■ 12월, 1월')이면 그 월.
     * (b) 월 제목이 없으면, 바로 앞 표가 같은 과목·같은 과목 머리(setAt)·같은 머리 줄의 월 제목 형식 진도표이고
     *     같은 쪽 또는 바로 다음 쪽(HWP·HWPX 는 사이 본문이 없을 때)일 때만 앞 표의 월을 이어받는다 — 쪽을 넘어 이어진 표.
     * 그 밖(과목 전환·새 머리 표·사이에 다른 표·쪽 건너뜀·사이 본문)은 이어받지 않는다(가짜 월 금지).
     */
    static TeachingPlanRules.MonthHeading[] contextMonths(List<SourceTable> tables, String[] subjAt, int[] setAt) {
        TeachingPlanRules.MonthHeading[] out = new TeachingPlanRules.MonthHeading[tables.size()];
        for (int i = 0; i < tables.size(); i++) {
            SourceTable t = tables.get(i);
            boolean weekOnly;
            try {
                weekOnly = TeachingPlanRules.weekOnlyPlanTable(t.cells());
            } catch (RuntimeException e) {
                weekOnly = false;
            }
            if (!weekOnly) {
                continue;
            }
            TeachingPlanRules.MonthHeading m = TeachingPlanRules.heading(t.ctx());
            if (m == null && i > 0 && out[i - 1] != null && continues(tables.get(i - 1), t)
                    && !TeachingPlanRules.otherMonthLine(t.ctx(), out[i - 1])
                    && subjAt[i] != null && subjAt[i].equals(subjAt[i - 1]) && setAt[i] == setAt[i - 1]) {
                m = out[i - 1];
            }
            out[i] = m;
        }
        return out;
    }

    /** next 가 prev 의 이어지는 표인가: 같은 머리 줄 + (PDF) 같은 쪽·다음 쪽 / (HWP·HWPX) 사이 본문 없음. */
    private static boolean continues(SourceTable prev, SourceTable next) {
        String a = TeachingPlanRules.headSignature(prev.cells());
        if (a == null || !a.equals(TeachingPlanRules.headSignature(next.cells()))) {
            return false;
        }
        if (prev.page() != null && next.page() != null) {
            return next.page() - prev.page() == 0 || next.page() - prev.page() == 1;
        }
        return next.ctx() == null || next.ctx().isBlank();
    }

    /** 과목 구분: 이름 + 원문 학년(같은 이름이라도 학년이 다르면 다른 과목, 계약 §39-12). */
    private static String key(String name, List<Integer> grades) {
        return SubjectRules.norm(name) + "|" + grades;
    }

    /** 평가표 하나(+ 세부 표) 해석. */
    static Subject interpret(SourceTable t, List<SourceTable> details) {
        List<List<String>> g = t.cells();
        RatioRules.Result col = safe(() -> RatioRules.famCol(g));
        RatioRules.Result row = safe(() -> RatioRules.famRow(g));
        RatioRules.Result area = null;
        RatioRules.Result base = col != null && col.perfTotal() != null ? col : row != null && row.perfTotal() != null ? row : null;
        if (base != null) {
            List<SourceTable> near = new ArrayList<>();
            near.add(t);
            near.addAll(details.subList(0, Math.min(3, details.size())));
            for (SourceTable d : near) {
                List<RatioRules.Item> its = RatioRules.areaItems(d.cells());
                if (its != null && Math.abs(RatioRules.sumW(its) - base.perfTotal()) <= 0.6) {
                    area = new RatioRules.Result(base.perfTotal(), base.examTotal(), its, 0);
                    break;
                }
            }
        }
        RatioRules.Cleaned chosen = null;
        for (RatioRules.Result r : java.util.Arrays.asList(col, row, area)) {
            if (r == null) {
                continue;
            }
            RatioRules.Cleaned c = RatioRules.clean(r);
            if (c.reasons().isEmpty() && !c.ratioOnly()) {
                chosen = c;
                break;
            }
            if (chosen == null || (c.reasons().isEmpty() && !chosen.reasons().isEmpty())) {
                chosen = c;
            }
        }
        Subject s = new Subject();
        s.source = t;
        if (chosen == null || chosen.result() == null) {
            s.check = List.of("표 해석 실패");
            return s;
        }
        RatioRules.Result r = chosen.result();
        s.examPercent = r.examTotal();
        s.performancePercent = r.perfTotal();
        s.check = chosen.reasons();
        s.ratioOnly = chosen.ratioOnly();
        s.exams = ExamRules.exams(g, s.examPercent);
        List<String> names = r.items().stream().map(it -> it.label() == null ? "" : it.label()).toList();
        if (!r.items().isEmpty() && !details.isEmpty()) {
            List<List<SourceTable>> groups = RubricRules.splitByItems(details, names);
            for (int k = 0; k < r.items().size(); k++) {
                RatioRules.Item it = r.items().get(k);
                RubricRules.Detail d = groups.get(k).isEmpty() ? null : RubricRules.detailFor(groups.get(k));
                s.items.add(new Item(it.label(), it.weightPercent(), it.maxScore() != null ? it.maxScore() : d != null ? d.maxScore : null,
                        it.timing() != null ? it.timing() : d != null ? d.timing : null, d));
            }
        } else if (!r.items().isEmpty()) {
            r.items().forEach(it -> s.items.add(new Item(it.label(), it.weightPercent(), it.maxScore(), it.timing(), null)));
        } else if (!details.isEmpty()) {
            // 평가표에 항목 이름이 없으면 세부 표의 과제마다 항목을 만든다 (비율은 관리자 확인)
            for (RubricRules.Detail d : RubricRules.itemsFromDetails(details)) {
                s.items.add(new Item(d.taskName, null, d.maxScore, d.timing, d));
            }
            if (!s.items.isEmpty()) {
                s.ratioOnly = false;
            }
        }
        return s;
    }

    private static RatioRules.Result safe(java.util.function.Supplier<RatioRules.Result> f) {
        try {
            return f.get();
        } catch (RuntimeException e) {
            return null;   // 서식이 안 맞는 표
        }
    }
}
