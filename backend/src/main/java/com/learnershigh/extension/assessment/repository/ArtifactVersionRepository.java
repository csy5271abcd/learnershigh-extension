package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.ArtifactVersion;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArtifactVersionRepository extends JpaRepository<ArtifactVersion, String> {

    List<ArtifactVersion> findByArtifactIdOrderByVersionNumberAsc(String artifactId);

    Optional<ArtifactVersion> findByIdAndArtifactId(String id, String artifactId);

    List<ArtifactVersion> findByIdIn(Collection<String> ids);
}
