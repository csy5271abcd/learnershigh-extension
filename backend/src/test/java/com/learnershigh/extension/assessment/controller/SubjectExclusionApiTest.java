package com.learnershigh.extension.assessment.controller;

import static com.learnershigh.extension.assessment.controller.SchoolAssessmentApiTest.asAdmin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.learnershigh.extension.assessment.integration.roster.DemoRoster;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.hamcrest.Matchers;
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
 * A27-UX 관리자 추가 수정(DRAFT): 검토 초안의 과목 제외(subjectExclusions) — 저장·재조회(새로고침) 복구·이전 클라이언트 보존·검증·
 * 제외 과목 확정 거절·복원 후 확정. 합성 Fixture {@code contract03-ext/subject-table-grades}(원문 1학년 과목 2개 + 2학년 과목 1개)를
 * 1학년 1학기 슬롯에 올려 "1학년 문서에 2학년 과목 포함"을 재현한다. 설정은 {@link AllGradesPlanSlotApiTest}와 같다(Context 공유).
 */
@Tag("integration")
@SpringBootTest(properties = {"assessment.demo-roster.enabled=true", "assessment.analysis-import.enabled=true",
    "assessment.analysis-import.contract03-enabled=true",
    "assessment.plan-storage.root=${java.io.tmpdir}/learnershigh-it-plan-storage"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
class SubjectExclusionApiTest {

    static final String PLANS = EvaluationPlanApiTest.PLANS;
    static final String OPERATOR = EvaluationPlanApiTest.OPERATOR;
    static final String REVIEWER = "adm_gangnam";

    @Autowired
    MockMvc mvc;
    @Autowired
    DemoRoster roster;

    record Doc(String planId, String revisionId, String analysisId) {
        String base() {
            return PLANS + "/" + planId + "/revisions/" + revisionId;
        }
    }

    Doc registerGrade1WithGrade2Subject() throws Exception {
        String school = roster.student("stu_demo_001").orElseThrow().school().schoolId();
        String marker = "a27-exclude-" + System.nanoTime();
        byte[] bytes = EvaluationPlanApiTest.pdf(2, marker);
        String created = mvc.perform(asAdmin(multipart(PLANS).file(new MockMultipartFile("file", "합성-" + marker + ".pdf",
                        "application/pdf", bytes)), OPERATOR)
                        .param("schoolId", school).param("academicYear", "2026").param("grade", "1").param("semester", "1"))
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
                .andExpect(status().isCreated()).andExpect(jsonPath("$.subjects.length()").value(3))
                .andReturn().getResponse().getContentAsString();
        return new Doc(planId, revisionId, JsonPath.read(imported, "$.analysisId"));
    }

    String draftBody(Doc doc, Long baseVersion, String exclusionsJson) {
        return """
                {"analysisId":"%s","baseVersion":%s,"decisions":[
                  {"subjectIndex":1,"fieldPath":"performanceEvaluation.items[0].weightPercent","decision":"CONFIRMED","value":"30","pdfPageNumber":1}
                ],"subjectLinks":[]%s}"""
                .formatted(doc.analysisId(), baseVersion == null ? "null" : baseVersion.toString(),
                        exclusionsJson == null ? "" : ",\"subjectExclusions\":" + exclusionsJson);
    }

    long version(String body) {
        return ((Number) JsonPath.read(body, "$.draft.version")).longValue();
    }

    String confirmBody(Doc doc, String subjectId, int analysisSubjectIndex) {
        return """
                {"analysisId":"%s","decision":"CONFIRM","reviewedSubjects":[{"subjectId":"%s","analysisSubjectIndex":%d,
                  "confirmedFields":[{"fieldPath":"performanceEvaluation.items[0].weightPercent","value":30,"pdfPageNumber":1}]}]}"""
                .formatted(doc.analysisId(), subjectId, analysisSubjectIndex);
    }

    @Test
    void 과목_제외는_서버_초안에_저장되고_새로고침_뒤에도_남으며_이전_클라이언트_저장으로_사라지지_않는다() throws Exception {
        Doc doc = registerGrade1WithGrade2Subject();
        String draft = doc.base() + "/review-draft";
        String saved = mvc.perform(asAdmin(put(draft), REVIEWER).contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(doc, null, "[{\"subjectIndex\":2,\"reason\":\"OTHER_GRADE\",\"note\":\"원문 2학년 과목\"}]")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.subjectExclusions[0].subjectIndex").value(2))
                .andExpect(jsonPath("$.draft.subjectExclusions[0].reason").value("OTHER_GRADE"))
                .andExpect(jsonPath("$.history[0].changedFields", Matchers.hasItem("2|excluded")))
                .andReturn().getResponse().getContentAsString();
        // 새로고침(GET) 뒤에도 같은 제외 · 원래 결정(과목 #1)은 그대로
        mvc.perform(asAdmin(get(draft), REVIEWER))
                .andExpect(jsonPath("$.draft.subjectExclusions.length()").value(1))
                .andExpect(jsonPath("$.draft.subjectExclusions[0].note").value("원문 2학년 과목"))
                .andExpect(jsonPath("$.draft.decisions.length()").value(1));
        // 제외 필드를 보내지 않는 이전 클라이언트 저장은 제외를 지우지 않는다
        String old = mvc.perform(asAdmin(put(draft), REVIEWER).contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(doc, version(saved), null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.subjectExclusions[0].subjectIndex").value(2))
                .andReturn().getResponse().getContentAsString();
        // 복원(빈 목록) → 제외 없음, 기록에 남는다
        mvc.perform(asAdmin(put(draft), REVIEWER).contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(doc, version(old), "[]")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.subjectExclusions.length()").value(0))
                .andExpect(jsonPath("$.history[0].changedFields", Matchers.hasItem("2|excluded")));
    }

    @Test
    void 범위_밖_중복_모르는_사유는_400() throws Exception {
        Doc doc = registerGrade1WithGrade2Subject();
        String draft = doc.base() + "/review-draft";
        for (String bad : new String[] {
                "[{\"subjectIndex\":9,\"reason\":\"OTHER\"}]",
                "[{\"subjectIndex\":1,\"reason\":\"OTHER\"},{\"subjectIndex\":1,\"reason\":\"DUPLICATE\"}]",
                "[{\"subjectIndex\":1,\"reason\":\"DELETE\"}]"}) {
            mvc.perform(asAdmin(put(draft), REVIEWER).contentType(MediaType.APPLICATION_JSON).content(draftBody(doc, null, bad)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void 제외한_과목은_확정할_수_없고_복원하면_확정된다() throws Exception {
        Doc doc = registerGrade1WithGrade2Subject();
        String subjectId = JsonPath.read(mvc.perform(asAdmin(get(PLANS + "/" + doc.planId() + "/subjects"), OPERATOR))
                .andReturn().getResponse().getContentAsString(), "$.items[0].subjectId");
        String draft = doc.base() + "/review-draft";
        String saved = mvc.perform(asAdmin(put(draft), REVIEWER).contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(doc, null, "[{\"subjectIndex\":1,\"reason\":\"DUPLICATE\"}]")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        mvc.perform(asAdmin(put(doc.base() + "/review"), REVIEWER).contentType(MediaType.APPLICATION_JSON)
                        .content(confirmBody(doc, subjectId, 1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.fields[*].reason", Matchers.hasItem("subject_excluded")));
        // 아무것도 확정되지 않았다
        mvc.perform(asAdmin(get(doc.base() + "/reviews"), REVIEWER)).andExpect(jsonPath("$.items.length()").value(0));
        // 복원 → 확정
        mvc.perform(asAdmin(put(draft), REVIEWER).contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(doc, version(saved), "[]")))
                .andExpect(status().isOk());
        mvc.perform(asAdmin(put(doc.base() + "/review"), REVIEWER).contentType(MediaType.APPLICATION_JSON)
                        .content(confirmBody(doc, subjectId, 1)))
                .andExpect(status().isOk());
    }
}
