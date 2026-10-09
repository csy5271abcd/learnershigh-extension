package com.learnershigh.extension.architecture.fixture.violating.beta.service;

import com.learnershigh.extension.architecture.fixture.violating.alpha.repository.AlphaRepository;
import com.learnershigh.extension.architecture.fixture.violating.common.integration.learnershigh.RealExistingDeltaClient;

// 위반: 다른 Domain Repository 직접 사용, Existing Client 구현체 직접 사용.
public class BetaService {

    private final AlphaRepository alphaRepository;
    private final RealExistingDeltaClient realExistingDeltaClient;

    public BetaService(AlphaRepository alphaRepository, RealExistingDeltaClient realExistingDeltaClient) {
        this.alphaRepository = alphaRepository;
        this.realExistingDeltaClient = realExistingDeltaClient;
    }

    public String get(String id) {
        alphaRepository.findById(id);
        return realExistingDeltaClient.fetch(id);
    }
}
