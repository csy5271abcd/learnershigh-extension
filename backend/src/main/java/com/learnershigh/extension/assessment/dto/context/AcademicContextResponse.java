package com.learnershigh.extension.assessment.dto.context;

import java.util.List;

/**
 * §9-1 GET academic-context 응답.
 *
 * <p>DRAFT 필드 (2026-11-12, api-contract.md §9-1, 팀 승인 대기): {@code schoolClassNumber}·{@code schoolStudentNumber}(학교 반·번호,
 * 모르면 null), {@code catalogSubjects}(학년·학기 공통 과목 후보 + 수강 여부). 학교별 과목 필터가 아니다.
 */
public record AcademicContextResponse(School school, int academicYear, int grade, int semester,
        List<Subject> subjects, String source, Integer schoolClassNumber, Integer schoolStudentNumber,
        List<CatalogSubject> catalogSubjects) {

    public record School(String schoolId, String name) {
    }

    public record Subject(String subjectId, String name) {
    }

    /** enrolled=true인 후보만 수행평가 등록 대상이다(§12 subjectId 검증은 수강 과목 기준 그대로). */
    public record CatalogSubject(String subjectId, String name, String subjectGroup, String curriculumVersion,
            boolean enrolled) {
    }
}
