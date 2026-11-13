package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.FieldViolation;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 평가계획서 원본 형식 판별·검사 (PDF / HWP / HWPX). 확장자·Content-Type 헤더가 아니라 실제 바이트로 판별한다.
 *
 * <p>원문 등록·보관은 PDF·HWP·HWPX 모두 받는다(2026-11-13 S-4·S-5 승인: 평가계획서 원문 저장). 형식을 확인했다는 것은
 * "등록·보관 가능"일 뿐 "분석·확정 가능"을 뜻하지 않는다. HWP·HWPX 분석 결과 수신 필드(source.format·documentLocator)와
 * 공식 확정은 계속 실험 기능({@code assessment.multiformat.experimental}, 기본 false)·별도 Flag 뒤에 있다(S-8 미결).
 *
 * <ul>
 *   <li>HWP: OLE 복합 문서 서명 + 한글 5.x FileHeader 서명("HWP Document File")·버전·속성(암호·배포용)을 확인한다.
 *       OLE 디렉터리를 끝까지 해석하지는 않는다(구조 서명 수준).</li>
 *   <li>HWPX: ZIP을 스트리밍으로 읽는다. 경로 이탈 이름·항목 수·압축 해제 총량을 제한하고, {@code mimetype}이
 *       {@code application/hwp+zip}이고 {@code Contents/section*.xml}이 있어야 한다. XML은 해석하지 않는다(외부 엔터티 위험 없음).</li>
 * </ul>
 * 실패 사유는 기존 오류 코드(415·413) + details.fields[file] 사유로 돌려준다(새 오류 코드 없음).
 */
@Component
public class DocumentFormatInspector {

    static final long MAX_HWPX_UNCOMPRESSED_BYTES = 100L * 1024 * 1024;
    static final int MAX_HWPX_ENTRIES = 2_000;
    private static final byte[] PDF_MAGIC = "%PDF-".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] OLE_MAGIC = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A,
        (byte) 0xE1};
    private static final byte[] ZIP_MAGIC = {0x50, 0x4B, 0x03, 0x04};
    private static final byte[] HWP_SIGNATURE = "HWP Document File".getBytes(StandardCharsets.US_ASCII);
    private static final String HWPX_MIMETYPE = "application/hwp+zip";

    private final PdfInspector pdfInspector;
    private final boolean experimental;

    public DocumentFormatInspector(PdfInspector pdfInspector,
            @Value("${assessment.multiformat.experimental:false}") boolean experimental) {
        this.pdfInspector = pdfInspector;
        this.experimental = experimental;
    }

    /** sha256은 모든 형식 공통, pageCount는 PDF만(HWP·HWPX는 null — 쪽 수를 추측해 넣지 않는다). */
    public record Inspection(PlanDocumentFormat format, String sha256, Integer pageCount, long sizeBytes) {
    }

    /** 분석 결과 수신의 HWP·HWPX 필드 허용 여부 (등록·보관 허용과 별개). */
    public boolean experimentalEnabled() {
        return experimental;
    }

    public Inspection inspect(byte[] bytes) {
        if (bytes.length > PdfInspector.MAX_BYTES) {
            throw new BusinessException(AssessmentErrorCode.FILE_TOO_LARGE);
        }
        if (startsWith(bytes, PDF_MAGIC)) {
            // PDF 경로는 기존 PdfInspector와 완전히 같은 동작이다.
            PdfInspector.Inspection pdf = pdfInspector.inspect(bytes);
            return new Inspection(PlanDocumentFormat.PDF, pdf.sha256(), pdf.pageCount(), pdf.sizeBytes());
        }
        if (startsWith(bytes, OLE_MAGIC)) {
            inspectHwp(bytes);
            return new Inspection(PlanDocumentFormat.HWP, PdfInspector.sha256(bytes), null, bytes.length);
        }
        if (startsWith(bytes, ZIP_MAGIC)) {
            inspectHwpx(bytes);
            return new Inspection(PlanDocumentFormat.HWPX, PdfInspector.sha256(bytes), null, bytes.length);
        }
        throw rejected("not_supported_format");
    }

    private static void inspectHwp(byte[] bytes) {
        int at = indexOf(bytes, HWP_SIGNATURE);
        // FileHeader: 서명 32 byte + 버전 4 byte + 속성 4 byte (HWP 5.0 문서 형식)
        if (at < 0 || at + 40 > bytes.length) {
            throw rejected("not_hwp_document");
        }
        long version = littleEndianUInt32(bytes, at + 32);
        long properties = littleEndianUInt32(bytes, at + 36);
        if ((version >>> 24) != 5) {
            throw rejected("unsupported_version");
        }
        if ((properties & 0x2) != 0) {
            throw rejected("encrypted");
        }
        if ((properties & 0x4) != 0) {
            throw rejected("distribution_document");
        }
    }

    private static void inspectHwpx(byte[] bytes) {
        boolean mimetypeOk = false;
        boolean hasSection = false;
        boolean encrypted = false;
        long total = 0;
        int entries = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (++entries > MAX_HWPX_ENTRIES) {
                    throw rejected("too_many_entries");
                }
                String name = entry.getName();
                if (unsafe(name)) {
                    throw rejected("unsafe_entry_path");
                }
                byte[] head = new byte[512];
                int headLength = 0;
                byte[] buffer = new byte[8192];
                int read;
                while ((read = zip.read(buffer)) > 0) {
                    total += read;
                    if (total > MAX_HWPX_UNCOMPRESSED_BYTES) {
                        throw rejected("uncompressed_too_large");
                    }
                    int copy = Math.min(read, head.length - headLength);
                    System.arraycopy(buffer, 0, head, headLength, copy);
                    headLength += copy;
                }
                String text = new String(head, 0, headLength, StandardCharsets.UTF_8);
                if ("mimetype".equals(name)) {
                    mimetypeOk = HWPX_MIMETYPE.equals(text.strip());
                } else if (name.startsWith("Contents/section") && name.endsWith(".xml")) {
                    hasSection = true;
                } else if ("META-INF/manifest.xml".equals(name) && text.contains("encryption-data")) {
                    encrypted = true;
                }
            }
        } catch (ZipException exception) {
            // 손상된 ZIP 또는 암호화 항목(ZipInputStream이 읽지 못함)
            throw rejected(String.valueOf(exception.getMessage()).contains("encrypted") ? "encrypted" : "corrupted");
        } catch (IOException exception) {
            throw rejected("corrupted");
        }
        if (encrypted) {
            throw rejected("encrypted");
        }
        if (!mimetypeOk || !hasSection) {
            throw rejected("not_hwpx_package");
        }
    }

    /** ZIP 항목 이름의 경로 이탈 위험: 절대 경로, 상위 경로, 역슬래시, 드라이브 문자 */
    static boolean unsafe(String name) {
        return name.isEmpty() || name.startsWith("/") || name.contains("\\") || name.contains(":")
                || Arrays.asList(name.split("/")).contains("..");
    }

    private static BusinessException rejected(String reason) {
        return BusinessException.withFields(AssessmentErrorCode.UNSUPPORTED_FILE_TYPE, new FieldViolation("file", reason));
    }

    private static boolean startsWith(byte[] bytes, byte[] magic) {
        return bytes.length >= magic.length && Arrays.equals(bytes, 0, magic.length, magic, 0, magic.length);
    }

    private static int indexOf(byte[] bytes, byte[] needle) {
        outer:
        for (int i = 0; i + needle.length <= bytes.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (bytes[i + j] != needle[j]) {
                    continue outer;
                }
            }
            return i;
        }
        return -1;
    }

    private static long littleEndianUInt32(byte[] bytes, int offset) {
        return (bytes[offset] & 0xFFL) | (bytes[offset + 1] & 0xFFL) << 8 | (bytes[offset + 2] & 0xFFL) << 16
                | (bytes[offset + 3] & 0xFFL) << 24;
    }
}
