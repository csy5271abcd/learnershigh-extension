package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.Artifact;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArtifactRepository extends JpaRepository<Artifact, String> {

    List<Artifact> findByStudentIdAndSourceTypeAndSourceIdAndDeletedAtIsNullOrderByCreatedAtAsc(String studentId, String sourceType,
            String sourceId);

    Optional<Artifact> findByIdAndStudentIdAndDeletedAtIsNull(String id, String studentId);

    List<Artifact> findByStudentIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(String studentId);

    Optional<Artifact> findByIdAndStudentIdAndDeletedAtIsNotNull(String id, String studentId);

    List<Artifact> findByIdIn(Collection<String> ids);

    /** A28-49 영구 삭제: 휴지통 포함 그 수행평가의 결과물 */
    List<Artifact> findByStudentIdAndSourceTypeAndSourceId(String studentId, String sourceType, String sourceId);
}
