package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.entity.PlanAnalysisStatus;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.FieldViolation;
import jakarta.validation.Validation;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * analysis-import-0.3 DRAFT 수신 (§39-3, A6 2026-11-15). 합성 Fixture(contract03/README.md) 기준.
 * 설정이 꺼져 있으면 0.3은 거절(0.2 엄격 유지), 켜져 있으면 버전별 규칙으로 받는다. 정밀도 8종은 값 그대로 남는다.
 */
class AnalysisImportContract03Test {

    static final JsonMapper MAPPER = JsonMapper.builder().build();
    final AnalysisImportParser enabled = new AnalysisImportParser(MAPPER,
            Validation.buildDefaultValidatorFactory().getValidator(), true);
    final AnalysisImportParser disabled = new AnalysisImportParser(MAPPER,
            Validation.buildDefaultValidatorFactory().getValidator(), false);
    final AnalysisImportValidator validator = new AnalysisImportValidator();

    static String fixture() throws IOException {
        try (InputStream in = AnalysisImportContract03Test.class
                .getResourceAsStream("/assessment/contract03/synthetic-0.3.analysis-import.json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    static ObjectNode tree() throws IOException {
        return (ObjectNode) MAPPER.readTree(fixture());
    }

    static ObjectNode subject(ObjectNode root) {
        return (ObjectNode) root.get("subjects").get(0);
    }

    PlanRevision revision(String sha) {
        return PlanRevision.upload("plan_1", 1, "synthetic-e2e.pdf", "application/pdf", 10, sha, 2, null, null, "adm",
                Instant.parse("2026-11-15T00:00:00Z"));
    }

    List<FieldViolation> violations(ObjectNode root) {
        AnalysisImportRequest request = enabled.parse(root.toString());
        return validator.validate(request, revision(request.source().sha256())).violations();
    }

    static String reasons(List<FieldViolation> list) {
        return list.stream().map(v -> v.field() + ":" + v.reason()).toList().toString();
    }

    @Test
    void 설정이_꺼져_있으면_0_3은_지금처럼_거절한다() throws IOException {
        assertThatThrownBy(() -> disabled.parse(fixture())).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(String.valueOf(((BusinessException) e).details()))
                        .contains("contractVersion").contains("unknown_field"));
    }

    @Test
    void 켜져_있으면_합성_0_3을_받고_정밀도_8종과_issue를_그대로_보존한다() throws IOException {
        AnalysisImportRequest request = enabled.parse(fixture());
        assertThat(request.contract03()).isTrue();
        assertThat(request.status()).isEqualTo("PARTIAL");
        assertThat(request.analyzer().profile()).isEqualTo("synthetic-0.3");
        AnalysisImportRequest.Subject subject = request.subjects().getFirst();
        assertThat(subject.teachingPlan()).extracting(row -> row.schedule().precision()).containsExactly(
                "EXACT_DATE", "DATE_RANGE", "WEEK_IN_MONTH", "TERM_WEEK", "MONTH", "MONTH_RANGE", "WEEK_UNRESOLVED",
                "UNKNOWN", "EXACT_DATE");
        assertThat(subject.extraction().issues()).hasSize(3);
        assertThat(validator.validate(request, revision(request.source().sha256())).violations()).isEmpty();
        // 저장 JSON에 0.3 필드가 손실 없이 남는다 (Run result_json = subjects)
        String stored = MAPPER.writeValueAsString(request.subjects());
        assertThat(stored).contains("\"precision\":\"TERM_WEEK\"").contains("\"weekScope\":\"TERM_SEQUENCE\"")
                .contains("\"calendarYearBasis\":\"EXPLICIT_IN_CELL\"").contains("FIELD_NOT_PROVIDED");
    }

    @Test
    void _0_2_payload는_0_3_필드를_계속_거절한다() throws IOException {
        ObjectNode root = tree();
        root.remove("contractVersion");
        assertThatThrownBy(() -> enabled.parse(root.toString())).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(String.valueOf(((BusinessException) e).details()))
                        .contains("analyzer.profile").contains("subjects[0].extraction")
                        .contains("subjects[0].teachingPlan").contains("status"));
    }

    @Test
    void 연도는_원문에_명시된_근거가_있을_때만_받는다() throws IOException {
        ObjectNode root = tree();
        ObjectNode schedule = (ObjectNode) subject(root).get("teachingPlan").get(0).get("schedule");
        schedule.put("calendarYear", 2026); // 학년도로 연도를 채움 (근거 없음)
        assertThat(reasons(violations(root))).contains("teachingPlan[0].schedule.calendarYear:explicit_basis_required");
    }

    @Test
    void 날짜_정밀도와_날짜는_서로_맞아야_하고_주차_범위가_뒤집히면_거절한다() throws IOException {
        ObjectNode root = tree();
        ArrayNode rows = (ArrayNode) subject(root).get("teachingPlan");
        ((ObjectNode) rows.get(4).get("schedule")).set("dateFrom",
                MAPPER.readTree("{\"year\":null,\"month\":11,\"day\":1}")); // MONTH인데 날짜
        ((ObjectNode) rows.get(2)).put("weekFrom", 4).put("weekTo", 2);
        String reasons = reasons(violations(root));
        assertThat(reasons).contains("teachingPlan[4].schedule.dateFrom:precision_conflict")
                .contains("teachingPlan[2].weekTo:out_of_range");
    }

    @Test
    void 근거_없는_원문에_없음과_값이_있는_추출_실패와_없는_경로를_거절한다() throws IOException {
        ObjectNode root = tree();
        ArrayNode issues = (ArrayNode) subject(root).get("extraction").get("issues");
        ((ObjectNode) issues.get(0)).remove("sources");
        issues.add(MAPPER.readTree("{\"code\":\"FIELD_EXTRACTION_FAILED\",\"fieldPath\":\"performanceEvaluation.items[0].weightPercent\"}"));
        issues.add(MAPPER.readTree("{\"code\":\"RUBRIC_NOT_LINKED\",\"fieldPath\":\"performanceEvaluation.items[9].rubric\"}"));
        issues.add(MAPPER.readTree("{\"code\":\"FIELD_REVIEW_REQUIRED\",\"fieldPath\":\"performanceEvaluation.items[0].timing\"}"));
        String reasons = reasons(violations(root));
        assertThat(reasons).contains("issues[0].sources:evidence_required")
                .contains("issues[3].code:status_value_conflict")
                .contains("issues[4].fieldPath:path_mismatch")
                .contains("issues[5].fieldPath:duplicate_field_status");
    }

    @Test
    void 모르는_issue_코드는_보존하고_빈_운영계획은_상태_issue가_있어야_한다() throws IOException {
        ObjectNode root = tree();
        ArrayNode issues = (ArrayNode) subject(root).get("extraction").get("issues");
        issues.add(MAPPER.readTree("{\"code\":\"NEW_CODE_FROM_ANALYZER\",\"severity\":\"INFO\"}"));
        assertThat(violations(root)).isEmpty();
        issues.remove(2); // TEACHING_PLAN_PARTIAL 제거
        subject(root).set("teachingPlan", MAPPER.createArrayNode());
        assertThat(reasons(violations(root))).contains("subjects[0].teachingPlan:teaching_plan_status_required");
    }

    @Test
    void 행마다_근거가_필요하고_rowKey는_과목_안에서_유일하다() throws IOException {
        ObjectNode root = tree();
        ArrayNode rows = (ArrayNode) subject(root).get("teachingPlan");
        ((ObjectNode) rows.get(1)).put("rowKey", "T01");
        ((ObjectNode) rows.get(3)).set("sources", MAPPER.readTree("[{\"pdfPageNumber\":9}]")); // 2쪽 문서
        String reasons = reasons(violations(root));
        assertThat(reasons).contains("teachingPlan[1].rowKey:duplicate")
                .contains("teachingPlan[3].sources[0].pdfPageNumber:out_of_range");
    }

    @Test
    void 실패_결과는_코드로_된_failureReason만_받는다() throws IOException {
        ObjectNode root = tree();
        root.put("status", "FAILED").put("failureReason", "OCR 필요");
        root.set("subjects", MAPPER.createArrayNode());
        assertThat(reasons(violations(root))).contains("failureReason:format");
        root.put("failureReason", "NEEDS_OCR");
        assertThat(violations(root)).isEmpty();
        root.put("status", "PARTIAL");
        root.set("subjects", tree().get("subjects"));
        assertThat(reasons(violations(root))).contains("failureReason:not_allowed");
    }

    @Test
    void Envelope와_payload_판정이_맞아야_저장한다() {
        assertThat(PlanAnalysisService.runStatus03("PARTIAL", "PARTIAL")).isEqualTo(PlanAnalysisStatus.PARTIAL);
        assertThat(PlanAnalysisService.runStatus03("OK_REVIEW_REQUIRED", "REVIEW_REQUIRED"))
                .isEqualTo(PlanAnalysisStatus.REVIEW_REQUIRED);
        assertThat(PlanAnalysisService.runStatus03("NO_ASSESSMENTS_EXTRACTED", "FAILED"))
                .isEqualTo(PlanAnalysisStatus.FAILED);
        assertThatThrownBy(() -> PlanAnalysisService.runStatus03("PARTIAL", "REVIEW_REQUIRED"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(String.valueOf(((BusinessException) e).details())).contains("status_conflict"));
        assertThatThrownBy(() -> PlanAnalysisService.runStatus03("SOMETHING_NEW", "FAILED"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(String.valueOf(((BusinessException) e).details())).contains("unknown_status"));
        // 0.2 표는 그대로: NO_ASSESSMENTS_EXTRACTED는 아직 unknown_status (결정 대기)
        assertThatThrownBy(() -> PlanAnalysisService.runStatus("NO_ASSESSMENTS_EXTRACTED", "FAILED"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(String.valueOf(((BusinessException) e).details())).contains("unknown_status"));
    }
}
