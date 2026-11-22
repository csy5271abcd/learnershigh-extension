package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Block;
import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Cell;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

/**
 * A27-UX 부록 E: 학교알리미 원본의 <b>앞부분 글자</b>(표지·제목줄)만 읽어 학년도·학년·학기 근거를 찾는 데 쓴다.
 * 분석(§39)이 아니다. 읽지 못하면 빈 문자열 — 근거 없음으로 처리되어 등록되지 않는다(실패를 성공으로 꾸미지 않음).
 */
final class SourceTextProbe {

    static final int LIMIT = 2000;
    /** 부록 G: 학년 범위 판단용 본문 앞부분(표 포함) */
    static final int BODY_LIMIT = 40_000;
    private static final long TIMEOUT_MILLIS = 15_000;

    private SourceTextProbe() {
    }

    static String head(byte[] bytes, PlanDocumentFormat format) {
        return head(bytes, format, LIMIT);
    }

    static String head(byte[] bytes, PlanDocumentFormat format, int limit) {
        if (bytes == null || format == null) {
            return "";
        }
        try {
            if (format == PlanDocumentFormat.PDF) {
                try (PDDocument doc = Loader.loadPDF(bytes)) {
                    PDFTextStripper s = new PDFTextStripper();
                    s.setStartPage(1);
                    s.setEndPage(Math.min(limit > LIMIT ? 20 : 2, doc.getNumberOfPages()));
                    String t = s.getText(doc);
                    return t.length() <= limit ? t : t.substring(0, limit);
                }
            }
            StructureBudget budget = new StructureBudget(TIMEOUT_MILLIS);
            List<Block> blocks = format == PlanDocumentFormat.HWP ? HwpStructureReader.read(bytes, budget).blocks()
                    : HwpxStructureReader.read(bytes, budget).blocks();
            StringBuilder out = new StringBuilder();
            collect(blocks, out, limit);
            return out.length() <= limit ? out.toString() : out.substring(0, limit);
        } catch (Exception | StackOverflowError e) {
            return "";
        }
    }

    private static void collect(List<Block> blocks, StringBuilder out, int limit) {
        if (blocks == null) {
            return;
        }
        for (Block b : blocks) {
            if (out.length() >= limit) {
                return;
            }
            if (b.text() != null && !b.text().isBlank()) {
                out.append(b.text().strip()).append('\n');
            }
            collect(b.blocks(), out, limit);
            collect(b.caption(), out, limit);
            if (b.cells() != null) {
                for (Cell c : b.cells()) {
                    collect(c.paragraphs(), out, limit);
                }
            }
        }
    }
}
