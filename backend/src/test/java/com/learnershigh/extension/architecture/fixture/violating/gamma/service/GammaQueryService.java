package com.learnershigh.extension.architecture.fixture.violating.gamma.service;

import com.learnershigh.extension.architecture.fixture.violating.common.integration.learnershigh.phapi.PhapiDeltaMapper;

// 위반: Domain이 원본 응답(phapi) Mapper를 직접 사용한다. ExistingXxxClient Interface만 써야 한다.
public class GammaQueryService {

    public String get(String raw) {
        return PhapiDeltaMapper.map(raw);
    }
}
