package com.learnershigh.extension.architecture.fixture.violating.alpha.entity;

import com.learnershigh.extension.architecture.fixture.violating.alpha.dto.AlphaResponse;

// 위반: Entity가 DTO에 의존한다.
public record AlphaRecord(String id) {

    public AlphaResponse toResponse() {
        return new AlphaResponse(id);
    }
}
