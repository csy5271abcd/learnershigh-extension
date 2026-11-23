package com.learnershigh.extension.assessment.dto.plan;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 평가계획서 Revision 원문 파일 정보 (api-contract.md §48 File Contract 모양 + 원문 보관 여부).
 *
 * @param fileRef          불투명 파일 참조 ID ({@code plan_file_<revisionId>}). 저장 키·경로·외부 URL이 아니다. 원문이 없으면 null.
 * @param available        서버가 원문 바이트를 보관하고 있는가. 2026-11-13 이전 등록분은 false(원문 없음 — 다른 파일로 채우지 않는다).
 * @param previewAvailable 서비스 안 미리보기 가능 여부. 현재 PDF 원문만 true. HWP·HWPX는 검증된 변환 엔진이 없어 false다.
 * @param checksum         등록 시 서버가 계산한 원문 SHA-256(hex). 내려받은 파일과 대조한다.
 * @param documentFormat   PDF / HWP / HWPX. pageCount는 PDF만.
 * @param structurePreviewAvailable A10 관리자 응답에만: 원문 구조 미리보기(§38-6 {@code .../structure}) 대상인가 — 원문을 보관한
 *                         HWP·HWPX면 true. 실제 판독 실패(손상·한도 초과)는 그 요청의 422로 알린다. 학생 응답에는 없다(null).
 */
public record PlanFileView(String fileRef, String fileName, String contentType, long sizeBytes, String checksum,
        String documentFormat, Integer pageCount, boolean available, boolean previewAvailable,
        @JsonInclude(JsonInclude.Include.NON_NULL) Boolean structurePreviewAvailable) {

    public PlanFileView(String fileRef, String fileName, String contentType, long sizeBytes, String checksum,
            String documentFormat, Integer pageCount, boolean available, boolean previewAvailable) {
        this(fileRef, fileName, contentType, sizeBytes, checksum, documentFormat, pageCount, available, previewAvailable,
                null);
    }
}
