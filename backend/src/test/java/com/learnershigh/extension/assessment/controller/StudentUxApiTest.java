package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
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
 * A27-UX 학생 화면 개선 (api-contract 'A27-UX 학생 화면 개선 추가 계약' 2026-11-19 DRAFT):
 * §12-a 개인 과목 원자 등록·§9-1-a 응답 · §12-b '기타' 직접 입력 · §30-a 홈 메모 · §12-c 안내문 첨부. 일회용 MySQL(Testcontainers).
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentUxApiTest {

    private static final String BASE = "/api/student/assessment";
    private static final byte[] PDF = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF".getBytes(StandardCharsets.US_ASCII);

    @Autowired
    MockMvc mvc;

    private String context(String studentId) throws Exception {
        return mvc.perform(asStudent(get(BASE + "/academic-context?academicYear=2026&semester=1"), studentId))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private String create(String studentId, String body) throws Exception {
        return mvc.perform(asStudent(post(BASE + "/school-assessments"), studentId).contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    }

    @Test
    void 사이드바에_없는_과목으로_등록하면_개인_과목이_함께_저장되고_다시_써도_중복되지_않는다() throws Exception {
        String student = "stu_006";
        List<String> before = JsonPath.read(context(student), "$.subjects[*].subjectId");

        // ④ 학교 데이터에 없는 이름 → 학생 소유 개인 과목(psubj_)
        String first = create(student, "{\"title\":\"사회문제 탐구\",\"newSubjectName\":\"  사회와  문화 \",\"academicYear\":2026,\"semester\":1}");
        String personalId = JsonPath.read(first, "$.subjectId");
        assertThat(personalId).startsWith("psubj_");
        String after = context(student);
        List<Map<String, Object>> added = JsonPath.read(after, "$.subjects[?(@.addedByStudent == true && @.name == '사회와 문화')]");
        assertThat(added).hasSize(1);
        assertThat(added.get(0)).containsEntry("subjectId", personalId).containsEntry("name", "사회와 문화");
        assertThat((List<String>) JsonPath.read(after, "$.subjects[?(@.addedByStudent == false)].subjectId")).containsAll(before);

        // 같은 이름(공백만 다름)은 같은 개인 과목을 다시 쓴다
        String second = create(student, "{\"title\":\"두 번째\",\"newSubjectName\":\"사회와문화\",\"academicYear\":2026,\"semester\":1}");
        assertThat((String) JsonPath.read(second, "$.subjectId")).isEqualTo(personalId);
        assertThat((List<Object>) JsonPath.read(context(student), "$.subjects[?(@.addedByStudent == true && @.name == '사회와 문화')]")).hasSize(1);

        // 이제 subjectId로도 등록되고, 과목 이름으로 검색된다
        create(student, "{\"title\":\"세 번째\",\"subjectId\":\"" + personalId + "\",\"academicYear\":2026,\"semester\":1}");
        mvc.perform(asStudent(get(BASE + "/school-assessments?academicYear=2026&semester=1&query=사회와"), student))
                .andExpect(jsonPath("$.items.length()").value(3));

        // ① 원래 수강 과목과 같은 이름 → 그 과목 ID (개인 과목을 만들지 않는다)
        String enrolledName = JsonPath.read(after, "$.subjects[0].name");
        String enrolledId = JsonPath.read(after, "$.subjects[0].subjectId");
        String same = create(student, "{\"title\":\"수강 과목\",\"newSubjectName\":\"" + enrolledName + "\",\"academicYear\":2026,\"semester\":1}");
        assertThat((String) JsonPath.read(same, "$.subjectId")).isEqualTo(enrolledId);

        // 다른 학생에게는 보이지 않고, 다른 학생은 그 개인 과목 ID로 등록할 수 없다
        assertThat((List<Object>) JsonPath.read(context("stu_007"), "$.subjects[?(@.name == '사회와 문화')]")).isEmpty();
        mvc.perform(asStudent(post(BASE + "/school-assessments"), "stu_007").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"남의 과목\",\"subjectId\":\"" + personalId + "\",\"academicYear\":2026,\"semester\":1}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details.fields[0].field").value("subjectId"));
        // 다른 학기에는 섞이지 않는다
        mvc.perform(asStudent(get(BASE + "/academic-context?academicYear=2026&semester=2"), student))
                .andExpect(jsonPath("$.subjects[?(@.addedByStudent == true)]").isEmpty());
    }

    @Test
    void 공통_과목_후보와_같은_이름이면_기존_ID를_재사용하고_검증_오류는_아무것도_저장하지_않는다() throws Exception {
        String student = "stu_008";
        String ctx = context(student);
        List<Map<String, Object>> notEnrolled = JsonPath.read(ctx, "$.catalogSubjects[?(@.enrolled == false)]");
        assertThat(notEnrolled).as("시험 데이터: 이 학기 공통 후보 중 수강하지 않는 과목").isNotEmpty();
        String catalogId = (String) notEnrolled.get(0).get("subjectId");
        String catalogName = (String) notEnrolled.get(0).get("name");

        String created = create(student, "{\"title\":\"후보 과목\",\"newSubjectName\":\"" + catalogName + "\",\"academicYear\":2026,\"semester\":1}");
        assertThat((String) JsonPath.read(created, "$.subjectId")).isEqualTo(catalogId);
        String after = context(student);
        assertThat((List<Object>) JsonPath.read(after, "$.subjects[?(@.subjectId == '" + catalogId + "' && @.addedByStudent == true)]")).hasSize(1);
        assertThat((List<Object>) JsonPath.read(after, "$.catalogSubjects[?(@.subjectId == '" + catalogId + "' && @.enrolled == true)]")).hasSize(1);

        // subjectId·newSubjectName 둘 다 / 둘 다 없음 / 잘못된 이름 → 400, 과목도 수행평가도 저장되지 않는다
        long countBefore = ((List<Object>) JsonPath.read(context(student), "$.subjects")).size();
        String[] bad = {
            "{\"title\":\"둘 다\",\"subjectId\":\"subj_11\",\"newSubjectName\":\"새 과목\",\"academicYear\":2026,\"semester\":1}",
            "{\"title\":\"없음\",\"academicYear\":2026,\"semester\":1}",
            "{\"title\":\"제어문자\",\"newSubjectName\":\"나쁜\\u0007이름\",\"academicYear\":2026,\"semester\":1}",
            "{\"title\":\"없는 학기\",\"newSubjectName\":\"새 과목2\",\"academicYear\":2030,\"semester\":1}",
        };
        for (String body : bad) {
            mvc.perform(asStudent(post(BASE + "/school-assessments"), student).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        assertThat(((List<Object>) JsonPath.read(context(student), "$.subjects")).size()).isEqualTo(countBefore);
        mvc.perform(asStudent(get(BASE + "/school-assessments?academicYear=2026&semester=1&query=후보 과목"), student))
                .andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(asStudent(get(BASE + "/school-assessments?academicYear=2026&semester=1&query=둘 다"), student))
                .andExpect(jsonPath("$.items.length()").value(0));
        // 관리자 학생 상세도 같은 과목 목록(학생 추가 표시 포함)
        mvc.perform(asAdmin(get("/api/admin/assessment/students/" + student + "/student-view/academic-context?academicYear=2026&semester=1"), "adm_gangnam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subjects[?(@.subjectId == '" + catalogId + "' && @.addedByStudent == true)]").isNotEmpty());
    }

    @Test
    void 기타_평가유형_직접입력은_OTHER일_때만_저장되고_PATCH로_바뀐다() throws Exception {
        String student = "stu_009";
        String created = create(student, "{\"title\":\"기타 유형\",\"subjectId\":\"subj_11\",\"academicYear\":2026,\"semester\":1,"
                + "\"assessmentType\":\"OTHER\",\"assessmentTypeLabel\":\" 모의 면접 \",\"submissions\":\"발표 자료(PPT)\"}");
        String id = JsonPath.read(created, "$.assessmentId");
        assertThat((String) JsonPath.read(created, "$.assessmentTypeLabel")).isEqualTo("모의 면접");
        assertThat((String) JsonPath.read(created, "$.submissions")).isEqualTo("발표 자료(PPT)");
        mvc.perform(asStudent(get(BASE + "/school-assessments/" + id), student))
                .andExpect(jsonPath("$.assessmentType").value("OTHER")).andExpect(jsonPath("$.assessmentTypeLabel").value("모의 면접"));
        // 라벨만 바꾸기 (다른 필드는 그대로)
        mvc.perform(asStudent(patch(BASE + "/school-assessments/" + id), student).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"assessmentTypeLabel\":\"구술 평가\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.assessmentTypeLabel").value("구술 평가"))
                .andExpect(jsonPath("$.submissions").value("발표 자료(PPT)"));
        // 유형을 OTHER가 아닌 것으로 바꾸면 라벨은 비워진다
        mvc.perform(asStudent(patch(BASE + "/school-assessments/" + id), student).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"assessmentType\":\"REPORT\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.assessmentTypeLabel").doesNotExist());
        // OTHER가 아닌 유형에 라벨을 보내도 저장하지 않는다
        String report = create(student, "{\"title\":\"보고서\",\"subjectId\":\"subj_11\",\"academicYear\":2026,\"semester\":1,"
                + "\"assessmentType\":\"REPORT\",\"assessmentTypeLabel\":\"무시됨\"}");
        assertThat((Object) JsonPath.read(report, "$.assessmentTypeLabel")).isNull();
        // 길이 초과 400
        mvc.perform(asStudent(patch(BASE + "/school-assessments/" + id), student).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"assessmentTypeLabel\":\"" + "가".repeat(51) + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 홈_메모는_본인만_저장하고_버전이_다르면_409() throws Exception {
        mvc.perform(asStudent(get(BASE + "/home-memo"), "stu_010"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.body").doesNotExist()).andExpect(jsonPath("$.version").value(0));
        mvc.perform(asStudent(put(BASE + "/home-memo"), "stu_010").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"이번 주 준비물: 실험 보고서 양식\",\"expectedVersion\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.body").value("이번 주 준비물: 실험 보고서 양식"));
        mvc.perform(asStudent(get(BASE + "/home-memo"), "stu_010"))
                .andExpect(jsonPath("$.body").value("이번 주 준비물: 실험 보고서 양식")).andExpect(jsonPath("$.updatedAt").exists());
        // 오래된 버전으로 덮어쓰기 → 409, 내용 그대로
        mvc.perform(asStudent(put(BASE + "/home-memo"), "stu_010").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"덮어쓰기\",\"expectedVersion\":0}"))
                .andExpect(status().isConflict());
        // 다른 학생은 자기 빈 메모만 본다
        mvc.perform(asStudent(get(BASE + "/home-memo"), "stu_001")).andExpect(jsonPath("$.body").doesNotExist());
        // 지우기(빈 내용)
        mvc.perform(asStudent(put(BASE + "/home-memo"), "stu_010").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"  \",\"expectedVersion\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.body").doesNotExist()).andExpect(jsonPath("$.version").value(2));
        // 길이 초과·버전 누락 400
        mvc.perform(asStudent(put(BASE + "/home-memo"), "stu_010").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"" + "a".repeat(2001) + "\",\"expectedVersion\":2}"))
                .andExpect(status().isBadRequest());
        mvc.perform(asStudent(put(BASE + "/home-memo"), "stu_010").contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"x\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 안내문_첨부는_PDF_이미지만_본인_수행평가에_저장되고_새로고침_뒤에도_남는다() throws Exception {
        String student = "stu_006";
        String id = JsonPath.read(create(student, "{\"title\":\"안내문\",\"subjectId\":\"subj_11\",\"academicYear\":2026,\"semester\":1}"),
                "$.assessmentId");
        String files = BASE + "/school-assessments/" + id + "/notice-files";
        String uploaded = mvc.perform(asStudent(multipart(files).file(new MockMultipartFile("file", "../수행평가 안내.pdf", "text/plain", PDF)), student))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.fileName").value("수행평가 안내.pdf"))
                .andExpect(jsonPath("$.contentType").value("application/pdf")).andExpect(jsonPath("$.sizeBytes").value(PDF.length))
                .andReturn().getResponse().getContentAsString();
        String fileId = JsonPath.read(uploaded, "$.fileId");
        mvc.perform(asStudent(get(files), student)).andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].fileId").value(fileId));
        byte[] downloaded = mvc.perform(asStudent(get(files + "/" + fileId), student)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(downloaded).isEqualTo(PDF);
        mvc.perform(asStudent(get(files + "/" + fileId + "/preview"), student)).andExpect(status().isOk());

        // 형식이 맞지 않는 파일(확장자만 pdf, 내용 다름 / exe) → 415, 빈 파일 400
        mvc.perform(asStudent(multipart(files).file(new MockMultipartFile("file", "가짜.pdf", "application/pdf", "hello".getBytes(StandardCharsets.UTF_8))), student))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asStudent(multipart(files).file(new MockMultipartFile("file", "run.exe", "application/octet-stream", new byte[] {77, 90, 1, 2})), student))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(asStudent(multipart(files).file(new MockMultipartFile("file", "빈.pdf", "application/pdf", new byte[0])), student))
                .andExpect(status().isBadRequest());
        // 다른 학생: 목록·내려받기·올리기·삭제 모두 404
        mvc.perform(asStudent(get(files), "stu_007")).andExpect(status().isNotFound());
        mvc.perform(asStudent(get(files + "/" + fileId), "stu_007")).andExpect(status().isNotFound());
        mvc.perform(asStudent(multipart(files).file(new MockMultipartFile("file", "a.pdf", "application/pdf", PDF)), "stu_007"))
                .andExpect(status().isNotFound());
        mvc.perform(asStudent(delete(files + "/" + fileId), "stu_007")).andExpect(status().isNotFound());
        // 삭제 → 목록에서 빠지고 내려받기 404
        mvc.perform(asStudent(delete(files + "/" + fileId), student)).andExpect(status().isNoContent());
        mvc.perform(asStudent(get(files), student)).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(asStudent(get(files + "/" + fileId), student)).andExpect(status().isNotFound());
        // 10개 한도
        for (int i = 0; i < 10; i++) {
            mvc.perform(asStudent(multipart(files).file(new MockMultipartFile("file", "p" + i + ".pdf", "application/pdf", PDF)), student))
                    .andExpect(status().isCreated());
        }
        mvc.perform(asStudent(multipart(files).file(new MockMultipartFile("file", "p11.pdf", "application/pdf", PDF)), student))
                .andExpect(status().isBadRequest());
    }
}
