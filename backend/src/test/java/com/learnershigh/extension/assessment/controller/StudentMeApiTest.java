package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** A28-12: 학생 머리글 이름은 인증된 학생 본인의 학생 정보에서 온다(고정값 아님). 학생을 바꾸면 이름도 바뀐다. */
@Tag("integration")
// AdminSchoolScopeApiTest·AllGradesPlanSlotApiTest 와 같은 설정 — Spring Context(MySQL 컨테이너)를 공유한다
@SpringBootTest(properties = {"assessment.demo-roster.enabled=true", "assessment.analysis-import.enabled=true",
    "assessment.analysis-import.contract03-enabled=true",
    "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentMeApiTest {

    @Autowired
    MockMvc mvc;

    @Test
    void 활성_학생의_이름을_돌려주고_학생을_바꾸면_그_학생_이름이다() throws Exception {
        mvc.perform(asStudent(get("/api/student/assessment/me"), "stu_demo_021"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("stu_demo_021"))
                .andExpect(jsonPath("$.displayName").value("서예린"));
        mvc.perform(asStudent(get("/api/student/assessment/me"), "stu_demo_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("stu_demo_001"))
                .andExpect(jsonPath("$.displayName").value(org.hamcrest.Matchers.not("서예린")))
                .andExpect(jsonPath("$.displayName").value(org.hamcrest.Matchers.not("최하은")));
    }

    @Test
    void 인증이_없으면_401() throws Exception {
        mvc.perform(get("/api/student/assessment/me")).andExpect(status().isUnauthorized());
    }
}
