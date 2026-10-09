package com.learnershigh.extension.architecture.fixture.compliant.alpha.dto;

import com.learnershigh.extension.architecture.fixture.compliant.alpha.entity.AlphaRecord;

public record AlphaResponse(String id) {

    public static AlphaResponse from(AlphaRecord record) {
        return new AlphaResponse(record.id());
    }
}
