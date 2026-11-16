package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Analyzer;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Locator;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.PageRange;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.RubricCriterion;
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
    final PlanRevision revision = PlanRevision.upload("plan_1", 1, "p.pdf", "application/pdf", 10, SHA, 5, null, null,
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

    // ── A16: 과목 근거 쪽 범위 (api-contract §39-3 PDF 원문 근거 쪽 범위 규칙) ──

    static List<String> violations(AnalysisImportValidator.Result result) {
        return result.violations().stream().map(v -> v.field() + ":" + v.reason()).toList();
    }

    static PageRange pages(int from, int to) {
        return new PageRange(from, to);
    }

    @Test
    void A16_과목_근거는_과목_본문_범위_밖의_공통_머리글_쪽을_허용한다() {
        // F01664 모양: 과목 본문 2~2쪽, 과목 근거 = [2쪽 본문, 1쪽 공통 머리글]
        Subject subject = new Subject("국어", pages(2, 2), null, null,
                List.of(new Locator(2, null, null), new Locator(1, null, null)));
        AnalysisImportValidator.Result result = validator.validate(request(subject), revision);
        assertThat(violations(result)).isEmpty();
        assertThat(result.valid()).isTrue();
    }

    @Test
    void A16_40과목_중_22과목이_머리글_근거를_가져도_모두_받는다() {
        List<Subject> subjects = new java.util.ArrayList<>();
        for (int i = 0; i < 40; i++) {
            List<Locator> sources = i < 22 ? List.of(new Locator(2, null, null), new Locator(1, null, null))
                    : List.of(new Locator(2, null, null));
            subjects.add(new Subject("과목" + i, pages(2, 2), null, null, sources));
        }
        AnalysisImportRequest forty = new AnalysisImportRequest(new Analyzer("curriculum-analysis", "v20"),
                new SourceDocument(SHA, 5), "REVIEW_REQUIRED", null, subjects, null);
        assertThat(violations(validator.validate(forty, revision))).isEmpty();
    }

    @Test
    void A16_과목_근거라도_문서_쪽_수_밖이면_거절한다() {
        Subject subject = new Subject("국어", pages(2, 2), null, null,
                List.of(new Locator(2, null, null), new Locator(6, null, null)));
        assertThat(violations(validator.validate(request(subject), revision)))
                .containsExactly("subjects[0].sources[1].pdfPageNumber:out_of_range");
        // pageRange가 없어도 문서 쪽 수 검사는 그대로
        Subject noRange = new Subject("수학", null, null, null, page(9));
        assertThat(violations(validator.validate(request(noRange), revision)))
                .containsExactly("subjects[0].sources[0].pdfPageNumber:out_of_range");
    }

    @Test
    void A16_과목_pageRange_자체의_유효성_검사는_유지한다() {
        Subject beyond = new Subject("국어", pages(2, 6), null, null, page(2));
        assertThat(violations(validator.validate(request(beyond), revision)))
                .containsExactly("subjects[0].pageRange:out_of_range");
        Subject reversed = new Subject("국어", pages(3, 2), null, null, page(2));
        assertThat(violations(validator.validate(request(reversed), revision)))
                .containsExactly("subjects[0].pageRange:out_of_range");
    }

    @Test
    void A16_평가_수행_채점_근거는_과목_본문_범위를_계속_적용한다() {
        Subject written = new Subject("국어", pages(2, 3),
                new WrittenEvaluation(BigDecimal.valueOf(60), page(1), null), null, page(1));
        assertThat(violations(validator.validate(request(written), revision)))
                .containsExactly("subjects[0].writtenEvaluation.sources[0].pdfPageNumber:out_of_range");

        Subject performance = new Subject("국어", pages(2, 3), null,
                new PerformanceEvaluation(BigDecimal.valueOf(40), page(1), List.of(item("p1", 40, page(4)))), page(1));
        assertThat(violations(validator.validate(request(performance), revision))).containsExactlyInAnyOrder(
                "subjects[0].performanceEvaluation.sources[0].pdfPageNumber:out_of_range",
                "subjects[0].performanceEvaluation.items[0].sources[0].pdfPageNumber:out_of_range");

        PerformanceItem rubricItem = new PerformanceItem("p1", "발표", null, null, BigDecimal.valueOf(40), null, null,
                null, null, List.of(new RubricCriterion("내용", List.of(), page(5))), page(2));
        Subject rubric = new Subject("국어", pages(2, 3), null,
                new PerformanceEvaluation(BigDecimal.valueOf(40), page(2), List.of(rubricItem)), page(1));
        assertThat(violations(validator.validate(request(rubric), revision)))
                .containsExactly("subjects[0].performanceEvaluation.items[0].rubric[0].sources[0].pdfPageNumber:out_of_range");
    }

    @Test
    void 실패_결과는_과목이_없어야_하고_사유가_필요하다() {
        AnalysisImportRequest failed = new AnalysisImportRequest(new Analyzer("a", "1"), new SourceDocument(SHA, 5),
                "FAILED", null, List.of(new Subject("x", null, null, null, null)), null);
        assertThat(validator.validate(failed, revision).violations()).extracting(v -> v.reason())
                .contains("must_be_empty_when_failed", "required");
    }
}
