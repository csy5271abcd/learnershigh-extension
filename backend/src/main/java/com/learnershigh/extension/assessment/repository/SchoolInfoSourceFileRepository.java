package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolInfoSourceFileRepository extends JpaRepository<SchoolInfoSourceFile, String> {

    Optional<SchoolInfoSourceFile> findBySchoolIdAndRequestedYearAndSha256(String schoolId, int requestedYear, String sha256);

    List<SchoolInfoSourceFile> findBySchoolIdAndRequestedYearIn(String schoolId, Collection<Integer> years);
}
