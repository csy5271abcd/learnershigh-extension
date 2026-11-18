package com.learnershigh.extension.assessment.service.plan.extract;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 스캔본(글자 정보가 없는 PDF 쪽) 읽기: 쪽을 그림으로 그려 표 선을 찾고, OCR 단어를 칸에 넣는다.
 * 표 칸 묶기는 {@link PdfTables.Grid} 를 그대로 쓴다(선 조각 + 글자 위치 → 칸).
 * OCR 엔진은 외부 프로그램을 부른다 — Windows 내장 OCR(설치 불필요) 또는 Tesseract(kor). 둘 다 없으면 스캔 쪽은 건너뛴다.
 */
public final class ScanOcr {

    private static final Logger log = LoggerFactory.getLogger(ScanOcr.class);
    static final float DPI = 200f;
    static final int MAX_PAGES = 80;

    private ScanOcr() {
    }

    public record Word(int x, int y, int w, int h, String text) {
    }

    /** 그림 여러 장 → 그림마다 단어 목록. */
    public interface Engine {
        String name();

        List<List<Word>> words(List<Path> images, long deadlineNanos) throws IOException;
    }

    /** 설정값 auto · windows · tesseract · none. auto: Tesseract 가 있으면 Tesseract, Windows 면 내장 OCR, 아니면 없음. */
    public static Engine engine(String mode) {
        String m = mode == null ? "auto" : mode.strip().toLowerCase();
        boolean windows = System.getProperty("os.name", "").toLowerCase().contains("win");
        return switch (m) {
            case "none" -> null;
            case "windows" -> windows ? new WindowsOcr() : null;
            case "tesseract" -> new TesseractOcr();
            default -> TesseractOcr.available() ? new TesseractOcr() : windows ? new WindowsOcr() : null;
        };
    }

    /** 쪽 하나를 그림으로 그려 선 조각과 OCR 단어(쪽 좌표)로 바꾼다. */
    record PageScan(List<float[]> h, List<float[]> v, List<PdfTables.Glyph> glyphs) {
    }

    static BufferedImage render(PDDocument doc, int pageIndex) throws IOException {
        return new PDFRenderer(doc).renderImageWithDPI(pageIndex, DPI, ImageType.GRAY);
    }

    static PageScan scan(BufferedImage img, List<Word> words) {
        float k = 72f / DPI;   // 그림 픽셀 → 쪽 좌표
        int w = img.getWidth(), h = img.getHeight();
        boolean[][] dark = new boolean[h][w];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                dark[y][x] = (img.getRaster().getSample(x, y, 0)) < 160;
            }
        }
        int minH = Math.max(40, w / 40), minV = Math.max(40, h / 60);   // 글자 획(약 30px)보다 길어야 선
        // 스캔 선은 끊기거나 흐리다: 3픽셀까지 끊김은 이어 본다
        List<float[]> hs = new ArrayList<>(), vs = new ArrayList<>();
        for (int y = 0; y < h; y++) {
            int start = -1, last = -10;
            for (int x = 0; x <= w; x++) {
                if (x < w && dark[y][x]) {
                    if (x - last > 4) {
                        if (start >= 0 && last - start + 1 >= minH) {
                            hs.add(new float[] {y * k, start * k, (last + 1) * k});
                        }
                        start = x;
                    }
                    last = x;
                }
            }
            if (start >= 0 && last - start + 1 >= minH) {
                hs.add(new float[] {y * k, start * k, (last + 1) * k});
            }
        }
        for (int x = 0; x < w; x++) {
            int start = -1, last = -10;
            for (int y = 0; y <= h; y++) {
                if (y < h && dark[y][x]) {
                    if (y - last > 4) {
                        if (start >= 0 && last - start + 1 >= minV) {
                            vs.add(new float[] {x * k, start * k, (last + 1) * k});
                        }
                        start = y;
                    }
                    last = y;
                }
            }
            if (start >= 0 && last - start + 1 >= minV) {
                vs.add(new float[] {x * k, start * k, (last + 1) * k});
            }
        }
        List<PdfTables.Glyph> glyphs = new ArrayList<>();
        for (Word wd : words) {
            if (!wd.text().isBlank()) {
                glyphs.add(new PdfTables.Glyph(wd.x() * k, wd.y() * k, wd.w() * k, wd.h() * k, fix(wd.text())));
            }
        }
        return new PageScan(hs, vs, glyphs);
    }

    /** 평가계획서 표 머리에서 자주 틀리는 OCR 글자 (실측: 인명여고·명신여고 스캔본). */
    static String fix(String s) {
        return s.replaceAll("([1-4])자(시험|고사)", "$1차$2")
                .replace("반영비윤", "반영비율").replace("성쥐", "성취").replace("단원영", "단원명")
                .replaceAll("^기라$", "기타").replaceAll("\\((96|3,6|9b)\\)", "(%)")
                .replaceAll("(?<=\\d)96$", "%")
                // 로마 숫자 Ⅱ 를 '기'·'21' 로 읽는 경우 (공통국어기 → 공통국어2)
                .replaceAll("(공통국어|공통영어|공통수학|통합사회|통합과학|한국사|과학탐구실험)(기|21|Il|II)(?![가-힣0-9])", "$12");
    }

    static Path png(BufferedImage img, Path dir, int page) throws IOException {
        Path p = dir.resolve("p" + page + ".png");
        ImageIO.write(img, "png", p.toFile());
        return p;
    }

    /** Windows 내장 OCR (Windows.Media.Ocr, 한국어) — PowerShell 한 번에 여러 쪽. */
    static final class WindowsOcr implements Engine {
        @Override
        public String name() {
            return "windows";
        }

        @Override
        public List<List<Word>> words(List<Path> images, long deadlineNanos) throws IOException {
            Path script = Files.createTempFile("lh-ocr", ".ps1");
            try (InputStream in = ScanOcr.class.getResourceAsStream("/assessment/ocr_win.ps1")) {
                if (in == null) {
                    return List.of();
                }
                Files.write(script, in.readAllBytes());
                List<String> cmd = new ArrayList<>(List.of("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script.toString()));
                images.forEach(p -> cmd.add(p.toString()));
                ProcessBuilder pb = new ProcessBuilder(cmd).redirectErrorStream(false);
                pb.environment().put("OCR_WORDS", "1");
                String out = run(pb, deadlineNanos);
                List<List<Word>> res = new ArrayList<>();
                images.forEach(p -> res.add(new ArrayList<>()));
                int cur = -1;
                for (String line : out.split("\\R")) {
                    if (line.startsWith("===FILE ")) {
                        cur++;
                    } else if (line.startsWith("W ") && cur >= 0 && cur < res.size()) {
                        String[] f = line.split(" ", 6);
                        if (f.length == 6) {
                            res.get(cur).add(new Word(Integer.parseInt(f[1]), Integer.parseInt(f[2]), Integer.parseInt(f[3]),
                                    Integer.parseInt(f[4]), f[5]));
                        }
                    }
                }
                return res;
            } finally {
                Files.deleteIfExists(script);
            }
        }
    }

    /** Tesseract CLI (tesseract img stdout -l kor tsv). Linux 서버용. */
    static final class TesseractOcr implements Engine {
        static boolean available() {
            try {
                Process p = new ProcessBuilder("tesseract", "--version").redirectErrorStream(true).start();
                p.getInputStream().readAllBytes();
                return p.waitFor(10, TimeUnit.SECONDS) && p.exitValue() == 0;
            } catch (IOException | InterruptedException e) {
                return false;
            }
        }

        @Override
        public String name() {
            return "tesseract";
        }

        @Override
        public List<List<Word>> words(List<Path> images, long deadlineNanos) throws IOException {
            List<List<Word>> res = new ArrayList<>();
            for (Path img : images) {
                List<Word> ws = new ArrayList<>();
                if (System.nanoTime() < deadlineNanos) {
                    String out = run(new ProcessBuilder("tesseract", img.toString(), "stdout", "-l", "kor", "--psm", "11", "tsv"), deadlineNanos);
                    for (String line : out.split("\\R")) {
                        String[] f = line.split("\t");
                        if (f.length == 12 && f[0].equals("5") && !f[11].isBlank()) {
                            ws.add(new Word(Integer.parseInt(f[6]), Integer.parseInt(f[7]), Integer.parseInt(f[8]), Integer.parseInt(f[9]), f[11]));
                        }
                    }
                }
                res.add(ws);
            }
            return res;
        }
    }

    private static String run(ProcessBuilder pb, long deadlineNanos) throws IOException {
        Process p = pb.start();
        byte[][] out = new byte[1][];
        Thread reader = new Thread(() -> {
            try {
                out[0] = p.getInputStream().readAllBytes();
            } catch (IOException e) {
                out[0] = new byte[0];
            }
        });
        reader.start();
        try {
            long left = Math.max(1, deadlineNanos - System.nanoTime());
            if (!p.waitFor(left, TimeUnit.NANOSECONDS)) {
                p.destroyForcibly();
                log.warn("ocr timed out");
            }
            reader.join(5000);
        } catch (InterruptedException e) {
            p.destroyForcibly();
            Thread.currentThread().interrupt();
        }
        return out[0] == null ? "" : new String(out[0], StandardCharsets.UTF_8);
    }
}
