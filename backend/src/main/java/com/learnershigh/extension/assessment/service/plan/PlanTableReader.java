package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Block;
import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Cell;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.service.plan.extract.PdfTables;
import com.learnershigh.extension.assessment.service.plan.extract.SourceTable;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * 평가계획서 원문 → 표 목록 (형식 공통). HWP·HWPX 는 기존 구조 리더(HwpStructureReader·HwpxStructureReader)를,
 * PDF 는 {@link PdfTables} 를 쓴다. 분석 규칙(extract 패키지)은 이 표 목록만 본다.
 */
public final class PlanTableReader {

    private static final int CTX = 400;

    private PlanTableReader() {
    }

    public static List<SourceTable> read(byte[] bytes, PlanDocumentFormat format, long timeoutMillis) throws IOException {
        if (format == PlanDocumentFormat.PDF) {
            List<SourceTable> out = new ArrayList<>();
            for (PdfTables.Table t : PdfTables.read(bytes)) {
                out.add(new SourceTable(t.page, null, null, t.cells, null, t.ctx));
            }
            return out;
        }
        StructureBudget budget = new StructureBudget(timeoutMillis);
        List<Block> blocks = format == PlanDocumentFormat.HWP ? HwpStructureReader.read(bytes, budget).blocks()
                : HwpxStructureReader.read(bytes, budget).blocks();
        Walker w = new Walker();
        w.walk(blocks);
        return w.out;
    }

    /** 문서 순서대로 걸으며 표마다 앞 본문 글자(ctx)를 붙인다. 칸 안의 표도 따로 뽑는다. */
    private static final class Walker {
        final List<SourceTable> out = new ArrayList<>();
        final StringBuilder recent = new StringBuilder();

        void walk(List<Block> blocks) {
            if (blocks == null) {
                return;
            }
            for (Block b : blocks) {
                if ("TABLE".equals(b.type())) {
                    table(b);
                } else {
                    if (b.text() != null && !b.text().isBlank()) {
                        recent.append(b.text().strip()).append('\n');
                        if (recent.length() > CTX * 2) {
                            recent.delete(0, recent.length() - CTX);
                        }
                    }
                    walk(b.blocks());
                }
            }
        }

        void table(Block t) {
            int rows = t.rows() == null ? 0 : t.rows();
            int cols = t.cols() == null ? 0 : t.cols();
            List<Cell> cells = t.cells() == null ? List.of() : t.cells();
            for (Cell c : cells) {
                rows = Math.max(rows, c.row() + Math.max(1, c.rowSpan()));
                cols = Math.max(cols, c.col() + Math.max(1, c.colSpan()));
            }
            if (rows == 0 || cols == 0) {
                return;
            }
            String[][] g = new String[rows][cols];
            String[][] paths = new String[rows][cols];
            List<Block> nested = new ArrayList<>();
            for (Cell c : cells) {
                String text = cellText(c.paragraphs(), nested);
                for (int r = c.row(); r < c.row() + Math.max(1, c.rowSpan()) && r < rows; r++) {
                    for (int k = c.col(); k < c.col() + Math.max(1, c.colSpan()) && k < cols; k++) {
                        g[r][k] = text;
                        paths[r][k] = c.path();
                    }
                }
            }
            List<List<String>> grid = new ArrayList<>();
            List<List<String>> pathGrid = new ArrayList<>();
            for (int r = 0; r < rows; r++) {
                List<String> row = new ArrayList<>();
                List<String> prow = new ArrayList<>();
                for (int k = 0; k < cols; k++) {
                    row.add(g[r][k] == null ? "" : g[r][k]);
                    prow.add(paths[r][k]);
                }
                grid.add(row);
                pathGrid.add(prow);
            }
            String ctx = recent.length() > CTX ? recent.substring(recent.length() - CTX) : recent.toString();
            out.add(new SourceTable(null, t.section(), t.path(), grid, pathGrid, ctx.strip()));
            for (Block n : nested) {
                table(n);
            }
            recent.setLength(0);
        }

        private static String cellText(List<Block> paragraphs, List<Block> nested) {
            StringBuilder sb = new StringBuilder();
            if (paragraphs == null) {
                return "";
            }
            for (Block p : paragraphs) {
                if ("TABLE".equals(p.type())) {
                    nested.add(p);
                    continue;
                }
                if (p.text() != null && !p.text().isBlank()) {
                    if (sb.length() > 0) {
                        sb.append(' ');
                    }
                    sb.append(p.text().strip());
                }
                if (p.blocks() != null) {
                    String inner = cellText(p.blocks(), nested);
                    if (!inner.isBlank()) {
                        sb.append(' ').append(inner);
                    }
                }
            }
            return sb.toString().replaceAll("\\s+", " ").strip();
        }
    }
}
