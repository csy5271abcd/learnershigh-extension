package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.StudentOfficialViewEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentOfficialViewEventRepository extends JpaRepository<StudentOfficialViewEvent, String> {

    List<StudentOfficialViewEvent> findByStudentIdOrderByOccurredAtAsc(String studentId);

    java.util.Optional<StudentOfficialViewEvent> findTopByStudentIdOrderByOccurredAtDesc(String studentId);
}
