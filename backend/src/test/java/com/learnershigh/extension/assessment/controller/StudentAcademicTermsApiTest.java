package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.common.time.AdjustableClock;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.time.LocalDate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A28-29 §9-1-c 학적이 있는 학기 목록: 현재 학년도와 앞 두 학년도 중 원천에 학적이 있는 학기만(최신 먼저), 학적을 만들지 않는다.
 * 시연 원천은 학생당 한 학년도뿐이라 과거 학년도는 달력을 다음 해로 옮겨 확인한다(그 학생의 2026 학적이 '지난 학년도'로 남는다).
 */
@Tag("integration")
// StudentMeApiTest 와 같은 설정 — Spring Context(MySQL 컨테이너)를 공유한다
@SpringBootTest(properties = {"assessment.demo-roster.enabled=true", "assessment.analysis-import.enabled=true",
    "assessment.analysis-import.contract03-enabled=true",
    "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentAcademicTermsApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    AdjustableClock clock;

    @Value("${app.fixed-date}")
    LocalDate fixedDate;

    @AfterEach
    void restoreClock() {
        clock.setDate(fixedDate);
    }

    @Test
    void 현재_학년도의_학적이_있는_두_학기를_최신_먼저() throws Exception {
        clock.setDate(LocalDate.of(2026, 11, 23));
        mvc.perform(asStudent(get("/api/student/assessment/academic-terms"), "stu_demo_073"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentTerm.academicYear").value(2026))
                .andExpect(jsonPath("$.currentTerm.semester").value(2))
                .andExpect(jsonPath("$.terms.length()").value(2))
                .andExpect(jsonPath("$.terms[0].academicYear").value(2026))
                .andExpect(jsonPath("$.terms[0].semester").value(2))
                .andExpect(jsonPath("$.terms[1].semester").value(1));
    }

    @Test
    void 다음_학년도가_되면_지난_학년도_학적이_목록에_남고_없는_학기는_만들지_않는다() throws Exception {
        clock.setDate(LocalDate.of(2027, 4, 1));
        mvc.perform(asStudent(get("/api/student/assessment/academic-terms"), "stu_demo_073"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentTerm.academicYear").value(2027))
                .andExpect(jsonPath("$.currentTerm.semester").value(1))
                // 2027 학적은 원천에 없다 → 목록에 없음(오류 아님). 2026 두 학기만
                .andExpect(jsonPath("$.terms.length()").value(2))
                .andExpect(jsonPath("$.terms[0].academicYear").value(2026))
                .andExpect(jsonPath("$.terms[1].academicYear").value(2026));
        // 그 학기의 학업 정보는 §9-1 로 그대로 조회된다
        mvc.perform(asStudent(get("/api/student/assessment/academic-context").param("academicYear", "2026").param("semester", "1"), "stu_demo_073"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.academicYear").value(2026));
    }

    @Test
    void 인증이_없으면_401() throws Exception {
        mvc.perform(get("/api/student/assessment/academic-terms")).andExpect(status().isUnauthorized());
    }
}
