package com.learnershigh.extension.architecture.fixture.compliant.alpha.controller;

import com.learnershigh.extension.architecture.fixture.compliant.alpha.dto.AlphaResponse;
import com.learnershigh.extension.architecture.fixture.compliant.alpha.service.AlphaService;

public class AlphaController {

    private final AlphaService alphaService;

    public AlphaController(AlphaService alphaService) {
        this.alphaService = alphaService;
    }

    public AlphaResponse get(String id) {
        return alphaService.get(id);
    }
}
