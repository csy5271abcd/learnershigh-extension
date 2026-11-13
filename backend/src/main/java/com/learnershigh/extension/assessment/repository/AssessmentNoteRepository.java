package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.AssessmentNote;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentNoteRepository extends JpaRepository<AssessmentNote, String> {

    List<AssessmentNote> findByStudentIdAndSourceTypeAndSourceId(String studentId, String sourceType, String sourceId);

    Optional<AssessmentNote> findByIdAndStudentId(String id, String studentId);
}
