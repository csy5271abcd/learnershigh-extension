package com.learnershigh.extension.studentcare.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.common.integration.learnershigh.ExistingIntegrationException;
import com.learnershigh.extension.common.integration.learnershigh.MockIntegrationSwitch;
import com.learnershigh.extension.common.time.AdjustableClock;
import com.learnershigh.extension.studentcare.entity.CareSettings;
import com.learnershigh.extension.studentcare.repository.CareSettingsRepository;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 학생 단위 잠금 (domain.md §5-1): 잠금을 먼저 잡은 요청이 실패해 되돌려지는 동안 다른 요청들이 기다리고 있어도,
 * 기다린 요청은 모두 Contract 코드(201 / 409 ACTIVE_CARE_CASE_EXISTS / 409 STUDENT_NOT_FLAGGED / 503)로 끝난다.
 * 잠금 행을 같은 Transaction에서 처음 만들면, 첫 요청이 되돌려질 때 기다리던 요청끼리 Deadlock(1213)이 나
 * 409 CONCURRENT_MODIFICATION이 섞인다.
 */
@Tag("integration")
@SpringBootTest(properties = "learnershigh.mock.anchor-date=2026-09-29")
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import({MySqlContainerConfig.class, StudentCareLockFailureApiTest.GateConfig.class})
class StudentCareLockFailureApiTest {

    private static final int WAITERS = 3;
    private static final String BODY = """
            {"branchId":"br_gangnam","studentId":"stu_005","channel":"CALL","reason":"ADJUSTMENT_NEEDED",
             "recheckDate":"2026-10-07"}""";

    /** 첫 요청이 학생 잠금을 잡은 뒤 어떻게 끝나는지. */
    enum FirstRequestFailure {
        /** 잠금 뒤 연동 실패 → 503 */
        INTEGRATION_UNAVAILABLE,
        /** 잠금 뒤 신호 평가에서 신호 없음 → 409 STUDENT_NOT_FLAGGED */
        NOT_FLAGGED
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    AdjustableClock clock;

    @Autowired
    MockIntegrationSwitch integration;

    @Autowired
    Gate gate;

    @BeforeEach
    void setUp() {
        StudentCareApiTestSupport.reset(jdbc, clock, integration);
    }

    @AfterEach
    void tearDown() {
        gate.disarm();
    }

    private record Reply(int status, String body) {

        String code() {
            return status >= 400 ? JsonPath.read(body, "$.code") : null;
        }
    }

    @ParameterizedTest
    @EnumSource(FirstRequestFailure.class)
    void waitersGetContractCodesWhenTheLockHolderRollsBack(FirstRequestFailure failure) throws Exception {
        gate.arm(failure);
        ExecutorService executor = Executors.newFixedThreadPool(WAITERS + 1);
        try {
            Future<Reply> first = executor.submit(this::open);
            assertThat(gate.entered.await(30, TimeUnit.SECONDS)).as("first request holds the student lock").isTrue();

            List<Future<Reply>> waiters = new ArrayList<>();
            List<Thread> waiterThreads = new CopyOnWriteArrayList<>();
            for (int i = 0; i < WAITERS; i++) {
                waiters.add(executor.submit(() -> {
                    waiterThreads.add(Thread.currentThread());
                    return open();
                }));
            }
            awaitBlockedInDatabase(waiterThreads);
            gate.release.countDown();

            Reply firstReply = first.get(60, TimeUnit.SECONDS);
            if (failure == FirstRequestFailure.INTEGRATION_UNAVAILABLE) {
                assertThat(firstReply.status()).isEqualTo(503);
                assertThat(firstReply.code()).isEqualTo("EXISTING_STUDY_DATA_UNAVAILABLE");
            } else {
                assertThat(firstReply.status()).isEqualTo(409);
                assertThat(firstReply.code()).isEqualTo("STUDENT_NOT_FLAGGED");
            }

            List<Reply> replies = new ArrayList<>();
            for (Future<Reply> waiter : waiters) {
                replies.add(waiter.get(60, TimeUnit.SECONDS));
            }
            assertThat(replies).filteredOn(reply -> reply.status() == 201).hasSize(1);
            assertThat(replies).filteredOn(reply -> reply.status() != 201).allSatisfy(reply -> {
                assertThat(reply.status()).isEqualTo(409);
                assertThat(reply.code()).isEqualTo("ACTIVE_CARE_CASE_EXISTS");
            });
            assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isEqualTo(1);
            assertThat(StudentCareApiTestSupport.count(jdbc, "care_student_lock")).isEqualTo(1);
        } finally {
            gate.release.countDown();
            executor.shutdownNow();
        }
    }

    private Reply open() throws Exception {
        MockHttpServletResponse response = mvc.perform(post("/api/admin/student-care/cases")
                .contentType(MediaType.APPLICATION_JSON).content(BODY)).andReturn().getResponse();
        return new Reply(response.getStatus(), response.getContentAsString());
    }

    /**
     * 기다리는 요청들이 모두 DB 문장 실행(잠금 대기) 안에 들어갈 때까지 기다린다.
     * 학생 잠금은 첫 요청이 쥐고 있으므로, 그 뒤의 요청은 잠금 문장에서 멈춰 있어야 한다.
     */
    private static void awaitBlockedInDatabase(List<Thread> threads) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(30);
        while (System.nanoTime() < deadline) {
            if (threads.size() == WAITERS && threads.stream().allMatch(StudentCareLockFailureApiTest::inStatement)) {
                Thread.sleep(500); // 문장이 서버에 도착해 잠금을 기다리기 시작할 시간
                return;
            }
            Thread.sleep(20);
        }
        throw new AssertionError("requests did not block on the student lock");
    }

    private static boolean inStatement(Thread thread) {
        for (StackTraceElement frame : thread.getStackTrace()) {
            if (frame.getClassName().startsWith("com.zaxxer.hikari.pool.") && frame.getMethodName().startsWith("execute")) {
                return true;
            }
        }
        return false;
    }

    /**
     * 무장하면 잠금을 잡은 뒤의 첫 기준값 조회(CareSettingsRepository.findById)를 멈춰 두었다가, 풀리면 정해진 방식으로 끝낸다.
     * 이후 호출은 실제 Repository 그대로다.
     */
    static final class Gate {

        private final AtomicReference<FirstRequestFailure> armed = new AtomicReference<>();
        volatile CountDownLatch entered = new CountDownLatch(1);
        volatile CountDownLatch release = new CountDownLatch(1);

        void arm(FirstRequestFailure failure) {
            entered = new CountDownLatch(1);
            release = new CountDownLatch(1);
            armed.set(failure);
        }

        void disarm() {
            armed.set(null);
        }

        CareSettingsRepository wrap(CareSettingsRepository delegate) {
            return (CareSettingsRepository) Proxy.newProxyInstance(CareSettingsRepository.class.getClassLoader(),
                    new Class<?>[] {CareSettingsRepository.class}, (proxy, method, args) -> {
                        if (method.getName().equals("findById")) {
                            FirstRequestFailure failure = armed.getAndSet(null);
                            if (failure != null) {
                                return gated(failure, (String) args[0]);
                            }
                        }
                        try {
                            return method.invoke(delegate, args);
                        } catch (InvocationTargetException e) {
                            throw e.getCause();
                        }
                    });
        }

        private Optional<CareSettings> gated(FirstRequestFailure failure, String branchId) throws InterruptedException {
            entered.countDown();
            if (!release.await(60, TimeUnit.SECONDS)) {
                throw new IllegalStateException("gate not released");
            }
            if (failure == FirstRequestFailure.INTEGRATION_UNAVAILABLE) {
                throw new ExistingIntegrationException("gate: integration unavailable");
            }
            // 가장 엄격한 기준값: 이 요청에서는 신호가 없어 STUDENT_NOT_FLAGGED가 된다.
            return Optional.of(CareSettings.create(branchId,
                    new CareSettings.Values(14, 7, 90, 10, 60, 300, 7, 0), Instant.EPOCH));
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class GateConfig {

        @Bean
        static Gate gate() {
            return new Gate();
        }

        @Bean
        static BeanPostProcessor gateSettingsRepository(Gate gate) {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessAfterInitialization(Object bean, String beanName) {
                    return bean instanceof CareSettingsRepository repository ? gate.wrap(repository) : bean;
                }
            };
        }
    }
}
