package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.integration.vision.VisionEvidenceStore;
import com.learnershigh.extension.studentcare.dto.VisionEvidenceListResponse;
import com.learnershigh.extension.studentcare.exception.StudentCareErrorCode;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사진 관찰 근거 사진 조회 (api-contract.md §65-11). 사진 저장·보관은 사진 관찰 서비스가 맡고, 학생 케어는 그 저장소를 읽어 관리자에게 보여준다.
 * 지점·학생 범위는 기존 학생 케어 조회와 같은 확인을 거친다. 학습관 ID와 학생 ID는 두 서비스가 같은 값을 쓴다.
 */
@Service
@Transactional(readOnly = true)
public class CareVisionEvidenceQueryService {

    /** 한 번에 볼 수 있는 기간(학생 케어 화면은 최근 7일만 쓴다) */
    private static final int MAX_DAYS = 35;
    /** 사진 관찰 서비스의 운영일 시간대(StudyPeriod.timezone) */
    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private final StudentCareReader reader;
    private final VisionEvidenceStore store;

    public CareVisionEvidenceQueryService(StudentCareReader reader, VisionEvidenceStore store) {
        this.reader = reader;
        this.store = store;
    }

    public VisionEvidenceListResponse list(String branchId, String studentId, LocalDate from, LocalDate to) {
        reader.student(branchId, studentId);
        if (from.isAfter(to) || from.plusDays(MAX_DAYS).isBefore(to)) {
            throw new BusinessException(StudentCareErrorCode.INVALID_VISION_EVIDENCE_PERIOD);
        }
        try {
            var items = store.list(branchId, studentId, from.atStartOfDay(SERVICE_ZONE).toInstant(),
                            to.plusDays(1).atStartOfDay(SERVICE_ZONE).toInstant()).stream()
                    .map(a -> new VisionEvidenceListResponse.Item(a.assetId(), a.capturedAt().atZone(SERVICE_ZONE).toLocalDate().toString(),
                            a.captureId(), a.capturedAt().toString()))
                    .toList();
            return new VisionEvidenceListResponse(items);
        } catch (VisionEvidenceStore.VisionEvidenceUnavailable unavailable) {
            throw new BusinessException(StudentCareErrorCode.VISION_EVIDENCE_UNAVAILABLE);
        }
    }

    /** 사진 원본. 다른 지점·학생의 사진, 만료된 사진은 없는 것과 같게 404 */
    public Content content(String branchId, String studentId, String evidenceId) {
        reader.student(branchId, studentId);
        try {
            var content = store.read(branchId, studentId, evidenceId)
                    .orElseThrow(() -> new BusinessException(StudentCareErrorCode.VISION_EVIDENCE_NOT_FOUND));
            return new Content(content.mimeType(), content.bytes());
        } catch (VisionEvidenceStore.VisionEvidenceUnavailable unavailable) {
            throw new BusinessException(StudentCareErrorCode.VISION_EVIDENCE_UNAVAILABLE);
        }
    }

    public record Content(String contentType, byte[] bytes) {
    }
}
