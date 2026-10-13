package com.learnershigh.extension.architecture.fixture.compliant.common.integration.learnershigh;

import com.learnershigh.extension.architecture.fixture.compliant.common.integration.learnershigh.phapi.PhapiDeltaMapper;

public class RealExistingDeltaClient implements ExistingDeltaClient {

    @Override
    public String fetch(String id) {
        return PhapiDeltaMapper.map(id);
    }
}
