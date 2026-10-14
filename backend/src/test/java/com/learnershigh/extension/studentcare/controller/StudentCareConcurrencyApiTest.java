package com.learnershigh.extension.studentcare.controller;

import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.ANCHOR;
import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.BRANCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.common.integration.learnershigh.MockIntegrationSwitch;
import com.learnershigh.extension.common.time.AdjustableClock;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;

/**
 * 동시 요청 (domain.md §5-1, api-contract.md §65-4, 65-6). 실제 MySQL에서 같은 요청을 동시에 보낸다.
 * 학생 단위 / 건 단위 잠금이 없으면 건이 둘 생기거나 sequence 충돌로 500이 난다.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentCareConcurrencyApiTest {

    private static final int CONCURRENCY = 4;

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    AdjustableClock clock;

    @Autowired
    MockIntegrationSwitch integration;

    @BeforeEach
    void setUp() {
        StudentCareApiTestSupport.reset(jdbc, clock, integration);
    }

    private record Reply(int status, String body) {

        String code() {
            return status >= 400 ? JsonPath.read(body, "$.code") : null;
        }
    }

    /** 모든 요청을 준비시킨 뒤 한꺼번에 출발시킨다. */
    private List<Reply> concurrently(int count, RequestBuilder request) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(count);
        CountDownLatch ready = new CountDownLatch(count);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Reply>> futures = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                Callable<Reply> call = () -> {
                    ready.countDown();
                    start.await();
                    MockHttpServletResponse response = mvc.perform(request).andReturn().getResponse();
                    return new Reply(response.getStatus(), response.getContentAsString());
                };
                futures.add(executor.submit(call));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            List<Reply> replies = new ArrayList<>();
            for (Future<Reply> future : futures) {
                replies.add(future.get(60, TimeUnit.SECONDS));
            }
            return replies;
        } finally {
            executor.shutdownNow();
        }
    }

    private static RequestBuilder open(String body) {
        return post("/api/admin/student-care/cases").contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private String startAdjustment() throws Exception {
        String response = mvc.perform(open("""
                        {"branchId":"br_gangnam","studentId":"stu_005","channel":"CALL","reason":"ADJUSTMENT_NEEDED",
                         "recheckDate":"2026-10-07"}"""))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.caseId");
    }

    @Test
    void concurrentAdjustmentStartsCreateExactlyOneCase() throws Exception {
        List<Reply> replies = concurrently(CONCURRENCY, open("""
                {"branchId":"br_gangnam","studentId":"stu_005","channel":"CALL","reason":"ADJUSTMENT_NEEDED",
                 "recheckDate":"2026-10-07"}"""));

        assertThat(replies).filteredOn(reply -> reply.status() == 201).hasSize(1);
        assertThat(replies).filteredOn(reply -> reply.status() != 201)
                .allSatisfy(reply -> {
                    assertThat(reply.status()).isEqualTo(409);
                    assertThat(reply.code()).isEqualTo("ACTIVE_CARE_CASE_EXISTS");
                });
        assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isEqualTo(1);
        assertThat(StudentCareApiTestSupport.count(jdbc, "care_event")).isEqualTo(2);
    }

    @Test
    void concurrentExpectedChangeConfirmationsCreateExactlyOneCase() throws Exception {
        List<Reply> replies = concurrently(CONCURRENCY, open("""
                {"branchId":"br_gangnam","studentId":"stu_001","channel":"CALL","reason":"EXPECTED_CHANGE","memo":"가족 여행"}"""));

        assertThat(replies).filteredOn(reply -> reply.status() == 201).hasSize(1);
        assertThat(replies).filteredOn(reply -> reply.status() != 201)
                .allSatisfy(reply -> {
                    assertThat(reply.status()).isEqualTo(409);
                    assertThat(reply.code()).isEqualTo("STUDENT_NOT_FLAGGED");
                });
        assertThat(StudentCareApiTestSupport.count(jdbc, "care_case")).isEqualTo(1);
    }

    @Test
    void concurrentCloseDecisionsCloseOnceAndRejectTheRest() throws Exception {
        String caseId = startAdjustment();
        clock.setDate(ANCHOR.plusDays(7));

        List<Reply> replies = concurrently(CONCURRENCY,
                post("/api/admin/student-care/cases/{caseId}/decisions", caseId).param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"CLOSE\"}"));

        assertThat(replies).filteredOn(reply -> reply.status() == 200).hasSize(1);
        assertThat(replies).filteredOn(reply -> reply.status() != 200)
                .allSatisfy(reply -> {
                    assertThat(reply.status()).isEqualTo(409);
                    assertThat(reply.code()).isEqualTo("INVALID_STATE_TRANSITION");
                });
        assertThat(jdbc.queryForList("select event_type from care_event where case_id = ? order by sequence",
                String.class, caseId)).containsExactly("REASON_CONFIRMED", "ADJUSTMENT_STARTED", "RECHECKED", "CLOSED");
    }

    @Test
    void concurrentNotesAreAllKeptWithDistinctSequences() throws Exception {
        String caseId = startAdjustment();

        List<Reply> replies = concurrently(CONCURRENCY,
                post("/api/admin/student-care/cases/{caseId}/notes", caseId).param("branchId", BRANCH)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"channel\":\"CALL\",\"content\":\"통화\"}"));

        assertThat(replies).extracting(Reply::status).containsOnly(201);
        assertThat(jdbc.queryForList("select sequence from care_event where case_id = ? order by sequence",
                Integer.class, caseId)).containsExactly(1, 2, 3, 4, 5, 6);
    }
}
