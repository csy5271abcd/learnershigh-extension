package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.common.error.BusinessException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;

/**
 * 평가계획서 형식 판별 (DB 없음). HWP 바이트는 "서명 검사용 합성 바이트"다: OLE 서명 + 한글 FileHeader 서명·버전·속성만 있어
 * 실제 한글 문서가 아니며 분석기로 읽을 수 없다. HWPX는 계정 B 테스트 규칙을 따른 합성 패키지다.
 */
public class DocumentFormatInspectorTest {

    final DocumentFormatInspector on = new DocumentFormatInspector(new PdfInspector(), true);
    final DocumentFormatInspector off = new DocumentFormatInspector(new PdfInspector(), false);

    public static byte[] hwpSignatureBytes(int major, long properties) {
        byte[] bytes = new byte[2048];
        byte[] ole = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
        System.arraycopy(ole, 0, bytes, 0, ole.length);
        byte[] signature = "HWP Document File".getBytes(StandardCharsets.US_ASCII);
        System.arraycopy(signature, 0, bytes, 1024, signature.length);
        long version = ((long) major << 24) | 0x0300;
        for (int i = 0; i < 4; i++) {
            bytes[1024 + 32 + i] = (byte) (version >>> (8 * i));
            bytes[1024 + 36 + i] = (byte) (properties >>> (8 * i));
        }
        return bytes;
    }

    static byte[] zip(Map<String, String> entries) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            for (Map.Entry<String, String> entry : entries.entrySet()) {
                zip.putNextEntry(new ZipEntry(entry.getKey()));
                zip.write(entry.getValue().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        return out.toByteArray();
    }

    static String reason(Runnable action) {
        try {
            action.run();
        } catch (BusinessException exception) {
            Object fields = exception.details() == null ? null : exception.details().get("fields");
            return exception.errorCode().code() + (fields == null ? "" : " " + fields);
        }
        return "no error";
    }

    byte[] fixture() throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/assessment/multiformat/synthetic-plan.hwpx")) {
            return in.readAllBytes();
        }
    }

    @Test
    void 합성_HWPX와_HWP_서명을_실제_바이트로_판별하고_쪽수는_null이다() throws IOException {
        DocumentFormatInspector.Inspection hwpx = on.inspect(fixture());
        assertThat(hwpx.format()).isEqualTo(PlanDocumentFormat.HWPX);
        assertThat(hwpx.pageCount()).isNull();
        assertThat(hwpx.sha256()).isEqualTo("19cd28b637611e1e72f40ad823c2842122ddf9bcff77833100ddd712ec81beaf");
        DocumentFormatInspector.Inspection hwp = on.inspect(hwpSignatureBytes(5, 0x1));
        assertThat(hwp.format()).isEqualTo(PlanDocumentFormat.HWP);
        assertThat(hwp.pageCount()).isNull();
    }

    @Test
    void 실험_기능이_꺼져_있으면_기존처럼_PDF만_받는다() throws IOException {
        byte[] hwpx = fixture();
        assertThatThrownBy(() -> off.inspect(hwpx)).isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(reason(() -> off.inspect(hwpx))).isEqualTo("UNSUPPORTED_FILE_TYPE"));
        assertThat(reason(() -> off.inspect(hwpSignatureBytes(5, 0)))).isEqualTo("UNSUPPORTED_FILE_TYPE");
    }

    @Test
    void HWP_암호_배포용_구버전_서명없음은_거절한다() {
        assertThat(reason(() -> on.inspect(hwpSignatureBytes(5, 0x2)))).contains("UNSUPPORTED_FILE_TYPE").contains("encrypted");
        assertThat(reason(() -> on.inspect(hwpSignatureBytes(5, 0x4)))).contains("distribution_document");
        assertThat(reason(() -> on.inspect(hwpSignatureBytes(3, 0)))).contains("unsupported_version");
        byte[] otherOle = hwpSignatureBytes(5, 0);
        otherOle[1024] = 'X';
        assertThat(reason(() -> on.inspect(otherOle))).contains("not_hwp_document");
    }

    @Test
    void HWPX_패키지_검사_경로이탈_손상_mimetype_암호_압축해제_한도() throws IOException {
        String section = "<?xml version=\"1.0\"?><hs:sec/>";
        assertThat(reason(() -> on.inspect(zipUnchecked(Map.of("Contents/section0.xml", section))))).contains("not_hwpx_package");
        assertThat(reason(() -> on.inspect(zipUnchecked(Map.of("mimetype", "application/zip", "Contents/section0.xml", section)))))
                .contains("not_hwpx_package");
        assertThat(reason(() -> on.inspect(zipUnchecked(Map.of("mimetype", "application/hwp+zip", "../evil.xml", "x")))))
                .contains("unsafe_entry_path");
        assertThat(reason(() -> on.inspect(zipUnchecked(Map.of("mimetype", "application/hwp+zip", "Contents/section0.xml", section,
                "META-INF/manifest.xml", "<manifest><encryption-data/></manifest>"))))).contains("encrypted");
        byte[] broken = new byte[64];
        broken[0] = 0x50;
        broken[1] = 0x4B;
        broken[2] = 0x03;
        broken[3] = 0x04;
        assertThat(reason(() -> on.inspect(broken))).contains("UNSUPPORTED_FILE_TYPE");
        byte[] bomb = bomb();
        assertThat(reason(() -> on.inspect(bomb))).contains("uncompressed_too_large");
        assertThat(DocumentFormatInspector.unsafe("C:/x")).isTrue();
        assertThat(DocumentFormatInspector.unsafe("/abs")).isTrue();
        assertThat(DocumentFormatInspector.unsafe("Contents\\a.xml")).isTrue();
        assertThat(DocumentFormatInspector.unsafe("Contents/section0.xml")).isFalse();
    }

    @Test
    void 알수없는_형식과_빈_파일은_거절하고_PDF는_기존과_같다() {
        assertThat(reason(() -> on.inspect("plain text".getBytes(StandardCharsets.UTF_8)))).contains("not_supported_format");
        assertThat(reason(() -> on.inspect(new byte[0]))).contains("not_supported_format");
        assertThat(reason(() -> off.inspect(new byte[0]))).isEqualTo("UNSUPPORTED_FILE_TYPE");
        assertThat(reason(() -> on.inspect("%PDF-1.4 broken".getBytes(StandardCharsets.US_ASCII)))).isEqualTo("PDF_EXTRACTION_FAILED");
    }

    public static byte[] zipUnchecked(Map<String, String> entries) {
        try {
            return zip(new java.util.LinkedHashMap<>(entries));
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    /** 압축 해제 시 100MB를 넘는 항목 (압축본은 작다) */
    public static byte[] bomb() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("mimetype"));
            zip.write("application/hwp+zip".getBytes(StandardCharsets.US_ASCII));
            zip.closeEntry();
            zip.putNextEntry(new ZipEntry("Contents/section0.xml"));
            byte[] chunk = new byte[1024 * 1024];
            for (int i = 0; i < 101; i++) {
                zip.write(chunk);
            }
            zip.closeEntry();
        }
        return out.toByteArray();
    }
}
