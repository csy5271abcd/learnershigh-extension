package com.learnershigh.extension.common.testsupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * e2e Profile만으로는 /api/test/** 가 없다 (ADR-0007). application.yml의 e2e Profile은 test-endpoints를 켜지 않고,
 * E2E 실행 환경만 LEARNERSHIGH_TEST_ENDPOINTS_ENABLED=true로 켠다. 여기서는 그 속성을 주지 않는다.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class E2eEndpointsRequirePropertyTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ApplicationContext context;

    @Test
    void e2eProfileAloneDoesNotRegisterTestEndpoints() throws Exception {
        assertThat(context.getEnvironment().getProperty("learnershigh.test-endpoints.enabled")).isNull();
        assertThat(context.getBeanNamesForType(E2eTestSupport.class)).isEmpty();
        assertThat(context.getBeanNamesForType(E2eTestSupportController.class)).isEmpty();

        mvc.perform(post("/api/test/reset"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(put("/api/test/integration").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studyDataAvailable\":false}"))
                .andExpect(status().isNotFound());
    }
}
