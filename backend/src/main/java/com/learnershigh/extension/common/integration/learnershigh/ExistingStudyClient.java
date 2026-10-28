package com.learnershigh.extension.common.integration.learnershigh;

import java.time.LocalDate;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Existing LearnersHigh 출결 / 순공 / 학습계획 조회 경계 (ADR-0002, Read only).
 * 기간 안의 모든 날짜를 오름차순으로 돌려준다. 실패는 {@link ExistingIntegrationException}.
 */
public interface ExistingStudyClient {

    List<ExistingDailyStudy> findDailyStudy(String studentId, LocalDate from, LocalDate to);

    /**
     * 여러 학생의 같은 기간을 한 번에 조회한다. 요청한 학생마다 키가 있고 순서는 요청 순서를 따른다.
     * 기본 구현은 학생별 조회를 반복한다. 원본이 지점·기간 일괄 조회를 지원하면 구현체에서 한 번의 호출로 바꾼다.
     */
    default Map<String, List<ExistingDailyStudy>> findDailyStudies(Collection<String> studentIds, LocalDate from,
            LocalDate to) {
        Map<String, List<ExistingDailyStudy>> result = new LinkedHashMap<>();
        for (String studentId : studentIds) {
            result.put(studentId, findDailyStudy(studentId, from, to));
        }
        return result;
    }
}
