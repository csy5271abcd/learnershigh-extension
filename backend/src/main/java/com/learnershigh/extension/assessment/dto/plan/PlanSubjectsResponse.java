package com.learnershigh.extension.assessment.dto.plan;

import java.util.List;

/**
 * §38-4 평가계획서 문서 슬롯의 학업 과목 (A6, 2026-11-15 DRAFT). 검토·확정 때 과목 ID를 직접 입력하지 않고 고르게 한다.
 * 서버 확정 검증(§39·§39-6)과 같은 원천(학업 Context 슬롯)이다. available=false면 그 슬롯의 학업 정보를 찾지 못했다(오류 아님).
 */
public record PlanSubjectsResponse(String planId, String schoolId, int academicYear, int grade, int semester,
        boolean available, String source, List<Item> items) {

    public record Item(String subjectId, String name) {
    }
}
