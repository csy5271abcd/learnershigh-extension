package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.DocumentLocator;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Locator;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.PageRange;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.PerformanceEvaluation;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.PerformanceItem;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.RubricCriterion;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Subject;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.WrittenEvaluation;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.WrittenExam;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.common.error.FieldViolation;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * 외부 분석 결과의 업무 검증 (Shape 검증은 Bean Validation이 먼저 한다).
 *
 * <ul>
 *   <li>오류(거절): 다른 문서 결과, 쪽 수 불일치, 범위 밖 원문 쪽, 과목·평가 Key 중복, 근거 없는 점수/비율, 실패 결과의 형식 위반</li>
 *   <li>경고(저장, 값은 그대로): 비율 합계 불일치. 원문 값을 조용히 고치지 않는다 (domain.md §9-1).</li>
 * </ul>
 * 다중 형식(실험): 분석 형식은 등록 Revision 형식과 같아야 한다. PDF는 쪽 근거(pdfPageNumber), HWP·HWPX는 문서 위치(documentLocator)만 쓴다.
 * HWP·HWPX에 쪽 번호를 만들어 넣으면 거절한다. 실험 기능이 꺼져 있으면 새 필드는 기존처럼 unknown_field다.
 */
@Component
public class AnalysisImportValidator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final java.util.regex.Pattern CELL_SEGMENT = java.util.regex.Pattern.compile("r\\d+c\\d+");

    public record Result(List<FieldViolation> violations, List<String> serverWarnings) {

        public boolean valid() {
            return violations.isEmpty();
        }
    }

    /** 기존 PDF 전용 호출(실험 기능 꺼짐과 같다). */
    public Result validate(AnalysisImportRequest request, PlanRevision revision) {
        return validate(request, revision, false);
    }

    public Result validate(AnalysisImportRequest request, PlanRevision revision, boolean multiformat) {
        List<FieldViolation> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        if (!request.source().sha256().equals(revision.sha256())) {
            errors.add(new FieldViolation("source.sha256", "document_mismatch"));
        }
        PlanDocumentFormat format = revision.format();
        String requested = request.source().format();
        if (requested != null && !multiformat) {
            errors.add(new FieldViolation("source.format", "unknown_field"));
        } else if ((requested == null ? PlanDocumentFormat.PDF : PlanDocumentFormat.valueOf(requested)) != format) {
            errors.add(new FieldViolation("source.format", "format_mismatch"));
        }
        Integer pageCount = request.source().pageCount();
        if (format == PlanDocumentFormat.PDF) {
            if (pageCount == null) {
                errors.add(new FieldViolation("source.pageCount", "required"));
            } else if (revision.pageCount() != null && !revision.pageCount().equals(pageCount)) {
                errors.add(new FieldViolation("source.pageCount", "page_count_mismatch"));
            }
        } else if (pageCount != null) {
            errors.add(new FieldViolation("source.pageCount", "not_allowed"));
            pageCount = null;
        }

        if (request.contract03()) {
            Contract03Rules.document(request, errors);
        }
        if ("FAILED".equals(request.status())) {
            if (!request.subjects().isEmpty()) {
                errors.add(new FieldViolation("subjects", "must_be_empty_when_failed"));
            }
            if (request.failureReason() == null || request.failureReason().isBlank()) {
                errors.add(new FieldViolation("failureReason", "required"));
            }
            return new Result(errors, warnings);
        }
        if (request.subjects().isEmpty()) {
            errors.add(new FieldViolation("subjects", "required"));
        }

        java.util.Map<String, List<List<Integer>>> subjectNames = new java.util.HashMap<>();
        for (int i = 0; i < request.subjects().size(); i++) {
            Subject subject = request.subjects().get(i);
            String path = "subjects[" + i + "]";
            if (subject.grades() != null && new HashSet<>(subject.grades()).size() != subject.grades().size()) {
                errors.add(new FieldViolation(path + ".grades", "duplicate"));
            }
            // A15 과목 중복 판정(§39-12): 같은 이름이면 거절. 단 양쪽 모두 원문 근거 학년(grades)이 있고 학년이 겹치지 않으면
            // 다른 학년의 같은 과목으로 따로 받는다. 같은 학년 반복·학년 근거 없음은 지금처럼 거절(합치지 않음)
            List<List<Integer>> sameName = subjectNames.computeIfAbsent(subject.subjectName().strip(), k -> new ArrayList<>());
            boolean distinctGrade = subject.grades() != null && sameName.stream()
                    .allMatch(other -> other != null && java.util.Collections.disjoint(other, subject.grades()));
            if (!sameName.isEmpty() && !distinctGrade) {
                errors.add(new FieldViolation(path + ".subjectName", "duplicate"));
            }
            sameName.add(subject.grades());
            new SubjectCheck(path, subject, format, pageCount, multiformat, request.contract03(), errors, warnings).run();
        }
        return new Result(errors, warnings);
    }

    /** 과목 하나의 검사. */
    private static final class SubjectCheck {

        private final String path;
        private final Subject subject;
        private final PlanDocumentFormat format;
        private final Integer pageCount;
        private final boolean multiformat;
        private final boolean contract03;
        private final List<FieldViolation> errors;
        private final List<String> warnings;
        private final Set<String> itemKeys = new HashSet<>();

        SubjectCheck(String path, Subject subject, PlanDocumentFormat format, Integer pageCount, boolean multiformat,
                boolean contract03, List<FieldViolation> errors, List<String> warnings) {
            this.path = path;
            this.subject = subject;
            this.format = format;
            this.pageCount = pageCount;
            this.multiformat = multiformat;
            this.contract03 = contract03;
            this.errors = errors;
            this.warnings = warnings;
        }

        void run() {
            PageRange range = subject.pageRange();
            if (range != null && format != PlanDocumentFormat.PDF) {
                errors.add(new FieldViolation(path + ".pageRange", "not_allowed"));
                range = null;
            } else if (range != null && (range.from() > range.to() || (pageCount != null && range.to() > pageCount))) {
                errors.add(new FieldViolation(path + ".pageRange", "out_of_range"));
                range = null;
            }
            locators(path + ".sources", subject.sources(), range);
            WrittenEvaluation written = subject.writtenEvaluation();
            PerformanceEvaluation performance = subject.performanceEvaluation();
            if (written != null) {
                written(written, range);
            }
            if (performance != null) {
                performance(performance, range);
            }
            if (written != null && performance != null && written.weightPercent() != null
                    && performance.weightPercent() != null
                    && written.weightPercent().add(performance.weightPercent()).compareTo(HUNDRED) != 0) {
                warnings.add(subject.subjectName() + ": 지필(" + written.weightPercent().toPlainString() + ") + 수행("
                        + performance.weightPercent().toPlainString() + ") 반영비율 합계가 100이 아닙니다. 원문 값을 그대로 두었습니다.");
            }
            if (contract03) {
                // 0.3: 과목 추출 상태·issue·운영계획 행 (운영계획 근거 쪽은 과목 쪽 범위 밖일 수 있어 범위를 적용하지 않는다)
                Contract03Rules.subject(path, subject, errors, (at, list) -> locators(at, list, null));
            }
        }

        private void written(WrittenEvaluation written, PageRange range) {
            String base = path + ".writtenEvaluation";
            evidence(base, written.weightPercent(), null, written.sources());
            locators(base + ".sources", written.sources(), range);
            List<WrittenExam> exams = nullSafe(written.exams());
            Set<Integer> rounds = new HashSet<>();
            BigDecimal sum = BigDecimal.ZERO;
            boolean allWeighted = !exams.isEmpty();
            for (int i = 0; i < exams.size(); i++) {
                WrittenExam exam = exams.get(i);
                String examPath = base + ".exams[" + i + "]";
                key(examPath, exam.itemKey());
                if (!rounds.add(exam.round())) {
                    errors.add(new FieldViolation(examPath + ".round", "duplicate"));
                }
                evidence(examPath, exam.weightPercent(), exam.maxScore(), exam.sources());
                locators(examPath + ".sources", exam.sources(), range);
                if (exam.weightPercent() == null) {
                    allWeighted = false;
                } else {
                    sum = sum.add(exam.weightPercent());
                }
            }
            if (allWeighted && written.weightPercent() != null && sum.compareTo(written.weightPercent()) != 0) {
                warnings.add(subject.subjectName() + ": 지필 차수 비율 합계(" + sum.toPlainString() + ")가 지필 반영비율("
                        + written.weightPercent().toPlainString() + ")과 다릅니다. 원문 값을 그대로 두었습니다.");
            }
        }

        private void performance(PerformanceEvaluation performance, PageRange range) {
            String base = path + ".performanceEvaluation";
            evidence(base, performance.weightPercent(), null, performance.sources());
            locators(base + ".sources", performance.sources(), range);
            List<PerformanceItem> items = nullSafe(performance.items());
            BigDecimal sum = BigDecimal.ZERO;
            boolean allWeighted = !items.isEmpty();
            for (int i = 0; i < items.size(); i++) {
                PerformanceItem item = items.get(i);
                String itemPath = base + ".items[" + i + "]";
                key(itemPath, item.itemKey());
                evidence(itemPath, item.weightPercent(), item.maxScore(), item.sources());
                locators(itemPath + ".sources", item.sources(), range);
                List<RubricCriterion> rubric = nullSafe(item.rubric());
                for (int r = 0; r < rubric.size(); r++) {
                    RubricCriterion criterion = rubric.get(r);
                    String rubricPath = itemPath + ".rubric[" + r + "]";
                    boolean scored = nullSafe(criterion.levels()).stream().anyMatch(level -> level.score() != null);
                    if (scored && nullSafe(criterion.sources()).isEmpty() && nullSafe(item.sources()).isEmpty()) {
                        errors.add(new FieldViolation(rubricPath + ".sources", "evidence_required"));
                    }
                    locators(rubricPath + ".sources", criterion.sources(), range);
                }
                if (item.weightPercent() == null) {
                    allWeighted = false;
                } else {
                    sum = sum.add(item.weightPercent());
                }
            }
            if (allWeighted && performance.weightPercent() != null && sum.compareTo(performance.weightPercent()) != 0) {
                warnings.add(subject.subjectName() + ": 수행 항목 비율 합계(" + sum.toPlainString() + ")가 수행 반영비율("
                        + performance.weightPercent().toPlainString() + ")과 다릅니다. 원문 값을 그대로 두었습니다.");
            }
        }

        /** 평가 Key는 과목 안에서 지필·수행을 통틀어 하나뿐이어야 한다 (evaluationItemRef가 가리키는 대상). */
        private void key(String itemPath, String itemKey) {
            if (!itemKeys.add(itemKey.strip())) {
                errors.add(new FieldViolation(itemPath + ".itemKey", "duplicate"));
            }
        }

        /** 숫자(비율·만점)를 냈으면 원문 근거 쪽이 있어야 한다. 근거 없는 점수는 받지 않는다. */
        private void evidence(String valuePath, BigDecimal weight, BigDecimal maxScore, List<Locator> sources) {
            boolean hasNumber = weight != null || maxScore != null;
            if (hasNumber && nullSafe(sources).isEmpty()) {
                errors.add(new FieldViolation(valuePath + ".sources", "evidence_required"));
            }
        }

        private void locators(String listPath, List<Locator> sources, PageRange range) {
            List<Locator> list = nullSafe(sources);
            for (int i = 0; i < list.size(); i++) {
                Locator locator = list.get(i);
                String at = listPath + "[" + i + "]";
                if (locator.documentLocator() != null && !multiformat) {
                    errors.add(new FieldViolation(at + ".documentLocator", "unknown_field"));
                    continue;
                }
                if (format == PlanDocumentFormat.PDF) {
                    pdfLocator(at, locator, range);
                } else {
                    documentLocator(at, locator);
                }
            }
        }

        private void pdfLocator(String at, Locator locator, PageRange range) {
            if (locator.documentLocator() != null) {
                errors.add(new FieldViolation(at + ".documentLocator", "not_allowed"));
            }
            Integer page = locator.pdfPageNumber();
            if (page == null) {
                errors.add(new FieldViolation(at + ".pdfPageNumber", "required"));
                return;
            }
            boolean outside = (pageCount != null && page > pageCount)
                    || (range != null && (page < range.from() || page > range.to()));
            if (outside) {
                errors.add(new FieldViolation(at + ".pdfPageNumber", "out_of_range"));
            }
        }

        /** HWP·HWPX: 쪽 번호를 받지 않고(만들어 넣지 않게) 문서 구조 위치만 받는다. 위치가 실제로 있는지는 원본 미보관이라 서버가 대조하지 못한다. */
        private void documentLocator(String at, Locator locator) {
            if (locator.pdfPageNumber() != null) {
                errors.add(new FieldViolation(at + ".pdfPageNumber", "not_allowed"));
            }
            if (locator.printedPageLabel() != null) {
                errors.add(new FieldViolation(at + ".printedPageLabel", "not_allowed"));
            }
            DocumentLocator position = locator.documentLocator();
            if (position == null) {
                errors.add(new FieldViolation(at + ".documentLocator", "required"));
                return;
            }
            boolean kindMatches = position.kind().startsWith(format.name() + "_") || "CONTROL_TEXT".equals(position.kind());
            if (!kindMatches) {
                errors.add(new FieldViolation(at + ".documentLocator.kind", "format_mismatch"));
            }
            if (position.kind().endsWith("_TABLE_CELL")) {
                if (position.row() == null || position.col() == null) {
                    errors.add(new FieldViolation(at + ".documentLocator", "cell_position_required"));
                } else if (!lastCellSegmentMatches(position.path(), position.row(), position.col())) {
                    errors.add(new FieldViolation(at + ".documentLocator.path", "path_mismatch"));
                }
            }
        }

        /**
         * 표 칸의 row·col은 path의 마지막 {@code r<row>c<col>} 구간과 같아야 한다(잘못 붙은 좌표를 잡는 구조 검사).
         * 칸 안 문단(…r2c3.p0)과 중첩 표(…r1c1.p0.c0.r0c2 → 안쪽 칸)는 마지막 칸 구간을 기준으로 한다.
         * 원문 위치가 실제로 있는지는 확인하지 못한다(원본 미보관).
         */
        private static boolean lastCellSegmentMatches(String path, int row, int col) {
            String last = null;
            for (String segment : path.split("\\.")) {
                if (CELL_SEGMENT.matcher(segment).matches()) {
                    last = segment;
                }
            }
            return ("r" + row + "c" + col).equals(last);
        }
    }

    private static <T> List<T> nullSafe(List<T> list) {
        return list == null ? List.of() : list.stream().filter(Objects::nonNull).toList();
    }
}
