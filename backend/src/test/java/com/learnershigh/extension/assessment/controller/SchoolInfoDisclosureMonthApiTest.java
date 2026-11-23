package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer.Doc;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer.YearData;
import com.learnershigh.extension.common.time.AdjustableClock;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 부록 G (2026-11-19 사용자 승인): 공시 차수(1차=4월, 3차=9월)별 첨부 → 공시월로 학기, 학년 미표기 → 고1·고2·고3.
 * 가상 학교알리미는 실측에서 본 화면 구조(자료기준일 선택지·JG_CHASU)를 재현한다. 파일 이름은 실측 이름 모양을 본뜬 가상 이름이다.
 */
class SchoolInfoDisclosureMonthApiTest extends SchoolInfoFakeSupport {

    private static final String SYNC = "/api/admin/assessment/evaluation-plans/schoolinfo-sync";
    private static final String SOURCES = "/api/admin/assessment/evaluation-plans/schoolinfo-sources";
    private static final String OPERATOR = "adm_plan_operator";
    private static final String SCHOOL = "school_001";
    private static final String BODY = "{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2,3],\"semesters\":[1,2]}";

    @Autowired
    com.learnershigh.extension.assessment.service.plan.SchoolInfoSyncService syncWorker;

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    AdjustableClock clock;
    String tag;

    @BeforeEach
    void reset() {
        // A28-42: 이전 시험이 남긴 학교알리미 동기화·분석 작업이 끝난 뒤 공유 가상 서버·DB 를 초기화한다(간헐 실패 원인)
        org.assertj.core.api.Assertions.assertThat(syncWorker.awaitIdle(java.time.Duration.ofSeconds(120))).as("sync worker idle").isTrue();
        FAKE.reset();
        FAKE.schoolName = "예시고등학교";
        clock.setDate(LocalDate.of(2026, 9, 30));
        jdbc.update("delete from assessment_schoolinfo_classification");
        jdbc.update("delete from assessment_schoolinfo_school_mapping");
        jdbc.update("delete from assessment_schoolinfo_slot_link");
        jdbc.update("delete from assessment_schoolinfo_source_file");
        jdbc.update("delete from assessment_schoolinfo_sync_year");
        tag = Long.toString(System.nanoTime(), 36);
    }

    @AfterEach
    void restore() {
        clock.setDate(LocalDate.of(2026, 9, 30));
    }

    static byte[] pdf(String m) throws IOException {
        return EvaluationPlanApiTest.pdf(1, "synthetic " + m);
    }

    /** 실측처럼 내려받기 Form 에 그 학년도(JG_YEAR)를 되돌려 준다 */
    YearData data(int year, int month, Doc... docs) {
        YearData d = new YearData(year, docs);
        d.month = month;
        return d;
    }

    String run(String body) throws Exception {
        String r = mvc.perform(asAdmin(post(SYNC), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().getResponse().getContentAsString();
        String jobId = JsonPath.read(r, "$.jobId");
        for (int i = 0; i < 600; i++) {
            r = mvc.perform(asAdmin(get(SYNC + "/" + jobId), OPERATOR)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            if (!"RUNNING".equals(JsonPath.read(r, "$.state"))) {
                return r;
            }
            Thread.sleep(100);
        }
        throw new AssertionError(r);
    }

    static String slot(String r, int y, int g, int s) {
        List<String> v = JsonPath.read(r, "$.slotStatuses[?(@.academicYear==" + y + " && @.grade==" + g + " && @.semester==" + s + ")].status");
        return v.getFirst();
    }

    int linksOf(String fileNamePart) {
        return jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link l join assessment_schoolinfo_source_file f on f.id = l.source_file_id "
                + "where f.file_name like ?", Integer.class, "%" + fileNamePart + "%");
    }

    @Test
    void 공시월로_학기를_정하고_학년_미표기는_세_칸_명시_학년은_그_칸만_충돌은_보류() throws Exception {
        FAKE.chasu.put("2026:1", data(2026, 4, new Doc("2026학년도 국어과 교수학습 및 평가 운영 계획 " + tag + ".hwp", pdf(tag + "kor")),
                new Doc("2026학년도 2학기 미술과 평가 운영 계획 " + tag + ".hwp", pdf(tag + "art"))));
        FAKE.chasu.put("2026:3", data(2026, 9, new Doc("2026_2학기_2학년_확률과통계_교수학습평가운영계획 " + tag + ".hwp", pdf(tag + "prob"))));
        FAKE.chasu.put("2025:3", data(2025, 9, new Doc("2025학년도 과학과 교수학습 및 평가 운영 계획 " + tag + ".hwp", pdf(tag + "sci"))));
        FAKE.chasu.put("2024:3", data(2024, 9, new Doc("2024학년도 1,3학년 평가계획 " + tag + ".pdf", pdf(tag + "13"))));
        String r = run(BODY);
        // 학년도마다 기본(최신 차수) + 다른 차수를 JG_CHASU 로 따로 요청
        assertThat(FAKE.log).anyMatch(l -> l.startsWith("/ei/pp/Pneipp_b06_s0p.do JG_YEAR=2026") && !l.contains("CHASU"));
        // 2026 4월: 학년 미표기 → 1학기 세 칸(원본 하나)
        for (int g : List.of(1, 2, 3)) {
            assertThat(slot(r, 2026, g, 1)).isEqualTo("REGISTERED");
        }
        assertThat(linksOf("국어과")).isEqualTo(3);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_source_file where file_name like ?", Integer.class, "%국어과%")).isEqualTo(1);
        // 2026 9월: 명시 2학년 → 고2-2 한 칸
        assertThat(linksOf("확률과통계")).isEqualTo(1);
        assertThat(slot(r, 2026, 2, 2)).isEqualTo("REGISTERED");
        assertThat(slot(r, 2026, 1, 2)).isEqualTo("NEEDS_SOURCE_VERIFICATION");
        // 4월 공시인데 원문 '2학기' → 보류(자동 1학기 아님)
        assertThat(linksOf("미술과")).isZero();
        // 2025 9월: 학년 미표기 → 2학기 세 칸 · 2024 9월 명시 1·3학년 → 두 칸
        for (int g : List.of(1, 2, 3)) {
            assertThat(slot(r, 2025, g, 2)).isEqualTo("REGISTERED");
        }
        assertThat(linksOf("1,3학년")).isEqualTo(2);
        assertThat(slot(r, 2024, 2, 2)).isEqualTo("NO_SOURCE_FOR_SLOT");

        String list = mvc.perform(asAdmin(get(SOURCES), OPERATOR).param("schoolId", SCHOOL)).andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> auto = JsonPath.read(list, "$.items[?(@.group == 'AUTO_ALL_GRADES')]");
        assertThat(auto).extracting(m -> String.valueOf(m.get("reason"))).containsOnly("GRADE_UNSPECIFIED_ALL_GRADES_APPLIED");
        assertThat(auto).hasSize(2);
        assertThat(JsonPath.<List<String>>read(list, "$.items[?(@.verification == 'UNCLASSIFIED')].reason")).containsExactly("SEMESTER_CONFLICT");

        // '다시 확인'(force)·재실행 → 문서·연결 증가 0
        int links = jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link", Integer.class);
        int revisions = jdbc.queryForObject("select count(*) from assessment_plan_revision", Integer.class);
        run(BODY.replace("}", ",\"force\":true}"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link", Integer.class)).isEqualTo(links);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision", Integer.class)).isEqualTo(revisions);
        // 자동 확정 없음
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision r join assessment_schoolinfo_slot_link l on l.revision_id = r.id "
                + "where r.review_status = 'CONFIRMED'", Integer.class)).isZero();
    }

    /** 부록 I: 만료·삭제된 첨부(404)는 원본으로 등록하지 않는다. 일부면 PARTIAL, 전부면 FAILED('공시 없음'과 구분) */
    @Test
    void 받지_못한_첨부는_원본이_아니고_학년도는_실패로_보인다() throws Exception {
        FAKE.chasu.put("2026:3", data(2026, 9, new Doc("2026 2학기 1학년 평가계획 " + tag + ".pdf", pdf(tag + "1")),
                new Doc("2026 2학기 2학년 평가계획 " + tag + ".pdf", pdf(tag + "2"))));
        YearData all = data(2025, 9, new Doc("2025학년도 2학기 1학년 평가계획 " + tag + ".pdf", pdf(tag + "x")));
        all.downloadStatus = 403;
        FAKE.chasu.put("2025:3", all);
        FAKE.missingSeqs.add(2);
        String r = run(BODY);
        assertThat(linksOf("1학년 평가계획 " + tag)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_source_file where file_name like 'file_%'", Integer.class)).isZero();
        assertThat(JsonPath.<List<String>>read(r, "$.unresolvedFiles[?(@.reason == 'FILE_DOWNLOAD_FAILED')].academicYear")).hasSize(2);
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[?(@.academicYear==2026)].status")).containsExactly("PARTIAL");
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[?(@.academicYear==2025)].status")).containsExactly("FAILED");
        assertThat(slot(r, 2025, 1, 2)).isNotEqualTo("REGISTERED");
    }

    @Test
    void 서버가_공시_차수_지정을_무시하면_그_차수_파일은_쓰지_않는다() throws Exception {
        FAKE.chasu.put("2026:1", data(2026, 4, new Doc("2026학년도 국어과 4월 " + tag + ".hwp", pdf(tag + "a"))));
        FAKE.chasu.put("2026:3", data(2026, 9, new Doc("2026학년도 국어과 9월 " + tag + ".hwp", pdf(tag + "b"))));
        FAKE.ignoreChasu = true;
        String r = run(BODY);
        assertThat(linksOf("4월")).isZero();
        assertThat(linksOf("9월")).as("최신 차수(9월) 파일은 2학기 세 칸").isEqualTo(3);
        assertThat(JsonPath.<List<String>>read(r, "$.unresolvedFiles[?(@.reason == 'CHASU_IGNORED')].fileName")).contains("공시 4월");
        for (int g : List.of(1, 2, 3)) {
            assertThat(slot(r, 2026, g, 1)).isNotEqualTo("REGISTERED");
        }
    }
}
