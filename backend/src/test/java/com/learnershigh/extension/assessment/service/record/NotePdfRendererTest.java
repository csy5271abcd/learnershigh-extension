package com.learnershigh.extension.assessment.service.record;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A28-51 §20-1 노트 PDF: 텍스트 PDF(한글·영문·특수문자 추출), 여러 쪽, 본인 이미지 본문 배치, 넣지 못한 첨부의 사유 표시,
 * 모르는 블록 글 보존, 글꼴에 없는 글자 대체, 첨부 0건. 서버 OS 한글 글꼴이 없으면(일부 CI) 건너뛴다.
 */
class NotePdfRendererTest {

    static final JsonMapper JSON = JsonMapper.builder().build();
    Path font;

    @BeforeEach
    void font() {
        Optional<Path> found = new ExportFontLocator("").find();
        assumeTrue(found.isPresent(), "한글 글꼴 없음");
        font = found.get();
    }

    static JsonNode block(String json) {
        return JSON.readTree(json);
    }

    static String fileBlock(String id, String type, String text, String name, long size, String mime, String attachmentId) {
        return "{\"blockId\":\"" + id + "\",\"type\":\"" + type + "\",\"text\":\"" + text + "\",\"attrs\":{\"file\":{\"name\":\"" + name
                + "\",\"size\":" + size + ",\"mimeType\":\"" + mime + "\""
                + (attachmentId == null ? "" : ",\"attachmentId\":\"" + attachmentId + "\"") + "}}}";
    }

    static byte[] image(String format, int w, int h, Color color) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, w, h);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    static NotePdfRenderer.Model model(String title, List<JsonNode> blocks) {
        return new NotePdfRenderer.Model(title, "한국사2", List.of(new String[] {"진행 상태", "진행 중"}, new String[] {"평가일", ""}),
                "노트 기준: 서버에 저장된 v3 (2026-11-24 10:00 저장)", "2026-11-24 11:00", "탐구 과정", blocks);
    }

    static String attachmentId(JsonNode block) {
        return block.path("attrs").path("file").path("attachmentId").asString("");
    }

    static int imageCount(PDDocument doc) throws Exception {
        int n = 0;
        for (PDPage page : doc.getPages()) {
            for (COSName name : page.getResources().getXObjectNames()) {
                if (page.getResources().getXObject(name) instanceof PDImageXObject) {
                    n++;
                }
            }
        }
        return n;
    }

    @Test
    void 한글_장문_여러_이미지가_텍스트_PDF_여러_쪽으로_나오고_넣지_못한_첨부는_사유를_적는다() throws Exception {
        byte[] png = image("png", 1600, 900, Color.BLUE);
        byte[] jpg = image("jpg", 400, 1800, Color.RED);
        List<JsonNode> blocks = new ArrayList<>();
        blocks.add(block("{\"blockId\":\"h\",\"type\":\"HEADING\",\"text\":\"1. 조사 배경 (Background)\",\"attrs\":{\"level\":1}}"));
        String longKorean = "띄어쓰기없이아주길게이어지는한국어문장이줄바꿈되어야합니다".repeat(12);
        for (int i = 0; i < 60; i++) {
            blocks.add(block("{\"blockId\":\"p" + i + "\",\"type\":\"PARAGRAPH\",\"text\":\"문단 " + i
                    + " — 20세기 역사 탐구: WWII & 냉전 (1945~1991) · 100% \\\"인용\\\" <특수> " + (i == 30 ? longKorean : "") + "\"}"));
        }
        blocks.add(block("{\"blockId\":\"b\",\"type\":\"BULLET\",\"text\":\"글머리 항목\",\"attrs\":{\"indent\":1}}"));
        blocks.add(block("{\"blockId\":\"n1\",\"type\":\"NUMBERED\",\"text\":\"첫째\"}"));
        blocks.add(block("{\"blockId\":\"n2\",\"type\":\"NUMBERED\",\"text\":\"둘째\"}"));
        blocks.add(block("{\"blockId\":\"c\",\"type\":\"CHECKLIST\",\"text\":\"자료 확인\",\"attrs\":{\"checked\":true}}"));
        blocks.add(block("{\"blockId\":\"t\",\"type\":\"TABLE\",\"text\":\"\",\"attrs\":{\"rows\":[[\"연도\",\"사건\"],[\"1950\",\"한국전쟁\"]]}}"));
        blocks.add(block(fileBlock("i1", "IMAGE", "", "지도.png", png.length, "image/png", "own-png")));
        blocks.add(block(fileBlock("i2", "IMAGE", "세로 사진 설명", "세로.jpg", jpg.length, "image/jpeg", "own-jpg")));
        blocks.add(block(fileBlock("i3", "IMAGE", "", "남의사진.png", 10, "image/png", "foreign")));
        blocks.add(block(fileBlock("i4", "IMAGE", "", "옛사진.png", 10, "image/png", null)));
        blocks.add(block(fileBlock("f", "FILE", "", "보고서.hwp", 2048, "application/x-hwp", "own-hwp")));
        blocks.add(block("{\"blockId\":\"x\",\"type\":\"FUTURE_BLOCK\",\"text\":\"모르는 형식의 글도 남는다\"}"));
        blocks.add(block("{\"blockId\":\"e\",\"type\":\"PARAGRAPH\",\"text\":\"이모지 \\uD83D\\uDE00 끝\"}"));

        byte[] pdf = NotePdfRenderer.render(font, model("나의 20세기 역사 탐구", blocks), b -> switch (attachmentId(b)) {
            case "own-png" -> new NotePdfRenderer.ImageResult(png, "image/png", null);
            case "own-jpg" -> new NotePdfRenderer.ImageResult(jpg, "image/jpeg", null);
            default -> NotePdfRenderer.ImageResult.skipped("이 학생의 첨부가 아님 — 넣지 않음");
        });

        assertThat(new String(pdf, 0, 5, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
        // 눈으로 확인할 때만: NOTE_PDF_SAMPLE_DIR 에 합성 시험 PDF 를 남긴다(개인정보 없음, 저장소에 넣지 않음)
        String sampleDir = System.getenv("NOTE_PDF_SAMPLE_DIR");
        if (sampleDir != null && !sampleDir.isBlank()) {
            java.nio.file.Files.write(Path.of(sampleDir, "note-export-sample.pdf"), pdf);
        }
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(3);
            assertThat(imageCount(doc)).isEqualTo(2);
            String text = new PDFTextStripper().getText(doc).replace("\r", "");
            assertThat(text).contains("나의 20세기 역사 탐구", "과목: 한국사2", "진행 상태: 진행 중", "평가일: 미정", "v3",
                    "WWII & 냉전 (1945~1991) · 100% \"인용\" <특수>", "문단 59", "• 글머리 항목", "1. 첫째", "2. 둘째", "[x] 자료 확인",
                    "1950  |  한국전쟁", "[이미지 첨부] 남의사진.png (이 학생의 첨부가 아님 — 넣지 않음)",
                    "[이미지 첨부] 옛사진.png (파일 미저장(이전 첨부))", "보고서.hwp · 파일 · 2.0KB · 서버에 저장됨",
                    "모르는 형식의 글도 남는다", "이모지 ? 끝", "세로 사진 설명", "1 / " + doc.getNumberOfPages());
            // 줄바꿈된 긴 한국어 문장이 글자 손실 없이 이어진다
            assertThat(text.replace("\n", "")).contains(longKorean);
        }
    }

    @Test
    void 빈_노트와_첨부_0건도_PDF가_되고_파일이름은_쓸_수_없는_글자만_뺀다() throws Exception {
        byte[] pdf = NotePdfRenderer.render(font, model("긴 제목 ".repeat(30), List.of()), b -> null);
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains("(저장된 노트 내용이 없어요)", "첨부 파일", "없음");
            assertThat(doc.getNumberOfPages()).isEqualTo(1);
        }
        OffsetDateTime now = OffsetDateTime.of(2026, 11, 24, 9, 0, 0, 0, ZoneOffset.ofHours(9));
        assertThat(NoteExportService.fileName("나의 20세기: 역사/탐구?*", now)).isEqualTo("나의 20세기 역사 탐구_탐구노트_2026-11-24.pdf");
        assertThat(NoteExportService.fileName("  ", now)).isEqualTo("수행평가_탐구노트_2026-11-24.pdf");
    }

    @Test
    void 상한을_넘거나_깨진_이미지는_넣지_않고_사유를_적는다() throws Exception {
        byte[] png = image("png", 20, 20, Color.GREEN);
        List<JsonNode> blocks = new ArrayList<>();
        blocks.add(block(fileBlock("bad", "IMAGE", "", "깨짐.png", 3, "image/png", "bad")));
        for (int i = 0; i < NotePdfRenderer.MAX_IMAGES + 2; i++) {
            blocks.add(block(fileBlock("i" + i, "IMAGE", "", "사진" + i + ".png", png.length, "image/png", "a" + i)));
        }
        byte[] pdf = NotePdfRenderer.render(font, model("상한", blocks), b -> "bad".equals(attachmentId(b))
                ? new NotePdfRenderer.ImageResult(new byte[] {1, 2, 3}, "image/png", null)
                : new NotePdfRenderer.ImageResult(png, "image/png", null));
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(imageCount(doc)).isEqualTo(NotePdfRenderer.MAX_IMAGES);
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains("사진" + NotePdfRenderer.MAX_IMAGES + ".png (본문 이미지 30개 상한 초과", "깨짐.png (이미지를 읽지 못함)");
        }
    }
}
