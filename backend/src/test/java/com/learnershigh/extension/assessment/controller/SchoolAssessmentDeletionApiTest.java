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

    @Autowired
    com.learnershigh.extension.assessment.service.record.ExportFontLocator fonts;

    static byte[] realPng() throws Exception {
        java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(120, 80, java.awt.image.BufferedImage.TYPE_INT_RGB);
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    String attachment(String student, String name, byte[] bytes, String type) throws Exception {
        String body = mvc.perform(asStudent(multipart(S + "/note-attachments").file(new MockMultipartFile("file", name, type, bytes)), student))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.attachmentId");
        attachmentsCreated.add(id);
        return id;
    }

    final List<String> attachmentsCreated = new ArrayList<>();

    @AfterEach
    void cleanAttachments() {
        attachmentsCreated.forEach(id -> jdbc.update("delete from assessment_note_attachment where id = ?", id));
        attachmentsCreated.clear();
    }

    static final String EXPORT_BODY = "{\"subjectName\":\"한국사2\",\"meta\":[[\"진행 상태\",\"진행 중\"],[\"평가일\",null]]}";

    /** A28-51 §20-1: 저장된 최신 노트 → 텍스트 PDF(본인 이미지 본문 배치·PDF 첨부는 목록), 본인만·휴지통 항목 404·비인증 401 */
    @Test
    void 노트를_PDF로_내보내면_저장된_최신_노트가_한글_텍스트_PDF로_나온다() throws Exception {
        String sa = assessment("나의 20세기: 역사 탐구");
        String png = attachment("stu_001", "지도.png", realPng(), "image/png");
        String pdfFile = attachment("stu_001", "자료.pdf", PDF, "application/pdf");
        String note = mvc.perform(asStudent(post(S + "/notes"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sourceType":"SCHOOL_ASSESSMENT","sourceId":"%s","title":"탐구 과정",
                                 "blocks":[{"blockId":"b1","type":"HEADING","text":"첫 저장"}]}""".formatted(sa)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(asStudent(put(S + "/notes/" + JsonPath.read(note, "$.noteId")), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"expectedRevisionId":"%s","title":"탐구 과정",
                         "blocks":[{"blockId":"b1","type":"HEADING","text":"조사 배경 (Background)"},
                                   {"blockId":"b2","type":"PARAGRAPH","text":"냉전 1945~1991 & <특수> · 『인용』"},
                                   {"blockId":"b3","type":"IMAGE","text":"","attrs":{"file":{"name":"지도.png","size":10,"mimeType":"image/png","attachmentId":"%s"}}},
                                   {"blockId":"b4","type":"FILE","text":"","attrs":{"file":{"name":"자료.pdf","size":%d,"mimeType":"application/pdf","attachmentId":"%s"}}}]}"""
                        .formatted(JsonPath.read(note, "$.revisionId"), png, PDF.length, pdfFile)))
                .andExpect(status().isOk());

        mvc.perform(asStudent(post(S + "/school-assessments/" + sa + "/note-export"), "stu_002").contentType(MediaType.APPLICATION_JSON)
                .content(EXPORT_BODY)).andExpect(status().isNotFound());
        mvc.perform(post(S + "/school-assessments/" + sa + "/note-export").contentType(MediaType.APPLICATION_JSON)
                .content(EXPORT_BODY)).andExpect(status().isUnauthorized());
        org.junit.jupiter.api.Assumptions.assumeTrue(fonts.find().isPresent(), "서버 한글 글꼴 없음 → 503 EXPORT_FONT_UNAVAILABLE");

        var response = mvc.perform(asStudent(post(S + "/school-assessments/" + sa + "/note-export"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(EXPORT_BODY))
                .andExpect(status().isOk()).andReturn().getResponse();
        assertThat(response.getContentType()).isEqualTo("application/pdf");
        assertThat(response.getHeader("Content-Disposition")).contains("filename*=UTF-8''")
                .contains(java.net.URLEncoder.encode("나의 20세기 역사 탐구_탐구노트_", StandardCharsets.UTF_8).replace("+", "%20"));
        byte[] bytes = response.getContentAsByteArray();
        try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.Loader.loadPDF(bytes)) {
            String text = new org.apache.pdfbox.text.PDFTextStripper().getText(doc);
            assertThat(text).contains("나의 20세기: 역사 탐구", "과목: 한국사2", "진행 상태: 진행 중", "평가일: 미정", "v2",
                    "조사 배경 (Background)", "냉전 1945~1991 & <특수> · 『인용』", "[PDF 첨부] 자료.pdf", "지도.png · 이미지").doesNotContain("첫 저장");
            assertThat(doc.getPage(0).getResources().getXObjectNames()).isNotEmpty();
        }

        mvc.perform(asStudent(delete(S + "/school-assessments/" + sa), "stu_001")).andExpect(status().isNoContent());
        mvc.perform(asStudent(post(S + "/school-assessments/" + sa + "/note-export"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                .content(EXPORT_BODY)).andExpect(status().isNotFound());
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
