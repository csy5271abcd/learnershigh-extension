package com.learnershigh.extension.assessment.service.school;

import com.learnershigh.extension.assessment.dto.context.AcademicContextResponse;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import org.springframework.stereotype.Service;

/** §9-1 학업 Context 조회. 원천은 AcademicContextProvider (OD-A04 미결, 현재 Mock). §9-2 변경은 Write Owner 미확정이라 구현하지 않는다. */
@Service
public class AcademicContextQueryService {

    private final AcademicContextProvider contexts;

    public AcademicContextQueryService(AcademicContextProvider contexts) {
        this.contexts = contexts;
    }

    public AcademicContextResponse get(StudentActor student, int academicYear, int semester) {
        AcademicContextRecord context = contexts.find(student.studentId(), academicYear, semester)
                .orElseThrow(() -> BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR,
                        new FieldViolation("semester", "unknown")));
        return toResponse(context);
    }

    /** §9-1 Shape. catalogSubjects의 enrolled는 학생 수강 과목(subjects) 포함 여부다. Admin 읽기 화면도 같은 변환을 쓴다. */
    public static AcademicContextResponse toResponse(AcademicContextRecord context) {
        return new AcademicContextResponse(
                new AcademicContextResponse.School(context.schoolId(), context.schoolName()),
                context.academicYear(), context.grade(), context.semester(),
                context.subjects().stream()
                        .map(subject -> new AcademicContextResponse.Subject(subject.subjectId(), subject.name()))
                        .toList(),
                context.source(), context.schoolClassNumber(), context.schoolStudentNumber(),
                context.catalogSubjects().stream()
                        .map(c -> new AcademicContextResponse.CatalogSubject(c.subjectId(), c.name(), c.subjectGroup(),
                                c.curriculumVersion(), context.hasSubject(c.subjectId())))
                        .toList());
    }
}
