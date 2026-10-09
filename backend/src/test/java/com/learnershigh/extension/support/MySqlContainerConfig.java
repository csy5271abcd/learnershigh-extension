package com.learnershigh.extension.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.mysql.MySQLContainer;

/**
 * Integration Test용 MySQL (ADR-0006). docker-compose.yml과 같은 Image Version을 사용한다.
 * {@code @Import(MySqlContainerConfig.class)}로 붙이면 DataSource가 이 Container로 연결된다.
 */
@TestConfiguration(proxyBeanMethods = false)
public class MySqlContainerConfig {

    public static final String MYSQL_IMAGE = "mysql:8.4";

    @Bean
    @ServiceConnection
    MySQLContainer mysqlContainer() {
        return new MySQLContainer(MYSQL_IMAGE);
    }
}
