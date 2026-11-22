package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * PR #18 학교알리미 불러오기 (§38-11 DRAFT, A27-UX 부록 D 통합 → 부록 E 변경). 가상 학교알리미(127.0.0.1)에 실제 Client 로 붙는다.
 * 부록 E: 요청 학년도를 지정 조회하고 §38-12 분류가 VERIFIED 인 파일만 등록한다(학년·학기 근거 없는 파일에 defaultGrade 를 붙이지 않음).
 */
class SchoolInfoImportApiTest extends SchoolInfoFakeSupport {

    private static final String BASE = "/api/admin/assessment/evaluation-plans";
    private static final String OPERATOR = "adm_plan_operator";
    private static final String BODY = "{\"schoolId\":\"school_import\",\"schoolName\":\" 가상고 \",\"academicYear\":2099,\"semester\":2,\"defaultGrade\":1}";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void reset() {
        FAKE.reset();
        FAKE.schoolName = "가상고등학교";
    }

    private static byte[] pdf(String tag) throws java.io.IOException {
        return EvaluationPlanApiTest.pdf(1, "synthetic " + tag);
    }

    private long planCount() {
        return jdbc.queryForObject("select count(*) from assessment_evaluation_plan", Long.class);
    }

    @Test
    void 요청_학년도로_조회해_확인된_파일만_학년별로_등록하고_나머지는_사유와_함께_건너뛴다() throws Exception {
        String tag = Long.toString(System.nanoTime(), 36);
        FAKE.years.put(2099, new FakeSchoolInfoServer.YearData(2099,
                new FakeSchoolInfoServer.Doc("2099학년도 2학년 2학기 평가계획 " + tag + ".pdf", pdf(tag + "a")),
                new FakeSchoolInfoServer.Doc("2099학년도 1,3학년 2학기 공통 평가계획 " + tag + ".pdf", pdf(tag + "b")),
                new FakeSchoolInfoServer.Doc("2099학년도 1학년 1학기 평가계획 " + tag + ".pdf", pdf(tag + "c")),
                new FakeSchoolInfoServer.Doc("2099학년도 2학년 평가계획 " + tag + ".pdf", pdf(tag + "e")),
                new FakeSchoolInfoServer.Doc("1학년 2학기 평가계획 " + tag + ".pdf", pdf(tag + "f")),
                new FakeSchoolInfoServer.Doc("2098학년도 1학년 2학기 평가계획 " + tag + ".pdf", pdf(tag + "g")),
                new FakeSchoolInfoServer.Doc("학업성적관리규정 " + tag + ".pdf", pdf(tag + "d")),
                new FakeSchoolInfoServer.Doc("안내 " + tag + ".txt", "hello".getBytes(StandardCharsets.UTF_8))));
        String response = mvc.perform(asAdmin(post(BASE + "/import-from-schoolinfo"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").exists())
                .andExpect(jsonPath("$.schoolName").value("가상고등학교"))
                .andReturn().getResponse().getContentAsString();
        assertThat(FAKE.log).as("요청 학년도로 지정 조회").anyMatch(l -> l.startsWith("/ei/pp/Pneipp_b06_s0p.do JG_YEAR=2099"));
        String jobId = JsonPath.read(response, "$.jobId");
        List<Map<String, Object>> files = JsonPath.read(response, "$.files");
        // 2학년 1개 + 1·3학년 공통 2개(학년마다 따로) = 등록 3
        assertThat(files.stream().filter(f -> f.get("planId") != null).map(f -> f.get("grade"))).as(response).containsExactlyInAnyOrder(2, 1, 3);
        // 건너뜀 6: 다른 학기 · 학기 근거 없음 · 학년도 근거 없음 · 다른 학년도 · 평가계획 아님 · 형식 아님
        assertThat(files.stream().filter(f -> Boolean.TRUE.equals(f.get("skipped")))).as(response).hasSize(6);
        assertThat(files.stream().filter(f -> Boolean.TRUE.equals(f.get("skipped"))).map(f -> String.valueOf(f.get("message"))))
                .anyMatch(m -> m.contains("UNCLASSIFIED") || m.contains("NO_SEMESTER_EVIDENCE"))
                .anyMatch(m -> m.contains("NO_FILE_YEAR_EVIDENCE"))
                .anyMatch(m -> m.contains("FILE_YEAR_DIFFERS"));
        assertThat(JsonPath.<Integer>read(response, "$.total")).isEqualTo(3);

        String done = null;
        for (int i = 0; i < 150; i++) {
            done = mvc.perform(asAdmin(get(BASE + "/import-from-schoolinfo/" + jobId), OPERATOR)).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            if ("DONE".equals(JsonPath.read(done, "$.state"))) {
                break;
            }
            Thread.sleep(100);
        }
        assertThat(JsonPath.<String>read(done, "$.state")).isEqualTo("DONE");
        // 빈 합성 PDF 라 분석은 실패로 끝난다(수집 성공과 분석 결과는 별개 — 성공으로 위장하지 않음)
        List<Map<String, Object>> doneFiles = JsonPath.read(done, "$.files");
        assertThat(doneFiles.stream().filter(f -> f.get("planId") != null).map(f -> f.get("analysisStatus"))).containsOnly("FAILED");

        Integer grade3 = jdbc.queryForObject("select count(*) from assessment_evaluation_plan where school_id='school_import' and academic_year=2099 and grade=3 and semester=2", Integer.class);
        assertThat(grade3).isEqualTo(1);
        String sourceUrl = jdbc.queryForObject("select r.source_url from assessment_plan_revision r join assessment_evaluation_plan p on p.id = r.plan_id "
                + "where p.school_id='school_import' and p.grade=3 limit 1", String.class);
        assertThat(sourceUrl).as("학교·학년도 공시 주소(사이트 메인 주소가 아님)").contains("SHL_IDF_CD=").contains("JG_YEAR=2099");

        // 같은 공시를 다시 불러와도 새 문서를 만들지 않는다
        long before = planCount();
        String again = mvc.perform(asAdmin(post(BASE + "/import-from-schoolinfo"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(BODY)).andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        assertThat(planCount()).isEqualTo(before);
        assertThat(JsonPath.<List<String>>read(again, "$.files[?(@.planId != null)].analysisStatus")).containsOnly("UNCHANGED");

        mvc.perform(asAdmin(get(BASE + "/import-from-schoolinfo/" + jobId), "adm_gangnam")).andExpect(status().isNotFound());
        mvc.perform(asAdmin(get(BASE + "/import-from-schoolinfo/schoolinfo_job_unknown"), OPERATOR))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("SCHOOLINFO_JOB_NOT_FOUND"));
    }

    @Test
    void 학교_없음_공시_없음_연결_실패_동명_학교는_각각_다른_오류로_알린다() throws Exception {
        FAKE.searchIds = List.of();
        mvc.perform(asAdmin(post(BASE + "/import-from-schoolinfo"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("SCHOOLINFO_SCHOOL_NOT_FOUND"));
        FAKE.reset();
        mvc.perform(asAdmin(post(BASE + "/import-from-schoolinfo"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("SCHOOLINFO_PLAN_NOT_PUBLISHED"));
        FAKE.searchStatus = 503;
        mvc.perform(asAdmin(post(BASE + "/import-from-schoolinfo"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("SCHOOLINFO_UNAVAILABLE"));
        // 부록 D: 같은 이름 학교가 2곳 검색되면 파일이 있어도 하나도 등록하지 않고 409
        FAKE.reset();
        FAKE.searchIds = List.of(FakeSchoolInfoServer.SCHOOL_UUID, FakeSchoolInfoServer.OTHER_UUID);
        FAKE.years.put(2099, new FakeSchoolInfoServer.YearData(2099, new FakeSchoolInfoServer.Doc("2099학년도 1학년 2학기.pdf", pdf("ambiguous"))));
        long before = planCount();
        mvc.perform(asAdmin(post(BASE + "/import-from-schoolinfo"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SCHOOLINFO_SCHOOL_AMBIGUOUS"));
        assertThat(planCount()).isEqualTo(before);
        assertThat(FAKE.count("/ei/pp/")).as("동명 학교면 평가계획 항목을 받지 않는다").isZero();
        // 입력 검증 (학교 이름 빈칸·학기 범위 밖)
        mvc.perform(asAdmin(post(BASE + "/import-from-schoolinfo"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"schoolId\":\"school_import\",\"schoolName\":\"\",\"academicYear\":2099,\"semester\":3}"))
                .andExpect(status().isBadRequest());
    }
}
