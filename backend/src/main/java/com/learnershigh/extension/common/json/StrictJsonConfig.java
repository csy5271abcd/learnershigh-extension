package com.learnershigh.extension.common.json;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.type.LogicalType;

/**
 * Request JSON의 타입을 바꿔 넣지 않는다 (api-contract.md §5-1, §65 공통): 형식이 다르면 400 VALIDATION_ERROR(필드 경로).
 * 숫자 / Boolean 자리의 문자열, Enum 자리의 숫자는 application.yml(spring.jackson.*)에서 막고,
 * 문자열 자리의 숫자 / Boolean(예: {@code "memo": 123})은 이 설정으로 막는다.
 */
@Configuration(proxyBeanMethods = false)
public class StrictJsonConfig {

    @Bean
    JsonMapperBuilderCustomizer rejectScalarToTextCoercion() {
        return builder -> builder.withCoercionConfig(LogicalType.Textual, config -> config
                .setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
                .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
                .setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail));
    }
}
