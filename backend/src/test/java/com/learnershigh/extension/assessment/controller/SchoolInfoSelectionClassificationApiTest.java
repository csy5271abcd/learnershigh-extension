package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer.Doc;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer.YearData;
import com.learnershigh.extension.common.time.AdjustableClock;
import java.io.IOException;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * §38-13 동명 학교 선택 · §38-14 분류하지 못한 원본의 학년·학기 분류 (A27-UX 부록 F). 가상 학교알리미(127.0.0.1)만 — 실제 학교알리미 접속 없음.
 * 학교·주소는 모두 가상 값이다(실제 학교·주소 아님). 기준일 2026-09-30(KST) → [2026, 2025, 2024].
 */
class SchoolInfoSelectionClassificationApiTest extends SchoolInfoFakeSupport {

    private static final String SYNC = "/api/admin/assessment/evaluation-plans/schoolinfo-sync";
    private static final String SOURCES = "/api/admin/assessment/evaluation-plans/schoolinfo-sources";
    private static final String OPERATOR = "adm_plan_operator";
    private static final String SCHOOL = "school_001";
    private static final String BODY = "{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2,3],\"semesters\":[1,2]}";
    private static final String A = "0b9c5a4e-aaaa-4222-8333-000000000001";
    private static final String B = "0b9c5a4e-bbbb-4222-8333-000000000002";
    private static final String C = "0b9c5a4e-cccc-4222-8333-000000000003";
    private static final String D = "0b9c5a4e-dddd-4222-8333-000000000004";

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
    void restoreClock() {
        clock.setDate(LocalDate.of(2026, 9, 30));
    }

    static byte[] pdf(String marker) throws IOException {
        return EvaluationPlanApiTest.pdf(1, "synthetic " + marker);
    }

    String ensure(int expectStatus) throws Exception {
        return mvc.perform(asAdmin(post(SYNC), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().is(expectStatus)).andReturn().getResponse().getContentAsString();
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
        throw new AssertionError("작업이 끝나지 않음: " + r);
    }

    String select(String jobId, String candidateId, long expectedVersion, String schoolId, int expectStatus) throws Exception {
        return mvc.perform(asAdmin(post(SYNC + "/school-selection"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"schoolId\":\"" + schoolId + "\",\"jobId\":\"" + jobId + "\",\"candidateId\":\"" + candidateId
                                + "\",\"expectedVersion\":" + expectedVersion + "}"))
                .andExpect(status().is(expectStatus)).andReturn().getResponse().getContentAsString();
    }

    int links() {
        return jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link where school_id=?", Integer.class, SCHOOL);
    }

    static String candidate(String r, String sido) {
        List<String> ids = JsonPath.read(r, "$.schoolSelection.candidates[?(@.sido == '" + sido + "')].candidateId");
        assertThat(ids).hasSize(1);
        return ids.getFirst();
    }

    /** 이름이 같은 가상 학교 A(가상특별시)·B(가상광역시) — 학년도 자료도 학교마다 다르다 */
    void twoSameName() throws IOException {
        FAKE.searchIds = List.of(A, B);
        FAKE.schools.put(A, new String[] {"예시고등학교", "가상특별시 가상구 가상로 1"});
        FAKE.schools.put(B, new String[] {"예시고등학교", "가상광역시 시험구 시험로 2"});
        FAKE.yearsBySchool.put(A, Map.of(2026, new YearData(2026, new Doc("2026학년도 1학년 1학기 A학교 " + tag + ".pdf", pdf(tag + "A")))));
        FAKE.yearsBySchool.put(B, Map.of(2026, new YearData(2026, new Doc("2026학년도 1학년 1학기 B학교 " + tag + ".pdf", pdf(tag + "B"))),
                2025, new YearData(2025, new Doc("2025학년도 2학년 2학기 B학교 " + tag + ".pdf", pdf(tag + "B25")))));
    }

    @Test
    void 동명_학교는_지역_주소를_보여_주고_관리자가_고른_학교의_원본만_등록한다() throws Exception {
        twoSameName();
        String first = waitDone(JsonPath.read(ensure(202), "$.jobId"));
        assertThat(JsonPath.<List<String>>read(first, "$.yearStatuses[*].status")).containsOnly("SCHOOL_AMBIGUOUS");
        assertThat(JsonPath.<Boolean>read(first, "$.schoolSelection.required")).isTrue();
        assertThat(JsonPath.<String>read(first, "$.schoolSelection.reason")).isEqualTo("SAME_NAME_CANDIDATES");
        assertThat(JsonPath.<List<Boolean>>read(first, "$.schoolSelection.candidates[*].selectable")).containsExactly(true, true);
        assertThat(JsonPath.<List<String>>read(first, "$.schoolSelection.candidates[*].sigungu")).containsExactlyInAnyOrder("가상구", "시험구");
        assertThat(first).as("학교알리미 학교 ID 를 화면에 주지 않는다").doesNotContain(A).doesNotContain(B);
        assertThat(links()).isZero();
        assertThat(FAKE.count("/ei/pp/")).as("고르기 전에는 어느 학교의 평가계획도 받지 않는다").isZero();

        String jobId = JsonPath.read(first, "$.jobId");
        String chosen = select(jobId, candidate(first, "가상광역시"), 0, SCHOOL, 202);
        String done = waitDone(JsonPath.read(chosen, "$.jobId"));
        assertThat(JsonPath.<String>read(done, "$.schoolSelection.selected.sido")).isEqualTo("가상광역시");
        assertThat(JsonPath.<Boolean>read(done, "$.schoolSelection.required")).isFalse();
        assertThat(JsonPath.<List<String>>read(done, "$.yearStatuses[?(@.academicYear==2026)].status")).containsExactly("COMPLETED");
        List<String> names = jdbc.queryForList("select file_name from assessment_schoolinfo_source_file where school_id=?", String.class, SCHOOL);
        assertThat(names).allMatch(n -> n.contains("B학교")).hasSize(2);
        assertThat(links()).isEqualTo(2);
        assertThat(FAKE.log).as("다른 후보(A)의 평가계획 항목은 받지 않는다").noneMatch(l -> l.contains("/servlets/") && l.contains(A));
        assertThat(jdbc.queryForObject("select schoolinfo_school_id from assessment_schoolinfo_school_mapping where school_id=?", String.class, SCHOOL))
                .isEqualTo(B);

        // 다음 확인부터는 검색 대신 고른 학교를 바로 확인한다(TTL 지난 뒤)
        FAKE.log.clear();
        clock.setDate(LocalDate.of(2026, 10, 3));
        waitDone(JsonPath.read(ensure(202), "$.jobId"));
        assertThat(FAKE.log).noneMatch(l -> l.startsWith("/ei/ss/Pneiss_f01_l0.do"));
        assertThat(links()).as("같은 원본 재수집 → 중복 0").isEqualTo(2);
    }

    @Test
    void 주소가_없거나_같은_후보는_고를_수_없고_잘못된_후보_다른_학교_작업은_409() throws Exception {
        FAKE.searchIds = List.of(A, B, C, D);
        FAKE.schools.put(A, new String[] {"예시고등학교", "가상특별시 가상구 가상로 1"});
        FAKE.schools.put(B, new String[] {"예시고등학교", "가상특별시 시험구 시험로 2"});
        FAKE.schools.put(C, new String[] {"예시고등학교", null});
        FAKE.schools.put(D, new String[] {"예시고등학교", "가상특별시 시험구 시험로 2"});
        String r = waitDone(JsonPath.read(ensure(202), "$.jobId"));
        List<Map<String, Object>> cands = JsonPath.read(r, "$.schoolSelection.candidates");
        assertThat(cands).hasSize(4);
        assertThat(cands.stream().filter(c -> Boolean.TRUE.equals(c.get("selectable")))).hasSize(1);
        assertThat(cands.stream().map(c -> c.get("unselectableReason"))).containsExactlyInAnyOrder(null, "ADDRESS_MISSING", "ADDRESS_DUPLICATE", "ADDRESS_DUPLICATE");
        String jobId = JsonPath.read(r, "$.jobId");
        String missing = (String) cands.stream().filter(c -> "ADDRESS_MISSING".equals(c.get("unselectableReason"))).findFirst().orElseThrow().get("candidateId");
        String ok = (String) cands.stream().filter(c -> Boolean.TRUE.equals(c.get("selectable"))).findFirst().orElseThrow().get("candidateId");
        assertThat(JsonPath.<String>read(select(jobId, missing, 0, SCHOOL, 409), "$.code")).isEqualTo("SCHOOLINFO_SELECTION_INVALID");
        assertThat(JsonPath.<String>read(select(jobId, "cand_forged", 0, SCHOOL, 409), "$.code")).isEqualTo("SCHOOLINFO_SELECTION_INVALID");
        assertThat(JsonPath.<String>read(select(jobId, A, 0, SCHOOL, 409), "$.code")).as("학교알리미 ID 를 직접 보내도 안 된다").isEqualTo("SCHOOLINFO_SELECTION_INVALID");
        assertThat(JsonPath.<String>read(select(jobId, ok, 0, "school_other", 409), "$.code")).as("다른 학교 작업").isEqualTo("SCHOOLINFO_SELECTION_INVALID");
        select("schoolinfo_sync_unknown", ok, 0, SCHOOL, 404);
        assertThat(links()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_school_mapping", Integer.class)).isZero();
    }

    @Test
    void 동시에_같은_후보를_두_번_골라도_선택은_하나이고_다른_후보로_바꾸려면_최신_버전이_필요하다() throws Exception {
        twoSameName();
        String r = waitDone(JsonPath.read(ensure(202), "$.jobId"));
        String jobId = JsonPath.read(r, "$.jobId");
        String b = candidate(r, "가상광역시");
        String a = candidate(r, "가상특별시");
        CompletableFuture<Integer> one = CompletableFuture.supplyAsync(() -> code(jobId, b, 0));
        CompletableFuture<Integer> two = CompletableFuture.supplyAsync(() -> code(jobId, b, 0));
        assertThat(List.of(one.get(), two.get())).allMatch(c -> c == 200 || c == 202);
        assertThat(jdbc.queryForObject("select version from assessment_schoolinfo_school_mapping where school_id=?", Long.class, SCHOOL)).isEqualTo(1L);
        assertThat(JsonPath.<String>read(select(jobId, a, 0, SCHOOL, 409), "$.code")).isEqualTo("SCHOOLINFO_SELECTION_CONFLICT");
        assertThat(jdbc.queryForObject("select schoolinfo_school_id from assessment_schoolinfo_school_mapping where school_id=?", String.class, SCHOOL))
                .isEqualTo(B);
        // 선택 직후 시작된 그 학교 작업이 끝날 때까지 기다린다(다음 시험이 진행 중 작업을 재사용하지 않게)
        String running = mvc.perform(asAdmin(post(SYNC), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andReturn().getResponse().getContentAsString();
        waitDone(JsonPath.read(running, "$.jobId"));
    }

    int code(String jobId, String cand, long version) {
        try {
            return mvc.perform(asAdmin(post(SYNC + "/school-selection"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"schoolId\":\"school_001\",\"jobId\":\"" + jobId + "\",\"candidateId\":\"" + cand + "\",\"expectedVersion\":" + version + "}"))
                    .andReturn().getResponse().getStatus();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void 고른_학교의_주소가_바뀌면_선택을_무효로_하고_등록하지_않는다() throws Exception {
        twoSameName();
        String r = waitDone(JsonPath.read(ensure(202), "$.jobId"));
        waitDone(JsonPath.read(select(JsonPath.read(r, "$.jobId"), candidate(r, "가상광역시"), 0, SCHOOL, 202), "$.jobId"));
        int before = links();
        FAKE.schools.put(B, new String[] {"예시고등학교", "가상광역시 다른구 다른로 9"});
        FAKE.yearsBySchool.put(B, Map.of(2026, new YearData(2026, new Doc("2026학년도 3학년 2학기 B학교 새 " + tag + ".pdf", pdf(tag + "Bnew")))));
        clock.setDate(LocalDate.of(2026, 10, 3));
        String after = waitDone(JsonPath.read(ensure(202), "$.jobId"));
        assertThat(JsonPath.<String>read(after, "$.schoolSelection.reason")).isEqualTo("MAPPING_CHANGED");
        assertThat(JsonPath.<List<String>>read(after, "$.yearStatuses[*].status")).containsOnly("SCHOOL_AMBIGUOUS");
        assertThat(jdbc.queryForObject("select status from assessment_schoolinfo_school_mapping where school_id=?", String.class, SCHOOL)).isEqualTo("INVALIDATED");
        assertThat(links()).isEqualTo(before);
    }

    @Test
    void 관리자가_다시_확인을_누르면_TTL_과_무관하게_다시_확인하고_화면_진입은_기록을_재사용한다() throws Exception {
        FAKE.years.put(2026, new YearData(2026, new Doc("2026학년도 1학년 1학기 " + tag + ".pdf", pdf(tag + "f"))));
        waitDone(JsonPath.read(ensure(202), "$.jobId"));
        long items = FAKE.count("/ei/pp/");
        ensure(200);
        assertThat(FAKE.count("/ei/pp/")).as("진입·새로고침은 TTL 재사용").isEqualTo(items);
        String forced = mvc.perform(asAdmin(post(SYNC), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(BODY.replace("}", ",\"force\":true}")))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        waitDone(JsonPath.read(forced, "$.jobId"));
        assertThat(FAKE.count("/ei/pp/")).as("'다시 확인'은 세 학년도를 다시 받는다").isEqualTo(items + 3);
        assertThat(links()).as("같은 원본 → 중복 0").isEqualTo(1);
    }

    @Test
    void 여러_곳이_검색돼도_이름이_같은_학교가_하나면_선택_없이_그_학교를_쓴다() throws Exception {
        FAKE.searchIds = List.of(A, B);
        FAKE.schools.put(A, new String[] {"예시여자고등학교", "가상특별시 가상구 가상로 1"});
        FAKE.schools.put(B, new String[] {"예시고등학교", "가상광역시 시험구 시험로 2"});
        FAKE.yearsBySchool.put(B, Map.of(2026, new YearData(2026, new Doc("2026학년도 1학년 1학기 B학교 " + tag + ".pdf", pdf(tag + "B")))));
        String r = waitDone(JsonPath.read(ensure(202), "$.jobId"));
        Object selection = JsonPath.using(com.jayway.jsonpath.Configuration.defaultConfiguration()
                .addOptions(com.jayway.jsonpath.Option.SUPPRESS_EXCEPTIONS)).parse(r).read("$.schoolSelection");
        assertThat(selection).as("선택 창이 필요 없다").isNull();
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[?(@.academicYear==2026)].status")).containsExactly("COMPLETED");
        assertThat(links()).isEqualTo(1);
    }

    // ---------------------------------------------------------------- §38-14

    void classificationFixture() throws IOException {
        FAKE.years.put(2025, new YearData(2025,
                new Doc("2025학년도 교과별 평가계획(통합) " + tag + ".pdf", pdf(tag + "unc")),
                new Doc("평가계획 안내 " + tag + ".pdf", pdf(tag + "none"))));
        FAKE.years.put(2024, new YearData(2026, new Doc("2026학년도 1학년 1학기 " + tag + ".pdf", pdf(tag + "mis"))));
    }

    String sources() throws Exception {
        return mvc.perform(asAdmin(get(SOURCES), OPERATOR).param("schoolId", SCHOOL)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    String classify(String id, String body, int expectStatus) throws Exception {
        return mvc.perform(asAdmin(put(SOURCES + "/" + id + "/classification"), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(expectStatus)).andReturn().getResponse().getContentAsString();
    }

    static String idOf(String list, String verification) {
        List<String> ids = JsonPath.read(list, "$.items[?(@.verification == '" + verification + "')].sourceFileId");
        assertThat(ids).hasSize(1);
        return ids.getFirst();
    }

    @Test
    void 출처_학년도가_확인된_미분류_원본만_관리자가_여러_칸에_분류하고_이력이_쌓인다() throws Exception {
        classificationFixture();
        String r = waitDone(JsonPath.read(ensure(202), "$.jobId"));
        // A28-43~47: CI 에서 간헐적으로 아래 YEAR_MISMATCH 단언만 실패한다(원인 미확정). 실패 때 작업 응답·원본 목록·가상 서버 요청 기록을 남긴다
        String diag = "job=" + r + " | sources=" + sources() + " | fakeLog=" + FAKE.log;
        assertThat(JsonPath.<List<String>>read(r, "$.unresolvedFiles[?(@.status=='UNCLASSIFIED')].group")).as(diag).containsExactly("CLASSIFICATION");
        assertThat(JsonPath.<List<String>>read(r, "$.unresolvedFiles[?(@.status=='YEAR_MISMATCH')].group")).as(diag).containsExactly("SOURCE_VERIFICATION");
        String list = sources();
        String unc = idOf(list, "UNCLASSIFIED");
        String needs = idOf(list, "NEEDS_SOURCE_VERIFICATION");
        String mis = idOf(list, "YEAR_MISMATCH");
        assertThat(JsonPath.<List<Boolean>>read(list, "$.items[?(@.verification == 'UNCLASSIFIED')].classifiable")).containsExactly(true);
        assertThat(JsonPath.<List<Boolean>>read(list, "$.items[?(@.verification != 'UNCLASSIFIED')].classifiable")).containsOnly(false);

        // 원본 내려받기: 같은 SHA · 다른 학교면 404
        byte[] original = mvc.perform(asAdmin(get(SOURCES + "/" + unc + "/file"), OPERATOR).param("schoolId", SCHOOL))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(original)))
                .isEqualTo(JsonPath.<List<String>>read(list, "$.items[?(@.verification == 'UNCLASSIFIED')].sha256").getFirst());
        mvc.perform(asAdmin(get(SOURCES + "/" + unc + "/file"), OPERATOR).param("schoolId", "school_other")).andExpect(status().isNotFound());

        // 출처·학년도 확인 안 된 원본은 학년·학기를 골라도 등록 0
        String badNeeds = classify(needs, "{\"schoolId\":\"school_001\",\"academicYear\":2025,\"grades\":[1],\"semesters\":[1],\"expectedVersion\":0}", 409);
        assertThat(JsonPath.<String>read(badNeeds, "$.code")).isEqualTo("SCHOOLINFO_SOURCE_NOT_CLASSIFIABLE");
        assertThat(JsonPath.<String>read(badNeeds, "$.details.reason")).isEqualTo("NEEDS_SOURCE_VERIFICATION");
        classify(mis, "{\"schoolId\":\"school_001\",\"academicYear\":2024,\"grades\":[1],\"semesters\":[1],\"expectedVersion\":0}", 409);
        // 2025 원본을 2026 칸에 넣을 수 없다
        String wrongYear = classify(unc, "{\"schoolId\":\"school_001\",\"academicYear\":2026,\"grades\":[1],\"semesters\":[1],\"expectedVersion\":0}", 409);
        assertThat(JsonPath.<String>read(wrongYear, "$.details.reason")).isEqualTo("ACADEMIC_YEAR_DIFFERS");
        classify(unc, "{\"schoolId\":\"school_001\",\"academicYear\":2025,\"grades\":[4],\"semesters\":[1],\"expectedVersion\":0}", 400);
        classify(unc, "{\"schoolId\":\"school_001\",\"academicYear\":2025,\"grades\":[1],\"semesters\":[],\"expectedVersion\":0}", 400);
        classify(unc, "{\"schoolId\":\"school_other\",\"academicYear\":2025,\"grades\":[1],\"semesters\":[1],\"expectedVersion\":0}", 404);
        assertThat(links()).isZero();

        // 분류: 고1·고2 × 1학기 → 두 칸에 등록(원본 하나)
        String v1 = classify(unc, "{\"schoolId\":\"school_001\",\"academicYear\":2025,\"grades\":[2,1],\"semesters\":[1],\"note\":\"목차 3쪽 1학기\",\"expectedVersion\":0}", 200);
        assertThat(JsonPath.<Integer>read(v1, "$.classification.version")).isEqualTo(1);
        assertThat(JsonPath.<List<Integer>>read(v1, "$.linkedSlots[*].grade")).containsExactly(1, 2);
        assertThat(JsonPath.<String>read(v1, "$.verification")).as("출처 확인 상태는 바뀌지 않는다").isEqualTo("UNCLASSIFIED");
        assertThat(links()).isEqualTo(2);
        assertThat(jdbc.queryForObject("select count(distinct source_file_id) from assessment_schoolinfo_slot_link where school_id=?", Integer.class, SCHOOL)).isEqualTo(1);
        // 같은 버전으로 다시 → 충돌(먼저 저장한 분류 보존)
        assertThat(JsonPath.<String>read(classify(unc, "{\"schoolId\":\"school_001\",\"academicYear\":2025,\"grades\":[3],\"semesters\":[1],\"expectedVersion\":0}", 409), "$.code"))
                .isEqualTo("SCHOOLINFO_CLASSIFICATION_CONFLICT");
        // 연결된 칸 빼기 → 409, 더하기 → 됨
        assertThat(JsonPath.<String>read(classify(unc, "{\"schoolId\":\"school_001\",\"academicYear\":2025,\"grades\":[1],\"semesters\":[1],\"expectedVersion\":1}", 409), "$.code"))
                .isEqualTo("SCHOOLINFO_CLASSIFICATION_SLOT_REMOVAL");
        String v2 = classify(unc, "{\"schoolId\":\"school_001\",\"academicYear\":2025,\"grades\":[1,2],\"semesters\":[1,2],\"expectedVersion\":1}", 200);
        assertThat(JsonPath.<List<Object>>read(v2, "$.linkedSlots")).hasSize(4);
        assertThat(JsonPath.<List<Integer>>read(v2, "$.history[*].version")).containsExactly(1, 2);
        assertThat(links()).isEqualTo(4);

        // 관리자가 지운 칸 문서는 다시 분류해도 되살리지 않는다
        String planId = jdbc.queryForObject("select plan_id from assessment_schoolinfo_slot_link where school_id=? and grade=2 and semester=2", String.class, SCHOOL);
        mvc.perform(asAdmin(delete("/api/admin/assessment/evaluation-plans/" + planId), OPERATOR).param("schoolId", SCHOOL)).andExpect(status().isOk());
        String v3 = classify(unc, "{\"schoolId\":\"school_001\",\"academicYear\":2025,\"grades\":[1,2,3],\"semesters\":[1,2],\"expectedVersion\":2}", 200);
        assertThat(JsonPath.<List<Object>>read(v3, "$.linkedSlots")).as("고2-2 는 삭제된 채로, 고3 두 칸만 더해짐").hasSize(5);
        assertThat(jdbc.queryForObject("select count(*) from assessment_evaluation_plan where id=?", Integer.class, planId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select deleted_at is not null from assessment_evaluation_plan where id=?", Boolean.class, planId)).isTrue();

        // 새로 읽어도(서버 재시작과 같은 DB 기준) 분류·이력·연결이 그대로
        String again = sources();
        assertThat(JsonPath.<List<Integer>>read(again, "$.items[?(@.verification == 'UNCLASSIFIED')].classification.version")).containsExactly(3);
        assertThat(JsonPath.<List<Object>>read(again, "$.items[?(@.verification == 'UNCLASSIFIED')].history[*]")).hasSize(3);
        // 수동 분류 칸은 슬롯 상태에도 '등록'으로 보이고 자동 확정은 없다
        String view = mvc.perform(asAdmin(get(SYNC + "/" + JsonPath.read(r, "$.jobId")), OPERATOR)).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(view, "$.slotStatuses[?(@.academicYear==2025 && @.grade==1 && @.semester==1)].status")).containsExactly("REGISTERED");
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision r join assessment_schoolinfo_slot_link l on l.revision_id = r.id "
                + "where r.review_status = 'CONFIRMED'", Integer.class)).isZero();
    }

    @Test
    void 연도_조회_신뢰_전이나_학년도가_다른_원본은_목록에_출처_확인_필요로만_보인다() throws Exception {
        classificationFixture();
        waitDone(JsonPath.read(ensure(202), "$.jobId"));
        String list = sources();
        assertThat(JsonPath.<List<String>>read(list, "$.items[?(@.verification == 'YEAR_MISMATCH')].reason")).containsExactly("DISCLOSURE_YEAR_DIFFERS");
        assertThat(JsonPath.<List<String>>read(list, "$.items[?(@.group == 'SOURCE_VERIFICATION')].verification"))
                .containsExactlyInAnyOrder("NEEDS_SOURCE_VERIFICATION", "YEAR_MISMATCH");
        mvc.perform(asAdmin(get(SOURCES), "adm_unknown").param("schoolId", SCHOOL)).andExpect(status().isUnauthorized());
        mvc.perform(get(SOURCES).param("schoolId", SCHOOL)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").exists());
    }
}
