package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.SchoolAssessmentStatusEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SchoolAssessmentStatusEventRepository extends JpaRepository<SchoolAssessmentStatusEvent, String> {

    @Query("select e from SchoolAssessmentStatusEvent e where e.assessmentId = :assessmentId order by e.changedAt desc")
    List<SchoolAssessmentStatusEvent> findHistory(@Param("assessmentId") String assessmentId);
}
