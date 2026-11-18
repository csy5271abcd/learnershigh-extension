package com.learnershigh.extension.assessment.service.plan.extract;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/** 칸 안 줄바꿈이 줄·칸으로 잘린 채점기준표 (서연고 3학년 언어와 매체 12쪽 모양). */
class RubricSplitLinesTest {

    static List<String> row(String e, String sub, String d1, String d2, String score) {
        return List.of(e, sub, d1, d2, score);
    }

    @Test
    void 같은_점수로_나뉜_줄과_칸_조각을_한_수준으로_잇는다() {
        List<List<String>> g = List.of(
                row("평가 요소", "평가 요소", "수행 수준(채점 기준)", "수행 수준(채점 기준)", "배점"),
                row("매체 비평하기(20점)", "핵심 내용 정리하기", ".", ".", "4점"),
                row("매체 비평하기(20점)", "핵심 내용 정리하기", "사회적 쟁점을 담은 상반된 입장의 기사의 핵심 내용을 구체적으로 제시하고 명료", ".", "4점"),
                row("매체 비평하기(20점)", "핵심 내용 정리하기", "하게 요약함", ".", "4점"),
                row("매체 비평하기(20점)", "핵심 내용 정리하기", "", "", "3점"),
                row("매체 비평하기(20점)", "핵심 내용 정리하기", "사회적 쟁점을 담은 상반된 입장의 기사를 제시했으나 기사의 내용을 요약하지 못", "", "3점"),
                row("매체 비평하기(20점)", "핵심 내용 정리하기", "함.", "", "3점"),
                row("매체 비평하기(20점)", "핵심 내용 정리하기", "사회적 쟁점을 담은 기사를 제시하지 못함.", "사회적 쟁점을 담은 기사를 제시하지 못함.", "2점"),
                row("매체 비평하기(20점)", "입장 차이 비교 분석하기", "사회적 쟁점을 담은 상반된 입장의 기사를 정확하고 분명하게 비교·분석함.", "사회적 쟁점을 담은 상반된 입장의 기사를 정확하고 분명하게 비교·분석함.", "5점"),
                row("매체 비평하기(20점)", "입장 차이 비교 분석하기", "사회적 쟁점을 담은 상반된 입장의 기사를 비교·", "분석하지 못함.", "3점"));
        List<RubricRules.Element> rb = RubricRules.rubric(g);
        RubricRules.Element first = rb.stream().filter(e -> e.element().contains("핵심")).findFirst().orElseThrow();
        assertThat(first.levels()).extracting(RubricRules.Level::score).containsExactly(4.0, 3.0, 2.0);
        assertThat(first.levels().get(0).description()).isEqualTo("사회적 쟁점을 담은 상반된 입장의 기사의 핵심 내용을 구체적으로 제시하고 명료 하게 요약함");
        assertThat(first.levels().get(1).description()).isEqualTo("사회적 쟁점을 담은 상반된 입장의 기사를 제시했으나 기사의 내용을 요약하지 못 함.");
        RubricRules.Element second = rb.stream().filter(e -> e.element().contains("입장")).findFirst().orElseThrow();
        assertThat(second.levels().get(1).description()).isEqualTo("사회적 쟁점을 담은 상반된 입장의 기사를 비교·분석하지 못함.");
    }
}
