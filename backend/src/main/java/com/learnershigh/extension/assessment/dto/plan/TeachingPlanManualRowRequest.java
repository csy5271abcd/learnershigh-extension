package com.learnershigh.extension.assessment.dto.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Schedule;
import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Standard;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * A14 §39-11 운영계획 관리자 직접 추가 행 생성(POST .../teaching-plan-draft/manual-rows)·수정(PUT .../manual-rows/{rowKey}).
 * 분석 결과에 없던 행을 운영계획 초안에 둔다. 행 키(rowKey)는 서버가 발급한다(요청에 없음).
 * baseVersion: 화면이 마지막으로 읽은 운영계획 초안 version(초안이 없으면 null). 다르면 409 — 같은 요청 재시도로 두 번 생기지 않는다.
 * 월·주차는 schedule(§39-3 정밀도 8종)로만 받는다. 원문에 적힌 연도는 이 경로로 넣지 않는다(calendarYear 금지).
 * pdfPageNumber: 관리자가 확인한 원문 쪽(선택, PDF 쪽 수 안). 분석 근거(sources)로 저장하지 않는다.
 */
public record TeachingPlanManualRowRequest(
        @NotBlank @Size(max = 64) String analysisId,
        @Min(0) Long baseVersion,
        @NotNull @Valid Row row) {

    public record Row(
            @NotNull @Min(0) @Max(49) Integer subjectIndex,
            @NotNull @Pattern(regexp = "INCLUDED|EXCLUDED") String status,
            @Size(max = 300) String unit,
            @Size(max = 4000) String content,
            @Size(max = 1000) String note,
            @Size(max = 200) String specialSchedule,
            @Size(max = 30) List<@NotNull @Valid Standard> achievementStandards,
            @Size(max = 20) List<@NotNull @Size(max = 300) String> teachingMethods,
            @Size(max = 20) List<@NotNull @Size(max = 300) String> assessmentMethods,
            @NotNull @Valid Schedule schedule,
            @Min(1) Integer pdfPageNumber) {
    }
}
