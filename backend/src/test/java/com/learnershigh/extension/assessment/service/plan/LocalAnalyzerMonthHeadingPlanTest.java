package com.learnershigh.extension.assessment.service.plan;

import static com.learnershigh.extension.assessment.service.plan.LocalAnalyzerScenarioTest.evaluation;
import static com.learnershigh.extension.assessment.service.plan.LocalAnalyzerScenarioTest.header;
import static com.learnershigh.extension.assessment.service.plan.LocalAnalyzerScenarioTest.item;
import static com.learnershigh.extension.assessment.service.plan.LocalAnalyzerScenarioTest.k;
import static com.learnershigh.extension.assessment.service.plan.LocalAnalyzerScenarioTest.pdf;
import static com.learnershigh.extension.assessment.service.plan.LocalAnalyzerScenarioTest.simple;
import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.assessment.service.plan.LocalAnalyzerScenarioTest.Pen;
import com.learnershigh.extension.assessment.service.plan.LocalAnalyzerScenarioTest.Subject;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

/**
 * A28-27: 표 밖 월 제목('■ 8월') + '주' 열 진도표를 합성 PDF(가상 학교·가상 과목, 실제 학교 문서 아님)로 끝까지 분석한다.
 * 과목 2개 · 여러 달 · 쪽을 넘긴 표 · 다른 과목으로 월이 번지지 않음 · 본문 문장 속 월 무시 · 성취수준 표 무시 ·
 * 평가 정보(비율·항목)는 그대로.
 */
class LocalAnalyzerMonthHeadingPlanTest {

    static final Subject A = new Subject("가상국어", 1, 60, 40, List.of(item("가상 논설문 쓰기", 40, 100, simple("논지 전개"))));
    static final Subject B = new Subject("가상과학", 1, 60, 40, List.of(item("가상 탐구 보고서", 40, 100, simple("탐구 설계"))));

    @BeforeAll
    static void font() {
        LocalAnalyzerScenarioTest.font();
    }

    static float weekTable(Pen pen, float y, String[][] rows) throws IOException {
        List<Object[]> cells = new ArrayList<>(List.of(k(0, 0, 1, 1, "주"), k(0, 1, 1, 1, "단원명"), k(0, 2, 1, 1, "교육과정 성취기준"),
                k(0, 3, 1, 1, "수업방법")));
        for (int r = 0; r < rows.length; r++) {
            for (int c = 0; c < 4; c++) {
                cells.add(k(r + 1, c, 1, 1, rows[r][c]));
            }
        }
        return pen.table(50, y, new float[] {50, 150, 200, 95}, cells.toArray(Object[][]::new));
    }

    @Test
    void 표_밖_월_제목과_주_열_진도표를_과목별로_읽는다() throws Exception {
        Assumptions.assumeTrue(LocalAnalyzerScenarioTest.fontFile != null, "한글 글꼴이 없는 환경 — NOT RUN");
        byte[] bytes = pdf(List.of(
                pen -> {   // 1쪽: 과목 A 머리·평가표 + '■ 8월' 진도표
                    float y = evaluation(pen, header(pen, 40, A), A);
                    pen.text(50, y + 25, "1 [ 가상국어 ] 교수·학습 운영 계획", 11);
                    pen.text(50, y + 45, "■ 8월", 10);
                    weekTable(pen, y + 52, new String[][] {
                        {"3-4", "1. 가상 문학의 흐름", "[10가국-01] 가상 작품을 수용한다.", "강의법"},
                        {"5", "2. 가상 읽기", "[10가국-02] 가상 글을 읽는다.", "토의"}});
                },
                pen -> {   // 2쪽: '■ 9월'
                    pen.text(50, 60, "■ 9월", 10);
                    weekTable(pen, 70, new String[][] {
                        {"1~2", "3. 가상 소통", "[10가국-03] 가상 자료를 평가한다.", "강의법"},
                        {"3-4", "4. 가상 문법", "[10가국-04] 가상 맞춤법을 적용한다.", "탐구"}});
                },
                pen -> {   // 3쪽: 9월 표가 쪽을 넘겨 이어짐(제목 없음, 같은 머리 줄 반복)
                    weekTable(pen, 60, new String[][] {{"5", "5. 가상 쓰기", "[10가국-05] 가상 보고서를 쓴다.", "협력 학습"}});
                    pen.text(50, 200, "성취기준별 성취수준", 10);
                    pen.text(50, 215, "■ 11월", 10);   // 아래 표는 '주' 열이 없는 성취수준 표 — 진도표 아님
                    pen.table(50, 222, new float[] {200, 60, 235}, new Object[][] {
                        k(0, 0, 1, 1, "성취기준"), k(0, 1, 1, 1, "수준"), k(0, 2, 1, 1, "성취기준별 성취수준"),
                        k(1, 0, 1, 1, "[10가국-01] 가상 작품"), k(1, 1, 1, 1, "A"), k(1, 2, 1, 1, "작품을 깊이 있게 수용한다.")});
                },
                pen -> {   // 4쪽: 과목 B — 본문 문장 속 월 다음 표는 버리고, '■ 10월' 표만 읽는다(앞 과목의 9월이 번지지 않음)
                    float y = evaluation(pen, header(pen, 40, B), B);
                    pen.text(50, y + 25, "1 [ 가상과학 ] 교수·학습 운영 계획", 11);
                    pen.text(50, y + 45, "※ 진단 평가는 10월 3주에 실시한다.", 10);
                    float y2 = weekTable(pen, y + 52, new String[][] {{"1", "0. 가상 안내", "[10가과-00] 안내", "강의법"}});
                    pen.text(50, y2 + 25, "■ 10월", 10);
                    weekTable(pen, y2 + 32, new String[][] {{"1-2", "1. 가상 역학", "[10가과-01] 가상 운동을 설명한다.", "실험"}});
                }));
        JsonNode payload = LocalAnalyzerScenarioTest.analyze(bytes, "2099학년도 2학기 1학년 교수 학습 및 평가 운영 계획.pdf");

        JsonNode a = subject(payload, "가상국어");
        JsonNode b = subject(payload, "가상과학");
        assertThat(a).as("과목 A").isNotNull();
        assertThat(b).as("과목 B").isNotNull();
        List<String> ra = rows(a);
        assertThat(ra).containsExactly(
                "8|3-4|3|4|WEEK_IN_MONTH|p1|1.가상문학의흐름",
                "8|5|5|5|WEEK_IN_MONTH|p1|2.가상읽기",
                "9|1~2|1|2|WEEK_IN_MONTH|p2|3.가상소통",
                "9|3-4|3|4|WEEK_IN_MONTH|p2|4.가상문법",
                "9|5|5|5|WEEK_IN_MONTH|p3|5.가상쓰기");
        assertThat(rows(b)).containsExactly("10|1-2|1|2|WEEK_IN_MONTH|p4|1.가상역학");
        // 날짜를 만들지 않는다
        for (JsonNode r : a.path("teachingPlan")) {
            assertThat(r.path("schedule").has("dateFrom")).isFalse();
            assertThat(r.has("date")).isFalse();
            assertThat(r.path("schedule").path("monthTo").isNull() || r.path("schedule").path("monthTo").isMissingNode()).isTrue();
        }
        // 평가 정보(비율·항목)는 그대로
        assertThat(a.path("performanceEvaluation").path("items")).hasSize(1);
        assertThat(b.path("performanceEvaluation").path("items")).hasSize(1);
    }

    static JsonNode subject(JsonNode payload, String name) {
        for (JsonNode s : payload.path("subjects")) {
            if (s.path("subjectName").asString().replaceAll("\\s+", "").contains(name)) {
                return s;
            }
        }
        return null;
    }

    static List<String> rows(JsonNode s) {
        List<String> out = new ArrayList<>();
        for (JsonNode r : s.path("teachingPlan")) {
            JsonNode sc = r.path("schedule");
            out.add(sc.path("monthFrom").asString() + "|" + r.path("weekLabel").asString() + "|" + r.path("weekFrom").asString() + "|"
                    + r.path("weekTo").asString() + "|" + sc.path("precision").asString() + "|p" + r.path("sources").get(0).path("pdfPageNumber").asString()
                    + "|" + r.path("unit").asString().replaceAll("\\s+", ""));   // 합성 PDF 글자 추출은 띄어쓰기를 잃는다
        }
        return out;
    }
}
