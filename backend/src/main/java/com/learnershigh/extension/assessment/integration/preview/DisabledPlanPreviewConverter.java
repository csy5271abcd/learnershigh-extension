package com.learnershigh.extension.assessment.integration.preview;

/** 변환기 미설정. HWP·HWPX 미리보기는 415 PREVIEW_UNAVAILABLE 그대로(다운로드만). */
public class DisabledPlanPreviewConverter implements PlanPreviewConverter {

    @Override
    public boolean enabled() {
        return false;
    }

    @Override
    public String id() {
        return "none";
    }

    @Override
    public Result convert(byte[] source, String extension) {
        return Result.failure("converter_not_configured");
    }
}
