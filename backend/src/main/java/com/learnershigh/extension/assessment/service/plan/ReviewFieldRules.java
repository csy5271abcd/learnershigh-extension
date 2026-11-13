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
 * HWP·HWPX 전용 필드(sourceCheck·analysisSubjectIndex·documentLocator·absence)는 PDF에서 not_allowed.
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

    /** PDF 요청에 HWP·HWPX 전용 필드가 있으면 거절한다(PDF 범위 확장은 별도 결정). */
    static void rejectStructuredFieldsOnPdf(PlanReviewRequest request, Consumer<FieldViolation> out) {
        if (request.sourceCheck() != null) {
            out.accept(new FieldViolation("sourceCheck", "not_allowed"));
        }
        for (int s = 0; s < request.reviewedSubjects().size(); s++) {
            ReviewedSubject subject = request.reviewedSubjects().get(s);
            if (subject.analysisSubjectIndex() != null) {
                out.accept(new FieldViolation("reviewedSubjects[" + s + "].analysisSubjectIndex", "not_allowed"));
            }
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

    /** 같은 과목에서 같은 fieldPath가 두 번 나오면 true(처음 본 것은 false). */
    static boolean duplicate(Set<String> seen, String subjectKey, String fieldPath) {
        return !seen.add(subjectKey + "\u0000" + fieldPath);
    }

    static Set<String> newSeen() {
        return new HashSet<>();
    }
}
