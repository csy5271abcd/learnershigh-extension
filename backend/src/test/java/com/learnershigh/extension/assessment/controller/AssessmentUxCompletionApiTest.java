package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 2026-11-11 UX 완성분: 관리자 학생 화면 보기(읽기 전용 API), 결과물 미리보기·버전 비교, 휴지통·복원(Snapshot 보존).
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class AssessmentUxCompletionApiTest {

    static final Path STORAGE = StudentRecordApiTest.createStorage();
    static final String S = "/api/student/assessment";
    static final byte[] PDF_V1 = "%PDF-1.7\nfirst version".getBytes(StandardCharsets.US_ASCII);
    static final byte[] PDF_V2 = "%PDF-1.7\nsecond, longer version".getBytes(StandardCharsets.US_ASCII);
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 'I', 'H', 'D', 'R'};
    static final byte[] DOCX = {'P', 'K', 3, 4, 20, 0, 0, 0, 8, 0};

    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry registry) {
        registry.add("assessment.storage.root", STORAGE::toString);
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    String assessment(String title) throws Exception {
        String response = mvc.perform(asStudent(post(S + "/school-assessments"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"%s\",\"subjectId\":\"subj_11\",\"academicYear\":2026,\"semester\":1}".formatted(title)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.assessmentId");
    }

    String artifact(String sa, String title) throws Exception {
        String response = mvc.perform(asStudent(post(S + "/artifacts"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + sa + "\",\"title\":\"" + title + "\",\"kind\":null}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.artifactId");
    }

    String upload(String artifactId, String name, byte[] bytes) throws Exception {
        String response = mvc.perform(asStudent(multipart(S + "/artifacts/" + artifactId + "/versions")
                        .file(new MockMultipartFile("file", name, "application/octet-stream", bytes)), "stu_001"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.versionId");
    }

    String note(String sa, String text) throws Exception {
        String created = mvc.perform(asStudent(post(S + "/notes"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content(StudentRecordApiTest.noteBody(sa, text)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(created, "$.revisionId");
    }

    @Test
    void 관리자_학생_화면_보기는_같은_데이터를_읽기만_하고_다른_지점은_404() throws Exception {
        String sa = assessment("학생 화면 보기 시험");
        String r1 = note(sa, "학생이 쓴 노트");
        String artifactId = artifact(sa, "보고서");
        String v1 = upload(artifactId, "보고서.pdf", PDF_V1);
        String view = "/api/admin/assessment/students/stu_001/student-view";

        String student = mvc.perform(asStudent(get(S + "/school-assessments").param("academicYear", "2026").param("semester", "1"), "stu_001"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String admin = mvc.perform(asAdmin(get(view + "/school-assessments").param("academicYear", "2026").param("semester", "1"), "adm_gangnam"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(admin).isEqualTo(student);
        mvc.perform(asAdmin(get(view + "/notes").param("sourceType", "SCHOOL_ASSESSMENT").param("sourceId", sa), "adm_gangnam"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].revisionId").value(r1))
                .andExpect(jsonPath("$.items[0].blocks[1].text").value("학생이 쓴 노트"));
        mvc.perform(asAdmin(get(view + "/artifacts/" + artifactId + "/versions"), "adm_gangnam"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].versionId").value(v1));
        mvc.perform(asAdmin(get(view + "/artifacts/" + artifactId + "/versions/" + v1 + "/preview"), "adm_gangnam"))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "application/pdf"));
        mvc.perform(asAdmin(get(view + "/archive").param("tab", "recent"), "adm_gangnam")).andExpect(status().isOk());

        // 다른 지점 관리자 404, 학생 Header로는 관리자 경로 401/403(관리자 인증 없음), 쓰기 메서드는 경로 자체가 없다
        mvc.perform(asAdmin(get(view + "/school-assessments").param("academicYear", "2026").param("semester", "1"), "adm_bundang"))
                .andExpect(status().isNotFound());
        int asStudentHeader = mvc.perform(asStudent(get(view + "/school-assessments").param("academicYear", "2026").param("semester", "1"), "stu_001"))
                .andReturn().getResponse().getStatus();
        assertThat(asStudentHeader).isIn(401, 403);
        int write = mvc.perform(asAdmin(post(view + "/school-assessments"), "adm_gangnam").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"x\",\"subjectId\":\"subj_11\",\"academicYear\":2026,\"semester\":1}"))
                .andReturn().getResponse().getStatus();
        assertThat(write).isIn(404, 405);
        assertThat(jdbc.queryForObject("select count(*) from assessment_school_assessment where title = 'x'", Long.class)).isZero();
    }

    @Test
    void 미리보기는_PDF_이미지만_inline_보안헤더_무결성_확인_비교는_메타데이터만() throws Exception {
        String sa = assessment("미리보기 시험");
        String artifactId = artifact(sa, "보고서");
        String v1 = upload(artifactId, "보고서_v1.pdf", PDF_V1);
        String v2 = upload(artifactId, "보고서_v2.pdf", PDF_V2);
        byte[] body = mvc.perform(asStudent(get(S + "/artifacts/" + artifactId + "/versions/" + v1 + "/preview"), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("inline")))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(body).isEqualTo(PDF_V1);

        String imageId = artifact(sa, "사진");
        String png = upload(imageId, "사진.png", PNG);
        mvc.perform(asStudent(get(S + "/artifacts/" + imageId + "/versions/" + png + "/preview"), "stu_001"))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "image/png"));
        String docId = artifact(sa, "문서");
        String docx = upload(docId, "문서.docx", DOCX);
        mvc.perform(asStudent(get(S + "/artifacts/" + docId + "/versions/" + docx + "/preview"), "stu_001"))
                .andExpect(status().isUnsupportedMediaType()).andExpect(jsonPath("$.code").value("PREVIEW_UNAVAILABLE"));

        // 권한: 다른 학생 404, 다른 지점 관리자 404, 담당 관리자 OK
        mvc.perform(asStudent(get(S + "/artifacts/" + artifactId + "/versions/" + v1 + "/preview"), "stu_002"))
                .andExpect(status().isNotFound());
        mvc.perform(asAdmin(get("/api/admin/assessment/artifacts/" + artifactId + "/versions/" + v1 + "/preview"), "adm_bundang"))
                .andExpect(status().isNotFound());
        mvc.perform(asAdmin(get("/api/admin/assessment/artifacts/" + artifactId + "/versions/" + v2 + "/preview"), "adm_gangnam"))
                .andExpect(status().isOk());

        // 비교: 같은 결과물 두 버전, METADATA_ONLY, 실제 다른 항목만
        mvc.perform(asStudent(get(S + "/artifacts/" + artifactId + "/compare").param("fromVersionId", v1).param("toVersionId", v2), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comparison.mode").value("METADATA_ONLY"))
                .andExpect(jsonPath("$.versions[0].versionId").value(v1))
                .andExpect(jsonPath("$.versions[1].versionId").value(v2))
                .andExpect(jsonPath("$.versions[0].previewSupported").value(true))
                .andExpect(jsonPath("$.comparison.changes[?(@.field == 'fileName')].to").value("보고서_v2.pdf"))
                .andExpect(jsonPath("$.comparison.changes[?(@.field == 'sha256')]").isNotEmpty())
                .andExpect(jsonPath("$.comparison.changes[?(@.field == 'contentType')]").isEmpty());
        mvc.perform(asStudent(get(S + "/artifacts/" + artifactId + "/compare").param("fromVersionId", v1).param("toVersionId", png), "stu_001"))
                .andExpect(status().isNotFound());
        mvc.perform(asStudent(get(S + "/artifacts/" + artifactId + "/compare").param("fromVersionId", v1).param("toVersionId", v1), "stu_001"))
                .andExpect(status().isBadRequest());

        // 저장 파일이 바뀌면(무결성) 미리보기 거절, 원본 v2는 그대로
        String key = jdbc.queryForObject("select storage_key from assessment_artifact_version where id = ?", String.class, v1);
        try (var files = Files.walk(STORAGE)) {
            Path stored = files.filter(p -> p.getFileName().toString().startsWith(key)).findFirst().orElseThrow();
            Files.write(stored, "%PDF-1.7\ntampered!!!!!".getBytes(StandardCharsets.US_ASCII));
        }
        mvc.perform(asStudent(get(S + "/artifacts/" + artifactId + "/versions/" + v1 + "/preview"), "stu_001"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("FILE_INTEGRITY_FAILED"));
        mvc.perform(asStudent(get(S + "/artifacts/" + artifactId + "/versions/" + v2 + "/preview"), "stu_001"))
                .andExpect(status().isOk());
    }

    @Test
    void 휴지통_이동과_복원은_ID_Revision_Version_파일과_피드백_Snapshot을_보존한다() throws Exception {
        String sa = assessment("휴지통 시험");
        String r1 = note(sa, "요청 당시 노트");
        String artifactId = artifact(sa, "발표자료");
        String v1 = upload(artifactId, "발표.pdf", PDF_V1);
        String request = mvc.perform(asStudent(post(S + "/feedback-requests"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + sa + "\",\"noteRevisionId\":\"" + r1
                                + "\",\"artifactVersionIds\":[\"" + v1 + "\"]}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String requestId = JsonPath.read(request, "$.requestId");
        long files = Files.walk(STORAGE).filter(Files::isRegularFile).count();

        // 결과물 휴지통 → 목록에서 빠짐, 휴지통 탭에 원래 소속과 함께, 새 버전·피드백 요청에 못 씀
        mvc.perform(asStudent(delete(S + "/artifacts/" + artifactId), "stu_001")).andExpect(status().isNoContent());
        mvc.perform(asStudent(delete(S + "/artifacts/" + artifactId), "stu_001")).andExpect(status().isNotFound());
        mvc.perform(asStudent(get(S + "/artifacts").param("sourceType", "SCHOOL_ASSESSMENT").param("sourceId", sa), "stu_001"))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(asStudent(get(S + "/archive").param("tab", "trash"), "stu_001"))
                .andExpect(jsonPath("$.items[0].sourceType").value("ARTIFACT"))
                .andExpect(jsonPath("$.items[0].sourceId").value(artifactId))
                .andExpect(jsonPath("$.items[0].origin").value("수행평가 '휴지통 시험'의 결과물"))
                .andExpect(jsonPath("$.items[0].deletedAt").isNotEmpty());
        // 관리자: 요청 당시 Snapshot과 파일은 그대로 열린다(감사 기록)
        mvc.perform(asAdmin(get("/api/admin/assessment/feedback-requests/" + requestId), "adm_gangnam"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.snapshotVersions[0].versionId").value(v1))
                .andExpect(jsonPath("$.snapshotRevision.revisionId").value(r1));
        byte[] adminFile = mvc.perform(asAdmin(get("/api/admin/assessment/artifacts/" + artifactId + "/versions/" + v1 + "/file"), "adm_gangnam"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(adminFile).isEqualTo(PDF_V1);
        // 다른 학생은 남의 항목을 복원할 수 없다
        mvc.perform(asStudent(post(S + "/archive/restore"), "stu_002").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"ARTIFACT\",\"sourceId\":\"" + artifactId + "\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(asStudent(post(S + "/archive/restore"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"ARTIFACT\",\"sourceId\":\"" + artifactId + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.sourceId").value(artifactId));
        mvc.perform(asStudent(get(S + "/artifacts/" + artifactId + "/versions"), "stu_001"))
                .andExpect(jsonPath("$.items[0].versionId").value(v1));

        // 수행평가 휴지통 → 목록·노트 접근에서 빠지고, 결과물만 먼저 복원할 수 없다. 복원하면 Revision 그대로
        mvc.perform(asStudent(delete(S + "/school-assessments/" + sa), "stu_001")).andExpect(status().isNoContent());
        String afterTrash = mvc.perform(asStudent(get(S + "/school-assessments").param("academicYear", "2026").param("semester", "1"), "stu_001"))
                .andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(afterTrash, "$.items[*].assessmentId")).doesNotContain(sa);
        mvc.perform(asStudent(get(S + "/notes").param("sourceType", "SCHOOL_ASSESSMENT").param("sourceId", sa), "stu_001"))
                .andExpect(status().isNotFound());
        mvc.perform(asStudent(delete(S + "/artifacts/" + artifactId), "stu_001")).andExpect(status().isNoContent());
        mvc.perform(asStudent(post(S + "/archive/restore"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"ARTIFACT\",\"sourceId\":\"" + artifactId + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details.fields[0].reason").value("parent_in_trash"));
        mvc.perform(asStudent(post(S + "/archive/restore"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + sa + "\"}"))
                .andExpect(status().isOk());
        mvc.perform(asStudent(get(S + "/notes").param("sourceType", "SCHOOL_ASSESSMENT").param("sourceId", sa), "stu_001"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].revisionId").value(r1));
        mvc.perform(asStudent(post(S + "/archive/restore"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"ARTIFACT\",\"sourceId\":\"" + artifactId + "\"}"))
                .andExpect(status().isOk());

        // 성장 기록·자료도 같은 규칙
        String growth = mvc.perform(asStudent(post(S + "/growth-records"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"실험 설계 경험\",\"activityStartDate\":\"2026-03-02\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String growthId = JsonPath.read(growth, "$.recordId");
        mvc.perform(asStudent(delete(S + "/growth-records/" + growthId), "stu_001")).andExpect(status().isNoContent());
        mvc.perform(asStudent(get(S + "/growth-records/" + growthId), "stu_001")).andExpect(status().isNotFound());
        String resource = mvc.perform(asStudent(post(S + "/resources"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"ARTICLE\",\"title\":\"기사 자료\",\"sourceUrl\":\"https://example.org/a\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String resourceId = JsonPath.read(resource, "$.resourceId");
        mvc.perform(asStudent(delete(S + "/resources/" + resourceId), "stu_002")).andExpect(status().isNotFound());
        mvc.perform(asStudent(delete(S + "/resources/" + resourceId), "stu_001")).andExpect(status().isNoContent());
        String trash = mvc.perform(asStudent(get(S + "/archive").param("tab", "trash"), "stu_001"))
                .andReturn().getResponse().getContentAsString();
        List<String> types = JsonPath.read(trash, "$.items[*].sourceType");
        assertThat(types).contains("GROWTH_RECORD", "RESOURCE").doesNotContain("ARTIFACT", "SCHOOL_ASSESSMENT");
        for (String[] item : new String[][] {{"GROWTH_RECORD", growthId}, {"RESOURCE", resourceId}}) {
            mvc.perform(asStudent(post(S + "/archive/restore"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"sourceType\":\"" + item[0] + "\",\"sourceId\":\"" + item[1] + "\"}"))
                    .andExpect(status().isOk());
        }
        mvc.perform(asStudent(get(S + "/growth-records/" + growthId), "stu_001"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("실험 설계 경험"));

        // 실제 파일·Snapshot 행은 한 번도 줄지 않았다
        assertThat(Files.walk(STORAGE).filter(Files::isRegularFile).count()).isEqualTo(files);
        assertThat(jdbc.queryForObject("select count(*) from assessment_feedback_snapshot where request_id = ?", Long.class, requestId))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from assessment_note_revision r join assessment_note n on n.id = r.note_id where n.source_id = ?", Long.class, sa)).isEqualTo(1);
    }

    @Test
    void 관리자_참고자료_휴지통은_만든_관리자만_공개자료도_학생목록에서_빠졌다_복원() throws Exception {
        String created = mvc.perform(asAdmin(post("/api/admin/assessment/reference-library"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"SITE\",\"title\":\"국가통계포털\",\"sourceUrl\":\"https://kosis.kr\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String scrapId = JsonPath.read(created, "$.scrapId");
        mvc.perform(asAdmin(put("/api/admin/assessment/reference-library/" + scrapId + "/visibility"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"published\":true}"))
                .andExpect(status().isOk());
        mvc.perform(asStudent(get(S + "/shared-resources"), "stu_001")).andExpect(jsonPath("$.items.length()").value(1));

        mvc.perform(asAdmin(delete("/api/admin/assessment/reference-library/" + scrapId), "adm_bundang")).andExpect(status().isNotFound());
        mvc.perform(asAdmin(delete("/api/admin/assessment/reference-library/" + scrapId), "adm_gangnam")).andExpect(status().isNoContent());
        mvc.perform(asStudent(get(S + "/shared-resources"), "stu_001")).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(asAdmin(get("/api/admin/assessment/reference-library"), "adm_gangnam")).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(asAdmin(get("/api/admin/assessment/reference-library/trash"), "adm_gangnam"))
                .andExpect(jsonPath("$.items[0].scrap.scrapId").value(scrapId))
                .andExpect(jsonPath("$.items[0].deletedAt").isNotEmpty());
        mvc.perform(asAdmin(post("/api/admin/assessment/reference-library/" + scrapId + "/restore"), "adm_gangnam"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.scrapId").value(scrapId));
        mvc.perform(asStudent(get(S + "/shared-resources"), "stu_001")).andExpect(jsonPath("$.items.length()").value(1));
    }
}
