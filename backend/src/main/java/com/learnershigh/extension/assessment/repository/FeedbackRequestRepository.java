package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.FeedbackRequest;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackRequestRepository extends JpaRepository<FeedbackRequest, String> {

    List<FeedbackRequest> findByStudentIdOrderByRequestedAtDesc(String studentId);

    Optional<FeedbackRequest> findByIdAndStudentId(String id, String studentId);

    Optional<FeedbackRequest> findByStudentIdAndSnapshotKey(String studentId, String snapshotKey);

    List<FeedbackRequest> findByStudentIdInOrderByRequestedAtDesc(Collection<String> studentIds);

    boolean existsByStudentIdAndSourceTypeAndSourceId(String studentId, String sourceType, String sourceId);
}
