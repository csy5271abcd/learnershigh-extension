package com.learnershigh.extension.assessment.service.plan.extract;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * A28-27: 월이 표 밖 제목('■ 8월')에 있고 표에는 '주' 열만 있는 월별 운영계획(예: 학교알리미 공시 PDF 일부 형식).
 * 양성(제목 월 + 주 열, 주 칸의 월 우선, 쪽을 넘긴 표) · 음성(본문 문장 속 월, 다른 과목, 사이에 다른 표·쪽 건너뜀, 월 열 없는 다른 표) ·
 * 회귀(월 열이 있는 기존 진도표는 그대로).
 */
class TeachingPlanMonthHeadingTest {

    static final List<String> HEAD = List.of("주", "단원명", "교육과정 성취기준", "수업방법", "수업·평가 연계의 주안점");

    static List<List<String>> weekTable(List<String>... body) {
        List<List<String>> g = new java.util.ArrayList<>();
        g.add(HEAD);
        g.addAll(List.of(body));
        return g;
    }

    static final List<List<String>> AUG = weekTable(
            List.of("3-4", "1. 한국 문학의 흐름", "[10공국2-05-01] 한국 문학사의 흐름을 고려하여 작품을 수용한다.", "강의법", "(관찰 평가)"),
            List.of("5", "5. 함께 읽고 쓰는 즐거움", "[10공국2-03-01] 작문 관습의 특성을 이해한다.", "토의", ""));

    @Test
    void 월_제목은_표_바로_앞_마지막_본문_줄이_월_하나뿐일_때만() {
        assertThat(TeachingPlanRules.headingMonth("[공통국어2]과 교수·학습 및 평가 운영 계획\n1 [ 공통국어2 ] 교수·학습 운영 계획\n■ 8월")).isEqualTo(8);
        assertThat(TeachingPlanRules.headingMonth("앞 표 내용\n- 1 -\n■ 9월")).isEqualTo(9);
        assertThat(TeachingPlanRules.headingMonth("■ 10월\n- 3 -")).as("월 제목 뒤 쪽 번호 줄은 건너뛴다").isEqualTo(10);
        assertThat(TeachingPlanRules.headingMonth("8월")).isEqualTo(8);
        assertThat(TeachingPlanRules.headingMonth("2026년 8월")).isEqualTo(8);
        assertThat(TeachingPlanRules.headingMonth("[9월] 교수·학습 운영 계획")).isEqualTo(9);
        assertThat(TeachingPlanRules.headingMonth("< 12월 >")).isEqualTo(12);
        assertThat(TeachingPlanRules.headingMonth("■ １월")).as("전각 숫자").isEqualTo(1);
        // 음성: 본문 문장·날짜·평가 시기·행사 안내
        assertThat(TeachingPlanRules.headingMonth("※ 8월 2주에 진단평가를 실시한다.")).isNull();
        assertThat(TeachingPlanRules.headingMonth("평가 시기 10월 3주")).isNull();
        assertThat(TeachingPlanRules.headingMonth("2026. 8. 21.")).isNull();
        assertThat(TeachingPlanRules.headingMonth("■ 8월 행사: 축제")).isNull();
        assertThat(TeachingPlanRules.headingMonth("13월")).isNull();
        assertThat(TeachingPlanRules.headingMonth("■ 8월\n위 일정은 학교 사정에 따라 바뀔 수 있다.")).as("월 제목 뒤에 본문이 있으면 그 표의 제목이 아니다").isNull();
        assertThat(TeachingPlanRules.headingMonth("")).isNull();
        assertThat(TeachingPlanRules.headingMonth(null)).isNull();
    }

    @Test
    void 제목_월과_주_열로_행을_만들고_날짜는_만들지_않는다() {
        List<TeachingPlanRules.Row> rows = TeachingPlanRules.rows(AUG, 8);
        assertThat(rows).hasSize(2);
        TeachingPlanRules.Row a = rows.get(0);
        assertThat(a.month()).isEqualTo(8);
        assertThat(a.monthTo()).isNull();
        assertThat(a.weekLabel()).isEqualTo("3-4");
        assertThat(a.weekFrom()).isEqualTo(3);
        assertThat(a.weekTo()).isEqualTo(4);
        assertThat(a.unit()).isEqualTo("1. 한국 문학의 흐름");
        assertThat(a.standards()).extracting(TeachingPlanRules.Standard::code).containsExactly("10공국2-05-01");
        assertThat(a.teachingMethods()).containsExactly("강의법");
        assertThat(a.evidence()).as("근거 글자는 원문 칸 그대로(지어낸 월 표기 없음)").isEqualTo("1. 한국 문학의 흐름");
        assertThat(rows.get(1).weekFrom()).isEqualTo(5);
        assertThat(rows.get(1).weekTo()).isEqualTo(5);
    }

    @Test
    void 주_칸에_월이_적혀_있으면_그_월이_우선() {
        List<TeachingPlanRules.Row> rows = TeachingPlanRules.rows(weekTable(
                List.of("8월 3~4주", "1. 단원 가", "[10가-01] 가", "강의", ""),
                List.of("9월 1주", "2. 단원 나", "[10가-02] 나", "토의", "")), 8);
        assertThat(rows).extracting(TeachingPlanRules.Row::month).containsExactly(8, 9);
        assertThat(rows).extracting(TeachingPlanRules.Row::weekFrom).containsExactly(3, 1);
        assertThat(rows).extracting(TeachingPlanRules.Row::weekTo).containsExactly(4, 1);
    }

    @Test
    void 반복_머리_빈_줄_주가_없는_줄은_행이_아니다() {
        List<TeachingPlanRules.Row> rows = TeachingPlanRules.rows(weekTable(
                List.of("1~2", "2. 디지털 시민의 소통", "[10공국2-02-01] 관점을 평가하며 읽는다.", "강의법", ""),
                HEAD,
                List.of("", "", "", "", ""),
                List.of("", "※ 학교 사정에 따라 바뀔 수 있음", "", "", ""),
                List.of("1~2", "2. 디지털 시민의 소통", "[10공국2-02-01] 관점을 평가하며 읽는다.", "강의법", "")), 9);
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).weekLabel()).isEqualTo("1~2");
    }

    @Test
    void PDF_표_읽기가_한_행을_여러_줄로_나눈_것은_한_행으로_합친다() {
        // 보라고 2학년 법과 사회 p.181: 같은 주·단원·성취기준 줄이 병합 칸 경계마다 반복(수업방법 조각만 다름)
        List<TeachingPlanRules.Row> rows = TeachingPlanRules.rows(weekTable(
                List.of("1", "Ⅳ-3. 민주 시민의 법적 문제 해결", "[12법사04-03] 법적 문제를 해결한다.", "토의", ""),
                List.of("1", "Ⅳ-3. 민주 시민의 법적 문제 해결", "[12법사04-03] 법적 문제를 해결한다.", "모둠협력수업", "(자기평가)"),
                List.of("1", "Ⅳ-3. 민주 시민의 법적 문제 해결", "[12법사04-03] 법적 문제를 해결한다.", "토의", "(자기평가)"),
                List.of("2", "Ⅱ-3. 형법과 형사 절차", "[12법사02-03] 형법을 이해한다.", "강의", ""),
                List.of("2", "Ⅱ-3. 형법과 형사 절차", "[12법사02-04] 사법을 이해한다.", "강의", "")), 10);
        assertThat(rows).extracting(TeachingPlanRules.Row::weekLabel).containsExactly("1", "2", "2");
        assertThat(rows.get(0).teachingMethods()).containsExactly("토의", "모둠협력수업");
        assertThat(rows.get(1).standards()).extracting(TeachingPlanRules.Standard::code).containsExactly("12법사02-03");
        assertThat(rows.get(2).standards()).as("성취기준이 다르면 다른 행").extracting(TeachingPlanRules.Standard::code).containsExactly("12법사02-04");
    }

    @Test
    void 두_달_제목은_월_범위로_두고_주_위치는_정하지_않는다() {
        assertThat(TeachingPlanRules.heading("- 19 -\n■ 12월, 1월")).isEqualTo(new TeachingPlanRules.MonthHeading(12, 1));
        assertThat(TeachingPlanRules.heading("■ 12~1월")).isEqualTo(new TeachingPlanRules.MonthHeading(12, 1));
        assertThat(TeachingPlanRules.heading("■ 3월·4월")).isEqualTo(new TeachingPlanRules.MonthHeading(3, 4));
        assertThat(TeachingPlanRules.heading("■ 8월")).isEqualTo(new TeachingPlanRules.MonthHeading(8, null));
        assertThat(TeachingPlanRules.heading("■ 12월, 1월 행사 안내")).isNull();
        List<TeachingPlanRules.Row> rows = TeachingPlanRules.rows(weekTable(
                List.of("1", "Ⅲ-1. 함수", "[10공수2-03-02] 함수의 뜻을 안다.", "강의", ""),
                List.of("1월 2주", "Ⅲ-2. 역함수", "[10공수2-03-03] 역함수를 구한다.", "강의", "")), new TeachingPlanRules.MonthHeading(12, 1));
        TeachingPlanRules.Row a = rows.get(0);
        assertThat(a.month()).isEqualTo(12);
        assertThat(a.monthTo()).isEqualTo(1);
        assertThat(a.weekLabel()).as("원문 주 표기는 남긴다").isEqualTo("1");
        assertThat(a.weekFrom()).as("12월 1주인지 1월 1주인지 원문만으로 정할 수 없다").isNull();
        assertThat(a.weekTo()).isNull();
        TeachingPlanRules.Row b = rows.get(1);
        assertThat(b.month()).as("주 칸에 적힌 월이 우선").isEqualTo(1);
        assertThat(b.monthTo()).isEqualTo(1);
        assertThat(b.weekFrom()).isEqualTo(2);
    }

    @Test
    void 주_칸이_다음_달로_넘어가면_제목_달부터_그_달까지_범위로_두고_주_위치는_비운다() {
        // 보라고 3학년 '■ 12월, 1월' 표의 '5 - 1월 2주'(12월 5주 ~ 1월 2주), 1학년 체육2 '4-1월 2주'
        List<TeachingPlanRules.Row> rows = TeachingPlanRules.rows(weekTable(
                List.of("5 - 1월 2주", "7. 사회를 향한 말과 글", "[12화작03-05] 비평하는 글을 쓴다.", "프로젝트", ""),
                List.of("4-1월 2주", "1. 체력증진", "[12체육2-01-03] 안전의 중요성을 이해한다.", "협력", "")), new TeachingPlanRules.MonthHeading(12, 1));
        assertThat(rows).hasSize(2);
        assertThat(rows).extracting(TeachingPlanRules.Row::month).containsExactly(12, 12);
        assertThat(rows).extracting(TeachingPlanRules.Row::monthTo).containsExactly(1, 1);
        assertThat(rows).extracting(TeachingPlanRules.Row::weekFrom).containsOnlyNulls();
        assertThat(rows).extracting(TeachingPlanRules.Row::weekLabel).containsExactly("5 - 1월 2주", "4-1월 2주");
        // 한 달 제목 아래 '4 - 12월 1주' → 11~12월
        List<TeachingPlanRules.Row> one = TeachingPlanRules.rows(weekTable(List.of("4 - 12월 1주", "가. 단원", "[가-01] 가", "강의", "")), 11);
        assertThat(one.get(0).month()).isEqualTo(11);
        assertThat(one.get(0).monthTo()).isEqualTo(12);
        assertThat(one.get(0).weekFrom()).isNull();
        // 숫자 없는 주 칸(소계·안내)은 행이 아니다
        assertThat(TeachingPlanRules.rows(weekTable(List.of("계", "소계", "", "", "")), 11)).isNull();
    }

    @Test
    void 월_제목이_없거나_주_열이_없으면_진도표로_읽지_않는다() {
        assertThat(TeachingPlanRules.rows(AUG)).as("기존 rows(g): 월 열이 없으면 null").isNull();
        assertThat(TeachingPlanRules.rows(AUG, (Integer) null)).isNull();
        assertThat(TeachingPlanRules.rows(AUG, 13)).isNull();
        // 성취수준 표·채점표: 주 열이 없다
        List<List<String>> level = List.of(List.of("성취기준", "성취기준별 성취수준", "성취기준별 성취수준"),
                List.of("[10공국2-01-01] 청중의 관심", "A", "청중의 관심과 요구를 고려하여 발표한다."));
        assertThat(TeachingPlanRules.rows(level, 11)).isNull();
        assertThat(TeachingPlanRules.weekOnlyPlanTable(level)).isFalse();
        // 학교 행사표: 단원·성취기준 열이 없다
        List<List<String>> event = List.of(List.of("주", "행사", "비고"), List.of("1", "개학식", ""), List.of("3", "학교 축제", ""));
        assertThat(TeachingPlanRules.rows(event, 9)).isNull();
        assertThat(TeachingPlanRules.weekOnlyPlanTable(event)).isFalse();
        assertThat(TeachingPlanRules.weekOnlyPlanTable(AUG)).isTrue();
    }

    @Test
    void 월_열이_있는_기존_진도표는_제목_월을_무시하고_그대로() {
        List<List<String>> monthCol = List.of(
                List.of("월", "주", "단원", "성취기준", "수업방법"),
                List.of("3", "1~2", "1. 듣기·말하기", "[10공국1-01] 말한다", "강의"),
                List.of("4", "3", "2. 읽기", "[10공국1-02] 읽는다", "토의"));
        assertThat(TeachingPlanRules.rows(monthCol, 9)).extracting(TeachingPlanRules.Row::month).containsExactly(3, 4);
        assertThat(TeachingPlanRules.rows(monthCol, 9)).usingRecursiveComparison().isEqualTo(TeachingPlanRules.rows(monthCol));
        assertThat(TeachingPlanRules.weekOnlyPlanTable(monthCol)).isFalse();
    }

    // ---------- 표 순서 문맥(PlanExtractor.contextMonths) ----------

    /** contextMonths 결과를 비교하기 쉬운 값으로: 한 달 = 그 월, 두 달 = "12-1", 없음 = null */
    static Object[] months(TeachingPlanRules.MonthHeading[] m) {
        Object[] out = new Object[m.length];
        for (int i = 0; i < m.length; i++) {
            out[i] = m[i] == null ? null : m[i].range() ? m[i].from() + "-" + m[i].to() : (Object) m[i].from();
        }
        return out;
    }

    static SourceTable pdf(int page, List<List<String>> cells, String ctx) {
        return new SourceTable(page, null, null, cells, null, ctx);
    }

    static SourceTable hwp(List<List<String>> cells, String ctx) {
        return new SourceTable(null, 0, "s0/t", cells, null, ctx);
    }

    @Test
    void 쪽을_넘겨_이어진_같은_과목_표는_앞_표의_월을_이어받는다() {
        List<SourceTable> t = List.of(
                pdf(93, AUG, "1 [ 통합과학2 ] 교수·학습 운영 계획\n■ 10월"),
                pdf(94, AUG, "■ 10월\n신재생 에너지 기술의 활용 방안 제안서 제작하기\n- 93 -"));
        Object[] m = months(PlanExtractor.contextMonths(t, new String[] {"통합과학2", "통합과학2"}, new int[] {5, 5}));
        assertThat(m).containsExactly(10, 10);
        // 앞 쪽 끝 글자(ctx 앞부분)에 그 앞 표의 '■ 8월' 이 남아 있어도 마지막 월 표시가 '■ 9월' 이면 9월을 이어받는다(보라고 화학 실험 p.58→59)
        List<SourceTable> u = List.of(
                pdf(58, AUG, "1 화학 실험 교수·학습 운영 계획\n■ 8월"),
                pdf(58, AUG, "■ 8월\n앞 표 본문\n■ 9월"),
                pdf(59, AUG, "■ 8월\n앞 표 본문\n■ 9월\n9월 표 본문\n- 58 -"));
        assertThat(months(PlanExtractor.contextMonths(u, new String[] {"화학 실험", "화학 실험", "화학 실험"}, new int[] {3, 3, 3})))
                .containsExactly(8, 9, 9);
        // 다음 쪽 표의 병합 칸이 더 많이 펼쳐져 있어도(단원명 칸 3개) 같은 머리로 본다
        List<List<String>> wide = List.of(List.of("주", "단원명", "단원명", "단원명", "교육과정 성취기준", "수업방법", "수업·평가 연계의 주안점"),
                List.of("2", "Ⅱ-11. 증기압", "Ⅱ-11. 증기압", "Ⅱ-11. 증기압", "[12화실-02-04] 증기압을 측정한다.", "실험", ""));
        assertThat(months(PlanExtractor.contextMonths(List.of(pdf(58, AUG, "■ 9월"), pdf(59, wide, "- 58 -")), new String[] {"가", "가"},
                new int[] {3, 3}))).containsExactly(9, 9);
    }

    @Test
    void 이어받기는_같은_과목_같은_머리_인접_쪽_다른_월_없음일_때만() {
        String[] same = {"가", "가"};
        int[] set = {1, 1};
        // 과목이 바뀜
        assertThat(months(PlanExtractor.contextMonths(List.of(pdf(1, AUG, "■ 8월"), pdf(2, AUG, "")), new String[] {"가", "나"}, new int[] {1, 2})))
                .containsExactly(8, null);
        // 같은 이름이라도 새 과목 머리 표(setAt)가 사이에 있음
        assertThat(months(PlanExtractor.contextMonths(List.of(pdf(1, AUG, "■ 8월"), pdf(2, AUG, "")), same, new int[] {1, 2})))
                .containsExactly(8, null);
        // 쪽을 건너뜀
        assertThat(months(PlanExtractor.contextMonths(List.of(pdf(1, AUG, "■ 8월"), pdf(3, AUG, "")), same, set))).containsExactly(8, null);
        // 머리 줄이 다른 표
        List<List<String>> other = List.of(List.of("주", "단원", "성취기준", "평가방법"), List.of("1", "가", "[가-01] 가", "관찰"));
        assertThat(months(PlanExtractor.contextMonths(List.of(pdf(1, AUG, "■ 8월"), pdf(2, other, "")), same, set))).containsExactly(8, null);
        // 인정하지 못한 다른 월 제목처럼 보이는 줄이 사이에 있음 → 빠뜨리는 쪽을 택한다
        assertThat(months(PlanExtractor.contextMonths(List.of(pdf(1, AUG, "■ 8월"), pdf(2, AUG, "■ 8월\n본문\n9월 (계속)\n과제 안내 문장입니다.")), same, set)))
                .containsExactly(8, null);
        // 사이에 다른 표가 있음(바로 앞 표가 진도표가 아님)
        List<List<String>> score = List.of(List.of("평가 요소", "채점 기준", "배점"), List.of("내용", "매우 우수", "10"));
        assertThat(months(PlanExtractor.contextMonths(List.of(pdf(1, AUG, "■ 8월"), pdf(1, score, ""), pdf(2, AUG, "")), new String[] {"가", "가", "가"},
                new int[] {1, 1, 1}))).containsExactly(8, null, null);
        // 앞 표에 월이 없으면 이어받을 것도 없다
        assertThat(months(PlanExtractor.contextMonths(List.of(pdf(1, AUG, "본문"), pdf(2, AUG, "")), same, set))).containsExactly(null, null);
    }

    @Test
    void HWP_HWPX_는_사이_본문이_없을_때만_이어받는다() {
        String[] same = {"가", "가"};
        int[] set = {1, 1};
        assertThat(months(PlanExtractor.contextMonths(List.of(hwp(AUG, "■ 8월"), hwp(AUG, "")), same, set))).containsExactly(8, 8);
        assertThat(months(PlanExtractor.contextMonths(List.of(hwp(AUG, "■ 8월"), hwp(AUG, "※ 다음 표는 참고 자료")), same, set))).containsExactly(8, null);
        assertThat(months(PlanExtractor.contextMonths(List.of(hwp(AUG, "■ 8월"), hwp(AUG, "■ 9월")), same, set))).containsExactly(8, 9);
    }
}
