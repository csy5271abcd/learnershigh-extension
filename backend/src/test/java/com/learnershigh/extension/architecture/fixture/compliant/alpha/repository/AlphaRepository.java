package com.learnershigh.extension.architecture.fixture.compliant.alpha.repository;

import com.learnershigh.extension.architecture.fixture.compliant.alpha.entity.AlphaRecord;

public interface AlphaRepository {

    AlphaRecord findById(String id);
}
