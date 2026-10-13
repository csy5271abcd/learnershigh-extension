package com.learnershigh.extension.studentcare.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.common.integration.learnershigh.ExistingStudyClient;
import com.learnershigh.extension.common.integration.learnershigh.MockExistingStudyClient;
import com.learnershigh.extension.studentcare.entity.CareSettings;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** 시연 / E2E 시나리오(MockStudyScenarios)가 기준일에 의도한 신호만 내는지 고정한다. */
class MockScenarioSignalTest {

    private static final LocalDate ANCHOR = LocalDate.of(2026, 9, 30);
    private final ExistingStudyClient client = new MockExistingStudyClient(Clock.systemUTC(), ANCHOR.toString());

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            stu_001 | CONSECUTIVE_ABSENCE,PLAN_MISSING | false
            stu_002 | PLAN_MISSING                     | false
            stu_003 | STUDY_DROP                       | false
            stu_004 | EXECUTION_GAP                    | false
            stu_005 | SUBJECT_SHARE                    | false
            stu_006 | START_TIME_SHIFT                 | false
            stu_007 | STUDY_DROP                       | false
            stu_008 |                                  | true
            stu_009 |                                  | false
            stu_010 |                                  | false
            stu_101 |                                  | false
            stu_102 | STUDY_DROP                       | false
            stu_103 |                                  | false
            """)
    void scenarioSignalsAtAnchor(String studentId, String expected, boolean deferred) {
        SignalEvaluation evaluation = CareSignalCalculator.evaluate(
                client.findDailyStudy(studentId, CareSignalCalculator.historyFrom(ANCHOR), ANCHOR),
                ANCHOR, CareSettings.Values.DEFAULTS);

        List<CareSignalType> expectedTypes = expected == null ? List.of()
                : java.util.Arrays.stream(expected.split(",")).map(String::strip).map(CareSignalType::valueOf).toList();
        assertThat(evaluation.signals()).extracting(DetectedSignal::type).containsExactlyElementsOf(expectedTypes);
        assertThat(evaluation.deferred()).isEqualTo(deferred);
    }
}
