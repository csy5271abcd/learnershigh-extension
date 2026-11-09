package com.learnershigh.extension.studentcare.dto;

import java.util.List;

/**
 * api-contract.md §65-11 사진 관찰 근거 사진 목록. evidenceId는 사진 관찰 서비스의 자산 ID, 시각은 ISO-8601 UTC, 날짜는 운영일(Asia/Seoul).
 * 관리 사유는 같은 captureId의 사진 관찰 보고 장면에서 읽는다(이 응답에 두지 않음).
 */
public record VisionEvidenceListResponse(List<Item> items) {
    public record Item(String evidenceId, String serviceDate, String captureId, String capturedAt) {
    }
}
