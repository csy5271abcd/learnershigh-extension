package com.learnershigh.extension.common.integration.vision;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * 사진 관찰 서비스(runners_hi_vision_ai)가 보관한 근거 사진을 읽는 외부 경계.
 * 사진 저장·보관 기간·삭제는 사진 관찰 서비스 책임이다. 학생 케어는 그 저장소(rhv_evidence_asset와 비공개 파일 저장소)를
 * 읽기만 하고 따로 저장하지 않는다. 보관 기한이 지났거나 사용할 수 없는 사진은 없는 것으로 본다.
 */
public interface VisionEvidenceStore {

    /** 학습관·학생의 사용 가능한 근거 사진, 촬영 시각 [from, to) */
    List<Asset> list(String facilityId, String studentId, Instant from, Instant to);

    /** 사진 원본. 없거나 만료됐거나 내용 해시가 맞지 않으면 empty, 저장소에 닿지 못하면 {@link VisionEvidenceUnavailable} */
    Optional<Content> read(String facilityId, String studentId, String assetId);

    record Asset(String assetId, String captureId, Instant capturedAt) {
    }

    record Content(String mimeType, byte[] bytes) {
    }

    /** 저장소 장애. 빈 결과(사진 없음)와 구분한다 */
    final class VisionEvidenceUnavailable extends RuntimeException {
        public VisionEvidenceUnavailable(Throwable cause) {
            super("vision_evidence_unavailable", cause);
        }
    }
}
