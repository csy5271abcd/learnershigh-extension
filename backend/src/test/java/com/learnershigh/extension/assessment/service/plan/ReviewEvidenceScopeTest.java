package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.DocumentLocator;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Locator;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.PerformanceEvaluation;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.PerformanceItem;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.RubricCriterion;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.RubricLevel;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Subject;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.WrittenEvaluation;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.WrittenExam;
import com.learnershigh.extension.assessment.service.plan.ReviewEvidenceScope.Status;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/** M-4 필드별 근거 범위 (승인 요청안 준비 코드, API 미연결). 합성 분석 결과로만 시험한다. */
class ReviewEvidenceScopeTest {

    static DocumentLocator cell(int row, int col) {
        return new DocumentLocator("HWP_TABLE_CELL", 0, "p3.c0.r" + row + "c" + col, 1, row, col, 1, 1, null, null);
    }

    static Locator at(DocumentLocator locator) {
        return new Locator(null, null, "원문", locator);
    }

    // 과목 0: 영역 근거 r0c0, P01 근거 r1c3, P01 채점 요소 근거 r2c1, P02 근거 r3c3 (채점 요소 근거 r4c1), 지필 W01 근거 r9c2
    static final DocumentLocator AREA = cell(0, 0), P01 = cell(1, 3), P01_RUBRIC = cell(2, 1), P02 = cell(3, 3),
            P02_RUBRIC = cell(4, 1), W01 = cell(9, 2), OTHER_SUBJECT_P01 = cell(7, 3), OTHER_RUN = cell(1, 4);

    static Subject subject(DocumentLocator p01, DocumentLocator p01Rubric, DocumentLocator p02) {
        PerformanceItem item1 = new PerformanceItem("P01", "탐구 보고서", null, null, new BigDecimal("30"), null, null,
                List.of("보고서"), List.of(), List.of(new RubricCriterion("탐구 설계", List.of(new RubricLevel("우수", new BigDecimal("10"))),
                        List.of(at(p01Rubric)))), List.of(at(p01)));
        PerformanceItem item2 = new PerformanceItem("P02", "실험 발표", null, null, new BigDecimal("30"), null, null,
                List.of(), List.of(), List.of(new RubricCriterion("발표", List.of(), List.of(at(P02_RUBRIC)))), List.of(at(p02)));
        return new Subject("가상과학", null,
                new WrittenEvaluation(new BigDecimal("40"), List.of(at(AREA)),
                        List.of(new WrittenExam("W01", 1, new BigDecimal("40"), new BigDecimal("100"), null, List.of("서술형"), List.of(at(W01))))),
                new PerformanceEvaluation(new BigDecimal("60"), List.of(at(AREA)), List.of(item1, item2)), List.of());
    }

    static final List<Subject> RUN = List.of(subject(P01, P01_RUBRIC, P02), subject(OTHER_SUBJECT_P01, cell(8, 1), cell(6, 3)));

    @Test
    void sameItemEvidenceIsAccepted() {
        var r = ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].weightPercent");
        assertThat(r.status()).isEqualTo(Status.OK);
        assertThat(r.ownerPath()).isEqualTo("performanceEvaluation.items[0]");
        assertThat(r.contains(P01)).isTrue();
        // 같은 항목의 평가명·제출물도 같은 근거 범위(분석 JSON이 필드 단위 근거를 구분하지 않음)
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].label").contains(P01)).isTrue();
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].submissions[0]").contains(P01)).isTrue();
    }

    @Test
    void otherItemEvidenceIsRejected() {
        var r = ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].weightPercent");
        assertThat(r.contains(P02)).isFalse();
        assertThat(r.contains(P02_RUBRIC)).isFalse();
    }

    @Test
    void areaOrRubricEvidenceIsNotUsedForItemValue() {
        var item = ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].weightPercent");
        assertThat(item.contains(AREA)).isFalse();
        assertThat(item.contains(P01_RUBRIC)).isFalse();
        var rubric = ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].rubric[0].levels[0].score");
        assertThat(rubric.ownerPath()).isEqualTo("performanceEvaluation.items[0].rubric[0]");
        assertThat(rubric.contains(P01_RUBRIC)).isTrue();
        assertThat(rubric.contains(P01)).isFalse();
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.weightPercent").contains(AREA)).isTrue();
    }

    @Test
    void otherSubjectEvidenceIsRejected() {
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].weightPercent").contains(OTHER_SUBJECT_P01)).isFalse();
        assertThat(ReviewEvidenceScope.resolve(RUN, 1, "performanceEvaluation.items[0].weightPercent").contains(OTHER_SUBJECT_P01)).isTrue();
        assertThat(ReviewEvidenceScope.resolve(RUN, 1, "performanceEvaluation.items[0].weightPercent").contains(P01)).isFalse();
    }

    @Test
    void otherRunOrMissingLocatorIsRejected() {
        var r = ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].weightPercent");
        assertThat(r.contains(OTHER_RUN)).isFalse();
        assertThat(r.contains(null)).isFalse();
        // 같은 칸이지만 병합 정보가 다르면 다른 Locator
        assertThat(r.contains(new DocumentLocator("HWP_TABLE_CELL", 0, "p3.c0.r1c3", 1, 1, 3, 2, 1, null, null))).isFalse();
        assertThat(r.contains(new DocumentLocator("HWPX_TABLE_CELL", 0, "p3.c0.r1c3", 1, 1, 3, 1, 1, null, null))).isFalse();
    }

    @Test
    void writtenExamFieldsUseExamEvidence() {
        var r = ReviewEvidenceScope.resolve(RUN, 0, "writtenEvaluation.exams[0].maxScore");
        assertThat(r.contains(W01)).isTrue();
        assertThat(r.contains(AREA)).isFalse();
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "writtenEvaluation.exams[0].questionTypes[0]").contains(W01)).isTrue();
    }

    @Test
    void unknownSubjectFieldOrIndexIsReported() {
        assertThat(ReviewEvidenceScope.resolve(RUN, 2, "performanceEvaluation.weightPercent").status()).isEqualTo(Status.SUBJECT_UNKNOWN);
        assertThat(ReviewEvidenceScope.resolve(RUN, null, "performanceEvaluation.weightPercent").status()).isEqualTo(Status.SUBJECT_UNKNOWN);
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[5].weightPercent").status()).isEqualTo(Status.FIELD_UNKNOWN);
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].confidence").status()).isEqualTo(Status.FIELD_UNKNOWN);
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0]").status()).isEqualTo(Status.FIELD_UNKNOWN);
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].rubric[0].levels[3].score").status()).isEqualTo(Status.FIELD_UNKNOWN);
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation..weightPercent").status()).isEqualTo(Status.FIELD_UNKNOWN);
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "subjects[0].performanceEvaluation").status()).isEqualTo(Status.FIELD_UNKNOWN);
    }

    @Test
    void nonCanonicalIndexIsRejected() {
        // "[01]"이 "[1]"과 같은 필드로 풀리면 같은 필드를 다른 문자열로 두 번 확정할 수 있다
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[01].weightPercent").status()).isEqualTo(Status.FIELD_UNKNOWN);
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[00].weightPercent").status()).isEqualTo(Status.FIELD_UNKNOWN);
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[1].weightPercent").contains(P02)).isTrue();
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "performanceEvaluation.items[0].rubric[0].levels[0].score").status()).isEqualTo(Status.OK);
    }

    @Test
    void areasOutsideAnalysisCannotBeConfirmed() {
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "achievement.standards[0]").status()).isEqualTo(Status.FIELD_NOT_IN_ANALYSIS);
        assertThat(ReviewEvidenceScope.resolve(RUN, 0, "teachingPlan.weeks").status()).isEqualTo(Status.FIELD_NOT_IN_ANALYSIS);
    }

    @Test
    void nodeWithoutStructuredEvidenceIsNotConfirmable() {
        // PDF 근거(쪽 번호)만 있는 노드: HWP·HWPX 근거 범위가 비어 있다 → 확정 불가
        PerformanceItem pdfOnly = new PerformanceItem("P01", "보고서", null, null, BigDecimal.TEN, null, null, List.of(), List.of(), List.of(),
                List.of(new Locator(2, null, "원문")));
        List<Subject> run = List.of(new Subject("가상", null, null, new PerformanceEvaluation(null, List.of(), List.of(pdfOnly)), List.of()));
        var r = ReviewEvidenceScope.resolve(run, 0, "performanceEvaluation.items[0].weightPercent");
        assertThat(r.status()).isEqualTo(Status.NO_EVIDENCE_IN_SCOPE);
        assertThat(r.contains(P01)).isFalse();
        assertThat(ReviewEvidenceScope.resolve(run, 0, "writtenEvaluation.weightPercent").status()).isEqualTo(Status.FIELD_UNKNOWN);
    }
}
