package com.learnershigh.extension.architecture.fixture.violating.common.integration.learnershigh;

public class RealExistingDeltaClient implements ExistingDeltaClient {

    @Override
    public String fetch(String id) {
        return id;
    }
}
