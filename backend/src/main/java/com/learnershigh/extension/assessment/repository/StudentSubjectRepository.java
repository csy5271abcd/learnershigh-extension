package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.StudentSubject;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentSubjectRepository extends JpaRepository<StudentSubject, String> {

    List<StudentSubject> findByStudentIdAndAcademicYearAndSemesterOrderByCreatedAtAsc(String studentId, int academicYear,
            int semester);
}
