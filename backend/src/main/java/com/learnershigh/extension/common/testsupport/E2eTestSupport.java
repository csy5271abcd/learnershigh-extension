package com.learnershigh.extension.common.testsupport;

import com.learnershigh.extension.common.integration.learnershigh.MockIntegrationSwitch;
import com.learnershigh.extension.common.time.AdjustableClock;
import java.time.LocalDate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** E2E 전용 기준일 / 데이터 초기화 (ADR-0007). e2e Profile에서만 Bean이 생긴다. */
@Component
@Profile("e2e")
public class E2eTestSupport {

    private final AdjustableClock clock;
    private final JdbcTemplate jdbc;
    private final MockIntegrationSwitch integration;
    private final LocalDate initialDate;

    public E2eTestSupport(AdjustableClock clock, JdbcTemplate jdbc, MockIntegrationSwitch integration,
            @Value("${app.fixed-date}") LocalDate initialDate) {
        this.clock = clock;
        this.jdbc = jdbc;
        this.integration = integration;
        this.initialDate = initialDate;
    }

    public void setDate(LocalDate date) {
        clock.setDate(date);
    }

    /** 학생 케어 데이터를 지우고 기준일 / Mock 연동을 처음 상태로 되돌린다. */
    @Transactional
    public void reset() {
        jdbc.update("delete from care_event");
        jdbc.update("delete from care_case_baseline");
        jdbc.update("delete from care_case");
        jdbc.update("delete from care_settings");
        clock.setDate(initialDate);
        integration.setStudyDataAvailable(true);
    }

    public void setStudyDataAvailable(boolean available) {
        integration.setStudyDataAvailable(available);
    }
}
