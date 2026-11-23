package com.learnershigh.extension.assessment.dto.context;

import java.util.List;

/** api-contract §9-1-c (A28-29 DRAFT): 학적이 있는 학기 목록(현재 학년도와 앞 두 학년도, 최신 먼저). */
public record AcademicTermsResponse(Term currentTerm, List<Term> terms) {

    public record Term(int academicYear, int semester) {
    }
}
