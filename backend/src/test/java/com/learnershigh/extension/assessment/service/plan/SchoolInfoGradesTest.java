package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** 학교알리미 파일 이름 → 등록할 학년들. 여러 학년 공통 문서는 학년마다 등록한다. */
class SchoolInfoGradesTest {

    static java.util.List<Integer> g(String name) {
        return SchoolInfoImportService.gradesOf(name.replace(" ", ""));
    }

    @Test
    void 학년_표기를_펼친다() {
        assertThat(g("2026학년도 2학기 교수학습 및 평가 운영 계획(사회과_1,2,3학년)_수정.pdf")).containsExactly(1, 2, 3);
        assertThat(g("2026학년도 1~3학년 평가계획.pdf")).containsExactly(1, 2, 3);
        assertThat(g("2026학년도 1·2학년 평가계획.hwp")).containsExactly(1, 2);
        assertThat(g("2026학년도 전학년 평가계획.pdf")).containsExactly(1, 2, 3);
        assertThat(g("2026학년도 2학기 3학년 평가계획.pdf")).containsExactly(3);
        assertThat(g("1학년 및 3학년 평가계획.pdf")).containsExactly(1, 3);
    }

    @Test
    void 학년도_숫자는_학년이_아니다() {
        assertThat(g("2023학년도 2학기 평가계획.pdf")).isEmpty();
        assertThat(g("2031학년도 2학년 평가계획.pdf")).containsExactly(2);
    }
}
