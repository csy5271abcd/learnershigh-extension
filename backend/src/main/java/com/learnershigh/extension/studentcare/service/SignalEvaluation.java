package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.util.List;
import java.util.Set;

/**
 * 한 학생의 기준일 신호 계산 결과.
 *
 * @param signals        우선순위 순 신호
 * @param volumeSkipped  기록이 적어(유효 학습일 &lt; minValidDays, 연속 미입실 없음) 학습량 계열을 계산하지 않았는지
 * @param validDays      최근 7일 유효 학습일(30분 이상)
 */
public record SignalEvaluation(List<DetectedSignal> signals, boolean volumeSkipped, int validDays) {

    public SignalEvaluation {
        signals = List.copyOf(signals);
    }

    /**
     * 판단 보류: 학습량 계열을 계산하지 않았고 남은 신호가 없다 (domain.md §3).
     * cooldown으로 신호를 뺀 뒤({@link #without}) 다시 판단하므로 보드 / 상세 / 요약이 같은 값을 본다.
     */
    public boolean deferred() {
        return volumeSkipped && signals.isEmpty();
    }

    /** cooldown 등으로 보드에 올리지 않을 신호를 뺀 결과. */
    public SignalEvaluation without(Set<CareSignalType> suppressed) {
        if (suppressed.isEmpty()) {
            return this;
        }
        return new SignalEvaluation(
                signals.stream().filter(signal -> !suppressed.contains(signal.type())).toList(),
                volumeSkipped,
                validDays);
    }
}
