package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.PlanRevision;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlanRevisionRepository extends JpaRepository<PlanRevision, String> {

    @Query("select r from PlanRevision r where r.planId in :planIds order by r.planId, r.revisionNumber asc")
    List<PlanRevision> findByPlanIds(@Param("planIds") Collection<String> planIds);
}
