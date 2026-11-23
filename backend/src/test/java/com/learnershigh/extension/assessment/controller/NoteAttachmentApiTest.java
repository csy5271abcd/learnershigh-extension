package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.integration.storage.LocalFileArtifactStorage;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
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
 * A28-41 §26-1 탐구 노트 첨부 실제 저장: 형식(확장자+서명)·바이트 보존(SHA)·노트 연결 검사·피드백 Snapshot 보존·
 * 관리자 담당 범위·학생 화면 보기·다른 학생/지점/비인증 거절·Storage 재생성(서버 재시작 흉내) 뒤 재조회.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class NoteAttachmentApiTest {

    static final String S = "/api/student/assessment";
    static final String A = "/api/admin/assessment";
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 'I', 'H', 'D', 'R', 1, 2, 3};
    static final byte[] PNG_V2 = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 9, 9, 9, 9};
    static final byte[] PDF = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF".getBytes(StandardCharsets.US_ASCII);
    static final byte[] ZIP = {'P', 'K', 3, 4, 20, 0, 0, 0, 8, 0, 1, 2, 3, 4};
    static final byte[] OLE = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1, 0, 1};

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Value("${assessment.storage.root}")
    String storageRoot;

    /** 이 시험이 만든 수행평가 — 같은 DB 를 쓰는 다른 시험(예: SchoolAssessmentApiTest 의 전체 삭제)이 외래 키에 막히지 않게 지운다 */
    final java.util.List<String> createdAssessments = new java.util.ArrayList<>();

    @org.junit.jupiter.api.AfterEach
    void cleanUp() {
        for (String sa : createdAssessments) {
            jdbc.update("delete from assessment_feedback_reply where request_id in (select id from assessment_feedback_request where source_id = ?)", sa);
            jdbc.update("delete from assessment_feedback_snapshot where request_id in (select id from assessment_feedback_request where source_id = ?)", sa);
            jdbc.update("delete from assessment_feedback_request where source_id = ?", sa);
            jdbc.update("delete from assessment_note_revision where note_id in (select id from assessment_note where source_id = ?)", sa);
            jdbc.update("delete from assessment_note where source_id = ?", sa);
            jdbc.update("delete from assessment_school_assessment_status_event where assessment_id = ?", sa);
            jdbc.update("delete from assessment_school_assessment where id = ?", sa);
        }
        createdAssessments.clear();
    }

    String assessment(String studentId, String title) throws Exception {
        String response = mvc.perform(asStudent(post(S + "/school-assessments"), studentId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"%s\",\"subjectId\":\"subj_11\",\"academicYear\":2026,\"semester\":1}".formatted(title)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(response, "$.assessmentId");
        createdAssessments.add(id);
        return id;
    }

    String attach(String studentId, String name, byte[] bytes, String expectedType) throws Exception {
        String body = mvc.perform(asStudent(multipart(S + "/note-attachments")
                        .file(new MockMultipartFile("file", name, "application/octet-stream", bytes)), studentId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value(expectedType))
                .andExpect(jsonPath("$.sizeBytes").value(bytes.length))
                .andExpect(jsonPath("$.sha256").value(sha(bytes)))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("storage").doesNotContain(storageRoot);
        return JsonPath.read(body, "$.attachmentId");
    }

    static String imageNote(String sa, String attachmentId, String name, int size) {
        return """
                {"sourceType":"SCHOOL_ASSESSMENT","sourceId":"%s","title":"탐구 노트",
                 "blocks":[{"blockId":"b1","type":"PARAGRAPH","text":"실험 사진"},
                           {"blockId":"b2","type":"IMAGE","text":"","attrs":{"file":{"name":"%s","size":%d,"mimeType":"image/png","attachmentId":"%s"}}}]}"""
                .formatted(sa, name, size, attachmentId);
    }

    static String sha(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    @Test
    void 이미지_PDF_HWPX_DOCX_PPTX_HWP는_저장되고_원본바이트가_같으며_미리보기는_이미지_PDF만() throws Exception {
        String png = attach("stu_001", "../../실험 사진.png", PNG, "image/png");
        String pdf = attach("stu_001", "보고서.pdf", PDF, "application/pdf");
        String hwpx = attach("stu_001", "탐구계획.hwpx", ZIP, "application/hwp+zip");
        String docx = attach("stu_001", "정리.docx", ZIP, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        String pptx = attach("stu_001", "발표.pptx", ZIP, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        String hwp = attach("stu_001", "옛 보고서.hwp", OLE, "application/x-hwp");

        byte[] downloaded = mvc.perform(asStudent(get(S + "/note-attachments/" + png + "/file"), "stu_001"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment")))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(downloaded).isEqualTo(PNG);
        assertThat(jdbc.queryForObject("select file_name from assessment_note_attachment where id = ?", String.class, png))
                .isEqualTo("실험 사진.png");
        mvc.perform(asStudent(get(S + "/note-attachments/" + png + "/preview"), "stu_001"))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "image/png"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("inline")));
        mvc.perform(asStudent(get(S + "/note-attachments/" + pdf + "/preview"), "stu_001"))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "application/pdf"));
        for (String notPreviewable : new String[] {hwpx, docx, pptx, hwp}) {
            mvc.perform(asStudent(get(S + "/note-attachments/" + notPreviewable + "/preview"), "stu_001"))
                    .andExpect(status().isUnsupportedMediaType())
                    .andExpect(jsonPath("$.code").value("PREVIEW_UNAVAILABLE"));
            mvc.perform(asStudent(get(S + "/note-attachments/" + notPreviewable + "/file"), "stu_001"))
                    .andExpect(status().isOk());
        }

        // Backend 재시작 흉내: 같은 Root 로 Storage 를 새로 만들어 저장 키로 다시 읽는다(브라우저·프로세스 메모리가 아닌 디스크 보관)
        String key = jdbc.queryForObject("select storage_key from assessment_note_attachment where id = ?", String.class, png);
        try (InputStream in = new LocalFileArtifactStorage(storageRoot).open(key)) {
            assertThat(in.readAllBytes()).isEqualTo(PNG);
        }
    }

    @Test
    void 형식이_다르거나_빈_파일이나_SVG는_저장하지_않는다() throws Exception {
        long before = jdbc.queryForObject("select count(*) from assessment_note_attachment", Long.class);
        mvc.perform(asStudent(multipart(S + "/note-attachments").file(new MockMultipartFile("file", "가짜.pdf", "application/pdf", "hello".getBytes(StandardCharsets.UTF_8))), "stu_001"))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asStudent(multipart(S + "/note-attachments").file(new MockMultipartFile("file", "그림.svg", "image/svg+xml", "<svg onload=alert(1)/>".getBytes(StandardCharsets.UTF_8))), "stu_001"))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asStudent(multipart(S + "/note-attachments").file(new MockMultipartFile("file", "png인척.png", "image/png", PDF)), "stu_001"))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asStudent(multipart(S + "/note-attachments").file(new MockMultipartFile("file", "빈.png", "image/png", new byte[0])), "stu_001"))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart(S + "/note-attachments").file(new MockMultipartFile("file", "a.png", "image/png", PNG)))
                .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("select count(*) from assessment_note_attachment", Long.class)).isEqualTo(before);
    }

    @Test
    void 피드백_요청_뒤_학생이_파일을_바꿔도_요청_당시_파일은_관리자가_그대로_열고_범위밖은_404() throws Exception {
        String sa = assessment("stu_001", "첨부 보존 시험");
        String first = attach("stu_001", "실험 1.png", PNG, "image/png");
        String created = mvc.perform(asStudent(post(S + "/notes"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content(imageNote(sa, first, "실험 1.png", PNG.length)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String noteId = JsonPath.read(created, "$.noteId");
        String r1 = JsonPath.read(created, "$.revisionId");
        String request = mvc.perform(asStudent(post(S + "/feedback-requests"), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"SCHOOL_ASSESSMENT\",\"sourceId\":\"" + sa + "\",\"noteRevisionId\":\"" + r1 + "\",\"artifactVersionIds\":[]}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String requestId = JsonPath.read(request, "$.requestId");

        // 학생이 사진을 바꿔 r2 저장 → 새 첨부. 이전 첨부(r1)는 그대로
        String second = attach("stu_001", "실험 2.png", PNG_V2, "image/png");
        mvc.perform(asStudent(put(S + "/notes/" + noteId), "stu_001").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expectedRevisionId\":\"" + r1 + "\"," + imageNote(sa, second, "실험 2.png", PNG_V2.length).substring(imageNote(sa, second, "실험 2.png", PNG_V2.length).indexOf("\"title\""))))
                .andExpect(status().isOk());

        mvc.perform(asAdmin(get(A + "/feedback-requests/" + requestId), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.snapshotRevision.revisionId").value(r1))
                .andExpect(jsonPath("$.snapshotRevision.blocks[1].attrs.file.attachmentId").value(first));
        byte[] adminBytes = mvc.perform(asAdmin(get(A + "/note-attachments/" + first + "/file"), "adm_gangnam"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(sha(adminBytes)).isEqualTo(sha(PNG));
        mvc.perform(asAdmin(get(A + "/note-attachments/" + first + "/preview"), "adm_gangnam")).andExpect(status().isOk());
        mvc.perform(asAdmin(get(A + "/note-attachments/" + second + "/file"), "adm_gangnam")).andExpect(status().isOk());
        // 학생 화면 보기(읽기 전용) 경로
        mvc.perform(asAdmin(get(A + "/students/stu_001/student-view/note-attachments/" + first + "/preview"), "adm_gangnam"))
                .andExpect(status().isOk());

        // 다른 지점 관리자·다른 학생·학생 화면 보기의 다른 학생 경로·비인증 → 열 수 없다
        mvc.perform(asAdmin(get(A + "/note-attachments/" + first + "/file"), "adm_bundang"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOTE_ATTACHMENT_NOT_FOUND"));
        mvc.perform(asAdmin(get(A + "/students/stu_001/student-view/note-attachments/" + first + "/file"), "adm_bundang"))
                .andExpect(status().isNotFound());
        mvc.perform(asStudent(get(S + "/note-attachments/" + first + "/file"), "stu_002"))
                .andExpect(status().isNotFound());
        mvc.perform(get(A + "/note-attachments/" + first + "/file")).andExpect(status().isUnauthorized());
        mvc.perform(asAdmin(get(A + "/note-attachments/noteatt_00000000-0000-0000-0000-000000000000/file"), "adm_gangnam"))
                .andExpect(status().isNotFound());
        // 관리자는 업로드할 수 없다(학생 경로는 학생 인증만)
        mvc.perform(asAdmin(multipart(S + "/note-attachments").file(new MockMultipartFile("file", "a.png", "image/png", PNG)), "adm_gangnam"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 노트에는_본인이_올린_첨부만_연결할_수_있다() throws Exception {
        String sa = assessment("stu_002", "남의 첨부 연결 시험");
        String others = attach("stu_001", "남의 사진.png", PNG, "image/png");
        mvc.perform(asStudent(post(S + "/notes"), "stu_002").contentType(MediaType.APPLICATION_JSON)
                        .content(imageNote(sa, others, "남의 사진.png", PNG.length)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("blocks[1].attrs.file.attachmentId"));
        mvc.perform(asStudent(post(S + "/notes"), "stu_002").contentType(MediaType.APPLICATION_JSON)
                        .content(imageNote(sa, "noteatt_없음", "없음.png", 1)))
                .andExpect(status().isBadRequest());
        // attachmentId 없는 이전 블록(이름·크기만)은 그대로 저장된다(기존 노트 호환)
        String mine = assessment("stu_002", "이전 블록 호환");
        mvc.perform(asStudent(post(S + "/notes"), "stu_002").contentType(MediaType.APPLICATION_JSON)
                        .content(imageNote(mine, "x", "이전.png", 10).replace(",\"attachmentId\":\"x\"", "")))
                .andExpect(status().isCreated());
    }
}
