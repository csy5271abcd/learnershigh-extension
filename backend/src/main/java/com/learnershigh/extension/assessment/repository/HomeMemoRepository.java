package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.HomeMemo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HomeMemoRepository extends JpaRepository<HomeMemo, String> {
}
