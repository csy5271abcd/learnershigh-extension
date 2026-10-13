package com.learnershigh.extension.common.time;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * 기준일을 바꿀 수 있는 Clock. E2E Profile에서만 Bean으로 등록한다 (ADR-0007).
 * 하루 안의 시각은 정오로 고정해 날짜 경계 문제를 피한다.
 */
public final class AdjustableClock extends Clock {

    private final ZoneId zone;
    private volatile Instant instant;

    public AdjustableClock(LocalDate date, ZoneId zone) {
        this.zone = zone;
        setDate(date);
    }

    public void setDate(LocalDate date) {
        this.instant = date.atTime(LocalTime.NOON).atZone(zone).toInstant();
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return Clock.fixed(instant, zone);
    }

    @Override
    public Instant instant() {
        return instant;
    }
}
