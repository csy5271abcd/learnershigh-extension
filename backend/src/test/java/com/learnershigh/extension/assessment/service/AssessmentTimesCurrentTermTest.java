package com.learnershigh.extension.assessment.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

/** 부록 O §9-2 현재 학년도·학기(KST 달력) 경계. */
class AssessmentTimesCurrentTermTest {

    static AssessmentTimes at(String instant) {
        return new AssessmentTimes(Clock.fixed(Instant.parse(instant), ZoneId.of("Asia/Seoul")));
    }

    @Test
    void 삼월부터_팔월은_1학기_구월부터_십이월은_2학기_일월과_이월은_전년도_2학기() {
        assertThat(at("2026-03-01T00:00:00+09:00").currentTerm()).isEqualTo(new AssessmentTimes.Term(2026, 1));
        assertThat(at("2026-08-31T23:59:00+09:00").currentTerm()).isEqualTo(new AssessmentTimes.Term(2026, 1));
        assertThat(at("2026-09-01T00:00:00+09:00").currentTerm()).isEqualTo(new AssessmentTimes.Term(2026, 2));
        assertThat(at("2026-11-21T10:00:00+09:00").currentTerm()).isEqualTo(new AssessmentTimes.Term(2026, 2));
        assertThat(at("2027-01-15T10:00:00+09:00").currentTerm()).isEqualTo(new AssessmentTimes.Term(2026, 2));
        assertThat(at("2027-02-28T23:59:00+09:00").currentTerm()).isEqualTo(new AssessmentTimes.Term(2026, 2));
        // UTC 로는 2월 28일이지만 KST 로는 3월 1일
        assertThat(at("2027-02-28T15:30:00Z").currentTerm()).isEqualTo(new AssessmentTimes.Term(2027, 1));
    }
}
