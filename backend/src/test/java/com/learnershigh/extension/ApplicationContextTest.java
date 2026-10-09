package com.learnershigh.extension;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.support.MySqlContainerConfig;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/** 실제 MySQL(Testcontainers)에서 Application Context와 Flyway Migration이 올라오는지 검증한다. */
@Tag("integration")
@SpringBootTest
@Import(MySqlContainerConfig.class)
class ApplicationContextTest {

    @Autowired
    Flyway flyway;

    @Test
    void contextLoadsAndMigrationsApply() {
        assertThat(flyway.info().pending()).isEmpty();
    }
}
