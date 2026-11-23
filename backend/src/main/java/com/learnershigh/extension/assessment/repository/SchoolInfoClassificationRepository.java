package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.SchoolInfoClassification;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolInfoClassificationRepository extends JpaRepository<SchoolInfoClassification, String> {

    List<SchoolInfoClassification> findBySourceFileIdInOrderByVersionAsc(Collection<String> sourceFileIds);
}
