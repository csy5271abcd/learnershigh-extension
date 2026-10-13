package com.learnershigh.extension.studentcare.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** 판단 보류는 cooldown으로 신호를 뺀 뒤 정한다 (domain.md §3). */
class SignalEvaluationTest {

    private static final DetectedSignal PLAN_MISSING =
            new DetectedSignal(CareSignalType.PLAN_MISSING, "s", List.of("s"), 4, null, null);

    @Test
    void thinDataWithRemainingSignalIsNotDeferred() {
        assertThat(new SignalEvaluation(List.of(PLAN_MISSING), true, 2).deferred()).isFalse();
    }

    @Test
    void thinDataBecomesDeferredWhenCooldownRemovesEverySignal() {
        SignalEvaluation evaluation = new SignalEvaluation(List.of(PLAN_MISSING), true, 2)
                .without(Set.of(CareSignalType.PLAN_MISSING));

        assertThat(evaluation.signals()).isEmpty();
        assertThat(evaluation.deferred()).isTrue();
        assertThat(evaluation.validDays()).isEqualTo(2);
    }

    @Test
    void enoughDataIsNeverDeferred() {
        assertThat(new SignalEvaluation(List.of(PLAN_MISSING), false, 7)
                .without(Set.of(CareSignalType.PLAN_MISSING)).deferred()).isFalse();
    }

    @Test
    void otherTypesStay() {
        assertThat(new SignalEvaluation(List.of(PLAN_MISSING), false, 7)
                .without(Set.of(CareSignalType.STUDY_DROP)).signals()).containsExactly(PLAN_MISSING);
    }
}
