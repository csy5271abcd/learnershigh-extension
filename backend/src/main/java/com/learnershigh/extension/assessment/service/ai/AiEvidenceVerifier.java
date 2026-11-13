package com.learnershigh.extension.assessment.service.ai;

import com.learnershigh.extension.assessment.dto.ai.AiAnalysisResponse.EvidenceCheck;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.AiField;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.EvaluationPlanResult;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.ExamQuestion;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.PerformanceArea;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.SubjectPlan;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.UniversityExamResult;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.WrittenExam;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI 결과를 원본 텍스트와 다시 대조한다. AI 출력은 검증되지 않은 외부 데이터다.
 * - 근거 쪽이 문서 범위 밖이면 verified=false.
 * - 근거 문장이 그 쪽 텍스트에 (공백을 무시하고) 없으면 verified=false.
 * - 숫자 값(비율·만점)이 근거 쪽에 숫자로 나오지 않으면 verified=false.
 * - 합계가 맞지 않아도 자동 보정하지 않고 경고만 남긴다.
 */
public final class AiEvidenceVerifier {

    private static final Pattern NUMBER = Pattern.compile("\\d+(?:\\.\\d+)?");

    private final List<String> pages;
    private final List<EvidenceCheck> checks = new ArrayList<>();
    private final List<String> warnings = new ArrayList<>();

    public AiEvidenceVerifier(List<String> pages) {
        this.pages = pages;
    }

    public List<EvidenceCheck> checks() {
        return List.copyOf(checks);
    }

    public List<String> warnings() {
        return List.copyOf(warnings);
    }

    static String compact(String text) {
        return text == null ? "" : text.replaceAll("\\s+", "");
    }

    private boolean pageInRange(int page) {
        return page >= 1 && page <= pages.size();
    }

    /** 한 값 대조. found=false면 대조하지 않는다 (없는 값은 없는 대로 둔다) */
    public void field(String path, AiField field, boolean numeric) {
        if (field == null || !field.found()) return;
        if (!pageInRange(field.pdfPage())) {
            checks.add(new EvidenceCheck(path, field.pdfPage(), false, "근거 쪽이 문서 범위 밖이에요"));
            return;
        }
        String pageText = compact(pages.get(field.pdfPage() - 1));
        String quote = compact(field.evidenceQuote());
        if (quote.length() < 2 || !pageText.contains(quote)) {
            checks.add(new EvidenceCheck(path, field.pdfPage(), false, "근거 문장을 그 쪽에서 찾지 못했어요"));
            return;
        }
        if (numeric) {
            Matcher matcher = NUMBER.matcher(field.value() == null ? "" : field.value());
            if (!matcher.find() || !pageText.contains(matcher.group())) {
                checks.add(new EvidenceCheck(path, field.pdfPage(), false, "숫자 값을 근거 쪽에서 찾지 못했어요"));
                return;
            }
        }
        checks.add(new EvidenceCheck(path, field.pdfPage(), true, null));
    }

    static Double number(AiField field) {
        if (field == null || !field.found()) return null;
        Matcher matcher = NUMBER.matcher(field.value() == null ? "" : field.value());
        return matcher.find() ? Double.valueOf(matcher.group()) : null;
    }

    public void evaluationPlan(EvaluationPlanResult result) {
        field("schoolName", result.schoolName(), false);
        field("academicYear", result.academicYear(), true);
        field("grade", result.grade(), true);
        field("semester", result.semester(), true);
        List<SubjectPlan> subjects = result.subjects() == null ? List.of() : result.subjects();
        for (int s = 0; s < subjects.size(); s++) {
            SubjectPlan subject = subjects.get(s);
            String base = "subjects[" + s + "]";
            String name = subject.subjectName() != null && subject.subjectName().found() ? subject.subjectName().value() : base;
            field(base + ".subjectName", subject.subjectName(), false);
            field(base + ".writtenExamTotalRatio", subject.writtenExamTotalRatio(), true);
            field(base + ".performanceTotalRatio", subject.performanceTotalRatio(), true);
            List<WrittenExam> exams = subject.writtenExams() == null ? List.of() : subject.writtenExams();
            for (int e = 0; e < exams.size(); e++) {
                field(base + ".writtenExams[" + e + "].ratio", exams.get(e).ratio(), true);
                field(base + ".writtenExams[" + e + "].maxScore", exams.get(e).maxScore(), true);
            }
            List<PerformanceArea> areas = subject.performanceAreas() == null ? List.of() : subject.performanceAreas();
            for (int a = 0; a < areas.size(); a++) {
                field(base + ".performanceAreas[" + a + "].area", areas.get(a).area(), false);
                field(base + ".performanceAreas[" + a + "].ratio", areas.get(a).ratio(), true);
                field(base + ".performanceAreas[" + a + "].maxScore", areas.get(a).maxScore(), true);
            }
            Double written = number(subject.writtenExamTotalRatio());
            Double performance = number(subject.performanceTotalRatio());
            if (written != null && performance != null && Math.abs(written + performance - 100) > 0.01) {
                warnings.add(name + ": 지필(" + fmt(written) + ") + 수행(" + fmt(performance) + ") 합계가 100이 아니에요. 원본을 확인해 주세요 (자동 보정하지 않음).");
            }
            if (performance != null && !areas.isEmpty() && areas.stream().allMatch(area -> number(area.ratio()) != null)) {
                double sum = areas.stream().mapToDouble(area -> number(area.ratio())).sum();
                if (Math.abs(sum - performance) > 0.01) {
                    warnings.add(name + ": 수행평가 영역 비율 합계(" + fmt(sum) + ")가 수행평가 전체 비율(" + fmt(performance) + ")과 달라요.");
                }
            }
        }
    }

    public void universityExam(UniversityExamResult result) {
        List<ExamQuestion> questions = result.questions() == null ? List.of() : result.questions();
        for (int q = 0; q < questions.size(); q++) {
            ExamQuestion question = questions.get(q);
            String path = "questions[" + q + "]";
            if (!question.boundaryConfident()) warnings.add(label(question) + ": AI가 문항 시작·끝 위치를 확신하지 못했어요. 쪽 범위를 확인해 주세요.");
            boolean range = pageInRange(question.startPage()) && pageInRange(question.endPage()) && question.startPage() <= question.endPage();
            if (!range) {
                checks.add(new EvidenceCheck(path + ".pages", question.startPage(), false, "문항 쪽 범위가 문서와 맞지 않아요"));
            } else {
                String quote = compact(question.evidenceQuote());
                boolean quoted = false;
                for (int page = question.startPage(); page <= question.endPage() && !quoted; page++) {
                    quoted = quote.length() >= 2 && compact(pages.get(page - 1)).contains(quote);
                }
                checks.add(new EvidenceCheck(path + ".pages", question.startPage(), quoted, quoted ? null : "문항 시작 문장을 그 쪽 범위에서 찾지 못했어요"));
            }
            for (Integer page : concat(question.intentPages(), question.basisPages())) {
                if (!pageInRange(page)) checks.add(new EvidenceCheck(path + ".intentOrBasisPage", page, false, "출제 의도·근거 쪽이 문서 범위 밖이에요"));
            }
        }
    }

    private static String label(ExamQuestion question) {
        return question.questionNumber() == null || question.questionNumber().isBlank() ? "문항" : "문항 " + question.questionNumber();
    }

    private static List<Integer> concat(List<Integer> a, List<Integer> b) {
        List<Integer> all = new ArrayList<>();
        if (a != null) all.addAll(a);
        if (b != null) all.addAll(b);
        return all;
    }

    private static String fmt(double value) {
        return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(value);
    }
}
