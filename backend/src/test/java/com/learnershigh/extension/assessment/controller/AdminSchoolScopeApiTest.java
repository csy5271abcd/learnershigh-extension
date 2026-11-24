package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A13 §33-1 관리자 담당 학교 = 담당 학생(지점 범위)의 학업 Context 학교, 학교 ID 기준 중복 제거. 전체 학교 Master가 아니다.
 * 개발용 다지점 시연 명단(합성 학생 60명, 지점 A·B·C, 학교 15곳)을 켠 일회용 DB에서 시험한다.
 */
@Tag("integration")
// A18: AllGradesPlanSlotApiTest와 같은 설정 — Spring Context(MySQL 컨테이너)를 공유한다(설정을 바꿀 때 둘 다 바꾼다).
@SpringBootTest(properties = {"assessment.demo-roster.enabled=true", "assessment.analysis-import.enabled=true",
    "assessment.analysis-import.contract03-enabled=true",
    "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class AdminSchoolScopeApiTest {

    @Autowired
    MockMvc mvc;

    @Test
    void 관리자마다_담당_학생의_학교만_중복_없이_보이고_다른_지점_학생은_조회할_수_없다() throws Exception {
        String a = mvc.perform(asAdmin(get("/api/admin/assessment/managed-schools"), "adm_demo_a01")
                        .param("academicYear", "2026").param("semester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coverage").value("ASSIGNED_STUDENTS"))
                .andExpect(jsonPath("$.items.length()").value(5))
                .andExpect(jsonPath("$.studentsWithoutSchool").value(0))
                .andReturn().getResponse().getContentAsString();
        // A28-04: B지점 = 기존 5개교 + 합성 학생 13개교(세화고는 A지점에도 학생이 있는 같은 학교) = 18개교, 학교마다 4명
        String b = mvc.perform(asAdmin(get("/api/admin/assessment/managed-schools"), "adm_demo_b01")
                        .param("academicYear", "2026").param("semester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(18))
                .andReturn().getResponse().getContentAsString();
        List<String> aSchools = JsonPath.read(a, "$.items[*].schoolId");
        List<String> bSchools = JsonPath.read(b, "$.items[*].schoolId");
        assertThat(aSchools).contains("sch_demo_unjeong").doesNotContain("sch_demo_daeshin").doesNotHaveDuplicates();
        assertThat(bSchools).contains("sch_demo_daeshin", "sch_demo_gyeongil", "sch_demo_hyundai", "sch_demo_sehwa").doesNotHaveDuplicates()
                .doesNotContain("sch_demo_unjeong");
        assertThat(JsonPath.<List<Integer>>read(b, "$.items[*].studentCount")).containsOnly(4);
        // 같은 학교라도 학생 수는 각 지점 학생만 센다(세화고: A지점 4명 · B지점 4명)
        assertThat(bSchools).filteredOn(aSchools::contains).containsExactly("sch_demo_sehwa");
        assertThat(JsonPath.<List<Integer>>read(a, "$.items[*].studentCount")).containsOnly(4);
        assertThat(JsonPath.<List<String>>read(a, "$.items[*].name")).doesNotContainNull();
        // 같은 지점의 다른 관리자는 같은 학교 목록
        mvc.perform(asAdmin(get("/api/admin/assessment/managed-schools"), "adm_demo_a02")
                        .param("academicYear", "2026").param("semester", "1"))
                .andExpect(jsonPath("$.items[*].schoolId").value(org.hamcrest.Matchers.containsInAnyOrder(aSchools.toArray())));
        // 다른 지점 학생 기록은 존재를 드러내지 않는다(404), 자기 지점 학생은 조회된다
        mvc.perform(asAdmin(get("/api/admin/assessment/students/stu_demo_021"), "adm_demo_a01").param("academicYear", "2026"))
                .andExpect(status().isNotFound());
        mvc.perform(asAdmin(get("/api/admin/assessment/students/stu_demo_001"), "adm_demo_a01").param("academicYear", "2026"))
                .andExpect(status().isOk());
        // 담당 지점이 없는 평가계획서 운영자: 담당 학교 없음(평가계획서 운영 권한 OD-A08과는 별개)
        mvc.perform(asAdmin(get("/api/admin/assessment/managed-schools"), "adm_plan_operator").param("academicYear", "2026").param("semester", "1"))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/admin/assessment/managed-schools")).andExpect(status().isUnauthorized());
        mvc.perform(asStudent(get("/api/admin/assessment/managed-schools"), "stu_001")).andExpect(status().isUnauthorized());
    }
}
