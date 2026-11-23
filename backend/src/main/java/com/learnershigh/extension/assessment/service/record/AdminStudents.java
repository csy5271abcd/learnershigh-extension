package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.School;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.StudentRef;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import com.learnershigh.extension.assessment.integration.roster.AssessmentStudentDirectory;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * 관리자 담당 학생 목록과 표시 정보. 학생 원천은 기존 LearnersHigh 학생 Client(현재 개발용 Mock),
 * 학교·학년은 학업 Context Provider(현재 개발용 Mock, OD-A04)다. 운영 인증·실제 학생 원천이 아니다.
 */
@Component
public class AdminStudents {

    private final AssessmentStudentDirectory students;
    private final AcademicContextProvider contexts;

    public AdminStudents(AssessmentStudentDirectory students, AcademicContextProvider contexts) {
        this.students = students;
        this.contexts = contexts;
    }

    /** 관리자 담당 지점의 학생 (branchIds 순서, 중복 없음) */
    public List<ExistingStudent> inScope(AdminActor admin) {
        Map<String, ExistingStudent> found = new LinkedHashMap<>();
        for (String branchId : admin.branchIds()) {
            for (ExistingStudent student : students.findStudents(branchId)) {
                found.putIfAbsent(student.studentId(), student);
            }
        }
        return new ArrayList<>(found.values());
    }

    public Optional<ExistingStudent> find(AdminActor admin, String studentId) {
        return inScope(admin).stream().filter(s -> s.studentId().equals(studentId)).findFirst();
    }

    public StudentRef ref(String studentId, String displayName, int academicYear, int semester) {
        Optional<AcademicContextRecord> context = contexts.find(studentId, academicYear, semester);
        return new StudentRef(studentId, displayName,
                context.map(c -> new School(c.schoolId(), c.schoolName())).orElse(new School("", "학교 정보 없음")),
                context.map(AcademicContextRecord::grade).orElse(0));
    }

    public Optional<AcademicContextRecord> context(String studentId, int academicYear, int semester) {
        return contexts.find(studentId, academicYear, semester);
    }
}
