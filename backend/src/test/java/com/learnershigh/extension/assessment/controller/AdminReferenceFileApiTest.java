package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A27-UX §43-1 DRAFT 관리자 참고자료실 파일 업로드(영상·사진·문서): 형식(확장자+서명)·저장·내려받기·미리보기·교체·연결 해제·권한.
 * 같은 Spring Context·DB를 쓰는 다른 시험(참고자료 휴지통 시험은 adm_gangnam)과 겹치지 않게 adm_bundang으로 만들고 끝에 휴지통으로 보낸다.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class AdminReferenceFileApiTest {

    static final String BASE = "/api/admin/assessment/reference-library";
    static final String ADMIN = "adm_bundang";
    /** ISO BMFF: 4~7바이트 'ftyp' + brand 'isom' */
    static final byte[] MP4 = {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm', 0, 0, 2, 0, 'i', 's', 'o', 'm', 'm', 'p', '4', '1'};
    static final byte[] WEBM = {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, (byte) 0x9F, 0x42, (byte) 0x86, (byte) 0x81, 1};
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'};

    @Autowired
    MockMvc mvc;

    final List<String> created = new ArrayList<>();

    @AfterEach
    void trashCreated() throws Exception {
        for (String id : created) {
            mvc.perform(asAdmin(delete(BASE + "/" + id), ADMIN));
        }
        created.clear();
    }

    MockMultipartFile metadata(String json) {
        return new MockMultipartFile("metadata", "", MediaType.APPLICATION_JSON_VALUE, json.getBytes(StandardCharsets.UTF_8));
    }

    String upload(String fileName, byte[] bytes, String metadataJson) throws Exception {
        String body = mvc.perform(asAdmin(multipart(BASE + "/uploads").file(metadata(metadataJson))
                                .file(new MockMultipartFile("file", fileName, "application/octet-stream", bytes)), ADMIN))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.scrapId");
        created.add(id);
        return id;
    }

    @Test
    void 영상을_링크_없이_올리면_저장되고_원본으로_내려받고_미리볼_수_있다() throws Exception {
        String id = upload("../실험 영상.mp4", MP4, "{\"type\":\"VIDEO\",\"title\":\"실험 영상\",\"subjectIds\":[\"subj_02\"]}");
        mvc.perform(asAdmin(get(BASE + "/" + id), ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceUrl").doesNotExist())
                .andExpect(jsonPath("$.type").value("VIDEO"))
                .andExpect(jsonPath("$.file.fileName").value("실험 영상.mp4"))
                .andExpect(jsonPath("$.file.contentType").value("video/mp4"))
                .andExpect(jsonPath("$.file.sizeBytes").value(MP4.length))
                .andExpect(jsonPath("$.file.previewAvailable").value(true));
        byte[] downloaded = mvc.perform(asAdmin(get(BASE + "/" + id + "/file"), ADMIN))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(downloaded).isEqualTo(MP4);
        mvc.perform(asAdmin(get(BASE + "/" + id + "/file/preview"), ADMIN))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "video/mp4"));
        // 파일이 있는 스크랩은 sourceUrl 없이 고칠 수 있고, 목록(새로고침)에도 파일이 그대로 보인다
        mvc.perform(asAdmin(patch(BASE + "/" + id), ADMIN).contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"실험 영상 수정\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("실험 영상 수정"));
        mvc.perform(asAdmin(get(BASE).param("query", "실험 영상 수정"), ADMIN))
                .andExpect(jsonPath("$.items[0].file.contentType").value("video/mp4"));
        // 파일만 있는 스크랩은 연결을 비울 수 없다(휴지통으로 보낸다)
        mvc.perform(asAdmin(delete(BASE + "/" + id + "/file"), ADMIN)).andExpect(status().isBadRequest());
        // 학생은 관리자 파일을 내려받을 수 없으므로 링크 없는 업로드 스크랩은 학생에게 공개할 수 없다
        mvc.perform(asAdmin(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(BASE + "/" + id + "/visibility"), ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"published\":true}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 확장자와_서명이_다르면_415_빈파일은_400이고_스크랩도_남지_않는다() throws Exception {
        String before = mvc.perform(asAdmin(get(BASE), ADMIN)).andReturn().getResponse().getContentAsString();
        int count = JsonPath.<List<Object>>read(before, "$.items").size();
        String meta = "{\"type\":\"OTHER\",\"title\":\"거절될 파일\"}";
        mvc.perform(asAdmin(multipart(BASE + "/uploads").file(metadata(meta))
                        .file(new MockMultipartFile("file", "가짜.mp4", "video/mp4", "hello".getBytes(StandardCharsets.UTF_8))), ADMIN))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asAdmin(multipart(BASE + "/uploads").file(metadata(meta))
                        .file(new MockMultipartFile("file", "웹영상.webm", "video/webm", MP4)), ADMIN))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asAdmin(multipart(BASE + "/uploads").file(metadata(meta))
                        .file(new MockMultipartFile("file", "실행.exe", "application/octet-stream", MP4)), ADMIN))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asAdmin(multipart(BASE + "/uploads").file(metadata(meta))
                        .file(new MockMultipartFile("file", "빈.png", "image/png", new byte[0])), ADMIN))
                .andExpect(status().isBadRequest());
        // 제목 없는 메타정보는 400
        mvc.perform(asAdmin(multipart(BASE + "/uploads").file(metadata("{\"type\":\"OTHER\"}"))
                        .file(new MockMultipartFile("file", "그림.png", "image/png", PNG)), ADMIN))
                .andExpect(status().isBadRequest());
        String after = mvc.perform(asAdmin(get(BASE), ADMIN)).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<Object>>read(after, "$.items")).hasSize(count);
        // WEBM은 EBML 서명이 맞으면 받는다
        upload("수업.webm", WEBM, "{\"type\":\"VIDEO\",\"title\":\"수업 영상\"}");
    }

    @Test
    void 링크_스크랩에_사진을_붙이고_교체하고_연결을_비운다_링크_스크랩_필수규칙은_그대로() throws Exception {
        mvc.perform(asAdmin(post(BASE), ADMIN).contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"SITE\",\"title\":\"링크 없음\"}"))
                .andExpect(status().isBadRequest());
        String body = mvc.perform(asAdmin(post(BASE), ADMIN).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"ARTICLE\",\"title\":\"기사\",\"sourceUrl\":\"https://example.org/a\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.scrapId");
        created.add(id);
        mvc.perform(asAdmin(multipart(BASE + "/" + id + "/file").file(new MockMultipartFile("file", "도표.png", "image/png", PNG)), ADMIN))
                .andExpect(status().isOk()).andExpect(jsonPath("$.file.contentType").value("image/png"));
        mvc.perform(asAdmin(multipart(BASE + "/" + id + "/file").file(new MockMultipartFile("file", "영상.mp4", "video/mp4", MP4)), ADMIN))
                .andExpect(status().isOk()).andExpect(jsonPath("$.file.fileName").value("영상.mp4"));
        mvc.perform(asAdmin(delete(BASE + "/" + id + "/file"), ADMIN))
                .andExpect(status().isOk()).andExpect(jsonPath("$.file").doesNotExist());
        mvc.perform(asAdmin(get(BASE + "/" + id + "/file"), ADMIN)).andExpect(status().isNotFound());
    }

    @Test
    void 학생은_관리자_파일에_접근할_수_없고_학생_자료함은_영상을_받지_않는다() throws Exception {
        String id = upload("자료.mp4", MP4, "{\"type\":\"VIDEO\",\"title\":\"관리자 영상\"}");
        int studentStatus = mvc.perform(asStudent(get(BASE + "/" + id + "/file"), "stu_001")).andReturn().getResponse().getStatus();
        assertThat(studentStatus).isBetween(400, 499);
        // 휴지통으로 보낸 스크랩의 파일은 404
        mvc.perform(asAdmin(delete(BASE + "/" + id), ADMIN)).andExpect(status().isNoContent());
        created.remove(id);
        mvc.perform(asAdmin(get(BASE + "/" + id + "/file"), ADMIN)).andExpect(status().isNotFound());
        // 학생 자료함(§22-1) 허용 형식은 그대로 — 영상은 415
        String resource = mvc.perform(asStudent(post("/api/student/assessment/resources"), "stu_010").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"FILE\",\"title\":\"영상 자료\",\"tags\":[]}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String resourceId = JsonPath.read(resource, "$.resourceId");
        mvc.perform(asStudent(multipart("/api/student/assessment/resources/" + resourceId + "/file")
                        .file(new MockMultipartFile("file", "영상.mp4", "video/mp4", MP4)), "stu_010"))
                .andExpect(status().isUnsupportedMediaType());
    }
}
