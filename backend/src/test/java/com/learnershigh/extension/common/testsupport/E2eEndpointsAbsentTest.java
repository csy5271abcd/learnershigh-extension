package com.learnershigh.extension.common.testsupport;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

/** e2e Profile이 아니면 /api/test/** 가 없다. */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Import(MySqlContainerConfig.class)
class E2eEndpointsAbsentTest {

    @Autowired
    MockMvc mvc;

    @Test
    void testEndpointsAreNotRegistered() throws Exception {
        mvc.perform(post("/api/test/reset"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
