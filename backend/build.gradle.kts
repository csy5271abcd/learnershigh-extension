plugins {
    java
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.learnershigh"
version = "0.0.1"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("com.mysql:mysql-connector-j")

    // Schema Migration (ADR-0006). Migration 파일은 /database/migrations 에 둔다.
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-mysql")

    // Test Stack: Spring Boot BOM이 관리하는 JUnit Jupiter / AssertJ / Mockito / MockMvc
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
    // ADR-0005 의존 규칙 자동 검증. Spring Boot BOM 관리 대상이 아니므로 Version을 명시한다.
    testImplementation("com.tngtech.archunit:archunit:1.5.1")
    // Integration Test DB: Testcontainers MySQL (ADR-0006). Docker가 필요하다.
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-mysql")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

// /database/migrations/*.sql 을 classpath:db/migration (Flyway 기본 위치)으로 포함한다.
tasks.processResources {
    from("../database/migrations") {
        into("db/migration")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// 일반 Test(build에 포함)는 DB / Docker 없이 실행된다.
// @Tag("integration") Test는 Docker(Testcontainers)가 필요하므로 integrationTest Task로 분리한다.
tasks.test {
    useJUnitPlatform {
        excludeTags("integration")
    }
}

val integrationTest by tasks.registering(Test::class) {
    description = "Runs @Tag(\"integration\") tests against MySQL via Testcontainers (Docker required)."
    group = "verification"
    testClassesDirs = sourceSets.test.get().output.classesDirs
    classpath = sourceSets.test.get().runtimeClasspath
    useJUnitPlatform {
        includeTags("integration")
    }
    shouldRunAfter(tasks.test)
}
