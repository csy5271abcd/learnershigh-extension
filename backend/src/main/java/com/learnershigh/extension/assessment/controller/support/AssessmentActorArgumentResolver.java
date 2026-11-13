package com.learnershigh.extension.assessment.controller.support;

import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.AssessmentActorProvider;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.common.error.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Controller 인자 {@link StudentActor} / {@link AdminActor}를 인증 경계에서 채운다.
 * 인증되지 않으면 Handler를 실행하지 않고 401 UNAUTHORIZED. Body / Query의 studentId로 Actor를 만들지 않는다.
 */
public class AssessmentActorArgumentResolver implements HandlerMethodArgumentResolver {

    private final ObjectProvider<AssessmentActorProvider> provider;

    public AssessmentActorArgumentResolver(ObjectProvider<AssessmentActorProvider> provider) {
        this.provider = provider;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        Class<?> type = parameter.getParameterType();
        return type == StudentActor.class || type == AdminActor.class;
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        AssessmentActorProvider provider = this.provider.getIfAvailable();
        if (request == null || provider == null) {
            throw new BusinessException(AssessmentErrorCode.UNAUTHORIZED);
        }
        if (parameter.getParameterType() == StudentActor.class) {
            return provider.currentStudent(request)
                    .orElseThrow(() -> new BusinessException(AssessmentErrorCode.UNAUTHORIZED));
        }
        return provider.currentAdmin(request)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.UNAUTHORIZED));
    }
}
