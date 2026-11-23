package com.learnershigh.extension.assessment.entity;

/**
 * 평가계획서 원본 형식 (다중 형식 실험, 2026-11-10 — 공식 계약·Enum 확정 전).
 * DB에는 별도 Column 없이 기존 `assessment_plan_revision.content_type`(MIME)으로 저장한다. 기존 행은 모두 application/pdf다.
 * 형식은 확장자가 아니라 실제 바이트로 판별한다(DocumentFormatInspector).
 */
public enum PlanDocumentFormat {
    PDF("application/pdf"),
    HWP("application/x-hwp"),
    HWPX("application/hwp+zip");

    private final String contentType;

    PlanDocumentFormat(String contentType) {
        this.contentType = contentType;
    }

    public String contentType() {
        return contentType;
    }

    /** 저장된 MIME → 형식. 알 수 없는 값은 PDF로 취급하지 않고 예외 (데이터 혼합 방지). */
    public static PlanDocumentFormat fromContentType(String contentType) {
        for (PlanDocumentFormat format : values()) {
            if (format.contentType.equals(contentType)) {
                return format;
            }
        }
        throw new IllegalStateException("알 수 없는 평가계획서 content_type: " + contentType);
    }
}
