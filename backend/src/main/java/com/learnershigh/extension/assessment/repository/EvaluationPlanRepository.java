package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EvaluationPlanRepository extends JpaRepository<EvaluationPlan, String> {

    /** academicYear / grade / semester는 null이면 조건에서 뺀다. 학교 조건은 항상 건다. */
    @Query("select p from EvaluationPlan p where p.schoolId = :schoolId"
            + " and (:academicYear is null or p.academicYear = :academicYear)"
            + " and (:grade is null or p.grade = :grade)"
            + " and (:semester is null or p.semester = :semester)"
            + " order by p.academicYear desc, p.semester desc, p.createdAt asc")
    List<EvaluationPlan> search(@Param("schoolId") String schoolId, @Param("academicYear") Integer academicYear,
            @Param("grade") Integer grade, @Param("semester") Integer semester);
}
