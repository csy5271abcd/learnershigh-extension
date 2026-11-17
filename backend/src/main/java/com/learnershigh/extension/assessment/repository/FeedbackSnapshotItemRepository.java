package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.FeedbackSnapshotItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedbackSnapshotItemRepository extends JpaRepository<FeedbackSnapshotItem, FeedbackSnapshotItem.Key> {

    @Query("select i from FeedbackSnapshotItem i where i.key.requestId = :requestId order by i.position asc")
    List<FeedbackSnapshotItem> findByRequestId(@Param("requestId") String requestId);
}
