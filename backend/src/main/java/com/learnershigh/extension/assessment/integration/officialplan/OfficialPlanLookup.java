package com.learnershigh.extension.assessment.integration.officialplan;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 공식 공개 원본 조회 결과.
 *
 * @param connected 공급자(수집기)가 연결돼 있는지. false면 documents는 항상 비어 있고 '확인되지 않음'으로 보여 준다.
 * @param documents 출처가 검증된 공개 원본만
 */
public record OfficialPlanLookup(boolean connected, List<Document> documents) {

    public OfficialPlanLookup {
        documents = List.copyOf(documents);
    }

    public static OfficialPlanLookup unconnected() {
        return new OfficialPlanLookup(false, List.of());
    }

    /**
     * 향후 수집기 연동에 필요한 최소 메타데이터. 파일 내려받기 경로는 공급자 연결 시 계약으로 정한다(api-contract §10-1-3 DRAFT).
     *
     * @param sourceDocumentId 공급자 안의 원본 식별자
     * @param provider         공급자 이름 (예: 학교알리미)
     * @param sourceUrl        공개 출처 주소
     * @param sha256           원본 파일 해시 (무결성 확인)
     * @param verifiedAt       출처·공개 여부를 검증한 시각
     * @param latest           같은 슬롯의 최신 개정본인지
     * @param sizeBytes        원본 크기 (부록 K)
     * @param disclosureMonth  공시월 4(1학기)·9(2학기), 모르면 null (부록 K)
     */
    public record Document(String sourceDocumentId, String provider, String fileName, String documentFormat,
            String sourceUrl, String sha256, OffsetDateTime publishedAt, OffsetDateTime verifiedAt, boolean latest,
            Long sizeBytes, Integer disclosureMonth) {
    }
}
