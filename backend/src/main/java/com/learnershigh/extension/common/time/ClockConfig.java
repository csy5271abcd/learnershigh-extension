package com.learnershigh.extension.common.time;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/** 기준일은 항상 이 Clock으로 계산한다. 운영 Context는 Asia/Seoul (shared-conventions.md §13). */
@Configuration(proxyBeanMethods = false)
public class ClockConfig {

    @Bean
    @Profile("!e2e")
    Clock systemClock(@Value("${app.zone:Asia/Seoul}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }

    @Bean
    @Profile("e2e")
    AdjustableClock adjustableClock(
            @Value("${app.zone:Asia/Seoul}") String zone,
            @Value("${app.fixed-date}") LocalDate fixedDate) {
        return new AdjustableClock(fixedDate, ZoneId.of(zone));
    }
}
