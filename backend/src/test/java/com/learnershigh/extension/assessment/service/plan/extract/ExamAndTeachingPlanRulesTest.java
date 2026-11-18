package com.learnershigh.extension.assessment.service.plan.extract;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.service.plan.AnalysisImportParser;
import com.learnershigh.extension.assessment.service.plan.AnalysisImportValidator;
import jakarta.validation.Validation;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** 정기시험 회차·진도표 규칙과, 그 결과가 수신 계약(0.3) 검증을 통과하는지. */
class ExamAndTeachingPlanRulesTest {

    static final List<List<String>> UNIT = List.of(
            List.of("평가 종류", "정기시험", "정기시험", "수행평가", "수행평가"),
            List.of("평가 영역", "중간고사", "기말고사", "발표", "보고서"),
            List.of("반영 비율", "30%", "30%", "20%", "20%"),
            List.of("만점", "100점", "100점", "20점", "20점"),
            List.of("평가 시기", "4월", "7월", "5월", "6월"));

    static final List<List<String>> PLAN = List.of(
            List.of("시기", "시기", "단원명", "교육과정 성취기준", "수업방법"),
            List.of("월", "주", "단원명", "교육과정 성취기준", "수업방법"),
            List.of("3", "1~2", "Ⅰ. 문학", "[10공국1-01] 문학을 읽는다. [10공국1-02] 비평한다.", "토의, 발표"),
            List.of("3", "3", "Ⅰ. 문학", "[10공국1-03] 감상한다.", "강의"),
            List.of("4", "1 (2)", "Ⅱ. 문법", "[10공국2-01] 문법을 탐구한다.", "탐구"));

    @Test
    void 회차_이름_열과_반영비율_줄로_중간_기말을_읽는다() {
        List<ExamRules.Exam> exams = ExamRules.exams(UNIT, 60.0);
        assertThat(exams).extracting(ExamRules.Exam::round, ExamRules.Exam::label, ExamRules.Exam::weightPercent, ExamRules.Exam::maxScore)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(1, "중간고사", 30.0, 100.0),
                        org.assertj.core.groups.Tuple.tuple(2, "기말고사", 30.0, 100.0));
        assertThat(exams.get(0).timing()).isEqualTo("4월");
    }

    @Test
    void 회차_비율_합이_지필_비율과_다르면_내보내지_않는다() {
        assertThat(ExamRules.exams(UNIT, 50.0)).isEmpty();
        assertThat(ExamRules.exams(UNIT, null)).isEmpty();
    }

    @Test
    void 이름_칸에_비율이_적힌_회차() {
        List<List<String>> g = List.of(
                List.of("평가 구분", "정기시험", "정기시험", "수행평가", "합계"),
                List.of("반영 비율", "60%", "60%", "40%", "100%"),
                List.of("평가 영역", "중간고사 (30%, 100점 만점)", "기말고사 (30%, 100점 만점)", "실험", ""));
        assertThat(ExamRules.exams(g, 60.0)).extracting(ExamRules.Exam::label, ExamRules.Exam::weightPercent)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("중간고사", 30.0), org.assertj.core.groups.Tuple.tuple("기말고사", 30.0));
    }

    @Test
    void 두_줄_머리_진도표를_행으로_편다() {
        List<TeachingPlanRules.Row> rows = TeachingPlanRules.rows(PLAN);
        assertThat(rows).hasSize(3);
        TeachingPlanRules.Row first = rows.get(0);
        assertThat(first.month()).isEqualTo(3);
        assertThat(first.weekFrom()).isEqualTo(1);
        assertThat(first.weekTo()).isEqualTo(2);
        assertThat(first.unit()).isEqualTo("Ⅰ. 문학");
        assertThat(first.standards()).extracting(TeachingPlanRules.Standard::code).containsExactly("10공국1-01", "10공국1-02");
        assertThat(first.teachingMethods()).containsExactly("토의", "발표");
        assertThat(rows.get(2).weekFrom()).isEqualTo(1);
    }

    @Test
    void 표시_기호만_있는_칸은_방법으로_넣지_않는다() {
        assertThat(TeachingPlanRules.list("○")).isEmpty();
        assertThat(TeachingPlanRules.list("강의, ○")).containsExactly("강의");
    }

    @Test
    void 월_칸의_주_표기와_월_범위() {
        assertThat(TeachingPlanRules.month("8월 2~3주")).containsExactly(8, 8);
        assertThat(TeachingPlanRules.month("3~4월")).containsExactly(3, 4);
        assertThat(TeachingPlanRules.month("12.14~ 12.18")).containsExactly(12, 12);
        assertThat(TeachingPlanRules.month("")).containsExactly(null, null);
    }

    @Test
    void 월과_단원이_없는_표는_진도표가_아니다() {
        assertThat(TeachingPlanRules.rows(UNIT)).isNull();
    }

    @Test
    void 추출_결과가_수신_계약_0_3_검증을_통과한다() {
        List<SourceTable> tables = List.of(
                new SourceTable(1, null, null, List.of(List.of("과목명", "공통국어1", "학점", "4")), null, ""),
                new SourceTable(1, null, null, PLAN, null, ""),
                new SourceTable(2, null, null, UNIT, null, ""));
        List<PlanExtractor.Subject> subjects = PlanExtractor.extract(tables, "plan.pdf", "");
        assertThat(subjects).hasSize(1);
        String sha = "a".repeat(64);
        Map<String, Object> payload = ImportPayload.build(subjects, PlanDocumentFormat.PDF, sha, 2, true, "test");
        JsonMapper mapper = JsonMapper.builder().build();
        AnalysisImportParser parser = new AnalysisImportParser(mapper, Validation.buildDefaultValidatorFactory().getValidator(), true);
        AnalysisImportRequest request = parser.parse(mapper.writeValueAsString(payload));
        PlanRevision revision = PlanRevision.upload("plan_1", 1, "plan.pdf", "application/pdf", 10, sha, 2, null, null, "adm",
                Instant.parse("2026-11-18T00:00:00Z"));
        assertThat(new AnalysisImportValidator().validate(request, revision).violations()).isEmpty();
        AnalysisImportRequest.Subject s = request.subjects().getFirst();
        assertThat(s.writtenEvaluation().exams()).hasSize(2);
        assertThat(s.teachingPlan()).hasSize(3);
        assertThat(s.teachingPlan().getFirst().schedule().precision()).isEqualTo("WEEK_IN_MONTH");
    }
}
