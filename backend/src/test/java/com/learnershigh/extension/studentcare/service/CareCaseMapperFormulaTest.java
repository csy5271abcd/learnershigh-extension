package com.learnershigh.extension.studentcare.service;

import static org.assertj.core.api.Assertions.assertThat;
import com.learnershigh.extension.studentcare.entity.*;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class CareCaseMapperFormulaTest {
    @Test void newSnapshotsUseDeviationMinutesWhileStoredClockSnapshotsRemainUnchanged() {
        var today = StudyDays.AS_OF;
        var item = CareCase.open("branch", "student", CareReason.ADJUSTMENT_NEEDED,
                List.of(new CareBaselineSignal(CareSignalType.START_TIME_SHIFT, "평소보다90분", 90, 0, null)),
                NoteChannel.CALL, "원문 유지", today.plusDays(7), today, Instant.parse("2026-09-30T01:00:00Z"));
        assertThat(item.metricFormulaVersion()).isEqualTo(3);
        var comparison = CareComparator.compare(item.baseline(), StudyDays.usual(), today, 3);
        var response = CareCaseMapper.toResponse(item, today.plusDays(7), ZoneId.of("Asia/Seoul"), comparison);
        assertThat(response.baseline().getFirst().unit()).isEqualTo(MetricUnit.MINUTES);
        assertThat(response.comparison().rows().getFirst().unit()).isEqualTo(MetricUnit.MINUTES);
        assertThat(response.comparison().rows().getFirst().now()).isZero();
        ReflectionTestUtils.setField(item, "metricFormulaVersion", 2);
        var legacy = CareComparator.compare(item.baseline(), StudyDays.usual(), today, 2);
        var stored = CareCaseMapper.toResponse(item, today.plusDays(7), ZoneId.of("Asia/Seoul"), legacy);
        assertThat(stored.baseline().getFirst().unit()).isEqualTo(MetricUnit.CLOCK_MINUTES);
        assertThat(stored.baseline().getFirst().value()).isEqualTo(90);
        assertThat(stored.comparison().rows().getFirst().now()).isNull();
        assertThat(stored.comparison().resultLabel()).isEqualTo("비교 기록 없음");
        assertThat(stored.events().getFirst().content()).contains("원문 유지");
    }
}
