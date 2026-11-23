package com.learnershigh.extension.assessment.service.record;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.apache.fontbox.ttf.TrueTypeCollection;
import org.apache.fontbox.ttf.TrueTypeFont;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.image.JPEGFactory;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import tools.jackson.databind.JsonNode;

/**
 * §20-1 탐구 노트 PDF 그리기 (A28-51). PDFBox 로 텍스트가 선택·검색되는 A4 PDF 를 만든다(그림 캡처 PDF 아님).
 * - 노트 글은 요약·생략 없이 원문 그대로 줄바꿈·페이지 나눔한다. 모르는 블록 형식도 글을 버리지 않는다.
 * - 이미지는 호출 측이 준 본인 첨부 바이트만 넣는다(PNG·JPEG·GIF, 상한 안). 그 밖은 '[첨부] 이름 (사유)'로 적는다.
 * - 글꼴에 없는 글자(일부 이모지 등)는 '?' 로 바꾼다(빈 네모가 찍히지 않게).
 */
public final class NotePdfRenderer {

    public record Model(String title, String subjectName, List<String[]> meta, String basis, String exportedAt,
            String noteTitle, List<JsonNode> blocks) {
    }

    /** 이미지 블록 → 넣을 바이트 또는 넣지 못한 사유 */
    public record ImageResult(byte[] bytes, String mimeType, String reason) {
        public static ImageResult skipped(String reason) {
            return new ImageResult(null, null, reason);
        }
    }

    static final float MARGIN = 50f;
    static final float BOTTOM = 56f;
    static final float WIDTH = PDRectangle.A4.getWidth() - MARGIN * 2;
    static final int MAX_IMAGES = 30;
    static final long MAX_IMAGE_BYTES = 15L * 1024 * 1024;
    static final long MAX_TOTAL_IMAGE_BYTES = 60L * 1024 * 1024;
    static final long MAX_PIXELS = 40_000_000L;

    private final PDDocument doc;
    private final PDType0Font font;
    private final Map<Integer, Boolean> glyphs = new HashMap<>();
    private PDPage page;
    private PDPageContentStream cs;
    private float y;
    private int images;
    private long imageBytes;
    private final List<String> attachments = new ArrayList<>();

    private NotePdfRenderer(PDDocument doc, PDType0Font font) {
        this.doc = doc;
        this.font = font;
    }

    public static byte[] render(Path fontPath, Model model, Function<JsonNode, ImageResult> imageOf) {
        TrueTypeCollection[] collection = new TrueTypeCollection[1];
        try (PDDocument doc = new PDDocument()) {
            PDType0Font font = loadFont(doc, fontPath, collection);
            NotePdfRenderer r = new NotePdfRenderer(doc, font);
            r.newPage();
            r.document(model, imageOf);
            r.cs.close();
            r.pageNumbers();
            PDDocumentInformation info = doc.getDocumentInformation();
            info.setTitle(model.title() + " 탐구 노트");
            info.setCreator("LearnersHigh Assessment");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            if (collection[0] != null) {
                try {
                    collection[0].close();
                } catch (IOException ignored) {
                    // 글꼴 파일 닫기 실패는 결과 PDF 와 무관
                }
            }
        }
    }

    /** TTC 는 저장이 끝날 때까지 열어 두어야 해서 holder 에 넘겨 render 가 닫는다 */
    private static PDType0Font loadFont(PDDocument doc, Path path, TrueTypeCollection[] holder) throws IOException {
        if (path.toString().toLowerCase(Locale.ROOT).endsWith(".ttc")) {
            TrueTypeCollection collection = new TrueTypeCollection(path.toFile());
            holder[0] = collection;
            TrueTypeFont[] first = new TrueTypeFont[1];
            collection.processAllFonts(ttf -> {
                if (first[0] == null) {
                    first[0] = ttf;
                }
            });
            return PDType0Font.load(doc, first[0], true);
        }
        return PDType0Font.load(doc, path.toFile());
    }

    // ---------------------------------------------------------------- 문서 구조

    private void document(Model m, Function<JsonNode, ImageResult> imageOf) throws IOException {
        text(m.title(), 20, 0, 0.1f, 8);
        text("과목: " + blankToUndecided(m.subjectName()), 11, 0, 0.3f, 2);
        for (String[] pair : m.meta()) {
            text(pair[0] + ": " + blankToUndecided(pair[1]), 11, 0, 0.3f, 2);
        }
        text(m.basis(), 10, 0, 0.45f, 2);
        text("내보낸 날짜: " + m.exportedAt(), 10, 0, 0.45f, 10);
        rule();
        text(m.noteTitle() == null || m.noteTitle().isBlank() ? "탐구 노트" : m.noteTitle(), 15, 0, 0.1f, 8);
        if (m.blocks().isEmpty()) {
            text("(저장된 노트 내용이 없어요)", 11, 0, 0.45f, 6);
        }
        int number = 0;
        for (JsonNode block : m.blocks()) {
            String type = str(block, "type");
            JsonNode attrs = block.path("attrs");
            String text = str(block, "text");
            number = "NUMBERED".equals(type) ? number + 1 : 0;
            float indent = Math.min(4, attrs.path("indent").asInt(0)) * 14f;
            switch (type) {
                case "HEADING" -> {
                    int level = Math.max(1, Math.min(3, attrs.path("level").asInt(2)));
                    y -= 4;
                    text(text, level == 1 ? 16 : level == 2 ? 14 : 12.5f, 0, 0.1f, 4);
                }
                case "BULLET" -> text("• " + text, 11, indent, 0.1f, 3);
                case "NUMBERED" -> text(number + ". " + text, 11, indent, 0.1f, 3);
                case "CHECKLIST" -> text((attrs.path("checked").asBoolean(false) ? "[x] " : "[ ] ") + text, 11, indent, 0.1f, 3);
                case "QUOTE" -> text(text, 11, 14, 0.35f, 6);
                case "CALLOUT" -> text("※ " + text, 11, 0, 0.1f, 6);
                case "TOGGLE" -> {
                    text("▸ " + text, 11, 0, 0.1f, 2);
                    if (!str(attrs, "body").isEmpty()) {
                        text(str(attrs, "body"), 11, 14, 0.25f, 6);
                    }
                }
                case "DIVIDER" -> rule();
                case "CODE" -> text(text, 10, 14, 0.2f, 6);
                case "MATH" -> text("수식: " + text, 10.5f, 0, 0.2f, 6);
                case "TABLE", "CHART" -> table(attrs.path("rows"), text);
                case "IMAGE", "FILE" -> file(type, attrs.path("file"), text, block, imageOf);
                case "LINK", "VIDEO" -> text(joinUrl(text, str(attrs, "url")), 11, 0, 0.1f, 6);
                case "MAP" -> text("장소: " + joinUrl(firstNonBlank(str(attrs, "place"), text), str(attrs, "url")), 11, 0, 0.1f, 6);
                case "RESOURCE_LINK" -> text("참고자료: " + joinUrl(firstNonBlank(str(attrs.path("resource"), "title"), text),
                        str(attrs.path("resource"), "sourceUrl")), 11, 0, 0.1f, 6);
                case "EXAM_SOURCE" -> text("대학별 기출: " + firstNonBlank(str(attrs.path("examSource"), "label"), text), 11, 0, 0.1f, 6);
                default -> text(text, 11, 0, 0.1f, 6);
            }
        }
        y -= 6;
        rule();
        text("첨부 파일", 13, 0, 0.1f, 6);
        if (attachments.isEmpty()) {
            text("없음", 11, 0, 0.45f, 4);
        } else {
            for (String line : attachments) {
                text("• " + line, 10.5f, 0, 0.2f, 2);
            }
        }
    }

    private void table(JsonNode rows, String fallback) throws IOException {
        if (!rows.isArray() || rows.isEmpty()) {
            text(fallback, 11, 0, 0.1f, 6);
            return;
        }
        boolean header = true;
        for (JsonNode row : rows) {
            List<String> cells = new ArrayList<>();
            row.forEach(cell -> cells.add(cell.isNull() ? "" : cell.asString()));
            text(String.join("  |  ", cells), 10.5f, 0, header ? 0.1f : 0.25f, 2);
            header = false;
        }
        y -= 4;
    }

    private void file(String type, JsonNode file, String text, JsonNode block, Function<JsonNode, ImageResult> imageOf) throws IOException {
        String name = str(file, "name");
        if (name.isEmpty()) {
            text("[" + ("IMAGE".equals(type) ? "이미지" : "파일") + " 없음]", 10.5f, 0, 0.45f, 6);
            return;
        }
        String mime = str(file, "mimeType");
        String kind = "IMAGE".equals(type) ? "이미지" : "application/pdf".equals(mime) ? "PDF" : "파일";
        boolean stored = !str(file, "attachmentId").isEmpty();
        String size = sizeLabel(file.path("size").asLong(0));
        attachments.add(name + " · " + kind + " · " + size + " · " + (stored ? "서버에 저장됨" : "파일 미저장(이전 첨부)"));
        ImageResult result = "IMAGE".equals(type) && stored ? imageOf.apply(block) : null;
        String reason = result == null ? (stored ? "본문에는 이름만 · 첨부 목록 참고" : "파일 미저장(이전 첨부)") : result.reason();
        if (result != null && result.bytes() != null) {
            reason = drawImage(result);
        }
        if (reason != null) {
            text("[" + kind + " 첨부] " + name + " (" + reason + ")", 10.5f, 0, 0.35f, 6);
        } else {
            text(name, 9.5f, 0, 0.45f, 8);
        }
        if (!text.isEmpty()) {
            text(text, 11, 0, 0.1f, 6);
        }
    }

    /** 넣었으면 null, 못 넣었으면 사유 */
    private String drawImage(ImageResult result) throws IOException {
        byte[] bytes = result.bytes();
        if (images >= MAX_IMAGES) {
            return "본문 이미지 " + MAX_IMAGES + "개 상한 초과 — 첨부 목록 참고";
        }
        if (bytes.length > MAX_IMAGE_BYTES || imageBytes + bytes.length > MAX_TOTAL_IMAGE_BYTES) {
            return "용량 상한 초과 — 첨부 목록 참고";
        }
        int[] size = dimensions(bytes);
        if (size == null) {
            return "이미지를 읽지 못함";
        }
        if ((long) size[0] * size[1] > MAX_PIXELS) {
            return "해상도 상한 초과 — 첨부 목록 참고";
        }
        PDImageXObject image;
        if ("image/jpeg".equals(result.mimeType())) {
            image = JPEGFactory.createFromByteArray(doc, bytes);
        } else {
            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(bytes));
            if (decoded == null) {
                return "이미지를 읽지 못함";
            }
            image = LosslessFactory.createFromImage(doc, decoded);
        }
        float scale = Math.min(1f, Math.min(WIDTH / image.getWidth(), 520f / image.getHeight()));
        float w = image.getWidth() * scale;
        float h = image.getHeight() * scale;
        ensure(h + 4);
        cs.drawImage(image, MARGIN, y - h, w, h);
        y -= h + 4;
        images++;
        imageBytes += bytes.length;
        return null;
    }

    private static int[] dimensions(byte[] bytes) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) {
                return null;
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in);
                return new int[] {reader.getWidth(0), reader.getHeight(0)};
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            return null;
        }
    }

    // ---------------------------------------------------------------- 그리기

    private void newPage() throws IOException {
        if (cs != null) {
            cs.close();
        }
        page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        cs = new PDPageContentStream(doc, page);
        y = PDRectangle.A4.getHeight() - MARGIN;
    }

    private void ensure(float height) throws IOException {
        if (y - height < BOTTOM) {
            newPage();
        }
    }

    private void rule() throws IOException {
        ensure(12);
        cs.setStrokingColor(0.85f, 0.86f, 0.88f);
        cs.setLineWidth(0.8f);
        cs.moveTo(MARGIN, y - 4);
        cs.lineTo(MARGIN + WIDTH, y - 4);
        cs.stroke();
        y -= 12;
    }

    /** 원문 글을 그대로 줄바꿈해 쓴다. gray = 글자 명도(0 검정) */
    private void text(String raw, float size, float indent, float gray, float after) throws IOException {
        String value = raw == null ? "" : raw.replace("\r", "").replace("\t", "    ");
        float leading = size * 1.5f;
        for (String paragraph : value.split("\n", -1)) {
            for (String line : wrap(safe(paragraph), size, WIDTH - indent)) {
                ensure(leading);
                cs.beginText();
                cs.setFont(font, size);
                cs.setNonStrokingColor(gray, gray, gray);
                cs.newLineAtOffset(MARGIN + indent, y - size);
                cs.showText(line);
                cs.endText();
                y -= leading;
            }
        }
        y -= after;
    }

    private List<String> wrap(String text, float size, float width) throws IOException {
        List<String> lines = new ArrayList<>();
        if (text.isEmpty()) {
            lines.add("");
            return lines;
        }
        StringBuilder line = new StringBuilder();
        for (String word : text.split("(?<= )")) {
            String candidate = line + word;
            if (width(candidate, size) <= width) {
                line.append(word);
                continue;
            }
            if (line.length() > 0) {
                lines.add(line.toString().stripTrailing());
                line.setLength(0);
            }
            if (width(word, size) <= width) {
                line.append(word);
                continue;
            }
            // 한 단어가 줄보다 길면(띄어쓰기 없는 한글·긴 주소) 글자 단위로 자른다
            int i = 0;
            while (i < word.length()) {
                int cp = word.codePointAt(i);
                String ch = new String(Character.toChars(cp));
                if (line.length() > 0 && width(line + ch, size) > width) {
                    lines.add(line.toString());
                    line.setLength(0);
                }
                line.append(ch);
                i += Character.charCount(cp);
            }
        }
        lines.add(line.toString().stripTrailing());
        return lines;
    }

    private float width(String s, float size) throws IOException {
        return font.getStringWidth(s) / 1000f * size;
    }

    /** 글꼴에 없는 글자 → '?', 제어 문자 제거 */
    String safe(String s) {
        StringBuilder out = new StringBuilder();
        s.codePoints().forEach(cp -> {
            if (Character.isISOControl(cp)) {
                return;
            }
            boolean ok = glyphs.computeIfAbsent(cp, code -> {
                try {
                    font.encode(new String(Character.toChars(code)));
                    return true;
                } catch (IllegalArgumentException | IOException e) {
                    return false;
                }
            });
            out.append(ok ? new String(Character.toChars(cp)) : "?");
        });
        return out.toString();
    }

    private void pageNumbers() throws IOException {
        int total = doc.getNumberOfPages();
        for (int i = 0; i < total; i++) {
            PDPage p = doc.getPage(i);
            try (PDPageContentStream s = new PDPageContentStream(doc, p, PDPageContentStream.AppendMode.APPEND, true, true)) {
                String label = (i + 1) + " / " + total;
                s.beginText();
                s.setFont(font, 9);
                s.setNonStrokingColor(0.5f, 0.5f, 0.5f);
                s.newLineAtOffset(MARGIN + WIDTH - width(label, 9), 30);
                s.showText(label);
                s.endText();
            }
        }
    }

    // ---------------------------------------------------------------- 값

    private static String str(JsonNode node, String field) {
        JsonNode v = node == null ? null : node.get(field);
        return v == null || v.isNull() || !v.isValueNode() ? "" : v.asString();
    }

    private static String blankToUndecided(String v) {
        return v == null || v.isBlank() ? "미정" : v;
    }

    private static String firstNonBlank(String a, String b) {
        return a != null && !a.isBlank() ? a : b == null ? "" : b;
    }

    private static String joinUrl(String text, String url) {
        if (url == null || url.isBlank()) {
            return text;
        }
        return text == null || text.isBlank() || text.equals(url) ? url : text + " (" + url + ")";
    }

    static String sizeLabel(long bytes) {
        if (bytes < 1024) {
            return bytes + "B";
        }
        if (bytes < 1024 * 1024) {
            return String.format(Locale.ROOT, "%.1fKB", bytes / 1024.0);
        }
        return String.format(Locale.ROOT, "%.1fMB", bytes / 1024.0 / 1024.0);
    }
}
