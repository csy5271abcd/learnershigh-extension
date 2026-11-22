package com.learnershigh.extension.assessment.service.school;

import com.learnershigh.extension.assessment.dto.context.StudentMeResponse;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.roster.AssessmentStudentDirectory;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import org.springframework.stereotype.Service;

/**
 * A28-12: 학생 머리글 이름은 인증된 학생 본인의 기존 학생 정보에서만 읽는다(고정값·다른 학생 이름 금지).
 * 찾지 못하면 이름 없음(null) — 화면이 '학생'으로 보인다.
 */
@Service
public class StudentMeQueryService {

    private final AssessmentStudentDirectory students;

    public StudentMeQueryService(AssessmentStudentDirectory students) {
        this.students = students;
    }

    public StudentMeResponse get(StudentActor student) {
        String name = students.findStudent(student.branchId(), student.studentId())
                .filter(s -> student.studentId().equals(s.studentId()))
                .map(ExistingStudent::name)
                .filter(n -> n != null && !n.isBlank())
                .orElse(null);
        return new StudentMeResponse(student.studentId(), name);
    }
}
