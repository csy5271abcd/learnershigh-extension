package com.learnershigh.extension.assessment.dto.plan;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * §38-6 HWP·HWPX 원문 구조 미리보기 (A10 DRAFT). 원본 바이트를 서버에서 직접 읽어 문단·표(병합 셀 포함)를 그대로 돌려준다.
 * PDF로 변환하지 않는다. 쪽 나눔·글꼴·그림은 담지 않는다(조판 결과가 아니라 문서 구조다).
 *
 * <p>{@code section}·{@code path}는 분석 결과의 {@code documentLocator.section}·{@code path}와 같은 규칙으로 만든다
 * (계정 B DocumentModel과 같은 규칙, 코퍼스 대조로 검증). 화면은 Locator와 정확히 같은 위치만 강조하고, 없으면 강조하지 않는다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PlanStructurePreviewResponse(
        String planId,
        String revisionId,
        String documentFormat,
        String sha256,
        Renderer renderer,
        int sectionCount,
        Stats stats,
        List<String> notices,
        List<Block> blocks) {

    public record Renderer(String name, String version) {
    }

    public record Stats(int paragraphs, int tables, int cells, long textChars) {
    }

    /**
     * 문단 또는 표. type = PARAGRAPH | TABLE.
     * PARAGRAPH: kind(HWP_PARAGRAPH·HWP_TABLE_CELL·HWPX_PARAGRAPH·HWPX_TABLE_CELL·CONTROL_TEXT), text, control(CONTROL_TEXT), blocks(문단 안 표·개체 글).
     * TABLE: table(문서 전체 표 번호), rows·cols(선언 값), cells, caption.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Block(
            String type,
            int section,
            String path,
            String kind,
            String text,
            String control,
            List<Block> blocks,
            Integer table,
            Integer rows,
            Integer cols,
            List<Cell> cells,
            List<Block> caption) {

        public static Block paragraph(int section, String path, String kind, String text, String control,
                List<Block> blocks) {
            return new Block("PARAGRAPH", section, path, kind, text, control, blocks.isEmpty() ? null : blocks,
                    null, null, null, null, null);
        }

        public static Block table(int section, String path, int table, Integer rows, Integer cols, List<Cell> cells,
                List<Block> caption) {
            return new Block("TABLE", section, path, null, null, null, null, table, rows, cols, cells,
                    caption.isEmpty() ? null : caption);
        }
    }

    /** 표 칸. row·col·rowSpan·colSpan은 화면 배치용(0부터), path는 Locator 대조용 위치다. */
    public record Cell(int row, int col, int rowSpan, int colSpan, String path, List<Block> paragraphs) {
    }
}
