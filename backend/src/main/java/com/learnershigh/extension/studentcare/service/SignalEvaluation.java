package com.learnershigh.extension.studentcare.service;

import java.util.List;

/**
 * 한 학생의 기준일 신호 계산 결과.
 *
 * @param signals    우선순위 순 신호
 * @param deferred   학습량 계열을 비교하지 않은 판단 보류인지
 * @param validDays  최근 7일 유효 학습일(30분 이상)
 */
public record SignalEvaluation(List<DetectedSignal> signals, boolean deferred, int validDays) {
}
