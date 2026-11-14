package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.TeachingPlanReview;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeachingPlanReviewRepository extends JpaRepository<TeachingPlanReview, String> {

    @Query("select r from TeachingPlanReview r where r.revisionId = :revisionId")
    Optional<TeachingPlanReview> findByRevisionId(@Param("revisionId") String revisionId);
}
