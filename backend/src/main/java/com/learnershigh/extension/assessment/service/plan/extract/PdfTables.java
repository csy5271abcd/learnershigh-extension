package com.learnershigh.extension.assessment.service.plan.extract;

import java.awt.geom.Point2D;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.contentstream.PDFGraphicsStreamEngine;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.graphics.image.PDImage;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

/**
 * PDF 표 추출 (선이 그어진 표). 쪽마다 가로·세로 선 조각을 모아 칸 경계를 만들고, 글자 위치로 칸에 넣는다.
 * 선이 없는 칸 경계(병합)는 이웃 칸을 하나로 합쳐 같은 글자를 펼친다. 외부 라이브러리 없이 PDFBox 만 쓴다.
 */
public final class PdfTables {

    private PdfTables() {
    }

    /** 문서의 모든 표. 쪽 번호는 1부터. */
    public static List<Table> read(byte[] pdf) throws IOException {
        return read(pdf, null, Long.MAX_VALUE);
    }

    /**
     * ocr 가 있으면 글자 정보가 거의 없는 쪽(스캔본)을 그림으로 읽는다(쪽 수 상한 {@link ScanOcr#MAX_PAGES}, deadline 까지).
     * 결과 표는 OCR 글자라 틀릴 수 있다 — 어차피 관리자 검토를 거친다.
     */
    public static List<Table> read(byte[] pdf, ScanOcr.Engine ocr, long deadlineNanos) throws IOException {
        List<Table> out = new ArrayList<>();
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            int n = doc.getNumberOfPages();
            List<List<float[]>> hs = new ArrayList<>(), vs = new ArrayList<>();
            List<List<Glyph>> gs = new ArrayList<>();
            List<Integer> scanned = new ArrayList<>();
            for (int p = 0; p < n; p++) {
                PDPage page = doc.getPage(p);
                Lines lines = new Lines(page);
                lines.processPage(page);
                List<Glyph> glyphs = glyphs(doc, p + 1);
                hs.add(lines.h);
                vs.add(lines.v);
                gs.add(glyphs);
                if (ocr != null && glyphs.size() < 15 && scanned.size() < ScanOcr.MAX_PAGES) {
                    scanned.add(p);
                }
            }
            if (!scanned.isEmpty()) {
                ocrPages(doc, scanned, ocr, deadlineNanos, hs, vs, gs);
            }
            String prevTail = "";
            for (int p = 0; p < n; p++) {
                List<Glyph> glyphs = gs.get(p);
                for (Table t : Grid.build(hs.get(p), vs.get(p), glyphs, p + 1)) {
                    t.ctx = (prevTail + "\n" + Grid.textAbove(glyphs, t.top)).strip();
                    if (t.ctx.length() > 400) {
                        t.ctx = t.ctx.substring(t.ctx.length() - 400);
                    }
                    out.add(t);
                }
                String all = Grid.text(glyphs);
                prevTail = all.length() > 400 ? all.substring(all.length() - 400) : all;
            }
        }
        return out;
    }

    private static void ocrPages(PDDocument doc, List<Integer> pages, ScanOcr.Engine ocr, long deadlineNanos,
            List<List<float[]>> hs, List<List<float[]>> vs, List<List<Glyph>> gs) throws IOException {
        java.nio.file.Path dir = java.nio.file.Files.createTempDirectory("lh-scan");
        try {
            List<java.nio.file.Path> images = new ArrayList<>();
            List<java.awt.image.BufferedImage> rendered = new ArrayList<>();
            for (int p : pages) {
                if (System.nanoTime() > deadlineNanos) {
                    break;
                }
                java.awt.image.BufferedImage img = ScanOcr.render(doc, p);
                rendered.add(img);
                images.add(ScanOcr.png(img, dir, p + 1));
            }
            List<List<ScanOcr.Word>> words = ocr.words(images, deadlineNanos);
            for (int i = 0; i < rendered.size() && i < words.size(); i++) {
                ScanOcr.PageScan s = ScanOcr.scan(rendered.get(i), words.get(i));
                int p = pages.get(i);
                hs.set(p, s.h());
                vs.set(p, s.v());
                gs.set(p, s.glyphs());
            }
        } finally {
            try (var files = java.nio.file.Files.list(dir)) {
                for (java.nio.file.Path f : files.toList()) {
                    java.nio.file.Files.deleteIfExists(f);
                }
            }
            java.nio.file.Files.deleteIfExists(dir);
        }
    }

    /** 쪽 글자 수 (스캔본 판단용). */
    public static int textLength(byte[] pdf, int maxPages) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            PDFTextStripper s = new PDFTextStripper();
            s.setStartPage(1);
            s.setEndPage(Math.min(maxPages, doc.getNumberOfPages()));
            return s.getText(doc).strip().length();
        }
    }

    record Glyph(float x, float y, float w, float h, String text) {
    }

    private static List<Glyph> glyphs(PDDocument doc, int pageNo) throws IOException {
        List<Glyph> out = new ArrayList<>();
        PDFTextStripper s = new PDFTextStripper() {
            @Override
            protected void writeString(String text, List<TextPosition> positions) {
                for (TextPosition t : positions) {
                    String u = t.getUnicode() == null ? "" : t.getUnicode().replaceAll("\\p{Cntrl}", "");   // 글꼴의 NUL 등 제어 문자
                    if (!u.isEmpty() && (!u.isBlank() || u.equals(" "))) {
                        out.add(new Glyph(t.getXDirAdj(), t.getYDirAdj() - t.getHeightDir(), t.getWidthDirAdj(),
                                t.getHeightDir(), u));
                    }
                }
            }
        };
        s.setSortByPosition(true);
        s.setStartPage(pageNo);
        s.setEndPage(pageNo);
        s.getText(doc);
        return out;
    }

    /** 가로·세로 선 조각 수집 (선 그리기와 얇은 사각형 채우기 모두). 좌표는 위가 0인 쪽 좌표로 바꾼다. */
    private static final class Lines extends PDFGraphicsStreamEngine {
        final List<float[]> h = new ArrayList<>();   // {y, x0, x1}
        final List<float[]> v = new ArrayList<>();   // {x, y0, y1}
        private final List<float[]> path = new ArrayList<>();
        private final float pageH;
        private Point2D cur = new Point2D.Float();

        Lines(PDPage page) {
            super(page);
            this.pageH = page.getCropBox().getHeight();
        }

        private void seg(double x0, double y0, double x1, double y1) {
            path.add(new float[] {(float) x0, (float) (pageH - y0), (float) x1, (float) (pageH - y1)});
        }

        @Override
        public void appendRectangle(Point2D p0, Point2D p1, Point2D p2, Point2D p3) {
            seg(p0.getX(), p0.getY(), p1.getX(), p1.getY());
            seg(p1.getX(), p1.getY(), p2.getX(), p2.getY());
            seg(p2.getX(), p2.getY(), p3.getX(), p3.getY());
            seg(p3.getX(), p3.getY(), p0.getX(), p0.getY());
        }

        @Override
        public void moveTo(float x, float y) {
            cur = new Point2D.Float(x, y);
        }

        @Override
        public void lineTo(float x, float y) {
            seg(cur.getX(), cur.getY(), x, y);
            cur = new Point2D.Float(x, y);
        }

        @Override
        public void curveTo(float x1, float y1, float x2, float y2, float x3, float y3) {
            cur = new Point2D.Float(x3, y3);
        }

        @Override
        public Point2D getCurrentPoint() {
            return cur;
        }

        @Override
        public void closePath() {
        }

        @Override
        public void endPath() {
            path.clear();
        }

        @Override
        public void strokePath() {
            flush();
        }

        @Override
        public void fillPath(int windingRule) {
            flush();
        }

        @Override
        public void fillAndStrokePath(int windingRule) {
            flush();
        }

        private void flush() {
            for (float[] s : path) {
                float x0 = s[0], y0 = s[1], x1 = s[2], y1 = s[3];
                if (Math.abs(y0 - y1) < 1.5f && Math.abs(x1 - x0) > 3) {
                    h.add(new float[] {(y0 + y1) / 2, Math.min(x0, x1), Math.max(x0, x1)});
                } else if (Math.abs(x0 - x1) < 1.5f && Math.abs(y1 - y0) > 3) {
                    v.add(new float[] {(x0 + x1) / 2, Math.min(y0, y1), Math.max(y0, y1)});
                }
            }
            // 얇은 채운 사각형(선 대신 쓰는 경우): 네 변 중 짧은 변이 1.5pt 미만이면 위에서 이미 선으로 들어간다
            path.clear();
        }

        @Override
        public void clip(int windingRule) {
            path.clear();
        }

        @Override
        public void drawImage(PDImage pdImage) {
        }

        @Override
        public void shadingFill(COSName shadingName) {
        }
    }

    /** 추출한 표 하나. cells[r][c] 는 병합 칸이면 같은 글자를 펼친 값. */
    public static final class Table {
        public final int page;
        public final List<List<String>> cells;
        public final float top;
        public String ctx = "";

        Table(int page, List<List<String>> cells, float top) {
            this.page = page;
            this.cells = cells;
            this.top = top;
        }
    }

    /** 선 조각 → 칸 격자. */
    static final class Grid {

        static List<Table> build(List<float[]> h, List<float[]> v, List<Glyph> glyphs, int page) {
            List<Table> out = new ArrayList<>();
            if (h.size() < 2 || v.size() < 2) {
                return out;
            }
            // 선을 1pt 격자에 찍고(2pt 두께로) 이어진 덩어리 = 표 하나. 계산량은 쪽 크기에만 비례한다
            List<float[][]> all = new ArrayList<>();
            for (float[] s : h) {
                all.add(new float[][] {{s[1], s[0], s[2], s[0]}});
            }
            for (float[] s : v) {
                all.add(new float[][] {{s[0], s[1], s[0], s[2]}});
            }
            int n = all.size();
            int W = 1, H = 1;
            for (float[][] a : all) {
                W = Math.max(W, (int) Math.ceil(Math.max(a[0][0], a[0][2])) + 4);
                H = Math.max(H, (int) Math.ceil(Math.max(a[0][1], a[0][3])) + 4);
            }
            if ((long) W * H > 20_000_000L) {
                return out;   // 비정상적으로 큰 쪽
            }
            int[] label = new int[W * H];
            for (float[][] a : all) {
                int x0 = Math.max(0, (int) Math.floor(Math.min(a[0][0], a[0][2])) - 2), x1 = Math.min(W - 1, (int) Math.ceil(Math.max(a[0][0], a[0][2])) + 2);
                int y0 = Math.max(0, (int) Math.floor(Math.min(a[0][1], a[0][3])) - 2), y1 = Math.min(H - 1, (int) Math.ceil(Math.max(a[0][1], a[0][3])) + 2);
                for (int y = y0; y <= y1; y++) {
                    for (int x = x0; x <= x1; x++) {
                        label[y * W + x] = -1;
                    }
                }
            }
            int comp = 0;
            int[] stack = new int[W * H];
            for (int i = 0; i < label.length; i++) {
                if (label[i] != -1) {
                    continue;
                }
                comp++;
                int top = 0;
                stack[top++] = i;
                label[i] = comp;
                while (top > 0) {
                    int q = stack[--top];
                    int qx = q % W, qy = q / W;
                    int[] nb = {qx > 0 ? q - 1 : -1, qx < W - 1 ? q + 1 : -1, qy > 0 ? q - W : -1, qy < H - 1 ? q + W : -1};
                    for (int m : nb) {
                        if (m >= 0 && label[m] == -1) {
                            label[m] = comp;
                            stack[top++] = m;
                        }
                    }
                }
            }
            java.util.Map<Integer, List<Integer>> groups = new java.util.TreeMap<>();
            for (int i = 0; i < n; i++) {
                float[] s = all.get(i)[0];
                int cx = Math.min(W - 1, Math.max(0, Math.round((s[0] + s[2]) / 2)));
                int cy = Math.min(H - 1, Math.max(0, Math.round((s[1] + s[3]) / 2)));
                groups.computeIfAbsent(label[cy * W + cx], k -> new ArrayList<>()).add(i);
            }
            for (List<Integer> g : groups.values()) {
                List<float[]> gh = new ArrayList<>();
                List<float[]> gv = new ArrayList<>();
                for (int i : g) {
                    float[] s = all.get(i)[0];
                    if (s[1] == s[3]) {
                        gh.add(new float[] {s[1], s[0], s[2]});
                    } else {
                        gv.add(new float[] {s[0], s[1], s[3]});
                    }
                }
                Table t = one(gh, gv, glyphs, page);
                if (t != null) {
                    out.add(t);
                }
            }
            out.sort(Comparator.comparingDouble(t -> t.top));
            return out;
        }

        private static int find(int[] p, int i) {
            while (p[i] != i) {
                p[i] = p[p[i]];
                i = p[i];
            }
            return i;
        }

        private static List<Float> positions(List<Float> raw) {
            raw.sort(Float::compare);
            List<Float> out = new ArrayList<>();
            for (float x : raw) {
                if (out.isEmpty() || x - out.get(out.size() - 1) > 2.5f) {
                    out.add(x);
                }
            }
            return out;
        }

        private static Table one(List<float[]> h, List<float[]> v, List<Glyph> glyphs, int page) {
            List<Float> ys = positions(new ArrayList<>(h.stream().map(s -> s[0]).toList()));
            List<Float> xs = positions(new ArrayList<>(v.stream().map(s -> s[0]).toList()));
            if (ys.size() < 2 || xs.size() < 2) {
                return null;
            }
            int rows = ys.size() - 1, cols = xs.size() - 1;
            if (rows * cols < 2 || cols > 40 || rows * cols > 3000) {
                return null;   // 모눈·그래프 같은 격자 그림 (평가표는 많아야 20열 남짓)
            }
            // 칸 사이 경계선 유무 → 병합 묶음
            int[] parent = new int[rows * cols];
            for (int i = 0; i < parent.length; i++) {
                parent[i] = i;
            }
            for (int r = 0; r < rows; r++) {
                for (int c = 0; c < cols; c++) {
                    float cy = (ys.get(r) + ys.get(r + 1)) / 2;
                    float cx = (xs.get(c) + xs.get(c + 1)) / 2;
                    if (c > 0 && !covered(v, xs.get(c), ys.get(r), ys.get(r + 1))) {
                        parent[find(parent, r * cols + c)] = find(parent, r * cols + c - 1);
                    }
                    if (r > 0 && !covered(h, ys.get(r), xs.get(c), xs.get(c + 1))) {
                        parent[find(parent, r * cols + c)] = find(parent, (r - 1) * cols + c);
                    }
                }
            }
            // 칸마다 글자를 모은 뒤, 같은 줄(높이 절반 이내)끼리 왼쪽부터 · 줄은 위에서부터 잇는다
            List<List<Glyph>> bucket = new ArrayList<>();
            for (int i = 0; i < rows * cols; i++) {
                bucket.add(new ArrayList<>());
            }
            for (Glyph g : glyphs) {
                float cx = g.x() + g.w() / 2, cy = g.y() + g.h() / 2;
                int r = index(ys, cy), c = index(xs, cx);
                if (r >= 0 && c >= 0) {
                    bucket.get(find(parent, r * cols + c)).add(g);
                }
            }
            String[] text = new String[rows * cols];
            for (int k = 0; k < bucket.size(); k++) {
                if (!bucket.get(k).isEmpty()) {
                    text[k] = join(bucket.get(k));
                }
            }
            List<List<String>> cells = new ArrayList<>();
            int filled = 0;
            for (int r = 0; r < rows; r++) {
                List<String> row = new ArrayList<>();
                for (int c = 0; c < cols; c++) {
                    String t = text[find(parent, r * cols + c)];
                    String s = t == null ? "" : t.replaceAll("\\s+", " ").strip();
                    if (!s.isEmpty()) {
                        filled++;
                    }
                    row.add(s);
                }
                cells.add(row);
            }
            // 장식 선·글 상자: 글자가 든 칸이 2개 미만이면 표가 아니다
            return filled >= 2 ? new Table(page, cells, ys.get(0)) : null;
        }

        /** 칸 안 글자: 줄(높이 절반 이내) 단위로 묶어 왼쪽부터, 줄은 위에서부터. 간격이 넓으면 띄어 쓴다. */
        static String join(List<Glyph> gs) {
            List<Glyph> sorted = new ArrayList<>(gs);
            sorted.sort(Comparator.comparingDouble(Glyph::y));
            List<List<Glyph>> lines = new ArrayList<>();
            float base = Float.NaN;
            for (Glyph g : sorted) {
                if (lines.isEmpty() || Math.abs(g.y() - base) > g.h() * 0.5f) {
                    lines.add(new ArrayList<>());
                    base = g.y();
                }
                lines.get(lines.size() - 1).add(g);
            }
            StringBuilder sb = new StringBuilder();
            for (List<Glyph> line : lines) {
                line.sort(Comparator.comparingDouble(Glyph::x));
                if (sb.length() > 0) {
                    sb.append(' ');
                }
                float lastEnd = Float.NaN;
                for (Glyph g : line) {
                    if (!Float.isNaN(lastEnd) && g.x() - lastEnd > Math.max(1.0f, g.w() * 0.3f)) {
                        sb.append(' ');
                    }
                    sb.append(g.text());
                    lastEnd = g.x() + g.w();
                }
            }
            return sb.toString();
        }

        private static boolean covered(List<float[]> lines, float at, float from, float to) {
            float need = (to - from) * 0.6f, got = 0;
            for (float[] s : lines) {
                if (Math.abs(s[0] - at) <= 2.5f) {
                    got += Math.max(0, Math.min(s[2], to) - Math.max(s[1], from));
                }
            }
            return got >= need;
        }

        private static int index(List<Float> edges, float v) {
            for (int i = 0; i + 1 < edges.size(); i++) {
                if (v >= edges.get(i) && v < edges.get(i + 1)) {
                    return i;
                }
            }
            return -1;
        }

        static String text(List<Glyph> glyphs) {
            StringBuilder sb = new StringBuilder();
            float lastY = -1;
            for (Glyph g : glyphs) {
                if (lastY >= 0 && Math.abs(g.y() - lastY) > g.h() * 0.5f) {
                    sb.append('\n');
                }
                sb.append(g.text());
                lastY = g.y();
            }
            return sb.toString();
        }

        static String textAbove(List<Glyph> glyphs, float top) {
            return text(glyphs.stream().filter(g -> g.y() + g.h() <= top + 1).toList());
        }
    }
}
