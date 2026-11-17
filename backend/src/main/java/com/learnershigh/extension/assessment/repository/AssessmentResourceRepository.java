package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.AssessmentResource;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentResourceRepository extends JpaRepository<AssessmentResource, String> {

    List<AssessmentResource> findByOwnerTypeAndOwnerIdAndDeletedAtIsNullOrderByUpdatedAtDesc(String ownerType, String ownerId);

    List<AssessmentResource> findByOwnerTypeAndOwnerIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(String ownerType, String ownerId);

    Optional<AssessmentResource> findByIdAndOwnerTypeAndOwnerIdAndDeletedAtIsNotNull(String id, String ownerType, String ownerId);

    Optional<AssessmentResource> findByIdAndOwnerTypeAndOwnerIdAndDeletedAtIsNull(String id, String ownerType, String ownerId);

    List<AssessmentResource> findByOwnerTypeAndDeletedAtIsNullOrderByUpdatedAtDesc(String ownerType);

    List<AssessmentResource> findByOwnerTypeAndDeletedAtIsNotNullOrderByDeletedAtDesc(String ownerType);

    List<AssessmentResource> findByOwnerTypeAndVisibilityAndDeletedAtIsNullOrderByPublishedAtDesc(String ownerType, String visibility);
}
