package com.learnershigh.extension.assessment.integration.auth;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;

/**
 * 기존 LearnersHigh 인증 경계 (integration-boundary.md §17~18, API-OD-A01 미결).
 * 실제 Session/Token 방식이 확정되면 구현체만 바꾼다. 인증 실패는 비어 있는 Optional이다(호출부가 401로 바꾼다).
 */
public interface AssessmentActorProvider {

    Optional<StudentActor> currentStudent(HttpServletRequest request);

    Optional<AdminActor> currentAdmin(HttpServletRequest request);
}
