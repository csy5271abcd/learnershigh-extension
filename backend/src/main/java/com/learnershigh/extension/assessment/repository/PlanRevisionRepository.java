package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.PlanRevision;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlanRevisionRepository extends JpaRepository<PlanRevision, String> {

    @Query("select r from PlanRevision r where r.planId in :planIds order by r.planId, r.revisionNumber asc")
    List<PlanRevision> findByPlanIds(@Param("planIds") Collection<String> planIds);

    /** 같은 문서(Plan)에 같은 원문(SHA-256)이 이미 개정본으로 있는가. */
    boolean existsByPlanIdAndSha256(String planId, String sha256);

    /** 부록 E: 학교알리미 원본이 이미 그 문서의 개정본이면 그 Revision 에 연결만 한다. */
    Optional<PlanRevision> findFirstByPlanIdAndSha256(String planId, String sha256);
}
