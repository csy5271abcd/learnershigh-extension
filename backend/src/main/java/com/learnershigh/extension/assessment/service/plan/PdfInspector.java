package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.common.error.BusinessException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Component;

/**
 * 평가계획서 PDF 원본 검사: 형식(파일명·확장자가 아닌 실제 바이트), 크기, 쪽수, SHA-256.
 * 바이트는 저장하지 않는다 (File Storage 미결, API-OD-A03).
 */
@Component
public class PdfInspector {

    public static final long MAX_BYTES = 20L * 1024 * 1024;
    private static final byte[] PDF_MAGIC = "%PDF-".getBytes(StandardCharsets.US_ASCII);

    public record Inspection(String sha256, int pageCount, long sizeBytes) {
    }

    public Inspection inspect(byte[] bytes) {
        if (bytes.length > MAX_BYTES) {
            throw new BusinessException(AssessmentErrorCode.FILE_TOO_LARGE);
        }
        if (bytes.length < PDF_MAGIC.length || !Arrays.equals(bytes, 0, PDF_MAGIC.length, PDF_MAGIC, 0,
                PDF_MAGIC.length)) {
            throw new BusinessException(AssessmentErrorCode.UNSUPPORTED_FILE_TYPE);
        }
        int pages;
        try (PDDocument document = Loader.loadPDF(bytes)) {
            pages = document.getNumberOfPages();
        } catch (IOException exception) {
            throw new BusinessException(AssessmentErrorCode.PDF_EXTRACTION_FAILED);
        }
        return new Inspection(sha256(bytes), pages, bytes.length);
    }

    static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
