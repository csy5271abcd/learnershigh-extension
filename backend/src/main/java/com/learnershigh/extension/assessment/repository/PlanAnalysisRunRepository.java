package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlanAnalysisRunRepository extends JpaRepository<PlanAnalysisRun, String> {

    @Query("select a from PlanAnalysisRun a where a.revisionId in :revisionIds order by a.receivedAt asc, a.id asc")
    List<PlanAnalysisRun> findByRevisionIds(@Param("revisionIds") Collection<String> revisionIds);

    @Query("select a from PlanAnalysisRun a where a.revisionId = :revisionId and a.payloadSha256 = :payloadSha256")
    Optional<PlanAnalysisRun> findSamePayload(@Param("revisionId") String revisionId,
            @Param("payloadSha256") String payloadSha256);
}
