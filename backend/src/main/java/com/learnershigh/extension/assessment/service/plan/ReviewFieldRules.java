package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.DocumentLocator;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Subject;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewRequest;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewRequest.ConfirmedField;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewRequest.ReviewedSubject;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.entity.PlanReview;
import com.learnershigh.extension.common.error.FieldViolation;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;
import java.util.regex.Pattern;

/**
 * 검토 요청의 형식별 필드 규칙 (Phase B M-4, 2026-11-11).
 *
 * <p>PDF: 기존 규칙 그대로 + 비정규 색인({@code [01]}) 거절 + 같은 과목 안 fieldPath 중복 거절.
 * HWP·HWPX 전용 필드(sourceCheck·documentLocator·absence)는 PDF에서 not_allowed. PDF analysisSubjectIndex는 A10부터 선택 항목이다
 * (다과목 문서의 분석 과목 ↔ 확정 과목 연결을 확정 시점에 영속화한다, {@link #checkOptionalSubjectIndex}).
 *
 * <p>HWP·HWPX: 원본 SHA 대조 + 명시적 수동 대조 확인 필수, 필드마다 이 Run의 그 과목·근거 노드에 있는 Locator만 허용
 * ({@link ReviewEvidenceScope}). 값 null은 absence=NOT_IN_SOURCE와 확인한 위치가 있어야만 확정한다.
 */
final class ReviewFieldRules {

    /** 색인 정규형: 0 또는 선행 0 없는 수. "[01]"과 "[1]"이 같은 필드로 풀리면 중복 검사를 우회한다. */
    static final Pattern CANONICAL_INDEX = Pattern.compile("\\[(0|[1-9]\\d{0,2})]");
    private static final Pattern ANY_INDEX = Pattern.compile("\\[\\d+]");
    private static final Pattern SHA256 = Pattern.compile("[0-9a-f]{64}");
    static final String ABSENCE_NOT_IN_SOURCE = "NOT_IN_SOURCE";
    /** A12: 수행평가 항목 하나의 채점표 전체(관리자 수동 보완·수정) */
    static final Pattern RUBRIC_PATH = Pattern.compile("performanceEvaluation\\.items\\[(0|[1-9]\\d{0,2})]\\.rubric");
    static final int RUBRIC_MAX_CRITERIA = 30;
    static final int RUBRIC_MAX_LEVELS = 10;

    private ReviewFieldRules() {
    }

    static boolean canonicalIndexes(String fieldPath) {
        var m = ANY_INDEX.matcher(fieldPath);
        while (m.find()) {
            if (!CANONICAL_INDEX.matcher(m.group()).matches()) {
                return false;
            }
        }
        return true;
    }

    /** PDF 요청에 HWP·HWPX 전용 필드(sourceCheck·documentLocator·absence)가 있으면 거절한다. analysisSubjectIndex는 허용(A10). */
    static void rejectStructuredFieldsOnPdf(PlanReviewRequest request, Consumer<FieldViolation> out) {
        if (request.sourceCheck() != null) {
            out.accept(new FieldViolation("sourceCheck", "not_allowed"));
        }
        for (int s = 0; s < request.reviewedSubjects().size(); s++) {
            ReviewedSubject subject = request.reviewedSubjects().get(s);
            for (int f = 0; f < subject.confirmedFields().size(); f++) {
                ConfirmedField field = subject.confirmedFields().get(f);
                String path = "reviewedSubjects[" + s + "].confirmedFields[" + f + "]";
                if (field.documentLocator() != null) {
                    out.accept(new FieldViolation(path + ".documentLocator", "not_allowed"));
                }
                if (field.absence() != null) {
                    out.accept(new FieldViolation(path + ".absence", "not_allowed"));
                }
            }
        }
    }

    /** sourceCheck: 방식·SHA 형식·Revision SHA 일치·명시적 수동 대조 확인. */
    static void checkSource(PlanReviewRequest.SourceCheck check, String revisionSha256, Consumer<FieldViolation> out) {
        if (check == null) {
            out.accept(new FieldViolation("sourceCheck", "required"));
            return;
        }
        if (check.method() == null) {
            out.accept(new FieldViolation("sourceCheck.method", "required"));
        } else if (!PlanReview.SOURCE_CHECK_LOCAL_FILE.equals(check.method())) {
            out.accept(new FieldViolation("sourceCheck.method", "not_allowed"));
        }
        if (check.localFileSha256() == null) {
            out.accept(new FieldViolation("sourceCheck.localFileSha256", "required"));
        } else if (!SHA256.matcher(check.localFileSha256()).matches()) {
            out.accept(new FieldViolation("sourceCheck.localFileSha256", "format"));
        } else if (!check.localFileSha256().equals(revisionSha256)) {
            out.accept(new FieldViolation("sourceCheck.localFileSha256", "document_mismatch"));
        }
        if (!Boolean.TRUE.equals(check.manualComparisonConfirmed())) {
            out.accept(new FieldViolation("sourceCheck.manualComparisonConfirmed", "required"));
        }
    }

    /** 분석 과목 번호: 필수, 범위 안, 두 검토 과목이 같은 번호를 쓰지 않음. */
    static void checkSubjectIndex(List<Subject> analysisSubjects, Integer index, String path, Set<Integer> used,
            Consumer<FieldViolation> out) {
        if (index == null) {
            out.accept(new FieldViolation(path, "required"));
        } else if (index < 0 || index >= analysisSubjects.size()) {
            out.accept(new FieldViolation(path, "unknown"));
        } else if (!used.add(index)) {
            out.accept(new FieldViolation(path, "duplicate"));
        }
    }

    /**
     * PDF 분석 과목 번호(A10, 선택): 없으면 연결하지 않는다(이전 요청 호환). 있으면 이 분석 결과의 과목 범위 안이어야 하고
     * 두 검토 과목이 같은 번호를 쓰지 않는다. 과목명·배열 순서로 추측하지 않고 관리자 화면이 고른 분석 과목 번호만 저장한다.
     */
    static void checkOptionalSubjectIndex(int analysisSubjectCount, Integer index, String path, Set<Integer> used,
            Consumer<FieldViolation> out) {
        if (index == null) {
            return;
        }
        if (index < 0 || index >= analysisSubjectCount) {
            out.accept(new FieldViolation(path, "unknown"));
        } else if (!used.add(index)) {
            out.accept(new FieldViolation(path, "duplicate"));
        }
    }

    /** HWP·HWPX 필드 하나: 근거 범위·Locator·값/absence·PDF 쪽 번호 금지. 통과하면 true. */
    static boolean checkStructuredField(List<Subject> analysisSubjects, Integer subjectIndex, ConfirmedField field,
            String path, PlanDocumentFormat format, Consumer<FieldViolation> out) {
        boolean ok = true;
        if (field.pdfPageNumber() != null) {
            out.accept(new FieldViolation(path + ".pdfPageNumber", "not_allowed"));
            ok = false;
        }
        if (field.value() == null) {
            if (field.absence() == null) {
                out.accept(new FieldViolation(path + ".absence", "required"));
                ok = false;
            } else if (!ABSENCE_NOT_IN_SOURCE.equals(field.absence())) {
                out.accept(new FieldViolation(path + ".absence", "format"));
                ok = false;
            }
        } else if (field.absence() != null) {
            out.accept(new FieldViolation(path + ".absence", "not_allowed"));
            ok = false;
        }
        DocumentLocator locator = field.documentLocator();
        if (locator == null) {
            out.accept(new FieldViolation(path + ".documentLocator", "required"));
            ok = false;
        } else {
            // kind 접두어 = 문서 형식(CONTROL_TEXT는 두 형식 공통), *_TABLE_CELL은 path 끝 r<row>c<col> = row·col (M-3·M-6)
            if (!locator.kind().equals("CONTROL_TEXT") && !locator.kind().startsWith(format.name() + "_")) {
                out.accept(new FieldViolation(path + ".documentLocator.kind", "format_mismatch"));
                ok = false;
            }
            if (locator.kind().endsWith("_TABLE_CELL") && !cellPathMatches(locator)) {
                out.accept(new FieldViolation(path + ".documentLocator.path", "path_mismatch"));
                ok = false;
            }
        }
        if (subjectIndex == null || subjectIndex < 0 || subjectIndex >= analysisSubjects.size()) {
            return false; // 과목 번호 오류는 이미 기록됨. 근거 범위를 판정할 수 없다.
        }
        ReviewEvidenceScope.Result scope = ReviewEvidenceScope.resolve(analysisSubjects, subjectIndex, field.fieldPath());
        switch (scope.status()) {
            case OK -> {
                if (locator != null && !scope.contains(locator)) {
                    out.accept(new FieldViolation(path + ".documentLocator", "evidence_not_in_analysis"));
                    ok = false;
                }
            }
            case FIELD_NOT_IN_ANALYSIS, NO_EVIDENCE_IN_SCOPE -> {
                out.accept(new FieldViolation(path + ".fieldPath", "evidence_scope_unavailable"));
                ok = false;
            }
            default -> {
                out.accept(new FieldViolation(path + ".fieldPath", "unknown"));
                ok = false;
            }
        }
        return ok;
    }

    private static boolean cellPathMatches(DocumentLocator locator) {
        if (locator.row() == null || locator.col() == null) {
            return false;
        }
        String[] parts = locator.path().split("\\.");
        for (int i = parts.length - 1; i >= 0; i--) {
            var m = Pattern.compile("r(\\d+)c(\\d+)").matcher(parts[i]);
            if (m.matches()) {
                return Integer.parseInt(m.group(1)) == locator.row() && Integer.parseInt(m.group(2)) == locator.col();
            }
        }
        return false;
    }

    /**
     * A15 과목 학년 문맥(§39-12): 분석 과목에 원문 근거 학년(grades)이 있는데 문서 학년이 그 안에 없으면 true.
     * 다른 학년의 평가정보·운영계획을 이 문서(학년) 학생에게 공개하지 않게 확정을 막는다. 학년이 없으면 판단하지 않는다(false).
     */
    static boolean gradeConflict(tools.jackson.databind.JsonNode subjects, Integer index, int documentGrade) {
        if (subjects == null || !subjects.isArray() || index == null || index < 0 || index >= subjects.size()) {
            return false;
        }
        tools.jackson.databind.JsonNode grades = subjects.get(index).get("grades");
        if (grades == null || !grades.isArray() || grades.isEmpty()) {
            return false;
        }
        for (tools.jackson.databind.JsonNode grade : grades) {
            if (grade.isInt() && grade.intValue() == documentGrade) {
                return false;
            }
        }
        return true;
    }

    /**
     * A12 채점표 값 모양: [{ element: 글자 1~200, levels: [{ description: 글자 1~500, score: 0~1000 숫자 또는 null }] (0~10개) }] 1~30개.
     * A15: 기준마다 선택 maxScore(요소 배점, 0~1000 또는 null)를 더할 수 있다.
     * 분석 결과 rubric과 같은 모양이다(학생 화면이 같은 방식으로 읽는다). 맞지 않으면 rubric_shape.
     */
    static void checkRubricValue(tools.jackson.databind.JsonNode value, String path, Consumer<FieldViolation> out) {
        boolean ok = value.isArray() && !value.isEmpty() && value.size() <= RUBRIC_MAX_CRITERIA;
        for (int i = 0; ok && i < value.size(); i++) {
            tools.jackson.databind.JsonNode criterion = value.get(i);
            tools.jackson.databind.JsonNode element = criterion.get("element");
            tools.jackson.databind.JsonNode levels = criterion.get("levels");
            // A15: 요소 배점(maxScore, 선택, 0~1000 숫자 또는 null)을 받는다. 그 밖의 키는 받지 않는다
            tools.jackson.databind.JsonNode maxScore = criterion.get("maxScore");
            ok = criterion.isObject() && criterion.size() <= (criterion.has("maxScore") ? 3 : 2) && element != null && element.isTextual()
                    && !element.asText().isBlank() && element.asText().length() <= 200
                    && (maxScore == null || maxScore.isNull() || (maxScore.isNumber() && maxScore.asDouble() >= 0 && maxScore.asDouble() <= 1000))
                    && levels != null && levels.isArray() && levels.size() <= RUBRIC_MAX_LEVELS;
            for (int j = 0; ok && j < levels.size(); j++) {
                tools.jackson.databind.JsonNode level = levels.get(j);
                tools.jackson.databind.JsonNode description = level.get("description");
                tools.jackson.databind.JsonNode score = level.get("score");
                ok = level.isObject() && level.size() <= 2 && description != null && description.isTextual()
                        && !description.asText().isBlank() && description.asText().length() <= 500
                        && (score == null || score.isNull() || (score.isNumber() && score.asDouble() >= 0 && score.asDouble() <= 1000));
            }
        }
        if (!ok) {
            out.accept(new FieldViolation(path, "rubric_shape"));
        }
    }

    /** 같은 과목에서 같은 fieldPath가 두 번 나오면 true(처음 본 것은 false). */
    static boolean duplicate(Set<String> seen, String subjectKey, String fieldPath) {
        return !seen.add(subjectKey + "\u0000" + fieldPath);
    }

    static Set<String> newSeen() {
        return new HashSet<>();
    }
}
