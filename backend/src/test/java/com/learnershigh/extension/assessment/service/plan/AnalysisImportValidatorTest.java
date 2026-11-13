package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Analyzer;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Locator;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.PerformanceEvaluation;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.PerformanceItem;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.SourceDocument;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Subject;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.WrittenEvaluation;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** 외부 분석 결과 업무 검증 (DB 없이). 합성 데이터. */
class AnalysisImportValidatorTest {

    static final String SHA = "a".repeat(64);
    final AnalysisImportValidator validator = new AnalysisImportValidator();
    final PlanRevision revision = PlanRevision.upload("plan_1", 1, "p.pdf", "application/pdf", 10, SHA, 5, null,
            "adm", Instant.parse("2026-11-09T00:00:00Z"));

    static List<Locator> page(int page) {
        return List.of(new Locator(page, null, null));
    }

    static PerformanceItem item(String key, Integer weight, List<Locator> sources) {
        return new PerformanceItem(key, "항목 " + key, null, null, weight == null ? null : BigDecimal.valueOf(weight),
                null, null, null, null, null, sources);
    }

    static AnalysisImportRequest request(Subject... subjects) {
        return new AnalysisImportRequest(new Analyzer("curriculum-analysis", "v20"), new SourceDocument(SHA, 5),
                "REVIEW_REQUIRED", null, List.of(subjects), null);
    }

    @Test
    void 비율_합계가_맞지_않으면_경고만_남기고_거절하지_않는다() {
        Subject subject = new Subject("통합과학2", null,
                new WrittenEvaluation(BigDecimal.valueOf(50), page(2), null),
                new PerformanceEvaluation(BigDecimal.valueOf(40), page(3),
                        List.of(item("p1", 20, page(3)), item("p2", 10, page(3)))),
                null);
        AnalysisImportValidator.Result result = validator.validate(request(subject), revision);
        assertThat(result.valid()).isTrue();
        assertThat(result.serverWarnings()).hasSize(2)
                .anySatisfy(w -> assertThat(w).contains("합계가 100이 아닙니다"))
                .anySatisfy(w -> assertThat(w).contains("수행 항목 비율 합계(30)"));
    }

    @Test
    void 원문에_없는_값은_null로_받고_근거를_요구하지_않는다() {
        Subject subject = new Subject("공통국어2", null, null,
                new PerformanceEvaluation(null, null, List.of(item("p1", null, null))), null);
        assertThat(validator.validate(request(subject), revision).valid()).isTrue();
    }

    @Test
    void 과목명_중복과_쪽수_불일치는_거절한다() {
        Subject subject = new Subject("통합사회2", null, null, null, page(6));
        AnalysisImportRequest twice = new AnalysisImportRequest(new Analyzer("a", "1"), new SourceDocument(SHA, 6),
                "REVIEW_REQUIRED", null, List.of(subject, subject), null);
        AnalysisImportValidator.Result result = validator.validate(twice, revision);
        assertThat(result.violations()).extracting(v -> v.field() + ":" + v.reason())
                .contains("source.pageCount:page_count_mismatch", "subjects[1].subjectName:duplicate");
    }

    @Test
    void 실패_결과는_과목이_없어야_하고_사유가_필요하다() {
        AnalysisImportRequest failed = new AnalysisImportRequest(new Analyzer("a", "1"), new SourceDocument(SHA, 5),
                "FAILED", null, List.of(new Subject("x", null, null, null, null)), null);
        assertThat(validator.validate(failed, revision).violations()).extracting(v -> v.reason())
                .contains("must_be_empty_when_failed", "required");
    }
}
