package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer.Doc;
import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer.YearData;
import com.learnershigh.extension.common.time.AdjustableClock;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A27-UX 부록 O: §38-15 학교알리미 학교 검색·선택(평가계획서 0건 학교) · §38-16 학생 개인 동명 학교 열람 선택.
 * 가상 학교알리미(127.0.0.1)만 — 실제 학교알리미 접속 없음. 학교·주소는 모두 가상 값. 기준일 2026-09-30(KST) → [2026, 2025, 2024].
 * 학생 stu_001·stu_002 는 Mock 학적에서 같은 학교(school_001 '예시고등학교' 1학년)다.
 */
class SchoolDirectoryOfficialViewApiTest extends SchoolInfoFakeSupport {

    private static final String SCHOOLS = "/api/admin/assessment/schools";
    private static final String SYNC = "/api/admin/assessment/evaluation-plans/schoolinfo-sync";
    private static final String OFFICIAL = "/api/student/assessment/evaluation-plans/official";
    private static final String OPERATOR = "adm_plan_operator";
    private static final String A = "0b9c5a4e-aaaa-4222-8333-0000000000a1";
    private static final String B = "0b9c5a4e-bbbb-4222-8333-0000000000b2";
    private static final String C = "0b9c5a4e-cccc-4222-8333-0000000000c3";

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
        jdbc.update("delete from assessment_student_official_view");
        jdbc.update("delete from assessment_student_official_view_event");
        jdbc.update("delete from assessment_schoolinfo_classification");
        jdbc.update("delete from assessment_schoolinfo_school_mapping");
        jdbc.update("delete from assessment_schoolinfo_slot_link");
        jdbc.update("delete from assessment_schoolinfo_source_file");
        jdbc.update("delete from assessment_schoolinfo_sync_year");
        tag = Long.toString(System.nanoTime(), 36);
    }

    static byte[] pdf(String marker) throws IOException {
        return EvaluationPlanApiTest.pdf(1, "synthetic " + marker);
    }

    String waitJob(String jobId) throws Exception {
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

    String studentEnsure(String student) throws Exception {
        String r = null;
        for (int i = 0; i < 600; i++) {
            r = mvc.perform(asStudent(post(OFFICIAL + "/ensure"), student)).andReturn().getResponse().getContentAsString();
            if (!"RUNNING".equals(JsonPath.read(r, "$.state"))) {
                return r;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("학생 확인이 끝나지 않음: " + r);
    }

    String candidates(String student) throws Exception {
        String r = null;
        for (int i = 0; i < 600; i++) {
            r = mvc.perform(asStudent(get(OFFICIAL + "/school-candidates"), student)).andExpect(status().isOk()).andReturn().getResponse()
                    .getContentAsString();
            if (!"RUNNING".equals(JsonPath.read(r, "$.state"))) {
                return r;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("후보 확인이 끝나지 않음: " + r);
    }

    String official(String student) throws Exception {
        return mvc.perform(asStudent(get(OFFICIAL), student).param("academicYear", "2026").param("semester", "1"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    String search(String query, int expect) throws Exception {
        return mvc.perform(asAdmin(get(SCHOOLS + "/directory"), OPERATOR).param("query", query))
                .andExpect(status().is(expect)).andReturn().getResponse().getContentAsString();
    }

    String selectDirectory(String candidateId, int expect) throws Exception {
        return mvc.perform(asAdmin(post(SCHOOLS + "/directory/selection"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                .content("{\"candidateId\":\"" + candidateId + "\"}")).andExpect(status().is(expect)).andReturn().getResponse().getContentAsString();
    }

    // ------------------------------------------------------------ §38-15 학교 검색·선택

    @Test
    void 평가계획서_0건_학교도_검색해_고르면_그_학교만_3개_학년도를_확인하고_학적은_만들지_않는다() throws Exception {
        FAKE.searchIds = List.of(C);
        FAKE.schools.put(C, new String[] {"검색예시고등학교", "가상특별시 검색구 검색로 3"});
        FAKE.yearsBySchool.put(C, Map.of(2026, new YearData(2026, new Doc("2026학년도 2학년 1학기 C학교 " + tag + ".pdf", pdf(tag + "C")))));
        int plansBefore = jdbc.queryForObject("select count(*) from assessment_evaluation_plan where school_id like 'si\\_%'", Integer.class);

        String found = search("검색예시" + tag, 200);
        assertThat(JsonPath.<Boolean>read(found, "$.complete")).isTrue();
        assertThat(JsonPath.<List<String>>read(found, "$.items[*].officialName")).containsExactly("검색예시고등학교");
        assertThat(JsonPath.<List<String>>read(found, "$.items[*].sido")).containsExactly("가상특별시");
        assertThat(JsonPath.<List<Boolean>>read(found, "$.items[*].selectable")).containsExactly(true);
        assertThat(JsonPath.<List<Object>>read(found, "$.items[*].schoolId")).containsExactly((Object) null);
        assertThat(FAKE.count("/ei/pp/")).as("검색만으로는 평가계획 항목을 받지 않는다").isZero();

        String chosen = selectDirectory(JsonPath.read(found, "$.items[0].candidateId"), 202);
        assertThat(JsonPath.<String>read(chosen, "$.schoolId")).isEqualTo("si_" + C);
        String done = waitJob(JsonPath.read(chosen, "$.sync.jobId"));
        assertThat(JsonPath.<List<String>>read(done, "$.yearStatuses[?(@.academicYear==2026)].status")).containsExactly("COMPLETED");
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link where school_id=?", Integer.class, "si_" + C)).isEqualTo(1);
        // 18구간 = 3학년도 × 3학년 × 2학기(파일 수가 아니다)
        assertThat(JsonPath.<List<Object>>read(done, "$.slotStatuses[*]")).hasSize(18);
        assertThat(jdbc.queryForObject("select count(*) from assessment_evaluation_plan where school_id like 'si\\_%'", Integer.class)).isEqualTo(plansBefore + 1);

        // 등록 학교 목록에 공식 이름으로 남는다(학적 없음 → SCHOOLINFO_MAPPING)
        String list = mvc.perform(asAdmin(get(SCHOOLS), OPERATOR)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(list, "$.items[?(@.schoolId=='si_" + C + "')].nameSource")).containsExactly("SCHOOLINFO_MAPPING");
        assertThat(JsonPath.<List<String>>read(list, "$.items[?(@.schoolId=='si_" + C + "')].name")).containsExactly("검색예시고등학교");

        // 같은 학교를 다시 검색하면 이미 쓰는 학교 키를 알려 주고, 다시 골라도 새 키를 만들지 않는다
        String again = search("검색예시고등" + tag, 200);
        assertThat(JsonPath.<List<String>>read(again, "$.items[*].schoolId")).containsExactly("si_" + C);
        String chosenAgain = selectDirectory(JsonPath.read(again, "$.items[0].candidateId"), 200);
        assertThat(JsonPath.<String>read(chosenAgain, "$.schoolId")).isEqualTo("si_" + C);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_school_mapping", Integer.class)).isEqualTo(1);
    }

    /** 부록 O 실측 결함 재현: ZIP 첨부 안 파일 이름이 길어 첨부 번호("순번/이름")가 40자를 넘으면 그 학년도가 FAILED 되던 문제(V202611210200). */
    @Test
    void ZIP_첨부_안_파일_이름이_길어도_저장되고_칸에_연결된다() throws Exception {
        String longName = "2026학년도 1학년 1학기 교과별 교수학습 및 평가 운영 계획서 국어 수학 영어 사회 과학 " + tag + ".pdf";
        java.io.ByteArrayOutputStream zip = new java.io.ByteArrayOutputStream();
        try (java.util.zip.ZipOutputStream out = new java.util.zip.ZipOutputStream(zip, java.nio.charset.StandardCharsets.UTF_8)) {
            out.putNextEntry(new java.util.zip.ZipEntry(longName));
            out.write(pdf(tag + "zip"));
            out.closeEntry();
        }
        assertThat(("1/" + longName).length()).isGreaterThan(40);
        FAKE.searchIds = List.of(C);
        FAKE.schools.put(C, new String[] {"압축예시고등학교", "가상특별시 압축구 압축로 5"});
        FAKE.yearsBySchool.put(C, Map.of(2026, new YearData(2026, new Doc("2026학년도 평가계획 묶음 " + tag + ".zip", zip.toByteArray()))));
        String found = search("압축예시" + tag, 200);
        String chosen = selectDirectory(JsonPath.read(found, "$.items[0].candidateId"), 202);
        String done = waitJob(JsonPath.read(chosen, "$.sync.jobId"));
        assertThat(JsonPath.<List<String>>read(done, "$.yearStatuses[?(@.academicYear==2026)].status")).containsExactly("COMPLETED");
        assertThat(jdbc.queryForObject("select max(char_length(attachment_seq)) from assessment_schoolinfo_source_file where school_id=?", Integer.class, "si_" + C))
                .isGreaterThan(40);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link where school_id=?", Integer.class, "si_" + C)).isEqualTo(1);
    }

    @Test
    void 검색_결과가_잘리거나_주소가_없거나_같으면_고를_수_없고_검색어_검증과_위조_후보는_거절한다() throws Exception {
        search("가", 400);
        search(" ", 400);
        selectDirectory("dir_forged", 409);

        // 주소 없음 · 같은 이름 같은 주소 → 고를 수 없음
        FAKE.searchIds = List.of(A, B, C);
        FAKE.schools.put(A, new String[] {"주소예시고등학교", null});
        FAKE.schools.put(B, new String[] {"주소예시고등학교", "가상특별시 같은구 같은로 1"});
        FAKE.schools.put(C, new String[] {"주소예시고등학교", "가상특별시 같은구 같은로 1"});
        String r = search("주소예시" + tag, 200);
        assertThat(JsonPath.<List<String>>read(r, "$.items[*].unselectableReason"))
                .containsExactlyInAnyOrder("ADDRESS_MISSING", "ADDRESS_DUPLICATE", "ADDRESS_DUPLICATE");
        for (String id : JsonPath.<List<String>>read(r, "$.items[*].candidateId")) {
            selectDirectory(id, 409);
        }

        // 검색 목록을 다 읽지 못함(부록 H 더보기 잘림) → complete=false, 모두 고를 수 없음
        FAKE.reset();
        FAKE.realSearchMarkup = true;
        FAKE.highListLimit = 1;
        FAKE.searchIds = List.of(A, B);
        FAKE.schools.put(A, new String[] {"잘림예시고등학교", "가상특별시 가상구 가상로 1"});
        FAKE.schools.put(B, new String[] {"잘림예시고등학교", "가상광역시 시험구 시험로 2"});
        String cut = search("잘림예시" + tag, 200);
        assertThat(JsonPath.<Boolean>read(cut, "$.complete")).isFalse();
        assertThat(JsonPath.<String>read(cut, "$.incompleteReason")).isEqualTo("SEARCH_TRUNCATED");
        assertThat(JsonPath.<List<Boolean>>read(cut, "$.items[*].selectable")).doesNotContain(true);
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_school_mapping", Integer.class)).isZero();

        // 학교알리미 연결 실패 → 502(빈 목록으로 숨기지 않음)
        FAKE.reset();
        FAKE.searchStatus = 500;
        search("실패예시" + tag, 502);
    }

    @Test
    void 이미_관리자가_매핑한_학교알리미_학교는_그_학교_키를_재사용한다_인천_가좌고_같은_기존_매핑_보존() throws Exception {
        FAKE.searchIds = List.of(A);
        FAKE.schools.put(A, new String[] {"예시고등학교", "가상특별시 가상구 가상로 1"});
        jdbc.update("insert into assessment_schoolinfo_school_mapping(school_id, schoolinfo_school_id, school_name, address, sido, sigungu, status,"
                + " version, selected_by, selected_at) values ('school_001', ?, '예시고등학교', '가상특별시 가상구 가상로 1', '가상특별시', '가상구', 'ACTIVE', 1,"
                + " 'adm_plan_operator', now(6))", A);
        String r = search("예시재사용" + tag, 200);
        assertThat(JsonPath.<List<String>>read(r, "$.items[*].schoolId")).containsExactly("school_001");
        String chosen = selectDirectory(JsonPath.read(r, "$.items[0].candidateId"), 202);
        assertThat(JsonPath.<String>read(chosen, "$.schoolId")).isEqualTo("school_001");
        waitJob(JsonPath.read(chosen, "$.sync.jobId"));
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_school_mapping", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select version from assessment_schoolinfo_school_mapping where school_id='school_001'", Long.class))
                .as("기존 매핑은 바뀌지 않는다").isEqualTo(1L);
    }

    // ------------------------------------------------------------ §38-16 학생 개인 동명 학교 열람 선택

    void twoSameName() throws IOException {
        FAKE.searchIds = List.of(A, B);
        FAKE.schools.put(A, new String[] {"예시고등학교", "가상특별시 가상구 가상로 1"});
        FAKE.schools.put(B, new String[] {"예시고등학교", "가상광역시 시험구 시험로 2"});
        FAKE.yearsBySchool.put(A, Map.of(2026, new YearData(2026, new Doc("2026학년도 1학년 1학기 A학교 " + tag + ".pdf", pdf(tag + "A")))));
        FAKE.yearsBySchool.put(B, Map.of(2026, new YearData(2026, new Doc("2026학년도 1학년 1학기 B학교 " + tag + ".pdf", pdf(tag + "B")))));
    }

    static String candidateBySido(String r, String sido) {
        List<String> ids = JsonPath.read(r, "$.candidates[?(@.sido == '" + sido + "')].candidateId");
        assertThat(ids).hasSize(1);
        return ids.getFirst();
    }

    String selectView(String student, String candidateId, Long expectedVersion, int expect) throws Exception {
        String body = "{\"candidateId\":\"" + candidateId + "\"" + (expectedVersion == null ? "" : ",\"expectedVersion\":" + expectedVersion) + "}";
        return mvc.perform(asStudent(put(OFFICIAL + "/view-selection"), student).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(expect)).andReturn().getResponse().getContentAsString();
    }

    @Test
    void 학생은_자기_열람_대상만_고르고_다른_학생과_관리자_매핑은_그대로다() throws Exception {
        twoSameName();
        String first = studentEnsure("stu_001");
        assertThat(JsonPath.<String>read(first, "$.state")).isEqualTo("SCHOOL_CONFIRMATION_REQUIRED");
        assertThat(FAKE.count("/ei/pp/")).as("고르기 전에는 어느 학교의 평가계획도 받지 않는다").isZero();

        String c1 = candidates("stu_001");
        assertThat(JsonPath.<String>read(c1, "$.state")).isEqualTo("SELECT_REQUIRED");
        assertThat(JsonPath.<List<String>>read(c1, "$.candidates[*].sido")).containsExactlyInAnyOrder("가상특별시", "가상광역시");
        assertThat(c1).as("학교알리미 학교 ID 를 학생에게 주지 않는다").doesNotContain(A).doesNotContain(B);
        assertThat(JsonPath.<List<Object>>read(official("stu_001"), "$.documents")).isEmpty();

        // 학생 1 → A, 학생 2 → B (서로 독립)
        String s1 = selectView("stu_001", candidateBySido(c1, "가상특별시"), 0L, 200);
        assertThat(JsonPath.<String>read(s1, "$.state")).isEqualTo("SELECTED");
        assertThat(JsonPath.<Boolean>read(s1, "$.selection.teacherConfirmed")).isFalse();
        assertThat(JsonPath.<String>read(studentEnsure("stu_001"), "$.state")).isEqualTo("READY");
        String o1 = official("stu_001");
        assertThat(JsonPath.<List<String>>read(o1, "$.documents[*].fileName")).singleElement().asString().contains("A학교");
        assertThat(JsonPath.<String>read(o1, "$.schoolId")).as("학적 학교는 그대로").isEqualTo("school_001");
        assertThat(JsonPath.<String>read(o1, "$.officialView.sido")).isEqualTo("가상특별시");

        String c2 = candidates("stu_002");
        assertThat(JsonPath.<String>read(c2, "$.state")).as("다른 학생 선택은 영향 없음").isEqualTo("SELECT_REQUIRED");
        assertThat(JsonPath.<List<Object>>read(official("stu_002"), "$.documents")).isEmpty();
        selectView("stu_002", candidateBySido(c2, "가상광역시"), null, 200);
        studentEnsure("stu_002");
        assertThat(JsonPath.<List<String>>read(official("stu_002"), "$.documents[*].fileName")).singleElement().asString().contains("B학교");
        assertThat(JsonPath.<List<String>>read(official("stu_001"), "$.documents[*].fileName")).singleElement().asString().contains("A학교");

        // 관리자 공통 매핑·학적 학교 슬롯은 바뀌지 않았다
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_school_mapping where school_id='school_001'", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from assessment_schoolinfo_slot_link where school_id='school_001'", Integer.class)).isZero();

        // 다른 학교 원본(B)은 학생 1에게 404 · 본인 원본은 내려받기 OK
        String aDoc = JsonPath.read(official("stu_001"), "$.documents[0].sourceDocumentId");
        String bDoc = JsonPath.read(official("stu_002"), "$.documents[0].sourceDocumentId");
        mvc.perform(asStudent(get(OFFICIAL + "/files/" + aDoc), "stu_001").param("academicYear", "2026").param("semester", "1")).andExpect(status().isOk());
        mvc.perform(asStudent(get(OFFICIAL + "/files/" + bDoc), "stu_001").param("academicYear", "2026").param("semester", "1")).andExpect(status().isNotFound());

        // 같은 학교를 다른 학생이 골라도 다시 받지 않는다(학교 단위 공유)
        long downloads = FAKE.count("EiFileDownLoad");
        String c3 = candidates("stu_003");
        selectView("stu_003", candidateBySido(c3, "가상특별시"), null, 200);
        studentEnsure("stu_003");
        assertThat(FAKE.count("EiFileDownLoad")).as("같은 학교 원본 재다운로드 0").isEqualTo(downloads);

        // 위조 후보 · 오래된 version → 409, 아무것도 바뀌지 않음
        selectView("stu_001", "cand_forged", null, 409);
        selectView("stu_001", candidateBySido(c1, "가상광역시"), 0L, 409);
        assertThat(JsonPath.<String>read(official("stu_001"), "$.officialView.sido")).isEqualTo("가상특별시");

        // 철회 → 다시 선택 필요, 원본 0 · 감사 기록
        String cleared = mvc.perform(asStudent(delete(OFFICIAL + "/view-selection"), "stu_001")).andExpect(status().isOk()).andReturn().getResponse()
                .getContentAsString();
        assertThat(JsonPath.<String>read(cleared, "$.state")).isEqualTo("SELECT_REQUIRED");
        assertThat(JsonPath.<List<Object>>read(official("stu_001"), "$.documents")).isEmpty();
        assertThat(jdbc.queryForList("select action from assessment_student_official_view_event where student_id='stu_001' order by occurred_at",
                String.class)).containsExactly("SELECT", "CLEAR");
    }

    @Test
    void 관리자가_학교를_고르면_관리자_매핑이_먼저이고_학생은_더_고를_수_없다() throws Exception {
        twoSameName();
        studentEnsure("stu_001");
        String c1 = candidates("stu_001");
        selectView("stu_001", candidateBySido(c1, "가상특별시"), null, 200);
        studentEnsure("stu_001");

        // 관리자가 B(가상광역시)를 학교 공통 매핑으로 고름
        String job = mvc.perform(asAdmin(post(SYNC), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"schoolId\":\"school_001\",\"requestedAcademicYears\":[2026,2025,2024],\"grades\":[1,2,3],\"semesters\":[1,2],\"force\":true}"))
                .andReturn().getResponse().getContentAsString();
        String done = waitJob(JsonPath.read(job, "$.jobId"));
        List<String> ids = JsonPath.read(done, "$.schoolSelection.candidates[?(@.sido == '가상광역시')].candidateId");
        String chosen = mvc.perform(asAdmin(post(SYNC + "/school-selection"), OPERATOR).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"schoolId\":\"school_001\",\"jobId\":\"" + JsonPath.read(done, "$.jobId") + "\",\"candidateId\":\"" + ids.getFirst()
                                + "\",\"expectedVersion\":0}"))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        waitJob(JsonPath.read(chosen, "$.jobId"));

        String after = official("stu_001");
        assertThat(JsonPath.<List<String>>read(after, "$.documents[*].fileName")).singleElement().asString().contains("B학교");
        assertThat(JsonPath.<Object>read(after, "$.officialView")).as("관리자 매핑이 있으면 학생 선택은 쓰지 않는다").isNull();
        assertThat(JsonPath.<String>read(candidates("stu_001"), "$.state")).isEqualTo("ADMIN_CONFIRMED");
        selectView("stu_001", candidateBySido(c1, "가상특별시"), null, 409);
    }
}
