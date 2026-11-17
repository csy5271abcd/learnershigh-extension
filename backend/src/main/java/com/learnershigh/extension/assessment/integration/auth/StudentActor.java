package com.learnershigh.extension.assessment.integration.auth;

/** 인증된 학생. studentId는 인증 정보에서만 정해진다 (Request Body / Query의 studentId를 신뢰하지 않는다). */
public record StudentActor(String studentId, String branchId) {
}
