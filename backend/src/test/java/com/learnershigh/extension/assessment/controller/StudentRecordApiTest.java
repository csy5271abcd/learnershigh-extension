package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
 * 학생 기록 실데이터 흐름 (V202611110506 Migration + §20·21·24·25·26·31·32·35·36·44·45).
 * 빈 Testcontainers MySQL에 전체 Migration을 적용한 상태에서 실행한다.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentRecordApiTest {

    static final Path STORAGE = createStorage();

    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry registry) {
        registry.add("assessment.storage.root", STORAGE::toString);
        registry.add("assessment.storage.max-file-bytes", () -> "2048");
    }

    static Path createStorage() {
        try {
            return Files.createTempDirectory("lh-artifact-test-");
        } catch (Exception failure) {
            throw new IllegalStateException(failure);
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    static final byte[] PDF_V1 = "%PDF-1.7\nfirst version".getBytes(StandardCharsets.US_ASCII);
    static final byte[] PDF_V2 = "%PDF-1.7\nsecond version".getBytes(StandardCharsets.US_ASCII);

    String assessment(String studentId, String title) throws Exception {
        String body = """
                {"title":"%s","subjectId":"subj_11","academicYear":2026,"semester":1}""".formatted(title);
        String response = mvc.perform(asStudent(post("/api/student/assessment/school-assessments"), studentId)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.assessmentId");
    }

    static String noteBody(String sourceId, String text) {
        return """
                {"sourceType":"SCHOOL_ASSESSMENT","sourceId":"%s","title":"탐구 과정",
                 "blocks":[{"blockId":"b1","type":"HEADING","text":"조사 내용"},
                           {"blockId":"b2","type":"CHECKLIST","text":"%s","attrs":{"checked":true}}]}""".formatted(sourceId, text);
    }

    @Test
    void Migration이_빈_Schema에_학생기록_테이블을_만든다() {
        List<String> tables = jdbc.queryForList("select table_name from information_schema.tables where table_schema = database()"
                + " and table_name like 'assessment_%'", String.class);
        assertThat(tables).contains("assessment_note", "assessment_note_revision", "assessment_artifact",
                "assessment_artifact_version", "assessment_feedback_request", "assessment_feedback_snapshot",
                "assessment_feedback_reply", "assessment_growth_record", "assessment_resource", "assessment_favorite");
    }

    @Test
    void 노트_r1_r2_저장_과거_Revision_불변_충돌_409_다른학생_404() throws Exception {
        String sa = assessment("stu_001", "노트 시험");
        String created = mvc.perform(asStudent(post("/api/student/assessment/notes"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(noteBody(sa, "첫 번째")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.revisionNumber").value(1))
                .andReturn().getResponse().getContentAsString();
        String noteId = JsonPath.read(created, "$.noteId");
        String r1 = JsonPath.read(created, "$.revisionId");

        // 같은 수행평가에 노트를 또 만들면 409 (재시도·두 탭)
        mvc.perform(asStudent(post("/api/student/assessment/notes"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(noteBody(sa, "중복")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RESOURCE_VERSION_CONFLICT"));

        String update = """
                {"expectedRevisionId":"%s","title":"탐구 과정 수정","blocks":[{"blockId":"b1","type":"PARAGRAPH","text":"두 번째"}]}""";
        String saved = mvc.perform(asStudent(put("/api/student/assessment/notes/" + noteId), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(update.formatted(r1)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revisionNumber").value(2))
                .andReturn().getResponse().getContentAsString();
        String r2 = JsonPath.read(saved, "$.revisionId");

        // 오래된 expectedRevisionId → 409, 새 Revision 없음
        mvc.perform(asStudent(put("/api/student/assessment/notes/" + noteId), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(update.formatted(r1)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RESOURCE_VERSION_CONFLICT"));

        mvc.perform(asStudent(get("/api/student/assessment/notes/" + noteId + "/revisions"), "stu_001"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(2));
        mvc.perform(asStudent(get("/api/student/assessment/notes/" + noteId + "/revisions/" + r1), "stu_001"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("탐구 과정"))
                .andExpect(jsonPath("$.blocks[1].text").value("첫 번째"))
                .andExpect(jsonPath("$.blocks[1].attrs.checked").value(true));
        mvc.perform(asStudent(get("/api/student/assessment/notes").param("sourceType", "SCHOOL_ASSESSMENT")
                        .param("sourceId", sa), "stu_001"))
                .andExpect(jsonPath("$.items[0].revisionId").value(r2))
                .andExpect(jsonPath("$.items[0].blocks[0].text").value("두 번째"));

        // 다른 학생: 수행평가·노트 모두 404
        mvc.perform(asStudent(get("/api/student/assessment/notes").param("sourceType", "SCHOOL_ASSESSMENT")
                        .param("sourceId", sa), "stu_002"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("ASSESSMENT_NOT_FOUND"));
        mvc.perform(asStudent(get("/api/student/assessment/notes/" + noteId + "/revisions/" + r1), "stu_002"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOTE_NOT_FOUND"));

        // 블록 형식 검증
        mvc.perform(asStudent(put("/api/student/assessment/notes/" + noteId), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expectedRevisionId\":\"" + r2 + "\",\"title\":\"t\",\"blocks\":[{\"type\":\"P\",\"text\":\"x\"}]}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void 결과물_v1_v2_다운로드_형식거절_크기제한_권한() throws Exception {
        String sa = assessment("stu_001", "결과물 시험");
        String artifact = mvc.perform(asStudent(post("/api/student/assessment/artifacts"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + sa + "\",\"title\":\"탐구 보고서\",\"kind\":null}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String artifactId = JsonPath.read(artifact, "$.artifactId");
        String v1 = upload(artifactId, "보고서_v1.pdf", PDF_V1, 201);
        String v2 = upload(artifactId, "보고서_v2.pdf", PDF_V2, 201);

        mvc.perform(asStudent(get("/api/student/assessment/artifacts/" + artifactId + "/versions"), "stu_001"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].versionNumber").value(1))
                .andExpect(jsonPath("$.items[1].versionNumber").value(2))
                .andExpect(jsonPath("$.items[0].file.contentType").value("application/pdf"));
        byte[] downloaded = mvc.perform(asStudent(get("/api/student/assessment/artifacts/" + artifactId + "/versions/" + v1 + "/file"), "stu_001")
                        .accept(MediaType.ALL))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(downloaded).isEqualTo(PDF_V1);
        assertThat(jdbc.queryForObject("select sha256 from assessment_artifact_version where id = ?", String.class, v2))
                .hasSize(64);

        // 확장자만 PDF인 글자 파일 → 415, 버전 번호 증가 없음, 파일 남지 않음
        long filesBefore = countFiles();
        upload(artifactId, "fake.pdf", "hello".getBytes(StandardCharsets.UTF_8), 415);
        upload(artifactId, "big.pdf", ("%PDF-" + "x".repeat(3000)).getBytes(StandardCharsets.US_ASCII), 413);
        assertThat(countFiles()).isEqualTo(filesBefore);
        assertThat(jdbc.queryForObject("select latest_version_number from assessment_artifact where id = ?", Integer.class, artifactId))
                .isEqualTo(2);

        // 다른 학생 404, 담당 관리자(강남) 읽기 가능, 다른 지점 관리자 404
        mvc.perform(asStudent(get("/api/student/assessment/artifacts/" + artifactId + "/versions/" + v1 + "/file"), "stu_002")
                        .accept(MediaType.ALL))
                .andExpect(status().isNotFound());
        byte[] adminCopy = mvc.perform(asAdmin(get("/api/admin/assessment/artifacts/" + artifactId + "/versions/" + v2 + "/file"), "adm_gangnam")
                        .accept(MediaType.ALL))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(adminCopy).isEqualTo(PDF_V2);
        mvc.perform(asAdmin(get("/api/admin/assessment/artifacts/" + artifactId + "/versions"), "adm_bundang"))
                .andExpect(status().isNotFound());
    }

    @Test
    void 피드백_요청_Snapshot_불변_초안_비공개_전달_후_학생_조회_재전달_409() throws Exception {
        String sa = assessment("stu_001", "피드백 시험");
        String created = mvc.perform(asStudent(post("/api/student/assessment/notes"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(noteBody(sa, "요청 당시")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String noteId = JsonPath.read(created, "$.noteId");
        String r1 = JsonPath.read(created, "$.revisionId");
        String artifact = mvc.perform(asStudent(post("/api/student/assessment/artifacts"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + sa + "\",\"title\":\"발표자료\",\"kind\":null}"))
                .andReturn().getResponse().getContentAsString();
        String artifactId = JsonPath.read(artifact, "$.artifactId");
        String v1 = upload(artifactId, "발표.pdf", PDF_V1, 201);

        String body = "{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + sa + "\",\"noteRevisionId\":\"" + r1
                + "\",\"artifactVersionIds\":[\"" + v1 + "\"]}";
        String request = mvc.perform(asStudent(post("/api/student/assessment/feedback-requests"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.snapshot.locked").value(true))
                .andReturn().getResponse().getContentAsString();
        String requestId = JsonPath.read(request, "$.requestId");
        // 같은 Snapshot 재요청 → 같은 요청
        String again = mvc.perform(asStudent(post("/api/student/assessment/feedback-requests"), "stu_001")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString();
        assertThat((String) JsonPath.read(again, "$.requestId")).isEqualTo(requestId);
        assertThat(jdbc.queryForObject("select count(*) from assessment_feedback_request where source_id = ?", Long.class, sa)).isEqualTo(1);
        // 다른 학생 리비전으로 요청 불가
        mvc.perform(asStudent(post("/api/student/assessment/feedback-requests"), "stu_002")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());

        // 요청 후 학생이 노트 r2·결과물 v2 추가 → Snapshot은 r1·v1 그대로
        mvc.perform(asStudent(put("/api/student/assessment/notes/" + noteId), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expectedRevisionId\":\"" + r1 + "\",\"title\":\"수정\",\"blocks\":[]}"))
                .andExpect(status().isOk());
        upload(artifactId, "발표_v2.pdf", PDF_V2, 201);
        mvc.perform(asAdmin(get("/api/admin/assessment/feedback-requests/" + requestId), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.snapshotRevision.revisionId").value(r1))
                .andExpect(jsonPath("$.snapshotRevision.blocks[1].text").value("요청 당시"))
                .andExpect(jsonPath("$.latestRevisionNumber").value(2))
                .andExpect(jsonPath("$.snapshotVersions.length()").value(1))
                .andExpect(jsonPath("$.snapshotVersions[0].versionId").value(v1))
                .andExpect(jsonPath("$.student.displayName").value("김서준"));
        mvc.perform(asAdmin(get("/api/admin/assessment/feedback-requests").param("status", "PENDING"), "adm_bundang"))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(asAdmin(get("/api/admin/assessment/feedback-requests/" + requestId), "adm_bundang"))
                .andExpect(status().isNotFound());

        // 초안: 요청 PENDING 유지, 학생에게 안 보임
        String draft = """
                {"overallComment":"근거를 더 연결해 주세요.","comments":[
                  {"targetType":"PDF","artifactVersionId":"%s","location":{"type":"PDF_PAGE","pageNumber":1},"text":"출처 추가"},
                  {"targetType":"NOTE","noteRevisionId":"%s","location":{"type":"NOTE_BLOCK","blockId":"b2"},"text":"구체화"}],
                 "recommendations":[]}""".formatted(v1, r1);
        mvc.perform(asAdmin(put("/api/admin/assessment/feedback-requests/" + requestId + "/reply-draft"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content(draft))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DRAFT_SAVED"));
        mvc.perform(asStudent(get("/api/student/assessment/feedback-requests/" + requestId + "/reply"), "stu_001"))
                .andExpect(jsonPath("$.status").value("PENDING")).andExpect(jsonPath("$.reply").doesNotExist());

        // Snapshot 밖 버전을 가리키는 코멘트 → 400
        String bad = draft.replace(v1, "version_not_in_snapshot");
        mvc.perform(asAdmin(post("/api/admin/assessment/feedback-requests/" + requestId + "/deliver"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content(bad))
                .andExpect(status().isBadRequest());

        mvc.perform(asAdmin(post("/api/admin/assessment/feedback-requests/" + requestId + "/deliver"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content(draft))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DELIVERED"));
        mvc.perform(asStudent(get("/api/student/assessment/feedback-requests/" + requestId + "/reply"), "stu_001"))
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                .andExpect(jsonPath("$.reply.overallComment").value("근거를 더 연결해 주세요."))
                .andExpect(jsonPath("$.reply.comments.length()").value(2));
        mvc.perform(asAdmin(post("/api/admin/assessment/feedback-requests/" + requestId + "/deliver"), "adm_gangnam")
                        .contentType(MediaType.APPLICATION_JSON).content(draft))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("FEEDBACK_ALREADY_DELIVERED"));
        // 전달은 수행평가 상태를 바꾸지 않는다
        mvc.perform(asStudent(get("/api/student/assessment/school-assessments/" + sa), "stu_001"))
                .andExpect(jsonPath("$.status").value("BEFORE_START"));
        // DB: Snapshot 행은 그대로 1개
        assertThat(jdbc.queryForObject("select count(*) from assessment_feedback_snapshot where request_id = ?", Long.class, requestId))
                .isEqualTo(1);
    }

    String upload(String artifactId, String name, byte[] bytes, int expectedStatus) throws Exception {
        String response = mvc.perform(asStudent(multipart("/api/student/assessment/artifacts/" + artifactId + "/versions")
                                .file(new MockMultipartFile("file", name, "application/octet-stream", bytes)), "stu_001"))
                .andExpect(status().is(expectedStatus)).andReturn().getResponse().getContentAsString();
        return expectedStatus == 201 ? JsonPath.read(response, "$.versionId") : null;
    }

    static long countFiles() throws Exception {
        try (var stream = Files.walk(STORAGE)) {
            return stream.filter(Files::isRegularFile).count();
        }
    }
}
