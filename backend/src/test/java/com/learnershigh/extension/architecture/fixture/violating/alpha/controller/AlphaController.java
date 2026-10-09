package com.learnershigh.extension.architecture.fixture.violating.alpha.controller;

import com.learnershigh.extension.architecture.fixture.violating.alpha.entity.AlphaRecord;
import com.learnershigh.extension.architecture.fixture.violating.alpha.repository.AlphaRepository;

// 위반: Controller가 Repository / Entity를 직접 사용한다.
public class AlphaController {

    private final AlphaRepository alphaRepository;

    public AlphaController(AlphaRepository alphaRepository) {
        this.alphaRepository = alphaRepository;
    }

    public AlphaRecord get(String id) {
        return alphaRepository.findById(id);
    }
}
