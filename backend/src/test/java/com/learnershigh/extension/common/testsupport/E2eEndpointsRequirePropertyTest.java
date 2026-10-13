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

/** e2e Profile이어도 learnershigh.test-endpoints.enabled=true가 없으면 /api/test/** 가 없다 (ADR-0007). */
@Tag("integration")
@SpringBootTest(properties = "learnershigh.test-endpoints.enabled=false")
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
