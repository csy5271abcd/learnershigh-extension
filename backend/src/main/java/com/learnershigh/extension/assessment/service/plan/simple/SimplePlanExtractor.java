package com.learnershigh.extension.assessment.service.plan.simple;

import com.learnershigh.extension.assessment.service.plan.extract.ExamRules;
import com.learnershigh.extension.assessment.service.plan.extract.PlanExtractor;
import com.learnershigh.extension.assessment.service.plan.extract.SourceTable;
import com.learnershigh.extension.assessment.service.plan.extract.SubjectRules;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 평가계획서 추출 — 큰 틀 하나 (docs/design/perf-assess-accuracy/extraction-framework.md).
 * 줄기: 과목 정하기 → 평가표 찾기 → 지필·수행·과제 읽기(가로·세로 둘 다 해 보고 합이 맞는 쪽) → 판정 하나.
 * 가지: 평가표에 과제 이름이 없을 때만 뒤따르는 과제 표에서 읽는다 ({@link TaskListBranch}).
 */
public final class SimplePlanExtractor {

    private SimplePlanExtractor() {
    }

    public static List<PlanExtractor.Subject> extract(List<SourceTable> tables, String fileName, String school) {
        String cur = SubjectRules.tidy(SubjectRules.fromFileName(fileName));
        if (cur != null && (SubjectRules.bad(cur, school) || isSchoolShortName(cur, fileName))) {
            cur = null;
        }
        if (cur == null) {   // '…계획(2학년, 기하).hwpx'
            java.util.regex.Matcher fm = java.util.regex.Pattern.compile("[(（]\\s*\\d\\s*학년\\s*[,，]\\s*([^)）]+)[)）]").matcher(fileName);
            String f = fm.find() ? SubjectRules.tidy(SubjectRules.fromVocab(fm.group(1))) : null;
            cur = f != null && !SubjectRules.bad(f, school) ? f : null;
        }
        final String other = Semester.otherOf(fileName);   // 파일 이름이 한 학기만 말하면 다른 학기 표는 건너뛴다
        final String fileSubject = cur;   // 파일 이름의 과목 = 과목 하나짜리 파일: 표가 여럿이어도 같은 과목
        Map<String, PlanExtractor.Subject> out = new LinkedHashMap<>();
        Grid.Memory memory = new Grid.Memory();   // 학교 안 일관성: 확정된 과목의 이름 행 머리
        boolean used = false;   // 지금 과목명이 이미 평가표 하나에 쓰였는가
        for (int i = 0; i < tables.size(); i++) {
            SourceTable t = tables.get(i);
            String s = subjectOf(t, school);
            if (s != null) {
                String next = s.isEmpty() ? null : s;   // 빈 글자 = 교과(군) 머리만 있음 → 과목 모름
                used = used && java.util.Objects.equals(next, cur);
                cur = next;
            }
            if (!Words.isRatioTable(t.cells())) {
                continue;
            }
            if (other != null && other.equals(Semester.of(t))) {
                continue;   // '2학기' 계획서 안의 1학기 평가표
            }
            Grid.Reading r = Grid.best(t.cells(), memory);
            if (r == null) {
                continue;
            }
            if (!r.tasks.isEmpty() && r.nameLabel != null && Words.has("areaLabel", r.nameLabel)) {
                // 요약 표의 '교육과정 영역' 행은 과제 이름이 아닐 수 있다: 뒤따르는 과제 표의 합이 수행 비율과 같으면 그 이름을 쓴다
                List<Grid.Task> fromList = TaskListBranch.read(tables, i + 1, r.perf, other);
                if (fromList != null) {
                    r = r.withTasks(fromList);
                }
            }
            if (r.exam != null && r.exam > 0 && r.exam < 100 && r.perf != null && !Grid.eq(r.exam + r.perf, 100)) {
                // 요약 표의 수행 칸이 일부만 있는 경우: 지필을 뺀 나머지가 뒤의 과제 목록 합과 맞으면 그 목록을 쓴다
                List<Grid.Task> fromList = TaskListBranch.read(tables, i + 1, 100 - r.exam, other);
                if (fromList != null) {
                    r = r.withTasks(fromList);
                    r.perf = 100 - r.exam;
                }
            }
            if (r.tasks.isEmpty() && r.perf != null && r.perf > 0) {
                List<Grid.Task> fromList = TaskListBranch.read(tables, i + 1, r.perf, other);
                if (fromList != null) {
                    r = r.withTasks(fromList);
                } else {
                    Grid.Reading f = Grid.best(t.cells(), memory, true);
                    if (f != null && !f.tasks.isEmpty() && Grid.eq(f.perf, r.perf)) {
                        r = f;
                    }
                }
            }
            // 과목 머리 하나에 평가표 하나: 새 과목 머리 없이 평가표가 또 나오면 그 과목명은 모른다 (밀려 붙지 않게)
            boolean known = cur != null && (!used || cur.equals(fileSubject));
            String knownName = known ? cur : fileSubject;   // 과목 하나짜리 파일이면 그 과목
            if (knownName == null && (r.exam == null || r.perf == null || !Grid.eq(r.exam + r.perf, 100))) {
                continue;   // 과목 머리 없는 표가 지필+수행=100도 아니면 과목이 아니다 (세부 표·채점표)
            }
            known = knownName != null;
            String name = known ? knownName : "과목명 미확인 (" + (t.page() != null ? "p." + t.page() : "표 " + (i + 1)) + ")";
            if (known) {
                used = true;
            }
            PlanExtractor.Subject prev = out.get(name);
            if (prev != null && prev.check.isEmpty()) {
                continue;   // 같은 과목은 먼저 확정된 표를 쓴다
            }
            PlanExtractor.Subject sub = toSubject(name, !known, r, t);
            if (sub.check.isEmpty()) {
                memory.remember(r);
            }
            if (prev == null || sub.check.size() < prev.check.size()) {
                out.put(name, sub);
            }
        }
        return new ArrayList<>(out.values());
    }

    /** 파일 이름 끝의 학교 줄임 이름('…운영계획-수일고.pdf')은 과목이 아니다. */
    static boolean isSchoolShortName(String name, String fileName) {
        if (!name.endsWith("고") || name.length() < 2) {
            return false;
        }
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("([가-힣]+)고등학교").matcher(fileName);
        String stem = name.substring(0, name.length() - 1);
        while (m.find()) {
            if (m.group(1).endsWith(stem) || stem.endsWith(m.group(1))) {
                return true;
            }
        }
        return fileName.contains("-" + name + ".") || fileName.contains("_" + name + ".");
    }

    /**
     * 이 표의 과목: 머리 표·제목 줄·본문에서 찾는다. 교과(군) 이름('국어', '과학')만 나오면 본문에서 더 구체적인 과목을 찾고,
     * 없으면 빈 글자(과목 모름). 아무것도 없으면 null(앞 과목 이어받기).
     */
    private static final java.util.regex.Pattern TITLE =
            java.util.regex.Pattern.compile("(?:^|\\s)(?:\\d+\\.\\s*)?([가-힣ⅠⅡⅢ·・]{2,15}(?:\\s[가-힣ⅠⅡⅢ]{1,8}){0,3})\\s*교수\\s*[·・­\\-]?\\s*학습");

    static String subjectOf(SourceTable t, String school) {
        String s = SubjectRules.forTable(t, school);
        if (s == null) {
            // 표 바로 앞 제목 줄 'OO 교수학습' (예: '3. 독서와 작문 교수학습-평가 계획')
            java.util.regex.Matcher m = TITLE.matcher(t.ctx() == null ? "" : t.ctx());
            String found = null;
            while (m.find()) {
                found = m.group(1);
            }
            String title = found == null ? null : SubjectRules.tidy(SubjectRules.fromVocab(found));   // 과목 사전에 있을 때만
            return title != null && !SubjectRules.bad(title, school) && !Words.has("group", title) ? title : null;
        }
        if (!Words.has("group", s)) {
            return s;
        }
        String ctx = SubjectRules.tidy(SubjectRules.fromVocab(t.ctx()));
        return ctx != null && !Words.has("group", ctx) && !SubjectRules.bad(ctx, school) ? ctx : "";
    }

    /** 판정 하나: 지필+수행=100, 과제 합=수행, 과제 이름이 사전을 통과해야 자동 확정. */
    static PlanExtractor.Subject toSubject(String name, boolean unnamed, Grid.Reading r, SourceTable t) {
        PlanExtractor.Subject s = new PlanExtractor.Subject();
        s.name = name;
        s.examPercent = r.exam;
        s.performancePercent = r.perf;
        s.source = t;
        for (Grid.Task k : r.tasks) {
            s.items.add(new PlanExtractor.Item(k.name(), k.weight(), null, null, null));
        }
        List<String> check = new ArrayList<>();
        if (unnamed) {
            check.add("과목명 확인 필요");
        }
        if (r.exam == null || r.perf == null || !Grid.eq(r.exam + r.perf, 100)) {
            check.add("지필·수행 비율 확인");
        }
        if (r.perf != null && r.perf > 0) {
            if (r.tasks.isEmpty()) {
                check.add("수행 항목 없음");
            } else if (!Grid.eq(r.tasks.stream().mapToDouble(Grid.Task::weight).sum(), r.perf)) {
                check.add("항목 비율 합 불일치");
            }
        }
        if (r.tasks.stream().anyMatch(k -> !Words.isTaskName(k.name()) || Words.norm(k.name()).equals(Words.norm(name)))) {
            check.add("항목 이름 확인");
        }
        s.check = check;
        s.exams = r.exam != null && r.exam > 0 && r.exam <= 100 ? ExamRules.exams(t.cells(), r.exam) : List.of();
        // 100을 넘는 비율은 잘못 읽은 값이다: 값을 비우고 확인 필요로 넘긴다 (저장 계약은 0~100만 받는다)
        if (s.examPercent != null && s.examPercent > 100) {
            s.examPercent = null;
        }
        if (s.performancePercent != null && s.performancePercent > 100) {
            s.performancePercent = null;
        }
        s.items.removeIf(it -> it.weightPercent() != null && it.weightPercent() > 100);
        return s;
    }
}
