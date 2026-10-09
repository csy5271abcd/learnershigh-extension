package com.learnershigh.extension.architecture.fixture.violating.beta.service;

// 위반: Existing LearnersHigh Client가 common/integration/learnershigh 밖에 있다.
public interface ExistingGammaClient {

    String fetch(String id);
}
