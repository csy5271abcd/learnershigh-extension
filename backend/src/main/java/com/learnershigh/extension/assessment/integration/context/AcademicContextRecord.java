package com.learnershigh.extension.assessment.integration.context;

import com.learnershigh.extension.assessment.integration.context.SubjectCatalog.CatalogSubject;
import java.util.List;
import java.util.Optional;

/**
 * 학생의 한 학기 학업 Context (api-contract.md §9-1 Shape의 원천 값).
 *
 * @param subjects            학생의 실제 수강 과목. 수행평가 등록 검증은 이 목록만 쓴다.
 * @param catalogSubjects     같은 학년도·학년·학기의 공통 과목 후보 (DRAFT 2026-11-12). 학교별로 나누지 않는다. 등록 가능 여부와 무관하다.
 * @param schoolClassNumber   학교 반 (DRAFT 2026-11-12). 학원 반(ExistingStudent.className)과 다르다. 모르면 null.
 * @param schoolStudentNumber 학교 번호 (DRAFT 2026-11-12). 모르면 null.
 */
public record AcademicContextRecord(String schoolId, String schoolName, int academicYear, int grade, int semester,
        List<Subject> subjects, String source, List<CatalogSubject> catalogSubjects, Integer schoolClassNumber,
        Integer schoolStudentNumber) {

    public AcademicContextRecord {
        subjects = List.copyOf(subjects);
        catalogSubjects = List.copyOf(catalogSubjects);
    }

    public AcademicContextRecord(String schoolId, String schoolName, int academicYear, int grade, int semester,
            List<Subject> subjects, String source) {
        this(schoolId, schoolName, academicYear, grade, semester, subjects, source, List.of(), null, null);
    }

    public record Subject(String subjectId, String name) {
    }

    public boolean hasSubject(String subjectId) {
        return subjects.stream().anyMatch(subject -> subject.subjectId().equals(subjectId));
    }

    public Optional<String> subjectName(String subjectId) {
        return subjects.stream().filter(subject -> subject.subjectId().equals(subjectId)).map(Subject::name).findFirst();
    }

    /** 공통 후보와 학교 반·번호를 붙인 사본 */
    public AcademicContextRecord withCatalog(List<CatalogSubject> catalog) {
        return new AcademicContextRecord(schoolId, schoolName, academicYear, grade, semester, subjects, source, catalog,
                schoolClassNumber, schoolStudentNumber);
    }
}
