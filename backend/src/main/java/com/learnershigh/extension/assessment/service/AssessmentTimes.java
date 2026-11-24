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

    /** 부록 O §9-2: 현재 학년도·학기(KST 달력). 3~8월 = 1학기, 9~12월 = 2학기, 1~2월 = 전년도 학년도 2학기. */
    public record Term(int academicYear, int semester) {
    }

    public Term currentTerm() {
        java.time.LocalDate today = java.time.LocalDate.now(clock.withZone(java.time.ZoneId.of("Asia/Seoul")));
        int month = today.getMonthValue();
        if (month <= 2) {
            return new Term(today.getYear() - 1, 2);
        }
        return new Term(today.getYear(), month <= 8 ? 1 : 2);
    }
}
