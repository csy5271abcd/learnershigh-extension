package com.learnershigh.extension.architecture.fixture.compliant.alpha.service;

import com.learnershigh.extension.architecture.fixture.compliant.alpha.dto.AlphaResponse;
import com.learnershigh.extension.architecture.fixture.compliant.alpha.entity.AlphaRecord;
import com.learnershigh.extension.architecture.fixture.compliant.alpha.repository.AlphaRepository;
import com.learnershigh.extension.architecture.fixture.compliant.beta.service.BetaQueryService;
import com.learnershigh.extension.architecture.fixture.compliant.common.integration.learnershigh.ExistingDeltaClient;

public class AlphaService {

    private final AlphaRepository alphaRepository;
    private final BetaQueryService betaQueryService;
    private final ExistingDeltaClient existingDeltaClient;

    public AlphaService(
            AlphaRepository alphaRepository,
            BetaQueryService betaQueryService,
            ExistingDeltaClient existingDeltaClient) {
        this.alphaRepository = alphaRepository;
        this.betaQueryService = betaQueryService;
        this.existingDeltaClient = existingDeltaClient;
    }

    public AlphaResponse get(String id) {
        AlphaRecord record = alphaRepository.findById(id);
        betaQueryService.count();
        existingDeltaClient.fetch(id);
        return AlphaResponse.from(record);
    }
}
