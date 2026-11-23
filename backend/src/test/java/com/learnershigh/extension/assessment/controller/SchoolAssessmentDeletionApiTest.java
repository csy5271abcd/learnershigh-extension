package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A28-49 §12-1 수행평가 영구 삭제: 제목 확인 · 본인만 · 노트/Revision/결과물/버전/즐겨찾기 행과 결과물 바이트 삭제 ·
 * 피드백 요청·성장 기록·학교 확정 항목은 기록 보존을 위해 409(데이터 그대로) · 휴지통 항목도 삭제 가능.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class SchoolAssessmentDeletionApiTest {

    static final String S = "/api/student/assessment";
    static final byte[] PDF = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF".getBytes(StandardCharsets.US_ASCII);

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Value("${assessment.storage.root}")
    String storageRoot;

    final List<String> created = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        for (String sa : created) {
            jdbc.update("delete from assessment_growth_record where related_source_id = ?", sa);
            jdbc.update("delete from assessment_feedback_snapshot where request_id in (select id from assessment_feedback_request where source_id = ?)", sa);
            jdbc.update("delete from assessment_feedback_request where source_id = ?", sa);
            jdbc.update("delete from assessment_note_revision where note_id in (select id from assessment_note where source_id = ?)", sa);
            jdbc.update("delete from assessment_note where source_id = ?", sa);
            jdbc.update("delete from assessment_artifact_version where artifact_id in (select id from assessment_artifact where source_id = ?)", sa);
            jdbc.update("delete from assessment_artifact where source_id = ?", sa);
            jdbc.update("delete from assessment_favorite where source_id = ?", sa);
            jdbc.update("delete from assessment_school_assessment_status_event where assessment_id = ?", sa);
            jdbc.update("delete from assessment_school_assessment where id = ?", sa);
        }
        created.clear();
    }

    String assessment(String title) throws Exception {
        String body = mvc.perform(asStudent(post(S + "/school-assessments"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"%s\",\"subjectId\":\"subj_11\",\"academicYear\":2026,\"semester\":1}".formatted(title)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.assessmentId");
        created.add(id);
        return id;
    }

    String noteRevision(String sa) throws Exception {
        String note = mvc.perform(asStudent(post(S + "/notes"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content(StudentRecordApiTest.noteBody(sa, "기록")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String noteId = JsonPath.read(note, "$.noteId");
        String r1 = JsonPath.read(note, "$.revisionId");
        mvc.perform(asStudent(put(S + "/notes/" + noteId), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedRevisionId\":\"" + r1 + "\",\"title\":\"고침\",\"blocks\":[]}")).andExpect(status().isOk());
        return r1;
    }

    String artifactVersion(String sa) throws Exception {
        String artifact = mvc.perform(asStudent(post(S + "/artifacts"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + sa + "\",\"title\":\"보고서\",\"kind\":null}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String artifactId = JsonPath.read(artifact, "$.artifactId");
        String version = mvc.perform(asStudent(multipart(S + "/artifacts/" + artifactId + "/versions")
                        .file(new MockMultipartFile("file", "보고서.pdf", "application/pdf", PDF)), "stu_001"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(version, "$.versionId");
    }

    String deleteBody(String title) {
        return "{\"confirmTitle\":\"" + title + "\"}";
    }

    int count(String sql, String id) {
        return jdbc.queryForObject(sql, Integer.class, id);
    }

    @Test
    void 제목을_확인하면_노트_결과물_즐겨찾기와_결과물_파일까지_지우고_다른_학생은_못_지운다() throws Exception {
        String sa = assessment("영구 삭제 시험");
        noteRevision(sa);
        String versionId = artifactVersion(sa);
        String key = jdbc.queryForObject("select storage_key from assessment_artifact_version where id = ?", String.class, versionId);
        mvc.perform(asStudent(put(S + "/archive/favorites"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content("{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + sa + "\",\"favorite\":true}")).andExpect(status().is2xxSuccessful());

        mvc.perform(asStudent(post(S + "/school-assessments/" + sa + "/permanent-delete"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content(deleteBody("다른 제목"))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("confirmTitle"));
        mvc.perform(asStudent(post(S + "/school-assessments/" + sa + "/permanent-delete"), "stu_002").contentType(MediaType.APPLICATION_JSON)
                .content(deleteBody("영구 삭제 시험"))).andExpect(status().isNotFound());
        mvc.perform(post(S + "/school-assessments/" + sa + "/permanent-delete").contentType(MediaType.APPLICATION_JSON)
                .content(deleteBody("영구 삭제 시험"))).andExpect(status().isUnauthorized());
        assertThat(count("select count(*) from assessment_school_assessment where id = ?", sa)).isEqualTo(1);

        mvc.perform(asStudent(post(S + "/school-assessments/" + sa + "/permanent-delete"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content(deleteBody("영구 삭제 시험"))).andExpect(status().isNoContent());
        assertThat(count("select count(*) from assessment_school_assessment where id = ?", sa)).isZero();
        assertThat(count("select count(*) from assessment_note where source_id = ?", sa)).isZero();
        assertThat(count("select count(*) from assessment_artifact where source_id = ?", sa)).isZero();
        assertThat(count("select count(*) from assessment_artifact_version where id = ?", versionId)).isZero();
        assertThat(count("select count(*) from assessment_favorite where source_id = ?", sa)).isZero();
        assertThat(java.nio.file.Path.of(storageRoot).toAbsolutePath().normalize().resolve(key.substring(0, 2)).resolve(key)).doesNotExist();
        mvc.perform(asStudent(get(S + "/school-assessments/" + sa), "stu_001")).andExpect(status().isNotFound());
        // 같은 요청 반복 → 404(이미 없음)
        mvc.perform(asStudent(post(S + "/school-assessments/" + sa + "/permanent-delete"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content(deleteBody("영구 삭제 시험"))).andExpect(status().isNotFound());
    }

    @Test
    void 휴지통에_있는_항목도_영구_삭제할_수_있다() throws Exception {
        String sa = assessment("휴지통 영구 삭제");
        noteRevision(sa);
        mvc.perform(asStudent(delete(S + "/school-assessments/" + sa), "stu_001")).andExpect(status().isNoContent());
        mvc.perform(asStudent(post(S + "/school-assessments/" + sa + "/permanent-delete"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content(deleteBody("휴지통 영구 삭제"))).andExpect(status().isNoContent());
        assertThat(count("select count(*) from assessment_school_assessment where id = ?", sa)).isZero();
    }

    @Test
    void 피드백_요청_성장_기록_학교_확정_항목은_기록을_지키려고_삭제하지_않는다() throws Exception {
        String withFeedback = assessment("피드백 보낸 항목");
        String r1 = noteRevision(withFeedback);
        mvc.perform(asStudent(post(S + "/feedback-requests"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content("{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + withFeedback + "\",\"noteRevisionId\":\"" + r1 + "\",\"artifactVersionIds\":[]}"))
                .andExpect(status().isCreated());
        mvc.perform(asStudent(post(S + "/school-assessments/" + withFeedback + "/permanent-delete"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content(deleteBody("피드백 보낸 항목"))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].field").value("feedbackRequests"));
        assertThat(count("select count(*) from assessment_note_revision where id = ?", r1)).isEqualTo(1);

        String withGrowth = assessment("성장 기록 연결 항목");
        mvc.perform(asStudent(post(S + "/growth-records"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"연결 기록\",\"subjectId\":\"subj_11\",\"relatedSourceType\":\"SCHOOL_ASSESSMENT\",\"relatedSourceId\":\"" + withGrowth + "\",\"artifactIds\":[]}"))
                .andExpect(status().isCreated());
        mvc.perform(asStudent(post(S + "/school-assessments/" + withGrowth + "/permanent-delete"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content(deleteBody("성장 기록 연결 항목"))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].field").value("growthRecords"));

        String official = assessment("학교 확정 항목");
        // 공식 연결 CHECK(ck_assessment_sa_official_link): key·plan·review·status 를 함께 채운다(시험용 흉내)
        jdbc.update("update assessment_school_assessment set official_key = ?, official_plan_id = ?, official_review_id = ?, official_status = 'ACTIVE' where id = ?",
                "official|test|" + official, "plan_test", "review_test", official);
        mvc.perform(asStudent(post(S + "/school-assessments/" + official + "/permanent-delete"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content(deleteBody("학교 확정 항목"))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.details.fields[0].field").value("official"));
        assertThat(count("select count(*) from assessment_school_assessment where id = ?", official)).isEqualTo(1);
    }
}
