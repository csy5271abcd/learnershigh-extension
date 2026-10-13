package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
import com.learnershigh.extension.studentcare.entity.CareCase;
import com.learnershigh.extension.studentcare.entity.CareCaseStatus;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * cooldownDays (domain.md §3): 학생의 <b>가장 최근 종결 건</b> 하나만 본다.
 * 그 건의 종결일이 asOf − cooldownDays 보다 뒤면(종결일 포함 cooldownDays일 동안) 그 건의 기준 신호와 같은 Type을 보드에 올리지 않는다.
 * cooldownDays = 0이면 숨기지 않는다. 순수 계산이다.
 */
final class CareCooldown {

    /** 가장 최근 종결 건: 종결일이 가장 늦은 건, 같으면 나중에 종결된 건, 그래도 같으면 ID 순(결정적). */
    static final Comparator<CareCase> MOST_RECENTLY_CLOSED = Comparator
            .comparing(CareCase::closedOn)
            .thenComparing(CareCase::closedAt, Comparator.nullsFirst(Comparator.<Instant>naturalOrder()))
            .thenComparing(CareCase::id);

    private CareCooldown() {
    }

    /** cooldown이 적용되는 종결일 범위의 시작(포함). 끝은 asOf. */
    static LocalDate windowStart(LocalDate asOf, int cooldownDays) {
        return asOf.minusDays(cooldownDays - 1L);
    }

    /** 학생 ID → 숨길 신호 Type. {@code closedCases}는 같은 지점의 종결 건이다. */
    static Map<String, Set<CareSignalType>> suppressedTypes(Collection<CareCase> closedCases, LocalDate asOf,
            int cooldownDays) {
        Map<String, Set<CareSignalType>> suppressed = new HashMap<>();
        if (cooldownDays <= 0) {
            return suppressed;
        }
        LocalDate from = windowStart(asOf, cooldownDays);
        // 기간 안 종결 건 중 학생별 가장 최근 건. 가장 최근 건은 종결일이 가장 늦으므로, 기간 안에 건이 하나라도 있으면
        // 학생 전체의 가장 최근 종결 건과 같다(asOf 이후 종결 건은 기준일 기준으로 아직 없다).
        Map<String, CareCase> latestByStudent = closedCases.stream()
                .filter(careCase -> careCase.status() == CareCaseStatus.CLOSED && careCase.closedOn() != null)
                .filter(careCase -> !careCase.closedOn().isBefore(from) && !careCase.closedOn().isAfter(asOf))
                .collect(Collectors.toMap(CareCase::studentId, Function.identity(),
                        (a, b) -> MOST_RECENTLY_CLOSED.compare(a, b) >= 0 ? a : b));
        latestByStudent.forEach((studentId, latest) -> suppressed.put(studentId, typesOf(latest.baseline())));
        return suppressed;
    }

    private static Set<CareSignalType> typesOf(List<CareBaselineSignal> baseline) {
        Set<CareSignalType> types = EnumSet.noneOf(CareSignalType.class);
        baseline.forEach(signal -> types.add(signal.type()));
        return types;
    }
}
