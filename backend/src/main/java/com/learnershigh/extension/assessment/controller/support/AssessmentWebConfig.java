package com.learnershigh.extension.assessment.controller.support;

import com.learnershigh.extension.assessment.integration.auth.AssessmentActorProvider;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Assessment Controller의 인증 Actor 인자 등록. 다른 Domain의 Controller에는 영향이 없다(Actor 타입 인자가 없으면 쓰이지 않음).
 * Provider는 지연 조회한다: Provider Bean이 없는 Context(@WebMvcTest Slice 등)도 시작되고, 그때 Actor 요청은 401로 막힌다.
 */
@Configuration(proxyBeanMethods = false)
public class AssessmentWebConfig implements WebMvcConfigurer {

    private final ObjectProvider<AssessmentActorProvider> provider;

    public AssessmentWebConfig(ObjectProvider<AssessmentActorProvider> provider) {
        this.provider = provider;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new AssessmentActorArgumentResolver(provider));
    }
}
