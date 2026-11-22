package com.learnershigh.extension.assessment.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
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
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;

/**
 * 학교 수행평가 API (api-contract.md §9-1, §12, §13, §34) — 실제 MySQL(Testcontainers) 저장·재조회.
 * 인증은 Mock Header Adapter(MockHeaderAssessmentActorProvider)를 쓴다.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class SchoolAssessmentApiTest {

    static final String STUDENT = "stu_001";        // br_gangnam
    static final String OTHER_STUDENT = "stu_002";  // br_gangnam
    static final String BUNDANG_STUDENT = "stu_101"; // br_bundang
    static final String BASE = "/api/student/assessment/school-assessments";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc.update("delete from assessment_school_assessment");
    }

    static <B extends AbstractMockHttpServletRequestBuilder<B>> B asStudent(B builder, String studentId) {
        return builder.header("X-Assessment-Student-Id", studentId).accept(MediaType.APPLICATION_JSON);
    }

    static <B extends AbstractMockHttpServletRequestBuilder<B>> B asAdmin(B builder, String adminId) {
        return builder.header("X-Assessment-Admin-Id", adminId).accept(MediaType.APPLICATION_JSON);
    }

    String create(String studentId, String body) throws Exception {
        String response = mvc.perform(asStudent(post(BASE), studentId).contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.assessmentId");
    }

    static String minimal(String title, String subjectId) {
        return """
                {"title":"%s","subjectId":"%s","academicYear":2026,"semester":2}""".formatted(title, subjectId);
    }

    @Test
    void 인증_없이_요청하면_401() throws Exception {
        mvc.perform(get(BASE).param("academicYear", "2026").param("semester", "2").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(asStudent(get(BASE), "stu_unknown").param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 학업_Context를_조회한다() throws Exception {
        mvc.perform(asStudent(get("/api/student/assessment/academic-context"), STUDENT)
                        .param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.school.schoolId").value("school_001"))
                .andExpect(jsonPath("$.subjects[0].subjectId").value("subj_01"))
                .andExpect(jsonPath("$.source").value("EXISTING_LEARNERSHIGH"));
    }

    @Test
    void 제목과_과목만으로_등록하고_DB에서_다시_조회한다() throws Exception {
        String id = create(STUDENT, minimal("지역 하천 수질 조사", "subj_02"));

        // 모르는 값은 서버가 채우지 않는다: 마감일 null, 상태 기본 BEFORE_START
        mvc.perform(asStudent(get(BASE + "/" + id), STUDENT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assessmentId").value(id))
                .andExpect(jsonPath("$.title").value("지역 하천 수질 조사"))
                .andExpect(jsonPath("$.subjectId").value("subj_02"))
                .andExpect(jsonPath("$.status").value("BEFORE_START"))
                .andExpect(jsonPath("$.deadlineDate").doesNotExist())
                .andExpect(jsonPath("$.evaluationItemRef").doesNotExist());

        assertThat(jdbc.queryForObject("select student_id from assessment_school_assessment where id = ?",
                String.class, id)).isEqualTo(STUDENT);
        assertThat(jdbc.queryForObject("select deadline_date from assessment_school_assessment where id = ?",
                Object.class, id)).isNull();
    }

    @Test
    void 등록_응답의_createdAt과_재조회_값이_같다() throws Exception {
        String created = mvc.perform(asStudent(post(BASE), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content(minimal("시각", "subj_01")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(created, "$.assessmentId");
        String reread = mvc.perform(asStudent(get(BASE + "/" + id), STUDENT))
                .andReturn().getResponse().getContentAsString();
        assertThat((String) JsonPath.read(reread, "$.createdAt"))
                .isEqualTo(JsonPath.read(created, "$.createdAt"));
    }

    @Test
    void Body의_studentId는_무시하고_인증된_학생으로_저장한다() throws Exception {
        String id = create(STUDENT, """
                {"title":"발표","subjectId":"subj_01","academicYear":2026,"semester":2,"studentId":"stu_002"}""");
        assertThat(jdbc.queryForObject("select student_id from assessment_school_assessment where id = ?",
                String.class, id)).isEqualTo(STUDENT);
    }

    @Test
    void 필수값_누락과_알수없는_과목은_400() throws Exception {
        mvc.perform(asStudent(post(BASE), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":" ","subjectId":"subj_01","academicYear":2026,"semester":2}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value("title"));
        mvc.perform(asStudent(post(BASE), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content(minimal("발표", "subj_99")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("subjectId"));
        mvc.perform(asStudent(post(BASE), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"발표","subjectId":"subj_01","academicYear":2026,"semester":2,"status":"APPROVED"}"""))
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select count(*) from assessment_school_assessment", Integer.class)).isZero();
    }

    @Test
    void 다른_학생의_수행평가는_조회_수정_상태변경_모두_404() throws Exception {
        String id = create(STUDENT, minimal("보고서", "subj_01"));

        mvc.perform(asStudent(get(BASE + "/" + id), OTHER_STUDENT))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ASSESSMENT_NOT_FOUND"));
        mvc.perform(asStudent(patch(BASE + "/" + id), OTHER_STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"탈취\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(asStudent(patch(BASE + "/" + id + "/status"), OTHER_STUDENT)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(asStudent(get(BASE), OTHER_STUDENT).param("academicYear", "2026").param("semester", "2"))
                .andExpect(jsonPath("$.page.totalElements").value(0));

        mvc.perform(asStudent(get(BASE + "/" + id), STUDENT))
                .andExpect(jsonPath("$.title").value("보고서"))
                .andExpect(jsonPath("$.status").value("BEFORE_START"));
    }

    @Test
    void 개인정보를_수정하고_재조회한다_편집불가_필드는_400() throws Exception {
        String id = create(STUDENT, """
                {"title":"보고서","subjectId":"subj_01","academicYear":2026,"semester":2,
                 "deadlineDate":"2026-11-20","description":"초안"}""");

        mvc.perform(asStudent(patch(BASE + "/" + id), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"보고서 (수정)\",\"deadlineDate\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("보고서 (수정)"))
                .andExpect(jsonPath("$.deadlineDate").doesNotExist());
        // 보내지 않은 description은 그대로
        assertThat(jdbc.queryForObject("select description from assessment_school_assessment where id = ?",
                String.class, id)).isEqualTo("초안");

        mvc.perform(asStudent(patch(BASE + "/" + id), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subjectId\":\"subj_02\",\"status\":\"COMPLETED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("not_editable"));
        mvc.perform(asStudent(patch(BASE + "/" + id), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deadlineDate\":\"2026-13-40\"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(asStudent(get(BASE + "/" + id), STUDENT))
                .andExpect(jsonPath("$.subjectId").value("subj_01"))
                .andExpect(jsonPath("$.status").value("BEFORE_START"))
                .andExpect(jsonPath("$.title").value("보고서 (수정)"));
    }

    @Test
    void 상태를_앞으로_바꾸고_되돌리면_이력이_남는다_A27() throws Exception {
        String id = create(STUDENT, minimal("실험", "subj_04"));

        mvc.perform(asStudent(patch(BASE + "/" + id + "/status"), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.updatedAt").exists());
        // 같은 상태 재요청은 변경 없음으로 성공 (재시도 안전)
        mvc.perform(asStudent(patch(BASE + "/" + id + "/status"), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk());
        // A27-UX: 학생 개인 진행 상태 되돌리기(완료 → 진행 중 → 시작 전) 허용, 바뀐 경우만 이력에 남는다
        mvc.perform(asStudent(patch(BASE + "/" + id + "/status"), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        mvc.perform(asStudent(patch(BASE + "/" + id + "/status"), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"BEFORE_START\"}"))
                .andExpect(status().isOk());
        mvc.perform(asStudent(get(BASE + "/" + id), STUDENT)).andExpect(jsonPath("$.status").value("BEFORE_START"));
        assertThat(jdbc.queryForList("select concat(from_status, '>', to_status) from assessment_school_assessment_status_event"
                + " where assessment_id = ? order by changed_at, id", String.class, id))
                .containsExactlyInAnyOrder("BEFORE_START>COMPLETED", "COMPLETED>IN_PROGRESS", "IN_PROGRESS>BEFORE_START");
        mvc.perform(asStudent(patch(BASE + "/" + id + "/status"), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"APPROVED\"}"))
                .andExpect(status().isBadRequest());

        assertThat(jdbc.queryForObject("select status from assessment_school_assessment where id = ?",
                String.class, id)).isEqualTo("BEFORE_START");
    }

    @Test
    void 개인_관리_정보를_등록_수정하고_범위를_검사한다_A27() throws Exception {
        String body = "{\"title\":\"발표 준비\",\"subjectId\":\"subj_01\",\"academicYear\":2026,\"semester\":2,"
                + "\"assessmentType\":\"PRESENTATION\",\"evaluationDate\":\"2026-11-25\",\"deadlineDate\":\"2026-11-20\","
                + "\"weightPercent\":0,\"submissions\":\"발표 자료\",\"personalMemo\":\"리허설 2회\"}";
        String id = create(STUDENT, body);
        mvc.perform(asStudent(get(BASE + "/" + id), STUDENT))
                .andExpect(jsonPath("$.assessmentType").value("PRESENTATION"))
                .andExpect(jsonPath("$.evaluationDate").value("2026-11-25"))
                .andExpect(jsonPath("$.deadlineDate").value("2026-11-20"))
                .andExpect(jsonPath("$.weightPercent").value(0))
                .andExpect(jsonPath("$.submissions").value("발표 자료"))
                .andExpect(jsonPath("$.personalMemo").value("리허설 2회"));
        mvc.perform(asStudent(patch(BASE + "/" + id), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"weightPercent\":null,\"assessmentType\":\"REPORT\",\"evaluationDate\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weightPercent").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.assessmentType").value("REPORT"));
        mvc.perform(asStudent(patch(BASE + "/" + id), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"weightPercent\":101}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("range"));
        mvc.perform(asStudent(patch(BASE + "/" + id), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"assessmentType\":\"QUIZ\"}"))
                .andExpect(status().isBadRequest());
        // 다른 학생은 개인 관리 정보도 못 본다
        mvc.perform(asStudent(get(BASE + "/" + id), OTHER_STUDENT)).andExpect(status().isNotFound());
    }

    @Test
    void 목록은_학기_과목_상태_검색_정렬_페이지를_지원한다() throws Exception {
        String later = create(STUDENT, """
                {"title":"나중 마감","subjectId":"subj_01","academicYear":2026,"semester":2,"deadlineDate":"2026-12-01"}""");
        String sooner = create(STUDENT, """
                {"title":"먼저 마감","subjectId":"subj_02","academicYear":2026,"semester":2,"deadlineDate":"2026-11-15"}""");
        String undated = create(STUDENT, minimal("마감 미정", "subj_02"));
        create(STUDENT, """
                {"title":"1학기 과제","subjectId":"subj_11","academicYear":2026,"semester":1}""");

        mvc.perform(asStudent(get(BASE), STUDENT).param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.totalElements").value(3))
                .andExpect(jsonPath("$.items[0].assessmentId").value(sooner))
                .andExpect(jsonPath("$.items[1].assessmentId").value(later))
                .andExpect(jsonPath("$.items[2].assessmentId").value(undated));

        mvc.perform(asStudent(get(BASE), STUDENT).param("academicYear", "2026").param("semester", "2")
                        .param("subjectId", "subj_02"))
                .andExpect(jsonPath("$.page.totalElements").value(2));
        // 과목명 검색 (통합과학2 = subj_02)
        mvc.perform(asStudent(get(BASE), STUDENT).param("academicYear", "2026").param("semester", "2")
                        .param("query", "통합과학"))
                .andExpect(jsonPath("$.page.totalElements").value(2));
        mvc.perform(asStudent(get(BASE), STUDENT).param("academicYear", "2026").param("semester", "2")
                        .param("query", "미정"))
                .andExpect(jsonPath("$.items[0].assessmentId").value(undated));
        mvc.perform(asStudent(get(BASE), STUDENT).param("academicYear", "2026").param("semester", "2")
                        .param("status", "COMPLETED"))
                .andExpect(jsonPath("$.page.totalElements").value(0));
        mvc.perform(asStudent(get(BASE), STUDENT).param("academicYear", "2026").param("semester", "2")
                        .param("size", "2").param("page", "1"))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.page.totalPages").value(2));
        mvc.perform(asStudent(get(BASE), STUDENT).param("academicYear", "2026").param("semester", "2")
                        .param("sort", "updatedAt,desc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 관리자는_담당_지점_학생의_같은_수행평가를_읽고_다른_지점은_404() throws Exception {
        String id = create(STUDENT, minimal("보고서", "subj_01"));
        mvc.perform(asStudent(patch(BASE + "/" + id + "/status"), STUDENT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isOk());

        String adminPath = "/api/admin/assessment/students/" + STUDENT + "/school-assessments";
        mvc.perform(asAdmin(get(adminPath), "adm_gangnam").param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].assessmentId").value(id))
                .andExpect(jsonPath("$.items[0].status").value("IN_PROGRESS"));

        mvc.perform(asAdmin(get(adminPath), "adm_bundang").param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isNotFound());
        mvc.perform(get(adminPath).param("academicYear", "2026").param("semester", "2")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
        // 학생 Header로 관리자 API를 열 수 없다
        mvc.perform(asStudent(get(adminPath), STUDENT).param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isUnauthorized());
        // 분당 관리자는 분당 학생만
        mvc.perform(asAdmin(get("/api/admin/assessment/students/" + BUNDANG_STUDENT + "/school-assessments"),
                        "adm_bundang").param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.totalElements").value(0));
    }
}
