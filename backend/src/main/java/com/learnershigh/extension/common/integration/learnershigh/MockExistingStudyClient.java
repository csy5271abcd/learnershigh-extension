package com.learnershigh.extension.common.integration.learnershigh;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Existing 출결 / 순공 / 학습계획 Mock (ADR-0002, ADR-0007).
 * {@code learnershigh.mock.anchor-date}가 없으면 시작 시점의 오늘을 시연 기준일로 쓴다.
 */
@Component
@ConditionalOnProperty(name = "learnershigh.integration.mode", havingValue = "mock", matchIfMissing = true)
public class MockExistingStudyClient implements ExistingStudyClient, MockIntegrationSwitch {

    private final LocalDate anchor;
    private volatile boolean available = true;

    public MockExistingStudyClient(Clock clock, @Value("${learnershigh.mock.anchor-date:}") String anchorDate) {
        this.anchor = anchorDate == null || anchorDate.isBlank() ? LocalDate.now(clock) : LocalDate.parse(anchorDate);
    }

    @Override
    public List<ExistingDailyStudy> findDailyStudy(String studentId, LocalDate from, LocalDate to) {
        if (!available) {
            throw new ExistingIntegrationException("mock study data disabled");
        }
        List<ExistingDailyStudy> days = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            days.add(MockStudyScenarios.dayOf(studentId, date, anchor));
        }
        return days;
    }

    @Override
    public void setStudyDataAvailable(boolean available) {
        this.available = available;
    }
}
