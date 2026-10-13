package com.learnershigh.extension.common.integration.learnershigh;

import java.time.LocalDate;
import java.util.List;

/**
 * Existing LearnersHigh 출결 / 순공 / 학습계획 조회 경계 (ADR-0002, Read only).
 * 기간 안의 모든 날짜를 오름차순으로 돌려준다. 실패는 {@link ExistingIntegrationException}.
 */
public interface ExistingStudyClient {

    List<ExistingDailyStudy> findDailyStudy(String studentId, LocalDate from, LocalDate to);
}
