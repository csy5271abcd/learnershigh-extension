package com.learnershigh.extension.assessment.dto.record;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** §22 학생 자료함, §43 관리자 참고자료실, 학생 공개 자료(2026-11-11 추가) DTO. */
public final class ResourceDtos {

    private ResourceDtos() {
    }

    /** §22 StudentResource (fileRef는 파일 첨부 미지원이라 항상 null) */
    public record StudentResourceResponse(String resourceId, String type, String title, String sourceName,
            String sourceUrl, String author, LocalDate publishedDate, String memo, List<String> tags,
            List<String> subjectIds, String fileRef, OffsetDateTime createdAt, OffsetDateTime updatedAt,
            ResourceFile file) {
    }

    /** A27-UX §22-1 DRAFT 첨부 파일 메타데이터. previewAvailable = PDF·이미지만(원본 그대로) */
    public record ResourceFile(String fileName, String contentType, long sizeBytes, OffsetDateTime uploadedAt,
            boolean previewAvailable) {
    }

    /** §43 ReferenceScrap + 공개 상태(published·publishedAt). 폐기된 심화 연결 필드는 빈 배열이다. */
    public record ReferenceScrapResponse(String scrapId, String title, String sourceUrl, String sourceName,
            String referenceSourceId, String type, String memo, List<String> tags, List<String> subjectIds,
            String authorOrOrg, LocalDate publishedDate, List<String> relatedCatalogTaskIds,
            List<String> relatedMaterialIds, boolean published, OffsetDateTime publishedAt,
            OffsetDateTime createdAt, OffsetDateTime updatedAt,
            /* A27-UX §43-1 DRAFT: 관리자 업로드 파일(없으면 null). 학생 응답에는 싣지 않는다 */
            ResourceFile file) {
    }

    /** 학생이 보는 관리자 공개 자료 (읽기 전용, 관리자 메모는 공개 설명으로 노출) */
    public record SharedResourceResponse(String resourceId, String type, String title, String sourceName,
            String sourceUrl, String author, LocalDate publishedDate, String description, List<String> tags,
            List<String> subjectIds, OffsetDateTime publishedAt) {
    }

    public record VisibilityRequest(Boolean published) {
    }

    public record FavoriteRequest(String sourceType, String sourceId, Boolean favorite) {
    }

    /** §30 보관함 항목 (학교 수행평가) */
    /** §30 휴지통 복원 요청 (계약 예시 Shape 그대로) */
    public record RestoreRequest(String sourceType, String sourceId) {
    }

    /** 관리자 참고자료 휴지통 항목 */
    public record TrashedScrap(ReferenceScrapResponse scrap, OffsetDateTime deletedAt) {
    }

    public record ArchiveItem(String sourceType, String sourceId, String title, String subjectId, Integer academicYear,
            Integer semester, String status, OffsetDateTime lastActivityAt, Integer noteBlockCount, boolean favorite,
            OffsetDateTime deletedAt,
            /** 휴지통 항목의 원래 소속(예: "수행평가 'X'의 결과물"). 휴지통 밖 항목은 null → 응답에서 빠진다 */
            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
            String origin) {
    }
}
