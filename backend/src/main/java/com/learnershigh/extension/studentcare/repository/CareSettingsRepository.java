package com.learnershigh.extension.studentcare.repository;

import com.learnershigh.extension.studentcare.entity.CareSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareSettingsRepository extends JpaRepository<CareSettings, String> {
}
