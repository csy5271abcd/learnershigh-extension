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
 * 부록 H — LIVE-derived Fixture. 2026-11-20 실측에서 본 검색 화면 구조를 재현한다:
 * '한빛고등학교' 검색 첫 화면은 고등학교 4곳 중 2곳(대전한빛·위례한빛)만 보이고 '고등학교(4) 더보기'(SEARCH_MODE=3)로 나머지를 숨긴다.
 * 나머지 두 곳이 이름이 정확히 같은 파주·담양 한빛고등학교였다. 학업 Context 학교 이름(Mock: 예시고등학교)에 맞춰 이름은 바꿨고,
 * 구조(첫 화면 2곳·더보기·동명 2곳·이름 일부만 같은 2곳)와 시군구만 실측에서 가져왔다. 학교 ID·주소 번지·파일은 가상 값이다.
 */
class SchoolInfoLiveDerivedSearchApiTest extends SchoolInfoFakeSupport {

    private static final String SYNC = "/api/admin/assessment/evaluation-plans/schoolinfo-sync";
    private static final String OPERATOR = "adm_plan_operator";
    private static final String SCHOOL = "school_001";
    private static final String BODY = "{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2,3],\"semesters\":[1,2]}";
    private static final String DAEJEON = "0b9c5a4e-1111-4222-8333-000000000011";
    private static final String WIRYE = "0b9c5a4e-2222-4222-8333-000000000012";
    private static final String PAJU = "0b9c5a4e-3333-4222-8333-000000000013";
    private static final String DAMYANG = "0b9c5a4e-4444-4222-8333-000000000014";

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    AdjustableClock clock;
    String tag;

    @BeforeEach
    void reset() {
        FAKE.reset();
        FAKE.schoolName = "예시고등학교";
        clock.setDate(LocalDate.of(2026, 9, 30));
        jdbc.update("delete from assessment_schoolinfo_classification");
        jdbc.update("delete from assessment_schoolinfo_school_mapping");
        jdbc.update("delete from assessment_schoolinfo_slot_link");
        jdbc.update("delete from assessment_schoolinfo_source_file");
        jdbc.update("delete from assessment_schoolinfo_sync_year");
        tag = Long.toString(System.nanoTime(), 36);
        FAKE.realSearchMarkup = true;
        FAKE.realAddressMarkup = true;
        FAKE.searchIds = List.of(DAEJEON, WIRYE, PAJU, DAMYANG);
        FAKE.schools.put(DAEJEON, new String[] {"대전예시고등학교", "대전광역시 중구 가상로 1"});
        FAKE.schools.put(WIRYE, new String[] {"위례예시고등학교", "경기도 성남시 가상로 2"});
        FAKE.schools.put(PAJU, new String[] {"예시고등학교", "경기도 파주시 한빛로 36"});
        FAKE.schools.put(DAMYANG, new String[] {"예시고등학교", "전남광주통합특별시 담양군 가상로 3"});
    }

    @AfterEach
    void restore() {
        clock.setDate(LocalDate.of(2026, 9, 30));
    }

    YearData april(int year, Doc... docs) {
        YearData d = new YearData(year, docs);
        d.month = 4;
        return d;
    }

    String start() throws Exception {
        return mvc.perform(asAdmin(post(SYNC), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().is(202)).andReturn().getResponse().getContentAsString();
    }

    String waitDone(String jobId) throws Exception {
        String r = null;
        for (int i = 0; i < 600; i++) {
            r = mvc.perform(asAdmin(get(SYNC + "/" + jobId), OPERATOR)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            if (!"RUNNING".equals(JsonPath.read(r, "$.state"))) {
                return r;
            }
            Thread.sleep(100);
        }
        throw new AssertionError(r);
    }

    int links() {
        return jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link where school_id=?", Integer.class, SCHOOL);
    }

    @Test
    void 검색_첫_화면에_숨은_고등학교까지_읽어_파주_한빛고를_고르고_그_학교_4월_원본만_1학기에_등록한다() throws Exception {
        FAKE.yearsBySchool.put(PAJU, Map.of(2026, april(2026, new Doc("1. 2026학년도 1학년 1학기 교수학습 및 평가운영계획 " + tag + ".hwp", pdf(tag + "p1")))));
        FAKE.yearsBySchool.put(DAMYANG, Map.of(2026, april(2026, new Doc("2026학년도 2학년 1학기 담양 " + tag + ".hwp", pdf(tag + "d")))));
        FAKE.yearsBySchool.put(DAEJEON, Map.of(2026, april(2026, new Doc("2026학년도 3학년 1학기 대전 " + tag + ".hwp", pdf(tag + "j")))));
        String first = waitDone(JsonPath.read(start(), "$.jobId"));
        assertThat(FAKE.log).as("고등학교 더보기 목록을 한 번 더 받는다").contains("search SEARCH_MODE=", "search SEARCH_MODE=3");
        assertThat(JsonPath.<String>read(first, "$.schoolSelection.reason")).isEqualTo("SAME_NAME_CANDIDATES");
        assertThat(JsonPath.<List<String>>read(first, "$.schoolSelection.candidates[*].sigungu")).containsExactlyInAnyOrder("파주시", "담양군");
        assertThat(first).doesNotContain("대전예시").doesNotContain("위례예시");
        assertThat(FAKE.count("/ei/pp/")).as("고르기 전 평가계획 조회 0").isZero();
        assertThat(links()).isZero();

        List<String> paju = JsonPath.read(first, "$.schoolSelection.candidates[?(@.sigungu == '파주시')].candidateId");
        String chosen = mvc.perform(asAdmin(post(SYNC + "/school-selection"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"schoolId\":\"school_001\",\"jobId\":\"" + JsonPath.read(first, "$.jobId") + "\",\"candidateId\":\"" + paju.getFirst() + "\",\"expectedVersion\":0}"))
                .andExpect(status().is(202)).andReturn().getResponse().getContentAsString();
        String done = waitDone(JsonPath.read(chosen, "$.jobId"));
        List<String> names = jdbc.queryForList("select file_name from assessment_schoolinfo_source_file where school_id=?", String.class, SCHOOL);
        assertThat(names).hasSize(1).allMatch(n -> n.contains("1학년 1학기 교수학습"));
        assertThat(JsonPath.<List<String>>read(done, "$.slotStatuses[?(@.academicYear==2026 && @.grade==1 && @.semester==1)].status")).containsExactly("REGISTERED");
        assertThat(links()).isEqualTo(1);
        assertThat(FAKE.log).noneMatch(l -> l.contains("/servlets/") && (l.contains(DAMYANG) || l.contains(DAEJEON)));
        assertThat(jdbc.queryForObject("select schoolinfo_school_id from assessment_schoolinfo_school_mapping where school_id=?", String.class, SCHOOL)).isEqualTo(PAJU);
    }

    @Test
    void 고등학교_목록을_건수만큼_다_읽지_못하면_학교를_고르지_않고_등록_0() throws Exception {
        FAKE.highListLimit = 3;
        FAKE.yearsBySchool.put(PAJU, Map.of(2026, april(2026, new Doc("2026학년도 1학년 1학기 " + tag + ".hwp", pdf(tag + "x")))));
        String r = waitDone(JsonPath.read(start(), "$.jobId"));
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[*].status")).containsOnly("SCHOOL_AMBIGUOUS");
        assertThat(JsonPath.<String>read(r, "$.schoolSelection.reason")).isEqualTo("TOO_MANY_CANDIDATES");
        assertThat(FAKE.count("/ei/ss/Pneiss_b01_s0.do")).as("일부 후보로 학교를 고르지 않는다").isZero();
        assertThat(FAKE.count("/ei/pp/")).isZero();
        assertThat(links()).isZero();
    }

    static byte[] pdf(String m) throws IOException {
        return EvaluationPlanApiTest.pdf(1, "synthetic " + m);
    }
}
