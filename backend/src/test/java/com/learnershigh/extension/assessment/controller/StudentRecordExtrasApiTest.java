package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
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

/** §29 성장 기록, §22·43 자료(공개 → 학생 조회), §30 중요 표시·보관함, §34 관리자 학생 목록 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentRecordExtrasApiTest {

    @Autowired
    MockMvc mvc;

    String assessment(String studentId) throws Exception {
        String response = mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), studentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"성장 시험\",\"subjectId\":\"subj_12\",\"academicYear\":2026,\"semester\":1}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.assessmentId");
    }

    @Test
    void 성장기록_작성_PATCH_조회_관리자_읽기_다른학생_404() throws Exception {
        String sa = assessment("stu_003");
        String created = mvc.perform(asStudent(post("/api/student/assessment/growth-records"), "stu_003")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"수질 탐구\",\"subjectId\":\"subj_12\",\"motivation\":\"하천이 궁금했다\","
                                + "\"relatedSourceType\":\"SCHOOL_ASSESSMENT\",\"relatedSourceId\":\"" + sa + "\",\"artifactIds\":[]}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.motivation").value("하천이 궁금했다"))
                .andReturn().getResponse().getContentAsString();
        String recordId = JsonPath.read(created, "$.recordId");
        mvc.perform(asStudent(patch("/api/student/assessment/growth-records/" + recordId), "stu_003")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reflection\":\"변인 통제가 어려웠다\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.motivation").value("하천이 궁금했다"))
                .andExpect(jsonPath("$.reflection").value("변인 통제가 어려웠다"));
        mvc.perform(asStudent(get("/api/student/assessment/growth-records"), "stu_003"))
                .andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(asStudent(get("/api/student/assessment/growth-records/" + recordId), "stu_002"))
                .andExpect(status().isNotFound());
        // 다른 학생 수행평가로 연결 불가
        String other = assessment("stu_004");
        mvc.perform(asStudent(patch("/api/student/assessment/growth-records/" + recordId), "stu_003")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"relatedSourceType\":\"SCHOOL_ASSESSMENT\",\"relatedSourceId\":\"" + other + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(asAdmin(get("/api/admin/assessment/students/stu_003/growth-records"), "adm_gangnam"))
                .andExpect(jsonPath("$.items[0].reflection").value("변인 통제가 어려웠다"));
        mvc.perform(asAdmin(get("/api/admin/assessment/students/stu_003/growth-records"), "adm_bundang"))
                .andExpect(status().isNotFound());
    }

    @Test
    void 학생자료는_비공개_관리자_공개자료만_학생이_본다() throws Exception {
        mvc.perform(asStudent(post("/api/student/assessment/resources"), "stu_005").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"ARTICLE\",\"title\":\"내 기사\",\"sourceUrl\":\"https://example.org/a\",\"tags\":[\"환경\"]}"))
                .andExpect(status().isCreated());
        mvc.perform(asStudent(post("/api/student/assessment/resources"), "stu_005").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"ARTICLE\",\"title\":\"나쁜 주소\",\"sourceUrl\":\"javascript:alert(1)\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(asStudent(get("/api/student/assessment/resources"), "stu_006"))
                .andExpect(jsonPath("$.items.length()").value(0));

        String scrap = mvc.perform(asAdmin(post("/api/admin/assessment/reference-library"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"ARTICLE\",\"title\":\"공개 예정 자료\",\"sourceUrl\":\"https://example.org/b\",\"subjectIds\":[\"subj_12\"],\"tags\":[]}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.published").value(false))
                .andReturn().getResponse().getContentAsString();
        String scrapId = JsonPath.read(scrap, "$.scrapId");
        mvc.perform(asStudent(get("/api/student/assessment/shared-resources"), "stu_005"))
                .andExpect(jsonPath("$.items[?(@.resourceId == '" + scrapId + "')]").isEmpty());
        mvc.perform(asAdmin(put("/api/admin/assessment/reference-library/" + scrapId + "/visibility"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"published\":true}"))
                .andExpect(jsonPath("$.published").value(true));
        mvc.perform(asStudent(get("/api/student/assessment/shared-resources"), "stu_005"))
                .andExpect(jsonPath("$.items[?(@.resourceId == '" + scrapId + "')].title").value("공개 예정 자료"));
    }

    @Test
    void 중요표시_보관함_반복요청_결과같음_관리자_학생목록() throws Exception {
        String sa = assessment("stu_007");
        String body = "{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + sa + "\",\"favorite\":true}";
        for (int i = 0; i < 2; i++) {
            mvc.perform(asStudent(put("/api/student/assessment/archive/favorites"), "stu_007")
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk());
        }
        mvc.perform(asStudent(get("/api/student/assessment/archive").param("tab", "favorites"), "stu_007"))
                .andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].favorite").value(true));
        mvc.perform(asStudent(put("/api/student/assessment/archive/favorites"), "stu_008")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
        mvc.perform(asAdmin(get("/api/admin/assessment/students").param("academicYear", "2026").param("semester", "1"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.student.studentId == 'stu_007')].activity.schoolAssessment.beforeStart").value(1))
                .andExpect(jsonPath("$.items[?(@.student.studentId == 'stu_101')]").isEmpty());
        mvc.perform(asAdmin(get("/api/admin/assessment/students/stu_101").param("academicYear", "2026"), "adm_gangnam"))
                .andExpect(status().isNotFound());
    }
}
