package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer.Doc;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer.YearData;
import com.learnershigh.extension.common.time.AdjustableClock;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A27-UX 부록 K: 학생 §10-1-3 공식 원본 = 학교알리미 자동 수집 원본(학교 단위 공유). FIXTURE(가상 학교알리미 · Mock 학적 school_001 1학년).
 * 학생이 관리자보다 먼저 들어와도 서버가 자동 확보하고, 학생은 본인 학적 칸 원본만 보고 내려받는다.
 */
class StudentOfficialPlanApiTest extends SchoolInfoFakeSupport {

    private static final String BASE = "/api/student/assessment/evaluation-plans/official";
    private static final String STUDENT = "stu_001";
    private static final String OPERATOR = "adm_plan_operator";

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
    void restore() throws Exception {
        clock.setDate(LocalDate.of(2026, 9, 30));
        waitIdle();
    }

    /** 같은 학교 작업(수집 + 서버 분석)이 끝날 때까지 — 학교당 작업 1개라 다음 시험이 이 작업을 돌려받지 않게 */
    void waitIdle() throws Exception {
        for (int i = 0; i < 600; i++) {
            int st = mvc.perform(asAdmin(post("/api/admin/assessment/evaluation-plans/schoolinfo-sync"), OPERATOR).contentType("application/json")
                    .content("{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2,3],\"semesters\":[1,2]}"))
                    .andReturn().getResponse().getStatus();
            if (st != 202) {
                return;
            }
            Thread.sleep(100);
        }
    }

    YearData data(int year, int month, Doc... docs) {
        YearData d = new YearData(year, docs);
        d.month = month;
        return d;
    }

    static byte[] pdf(String m) throws Exception {
        return EvaluationPlanApiTest.pdf(1, "synthetic " + m);
    }

    String ensure() throws Exception {
        return mvc.perform(asStudent(post(BASE + "/ensure"), STUDENT)).andReturn().getResponse().getContentAsString();
    }

    String ensureUntilDone() throws Exception {
        String r = ensure();
        for (int i = 0; i < 600 && "RUNNING".equals(JsonPath.read(r, "$.state")); i++) {
            Thread.sleep(100);
            r = ensure();
        }
        return r;
    }

    String official(int year, int semester) throws Exception {
        return mvc.perform(asStudent(get(BASE), STUDENT).param("academicYear", String.valueOf(year)).param("semester", String.valueOf(semester)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    static String sha(byte[] b) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b));
    }

    void twoDisclosures() throws Exception {
        FAKE.chasu.put("2026:1", data(2026, 4, new Doc("2026학년도 1학기 1학년 평가계획 " + tag + ".pdf", pdf(tag + "a")),
                new Doc("2026학년도 1학기 2학년 평가계획 " + tag + ".pdf", pdf(tag + "b"))));
        FAKE.chasu.put("2026:3", data(2026, 9, new Doc("2026 2학기 1학년 평가계획 " + tag + ".pdf", pdf(tag + "c")),
                new Doc("2026학년도 2학기 소인수교과 공동교육과정 " + tag + ".pdf", pdf(tag + "d")),
                new Doc("2026 2학기 2학년 평가계획 " + tag + ".pdf", pdf(tag + "e"))));
    }

    @Test
    void 학생이_먼저_들어와도_서버가_자동_확보하고_본인_학년_학기_원본만_보고_내려받는다() throws Exception {
        twoDisclosures();
        // 확보 전: 공급자는 연결됐지만 문서 0
        assertThat(JsonPath.<List<Object>>read(official(2026, 2), "$.documents")).isEmpty();
        assertThat(JsonPath.<Boolean>read(official(2026, 2), "$.sourceConnected")).isTrue();

        String first = mvc.perform(asStudent(post(BASE + "/ensure"), STUDENT)).andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<String>read(first, "$.state")).isEqualTo("RUNNING");
        assertThat(first).doesNotContain("candidates").doesNotContain(FAKE_ID_PREFIX);
        String done = ensureUntilDone();
        assertThat(JsonPath.<String>read(done, "$.state")).isEqualTo("READY");

        // 2학기(9월 공시): 1학년 원본 + 학년 미표기 공통 원본, 2학년 원본은 없음
        String s2 = official(2026, 2);
        assertThat(JsonPath.<Integer>read(s2, "$.grade")).isEqualTo(1);
        List<String> names2 = JsonPath.read(s2, "$.documents[*].fileName");
        assertThat(names2).containsExactlyInAnyOrder("2026 2학기 1학년 평가계획 " + tag + ".pdf", "2026학년도 2학기 소인수교과 공동교육과정 " + tag + ".pdf");
        assertThat(JsonPath.<List<Integer>>read(s2, "$.documents[*].disclosureMonth")).containsOnly(9);
        assertThat(JsonPath.<List<String>>read(s2, "$.documents[*].provider")).containsOnly("SCHOOLINFO");
        // 1학기(4월 공시): 1학년 원본만
        String s1 = official(2026, 1);
        assertThat(JsonPath.<List<String>>read(s1, "$.documents[*].fileName")).containsExactly("2026학년도 1학기 1학년 평가계획 " + tag + ".pdf");
        assertThat(JsonPath.<List<Integer>>read(s1, "$.documents[*].disclosureMonth")).containsOnly(4);
        // 학적 없는 학년도·학기: 추측 연결 없음
        assertThat(JsonPath.<Boolean>read(official(2025, 1), "$.contextFound")).isFalse();

        // 내려받기: 바이트 = 원본 SHA, 첨부·nosniff·no-store
        String id = JsonPath.<List<String>>read(s2, "$.documents[?(@.fileName =~ /2026 2학기 1학년.*/)].sourceDocumentId").getFirst();
        String recorded = JsonPath.<List<String>>read(s2, "$.documents[?(@.sourceDocumentId == '" + id + "')].sha256").getFirst();
        byte[] got = mvc.perform(asStudent(get(BASE + "/files/" + id), STUDENT).param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Cache-Control", "private, no-store"))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(sha(got)).isEqualTo(recorded).isEqualTo(sha(FAKE.chasu.get("2026:3").files.getFirst().bytes()));
        mvc.perform(asStudent(get(BASE + "/files/" + id + "/preview"), STUDENT).param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "application/pdf"));
        // 다른 칸(같은 학교 2학년)·다른 학기 지정·없는 ID → 404 (존재를 드러내지 않음)
        String other = jdbc.queryForObject("select id from assessment_schoolinfo_source_file where file_name like ?", String.class, "2026 2학기 2학년%");
        mvc.perform(asStudent(get(BASE + "/files/" + other), STUDENT).param("academicYear", "2026").param("semester", "2")).andExpect(status().isNotFound());
        mvc.perform(asStudent(get(BASE + "/files/" + id), STUDENT).param("academicYear", "2026").param("semester", "1")).andExpect(status().isNotFound());
        mvc.perform(asStudent(get(BASE + "/files/nope"), STUDENT).param("academicYear", "2026").param("semester", "2")).andExpect(status().isNotFound());
        mvc.perform(get(BASE + "/files/" + id).param("academicYear", "2026").param("semester", "2")).andExpect(status().isUnauthorized());

        // 다시 들어와도(기록 유효) 외부 요청 0 · 원본 복제 0
        int logSize = FAKE.log.size();
        int files = jdbc.queryForObject("select count(*) from assessment_schoolinfo_source_file", Integer.class);
        assertThat(JsonPath.<String>read(ensure(), "$.state")).isEqualTo("READY");
        assertThat(FAKE.log).hasSize(logSize);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_source_file", Integer.class)).isEqualTo(files);

        // 원본은 보이지만 관리자 확정 전 평가 정보(분석 결과)는 학생에게 0
        String confirmed = mvc.perform(asStudent(get("/api/student/assessment/evaluation-plans"), STUDENT).param("schoolId", "school_001")
                .param("academicYear", "2026").param("grade", "1").param("semester", "2")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(confirmed).doesNotContain(tag);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision where review_status='CONFIRMED' and plan_id in "
                + "(select plan_id from assessment_schoolinfo_slot_link)", Integer.class)).isZero();
    }

    /**
     * A28-01: 과거 학년도 학적이 없어도 현재 학교의 공개 원본을 본다(학적 칸으로 표현하지 않음). 학년을 고르면 같은 학교의 그 학년 원본.
     * 내려받기는 목록과 같은 칸 규칙으로 다시 계산한다 — 칸 밖 원본·범위 밖 학년도 404.
     */
    @Test
    void 과거_학년도는_학적이_없어도_현재_학교_공개_원본을_보고_학년을_골라도_같은_학교_원본만_내려받는다() throws Exception {
        twoDisclosures();
        FAKE.chasu.put("2025:3", data(2025, 9, new Doc("2025 2학기 1학년 평가계획 " + tag + ".pdf", pdf(tag + "p1")),
                new Doc("2025 2학기 2학년 평가계획 " + tag + ".pdf", pdf(tag + "p2"))));
        assertThat(JsonPath.<String>read(ensureUntilDone(), "$.state")).isEqualTo("READY");

        String y2025 = official(2025, 2);
        assertThat(JsonPath.<Boolean>read(y2025, "$.contextFound")).as("학적은 만들지 않는다").isFalse();
        assertThat(JsonPath.<String>read(y2025, "$.basis")).isEqualTo("SCHOOL_PUBLIC");
        assertThat(JsonPath.<String>read(y2025, "$.schoolId")).isEqualTo("school_001");
        assertThat(JsonPath.<Integer>read(y2025, "$.grade")).isEqualTo(1);
        assertThat(JsonPath.<List<String>>read(y2025, "$.documents[*].fileName")).containsExactly("2025 2학기 1학년 평가계획 " + tag + ".pdf");
        assertThat(JsonPath.<String>read(official(2026, 2), "$.basis")).isEqualTo("ACADEMIC_RECORD");

        String id1 = JsonPath.<List<String>>read(y2025, "$.documents[*].sourceDocumentId").getFirst();
        byte[] got = mvc.perform(asStudent(get(BASE + "/files/" + id1), STUDENT).param("academicYear", "2025").param("semester", "2"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(sha(got)).isEqualTo(JsonPath.<String>read(y2025, "$.documents[0].sha256"));

        // 2학년 선택: 같은 학교의 2학년 공개 원본(학적 칸 아님)
        String g2 = mvc.perform(asStudent(get(BASE), STUDENT).param("academicYear", "2025").param("semester", "2").param("grade", "2"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<String>read(g2, "$.basis")).isEqualTo("SCHOOL_PUBLIC");
        assertThat(JsonPath.<List<String>>read(g2, "$.documents[*].fileName")).containsExactly("2025 2학기 2학년 평가계획 " + tag + ".pdf");
        String id2 = JsonPath.<List<String>>read(g2, "$.documents[*].sourceDocumentId").getFirst();
        mvc.perform(asStudent(get(BASE + "/files/" + id2), STUDENT).param("academicYear", "2025").param("semester", "2").param("grade", "2"))
                .andExpect(status().isOk());
        // 학년 지정 없이(=1학년 칸) 2학년 원본 · 다른 학기 · 범위 밖 학년도 · 잘못된 학년 → 404/400
        mvc.perform(asStudent(get(BASE + "/files/" + id2), STUDENT).param("academicYear", "2025").param("semester", "2")).andExpect(status().isNotFound());
        mvc.perform(asStudent(get(BASE + "/files/" + id1), STUDENT).param("academicYear", "2025").param("semester", "1")).andExpect(status().isNotFound());
        mvc.perform(asStudent(get(BASE + "/files/" + id1), STUDENT).param("academicYear", "2023").param("semester", "2")).andExpect(status().isNotFound());
        mvc.perform(asStudent(get(BASE), STUDENT).param("academicYear", "2025").param("semester", "2").param("grade", "4")).andExpect(status().isBadRequest());
        String old = official(2023, 2);
        assertThat(JsonPath.<Object>read(old, "$.basis")).isNull();
        assertThat(JsonPath.<List<Object>>read(old, "$.documents")).isEmpty();
        // 조회만으로 외부 요청·DB 쓰기 0
        int log = FAKE.log.size();
        int files = jdbc.queryForObject("select count(*) from assessment_schoolinfo_source_file", Integer.class);
        official(2024, 1);
        official(2025, 1);
        assertThat(FAKE.log).hasSize(log);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_source_file", Integer.class)).isEqualTo(files);
    }

    @Test
    void 관리자가_지운_문서는_학생에게서도_사라지고_다시_확인해도_되살아나지_않는다_관리자_직접_업로드는_공식_원본이_아니다() throws Exception {
        twoDisclosures();
        ensureUntilDone();
        String planId = jdbc.queryForObject("select l.plan_id from assessment_schoolinfo_slot_link l join assessment_schoolinfo_source_file f on f.id = l.source_file_id "
                + "where f.file_name like ? and l.grade = 1 and l.semester = 2", String.class, "2026 2학기 1학년%");
        mvc.perform(asAdmin(delete("/api/admin/assessment/evaluation-plans/" + planId), OPERATOR).param("schoolId", "school_001").param("confirmPublished", "false"))
                .andExpect(status().isOk());
        assertThat(JsonPath.<List<String>>read(official(2026, 2), "$.documents[*].fileName")).noneMatch(n -> n.startsWith("2026 2학기 1학년"));
        // 관리자 '다시 확인'(force) 뒤에도 되살아나지 않는다
        mvc.perform(asAdmin(post("/api/admin/assessment/evaluation-plans/schoolinfo-sync"), OPERATOR).contentType("application/json")
                .content("{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2,3],\"semesters\":[1,2],\"force\":true}"));
        ensureUntilDone();
        assertThat(JsonPath.<List<String>>read(official(2026, 2), "$.documents[*].fileName")).noneMatch(n -> n.startsWith("2026 2학기 1학년"));

        // 관리자 직접 업로드(같은 학교·학년·학기)는 학생 공식 원본에 들어오지 않는다
        mvc.perform(asAdmin(multipart("/api/admin/assessment/evaluation-plans")
                        .file(new MockMultipartFile("file", "관리자 업로드 " + tag + ".pdf", "application/pdf", pdf(tag + "upload"))), OPERATOR)
                .param("schoolId", "school_001").param("academicYear", "2026").param("grade", "1").param("semester", "2"))
                .andExpect(status().isCreated());
        assertThat(official(2026, 2)).doesNotContain("관리자 업로드");
    }

    @Test
    void 같은_학교_학생이_동시에_들어와도_작업은_하나이고_같은_이름_학교는_관리자_확인_전_0건() throws Exception {
        twoDisclosures();
        ExecutorService pool = Executors.newFixedThreadPool(6);
        List<Future<String>> all = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            Callable<String> c = this::ensure;
            all.add(pool.submit(c));
        }
        for (Future<String> f : all) {
            assertThat(JsonPath.<String>read(f.get(), "$.state")).isIn("RUNNING", "READY");
        }
        pool.shutdown();
        ensureUntilDone();
        assertThat(FAKE.count("/ei/ss/Pneiss_f01_l0.do")).as("학교 검색 1회 = 작업 1개").isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) - count(distinct sha256) from assessment_schoolinfo_source_file", Integer.class)).isZero();

        // 같은 이름 학교 2곳(학교 선택 없음) → 학생은 '학교 확인 필요', 등록 0
        // (앞 작업이 서버 분석까지 끝나야 학교당 작업 1개 규칙으로 새 작업이 시작된다 — 관리자 확인이 202 가 아닐 때까지 기다린다)
        for (int i = 0; i < 600; i++) {
            int st = mvc.perform(asAdmin(post("/api/admin/assessment/evaluation-plans/schoolinfo-sync"), OPERATOR).contentType("application/json")
                    .content("{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2,3],\"semesters\":[1,2]}"))
                    .andReturn().getResponse().getStatus();
            if (st != 202) {
                break;
            }
            Thread.sleep(100);
        }
        reset();
        twoDisclosures();
        FAKE.searchIds = List.of("0b9c5a4e-aaaa-4222-8333-0000000000a1", "0b9c5a4e-bbbb-4222-8333-0000000000b2");
        FAKE.schools.put("0b9c5a4e-aaaa-4222-8333-0000000000a1", new String[] {"예시고등학교", "가상특별시 가상구 가상로 1"});
        FAKE.schools.put("0b9c5a4e-bbbb-4222-8333-0000000000b2", new String[] {"예시고등학교", "가상광역시 시험구 시험로 2"});
        String r = ensureUntilDone();
        assertThat(JsonPath.<String>read(r, "$.state")).as(r).isEqualTo("SCHOOL_CONFIRMATION_REQUIRED");
        assertThat(r).doesNotContain("가상구").doesNotContain("0b9c5a4e");
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link", Integer.class)).isZero();
        assertThat(JsonPath.<List<Object>>read(official(2026, 2), "$.documents")).isEmpty();
    }

    @Test
    void 학교알리미_연결_실패는_FAILED_이고_공시_없음으로_보이지_않으며_다음_진입_때_다시_시도한다() throws Exception {
        FAKE.searchStatus = 503;
        String r = ensureUntilDone();
        assertThat(JsonPath.<String>read(r, "$.state")).as(r).isEqualTo("FAILED");
        assertThat(JsonPath.<List<String>>read(r, "$.years[*].status")).as(r).doesNotContain("NOT_PUBLISHED");
        int searches = (int) FAKE.count("/ei/ss/Pneiss_f01_l0.do");
        FAKE.searchStatus = 200;
        twoDisclosures();
        // 실패 캐시: 5분 안의 다시 진입은 새 작업 없이 같은 FAILED (학교알리미 요청 0)
        assertThat(JsonPath.<String>read(ensure(), "$.state")).isEqualTo("FAILED");
        assertThat(FAKE.count("/ei/ss/Pneiss_f01_l0.do")).isEqualTo(searches);
        clock.setDate(LocalDate.of(2026, 10, 1));
        String again = ensureUntilDone();
        assertThat(JsonPath.<String>read(again, "$.state")).as(again).isEqualTo("READY");
        assertThat(FAKE.count("/ei/ss/Pneiss_f01_l0.do")).isGreaterThan(searches);
        assertThat(JsonPath.<List<Object>>read(official(2026, 2), "$.documents")).isNotEmpty();
    }

    /** 부록 L: 관리자 '학생 화면 보기' — 학생과 같은 공식 원본 목록·바이트, 읽기 전용(자동 확보·외부 요청·DB 쓰기 0), 담당 밖 404 */
    @Test
    void 관리자_학생_화면_보기는_같은_공식_원본을_읽기만_하고_담당_밖은_404() throws Exception {
        twoDisclosures();
        ensureUntilDone();
        waitIdle();
        String view = "/api/admin/assessment/students/" + STUDENT + "/student-view/evaluation-plans/official";
        int log = FAKE.log.size();
        int files = jdbc.queryForObject("select count(*) from assessment_schoolinfo_source_file", Integer.class);
        int links = jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link", Integer.class);
        String student = official(2026, 2);
        String admin = mvc.perform(asAdmin(get(view), "adm_gangnam").param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(admin, "$.documents[*].sourceDocumentId"))
                .isEqualTo(JsonPath.<List<String>>read(student, "$.documents[*].sourceDocumentId")).isNotEmpty();
        String id = JsonPath.<List<String>>read(admin, "$.documents[*].sourceDocumentId").getFirst();
        String recorded = JsonPath.read(admin, "$.documents[0].sha256");
        byte[] got = mvc.perform(asAdmin(get(view + "/files/" + id), "adm_gangnam").param("academicYear", "2026").param("semester", "2"))
                .andExpect(status().isOk()).andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(sha(got)).isEqualTo(recorded);
        // 다른 칸 원본 404 · 담당 지점 밖 관리자 404 · 자동 확보(POST)는 학생 화면 보기에 없다
        String other = jdbc.queryForObject("select id from assessment_schoolinfo_source_file where file_name like ?", String.class, "2026 2학기 2학년%");
        mvc.perform(asAdmin(get(view + "/files/" + other), "adm_gangnam").param("academicYear", "2026").param("semester", "2")).andExpect(status().isNotFound());
        mvc.perform(asAdmin(get(view), "adm_bundang").param("academicYear", "2026").param("semester", "2")).andExpect(status().isNotFound());
        mvc.perform(asAdmin(get(view + "/files/" + id), "adm_bundang").param("academicYear", "2026").param("semester", "2")).andExpect(status().isNotFound());
        int ensureStatus = mvc.perform(asAdmin(post(view + "/ensure"), "adm_gangnam")).andReturn().getResponse().getStatus();
        assertThat(ensureStatus).as("학생 화면 보기에는 자동 확보 POST 가 없다").isIn(404, 405);
        assertThat(FAKE.log).as("학교알리미 요청 0").hasSize(log);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_source_file", Integer.class)).isEqualTo(files);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link", Integer.class)).isEqualTo(links);
    }

    private static final String FAKE_ID_PREFIX = "0b9c5a4e";
}
