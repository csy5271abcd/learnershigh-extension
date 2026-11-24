package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.SchoolInfoSyncYear;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolInfoSyncYearRepository extends JpaRepository<SchoolInfoSyncYear, SchoolInfoSyncYear.Key> {
}
