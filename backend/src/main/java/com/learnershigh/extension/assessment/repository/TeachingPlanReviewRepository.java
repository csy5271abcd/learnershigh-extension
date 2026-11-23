package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.TeachingPlanReview;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeachingPlanReviewRepository extends JpaRepository<TeachingPlanReview, String> {

    /** A13 확정 이력: 최신 버전 → 과거. */
    @Query("select r from TeachingPlanReview r where r.revisionId = :revisionId order by r.versionNo desc")
    List<TeachingPlanReview> findHistory(@Param("revisionId") String revisionId);

    /** 최신 확정 버전(학생 공개·관리자 기본 조회). 확정 전이면 비어 있다. */
    default Optional<TeachingPlanReview> findByRevisionId(String revisionId) {
        return findHistory(revisionId).stream().findFirst();
    }

    @Query("select distinct r.revisionId from TeachingPlanReview r where r.revisionId in :revisionIds")
    List<String> findReviewedRevisionIds(@Param("revisionIds") Collection<String> revisionIds);
}
