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
        /** 과제 목록을 읽은 과제별 표 (따로 평가표로 해석하지 않는다) */
        final List<SourceTable> consumed = new ArrayList<>();
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
        boolean curFromHeader = false;   // 지금 과목명이 머리 표에서 왔는지 (같은 이름이 이어지는 동안 유지)
        List<List<Integer>> gradeAt = new ArrayList<>();
        List<Integer> curGrades = List.of();
        for (int i = 0; i < tables.size(); i++) {
            String s = SubjectRules.forTable(tables.get(i), school);
            if (s != null) {
                header[i] = SubjectRules.tidy(SubjectRules.fromHeaderTable(tables.get(i).cells())) != null;
                // 머리 표의 '통합사회2' 뒤 제목 줄 '(통합사회)과'는 같은 과목 — 머리 표 이름을 지킨다
                if (!header[i] && curFromHeader && cur != null) {
                    String nc = SubjectRules.norm(cur), ns = SubjectRules.norm(s);
                    if (nc.startsWith(ns) && nc.length() - ns.length() <= 1) {
                        s = cur;
                    }
                }
                List<Integer> g = header[i] ? SubjectRules.gradesFromHeaderTable(tables.get(i).cells()) : List.of();
                if (!g.isEmpty() || !SubjectRules.norm(s).equals(SubjectRules.norm(cur == null ? "" : cur))) {
                    curGrades = g;   // 학년은 머리 표에서만 바뀐다 — 같은 과목의 다음 표(제목 줄)는 학년을 지우지 않는다
                }
                curFromHeader = header[i] || (curFromHeader && SubjectRules.norm(s).equals(SubjectRules.norm(cur == null ? "" : cur)));
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
            if (!tables.get(i).cells().isEmpty() && RatioRules.isUnit(tables.get(i).cells()) && !notRatioTable(tables.get(i).cells())) {
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
        java.util.Set<SourceTable> consumedAll = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (int n = 0; n < units.size(); n++) {
            int i = units.get(n);
            int next = n + 1 < units.size() ? units.get(n + 1) : tables.size();
            SourceTable t = tables.get(i);
            if (consumedAll.contains(t)) {
                continue;   // 앞 과목의 과제 목록으로 이미 읽은 과제별 표
            }
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
            // 과제별 표('평가과제(배점) | … | 기말 반영 비율')가 평가표로도 잡혀 세부 표 범위를 끊는 서식: 과제 목록은 다음 과목 머리 전까지 본다
            List<SourceTable> wide = new ArrayList<>(details);
            for (int j = i + 1 + details.size(); details.size() == next - i - 1 && j < Math.min(tables.size(), i + 41); j++) {
                String hj = SubjectRules.tidy(SubjectRules.fromHeaderTable(tables.get(j).cells()));
                if (hj != null && !SubjectRules.bad(hj, school) && !SubjectRules.norm(hj).equals(SubjectRules.norm(subj))) {
                    break;
                }
                wide.add(tables.get(j));
            }
            Subject s = interpret(t, details, wide);
            consumedAll.addAll(s.consumed);
            // 앞 과목 머리를 이어받은 평가표가 이미 값이 찬 과목에 또 붙으려 하면: 다른 과목의 표일 가능성이 커 따로 둔다
            boolean carried = setAt[i] >= 0 && !usedHead.add(setAt[i]);
            Subject prev = bySubject.get(key(subj, gradeAt.get(i)));
            if (carried && prev != null && prev.check.isEmpty()) {
                subj = "과목명 미확인 (" + (t.page() != null ? "p." + t.page() : "표 " + (i + 1)) + ")";
            }
            s.name = subj;
            if (!subj.startsWith("과목명 미확인")) {
                s.grades = gradeAt.get(i);
            } else if (!s.check.contains("과목명 확인 필요")) {
                // 이름 없는 과목은 비율이 맞아도 자동 검사 통과로 치지 않는다 (관리자가 과목을 정해야 함)
                List<String> ch = new ArrayList<>(s.check);
                ch.add("과목명 확인 필요");
                s.check = ch;
            }
            Subject old = bySubject.get(key(subj, s.grades));
            if (old == null || (!old.check.isEmpty() && s.check.isEmpty())) {
                bySubject.put(key(subj, s.grades), s);   // 검증 통과한 표를 우선
            }
        }
        // (5) 진도표: 표가 속한 과목(머리 표·제목 기준)에 붙인다
        for (int i = 0; i < tables.size(); i++) {
            Subject s = subjAt[i] == null ? null : bySubject.get(key(subjAt[i], gradeAt.get(i)));
            if (s == null || s.plan.size() >= 400) {
                continue;
            }
            List<TeachingPlanRules.Row> rows;
            try {
                rows = TeachingPlanRules.rows(tables.get(i).cells());
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

    /** 과목 구분: 이름 + 원문 학년(같은 이름이라도 학년이 다르면 다른 과목, 계약 §39-12). */
    private static String key(String name, List<Integer> grades) {
        return SubjectRules.norm(name) + "|" + grades;
    }

    /** 평가표 하나(+ 세부 표) 해석. */
    static Subject interpret(SourceTable t, List<SourceTable> details) {
        return interpret(t, details, details);
    }

    static Subject interpret(SourceTable t, List<SourceTable> details, List<SourceTable> wide) {
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
        List<RatioRules.Item> ritems = r.items();
        List<RatioRules.Item> sheet;
        List<List<SourceTable>> groups = null;
        if (!ritems.isEmpty() && !details.isEmpty()) {
            groups = RubricRules.splitByItems(details, ritems.stream().map(it -> it.label() == null ? "" : it.label()).toList());
        }
        // '부모 › 자식' 항목: 자식마다 따로 채점표가 없으면 한 과제의 평가 요소다 → 부모 한 항목으로 (비율·만점 합)
        List<RatioRules.Item> joined = joinChildren(ritems, groups);
        if (joined != ritems) {
            ritems = joined;
            if (groups != null) {
                groups = RubricRules.splitByItems(details, ritems.stream().map(it -> it.label() == null ? "" : it.label()).toList());
            }
        }
        // 평가표 항목이 유형별 비율뿐(이름 없음)이고 과제별 표에 과제 이름·반영 비율이 따로 있는 서식:
        // 과제 비율 합이 수행 비율(없거나 어긋나면 표의 '수행평가 합계' 칸)과 같을 때만 과제 목록을 쓴다
        if (!ritems.isEmpty() && ritems.stream().allMatch(it -> it.label() == null || it.label().isBlank()) && !wide.isEmpty()) {
            List<RubricRules.Detail> listed = RubricRules.listedTasks(wide, true);
            double sm = listed.stream().mapToDouble(d -> d.maxScore).sum();
            Double perf = s.performancePercent;
            Double cell = perfTotalCell(t.cells());
            Double target = perf != null && Math.abs(sm - perf) <= 0.6 ? perf : cell != null && Math.abs(sm - cell) <= 0.6 ? cell : null;
            // 유형별 비율(이름 없는 항목)의 합도 같은 수행 비율이어야 한다 — 다른 과목·채점표의 과제를 끌어오지 않게
            double typeSum = ritems.stream().mapToDouble(it -> it.weightPercent() == null ? 0 : it.weightPercent()).sum();
            if (!listed.isEmpty() && target != null && Math.abs(typeSum - target) <= 0.6) {
                if (!target.equals(perf)) {
                    s.performancePercent = target;
                    s.examPercent = Math.round((100 - target) * 100) / 100.0;
                }
                for (RubricRules.Detail d : listed) {
                    s.consumed.addAll(d.sources);
                    s.items.add(new Item(d.taskName, d.maxScore, d.maxScore, d.timing, null));
                }
                List<String> ch = new ArrayList<>(s.check);
                ch.removeAll(List.of("항목 비율 빠짐", "수행 총비율 없음", "항목 비율 합 불일치"));
                if (s.examPercent == null || Math.abs(s.examPercent + s.performancePercent - 100) > 0.6) {
                    ch.add("지필·수행 비율 합 불일치");   // 지필 비율을 못 읽었으면 통과로 두지 않는다
                }
                s.check = ch;
                s.ratioOnly = false;
                return s;
            }
        }
        if (groups != null) {
            for (int k = 0; k < ritems.size(); k++) {
                RatioRules.Item it = ritems.get(k);
                RubricRules.Detail d = groups.get(k).isEmpty() ? null : RubricRules.detailFor(groups.get(k));
                s.items.add(new Item(it.label(), it.weightPercent(), it.maxScore() != null ? it.maxScore() : d != null ? d.maxScore : null,
                        it.timing() != null ? it.timing() : d != null ? d.timing : null, d));
            }
        } else if (!ritems.isEmpty()) {
            ritems.forEach(it -> s.items.add(new Item(it.label(), it.weightPercent(), it.maxScore(), it.timing(), null)));
        } else if (!details.isEmpty() && (sheet = taskSheet(details, s.performancePercent)) != null) {
            // 비율표엔 과제 이름이 없고, 세부 표에 과제 단위 이름·반영 비율이 있는 서식 (합이 수행 비율과 같을 때만)
            List<List<SourceTable>> gs = RubricRules.splitByItems(details, sheet.stream().map(RatioRules.Item::label).toList());
            for (int k = 0; k < sheet.size(); k++) {
                RatioRules.Item it = sheet.get(k);
                RubricRules.Detail d = gs.get(k).isEmpty() ? null : RubricRules.detailFor(gs.get(k));
                s.items.add(new Item(it.label(), it.weightPercent(), d != null ? d.maxScore : null, d != null ? d.timing : null, d));
            }
            s.ratioOnly = false;
        } else if (!wide.isEmpty()) {
            // 평가표에 항목 이름이 없으면 세부 표의 과제마다 항목을 만든다 (비율은 관리자 확인)
            for (RubricRules.Detail d : details.isEmpty() ? List.<RubricRules.Detail>of() : RubricRules.itemsFromDetails(details)) {
                s.items.add(new Item(d.taskName, null, d.maxScore, d.timing, d));
            }
            if (s.items.isEmpty() && s.performancePercent != null && s.performancePercent > 0) {
                // 세부 표에 과제 이름·배점만 나열된 서식: 배점 합이 수행 비율과 같을 때만 쓴다 (배점 = 반영 비율)
                List<RubricRules.Detail> listed = RubricRules.listedTasks(details);
                if (listed.isEmpty() && wide.size() > details.size()) {
                    listed = RubricRules.listedTasks(wide, true);   // 범위를 넓힐 때는 반영 비율이 명시된 과제 표만
                }
                double sm = listed.stream().mapToDouble(d -> d.maxScore).sum();
                if (!listed.isEmpty() && Math.abs(sm - s.performancePercent) <= 0.6) {
                    for (RubricRules.Detail d : listed) {
                        s.consumed.addAll(d.sources);
                        s.items.add(new Item(d.taskName, null, d.maxScore, d.timing, null));
                    }
                }
            }
            if (!s.items.isEmpty()) {
                s.ratioOnly = false;
            }
            List<String> ch = new ArrayList<>(s.check);
            // 세부 표에서 과제 이름 대신 성취기준·성취수준 머리를 읽었으면 통과로 두지 않는다
            if (s.items.stream().anyMatch(it -> it.name() == null || NOT_TASK_NAME.matcher(it.name().strip()).find())) {
                ch.add("항목 이름 확인");
            } else if (scoringElements(s.items, details, s.performancePercent)) {
                ch.add("항목 이름 확인");   // 과제 목록이 따로 있는데 채점 요소 행을 과제로 읽었다
            }
            // 과제 만점의 합이 수행 비율과 같으면 만점이 곧 반영 비율이다. 아니면 비율은 관리자 확인
            Double perf = s.performancePercent;
            if (!s.items.isEmpty() && perf != null && perf > 0) {
                boolean allMax = s.items.stream().allMatch(it -> it.maxScore() != null);
                double sm = allMax ? s.items.stream().mapToDouble(Item::maxScore).sum() : -1;
                if (allMax && Math.abs(sm - perf) <= 0.6) {
                    List<Item> w = s.items.stream().map(it -> new Item(it.name(), it.maxScore(), it.maxScore(), it.timing(), it.detail())).toList();
                    s.items.clear();
                    s.items.addAll(w);
                } else if (!ch.contains("항목 비율 빠짐")) {
                    ch.add("항목 비율 빠짐");
                }
            }
            s.check = ch;
        }
        mergeAdjacentSameName(s.items);
        stripNonTaskParent(s.items);
        // 수행 비율이 있는데 과제를 하나도 못 읽었으면 자동 통과로 두지 않는다 (관리자가 과제를 넣어야 함)
        if (s.items.isEmpty() && s.performancePercent != null && s.performancePercent > 0 && !s.check.contains("수행 항목 없음")) {
            List<String> ch = new ArrayList<>(s.check);
            ch.add("수행 항목 없음");
            s.check = ch;
        }
        if (s.items.stream().anyMatch(it -> suspiciousName(it.name())) && !s.check.contains("항목 이름 확인")) {
            List<String> ch = new ArrayList<>(s.check);
            ch.add("항목 이름 확인");   // 과제 이름 대신 유형 낱말·단원명·일정·채점 문장을 읽었으면 통과로 두지 않는다
            s.check = ch;
        }
        return s;
    }

    /** '부모 › 자식'의 부모가 과제가 아닌 표 칸(동점자 처리 순위·비고·평가 시기 …)이면 부모를 뗀다. */
    static final java.util.regex.Pattern NON_TASK_PARENT = java.util.regex.Pattern.compile(
            "^(동점자|처리\\s*순위|순위|비고|평가\\s*시기|시기|횟수|영역|단원|성취\\s*기준|평가\\s*요소)");

    static void stripNonTaskParent(List<Item> items) {
        for (int k = 0; k < items.size(); k++) {
            Item it = items.get(k);
            int at = it.name() == null ? -1 : it.name().indexOf(CHILD_SEP);
            if (at > 0 && NON_TASK_PARENT.matcher(it.name().substring(0, at).strip()).find()) {
                items.set(k, new Item(it.name().substring(at + CHILD_SEP.length()).strip(), it.weightPercent(), it.maxScore(),
                        it.timing(), it.detail()));
            }
        }
    }

    /** 평가 유형 낱말만 (서·논술형, 그 외 …). '포트폴리오'·'프로젝트'는 실제 과제 이름으로도 쓰여 넣지 않는다. */
    static final java.util.regex.Pattern TYPE_ONLY_NAME = java.util.regex.Pattern.compile(
            "^(서|논|술|서술|논술|형|그외|기타|비|선택|단답|구술|실기|실습|활동|지필|수행|평가|유형|o|ㅇ|및|,|/)+$");
    /** 단원·영역 머리: 'Ⅱ단원 (…)', 'Ⅲ. 데이터와 …', 'II. …' */
    static final java.util.regex.Pattern UNIT_HEAD = java.util.regex.Pattern.compile(
            "^\\s*(?:[ⅠⅡⅢⅣⅤⅥⅦⅧ]|(?:I{1,3}|IV|VI{0,3})(?=\\s*[.단]))\\s*(?:\\.|단원)|^\\s*\\d{1,2}\\s*단원");
    /** 일정 칸: '10월/1회', '9월 ~ 10월/2회', '3주차' */
    static final java.util.regex.Pattern SCHEDULE = java.util.regex.Pattern.compile(
            "^[\\d\\s~∼\\-–/.,월주차회째학기중순초말]+$");
    /** 채점·안내 문장: '…를 실시한다.', '<신체장애학생의 수행평가 방법> …' */
    static final java.util.regex.Pattern RUBRIC_SENTENCE = java.util.regex.Pattern.compile(
            "(한다|된다|있다|없다|않는다|부여한다)\\s*\\.|^\\s*<[^>]*(학생|방법|기준|유의)[^>]*>");

    /** 횟수·시기 칸: '1회 /중간', '2차', '기말', '중간고사 후' */
    static final java.util.regex.Pattern COUNT_CELL = java.util.regex.Pattern.compile(
            "^[\\d\\s~∼/.,()\\-–]*(\\d+\\s*(회|차)|중간|기말|고사|학기)[\\d\\s~∼/.,()\\-–회차중간기말고사학기전후]*$");
    /** 단원 목록: '3,4,5,7단원', '1~3 단원', 'Ⅰ·Ⅱ단원' */
    static final java.util.regex.Pattern UNIT_LIST = java.util.regex.Pattern.compile(
            "^[\\dⅠⅡⅢⅣⅤⅥⅦⅧ\\s,·~∼\\-–()]+단원");
    /** 안내 메모: '(… 변경될 수 있음)', '… 조정될 수 있습니다' */
    static final java.util.regex.Pattern NOTE_CELL = java.util.regex.Pattern.compile(
            "(될|할)\\s*수\\s*(있음|있습니다)|교육과정에\\s*의해");

    static boolean suspiciousName(String name) {
        if (name == null || name.isBlank()) {
            return true;
        }
        String n = name.strip();
        if (COUNT_CELL.matcher(n).matches() || UNIT_LIST.matcher(n).find() || NOTE_CELL.matcher(n).find()) {
            return true;
        }
        if (n.matches(".*[☑□■◻☐▣✔√].*")) {
            return true;   // 체크 상자 글자
        }
        String t = n.replaceAll("[\\s·・･‧ㆍ･()（）\\[\\]]", "");
        // 유형 낱말: '…형'·'그 외'·'기타 유형'처럼 유형임이 드러날 때만 ('논술', '선택실기', '구술 평가'는 실제 과제 이름일 수 있다)
        boolean typeWord = TYPE_ONLY_NAME.matcher(t).matches() && (t.contains("형") || t.equals("그외") || t.equals("기타"));
        return typeWord || UNIT_HEAD.matcher(n).find()
                || SCHEDULE.matcher(n).matches() && n.matches(".*(월|회|주).*") || RUBRIC_SENTENCE.matcher(n).find();
    }

    /**
     * 평가표 모양이지만 비율표가 아닌 표: 결시자 점수 산출식('점수 = 기본점수 + 배점 × …'). 과목으로 잡지 않는다.
     */
    static boolean notRatioTable(List<List<String>> g) {
        StringBuilder sb = new StringBuilder();
        g.forEach(r -> r.forEach(c -> sb.append(c).append(' ')));
        String all = SubjectRules.norm(sb.toString());
        return all.contains("점수=") && (all.contains("×") || all.contains("*")) && all.contains("기본점수");
    }

    /** 세부 표에 과제 단위 목록(2개 이상)이 있는데, 읽은 항목이 그보다 많고 대부분 그 목록에 없는 이름이면 채점 요소다. */
    static boolean scoringElements(List<Item> items, List<SourceTable> details, Double perf) {
        if (perf == null || perf <= 0 || items.size() < 3) {
            return false;
        }
        List<String> tasks = TaskSheetRules.partialNames(details, perf).stream().map(SubjectRules::norm).toList();
        if (tasks.size() < 2 || items.size() <= tasks.size()) {
            return false;
        }
        long hit = items.stream().map(it -> SubjectRules.norm(it.name())).filter(n -> !n.isEmpty()
                && tasks.stream().anyMatch(t -> t.contains(n) || n.contains(t))).count();
        return hit * 2 < items.size();
    }

    private static List<RatioRules.Item> taskSheet(List<SourceTable> details, Double perf) {
        return perf != null && perf > 0 ? TaskSheetRules.read(details, perf) : null;
    }

    /**
     * 이웃한 두 항목의 이름이 같고 비율이 다르면 한 과제가 열(시기·단계)마다 나뉜 것이다 → 비율·만점을 더해 하나로.
     * 비율이 같으면 열마다 다른 과제가 같은 이름(유형 칸 등)으로 읽혔을 수 있어 그대로 둔다.
     */
    static void mergeAdjacentSameName(List<Item> items) {
        for (int k = items.size() - 1; k > 0; k--) {
            Item a = items.get(k - 1), b = items.get(k);
            if (a.name() == null || b.name() == null || SubjectRules.norm(a.name()).isEmpty()
                    || !SubjectRules.norm(a.name()).equals(SubjectRules.norm(b.name()))
                    || a.weightPercent() == null || b.weightPercent() == null || a.weightPercent().equals(b.weightPercent())) {
                continue;
            }
            Double mx = a.maxScore() != null && b.maxScore() != null ? a.maxScore() + b.maxScore() : null;
            items.set(k - 1, new Item(a.name(), Math.round((a.weightPercent() + b.weightPercent()) * 100) / 100.0, mx,
                    a.timing(), a.detail() != null ? a.detail() : b.detail()));
            items.remove(k);
        }
    }

    /** 평가표의 '수행평가 합계' 칸 값 (같은 열 아래쪽 또는 오른쪽 첫 숫자). 없으면 null. */
    static Double perfTotalCell(List<List<String>> g) {
        for (int r = 0; r < g.size(); r++) {
            for (int c = 0; c < g.get(r).size(); c++) {
                if (!g.get(r).get(c).replaceAll("\\s+", "").matches("수행평가(비율)?합계(\\(%\\))?")) {
                    continue;
                }
                for (int rr = r + 1; rr < g.size(); rr++) {
                    Double v = pctCell(c < g.get(rr).size() ? g.get(rr).get(c) : "");
                    if (v != null) {
                        return v;
                    }
                }
                for (int cc = c + 1; cc < g.get(r).size(); cc++) {
                    String x = g.get(r).get(cc);
                    if (x.replaceAll("\\s+", "").equals(g.get(r).get(c).replaceAll("\\s+", ""))) {
                        continue;
                    }
                    return pctCell(x);
                }
            }
        }
        return null;
    }

    private static Double pctCell(String s) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*%?\\s*$").matcher(s);
        if (!m.matches()) {
            return null;
        }
        double v = Double.parseDouble(m.group(1));
        return v > 0 && v <= 100 ? v : null;
    }

    static final String CHILD_SEP = " › ";

    static final java.util.regex.Pattern NOT_TASK_NAME = RubricRules.NOT_TASK_NAME;

    /** 이웃한 '부모 › 자식' 항목 묶음 중 어느 자식에도 채점표가 붙지 않은 묶음을 부모 한 항목으로 합친다. 바뀐 게 없으면 같은 목록. */
    static List<RatioRules.Item> joinChildren(List<RatioRules.Item> items, List<List<SourceTable>> groups) {
        List<RatioRules.Item> out = new ArrayList<>();
        boolean changed = false;
        int i = 0;
        while (i < items.size()) {
            String p = parentOf(items.get(i).label());
            int j = i;
            while (p != null && j + 1 < items.size() && p.equals(parentOf(items.get(j + 1).label()))) {
                j++;
            }
            boolean anyRubric = false;
            boolean parentRubric = false;
            for (int k = i; k <= j && groups != null; k++) {
                anyRubric |= !groups.get(k).isEmpty();
                for (SourceTable t : groups.get(k)) {
                    parentRubric |= p != null && titledWith(t, p);
                }
            }
            // 자식에 붙은 채점표가 사실 부모 과제의 것(표 머리에 부모 이름: '평가 영역명 | 부모')이면 한 과제다
            if (p == null || j == i || (anyRubric && !parentRubric)) {
                out.addAll(items.subList(i, j + 1));
            } else {
                List<RatioRules.Item> run = items.subList(i, j + 1);
                boolean allW = run.stream().allMatch(x -> x.weightPercent() != null);
                boolean allM = run.stream().allMatch(x -> x.maxScore() != null);
                out.add(new RatioRules.Item(p,
                        allW ? Math.round(run.stream().mapToDouble(RatioRules.Item::weightPercent).sum() * 100) / 100.0 : null,
                        allM ? Math.round(run.stream().mapToDouble(RatioRules.Item::maxScore).sum() * 100) / 100.0 : null,
                        run.get(0).timing()));
                changed = true;
            }
            i = j + 1;
        }
        return changed ? out : items;
    }

    /** 표의 앞 두 행에 과제 이름(공백 무시, 앞 8자)이 있는가 */
    private static boolean titledWith(SourceTable t, String name) {
        String key = name.replaceAll("\\s+", "");
        key = key.length() > 8 ? key.substring(0, 8) : key;
        if (key.length() < 3) {
            return false;
        }
        List<List<String>> g = t.cells();
        for (List<String> row : g.subList(0, Math.min(2, g.size()))) {
            if (String.join("", row).replaceAll("\\s+", "").contains(key)) {
                return true;
            }
        }
        return false;
    }

    private static String parentOf(String label) {
        if (label == null) {
            return null;
        }
        int at = label.indexOf(CHILD_SEP);
        return at > 0 ? label.substring(0, at) : null;
    }

    private static RatioRules.Result safe(java.util.function.Supplier<RatioRules.Result> f) {
        try {
            return f.get();
        } catch (RuntimeException e) {
            return null;   // 서식이 안 맞는 표
        }
    }
}
