package com.learnershigh.extension.assessment.service.plan.extract;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/** 과목명 정리·거르기 — 원문 대조에서 나온 오류 유형. */
class SubjectRulesTest {

    @Test
    void tidyStripsFileNameSeparatorsBracketsAndFullWidthDigits() {
        assertThat(SubjectRules.tidy("_통합사회2")).isEqualTo("통합사회2");
        assertThat(SubjectRules.tidy("< 과학탐구실험2 >")).isEqualTo("과학탐구실험2");
        assertThat(SubjectRules.tidy("공통국어２")).isEqualTo("공통국어2");
        assertThat(SubjectRules.tidy("공통수학 2")).isEqualTo("공통수학2");
        assertThat(SubjectRules.tidy("국어과_공통국어2")).isEqualTo("공통국어2");
        assertThat(SubjectRules.tidy("일본어과(일본어 회화)")).isEqualTo("일본어 회화");
        assertThat(SubjectRules.tidy("1 도시의 미래 탐구")).isEqualTo("도시의 미래 탐구");
        assertThat(SubjectRules.tidy("기하3")).isEqualTo("기하");
        assertThat(SubjectRules.tidy("공통국어2")).isEqualTo("공통국어2");
    }

    @Test
    void badRejectsHeaderWordsTimesScoresAndCodes() {
        for (String s : List.of("2시간", "1h", "5점", "1순위", "12지시03-06", "이수 단위", "연번", "수정", "월/주", "관찰", "대상",
                "1,7~9반문◯◯,최◯◯(인)", "골밑 슛 & 레이업 슛", "수업의 방향과", "말하기, 쓰기", "P/F", "수강반", "초에", "패들렛 활용",
                "지문분석 및 요약하기")) {
            assertThat(SubjectRules.bad(s, "")).as(s).isTrue();
        }
    }

    @Test
    void badKeepsRealSubjects() {
        for (String s : List.of("논술", "공통국어2", "기술·가정", "생명과학 실험", "독서 토론과 글쓰기", "도시의 미래 탐구", "일본어 회화")) {
            assertThat(SubjectRules.bad(s, "")).as(s).isFalse();
        }
    }

    @Test
    void fileNameItselfCanBeTheSubject() {
        assertThat(SubjectRules.fromFileName("1 공통국어2.hwp")).isEqualTo("공통국어2");
        assertThat(SubjectRules.fromFileName("5 통합사회 2.hwp")).isEqualTo("통합사회 2");
        assertThat(SubjectRules.fromFileName("2026학년도 2학기 교수학습 및 평가 계획(1학년_통합사회2).hwpx")).isEqualTo("통합사회2");
    }

    @Test
    void groupPrefixBeforeUnderscoreIsDropped() {
        assertThat(SubjectRules.tidy("제2외국어과_일본문화")).isEqualTo("일본문화");
    }
}
