package com.learnershigh.extension.assessment.dto.plan;

import java.time.OffsetDateTime;

/**
 * HWP·HWPX 검토 기록 재조회(관리자 전용). PDF 검토에는 붙지 않는다(기존 응답 불변).
 * reviewerAuth=MOCK_HEADER면 개발용 Mock 관리자 기록이며 운영 검토 실적이 아니다.
 * sourceCheckSha256은 브라우저가 계산해 보낸 값이며, 서버는 Revision SHA와 같은지만 확인했다.
 */
public record SourceReviewView(String reviewId, String analysisId, String reviewedBy, OffsetDateTime reviewedAt,
        String reviewerAuth, String sourceCheckMethod, String sourceCheckSha256, boolean manualComparisonConfirmed,
        int confirmedFieldCount) {
}
