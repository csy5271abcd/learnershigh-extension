package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asStudent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.integration.context.MockAcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.SubjectCatalog;
import com.learnershigh.extension.assessment.integration.roster.DemoRoster;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
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
 * A18 학년별 개발용 시연 슬롯(api-contract §38-4)으로 1·2·3학년 문서를 확정·공개한다. 합성 데이터만 쓴다(명단 합성 학교·학생, 합성 PDF,
 * 계정 B 합성 Fixture {@code contract03-ext/subject-table-grades} — 원문 1학년 과목 2개 + 2학년 과목 1개).
 * 설정은 {@link AdminSchoolScopeApiTest}와 같아 Spring Context(MySQL 컨테이너)를 공유한다.
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.demo-roster.enabled=true", "assessment.analysis-import.enabled=true",
    "assessment.analysis-import.contract03-enabled=true",
    "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class AllGradesPlanSlotApiTest {

    static final String PLANS = EvaluationPlanApiTest.PLANS;
    static final String OPERATOR = EvaluationPlanApiTest.OPERATOR;
    static final String REVIEWER = "adm_gangnam";

    @Autowired
    MockMvc mvc;
    @Autowired
    DemoRoster roster;
    @Autowired
    SubjectCatalog catalog;

    record Uploaded(String planId, String revisionId, String analysisId) {
    }

    Uploaded registerAndImport(String schoolId, int grade, int semester, String marker) throws Exception {
        byte[] bytes = EvaluationPlanApiTest.pdf(2, marker);
        String created = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "합성-" + marker + ".pdf",
                        "application/pdf", bytes)), OPERATOR)
                        .param("schoolId", schoolId).param("academicYear", "2026")
                        .param("grade", String.valueOf(grade)).param("semester", String.valueOf(semester)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String planId = JsonPath.read(created, "$.planId");
        String revisionId = JsonPath.read(created, "$.documentRevisionId");
        String payload;
        try (InputStream in = getClass().getResourceAsStream("/assessment/contract03-ext/subject-table-grades.ext.json")) {
            payload = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        payload = payload.replace("1111111111111111111111111111111111111111111111111111111111111111",
                EvaluationPlanApiTest.sha256(bytes)).replace("\"format\": \"PDF\",", "").replace("\"format\":\"PDF\",", "");
        String imported = mvc.perform(asAdmin(post(PLANS + "/" + planId + "/revisions/" + revisionId + "/analysis-imports"), OPERATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subjects.length()").value(3))
                .andExpect(jsonPath("$.subjects[2].grades[0]").value(2))
                .andReturn().getResponse().getContentAsString();
        return new Uploaded(planId, revisionId, JsonPath.read(imported, "$.analysisId"));
    }

    String confirmBody(Uploaded doc, String subjectId, int analysisSubjectIndex, int page) {
        return """
                {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"%s","analysisSubjectIndex":%d,
                  "confirmedFields":[{"fieldPath":"performanceEvaluation.items[0].weightPercent","value":30,"pdfPageNumber":%d}]}]}"""
                .formatted(doc.analysisId(), subjectId, analysisSubjectIndex, page);
    }

    DemoRoster.Student studentOf(String schoolId, int grade) {
        return roster.branches().stream().flatMap(b -> roster.studentsOf(b.branchId()).stream())
                .map(s -> roster.student(s.studentId()).orElseThrow())
                .filter(s -> s.school().schoolId().equals(schoolId) && s.grade() == grade)
                .findFirst().orElseThrow();
    }

    @Test
    void 학년별_슬롯에서_그_학년_과목만_확정되고_그_학교_그_학년_그_학기_학생에게만_공개된다() throws Exception {
        String school = roster.student("stu_demo_001").orElseThrow().school().schoolId();
        DemoRoster.Student g1 = studentOf(school, 1);
        DemoRoster.Student g2 = studentOf(school, 2);
        DemoRoster.Student g3 = studentOf(school, 3);
        String otherSchool = roster.branches().stream().flatMap(b -> roster.studentsOf(b.branchId()).stream())
                .map(s -> roster.student(s.studentId()).orElseThrow())
                .filter(s -> !s.school().schoolId().equals(school) && s.grade() == 2).findFirst().orElseThrow().studentId();

        // 2학년 1학기 슬롯: 시연 카탈로그 과목, 출처 구분
        Uploaded grade2 = registerAndImport(school, 2, 1, "a18-g2-" + System.nanoTime());
        String subjects = mvc.perform(asAdmin(get(PLANS + "/" + grade2.planId() + "/subjects"), OPERATOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.grade").value(2))
                .andExpect(jsonPath("$.source").value(MockAcademicContextProvider.DEMO_SLOT_SOURCE))
                .andExpect(jsonPath("$.items.length()").value(catalog.find(2026, 2, 1).size()))
                .andReturn().getResponse().getContentAsString();
        String g2Subject = JsonPath.read(subjects, "$.items[0].subjectId");
        String review2 = PLANS + "/" + grade2.planId() + "/revisions/" + grade2.revisionId() + "/review";

        // 원문 1학년 과목(#0)을 2학년 슬롯에 확정 → grade_conflict, 아무것도 저장 안 함
        mvc.perform(asAdmin(put(review2), REVIEWER).contentType(MediaType.APPLICATION_JSON).content(confirmBody(grade2, g2Subject, 0, 1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("grade_conflict"));
        // 1학년 카탈로그 과목 ID는 2학년 슬롯 과목이 아니다
        String g1CatalogSubject = catalog.find(2026, 1, 1).getFirst().subjectId();
        mvc.perform(asAdmin(put(review2), REVIEWER).contentType(MediaType.APPLICATION_JSON).content(confirmBody(grade2, g1CatalogSubject, 2, 2)))
                .andExpect(status().isBadRequest());
        // 원문 2학년 과목(#2) → 확정
        mvc.perform(asAdmin(put(review2), REVIEWER).contentType(MediaType.APPLICATION_JSON).content(confirmBody(grade2, g2Subject, 2, 2)))
                .andExpect(status().isOk());

        // 같은 원문을 1학년 1학기 슬롯에 따로 등록 → 원문 1학년 과목(#0)만 확정, 2학년 과목(#2)은 충돌
        Uploaded grade1 = registerAndImport(school, 1, 1, "a18-g1-" + System.nanoTime());
        String g1Subject = JsonPath.read(mvc.perform(asAdmin(get(PLANS + "/" + grade1.planId() + "/subjects"), OPERATOR))
                .andReturn().getResponse().getContentAsString(), "$.items[0].subjectId");
        String review1 = PLANS + "/" + grade1.planId() + "/revisions/" + grade1.revisionId() + "/review";
        mvc.perform(asAdmin(put(review1), REVIEWER).contentType(MediaType.APPLICATION_JSON).content(confirmBody(grade1, g1Subject, 2, 2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[0].reason").value("grade_conflict"));
        mvc.perform(asAdmin(put(review1), REVIEWER).contentType(MediaType.APPLICATION_JSON).content(confirmBody(grade1, g1Subject, 0, 1)))
                .andExpect(status().isOk());

        // 학생 공개: 학교·학년도·학년·학기가 문서 슬롯과 같은 학생만 (Backend 검사)
        String student = "/api/student/assessment/evaluation-plans";
        String g2Detail = mvc.perform(asStudent(get(student + "/" + grade2.planId()), g2.studentId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grade").value(2))
                .andExpect(jsonPath("$.confirmedFields.length()").value(1))
                .andExpect(jsonPath("$.confirmedFields[0].subjectId").value(g2Subject))
                .andReturn().getResponse().getContentAsString();
        assertThat(g2Detail).doesNotContain("grades").doesNotContain("linkReview").doesNotContain("analysisSubjectIndex");
        mvc.perform(asStudent(get(student).param("schoolId", school).param("academicYear", "2026").param("grade", "2")
                        .param("semester", "1"), g2.studentId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].planId").value(org.hamcrest.Matchers.contains(grade2.planId())));
        mvc.perform(asStudent(get(student + "/" + grade1.planId()), g1.studentId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.grade").value(1));

        // 다른 학년·다른 학교·다른 학기 학생에게는 보이지 않는다
        for (String other : List.of(g1.studentId(), g3.studentId(), otherSchool)) {
            mvc.perform(asStudent(get(student + "/" + grade2.planId()), other)).andExpect(status().isNotFound());
        }
        mvc.perform(asStudent(get(student + "/" + grade1.planId()), g2.studentId())).andExpect(status().isNotFound());
        // 남의 학년 목록을 Query로 요청해도 거절
        mvc.perform(asStudent(get(student).param("schoolId", school).param("academicYear", "2026").param("grade", "2")
                        .param("semester", "1"), g3.studentId()))
                .andExpect(status().isForbidden());
        // 같은 학생의 2학기 목록에는 1학기 문서가 없다(학기 분리, 원문에서 학기를 추론하지 않음)
        mvc.perform(asStudent(get(student).param("schoolId", school).param("academicYear", "2026").param("grade", "2")
                        .param("semester", "2"), g2.studentId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void 기존_예시고_1학년_슬롯은_시연_명단을_켜도_그대로이고_2_3학년_슬롯은_없다() throws Exception {
        byte[] bytes = EvaluationPlanApiTest.pdf(2, "a18-legacy-" + System.nanoTime());
        for (int grade = 1; grade <= 3; grade++) {
            String created = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "legacy-" + grade + ".pdf",
                            "application/pdf", bytes)), OPERATOR)
                            .param("schoolId", "school_001").param("academicYear", "2026")
                            .param("grade", String.valueOf(grade)).param("semester", "2"))
                    .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
            var result = mvc.perform(asAdmin(get(PLANS + "/" + JsonPath.read(created, "$.planId") + "/subjects"), OPERATOR))
                    .andExpect(status().isOk());
            if (grade == 1) {
                result.andExpect(jsonPath("$.available").value(true))
                        .andExpect(jsonPath("$.source").value("EXISTING_LEARNERSHIGH"))
                        .andExpect(jsonPath("$.items[*].subjectId").value(
                                org.hamcrest.Matchers.contains("subj_01", "subj_02", "subj_03", "subj_04")));
            } else {
                result.andExpect(jsonPath("$.available").value(false)).andExpect(jsonPath("$.items.length()").value(0));
            }
        }
    }
}
