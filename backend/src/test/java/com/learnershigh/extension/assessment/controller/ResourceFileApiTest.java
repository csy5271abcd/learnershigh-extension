package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.nio.charset.StandardCharsets;
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

/** A27-UX §22-1 DRAFT 학생 자료함 파일 첨부: 형식(확장자+서명)·저장·다운로드·미리보기·삭제·본인 전용 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class ResourceFileApiTest {

    static final String BASE = "/api/student/assessment/resources";
    static final byte[] GIF = {'G', 'I', 'F', '8', '9', 'a', 1, 0, 1, 0, 0, 0, 0, ';'};
    static final byte[] WEBP = {'R', 'I', 'F', 'F', 4, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '};
    static final byte[] WAV = {'R', 'I', 'F', 'F', 4, 0, 0, 0, 'W', 'A', 'V', 'E', 0, 0, 0, 0};
    static final byte[] OLE = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1, 0};

    @Autowired
    MockMvc mvc;

    String resource(String studentId) throws Exception {
        String body = mvc.perform(asStudent(post(BASE), studentId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"FILE\",\"title\":\"탐구 자료\",\"tags\":[]}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.resourceId");
    }

    @Test
    void GIF를_올리면_원본_그대로_내려받고_미리볼_수_있다() throws Exception {
        String id = resource("stu_010");
        mvc.perform(asStudent(multipart(BASE + "/" + id + "/file").file(new MockMultipartFile("file", "../../움직이는.gif", "text/plain", GIF)), "stu_010"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.file.fileName").value("움직이는.gif"))
                .andExpect(jsonPath("$.file.contentType").value("image/gif"))
                .andExpect(jsonPath("$.file.sizeBytes").value(GIF.length))
                .andExpect(jsonPath("$.file.previewAvailable").value(true));
        byte[] downloaded = mvc.perform(asStudent(get(BASE + "/" + id + "/file"), "stu_010"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(downloaded).isEqualTo(GIF);
        mvc.perform(asStudent(get(BASE + "/" + id + "/file/preview"), "stu_010"))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "image/gif"));
        // 새로고침(재조회) 뒤에도 유지
        mvc.perform(asStudent(get(BASE + "/" + id), "stu_010")).andExpect(jsonPath("$.file.fileName").value("움직이는.gif"));
    }

    @Test
    void 확장자와_서명이_다르면_415_크기0은_400_다른학생은_404() throws Exception {
        String id = resource("stu_010");
        mvc.perform(asStudent(multipart(BASE + "/" + id + "/file").file(new MockMultipartFile("file", "가짜.pdf", "application/pdf", "hello".getBytes(StandardCharsets.UTF_8))), "stu_010"))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asStudent(multipart(BASE + "/" + id + "/file").file(new MockMultipartFile("file", "소리.webp", "image/webp", WAV)), "stu_010"))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asStudent(multipart(BASE + "/" + id + "/file").file(new MockMultipartFile("file", "실행.exe", "application/octet-stream", OLE)), "stu_010"))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asStudent(multipart(BASE + "/" + id + "/file").file(new MockMultipartFile("file", "빈.png", "image/png", new byte[0])), "stu_010"))
                .andExpect(status().isBadRequest());
        mvc.perform(asStudent(multipart(BASE + "/" + id + "/file").file(new MockMultipartFile("file", "그림.webp", "image/webp", WEBP)), "stu_007"))
                .andExpect(status().isNotFound());
        mvc.perform(asStudent(get(BASE + "/" + id + "/file"), "stu_007")).andExpect(status().isNotFound());
    }

    @Test
    void 엑셀은_다운로드만_되고_첨부를_지우면_파일도_사라진다() throws Exception {
        String id = resource("stu_010");
        mvc.perform(asStudent(multipart(BASE + "/" + id + "/file").file(new MockMultipartFile("file", "성적표.xls", "application/vnd.ms-excel", OLE)), "stu_010"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.file.contentType").value("application/vnd.ms-excel"))
                .andExpect(jsonPath("$.file.previewAvailable").value(false));
        mvc.perform(asStudent(get(BASE + "/" + id + "/file/preview"), "stu_010")).andExpect(status().isUnsupportedMediaType());
        mvc.perform(asStudent(get(BASE + "/" + id + "/file"), "stu_010")).andExpect(status().isOk());
        mvc.perform(asStudent(delete(BASE + "/" + id + "/file"), "stu_010"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.file").doesNotExist());
        mvc.perform(asStudent(get(BASE + "/" + id + "/file"), "stu_010")).andExpect(status().isNotFound());
    }
}
