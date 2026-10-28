package com.learnershigh.extension.common.testsupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.support.MySqlContainerConfig;
import org.springframework.context.ApplicationContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * /api/test/** (api-contract.md §65-11, ADR-0007). e2e Profile + learnershigh.test-endpoints.enabled=true
 * (CI / 로컬 E2E에서는 환경 변수 LEARNERSHIGH_TEST_ENDPOINTS_ENABLED=true)일 때만 등록된다.
 * 기준일 / 연동 스위치를 바꾸므로 끝나면 항상 되돌린다.
 */
@Tag("integration")
@SpringBootTest(properties = "learnershigh.test-endpoints.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class E2eTestSupportControllerTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    E2eTestSupport support;

    @Autowired
    ApplicationContext context;

    @AfterEach
    void restore() {
        support.reset();
    }

    @Test
    void testEndpointBeansArePresentWithTheProperty() {
        assertThat(context.getBeanNamesForType(E2eTestSupport.class)).hasSize(1);
        assertThat(context.getBeanNamesForType(E2eTestSupportController.class)).hasSize(1);
    }

    @Test
    void clockIntegrationSwitchAndResetDriveTheBoard() throws Exception {
        mvc.perform(put("/api/test/clock").contentType(MediaType.APPLICATION_JSON).content("{\"date\":\"2026-10-07\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/student-care/board").param("branchId", "br_gangnam"))
                .andExpect(jsonPath("$.asOf").value("2026-10-06"));

        mvc.perform(put("/api/test/integration").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studyDataAvailable\":false}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/admin/student-care/board").param("branchId", "br_gangnam"))
                .andExpect(status().isServiceUnavailable());

        mvc.perform(post("/api/test/reset")).andExpect(status().isNoContent());
        mvc.perform(get("/api/admin/student-care/board").param("branchId", "br_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.asOf").value("2026-09-29"));
    }
}
