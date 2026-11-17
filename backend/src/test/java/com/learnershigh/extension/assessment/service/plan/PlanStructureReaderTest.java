package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Block;
import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Cell;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.FieldViolation;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;

/**
 * A10 §38-6 HWP·HWPX 구조 판독. Fixture는 모두 합성 문서다(2099학년도 가상 과목, README 참고).
 *
 * <p>위치 규칙 시험: {@code structure-locators.golden.tsv}는 같은 세 Fixture를 계정 B DocumentModel 판독기(무수정)로 읽은
 * 위치·글자 목록이다. 계정 A 판독 결과가 한 줄도 다르지 않아야 한다(분석 결과 documentLocator와 화면 위치가 같은 규칙).
 */
class PlanStructureReaderTest {

    static byte[] fixture(String name) throws IOException {
        try (InputStream in = PlanStructureReaderTest.class.getResourceAsStream("/assessment/multiformat/" + name)) {
            return in.readAllBytes();
        }
    }

    static PlanStructurePreviewResponse render(PlanDocumentFormat format, byte[] bytes) {
        return PlanStructurePreviewQueryService.render("plan", "rev", format, "sha", bytes, 10_000);
    }

    static String dump(String id, PlanStructurePreviewResponse response) {
        StringWriter text = new StringWriter();
        try (PrintWriter out = new PrintWriter(text)) {
            for (Block block : response.blocks()) {
                StructureCorpusDumpTest.walk(out, id, block);
            }
        }
        return text.toString().replace("\r\n", "\n");
    }

    @Test
    void 합성_HWP_HWPX의_위치와_글자는_분석기_DocumentModel과_한_줄도_다르지_않다() throws IOException {
        String actual = dump("f0", render(PlanDocumentFormat.HWP, fixture("synthetic-plan.hwp")))
                + dump("f1", render(PlanDocumentFormat.HWP, fixture("caption-plan.hwp")))
                + dump("f2", render(PlanDocumentFormat.HWPX, fixture("synthetic-plan.hwpx")));
        String golden = new String(fixture("structure-locators.golden.tsv"), StandardCharsets.UTF_8).replace("\r\n", "\n");
        assertThat(actual.lines().toList()).containsExactlyElementsOf(golden.lines().toList());
    }

    @Test
    void HWP_병합_칸과_캡션과_칸_안_표를_보존한다() throws IOException {
        PlanStructurePreviewResponse plan = render(PlanDocumentFormat.HWP, fixture("synthetic-plan.hwp"));
        assertThat(plan.documentFormat()).isEqualTo("HWP");
        assertThat(plan.renderer().name()).isEqualTo("hwp-structure");
        Block evaluation = plan.blocks().get(3).blocks().get(0);
        assertThat(evaluation.type()).isEqualTo("TABLE");
        assertThat(evaluation.path()).isEqualTo("p3.c0");
        Cell written = cell(evaluation, "p3.c0.r0c1");
        assertThat(written.colSpan()).isEqualTo(2);
        assertThat(written.paragraphs().get(0).text()).isEqualTo("지필평가");
        assertThat(cell(evaluation, "p3.c0.r1c1").paragraphs().get(0).text()).isEqualTo("40%");

        PlanStructurePreviewResponse caption = render(PlanDocumentFormat.HWP, fixture("caption-plan.hwp"));
        Block outer = caption.blocks().get(8).blocks().get(0);
        assertThat(outer.caption()).extracting(Block::text).containsExactly("바깥 표 제목");
        assertThat(outer.caption().get(0).kind()).isEqualTo("CONTROL_TEXT");
        Block inner = cell(outer, "p8.c0.r0c1").paragraphs().get(0).blocks().get(0);
        assertThat(inner.type()).isEqualTo("TABLE");
        assertThat(inner.caption()).extracting(Block::text).containsExactly("안쪽 표 제목");
    }

    @Test
    void HWPX_칸_좌표와_병합을_그대로_돌려준다() throws IOException {
        PlanStructurePreviewResponse plan = render(PlanDocumentFormat.HWPX, fixture("synthetic-plan.hwpx"));
        assertThat(plan.renderer().name()).isEqualTo("hwpx-structure");
        List<Cell> cells = Stream.of(plan.blocks().toArray(Block[]::new))
                .flatMap(b -> b.blocks() == null ? Stream.empty() : b.blocks().stream())
                .filter(b -> b.type().equals("TABLE"))
                .flatMap(t -> t.cells().stream()).toList();
        assertThat(cells).isNotEmpty();
        assertThat(cells).allSatisfy(c -> assertThat(c.path()).matches("p\\d+\\.c\\d+\\.r\\d+c\\d+"));
        assertThat(cells).anySatisfy(c -> assertThat(c.colSpan() > 1 || c.rowSpan() > 1).isTrue());
        assertThat(plan.stats().tables()).isPositive();
    }

    @Test
    void 손상된_HWP는_parse_failed로_거절하고_내용을_내보내지_않는다() throws IOException {
        byte[] random = new byte[8192];
        new Random(7).nextBytes(random);
        expectFailure(PlanDocumentFormat.HWP, random, "parse_failed");
        byte[] truncated = Arrays.copyOf(fixture("synthetic-plan.hwp"), 3000);
        expectFailure(PlanDocumentFormat.HWP, truncated, "parse_failed");
    }

    @Test
    void 암호_배포용_속성이_있는_HWP는_protected로_거절한다() throws IOException {
        byte[] bytes = fixture("synthetic-plan.hwp");
        int header = indexOf(bytes, "HWP Document File".getBytes(StandardCharsets.US_ASCII));
        assertThat(header).isPositive();
        bytes[header + 36] |= 2; // 속성 bit 1 = 암호
        expectFailure(PlanDocumentFormat.HWP, bytes, "protected");
    }

    @Test
    void HWPX_외부_엔터티_경로_이탈_압축_폭탄_과도한_중첩은_거절한다() throws IOException {
        // 외부 엔터티: DOCTYPE 자체를 금지한다(파일을 읽지 않는다)
        expectFailure(PlanDocumentFormat.HWPX, zip("Contents/section0.xml", """
                <?xml version="1.0"?><!DOCTYPE s [<!ENTITY x SYSTEM "file:///etc/hostname">]>
                <hs:sec xmlns:hs="urn:s" xmlns:hp="urn:p"><hp:p><hp:run><hp:t>&x;</hp:t></hp:run></hp:p></hs:sec>"""
                .getBytes(StandardCharsets.UTF_8)), "parse_failed");
        expectFailure(PlanDocumentFormat.HWPX, zip("../evil.xml", "<x/>".getBytes(StandardCharsets.UTF_8)), "parse_failed");
        // 압축을 풀면 100MB를 넘는 항목
        expectFailure(PlanDocumentFormat.HWPX, zip("Contents/section0.xml", new byte[101 * 1024 * 1024]), "limit_exceeded");
        // 표 안의 표를 20번 중첩
        StringBuilder xml = new StringBuilder("<hs:sec xmlns:hs=\"urn:s\" xmlns:hp=\"urn:p\">");
        for (int i = 0; i < 20; i++) {
            xml.append("<hp:p><hp:run><hp:tbl rowCnt=\"1\" colCnt=\"1\"><hp:tr><hp:tc><hp:subList>");
        }
        xml.append("<hp:p><hp:run><hp:t>깊은 칸</hp:t></hp:run></hp:p>");
        for (int i = 0; i < 20; i++) {
            xml.append("</hp:subList><hp:cellAddr colAddr=\"0\" rowAddr=\"0\"/></hp:tc></hp:tr></hp:tbl></hp:run></hp:p>");
        }
        xml.append("</hs:sec>");
        expectFailure(PlanDocumentFormat.HWPX, zip("Contents/section0.xml", xml.toString().getBytes(StandardCharsets.UTF_8)),
                "limit_exceeded");
        expectFailure(PlanDocumentFormat.HWPX, zip("Contents/header.xml", "<x/>".getBytes(StandardCharsets.UTF_8)), "parse_failed");
    }

    @Test
    void 시간_한도를_넘기면_timeout으로_중단한다() throws IOException {
        byte[] bytes = fixture("caption-plan.hwp");
        assertThatThrownBy(() -> PlanStructurePreviewQueryService.render("p", "r", PlanDocumentFormat.HWP, "s", bytes, 0))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(reason(e)).isEqualTo("timeout"));
    }

    static void expectFailure(PlanDocumentFormat format, byte[] bytes, String reason) {
        assertThatThrownBy(() -> render(format, bytes))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.errorCode()).isEqualTo(AssessmentErrorCode.PLAN_PREVIEW_FAILED);
                    assertThat(reason(e)).isEqualTo(reason);
                });
    }

    @SuppressWarnings("unchecked")
    static String reason(BusinessException e) {
        return ((List<FieldViolation>) e.details().get("fields")).get(0).reason();
    }

    static byte[] zip(String name, byte[] body) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("mimetype"));
            zip.write("application/hwp+zip".getBytes(StandardCharsets.US_ASCII));
            zip.putNextEntry(new ZipEntry(name));
            zip.write(body);
            zip.closeEntry();
        }
        return out.toByteArray();
    }

    static Cell cell(Block table, String path) {
        return table.cells().stream().filter(c -> c.path().equals(path)).findFirst().orElseThrow();
    }

    static int indexOf(byte[] haystack, byte[] needle) {
        outer:
        for (int i = 0; i + needle.length <= haystack.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) {
                    continue outer;
                }
            }
            return i;
        }
        return -1;
    }
}
