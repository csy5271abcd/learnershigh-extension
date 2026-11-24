package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.common.time.AdjustableClock;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A28-04: 시연 명단이 학교알리미 학교(고유 ID·주소)를 고정한 학교는 이름 검색 없이 그 학교만 확인한다.
 * 부산 경일고(동명 4곳 + 창원경일고)처럼 이름만으로는 고를 수 없는 학교가 대상이다. 고정값과 학교알리미의 이름·주소가 다르면 수집하지 않는다.
 * 가상 학교알리미(127.0.0.1)만 쓴다.
 */
@TestPropertySource(properties = "assessment.demo-roster.enabled=true")
class SchoolInfoRosterPinApiTest extends SchoolInfoFakeSupport {

    static final String BASE = "/api/admin/assessment/evaluation-plans/schoolinfo-sync";
    static final String PINNED = "a0e95c21-74c7-4d65-b7f1-a8a0eb951342";
    static final String OTHER = "e154002c-4ba7-45dd-8a51-394ef3a031de";
    static final String BODY = "{\"schoolId\":\"sch_demo_gyeongil\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2,3],\"semesters\":[1,2]}";

    @Autowired
    com.learnershigh.extension.assessment.service.plan.SchoolInfoSyncService syncWorker;

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    AdjustableClock clock;

    @BeforeEach
    void reset() {
        // A28-42: 이전 시험이 남긴 학교알리미 동기화·분석 작업이 끝난 뒤 공유 가상 서버·DB 를 초기화한다(간헐 실패 원인)
        org.assertj.core.api.Assertions.assertThat(syncWorker.awaitIdle(java.time.Duration.ofSeconds(120))).as("sync worker idle").isTrue();
        FAKE.reset();
        FAKE.schoolName = "경일고등학교";
        FAKE.searchIds = List.of(OTHER, PINNED);
        FAKE.schools.put(OTHER, new String[] {"경일고등학교", "서울특별시 성동구 성수일로 27"});
        clock.setDate(LocalDate.of(2026, 9, 30));
        jdbc.update("delete from assessment_schoolinfo_classification");
        jdbc.update("delete from assessment_schoolinfo_school_mapping");
        jdbc.update("delete from assessment_schoolinfo_slot_link");
        jdbc.update("delete from assessment_schoolinfo_source_file");
        jdbc.update("delete from assessment_schoolinfo_sync_year");
    }

    String syncUntilDone() throws Exception {
        String r = "";
        for (int i = 0; i < 600; i++) {
            r = mvc.perform(asAdmin(post(BASE), "adm_plan_operator").contentType("application/json").content(BODY))
                    .andReturn().getResponse().getContentAsString();
            if (!"RUNNING".equals(JsonPath.read(r, "$.state"))) {
                return r;
            }
            Thread.sleep(100);
        }
        return r;
    }

    @Test
    void 고정한_학교알리미_학교만_확인하고_동명_검색을_하지_않는다() throws Exception {
        FAKE.schools.put(PINNED, new String[] {"경일고등학교", "부산광역시 강서구 영강길 153-42"});
        String r = syncUntilDone();
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[*].status")).as(r).doesNotContain("SCHOOL_AMBIGUOUS", "QUEUED", "FETCHING");
        assertThat(FAKE.count("/ei/ss/Pneiss_f01_l0.do")).as("이름 검색 0회").isZero();
        assertThat(FAKE.count("/ei/ss/Pneiss_b01_s0.do")).as("고정 학교 상세 확인").isPositive();
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_school_mapping", Integer.class)).as("관리자 매핑을 만들지 않는다").isZero();
    }

    @Test
    void 고정값과_학교알리미_주소가_다르면_수집하지_않고_보류한다() throws Exception {
        FAKE.schools.put(PINNED, new String[] {"경일고등학교", "부산광역시 강서구 다른길 1"});
        String r = syncUntilDone();
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[*].status")).as(r).containsOnly("SCHOOL_AMBIGUOUS");
        assertThat(FAKE.count("/ei/ss/Pneiss_f01_l0.do")).isZero();
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link", Integer.class)).isZero();
    }
}
