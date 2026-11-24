package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSyncRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSyncResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer.Doc;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer.YearData;
import com.learnershigh.extension.assessment.integration.schoolinfo.SchoolInfoClient;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSchoolMappingRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSourceFileRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSyncYearRepository;
import com.learnershigh.extension.assessment.service.plan.PlanAccess;
import com.learnershigh.extension.assessment.service.plan.PlanAnalysisService;
import com.learnershigh.extension.assessment.service.plan.SchoolInfoSyncService;
import com.learnershigh.extension.assessment.service.plan.SchoolInfoSyncWriter;
import com.learnershigh.extension.common.time.AdjustableClock;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

/**
 * §38-12 학교알리미 최근 3개 학년도 자동 확인 (A27-UX 부록 E). 가상 학교알리미(127.0.0.1)에 실제 Client 로 붙는다 — 실제 학교알리미 접속 없음.
 * 기준 날짜는 e2e 고정 날짜(2026-09-30, KST) → [2026, 2025, 2024]. 학교 school_001(학업 Context 이름 '예시고등학교').
 */
class SchoolInfoSyncApiTest extends SchoolInfoFakeSupport {

    private static final String BASE = "/api/admin/assessment/evaluation-plans/schoolinfo-sync";
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
    @Autowired
    ApplicationContext context;

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

    static byte[] resource(String path) throws IOException {
        try (InputStream in = SchoolInfoSyncApiTest.class.getResourceAsStream(path)) {
            return in.readAllBytes();
        }
    }

    static byte[] zip(Object[]... entries) throws IOException {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(bo, StandardCharsets.UTF_8)) {
            for (Object[] e : entries) {
                z.putNextEntry(new ZipEntry((String) e[0]));
                z.write((byte[]) e[1]);
                z.closeEntry();
            }
        }
        return bo.toByteArray();
    }

    /** 2026: 전 과목·교과군 3개·과목별 3개(PDF·HWP·HWPX)·양 학기 합본·스캔본(글자 없음) / 2025: 전 학년 합본·ZIP·근거 없는 파일 / 2024: 학교알리미가 2026 공시를 돌려줌 */
    void standardFixture() throws IOException {
        FAKE.years.put(2026, new YearData(2026,
                new Doc("2026학년도 1학년 1학기 전과목 평가계획.pdf", pdf(tag + "all")),
                new Doc("2026학년도 2학년 1학기 과학과 평가계획.pdf", pdf(tag + "sci")),
                new Doc("2026학년도 2학년 1학기 수학과 평가계획.pdf", pdf(tag + "math")),
                new Doc("2026학년도 2학년 1학기 사회과 평가계획.pdf", pdf(tag + "soc")),
                new Doc("2026학년도 3학년 2학기 국어.pdf", pdf(tag + "kor")),
                new Doc("2026학년도 3학년 2학기 과학.hwp", resource("/assessment/multiformat/synthetic-plan.hwp")),
                new Doc("2026학년도 3학년 2학기 물리.hwpx", resource("/assessment/multiformat/synthetic-plan.hwpx")),
                new Doc("2026학년도 1학년 1·2학기 평가계획(통합).pdf", pdf(tag + "both")),
                new Doc("2026학년도 1학년 2학기 스캔본.pdf", pdf(tag + "scan"))));
        FAKE.years.put(2025, new YearData(2025,
                new Doc("2025학년도 1,2,3학년 2학기 평가계획(전학년).pdf", pdf(tag + "y25all")),
                new Doc("평가계획 안내.pdf", pdf(tag + "y25none")),
                new Doc("2025학년도 2학년 평가계획.pdf", pdf(tag + "y25nosem")),
                new Doc("2025 교과별 자료.zip", zip(new Object[] {"2025학년도 3학년 1학기 정보.pdf", pdf(tag + "y25zip")},
                        new Object[] {"inner.zip", new byte[] {'P', 'K', 3, 4}}))));
        FAKE.years.put(2024, new YearData(2026, new Doc("2026학년도 1학년 1학기 평가계획.pdf", pdf(tag + "y24"))));
    }

    String ensure(String body, int expectStatus) throws Exception {
        return mvc.perform(asAdmin(post(BASE), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(expectStatus)).andReturn().getResponse().getContentAsString();
    }

    String waitDone(String jobId) throws Exception {
        String r = null;
        for (int i = 0; i < 600; i++) {
            r = mvc.perform(asAdmin(get(BASE + "/" + jobId), OPERATOR)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            if (!"RUNNING".equals(JsonPath.read(r, "$.state"))) {
                return r;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("작업이 끝나지 않음: " + r);
    }

    static Map<String, Object> slot(String r, int year, int grade, int semester) {
        List<Map<String, Object>> all = JsonPath.read(r, "$.slotStatuses[?(@.academicYear == " + year + " && @.grade == " + grade
                + " && @.semester == " + semester + ")]");
        assertThat(all).hasSize(1);
        return all.getFirst();
    }

    int links(int year) {
        return jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link where school_id=? and academic_year=?", Integer.class, SCHOOL, year);
    }

    int revisionsOfSchoolYear(int year) {
        return jdbc.queryForObject("select count(*) from assessment_plan_revision r join assessment_evaluation_plan p on p.id = r.plan_id "
                + "where p.school_id=? and p.academic_year=?", Integer.class, SCHOOL, year);
    }

    @Test
    void 세_학년도를_따로_조회해_18개_슬롯을_채우고_다른_학년도_문서는_등록하지_않는다() throws Exception {
        standardFixture();
        int revisions2024 = revisionsOfSchoolYear(2024);
        String first = ensure(BODY, 202);
        assertThat(JsonPath.<List<Integer>>read(first, "$.requestedAcademicYears")).containsExactly(2026, 2025, 2024);
        assertThat(JsonPath.<List<Object>>read(first, "$.slotStatuses")).as("시작부터 18개").hasSize(18);
        String r = waitDone(JsonPath.read(first, "$.jobId"));

        // 학년도마다 따로 조회했다(기본 연도 파일을 세 번 받아 복사하지 않음)
        for (int y : List.of(2026, 2025, 2024)) {
            assertThat(FAKE.log.stream().filter(l -> l.startsWith("/ei/pp/Pneipp_b06_s0p.do JG_YEAR=" + y))).as(y + "").hasSize(1);
        }
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[?(@.academicYear==2026)].status")).containsExactly("COMPLETED");
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[?(@.academicYear==2025)].status")).containsExactly("PARTIAL");
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[?(@.academicYear==2024)].status")).containsExactly("YEAR_MISMATCH");
        assertThat(JsonPath.<List<Integer>>read(r, "$.yearStatuses[?(@.academicYear==2024)].resolvedSourceYear")).containsExactly(2026);
        assertThat(JsonPath.<String>read(r, "$.state")).as("세 학년도가 모두 완료가 아니면 18/18 이 아니다").isEqualTo("PARTIAL");

        List<Map<String, Object>> slots = JsonPath.read(r, "$.slotStatuses");
        assertThat(slots).hasSize(18);
        // 2026 학년도 6칸
        assertThat(slot(r, 2026, 1, 1)).containsEntry("status", "REGISTERED").containsEntry("sourceFileCount", 2);   // 전과목 + 양학기 합본
        assertThat(slot(r, 2026, 1, 2)).containsEntry("status", "REGISTERED").containsEntry("sourceFileCount", 2);   // 양학기 합본 + 스캔본
        assertThat(slot(r, 2026, 2, 1)).containsEntry("status", "REGISTERED").containsEntry("sourceFileCount", 3)
                .containsEntry("registeredPlanCount", 3);                                                              // 교과군 3개
        assertThat(slot(r, 2026, 3, 2)).containsEntry("status", "REGISTERED").containsEntry("sourceFileCount", 3);   // 과목별 3개
        assertThat(slot(r, 2026, 2, 2)).containsEntry("status", "NO_SOURCE_FOR_SLOT");
        assertThat(slot(r, 2026, 3, 1)).containsEntry("status", "NO_SOURCE_FOR_SLOT");
        // 2025: 전 학년 합본은 원본 하나가 세 슬롯 · ZIP 안 파일은 따로 · 근거 없는 파일이 있으니 빈 칸은 '출처 확인 필요'
        for (int g : List.of(1, 2, 3)) {
            assertThat(slot(r, 2025, g, 2)).containsEntry("status", "REGISTERED");
        }
        assertThat(slot(r, 2025, 3, 1)).containsEntry("status", "REGISTERED");
        assertThat(slot(r, 2025, 1, 1)).containsEntry("status", "NEEDS_SOURCE_VERIFICATION");
        assertThat(jdbc.queryForObject("select count(distinct source_file_id) from assessment_schoolinfo_slot_link where school_id=? and academic_year=2025 and semester=2",
                Integer.class, SCHOOL)).as("전 학년 합본 원본은 하나").isEqualTo(1);
        // 2024: 학교알리미가 2026 공시를 돌려줬으니 6칸 모두 불일치 · 등록 0건
        for (int g : List.of(1, 2, 3)) {
            for (int s : List.of(1, 2)) {
                assertThat(slot(r, 2024, g, s)).containsEntry("status", "YEAR_MISMATCH").containsEntry("registeredPlanCount", 0);
            }
        }
        assertThat(links(2024)).isZero();
        assertThat(revisionsOfSchoolYear(2024)).isEqualTo(revisions2024);

        // 수집 수치 구분: 받은 파일 15(ZIP 안 1 포함) · 원본 기록 · 등록 문서 · 슬롯 연결
        assertThat(JsonPath.<Integer>read(r, "$.counts.expectedSlots")).isEqualTo(18);
        assertThat(JsonPath.<Integer>read(r, "$.counts.verifiedSlots")).isEqualTo(8);
        assertThat(JsonPath.<Integer>read(r, "$.counts.downloads")).isEqualTo(14);
        assertThat(JsonPath.<Integer>read(r, "$.counts.slotLinks")).isEqualTo(links(2026) + links(2025));
        assertThat(JsonPath.<Integer>read(r, "$.counts.registeredPlans")).isEqualTo(JsonPath.<Integer>read(r, "$.counts.slotLinks"));
        List<String> unresolved = JsonPath.read(r, "$.unresolvedFiles[*].status");
        assertThat(unresolved).contains("NEEDS_SOURCE_VERIFICATION", "UNCLASSIFIED", "YEAR_MISMATCH", "UNSUPPORTED");
        assertThat(JsonPath.<List<String>>read(r, "$.unresolvedFiles[?(@.status=='UNSUPPORTED')].reason")).contains("NESTED_ZIP");

        // 수집과 분석은 별개: 합성 HWPX(과목 0, 알려진 P1)·빈 PDF 는 분석 실패여도 원본 등록은 그대로
        assertThat(slot(r, 2026, 3, 2).get("status")).isEqualTo("REGISTERED");
        assertThat(slot(r, 2026, 3, 2).get("analysisStatus")).isIn("ANALYZED", "FAILED");
        assertThat(slot(r, 2026, 2, 2).get("analysisStatus")).isEqualTo("NONE");
        String src = jdbc.queryForObject("select r.source_url from assessment_plan_revision r join assessment_schoolinfo_slot_link l on l.revision_id = r.id "
                + "where l.school_id=? and l.academic_year=2025 limit 1", String.class, SCHOOL);
        assertThat(src).contains("JG_YEAR=2025").contains("SHL_IDF_CD=" + FakeSchoolInfoServer.SCHOOL_UUID);
        // 자동 확정 없음
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision r join assessment_schoolinfo_slot_link l on l.revision_id = r.id "
                + "where r.review_status = 'CONFIRMED'", Integer.class)).isZero();
    }

    @Test
    void 같은_학교는_작업을_재사용하고_다시_받아도_같은_원본은_중복_등록하지_않는다() throws Exception {
        standardFixture();
        // 동시에 두 화면이 보낸 명령 → 같은 작업
        CompletableFuture<String> a = CompletableFuture.supplyAsync(() -> call());
        CompletableFuture<String> b = CompletableFuture.supplyAsync(() -> call());
        String jobA = JsonPath.read(a.get(), "$.jobId");
        String jobB = JsonPath.read(b.get(), "$.jobId");
        assertThat(jobA).isEqualTo(jobB);
        waitDone(jobA);
        int linked = links(2026) + links(2025);
        long items = FAKE.count("/ei/pp/");

        // 끝난 뒤 다시 들어와도(탭 왕복·새로고침) 외부 요청 없이 같은 결과 200
        String again = ensure(BODY, 200);
        assertThat(JsonPath.<String>read(again, "$.jobId")).isEqualTo(jobA);
        assertThat(FAKE.count("/ei/pp/")).isEqualTo(items);

        // GET 은 읽기만 한다
        int sources = jdbc.queryForObject("select count(*) from assessment_schoolinfo_source_file", Integer.class);
        int revisionsAll = jdbc.queryForObject("select count(*) from assessment_plan_revision", Integer.class);
        int externalBefore = FAKE.log.size();
        for (int i = 0; i < 3; i++) {
            mvc.perform(asAdmin(get(BASE + "/" + jobA), OPERATOR)).andExpect(status().isOk());
        }
        assertThat(FAKE.log).as("GET 은 외부 요청 없음").hasSize(externalBefore);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_source_file", Integer.class)).isEqualTo(sources);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision", Integer.class)).as("GET 은 DB 쓰기 없음").isEqualTo(revisionsAll);

        // 서버 재시작(메모리 작업 없음) → 기록(DB)으로 답하고 외부 요청 없음
        SchoolInfoSyncService restarted = freshService(true);
        SchoolInfoSyncService.Ensured e = restarted.ensureSynced(admin(), request(List.of(2026, 2025, 2024)));
        assertThat(e.running()).isFalse();
        assertThat(FAKE.count("/ei/pp/")).isEqualTo(items);
        assertThat(e.body().counts().verifiedSlots()).isEqualTo(8);

        // TTL 이 지나 다시 받아도 같은 SHA 는 문서·Revision 증가 0
        int rev2026 = revisionsOfSchoolYear(2026);
        clock.setDate(LocalDate.of(2026, 10, 3));
        String later = ensure(BODY, 202);
        String done = waitDone(JsonPath.read(later, "$.jobId"));
        assertThat(FAKE.count("/ei/pp/")).isEqualTo(items + 3);
        assertThat(JsonPath.<Integer>read(done, "$.counts.reused")).isEqualTo(JsonPath.<Integer>read(done, "$.counts.downloads"));
        assertThat(links(2026) + links(2025)).isEqualTo(linked);
        assertThat(revisionsOfSchoolYear(2026)).isEqualTo(rev2026);
    }

    @Test
    void 같은_슬롯_같은_파일_이름의_원본이_바뀌면_기존_문서의_새_Revision으로_넣고_이전_것은_그대로_둔다() throws Exception {
        FAKE.years.put(2026, new YearData(2026, new Doc("2026학년도 2학년 1학기 과학과 평가계획.pdf", pdf(tag + "v1"))));
        waitDone(JsonPath.read(ensure(BODY, 202), "$.jobId"));
        String planId = jdbc.queryForObject("select plan_id from assessment_schoolinfo_slot_link where school_id=? and academic_year=2026", String.class, SCHOOL);
        String firstRevision = jdbc.queryForObject("select revision_id from assessment_schoolinfo_slot_link where school_id=? and academic_year=2026", String.class, SCHOOL);
        // 관리자가 첫 Revision 을 검토 중이라고 표시해 둔다(값이 바뀌지 않는지 본다)
        String reviewBefore = jdbc.queryForObject("select review_status from assessment_plan_revision where id=?", String.class, firstRevision);

        FAKE.years.put(2026, new YearData(2026, new Doc("2026학년도 2학년 1학기 과학과 평가계획.pdf", pdf(tag + "v2"))));
        clock.setDate(LocalDate.of(2026, 10, 3));
        String r = waitDone(JsonPath.read(ensure(BODY, 202), "$.jobId"));
        assertThat(slot(r, 2026, 2, 1)).containsEntry("registeredPlanCount", 1).containsEntry("sourceFileCount", 2);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision where plan_id=?", Integer.class, planId)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select review_status from assessment_plan_revision where id=?", String.class, firstRevision)).isEqualTo(reviewBefore);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link where plan_id=?", Integer.class, planId)).isEqualTo(2);
    }

    @Test
    void 관리자가_삭제한_자동_등록_문서는_다시_등록하지_않고_칸에_삭제됨으로_보인다() throws Exception {
        FAKE.years.put(2026, new YearData(2026, new Doc("2026학년도 3학년 1학기 정보 평가계획.pdf", pdf(tag + "del")),
                new Doc("2026학년도 3학년 2학기 정보 평가계획.pdf", pdf(tag + "keep"))));
        waitDone(JsonPath.read(ensure(BODY, 202), "$.jobId"));
        String planId = jdbc.queryForObject("select plan_id from assessment_schoolinfo_slot_link where school_id=? and academic_year=2026 and grade=3 and semester=1",
                String.class, SCHOOL);
        mvc.perform(asAdmin(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/admin/assessment/evaluation-plans/" + planId), OPERATOR)
                .param("schoolId", SCHOOL)).andExpect(status().isOk());
        // 원본이 바뀌어도(같은 이름) 삭제된 문서에 개정본을 붙이거나 되살리지 않는다
        FAKE.years.put(2026, new YearData(2026, new Doc("2026학년도 3학년 1학기 정보 평가계획.pdf", pdf(tag + "del-v2")),
                new Doc("2026학년도 3학년 2학기 정보 평가계획.pdf", pdf(tag + "keep"))));
        clock.setDate(LocalDate.of(2026, 10, 3));
        int plans = jdbc.queryForObject("select count(*) from assessment_evaluation_plan where school_id=? and academic_year=2026 and grade=3 and deleted_at is null",
                Integer.class, SCHOOL);
        String r = waitDone(JsonPath.read(ensure(BODY, 202), "$.jobId"));
        assertThat(slot(r, 2026, 3, 1)).containsEntry("status", "REMOVED_BY_ADMIN").containsEntry("registeredPlanCount", 0);
        assertThat(slot(r, 2026, 3, 2)).containsEntry("status", "REGISTERED");
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[?(@.academicYear==2026)].status")).containsExactly("COMPLETED");
        assertThat(jdbc.queryForObject("select count(*) from assessment_evaluation_plan where school_id=? and academic_year=2026 and grade=3 and deleted_at is null",
                Integer.class, SCHOOL)).isEqualTo(plans);
        assertThat(jdbc.queryForObject("select count(*) from assessment_plan_revision where plan_id=?", Integer.class, planId)).isEqualTo(1);
    }

    @Test
    void 기준_학년도는_서버_KST_달력_연도이고_다르면_409와_기대값을_준다() throws Exception {
        ensure("{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2025,2024,2023],\"grades\":[1,2,3],\"semesters\":[1,2]}", 409);
        String bad = ensure("{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2026,2025],\"grades\":[1,2,3],\"semesters\":[1,2]}", 409);
        assertThat(JsonPath.<String>read(bad, "$.code")).isEqualTo("SCHOOLINFO_SYNC_YEARS_MISMATCH");
        assertThat(JsonPath.<List<Integer>>read(bad, "$.details.expectedAcademicYears")).containsExactly(2026, 2025, 2024);
        ensure("{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2],\"semesters\":[1,2]}", 409);
        ensure("{\"schoolId\":\"\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2,3],\"semesters\":[1,2]}", 400);

        clock.setDate(LocalDate.of(2027, 1, 5));
        String y27 = ensure(BODY, 409);
        assertThat(JsonPath.<List<Integer>>read(y27, "$.details.expectedAcademicYears")).containsExactly(2027, 2026, 2025);
        String ok = ensure("{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2027,2026,2025],\"grades\":[1,2,3],\"semesters\":[1,2]}", 202);
        String done = waitDone(JsonPath.read(ok, "$.jobId"));
        assertThat(JsonPath.<List<Integer>>read(done, "$.yearStatuses[*].academicYear")).containsExactly(2027, 2026, 2025);
        assertThat(FAKE.log).anyMatch(l -> l.startsWith("/ei/pp/Pneipp_b06_s0p.do JG_YEAR=2027"))
                .noneMatch(l -> l.startsWith("/ei/pp/Pneipp_b06_s0p.do JG_YEAR=2024"));
        assertThat(JsonPath.<List<String>>read(done, "$.yearStatuses[?(@.academicYear==2027)].status")).containsExactly("NOT_PUBLISHED");
    }

    @Test
    void 동명_학교_이름이_다른_학교_학업_정보_없는_학교는_등록_0건() throws Exception {
        standardFixture();
        FAKE.searchIds = List.of(FakeSchoolInfoServer.SCHOOL_UUID, FakeSchoolInfoServer.OTHER_UUID);
        String r = waitDone(JsonPath.read(ensure(BODY, 202), "$.jobId"));
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[*].status")).containsOnly("SCHOOL_AMBIGUOUS");
        assertThat(JsonPath.<String>read(r, "$.state")).isEqualTo("FAILED");
        assertThat(FAKE.count("/ei/pp/")).isZero();
        assertThat(links(2026) + links(2025) + links(2024)).isZero();

        reset();
        standardFixture();
        FAKE.schoolName = "예시여자고등학교";
        String other = waitDone(JsonPath.read(ensure(BODY, 202), "$.jobId"));
        assertThat(JsonPath.<List<String>>read(other, "$.yearStatuses[*].status")).containsOnly("SCHOOL_AMBIGUOUS");
        assertThat(FAKE.count("/ei/pp/")).as("이름이 다른 학교의 평가계획 항목은 받지 않는다").isZero();
        assertThat(FAKE.count("/servlets/")).isZero();
        assertThat(links(2026) + links(2025) + links(2024)).isZero();

        reset();
        String unknown = ensure("{\"schoolId\":\"school_no_context\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2,3],\"semesters\":[1,2]}", 200);
        assertThat(JsonPath.<List<String>>read(unknown, "$.yearStatuses[*].status")).containsOnly("SCHOOL_IDENTITY_REQUIRED");
        assertThat(JsonPath.<List<String>>read(unknown, "$.slotStatuses[*].status")).hasSize(18).containsOnly("SCHOOL_IDENTITY_REQUIRED");
        assertThat(FAKE.log).as("학교 이름을 모르면 외부 요청 없음").isEmpty();
    }

    @Test
    void 일시_오류_학년도만_실패로_남고_다음_확인에서_그_학년도만_다시_받는다() throws Exception {
        standardFixture();
        FAKE.years.get(2024).itemStatus = 500;
        String r = waitDone(JsonPath.read(ensure(BODY, 202), "$.jobId"));
        assertThat(JsonPath.<List<String>>read(r, "$.yearStatuses[?(@.academicYear==2024)].status")).containsExactly("FAILED");
        assertThat(slot(r, 2024, 1, 1)).containsEntry("status", "FAILED");
        assertThat(slot(r, 2026, 1, 1)).containsEntry("status", "REGISTERED");
        long y26 = FAKE.log.stream().filter(l -> l.startsWith("/ei/pp/Pneipp_b06_s0p.do JG_YEAR=2026")).count();
        FAKE.years.get(2024).itemStatus = 200;
        String retry = waitDone(JsonPath.read(ensure(BODY, 202), "$.jobId"));
        assertThat(FAKE.log.stream().filter(l -> l.startsWith("/ei/pp/Pneipp_b06_s0p.do JG_YEAR=2026")).count()).isEqualTo(y26);
        assertThat(JsonPath.<List<String>>read(retry, "$.yearStatuses[?(@.academicYear==2024)].status")).containsExactly("YEAR_MISMATCH");
    }

    @Test
    void 부록O_긴급_차단_false_에서는_받기만_하고_등록하지_않는다() throws Exception {
        standardFixture();
        SchoolInfoSyncService defaults = freshService(false);
        SchoolInfoSyncService.Ensured e = defaults.ensureSynced(admin(), request(List.of(2026, 2025, 2024)));
        SchoolInfoSyncResponse r = e.body();
        for (int i = 0; i < 600 && "RUNNING".equals(r.state()); i++) {
            Thread.sleep(100);
            r = defaults.status(admin(), r.jobId());
        }
        assertThat(links(2026) + links(2025) + links(2024)).isZero();
        assertThat(r.yearStatuses()).extracting(SchoolInfoSyncResponse.YearStatus::status)
                .containsExactly("NEEDS_SOURCE_VERIFICATION", "NEEDS_SOURCE_VERIFICATION", "NEEDS_SOURCE_VERIFICATION");
        assertThat(r.unresolvedFiles()).extracting(SchoolInfoSyncResponse.UnresolvedFile::reason).contains("YEAR_QUERY_UNVERIFIED");
        assertThat(r.counts().verifiedSlots()).isZero();
    }

    @Test
    void 학생과_인증되지_않은_요청은_자동_확인을_쓸_수_없다() throws Exception {
        mvc.perform(asStudent(post(BASE), "stu_001").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().is4xxClientError());
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isUnauthorized());
        mvc.perform(asAdmin(post(BASE), "adm_unknown").contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isUnauthorized());
        mvc.perform(asAdmin(get(BASE + "/schoolinfo_sync_unknown"), OPERATOR)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SCHOOLINFO_JOB_NOT_FOUND"));
        assertThat(FAKE.log).isEmpty();
    }

    // ---------------------------------------------------------------- helpers

    String call() {
        try {
            return mvc.perform(asAdmin(post(BASE), OPERATOR).contentType(MediaType.APPLICATION_JSON).content(BODY))
                    .andReturn().getResponse().getContentAsString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    static AdminActor admin() {
        return new AdminActor(OPERATOR, Set.of(), true);
    }

    static SchoolInfoSyncRequest request(List<Integer> years) {
        return new SchoolInfoSyncRequest(SCHOOL, years, List.of(1, 2, 3), List.of(1, 2));
    }

    /** 같은 Bean 들로 새 서비스(메모리 작업 없음 = 서버 재시작과 같은 상태). */
    SchoolInfoSyncService freshService(boolean yearQueryVerified) {
        return new SchoolInfoSyncService(context.getBean(SchoolInfoClient.class), context.getBean(SchoolInfoSyncWriter.class),
                context.getBean(SchoolInfoSourceFileRepository.class), context.getBean(SchoolInfoSlotLinkRepository.class),
                context.getBean(SchoolInfoSyncYearRepository.class), context.getBean(PlanAnalysisRunRepository.class),
                context.getBean(EvaluationPlanRepository.class), context.getBean(SchoolInfoSchoolMappingRepository.class),
                context.getBean(PlanAnalysisService.class), context.getBean(AcademicContextProvider.class), context.getBean(PlanAccess.class),
                clock, context.getBean(JsonMapper.class), yearQueryVerified, 24);
    }
}
