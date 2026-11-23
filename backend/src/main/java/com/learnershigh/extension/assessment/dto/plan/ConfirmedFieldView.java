package com.learnershigh.extension.assessment.dto.plan;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * §39 관리자가 확인한 값. value는 저장한 JSON 값 그대로 (null = 원문에 없음으로 확인).
 * documentLocator·absence는 HWP·HWPX만 붙는다. analysisSubjectIndex는 HWP·HWPX, 그리고 A10 이후 과목 번호와 함께 확정한 PDF에
 * 붙는다(NON_NULL — 이전 PDF 확정값 응답 JSON은 그대로).
 * 학생 응답에는 쓰지 않는다(M-5).
 */
public record ConfirmedFieldView(String subjectId, String fieldPath, Object value, Integer pdfPageNumber,
        @JsonInclude(JsonInclude.Include.NON_NULL) Integer analysisSubjectIndex,
        @JsonInclude(JsonInclude.Include.NON_NULL) Object documentLocator,
        @JsonInclude(JsonInclude.Include.NON_NULL) String absence) {

    public ConfirmedFieldView(String subjectId, String fieldPath, Object value, Integer pdfPageNumber) {
        this(subjectId, fieldPath, value, pdfPageNumber, null, null, null);
    }
}
