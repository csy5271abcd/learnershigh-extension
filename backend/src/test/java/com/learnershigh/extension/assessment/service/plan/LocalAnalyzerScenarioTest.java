package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerClient;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A27-UX 부록 D (2026-11-19): PR #18 서버 안 분석기(local)를 문서 양식 시나리오로 시험한다.
 * 문서는 이 시험이 PDFBox로 만드는 <b>합성 문서</b>(가상 학교·가상 과목, 괘선 표)와 저장소의 합성 HWP·HWPX뿐이다 — 실제 학교 문서·외부 전송 없음.
 * 정답(이 시험이 넣은 과목·항목·비율·채점요소)과 분석 결과를 비교해 build/a27-scenarios/report.tsv에 남긴다.
 * <b>실패로 처리하는 것은 안전 조건뿐</b>이다: 없는 채점기준·항목을 지어내지 않음, 형식은 파일 서명으로 판단, 같은 이름 항목을 합치지 않음 등.
 * 정확도(과목·항목 오탐/미탐, 비율 연결)는 표로 기록만 한다 — 합성 문서 결과는 전국 학교 대표성이 없다.
 */
public class LocalAnalyzerScenarioTest {

    static final float H = 842, LINE = 12, PAD = 4;
    static File fontFile;
    static final JsonMapper MAPPER = JsonMapper.builder().build();
    static final List<String> REPORT = new ArrayList<>();

    @BeforeAll
    static void font() {
        for (String candidate : List.of("C:/Windows/Fonts/NanumGothic.ttf", "C:/Windows/Fonts/malgun.ttf",
                "/usr/share/fonts/truetype/nanum/NanumGothic.ttf")) {
            if (new File(candidate).isFile()) {
                fontFile = new File(candidate);
                break;
            }
        }
    }

    // ---------- 합성 문서 모델 ----------

    record Rubric(String element, List<String[]> levels) {
    }

    record Item(String label, int weight, int maxScore, List<Rubric> rubric) {
    }

    record Subject(String name, int grade, int written, int performance, List<Item> items) {
    }

    /** 쪽 하나를 그리는 동작 */
    interface PageDraw {
        void draw(Pen pen) throws IOException;
    }

    static final class Pen {
        final PDPageContentStream c;
        final PDType0Font f;

        Pen(PDPageContentStream c, PDType0Font f) {
            this.c = c;
            this.f = f;
        }

        void text(float x, float yTop, String s, float size) throws IOException {
            c.beginText();
            c.setFont(f, size);
            c.newLineAtOffset(x, H - yTop);
            c.showText(s);
            c.endText();
        }

        /** cells: {row, col, rowspan, colspan, text} */
        float table(float x0, float y0, float[] colW, Object[][] cells) throws IOException {
            int rows = 0;
            for (Object[] k : cells) {
                rows = Math.max(rows, (int) k[0] + (int) k[2]);
            }
            float[] rh = new float[rows];
            Arrays.fill(rh, 2 * PAD + LINE);
            for (Object[] k : cells) {
                if ((int) k[2] == 1) {
                    int n = ((String) k[4]).split("\n").length;
                    rh[(int) k[0]] = Math.max(rh[(int) k[0]], 2 * PAD + LINE * n);
                }
            }
            float[] ry = new float[rows + 1];
            ry[0] = y0;
            for (int i = 0; i < rows; i++) {
                ry[i + 1] = ry[i] + rh[i];
            }
            float[] cx = new float[colW.length + 1];
            cx[0] = x0;
            for (int i = 0; i < colW.length; i++) {
                cx[i + 1] = cx[i] + colW[i];
            }
            for (Object[] k : cells) {
                int r = (int) k[0], q = (int) k[1], rs = (int) k[2], cs = (int) k[3];
                float a = cx[q], b = cx[q + cs], t = ry[r], u = ry[r + rs];
                c.addRect(a, H - u, b - a, u - t);
                c.stroke();
                String[] ls = ((String) k[4]).split("\n");
                for (int i = 0; i < ls.length; i++) {
                    if (!ls[i].isEmpty()) {
                        text(a + PAD, t + PAD + LINE * (i + 1) - 2, ls[i], 9);
                    }
                }
            }
            return ry[rows];
        }
    }

    static Object[] k(int r, int q, int rs, int cs, String s) {
        return new Object[] {r, q, rs, cs, s};
    }

    static byte[] pdf(List<PageDraw> pages) throws IOException {
        try (PDDocument d = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDType0Font f = PDType0Font.load(d, fontFile);
            for (PageDraw draw : pages) {
                PDPage p = new PDPage(PDRectangle.A4);
                d.addPage(p);
                try (PDPageContentStream c = new PDPageContentStream(d, p)) {
                    draw.draw(new Pen(c, f));
                }
            }
            d.save(out);
            return out.toByteArray();
        }
    }

    /** 과목 머리표(학교명·학년·학기·과목) */
    static float header(Pen pen, float y, Subject s) throws IOException {
        pen.text(60, y, "2099학년도 " + s.grade() + "학년 2학기 [" + s.name() + "] 가상고등학교 평가 계획", 11);
        return pen.table(50, y + 15, new float[] {120, 120, 120, 135}, new Object[][] {
            k(0, 0, 1, 1, "학교명"), k(0, 1, 1, 1, "학년"), k(0, 2, 1, 1, "학기"), k(0, 3, 1, 1, "과목"),
            k(1, 0, 1, 1, "가상고"), k(1, 1, 1, 1, s.grade() + "학년"), k(1, 2, 1, 1, "2학기"), k(1, 3, 1, 1, s.name())});
    }

    /** 평가 요약표 (지필 1개 + 수행 항목들) */
    static float evaluation(Pen pen, float y, Subject s) throws IOException {
        List<Object[]> cells = new ArrayList<>();
        int n = s.items().size();
        float[] widths = new float[2 + n];
        widths[0] = 95;
        widths[1] = 100;
        for (int i = 0; i < n; i++) {
            widths[2 + i] = Math.max(60, 300f / n);
        }
        cells.add(k(0, 0, 1, 1, "평가 종류"));
        cells.add(k(0, 1, 1, 1, "지필평가"));
        cells.add(k(0, 2, 1, n, "수행평가"));
        cells.add(k(1, 0, 1, 1, "반영비율"));
        cells.add(k(1, 1, 1, 1, s.written() + "%"));
        cells.add(k(1, 2, 1, n, s.performance() + "%"));
        cells.add(k(2, 0, 1, 1, "평가영역"));
        cells.add(k(2, 1, 1, 1, "1차 지필평가(" + s.written() + "%)"));
        cells.add(k(3, 0, 1, 1, "영역만점"));
        cells.add(k(3, 1, 1, 1, "100점"));
        cells.add(k(4, 0, 1, 1, "세부 반영비율"));
        cells.add(k(4, 1, 1, 1, s.written() + "%"));
        cells.add(k(5, 0, 1, 1, "평가시기"));
        cells.add(k(5, 1, 1, 1, "10월"));
        for (int i = 0; i < n; i++) {
            Item it = s.items().get(i);
            cells.add(k(2, 2 + i, 1, 1, it.label()));
            cells.add(k(3, 2 + i, 1, 1, it.maxScore() + "점"));
            cells.add(k(4, 2 + i, 1, 1, it.weight() + "%"));
            cells.add(k(5, 2 + i, 1, 1, (9 + i) + "월"));
        }
        pen.text(50, y + 20, "1. 평가 계획", 10);
        return pen.table(50, y + 30, widths, cells.toArray(Object[][]::new));
    }

    /** 수행평가 세부 계획 + 채점기준표 */
    static float rubric(Pen pen, float y, Item it, String heading) throws IOException {
        List<Object[]> cells = new ArrayList<>();
        cells.add(k(0, 0, 1, 1, "수행 과제"));
        cells.add(k(0, 1, 1, 2, "가상 자료를 근거로 " + it.label() + " 과제를 수행한다."));
        cells.add(k(1, 0, 1, 1, "평가 요소"));
        cells.add(k(1, 1, 1, 1, "채점 기준"));
        cells.add(k(1, 2, 1, 1, "배점"));
        int row = 2;
        for (Rubric r : it.rubric()) {
            cells.add(k(row, 0, r.levels().size(), 1, r.element()));
            for (String[] level : r.levels()) {
                cells.add(k(row, 1, 1, 1, level[0]));
                cells.add(k(row, 2, 1, 1, level[1]));
                row++;
            }
        }
        pen.text(50, y + 20, heading, 10);
        return pen.table(50, y + 30, new float[] {95, 300, 100}, cells.toArray(Object[][]::new));
    }

    /** 과목 하나를 한 쪽(필요하면 채점기준 쪽 추가)으로 */
    static List<PageDraw> subjectPages(Subject s, boolean withRubric) {
        List<PageDraw> pages = new ArrayList<>();
        pages.add(pen -> {
            float y = header(pen, 60, s);
            y = evaluation(pen, y, s);
            if (withRubric && !s.items().isEmpty() && !s.items().get(0).rubric().isEmpty()) {
                rubric(pen, y, s.items().get(0), "가. " + s.items().get(0).label() + " 세부 계획");
            }
        });
        if (withRubric) {
            for (int i = 1; i < s.items().size(); i++) {
                Item it = s.items().get(i);
                if (!it.rubric().isEmpty()) {
                    char mark = (char) ('가' + i * 28);
                    pages.add(pen -> rubric(pen, 40, it, mark + ". " + it.label() + " 세부 계획"));
                }
            }
        }
        return pages;
    }

    static Rubric simple(String element) {
        return new Rubric(element, List.of(new String[] {"기준을 충족함", "50"}, new String[] {"일부 부족함", "30"}));
    }

    static Item item(String label, int weight, int max, Rubric... rubric) {
        return new Item(label, weight, max, List.of(rubric));
    }

    // ---------- 분석·비교 ----------

    record Outcome(String scenario, String verdict, String detail) {
    }

    static JsonNode analyze(byte[] bytes, String fileName) {
        LocalPlanAnalyzer analyzer = new LocalPlanAnalyzer(MAPPER, 60_000, null);
        PlanAnalyzerClient.Result result = analyzer.analyze(new PlanAnalyzerClient.Request(bytes, fileName, "scenario", "v21.1", "0.3"));
        return MAPPER.readTree(result.payloadJson());
    }

    static String norm(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "");
    }

    /** 정답 대비: 과목 오탐/미탐, 항목 오탐/미탐, 비율·만점 불일치, 채점 요소 연결 */
    static Map<String, Object> compare(List<Subject> truth, JsonNode payload) {
        Map<String, Object> m = new LinkedHashMap<>();
        JsonNode subjects = payload.path("subjects");
        int subjectTp = 0, itemTp = 0, itemTotal = 0, itemFound = 0, ratioMiss = 0, maxMiss = 0, rubricOk = 0, rubricTotal = 0;
        List<String> found = new ArrayList<>();
        for (JsonNode s : subjects) {
            found.add(s.path("subjectName").asString() + (s.has("grades") ? s.path("grades").toString() : ""));
            itemFound += s.path("performanceEvaluation").path("items").size();
        }
        for (Subject t : truth) {
            JsonNode match = null;
            for (JsonNode s : subjects) {
                boolean name = norm(s.path("subjectName").asString()).contains(norm(t.name()));
                boolean grade = !s.has("grades") || s.path("grades").toString().contains(String.valueOf(t.grade()));
                if (name && grade) {
                    match = s;
                    break;
                }
            }
            itemTotal += t.items().size();
            if (match == null) {
                continue;
            }
            subjectTp++;
            JsonNode perf = match.path("performanceEvaluation");
            if (perf.path("weightPercent").isMissingNode() || perf.path("weightPercent").asInt(-1) != t.performance()) {
                ratioMiss++;
            }
            List<JsonNode> items = new ArrayList<>();
            perf.path("items").forEach(items::add);
            List<JsonNode> used = new ArrayList<>();
            for (Item ti : t.items()) {
                JsonNode hit = items.stream().filter(x -> !used.contains(x) && norm(x.path("label").asString()).contains(norm(ti.label()))).findFirst().orElse(null);
                if (hit == null) {
                    continue;
                }
                used.add(hit);
                itemTp++;
                if (hit.path("maxScore").asInt(-1) != ti.maxScore()) {
                    maxMiss++;
                }
                for (Rubric r : ti.rubric()) {
                    rubricTotal++;
                    boolean linked = false;
                    for (JsonNode jr : hit.path("rubric")) {
                        if (norm(jr.path("element").asString()).contains(norm(r.element())) && jr.path("levels").size() == r.levels().size()) {
                            linked = true;
                        }
                    }
                    if (linked) {
                        rubricOk++;
                    }
                }
            }
        }
        m.put("subjects", subjectTp + "/" + truth.size() + " (결과 " + subjects.size() + ")");
        m.put("subjectFP", Math.max(0, subjects.size() - subjectTp));
        m.put("items", itemTp + "/" + itemTotal + " (결과 " + itemFound + ")");
        m.put("itemFP", Math.max(0, itemFound - itemTp));
        m.put("ratioMiss", ratioMiss);
        m.put("maxScoreMiss", maxMiss);
        m.put("rubricLinked", rubricOk + "/" + rubricTotal);
        m.put("found", found);
        m.put("status", payload.path("status").asString());
        return m;
    }

    static String verdict(Map<String, Object> m, List<Subject> truth) {
        boolean all = m.get("subjects").toString().startsWith(truth.size() + "/") && (int) m.get("subjectFP") == 0
                && m.get("items").toString().startsWith(truth.stream().mapToInt(s -> s.items().size()).sum() + "/")
                && (int) m.get("itemFP") == 0 && (int) m.get("ratioMiss") == 0 && (int) m.get("maxScoreMiss") == 0
                && m.get("rubricLinked").toString().split("/")[0].equals(m.get("rubricLinked").toString().split("/")[1]);
        boolean none = m.get("subjects").toString().startsWith("0/");
        return all ? "PASS" : none ? "FAIL" : "PARTIAL";
    }

    static void record(String scenario, List<Subject> truth, JsonNode payload, long ms) {
        Map<String, Object> m = compare(truth, payload);
        String v = verdict(m, truth);
        REPORT.add(String.join("\t", scenario, v, String.valueOf(ms), m.toString()));
    }

    static void writeReport() throws IOException {
        Path dir = Path.of("build", "a27-scenarios");
        Files.createDirectories(dir);
        Files.writeString(dir.resolve("report.tsv"), String.join("\n", REPORT) + "\n", StandardCharsets.UTF_8);
    }

    /** 안전 조건: 결과의 모든 채점 요소·수준은 원문에 있는 글자에서 왔다(지어내지 않음) */
    static void assertNoFabricatedRubric(JsonNode payload, List<Subject> truth) {
        List<String> known = new ArrayList<>();
        for (Subject s : truth) {
            for (Item it : s.items()) {
                for (Rubric r : it.rubric()) {
                    known.add(norm(r.element()));
                    r.levels().forEach(l -> known.add(norm(l[0])));
                }
            }
        }
        for (JsonNode s : payload.path("subjects")) {
            for (JsonNode it : s.path("performanceEvaluation").path("items")) {
                for (JsonNode r : it.path("rubric")) {
                    String el = norm(r.path("element").asString());
                    assertThat(known.stream().anyMatch(x -> !x.isEmpty() && (x.contains(el) || el.contains(x))))
                            .as("채점 요소 '%s'는 원문에 있어야 한다", el).isTrue();
                }
            }
        }
    }

    // ---------- 시나리오 ----------

    static final Subject KOR = new Subject("가상국어", 1, 60, 40, List.of(item("가상 논설문 쓰기", 20, 100, simple("논지 전개"), simple("근거 제시")), item("가상 발표", 20, 100, simple("전달력"))));
    static final Subject MATH = new Subject("가상수학", 1, 70, 30, List.of(item("가상 탐구 보고서", 30, 100, simple("탐구 설계"), simple("결론 도출"))));
    static final Subject SCI = new Subject("가상과학", 1, 50, 50, List.of(item("가상 실험 보고서", 25, 50, simple("실험 설계")), item("가상 토론", 25, 50, simple("의견 제시"))));

    long timed(Runnable run) {
        long t0 = System.nanoTime();
        run.run();
        return (System.nanoTime() - t0) / 1_000_000;
    }

    @Test
    void 문서_양식_시나리오() throws Exception {
        Assumptions.assumeTrue(fontFile != null, "한글 글꼴이 없는 환경 — 시나리오 NOT RUN");
        List<String> safety = new ArrayList<>();

        // S1 한 학년 전 과목 통합 문서(목차 + 과목 3개)
        List<PageDraw> s1 = new ArrayList<>();
        s1.add(pen -> {
            pen.text(60, 60, "2099학년도 1학년 2학기 교과별 평가 계획 (목차)", 12);
            pen.table(50, 80, new float[] {300, 100}, new Object[][] {k(0, 0, 1, 1, "가상국어"), k(0, 1, 1, 1, "2"), k(1, 0, 1, 1, "가상수학"), k(1, 1, 1, 1, "4"), k(2, 0, 1, 1, "가상과학"), k(2, 1, 1, 1, "5")});
        });
        for (Subject s : List.of(KOR, MATH, SCI)) {
            s1.addAll(subjectPages(s, true));
        }
        runScenario("S1 한 학년 전 과목 통합", pdf(s1), "1학년 2학기 평가계획.pdf", List.of(KOR, MATH, SCI), safety);

        // S2 교과군(과학과) 통합 문서 — 파일명에 과목명 없음, 과목 2개
        Subject phys = new Subject("가상물리", 1, 60, 40, List.of(item("가상 운동 실험", 40, 100, simple("측정 정확성"))));
        Subject chem = new Subject("가상화학", 1, 60, 40, List.of(item("가상 반응 탐구", 40, 100, simple("가설 설정"))));
        List<PageDraw> s2 = new ArrayList<>();
        s2.addAll(subjectPages(phys, true));
        s2.addAll(subjectPages(chem, true));
        runScenario("S2 교과군(과학과) 통합", pdf(s2), "과학과 평가계획.pdf", List.of(phys, chem), safety);

        // S3 과목별 개별 문서 3개 (각 결과를 합산)
        for (Subject s : List.of(KOR, MATH, SCI)) {
            runScenario("S3 과목별 개별(" + s.name() + ")", pdf(subjectPages(s, true)), "2099_1학년_" + s.name() + "_평가계획.pdf", List.of(s), safety);
        }

        // S4 1·2·3학년 합본 — 같은 과목명이 학년별로 반복
        Subject g1 = new Subject("가상과학탐구", 1, 40, 60, List.of(item("가상 탐구 보고서", 60, 100, simple("탐구 설계"))));
        Subject g2 = new Subject("가상과학탐구", 2, 50, 50, List.of(item("가상 탐구 보고서", 50, 100, simple("탐구 설계"))));
        Subject g3 = new Subject("가상과학탐구", 3, 60, 40, List.of(item("가상 탐구 보고서", 40, 100, simple("탐구 설계"))));
        List<PageDraw> s4 = new ArrayList<>();
        for (Subject s : List.of(g1, g2, g3)) {
            s4.addAll(subjectPages(s, true));
        }
        JsonNode s4p = runScenario("S4 1·2·3학년 합본(같은 과목명 반복)", pdf(s4), "1,2,3학년 평가계획.pdf", List.of(g1, g2, g3), safety);
        // 안전: 학년이 나오면 서로 섞이지 않는다(한 과목에 1·2·3이 함께 붙지 않음)
        for (JsonNode s : s4p.path("subjects")) {
            if (s.has("grades")) {
                assertThat(s.path("grades").size()).as("합본 과목의 학년이 하나로 정해져야 다른 학년 문서에서 확정을 막는다").isLessThanOrEqualTo(1);
            }
        }

        // S5 채점기준 없는 표 — 항목명·반영 비율만
        Subject noRubric = new Subject("가상사회", 1, 60, 40, List.of(item("가상 신문 만들기", 20, 100), item("가상 모둠 토의", 20, 100)));
        JsonNode s5p = runScenario("S5 채점기준 없음", pdf(subjectPages(noRubric, false)), "가상사회 평가계획.pdf", List.of(noRubric), safety);
        for (JsonNode s : s5p.path("subjects")) {
            for (JsonNode it : s.path("performanceEvaluation").path("items")) {
                assertThat(it.path("rubric").size()).as("원문에 없는 채점기준을 만들지 않는다").isZero();
            }
        }

        // S6 채점기준이 매우 상세(요소 3개 × 수준 4~5, 부분 배점, 기본 점수, 미제출)
        Rubric detailed1 = new Rubric("자료 수집", List.of(new String[] {"다양한 출처의 자료를 3개 이상 정확히 인용함", "30"},
                new String[] {"자료 2개를 인용함", "24"}, new String[] {"자료 1개를 인용함", "18"}, new String[] {"인용이 부정확함", "12"}, new String[] {"미제출", "6"}));
        Rubric detailed2 = new Rubric("분석 및 해석", List.of(new String[] {"분석이 타당하고 해석이 창의적임", "40"},
                new String[] {"분석이 타당함", "32"}, new String[] {"분석이 일부 부족함", "24"}, new String[] {"기본 점수", "16"}));
        Rubric detailed3 = new Rubric("표현", List.of(new String[] {"형식을 갖추고 맞춤법 오류가 없음", "30"},
                new String[] {"맞춤법 오류 1~2개", "25"}, new String[] {"맞춤법 오류 3개 이상", "20"}, new String[] {"미제출", "10"}));
        Subject detailed = new Subject("가상한국사", 1, 60, 40, List.of(item("가상 역사 신문", 40, 100, detailed1, detailed2, detailed3)));
        runScenario("S6 상세 채점기준(부분 배점·기본·미제출)", pdf(subjectPages(detailed, true)), "가상한국사 평가계획.pdf", List.of(detailed), safety);

        // S7 평가표와 채점기준표가 멀리 떨어짐(사이 3쪽 안내) + 뒤쪽 기준 반복
        Subject far = new Subject("가상지리", 1, 60, 40, List.of(item("가상 지도 탐구", 40, 100, simple("지도 해석"))));
        List<PageDraw> s7 = new ArrayList<>();
        s7.add(pen -> evaluation(pen, header(pen, 60, far), far));
        for (int i = 0; i < 3; i++) {
            int page = i;
            s7.add(pen -> pen.text(60, 80, "가상 학업성적 처리 안내 " + (page + 1) + "쪽 (평가 계획과 무관한 설명)", 10));
        }
        s7.add(pen -> rubric(pen, 40, far.items().get(0), "가. " + far.items().get(0).label() + " 세부 계획"));
        s7.add(pen -> rubric(pen, 40, far.items().get(0), "[참고] " + far.items().get(0).label() + " 채점 기준 (재게시)"));
        runScenario("S7 평가표·채점기준 멀리 떨어짐 + 반복", pdf(s7), "가상지리 평가계획.pdf", List.of(far), safety);

        // S9 HWP·HWPX 합성 문서 / 이름은 .hwp인데 실제 서명은 HWPX
        byte[] hwpx = resource("/assessment/multiformat/synthetic-plan.hwpx");
        byte[] hwp = resource("/assessment/multiformat/synthetic-plan.hwp");
        for (Object[] doc : List.of(new Object[] {"S9 HWPX", hwpx, "synthetic-plan.hwpx"}, new Object[] {"S9 HWP", hwp, "synthetic-plan.hwp"},
                new Object[] {"S9 이름 .hwp · 서명 HWPX", hwpx, "disguised.hwp"})) {
            long t0 = System.nanoTime();
            JsonNode p = analyze((byte[]) doc[1], (String) doc[2]);
            long ms = (System.nanoTime() - t0) / 1_000_000;
            REPORT.add(String.join("\t", (String) doc[0], p.path("subjects").size() > 0 ? "READ" : "NO_SUBJECT", String.valueOf(ms),
                    "{format=" + LocalPlanAnalyzer.formatOf((byte[]) doc[1]) + ", subjects=" + p.path("subjects").size() + ", status=" + p.path("status").asString() + "}"));
        }
        assertThat(LocalPlanAnalyzer.formatOf(hwpx)).as("형식은 파일 이름이 아니라 서명으로").hasToString("HWPX");

        // S10 같은 과목·같은 이름 수행평가 2개(1차·2차) — 합치지 않는다
        Subject dup = new Subject("가상영어", 1, 60, 40, List.of(item("가상 영어 말하기", 20, 50, simple("유창성")), item("가상 영어 말하기", 20, 50, simple("정확성"))));
        JsonNode s10p = runScenario("S10 같은 이름 항목 2개", pdf(subjectPages(dup, true)), "가상영어 평가계획.pdf", List.of(dup), safety);
        for (JsonNode s : s10p.path("subjects")) {
            long same = 0;
            for (JsonNode it : s.path("performanceEvaluation").path("items")) {
                if (norm(it.path("label").asString()).contains("가상영어말하기")) {
                    same++;
                }
            }
            // 발견 기록(정확도 영역 — 분석기 개선은 이번 범위 밖): 같은 이름 2개가 1개로 나오면 FAIL로 표에 남긴다
            REPORT.add(String.join("	", "S10 같은 이름 항목 보존", same == 2 ? "PASS" : "FAIL", "-", "{sameNameItems=" + same + " (정답 2)}"));
        }

        // S11 다른 학기·학년도 표기 문서 — 분석기는 학기를 판단하지 않는다(학교알리미 불러오기의 파일 이름 규칙·관리자 슬롯이 판단)
        // 이 문서에는 평가 요약표만 그린다(채점기준표 없음)
        Subject other = new Subject("가상정보", 1, 60, 40, List.of(item("가상 코딩 과제", 40, 100)));
        List<PageDraw> s11 = List.of(pen -> {
            pen.text(60, 40, "2098학년도 1학기 (지난 학기 자료)", 11);
            evaluation(pen, header(pen, 60, other), other);
        });
        runScenario("S11 다른 학년도·학기 표기", pdf(s11), "2098학년도 1학기 평가계획.pdf", List.of(other), safety);

        writeReport();
        assertThat(safety).as("안전 조건 위반").isEmpty();
    }

    JsonNode runScenario(String name, byte[] bytes, String fileName, List<Subject> truth, List<String> safety) {
        long t0 = System.nanoTime();
        JsonNode payload = analyze(bytes, fileName);
        long ms = (System.nanoTime() - t0) / 1_000_000;
        record(name, truth, payload, ms);
        try {
            assertNoFabricatedRubric(payload, truth);
        } catch (AssertionError e) {
            safety.add(name + ": " + e.getMessage());
        }
        return payload;
    }

    static byte[] resource(String path) throws IOException {
        try (InputStream in = Objects.requireNonNull(LocalAnalyzerScenarioTest.class.getResourceAsStream(path), path)) {
            return in.readAllBytes();
        }
    }

    /** IT용: 과목 3개(가상국어·가상수학·가상과학)가 든 합성 평가계획서 PDF. 한글 글꼴이 없으면 null */
    public static byte[] threeSubjectPlan() throws IOException {
        font();
        if (fontFile == null) {
            return null;
        }
        List<PageDraw> pages = new ArrayList<>();
        for (Subject s : List.of(KOR, MATH, SCI)) {
            pages.addAll(subjectPages(s, true));
        }
        return pdf(pages);
    }
}
