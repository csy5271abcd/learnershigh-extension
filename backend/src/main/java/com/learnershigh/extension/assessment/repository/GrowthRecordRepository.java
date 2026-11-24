package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.GrowthRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GrowthRecordRepository extends JpaRepository<GrowthRecord, String> {

    List<GrowthRecord> findByStudentIdAndDeletedAtIsNullOrderByUpdatedAtDesc(String studentId);

    List<GrowthRecord> findByStudentIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(String studentId);

    Optional<GrowthRecord> findByIdAndStudentIdAndDeletedAtIsNotNull(String id, String studentId);

    Optional<GrowthRecord> findByIdAndStudentIdAndDeletedAtIsNull(String id, String studentId);

    boolean existsByStudentIdAndRelatedSourceTypeAndRelatedSourceId(String studentId, String relatedSourceType, String relatedSourceId);
}
