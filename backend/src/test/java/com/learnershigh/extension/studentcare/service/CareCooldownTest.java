package com.learnershigh.extension.studentcare.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
import com.learnershigh.extension.studentcare.entity.CareCase;
import com.learnershigh.extension.studentcare.entity.CareReason;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** cooldownDays (domain.md §3): 가장 최근 종결 건 하나, 종결일 포함 cooldownDays일 동안 같은 Type만 숨긴다. */
class CareCooldownTest {

    private static final LocalDate CLOSED_ON = LocalDate.of(2026, 9, 23);
    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private static CareCase closed(String studentId, LocalDate closedOn, int hour, CareSignalType... types) {
        List<CareBaselineSignal> baseline = java.util.Arrays.stream(types)
                .map(type -> new CareBaselineSignal(type, "s", 1, null, null)).toList();
        Instant at = closedOn.atTime(hour, 0).atZone(ZONE).toInstant();
        return CareCase.open("br", studentId, CareReason.EXPECTED_CHANGE, baseline, null, null, null, closedOn, at);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 6})
    void hiddenFromClosedDayUntilCooldownMinusOne(int daysAfterClose) {
        Map<String, Set<CareSignalType>> suppressed = CareCooldown.suppressedTypes(
                List.of(closed("stu", CLOSED_ON, 10, CareSignalType.STUDY_DROP)), CLOSED_ON.plusDays(daysAfterClose), 7);

        assertThat(suppressed).containsExactly(Map.entry("stu", Set.of(CareSignalType.STUDY_DROP)));
    }

    @Test
    void visibleAgainOnCooldownDay() {
        // 9/23 종결, cooldown 7 → 9/23~9/29 숨김, 9/30부터 다시 올림 (domain.md §3 예)
        assertThat(CareCooldown.suppressedTypes(
                List.of(closed("stu", CLOSED_ON, 10, CareSignalType.STUDY_DROP)), CLOSED_ON.plusDays(7), 7)).isEmpty();
    }

    @Test
    void zeroCooldownHidesNothing() {
        assertThat(CareCooldown.suppressedTypes(
                List.of(closed("stu", CLOSED_ON, 10, CareSignalType.STUDY_DROP)), CLOSED_ON, 0)).isEmpty();
    }

    @Test
    void onlyTheMostRecentlyClosedCaseCounts() {
        CareCase older = closed("stu", CLOSED_ON.minusDays(1), 10, CareSignalType.CONSECUTIVE_ABSENCE);
        CareCase newer = closed("stu", CLOSED_ON, 9, CareSignalType.PLAN_MISSING);

        assertThat(CareCooldown.suppressedTypes(List.of(older, newer), CLOSED_ON, 7).get("stu"))
                .containsExactly(CareSignalType.PLAN_MISSING);
        assertThat(CareCooldown.suppressedTypes(List.of(newer, older), CLOSED_ON, 7).get("stu"))
                .containsExactly(CareSignalType.PLAN_MISSING);
    }

    @Test
    void sameClosedDayUsesTheLaterClosingTime() {
        CareCase morning = closed("stu", CLOSED_ON, 9, CareSignalType.STUDY_DROP);
        CareCase evening = closed("stu", CLOSED_ON, 18, CareSignalType.START_TIME_SHIFT);

        assertThat(CareCooldown.suppressedTypes(List.of(evening, morning), CLOSED_ON, 7).get("stu"))
                .containsExactly(CareSignalType.START_TIME_SHIFT);
        assertThat(CareCooldown.suppressedTypes(List.of(morning, evening), CLOSED_ON, 7).get("stu"))
                .containsExactly(CareSignalType.START_TIME_SHIFT);
    }

    @Test
    void studentsAreIndependentAndOpenCasesIgnored() {
        CareCase other = closed("other", CLOSED_ON, 10, CareSignalType.EXECUTION_GAP);
        CareCase open = CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED,
                List.of(new CareBaselineSignal(CareSignalType.STUDY_DROP, "s", 1, 2, null)), null,
                com.learnershigh.extension.studentcare.entity.CarePlan.of("목표", "행동", null, true),
                CLOSED_ON.plusDays(7), CLOSED_ON, Instant.EPOCH);

        assertThat(CareCooldown.suppressedTypes(List.of(other, open), CLOSED_ON, 7))
                .containsExactly(Map.entry("other", Set.of(CareSignalType.EXECUTION_GAP)));
    }
}
