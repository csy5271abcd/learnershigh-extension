package com.learnershigh.extension.assessment.dto.plan;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * §39 관리자가 확인한 값. value는 저장한 JSON 값 그대로 (null = 원문에 없음으로 확인).
 * HWP·HWPX일 때만 analysisSubjectIndex·documentLocator·absence가 붙는다(NON_NULL) — PDF 응답 JSON은 이전과 같다.
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
