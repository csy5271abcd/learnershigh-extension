package com.learnershigh.extension.assessment.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.common.error.BusinessException;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** SchoolAssessment 상태 전이·개인 정보 불변식 (domain.md §10, api-contract.md §13). DB 없이 실행. */
class SchoolAssessmentTest {

    static final Instant T0 = Instant.parse("2026-11-09T01:00:00Z");
    static final Instant T1 = Instant.parse("2026-11-09T02:00:00Z");

    static SchoolAssessment sample() {
        return SchoolAssessment.register("stu_001", 2026, 2, "subj_01", "  보고서  ", " ", null,
                SchoolAssessmentStatus.BEFORE_START, null, T0);
    }

    @Test
    void 등록시_모르는_값은_비워둔다() {
        SchoolAssessment assessment = sample();
        assertThat(assessment.title()).isEqualTo("보고서");
        assertThat(assessment.description()).isNull();
        assertThat(assessment.deadlineDate()).isNull();
        assertThat(assessment.evaluationItemRef()).isNull();
        assertThat(assessment.id()).startsWith("assessment_");
    }

    @Test
    void 앞으로_건너뛰기와_같은_상태_재요청은_허용한다() {
        SchoolAssessment assessment = sample();
        assessment.changeStatus(SchoolAssessmentStatus.COMPLETED, T1);
        assertThat(assessment.status()).isEqualTo(SchoolAssessmentStatus.COMPLETED);
        assertThat(assessment.updatedAt()).isEqualTo(T1);

        assessment.changeStatus(SchoolAssessmentStatus.COMPLETED, Instant.parse("2026-11-10T00:00:00Z"));
        assertThat(assessment.updatedAt()).isEqualTo(T1);
    }

    @Test
    void 역전이는_INVALID_STATE_TRANSITION() {
        SchoolAssessment assessment = sample();
        assessment.changeStatus(SchoolAssessmentStatus.IN_PROGRESS, T1);
        assertThatThrownBy(() -> assessment.changeStatus(SchoolAssessmentStatus.BEFORE_START, T1))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).errorCode().code())
                        .isEqualTo("INVALID_STATE_TRANSITION"));
        assertThat(assessment.status()).isEqualTo(SchoolAssessmentStatus.IN_PROGRESS);
    }

    @Test
    void 개인정보_수정은_상태와_평가계획서_참조를_바꾸지_않는다() {
        SchoolAssessment assessment = SchoolAssessment.register("stu_001", 2026, 2, "subj_02", "탐구", null, null,
                SchoolAssessmentStatus.IN_PROGRESS, new EvaluationItemRef("plan_rev_1", "subj_02", "performance_01"), T0);
        assessment.editPersonalInfo("탐구 (수정)", "메모", LocalDate.of(2026, 11, 20), T1);
        assertThat(assessment.title()).isEqualTo("탐구 (수정)");
        assertThat(assessment.status()).isEqualTo(SchoolAssessmentStatus.IN_PROGRESS);
        assertThat(assessment.evaluationItemRef())
                .isEqualTo(new EvaluationItemRef("plan_rev_1", "subj_02", "performance_01"));
        assertThat(assessment.subjectId()).isEqualTo("subj_02");
    }

    @Test
    void 소유자_확인() {
        assertThat(sample().isOwnedBy("stu_001")).isTrue();
        assertThat(sample().isOwnedBy("stu_002")).isFalse();
    }
}
