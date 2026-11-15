package com.learnershigh.extension.assessment.dto.plan;

import java.util.List;

/**
 * §38-5 학년도별 평가계획서 비교 (A7, 2026-11-15 DRAFT). 같은 학교·학년·학기에서 학년도마다 따로 등록·분석·확정한 문서를
 * <b>관리자 확정값만</b>으로 비교한다(basis = CONFIRMED_ONLY). 분석 후보·초안은 쓰지 않는다. 관리자 전용 — 학생 응답 아님.
 *
 * <p>과목은 학년도마다 관리자가 고른 학업 과목 ID로만 맞춘다(이름 유사도로 합치지 않는다). 수행평가 항목은 이름이 정확히 같을 때만
 * 같은 항목으로 보고, 1:1로 빠지고 생긴 경우는 POSSIBLE_RENAME(관리자 확인 필요)으로만 표시한다.
 */
public record PlanComparisonResponse(String schoolId, String schoolName, int grade, int semester, String basis,
        List<YearColumn> columns, List<Row> rows, List<ItemRow> items, List<String> warnings) {

    public static final String BASIS_CONFIRMED_ONLY = "CONFIRMED_ONLY";

    /**
     * status: NO_PLAN · NOT_CONFIRMED · AMBIGUOUS_PLAN(같은 슬롯에 확정 문서가 여럿 — plans로 하나를 고른다) · NO_SUBJECT_SELECTED ·
     * SUBJECT_UNKNOWN(그 학년도 슬롯의 과목이 아님) · SUBJECT_NOT_CONFIRMED(그 과목 확정값 없음) · CONFIRMED.
     */
    public record YearColumn(int academicYear, String status, String planId, String revisionId, String fileName,
            String documentFormat, boolean previewAvailable, String subjectId, String subjectName,
            Integer teachingPlanRows, List<PlanOption> plans, List<SubjectOption> subjects, boolean slotAvailable) {
    }

    /** 그 학년도 슬롯의 문서. confirmedRevisionId = 학생에게 공개된(가장 최근 확정) Revision, 없으면 null */
    public record PlanOption(String planId, String latestRevisionId, String confirmedRevisionId, String fileName,
            String reviewStatus) {
    }

    /** 그 학년도 슬롯의 학업 과목. confirmed = 선택 문서에 이 과목의 확정값이 있음 */
    public record SubjectOption(String subjectId, String name, boolean confirmed) {
    }

    /** state: VALUE · ABSENT(원문에 없음으로 확정) · NOT_CONFIRMED(그 값은 확정되지 않음) · NOT_AVAILABLE(그 학년도는 비교 불가) */
    public record Cell(String state, Object value, Integer pdfPageNumber) {
    }

    /** 인접 학년도 사이 변화. status: SAME · CHANGED · ADDED · REMOVED · POSSIBLE_RENAME · NOT_COMPARABLE · NEEDS_REVIEW */
    public record Transition(int fromYear, int toYear, String status) {
    }

    public record Row(String key, String label, List<Cell> cells, String status, List<Transition> transitions,
            String note) {
    }

    /** cells[i].state: PRESENT · MISSING(비교 가능한 학년도인데 그 이름의 항목이 없음) · NOT_AVAILABLE */
    public record ItemRow(String label, List<ItemCell> cells, String status, List<Transition> transitions,
            String note) {
    }

    public record ItemCell(String state, Integer itemIndex, Cell weightPercent, Cell maxScore, Cell timing,
            Integer pdfPageNumber) {
    }
}
