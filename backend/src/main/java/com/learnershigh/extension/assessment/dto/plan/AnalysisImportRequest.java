package com.learnershigh.extension.assessment.dto.plan;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/**
 * 외부 평가계획서 분석기 결과 수신 (PROPOSED — api-contract.md 미반영, 승인 전).
 * Shape은 §11 subjects[].writtenEvaluation / performanceEvaluation / sources를 따르고, §47-A의 쪽 근거를 값마다 붙인다.
 * 알 수 없는 필드는 거절한다: 분석기 내부 신뢰도·채점 모델·검토 상태 같은 값이 공식 데이터로 들어오지 않게 한다.
 * 원문에 없는 값은 null로 보낸다(0으로 바꾸지 않는다). 상세: docs/specs/suyeon/assessment-ai-integration-handoff.md
 */
// analysis-import-0.3 DRAFT (api-contract.md §39-3, 2026-11-15): contractVersion · analyzer.profile · payload PARTIAL ·
// subjects[].extraction · subjects[].teachingPlan. 값이 없으면 직렬화하지 않는다(NON_NULL) → 0.2 결과의 저장 JSON·재전송 해시가 그대로다.
// 0.2 payload에 0.3 필드가 오면 AnalysisImportParser가 unknown_field로 거절하고, 0.3은 설정(contract03-enabled)이 켜졌을 때만 받는다.
public record AnalysisImportRequest(
        @JsonInclude(JsonInclude.Include.NON_NULL) @Pattern(regexp = "0[.]3") String contractVersion,
        @NotNull @Valid Analyzer analyzer,
        @NotNull @Valid SourceDocument source,
        @NotNull @Pattern(regexp = "REVIEW_REQUIRED|PARTIAL|FAILED") String status,
        @Size(max = 500) String failureReason,
        @NotNull @Size(max = 40) List<@NotNull @Valid Subject> subjects,
        @Size(max = 100) List<@NotNull @Size(max = 500) String> warnings) {

    /** 0.2 모양 (contractVersion 없음). */
    public AnalysisImportRequest(Analyzer analyzer, SourceDocument source, String status, String failureReason,
            List<Subject> subjects, List<String> warnings) {
        this(null, analyzer, source, status, failureReason, subjects, warnings);
    }

    public boolean contract03() {
        return "0.3".equals(contractVersion);
    }

    public record Analyzer(@NotBlank @Size(max = 100) String name, @NotBlank @Size(max = 50) String version,
            @JsonInclude(JsonInclude.Include.NON_NULL) @Size(max = 50) String profile) {

        public Analyzer(String name, String version) {
            this(name, version, null);
        }
    }

    /**
     * 분석한 원본. sha256은 등록된 Revision 파일과 같아야 한다 (문서 불일치 방지).
     * format(다중 형식 실험, 선택): 없으면 PDF. PDF는 pageCount 필수, HWP·HWPX는 pageCount를 보내지 않는다(쪽 수 추측 금지).
     * 형식별 필수 조건은 AnalysisImportValidator가 검사한다. 실험 기능이 꺼져 있으면 format을 보내면 unknown_field다.
     */
    public record SourceDocument(@NotBlank @Pattern(regexp = "[0-9a-f]{64}") String sha256,
            @Min(1) Integer pageCount,
            @JsonInclude(JsonInclude.Include.NON_NULL) @Pattern(regexp = "PDF|HWP|HWPX") String format) {

        /** 기존 PDF 입력 호환 (format 없음 = PDF). */
        public SourceDocument(String sha256, Integer pageCount) {
            this(sha256, pageCount, null);
        }
    }

    public record Subject(
            @NotBlank @Size(max = 100) String subjectName,
            @Valid PageRange pageRange,
            @Valid WrittenEvaluation writtenEvaluation,
            @Valid PerformanceEvaluation performanceEvaluation,
            @Size(max = 50) List<@NotNull @Valid Locator> sources,
            @JsonInclude(JsonInclude.Include.NON_NULL) @Valid Extraction extraction,
            @JsonInclude(JsonInclude.Include.NON_NULL) @Size(max = 400) List<@NotNull @Valid TeachingPlanRow> teachingPlan) {

        /** 0.2 모양. */
        public Subject(String subjectName, PageRange pageRange, WrittenEvaluation writtenEvaluation,
                PerformanceEvaluation performanceEvaluation, List<Locator> sources) {
            this(subjectName, pageRange, writtenEvaluation, performanceEvaluation, sources, null, null);
        }
    }

    /** 0.3 과목 추출 상태. issues[].severity가 없으면 REVIEW로 본다(값은 받은 그대로 저장). */
    public record Extraction(
            @NotNull @Pattern(regexp = "COMPLETE|PARTIAL|MISSING_SECTION") String status,
            @Size(max = 200) List<@NotNull @Valid Issue> issues) {
    }

    /** 0.3 issue. code는 형식만 검사한다(계정 B 목록 미합의 — 모르는 코드도 보존). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Issue(
            @NotBlank @Pattern(regexp = "[A-Z][A-Z0-9_]{1,59}") String code,
            @Pattern(regexp = "BLOCKING|REVIEW|INFO") String severity,
            @Size(max = 200) String fieldPath,
            @Size(max = 60) String basis,
            @Size(max = 500) String message,
            @Size(max = 5) List<@NotNull @Valid Locator> sources) {
    }

    /**
     * 0.3 월별 교수·학습 운영계획 행 (계정 B 제안 그대로). 수행평가 항목과 별도 — 이 행으로 수행평가를 만들지 않는다.
     * schedule은 Planner 선택 확장: 원문이 준 만큼의 시간 정밀도(8종)를 줄이지 않고 그대로 저장한다.
     */
    public record TeachingPlanRow(
            @NotBlank @Size(max = 50) String rowKey,
            @Min(1) @Max(12) Integer month,
            @Min(1) @Max(12) Integer monthTo,
            @Size(max = 100) String weekLabel,
            @Min(1) @Max(25) Integer weekFrom,
            @Min(1) @Max(25) Integer weekTo,
            @Size(max = 300) String unit,
            @Size(max = 4000) String content,
            @Size(max = 1000) String note,
            @Size(max = 30) List<@NotNull @Valid Standard> achievementStandards,
            @Size(max = 1000) String inquiryProcess,
            @Size(max = 20) List<@NotNull @Size(max = 300) String> teachingMethods,
            @Size(max = 20) List<@NotNull @Size(max = 300) String> assessmentMethods,
            @Size(max = 2000) String linkageFocus,
            @Size(max = 200) String specialSchedule,
            @Valid Schedule schedule,
            @NotNull @Size(min = 1, max = 20) List<@NotNull @Valid Locator> sources) {
    }

    public record Standard(@Size(max = 50) String code, @Size(max = 1000) String text) {
    }

    public record Schedule(
            @NotNull @Pattern(regexp = "EXACT_DATE|DATE_RANGE|WEEK_IN_MONTH|TERM_WEEK|MONTH|MONTH_RANGE|WEEK_UNRESOLVED|UNKNOWN") String precision,
            @Min(1) @Max(12) Integer monthFrom,
            @Min(1) @Max(12) Integer monthTo,
            @Pattern(regexp = "MONTH|DATE|MONTH_WEEK_LABEL") String monthBasis,
            @Size(max = 100) String weekLabel,
            @Min(1) @Max(25) Integer weekFrom,
            @Min(1) @Max(25) Integer weekTo,
            @Pattern(regexp = "IN_MONTH|TERM_SEQUENCE|UNKNOWN") String weekScope,
            @Pattern(regexp = "LABEL|TABLE_PATTERN") String weekScopeBasis,
            @Valid PartialDate dateFrom,
            @Valid PartialDate dateTo,
            @Size(max = 100) String dateAsWritten,
            @Min(1900) @Max(2100) Integer calendarYear,
            @Pattern(regexp = "EXPLICIT_IN_CELL") String calendarYearBasis) {
    }

    /** 원문에 적힌 날짜. 연도가 원문에 없으면 year=null (학년도로 계산하지 않는다). */
    public record PartialDate(@Min(1900) @Max(2100) Integer year, @NotNull @Min(1) @Max(12) Integer month,
            @NotNull @Min(1) @Max(31) Integer day) {
    }

    public record PageRange(@NotNull @Min(1) Integer from, @NotNull @Min(1) Integer to) {
    }

    public record WrittenEvaluation(
            @DecimalMin("0") @DecimalMax("100") BigDecimal weightPercent,
            @Size(max = 20) List<@NotNull @Valid Locator> sources,
            @Size(max = 20) List<@NotNull @Valid WrittenExam> exams) {
    }

    public record WrittenExam(
            @NotBlank @Size(max = 100) String itemKey,
            @NotNull @Min(1) Integer round,
            @DecimalMin("0") @DecimalMax("100") BigDecimal weightPercent,
            @DecimalMin(value = "0", inclusive = false) BigDecimal maxScore,
            @Size(max = 100) String timing,
            @Size(max = 10) List<@NotBlank @Size(max = 50) String> questionTypes,
            @Size(max = 20) List<@NotNull @Valid Locator> sources) {
    }

    public record PerformanceEvaluation(
            @DecimalMin("0") @DecimalMax("100") BigDecimal weightPercent,
            @Size(max = 20) List<@NotNull @Valid Locator> sources,
            @Size(max = 50) List<@NotNull @Valid PerformanceItem> items) {
    }

    public record PerformanceItem(
            @NotBlank @Size(max = 100) String itemKey,
            @NotBlank @Size(max = 200) String label,
            @Size(max = 100) String area,
            @Size(max = 100) String timing,
            @DecimalMin("0") @DecimalMax("100") BigDecimal weightPercent,
            @DecimalMin(value = "0", inclusive = false) BigDecimal maxScore,
            @Size(max = 4000) String content,
            @Size(max = 20) List<@NotBlank @Size(max = 300) String> submissions,
            @Size(max = 20) List<@NotBlank @Size(max = 300) String> conditions,
            @Size(max = 30) List<@NotNull @Valid RubricCriterion> rubric,
            @Size(max = 20) List<@NotNull @Valid Locator> sources) {
    }

    public record RubricCriterion(
            @NotBlank @Size(max = 300) String element,
            @Size(max = 10) List<@NotNull @Valid RubricLevel> levels,
            @Size(max = 10) List<@NotNull @Valid Locator> sources) {
    }

    public record RubricLevel(@NotBlank @Size(max = 1000) String description,
            @DecimalMin("0") BigDecimal score) {
    }

    /**
     * 원문 Locator. PDF: pdfPageNumber(물리 쪽, 1부터) 필수, printedPageLabel은 인쇄 쪽.
     * HWP·HWPX(실험): pdfPageNumber를 보내지 않고 documentLocator 필수. 형식별 조건은 Validator가 검사한다.
     */
    public record Locator(
            @Min(1) Integer pdfPageNumber,
            @Size(max = 20) String printedPageLabel,
            @Size(max = 2000) String extractedText,
            @JsonInclude(JsonInclude.Include.NON_NULL) @Valid DocumentLocator documentLocator) {

        /** 기존 PDF Locator 호환. */
        public Locator(Integer pdfPageNumber, String printedPageLabel, String extractedText) {
            this(pdfPageNumber, printedPageLabel, extractedText, null);
        }
    }

    /**
     * HWP·HWPX 원문 위치 (다중 형식 실험 초안 — 계정 B DocumentModel Locator의 필드를 그대로 옮김, 공식 계약 아님).
     * kind: HWP_PARAGRAPH / HWP_TABLE_CELL / HWPX_PARAGRAPH / HWPX_TABLE_CELL / CONTROL_TEXT.
     * section(0부터)·path(예: p3.c0.r1c2.p0)는 원본 문서 구조 위치다. 표 칸이면 table·row·col(0부터)·rowSpan·colSpan.
     * CONTROL_TEXT는 control(예: caption)과 cell=UNAVAILABLE(칸 위치를 알 수 없음)을 줄 수 있다. 분석기 로컬 id는 받지 않는다.
     */
    // 새 필드는 값이 있을 때만 직렬화한다: 기존 PDF 결과의 저장 JSON·재전송 판정 해시(payload_sha256)가 이전과 같게 유지된다.
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DocumentLocator(
            @NotBlank @Pattern(regexp = "HWP_PARAGRAPH|HWP_TABLE_CELL|HWPX_PARAGRAPH|HWPX_TABLE_CELL|CONTROL_TEXT") String kind,
            @NotNull @Min(0) Integer section,
            @NotBlank @Size(max = 200) @Pattern(regexp = "[A-Za-z0-9.]+") String path,
            @Min(0) Integer table,
            @Min(0) Integer row,
            @Min(0) Integer col,
            @Min(1) Integer rowSpan,
            @Min(1) Integer colSpan,
            @Size(max = 50) String control,
            @Pattern(regexp = "UNAVAILABLE") String cell) {
    }
}
