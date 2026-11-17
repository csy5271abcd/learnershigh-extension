package com.learnershigh.extension.assessment.service.ai;

import com.learnershigh.extension.assessment.exception.AssessmentAiErrorCode;
import com.learnershigh.extension.common.error.BusinessException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

/**
 * PDF → 쪽별 텍스트 (PDFBox). OCR은 연결하지 않았다: 글자가 없는 이미지형 PDF는 PDF_TEXT_NOT_FOUND로 알린다 (가짜 결과 금지).
 * 쪽 번호는 PDF 물리 쪽(1부터)이다. 문서에 인쇄된 쪽 번호와 다를 수 있다.
 */
@Component
public class PdfTextExtractor {

    public static final int MAX_BYTES = 20 * 1024 * 1024;
    public static final int MAX_PAGES = 120;
    /** 한 쪽에서 이 글자 수보다 적으면 "텍스트가 거의 없는 쪽"(이미지·도표 위주)으로 본다 */
    static final int SPARSE_PAGE_CHARS = 40;

    public record PdfText(String sha256, List<String> pages) {

        public int textPageCount() {
            return (int) pages.stream().filter(page -> page.strip().length() >= SPARSE_PAGE_CHARS).count();
        }

        public int characterCount() {
            return pages.stream().mapToInt(String::length).sum();
        }

        /** AI 입력: 쪽마다 [PDF p.N] 표시를 붙인다 */
        public String withPageMarkers() {
            StringBuilder builder = new StringBuilder();
            for (int index = 0; index < pages.size(); index++) {
                builder.append("\n[PDF p.").append(index + 1).append("]\n").append(pages.get(index).strip()).append('\n');
            }
            return builder.toString();
        }

        public List<Integer> sparsePages() {
            List<Integer> sparse = new ArrayList<>();
            for (int index = 0; index < pages.size(); index++) {
                if (pages.get(index).strip().length() < SPARSE_PAGE_CHARS) sparse.add(index + 1);
            }
            return sparse;
        }
    }

    public PdfText extract(byte[] bytes) {
        if (bytes.length == 0 || !startsWithPdfHeader(bytes)) throw new BusinessException(AssessmentAiErrorCode.UNSUPPORTED_FILE_TYPE);
        if (bytes.length > MAX_BYTES) throw new BusinessException(AssessmentAiErrorCode.FILE_TOO_LARGE);
        try (PDDocument document = Loader.loadPDF(bytes)) {
            if (document.isEncrypted()) throw new BusinessException(AssessmentAiErrorCode.PDF_EXTRACTION_FAILED);
            int pageCount = document.getNumberOfPages();
            if (pageCount > MAX_PAGES) throw new BusinessException(AssessmentAiErrorCode.PDF_TOO_MANY_PAGES);
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            List<String> pages = new ArrayList<>(pageCount);
            for (int page = 1; page <= pageCount; page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                pages.add(stripper.getText(document));
            }
            PdfText text = new PdfText(sha256(bytes), List.copyOf(pages));
            if (text.textPageCount() == 0) throw new BusinessException(AssessmentAiErrorCode.PDF_TEXT_NOT_FOUND);
            return text;
        } catch (IOException exception) {
            throw new BusinessException(AssessmentAiErrorCode.PDF_EXTRACTION_FAILED);
        }
    }

    private static boolean startsWithPdfHeader(byte[] bytes) {
        return bytes.length >= 5 && new String(bytes, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-");
    }

    public static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
