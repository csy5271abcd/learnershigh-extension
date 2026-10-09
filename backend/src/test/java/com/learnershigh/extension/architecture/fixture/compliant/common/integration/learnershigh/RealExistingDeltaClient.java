package com.learnershigh.extension.architecture.fixture.compliant.common.integration.learnershigh;

public class RealExistingDeltaClient implements ExistingDeltaClient {

    @Override
    public String fetch(String id) {
        return id;
    }
}
