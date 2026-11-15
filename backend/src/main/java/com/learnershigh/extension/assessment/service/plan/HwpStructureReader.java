package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Block;
import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Cell;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.DataFormatException;
import java.util.zip.Inflater;

/**
 * HWP 5.x 원본 → 문단·표 구조 (A10 §38-6). 표준 JDK만 쓴다(외부 라이브러리·변환 프로그램 없음).
 *
 * <p>OLE 복합 문서(CFB)에서 {@code FileHeader}와 {@code BodyText/Section<n>}을 읽고, 압축이면 raw deflate를 푼 뒤
 * 레코드 나무를 따라간다. 위치(path) 규칙은 분석 결과 {@code documentLocator}와 같다:
 * 최상위 문단 {@code p<n>}, 문단 안 n번째 컨트롤 {@code .c<k>}, 표 칸 {@code .r<row>c<col>}, 칸 안 문단 {@code .p<m>},
 * 표 캡션 {@code .cap.p<m>}, 표가 아닌 컨트롤(글상자 등) 안 문단 {@code .x<m>}(CONTROL_TEXT, 칸 좌표 없음).
 *
 * <p>레코드 배치(HWP 5.0 공개 문서 형식): PARA_HEADER(66) level L → PARA_TEXT(67)·CTRL_HEADER(71) level L+1,
 * 표 CTRL_HEADER('tbl ') → TABLE(77)(offset 4: 행·열 수) + 칸마다 LIST_HEADER(72)(u16 문단 수, offset 8: col·row·colSpan·rowSpan)
 * 와 그 뒤 칸 문단(PARA_HEADER, LIST_HEADER와 같은 level).
 */
final class HwpStructureReader {

    static final String NAME = "hwp-structure";
    static final String VERSION = "1.0";

    private static final int PARA_HEADER = 66;
    private static final int PARA_TEXT = 67;
    private static final int CTRL_HEADER = 71;
    private static final int LIST_HEADER = 72;
    private static final int TABLE = 77;
    private static final Pattern SECTION = Pattern.compile("BodyText/Section(\\d+)");
    /** 8 code unit을 차지하는 확장·인라인 컨트롤 문자. 9(탭)만 글자로 남긴다. */
    private static final Set<Integer> EXT_CTRL = Set.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20,
            21, 22, 23);

    record Result(List<Block> blocks, int sections, List<String> notices) {
    }

    private HwpStructureReader() {
    }

    static Result read(byte[] data, StructureBudget budget) {
        try {
            Cfb cfb = new Cfb(data, budget);
            byte[] header = cfb.read("FileHeader");
            if (header.length < 40) {
                throw StructureBudget.parseFailed("short FileHeader");
            }
            int props = le32(header, 36);
            boolean compressed = (props & 1) != 0;
            if ((props & 2) != 0 || (props & 4) != 0) {
                throw new StructureBudget.Failure("protected", "password or distribution document");
            }
            List<Map.Entry<Integer, String>> sections = new ArrayList<>();
            for (String path : cfb.paths.keySet()) {
                Matcher m = SECTION.matcher(path);
                if (m.matches() && m.group(1).length() <= 6) {
                    sections.add(Map.entry(Integer.parseInt(m.group(1)), path));
                }
            }
            sections.sort(Map.Entry.comparingByKey());
            List<Block> blocks = new ArrayList<>();
            List<String> notices = new ArrayList<>();
            int tableNo = 0;
            for (int si = 0; si < sections.size(); si++) {
                byte[] body = cfb.read(sections.get(si).getValue());
                if (compressed) {
                    body = inflate(body, budget);
                }
                Parser parser = new Parser(records(body, budget), si, tableNo, budget);
                blocks.addAll(parser.run());
                tableNo = parser.tableNo;
                notices.addAll(parser.problems);
            }
            return new Result(blocks, sections.size(), notices);
        } catch (StructureBudget.Failure failure) {
            throw failure;
        } catch (RuntimeException broken) {
            // 범위 밖 읽기·잘못된 길이 등 손상 문서: 원인 문장은 내보내지 않는다
            throw StructureBudget.parseFailed(broken.getClass().getSimpleName());
        }
    }

    private static byte[] inflate(byte[] input, StructureBudget budget) {
        Inflater inflater = new Inflater(true);
        try {
            inflater.setInput(input);
            ByteArrayOutputStream out = new ByteArrayOutputStream(Math.max(1024, input.length * 4));
            byte[] buffer = new byte[64 * 1024];
            while (!inflater.finished()) {
                int n = inflater.inflate(buffer);
                if (n == 0) {
                    if (inflater.needsInput() || inflater.needsDictionary()) {
                        break; // 끝이 잘린 압축 스트림: 읽은 만큼만 쓴다(분석기 판독과 같은 범위를 넘지 않는다)
                    }
                }
                out.write(buffer, 0, n);
                budget.inflated(n);
                budget.tick();
            }
            return out.toByteArray();
        } catch (DataFormatException broken) {
            throw StructureBudget.parseFailed("deflate");
        } finally {
            inflater.end();
        }
    }

    /** (tag, level, payload). 크기 0xFFF는 다음 4바이트가 실제 크기다. 남은 바이트보다 크면 남은 만큼만. */
    record Rec(int tag, int level, byte[] body) {
    }

    static List<Rec> records(byte[] body, StructureBudget budget) {
        List<Rec> out = new ArrayList<>();
        int o = 0;
        while (o + 4 <= body.length) {
            int h = le32(body, o);
            o += 4;
            int tag = h & 0x3FF;
            int level = (h >>> 10) & 0x3FF;
            long size = (h >>> 20) & 0xFFF;
            if (size == 0xFFF) {
                if (o + 4 > body.length) {
                    break;
                }
                size = le32(body, o) & 0xFFFFFFFFL;
                o += 4;
            }
            int end = (int) Math.min(body.length, o + size);
            byte[] payload = new byte[end - o];
            System.arraycopy(body, o, payload, 0, payload.length);
            out.add(new Rec(tag, level, payload));
            o = end;
            if ((out.size() & 1023) == 0) {
                budget.tick();
            }
        }
        return out;
    }

    /** 문단 글자: UTF-16LE. 확장·인라인 컨트롤은 8 unit을 건너뛰고(탭은 \t), 10·13은 줄바꿈, 32 미만 나머지는 버린다. */
    static String paraText(byte[] b) {
        StringBuilder out = new StringBuilder();
        int n = b.length / 2;
        int i = 0;
        while (i < n) {
            int c = le16(b, i * 2);
            if (EXT_CTRL.contains(c)) {
                if (c == 9) {
                    out.append('\t');
                }
                i += 8;
                continue;
            }
            if (c == 10 || c == 13) {
                out.append('\n');
            } else if (c >= 32) {
                out.append((char) c);
            }
            i++;
        }
        return replaceLoneSurrogates(out);
    }

    private static String replaceLoneSurrogates(CharSequence s) {
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isHighSurrogate(c) && i + 1 < s.length() && Character.isLowSurrogate(s.charAt(i + 1))) {
                out.append(c).append(s.charAt(++i));
            } else if (Character.isSurrogate(c)) {
                out.append('�');
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    /** 레코드 나무 → 블록. 분석기의 HWP DocumentModel과 같은 순서·위치 규칙. */
    private static final class Parser {
        private final List<Rec> r;
        private final int sec;
        private final StructureBudget budget;
        int tableNo;
        final List<String> problems = new ArrayList<>();

        Parser(List<Rec> records, int section, int tableNo, StructureBudget budget) {
            this.r = records;
            this.sec = section;
            this.tableNo = tableNo;
            this.budget = budget;
        }

        int subtreeEnd(int i) {
            int lvl = r.get(i).level();
            int j = i + 1;
            while (j < r.size() && r.get(j).level() > lvl) {
                j++;
            }
            return j;
        }

        record Para(Block block, int next) {
        }

        record Ctx(int table, int row, int col, int rowSpan, int colSpan) {
        }

        Para paragraph(int i, String path, Ctx cell, String control, int depth) {
            budget.depth(depth);
            budget.node();
            budget.paragraphs++;
            int lvl = r.get(i).level();
            int end = subtreeEnd(i);
            StringBuilder text = new StringBuilder();
            List<Block> blocks = new ArrayList<>();
            int ci = 0;
            int j = i + 1;
            while (j < end) {
                Rec rec = r.get(j);
                if (rec.tag() == PARA_TEXT && rec.level() == lvl + 1) {
                    text.append(paraText(rec.body()));
                    j++;
                } else if (rec.tag() == CTRL_HEADER && rec.level() == lvl + 1) {
                    int cend = subtreeEnd(j);
                    String cid = controlId(rec.body());
                    if (cid.equals("tbl ")) {
                        blocks.add(table(j, cend, path + ".c" + ci, depth + 1));
                    } else {
                        blocks.addAll(controlText(j, cend, path + ".c" + ci, cid.strip(), depth + 1));
                    }
                    ci++;
                    j = cend;
                } else {
                    j++;
                }
            }
            String kind = control != null ? "CONTROL_TEXT" : cell != null ? "HWP_TABLE_CELL" : "HWP_PARAGRAPH";
            String value = strip(text);
            budget.text(value.length());
            return new Para(Block.paragraph(sec, path, kind, value, control, blocks), end);
        }

        List<Block> controlText(int i, int end, String path, String control, int depth) {
            List<Block> out = new ArrayList<>();
            int j = i + 1;
            int k = 0;
            while (j < end) {
                if (r.get(j).tag() == PARA_HEADER) {
                    Para p = paragraph(j, path + ".x" + k, null, control, depth);
                    out.add(p.block());
                    k++;
                    j = p.next();
                } else {
                    j++;
                }
            }
            return out;
        }

        Block table(int i, int end, String path, int depth) {
            budget.depth(depth);
            budget.node();
            budget.tables++;
            int tno = tableNo++;
            Integer rows = null;
            Integer cols = null;
            List<Cell> cells = new ArrayList<>();
            List<Block> caption = new ArrayList<>();
            int j = i + 1;
            while (j < end) {
                Rec rec = r.get(j);
                int l = rec.level();
                byte[] b = rec.body();
                if (rec.tag() == TABLE && rows == null && b.length >= 8) {
                    rows = le16(b, 4);
                    cols = le16(b, 6);
                    j++;
                } else if (rec.tag() == LIST_HEADER && rows == null) {
                    // TABLE 앞의 LIST_HEADER는 캡션 — 칸 좌표가 없으므로 CONTROL_TEXT(caption)
                    int npara = b.length >= 2 ? le16(b, 0) : 0;
                    int k = j + 1;
                    while (k < end && caption.size() < npara) {
                        if (r.get(k).tag() == PARA_HEADER && r.get(k).level() == l) {
                            Para p = paragraph(k, path + ".cap.p" + caption.size(), null, "caption", depth + 1);
                            caption.add(p.block());
                            k = p.next();
                        } else if (r.get(k).level() < l) {
                            break;
                        } else {
                            k++;
                        }
                    }
                    j = k;
                } else if (rec.tag() == LIST_HEADER && b.length >= 16) {
                    int npara = le16(b, 0);
                    int col = le16(b, 8);
                    int row = le16(b, 10);
                    int colSpan = le16(b, 12);
                    int rowSpan = le16(b, 14);
                    String cpath = path + ".r" + row + "c" + col;
                    Ctx ctx = new Ctx(tno, row, col, rowSpan, colSpan);
                    List<Block> paras = new ArrayList<>();
                    int k = j + 1;
                    while (k < end && paras.size() < npara) {
                        if (r.get(k).tag() == PARA_HEADER && r.get(k).level() == l) {
                            Para p = paragraph(k, cpath + ".p" + paras.size(), ctx, null, depth + 1);
                            paras.add(p.block());
                            k = p.next();
                        } else if (r.get(k).level() < l) {
                            break;
                        } else {
                            k++;
                        }
                    }
                    if (paras.size() != npara) {
                        problems.add("표 " + tno + " (" + row + "," + col + ") 칸의 문단 수가 선언(" + npara + ")과 달라요("
                                + paras.size() + ").");
                    }
                    budget.cells++;
                    budget.node();
                    cells.add(new Cell(row, col, Math.max(1, rowSpan), Math.max(1, colSpan), cpath, paras));
                    j = k;
                } else {
                    j++;
                }
            }
            return Block.table(sec, path, tno, rows, cols, cells, caption);
        }

        List<Block> run() {
            List<Block> blocks = new ArrayList<>();
            int i = 0;
            int n = 0;
            while (i < r.size()) {
                if (r.get(i).tag() == PARA_HEADER && r.get(i).level() == 0) {
                    Para p = paragraph(i, "p" + n, null, null, 0);
                    blocks.add(p.block());
                    n++;
                    i = p.next();
                } else {
                    i++;
                }
            }
            return blocks;
        }
    }

    /**
     * 앞뒤 공백 제거. 분석기(Python str.strip)와 같은 공백 정의: Java 공백 + 줄바꿈 없는 공백(U+00A0·U+2007·U+202F)·U+0085.
     * 코퍼스 대조에서 끝의 U+00A0 하나 때문에 글자가 달라지는 것을 확인해 맞췄다.
     */
    static String strip(CharSequence s) {
        int begin = 0;
        int end = s.length();
        while (begin < end && space(s.charAt(begin))) {
            begin++;
        }
        while (end > begin && space(s.charAt(end - 1))) {
            end--;
        }
        return s.subSequence(begin, end).toString();
    }

    private static boolean space(char c) {
        return Character.isWhitespace(c) || c == '\u00A0' || c == '\u2007' || c == '\u202F' || c == '\u0085';
    }

    /** 컨트롤 ID: 첫 4바이트를 뒤집어 읽는다(예: 'tbl '). */
    private static String controlId(byte[] b) {
        int n = Math.min(4, b.length);
        byte[] id = new byte[n];
        for (int k = 0; k < n; k++) {
            id[k] = b[n - 1 - k];
        }
        return new String(id, StandardCharsets.ISO_8859_1);
    }

    static int le16(byte[] b, int o) {
        return (b[o] & 0xFF) | (b[o + 1] & 0xFF) << 8;
    }

    static int le32(byte[] b, int o) {
        return ByteBuffer.wrap(b, o, 4).order(ByteOrder.LITTLE_ENDIAN).getInt();
    }

    /** 최소 OLE(CFB) 판독기. 모든 Sector 접근은 범위를 확인하고, Chain 순환은 FAT 길이로 끊는다. */
    static final class Cfb {
        private static final long END = 0xFFFFFFFAL;
        private final byte[] d;
        private final int ss;
        private final int mss;
        private final long cutoff;
        private final long[] fat;
        private final long[] minifat;
        private final byte[] ministream;
        private final List<long[]> entries = new ArrayList<>(); // start, size, type, left, right, child
        private final List<String> names = new ArrayList<>();
        final Map<String, Integer> paths = new HashMap<>();
        private final StructureBudget budget;

        Cfb(byte[] data, StructureBudget budget) {
            this.budget = budget;
            if (data.length < 512) {
                throw StructureBudget.parseFailed("short CFB");
            }
            this.d = data;
            int ssShift = le16(data, 0x1E);
            int mssShift = le16(data, 0x20);
            if ((ssShift != 9 && ssShift != 12) || mssShift != 6) {
                throw StructureBudget.parseFailed("sector size");
            }
            this.ss = 1 << ssShift;
            this.mss = 1 << mssShift;
            long nfat = le32(data, 0x2C) & 0xFFFFFFFFL;
            long dir0 = le32(data, 0x30) & 0xFFFFFFFFL;
            this.cutoff = le32(data, 0x38) & 0xFFFFFFFFL;
            long minifat0 = le32(data, 0x3C) & 0xFFFFFFFFL;
            long nminifat = le32(data, 0x40) & 0xFFFFFFFFL;
            long difat0 = le32(data, 0x44) & 0xFFFFFFFFL;
            long ndifat = le32(data, 0x48) & 0xFFFFFFFFL;
            long maxSectors = data.length / ss + 1;
            if (nfat > maxSectors || ndifat > maxSectors) {
                throw StructureBudget.parseFailed("fat size");
            }
            List<Long> difat = new ArrayList<>();
            for (int k = 0; k < 109; k++) {
                difat.add(le32(data, 0x4C + k * 4) & 0xFFFFFFFFL);
            }
            long s = difat0;
            for (long k = 0; k < ndifat; k++) {
                if (s >= END) {
                    break;
                }
                byte[] sec = sector(s);
                int per = ss / 4;
                for (int e = 0; e < per - 1; e++) {
                    difat.add(le32(sec, e * 4) & 0xFFFFFFFFL);
                }
                s = le32(sec, (per - 1) * 4) & 0xFFFFFFFFL;
            }
            List<Long> fatList = new ArrayList<>();
            for (int k = 0; k < Math.min(nfat, difat.size()); k++) {
                byte[] sec = sector(difat.get(k));
                for (int e = 0; e < ss / 4; e++) {
                    fatList.add(le32(sec, e * 4) & 0xFFFFFFFFL);
                }
            }
            this.fat = fatList.stream().mapToLong(Long::longValue).toArray();
            byte[] dir = chain(dir0);
            for (int k = 0; k + 128 <= dir.length; k += 128) {
                int nl = le16(dir, k + 64);
                int nameBytes = Math.max(0, Math.min(nl, 64) - 2);
                names.add(new String(dir, k, nameBytes, StandardCharsets.UTF_16LE));
                long start = le32(dir, k + 116) & 0xFFFFFFFFL;
                long size = ByteBuffer.wrap(dir, k + 120, 8).order(ByteOrder.LITTLE_ENDIAN).getLong();
                if (ss == 512) {
                    size &= 0xFFFFFFFFL; // v3: 상위 4바이트는 정의되지 않음
                }
                entries.add(new long[] {start, size, dir[k + 66] & 0xFF, le32(dir, k + 68), le32(dir, k + 72),
                    le32(dir, k + 76)});
            }
            if (entries.isEmpty()) {
                throw StructureBudget.parseFailed("no directory");
            }
            long[] root = entries.get(0);
            this.ministream = root[1] > 0 ? head(chain(root[0]), root[1]) : new byte[0];
            if (nminifat > 0) {
                byte[] mf = chain(minifat0);
                long[] values = new long[mf.length / 4];
                for (int k = 0; k < values.length; k++) {
                    values[k] = le32(mf, k * 4) & 0xFFFFFFFFL;
                }
                this.minifat = values;
            } else {
                this.minifat = new long[0];
            }
            walk((int) root[5], "", 0);
        }

        private byte[] sector(long s) {
            long o = (s + 1) * ss;
            if (s < 0 || o + ss > d.length) {
                throw StructureBudget.parseFailed("sector out of range");
            }
            byte[] out = new byte[ss];
            System.arraycopy(d, (int) o, out, 0, ss);
            return out;
        }

        private byte[] chain(long s) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            int seen = 0;
            while (s < END && seen < fat.length + 1) {
                out.writeBytes(sector(s));
                if (s >= fat.length) {
                    break;
                }
                s = fat[(int) s];
                seen++;
                if ((seen & 255) == 0) {
                    budget.tick();
                }
            }
            return out.toByteArray();
        }

        private byte[] miniChain(long s) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            int seen = 0;
            while (s < END && seen < minifat.length + 1) {
                long o = s * mss;
                if (o + mss > ministream.length) {
                    throw StructureBudget.parseFailed("mini sector out of range");
                }
                out.write(ministream, (int) o, mss);
                if (s >= minifat.length) {
                    break;
                }
                s = minifat[(int) s];
                seen++;
            }
            return out.toByteArray();
        }

        private void walk(int idx, String prefix, int depth) {
            Deque<Integer> stack = new ArrayDeque<>();
            stack.push(idx);
            int visited = 0;
            while (!stack.isEmpty()) {
                int i = stack.pop();
                if (i < 0 || i >= entries.size() || ++visited > entries.size()) {
                    continue;
                }
                long[] e = entries.get(i);
                String path = prefix + names.get(i);
                paths.put(path, i);
                stack.push((int) e[3]);
                stack.push((int) e[4]);
                if (e[2] == 1 && depth < 4) {
                    walk((int) e[5], path + "/", depth + 1);
                }
            }
        }

        byte[] read(String path) {
            Integer i = paths.get(path);
            if (i == null) {
                throw StructureBudget.parseFailed("missing stream");
            }
            long[] e = entries.get(i);
            byte[] raw = e[1] < cutoff ? miniChain(e[0]) : chain(e[0]);
            return head(raw, e[1]);
        }

        private static byte[] head(byte[] raw, long size) {
            if (size >= raw.length) {
                return raw;
            }
            byte[] out = new byte[(int) size];
            System.arraycopy(raw, 0, out, 0, out.length);
            return out;
        }
    }
}
