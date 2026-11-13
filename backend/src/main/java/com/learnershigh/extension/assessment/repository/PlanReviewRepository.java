package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.PlanReview;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlanReviewRepository extends JpaRepository<PlanReview, String> {

    @Query("select r from PlanReview r where r.revisionId in :revisionIds order by r.reviewedAt asc, r.id asc")
    List<PlanReview> findByRevisionIds(@Param("revisionIds") Collection<String> revisionIds);
}
