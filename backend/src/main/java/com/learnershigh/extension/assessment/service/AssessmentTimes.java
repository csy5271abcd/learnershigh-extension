package com.learnershigh.extension.assessment.service;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;

/** Assessment 시각 기준. 저장은 Instant, 응답은 Clock Zone(Asia/Seoul) ISO 8601 (api-contract.md §3-5). */
@Component
public class AssessmentTimes {

    private final Clock clock;

    public AssessmentTimes(Clock clock) {
        this.clock = clock;
    }

    /** DB DATETIME(6) 정밀도(마이크로초)로 자른다: 저장 직후 응답과 재조회 값이 같아야 한다. */
    public Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }

    public OffsetDateTime toOffset(Instant instant) {
        return instant == null ? null : OffsetDateTime.ofInstant(instant, clock.getZone());
    }
}
