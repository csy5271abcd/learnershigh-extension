package com.learnershigh.extension.assessment.dto.school;

/**
 * §12 GET 목록 조건. sort 허용 값은 Frontend Stage 1과 같은 세 가지다
 * (deadlineDate,asc 기본 / createdAt,desc / title,asc). §12가 허용 Sort를 명시하지 않아 계약 보완 대상이다.
 */
public record SchoolAssessmentListQuery(int academicYear, int semester, String subjectId,
        String status, String query, String sort, int page, int size) {

    public static final String SORT_DEADLINE = "deadlineDate,asc";
    public static final String SORT_CREATED = "createdAt,desc";
    public static final String SORT_TITLE = "title,asc";
}
