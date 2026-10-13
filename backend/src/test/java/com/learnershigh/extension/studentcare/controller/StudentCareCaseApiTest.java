package com.learnershigh.extension.studentcare.controller;

import static com.learnershigh.extension.studentcare.controller.StudentCareApiTestSupport.BRANCH;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.common.time.AdjustableClock;
import com.learnershigh.extension.support.MySqlContainerConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** 사유 확인 / 조정 시작 / 메모 / 학생 기록 (api-contract.md §65-4, 65-7, 65-8). */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class StudentCareCaseApiTest {

    static final String ADJUSTMENT = """
            {"branchId":"br_gangnam","studentId":"stu_005","reason":"ADJUSTMENT_NEEDED",
             "memo":"시험 범위가 넓어 수학을 미루고 있다고 함",
             "plan":{"goal":"수학 비중을 계획한 30% 가까이","action":"큰 수학 항목을 30분씩 4회로 나누기",
                     "loadLimit":"주 2시간 추가까지","recheckDate":"2026-10-07","agreedWithStudent":true}}""";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    AdjustableClock clock;

    @BeforeEach
    void setUp() {
        StudentCareApiTestSupport.reset(jdbc, clock);
    }

    ResultActions open(String body) throws Exception {
        return mvc.perform(post("/api/admin/student-care/cases").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void startAdjustmentMovesStudentToInAdjustment() throws Exception {
        open(ADJUSTMENT)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.caseId", startsWith("care_")))
                .andExpect(jsonPath("$.status").value("IN_ADJUSTMENT"))
                .andExpect(jsonPath("$.reason").value("ADJUSTMENT_NEEDED"))
                .andExpect(jsonPath("$.openedOn").value("2026-09-30"))
                .andExpect(jsonPath("$.recheckDate").value("2026-10-07"))
                .andExpect(jsonPath("$.recheckDue").value(false))
                .andExpect(jsonPath("$.comparison").doesNotExist())
                .andExpect(jsonPath("$.baseline[0].type").value("SUBJECT_SHARE"))
                .andExpect(jsonPath("$.baseline[0].value").value(12))
                .andExpect(jsonPath("$.baseline[0].target").value(30))
                .andExpect(jsonPath("$.baseline[0].unit").value("PERCENT"))
                .andExpect(jsonPath("$.plan.agreedWithStudent").value(true))
                .andExpect(jsonPath("$.events[*].type", contains("REASON_CONFIRMED", "ADJUSTMENT_STARTED")))
                .andExpect(jsonPath("$.events[0].content").value("사유 확인: 조정 필요 — 시험 범위가 넓어 수학을 미루고 있다고 함"))
                .andExpect(jsonPath("$.events[1].createdAt", startsWith("2026-09-30T12:00:00+09:00")));

        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.needsCheck", hasSize(6)))
                .andExpect(jsonPath("$.needsCheck[*].studentId", not(hasItem("stu_005"))))
                .andExpect(jsonPath("$.inAdjustment[0].studentName").value("윤서연"))
                .andExpect(jsonPath("$.inAdjustment[0].goal").value("수학 비중을 계획한 30% 가까이"))
                .andExpect(jsonPath("$.inAdjustment[0].signals[0].label").value("과목 배분 차이"))
                .andExpect(jsonPath("$.inAdjustment[0].recheckDue").value(false));

        mvc.perform(get("/api/admin/student-care/students/stu_005").param("branchId", BRANCH))
                .andExpect(jsonPath("$.activeCase.status").value("IN_ADJUSTMENT"))
                .andExpect(jsonPath("$.planSuggestion").doesNotExist());
    }

    @Test
    void secondStartForSameStudentIsConflict() throws Exception {
        open(ADJUSTMENT).andExpect(status().isCreated());

        open(ADJUSTMENT)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ACTIVE_CARE_CASE_EXISTS"));
        org.assertj.core.api.Assertions.assertThat(
                jdbc.queryForObject("select count(*) from care_case", Integer.class)).isEqualTo(1);
    }

    @Test
    void expectedChangeClosesAndHidesSameSignalDuringCooldown() throws Exception {
        open("""
                {"branchId":"br_gangnam","studentId":"stu_001","reason":"EXPECTED_CHANGE","memo":"가족 여행"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.closeType").value("EXPECTED_CHANGE"))
                .andExpect(jsonPath("$.closedOn").value("2026-09-30"))
                .andExpect(jsonPath("$.events[*].type", contains("REASON_CONFIRMED", "CLOSED")));

        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.needsCheck[*].studentId", not(hasItem("stu_001"))));

        clock.setDate(StudentCareApiTestSupport.ANCHOR.plusDays(2));
        mvc.perform(get("/api/admin/student-care/board").param("branchId", BRANCH))
                .andExpect(jsonPath("$.needsCheck[*].studentId", not(hasItem("stu_001"))));
    }

    @Test
    void recordIssueCloses() throws Exception {
        open("""
                {"branchId":"br_gangnam","studentId":"stu_002","reason":"RECORD_ISSUE"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.closeType").value("RECORD_ISSUE"));
    }

    @Test
    void studentWithoutSignalCannotOpenCase() throws Exception {
        open("""
                {"branchId":"br_gangnam","studentId":"stu_009","reason":"EXPECTED_CHANGE"}""")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STUDENT_NOT_FLAGGED"));
    }

    @Test
    void adjustmentInputErrorsAre422() throws Exception {
        open("""
                {"branchId":"br_gangnam","studentId":"stu_005","reason":"ADJUSTMENT_NEEDED"}""")
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("PLAN_REQUIRED"));
        open(ADJUSTMENT.replace("\"agreedWithStudent\":true", "\"agreedWithStudent\":false"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("STUDENT_AGREEMENT_REQUIRED"));
        open(ADJUSTMENT.replace("2026-10-07", "2026-09-30"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("INVALID_RECHECK_DATE"));
        open(ADJUSTMENT.replace("\"goal\":\"수학 비중을 계획한 30% 가까이\"", "\"goal\":\"  \""))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("PLAN_REQUIRED"));
    }

    @Test
    void malformedRequestIsValidationError() throws Exception {
        open("""
                {"branchId":"br_gangnam","studentId":"stu_005"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fields[0].field").value("reason"))
                .andExpect(jsonPath("$.details.fields[0].reason").value("required"));
        open("""
                {"branchId":"br_gangnam","studentId":"stu_005","reason":"UNKNOWN"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void notesAndHistoryKeepEveryStepNewestFirst() throws Exception {
        String caseId = JsonPath.read(open(ADJUSTMENT).andReturn().getResponse().getContentAsString(), "$.caseId");

        mvc.perform(post("/api/admin/student-care/cases/{caseId}/notes", caseId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"channel":"CALL","content":"어머니와 통화. 시험 끝나면 수학 시간을 늘리기로 함"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("NOTE"))
                .andExpect(jsonPath("$.noteChannel").value("CALL"))
                .andExpect(jsonPath("$.caseId").value(caseId));

        mvc.perform(get("/api/admin/student-care/students/stu_005/history").param("branchId", BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student.studentName").value("윤서연"))
                .andExpect(jsonPath("$.items[*].type", contains("NOTE", "ADJUSTMENT_STARTED", "REASON_CONFIRMED")))
                .andExpect(jsonPath("$.items[0].content").value("어머니와 통화. 시험 끝나면 수학 시간을 늘리기로 함"));
    }

    @Test
    void noteValidationAndUnknownCase() throws Exception {
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/notes", "care_none")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"channel\":\"CALL\",\"content\":\"메모\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CARE_CASE_NOT_FOUND"));
        mvc.perform(post("/api/admin/student-care/cases/{caseId}/notes", "care_none")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"channel\":\"CALL\",\"content\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].field").value("content"));
    }

    @Test
    void historyOfStudentWithoutCaseIsEmpty() throws Exception {
        mvc.perform(get("/api/admin/student-care/students/stu_009/history").param("branchId", BRANCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)));
    }
}
