package com.learnershigh.extension.architecture.fixture.compliant.common.integration.learnershigh.phapi;

// 준수: 원본 응답 Mapper는 Integration 패키지 안에서만 쓰인다.
public final class PhapiDeltaMapper {

    private PhapiDeltaMapper() {
    }

    public static String map(String raw) {
        return raw.trim();
    }
}
