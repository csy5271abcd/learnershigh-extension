package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** A28-33 §30-b 학생 달력 개인 임시 배치 — 본인만 · 범위 검증 · 멱등 덮어쓰기 · 학기 초기화 · 공식 데이터 무영향 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentCalendarPlacementApiTest {

    static final String PATH = "/api/student/assessment/calendar-placements";
    static final String KEY = "plan_x|subj_02|T05";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void clean() {
        jdbc.update("delete from assessment_student_calendar_placement");
    }

    static String body(String key, String date, String from, String to) {
        return """
                {"academicYear":2026,"semester":2,"sourceKey":"%s","displayDate":"%s","rangeFrom":"%s","rangeTo":"%s"}"""
                .formatted(key, date, from, to);
    }

    @Test
    void 주_범위_안으로_옮기면_저장되고_같은_키는_덮어쓰며_다시_읽어도_남는다() throws Exception {
        mvc.perform(asStudent(put(PATH), "stu_006").contentType(MediaType.APPLICATION_JSON)
                        .content(body(KEY, "2026-11-10", "2026-11-08", "2026-11-14")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceKey").value(KEY))
                .andExpect(jsonPath("$.displayDate").value("2026-11-10"));
        // 같은 키 다시(옮기기·중복 클릭) → 한 행, 마지막 날짜
        for (int i = 0; i < 2; i++) {
            mvc.perform(asStudent(put(PATH), "stu_006").contentType(MediaType.APPLICATION_JSON)
                            .content(body(KEY, "2026-11-12", "2026-11-08", "2026-11-14")))
                    .andExpect(status().isOk());
        }
        mvc.perform(asStudent(get(PATH).param("academicYear", "2026").param("semester", "2"), "stu_006"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].displayDate").value("2026-11-12"))
                .andExpect(jsonPath("$.items[0].rangeFrom").value("2026-11-08"));
        // 2월(다음 해) 범위도 학년도 기준으로 받는다
        mvc.perform(asStudent(put(PATH), "stu_006").contentType(MediaType.APPLICATION_JSON)
                        .content(body("plan_x|subj_02|T09", "2027-02-03", "2027-02-01", "2027-02-28")))
                .andExpect(status().isOk());
    }

    @Test
    void 다른_학생은_보이지_않고_바꿀_수도_없으며_초기화도_본인_것만() throws Exception {
        mvc.perform(asStudent(put(PATH), "stu_006").contentType(MediaType.APPLICATION_JSON)
                        .content(body(KEY, "2026-11-10", "2026-11-08", "2026-11-14")))
                .andExpect(status().isOk());
        // 다른 학생: 목록 0건, 같은 키를 저장해도 자기 행만 생긴다
        mvc.perform(asStudent(get(PATH).param("academicYear", "2026").param("semester", "2"), "stu_007"))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(asStudent(put(PATH), "stu_007").contentType(MediaType.APPLICATION_JSON)
                        .content(body(KEY, "2026-11-13", "2026-11-08", "2026-11-14")))
                .andExpect(status().isOk());
        mvc.perform(asStudent(delete(PATH).param("academicYear", "2026").param("semester", "2"), "stu_007"))
                .andExpect(status().isNoContent());
        mvc.perform(asStudent(get(PATH).param("academicYear", "2026").param("semester", "2"), "stu_006"))
                .andExpect(jsonPath("$.items[0].displayDate").value("2026-11-10"));
        // 본인 초기화 → 그 학기만 비워진다
        mvc.perform(asStudent(delete(PATH).param("academicYear", "2026").param("semester", "2"), "stu_006"))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("select count(*) from assessment_student_calendar_placement", Integer.class)).isZero();
    }

    @Test
    void 범위_밖_다른_달_다른_학년도_잘못된_키_학기는_400이고_아무것도_저장하지_않는다() throws Exception {
        String[][] bad = {
                {body(KEY, "2026-11-20", "2026-11-08", "2026-11-14"), "displayDate"},
                {body(KEY, "2026-11-30", "2026-11-29", "2026-12-05"), "rangeTo"},
                {body(KEY, "2025-11-10", "2025-11-08", "2025-11-14"), "rangeFrom"},
                {body(KEY, "2026-11-10", "2026-11-14", "2026-11-08"), "rangeTo"},
                {body("bad key", "2026-11-10", "2026-11-08", "2026-11-14"), "sourceKey"},
                {body(KEY, "2026-11-10", "2026-11-08", "2026-11-14").replace("\"semester\":2", "\"semester\":3"), "semester"},
        };
        for (String[] item : bad) {
            mvc.perform(asStudent(put(PATH), "stu_006").contentType(MediaType.APPLICATION_JSON).content(item[0]))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.details.fields[0].field").value(item[1]));
        }
        assertThat(jdbc.queryForObject("select count(*) from assessment_student_calendar_placement", Integer.class)).isZero();
    }

    @Test
    void 인증_없으면_401_관리자_경로는_없다() throws Exception {
        mvc.perform(get(PATH).param("academicYear", "2026").param("semester", "2")).andExpect(status().isUnauthorized());
        mvc.perform(put(PATH).contentType(MediaType.APPLICATION_JSON).content(body(KEY, "2026-11-10", "2026-11-08", "2026-11-14")))
                .andExpect(status().isUnauthorized());
        mvc.perform(asAdmin(get("/api/admin/assessment/calendar-placements"), "adm_gangnam")).andExpect(status().isNotFound());
    }
}
