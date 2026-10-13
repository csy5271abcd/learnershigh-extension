package com.learnershigh.extension.common.testsupport;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class E2eTestSupportControllerTest {

    @Autowired
    MockMvc mvc;

    @Test
    void clockIntegrationSwitchAndResetDriveTheBoard() throws Exception {
        mvc.perform(put("/api/test/clock").contentType(MediaType.APPLICATION_JSON).content("{\"date\":\"2026-10-07\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/student-care/board").param("branchId", "br_gangnam"))
                .andExpect(jsonPath("$.asOf").value("2026-10-07"));

        mvc.perform(put("/api/test/integration").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studyDataAvailable\":false}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/admin/student-care/board").param("branchId", "br_gangnam"))
                .andExpect(status().isServiceUnavailable());

        mvc.perform(post("/api/test/reset")).andExpect(status().isNoContent());
        mvc.perform(get("/api/admin/student-care/board").param("branchId", "br_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.asOf").value("2026-09-30"));
    }
}
