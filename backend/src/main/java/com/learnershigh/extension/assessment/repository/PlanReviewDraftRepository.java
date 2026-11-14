package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.PlanReviewDraft;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlanReviewDraftRepository extends JpaRepository<PlanReviewDraft, String> {

    @Query("select d from PlanReviewDraft d where d.analysisId = :analysisId and d.scope = :scope")
    Optional<PlanReviewDraft> findByAnalysisId(@Param("analysisId") String analysisId, @Param("scope") String scope);

    @Query("select d from PlanReviewDraft d where d.revisionId = :revisionId and d.scope = :scope order by d.updatedAt desc, d.id asc")
    List<PlanReviewDraft> findByRevisionId(@Param("revisionId") String revisionId, @Param("scope") String scope);
}
