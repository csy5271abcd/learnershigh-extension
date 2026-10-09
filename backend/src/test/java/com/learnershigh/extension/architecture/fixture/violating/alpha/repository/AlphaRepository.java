package com.learnershigh.extension.architecture.fixture.violating.alpha.repository;

import com.learnershigh.extension.architecture.fixture.violating.alpha.dto.AlphaResponse;
import com.learnershigh.extension.architecture.fixture.violating.alpha.entity.AlphaRecord;

// 위반: Repository가 DTO에 의존한다.
public interface AlphaRepository {

    AlphaRecord findById(String id);

    AlphaResponse findResponseById(String id);
}
