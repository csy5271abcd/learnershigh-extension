package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Block;
import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Cell;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

/**
 * HWPX(OWPML, ZIP + XML) 원본 → 문단·표 구조 (A10 §38-6). 표준 JDK만 쓴다.
 *
 * <p>{@code Contents/section<n>.xml}을 번호 순서로 읽는다. 구조: {@code hp:p > hp:run > (hp:t | hp:tbl | 기타 개체)},
 * {@code hp:tbl > hp:tr > hp:tc > (hp:subList > hp:p, hp:cellAddr, hp:cellSpan)}. 위치(path) 규칙은 분석 결과
 * {@code documentLocator}와 같다(최상위 {@code p<n>}, 문단 안 표·개체 {@code .c<k>}, 칸 {@code .r<row>c<col>}, 칸 문단 {@code .p<m>},
 * 표가 아닌 개체 안 문단 {@code .c<k>.x<m>}).
 *
 * <p>칸 주소: 위치(path)는 분석기와 같게 {@code hp:tc} 아래 문서 순서상 첫 {@code cellAddr}로 만들고, 화면 배치(row·col)는
 * 그 칸의 직계 {@code cellAddr}를 쓴다(칸 안에 다른 표가 있으면 둘이 다를 수 있다 — 그래도 강조 위치는 분석 결과와 같은 칸이 된다).
 *
 * <p>보안: DOCTYPE 금지·외부 엔터티/스키마 접근 금지·Secure Processing. ZIP 항목 수·압축 해제 총량을 제한하고 경로 이탈 이름은 거절한다.
 */
final class HwpxStructureReader {

    static final String NAME = "hwpx-structure";
    static final String VERSION = "1.0";

    private static final Pattern SECTION = Pattern.compile("Contents/section(\\d+)\\.xml");
    private static final Set<String> NON_CONTAINER = Set.of("t", "secPr", "ctrl", "linesegarray");

    record Result(List<Block> blocks, int sections, List<String> notices) {
    }

    private HwpxStructureReader() {
    }

    static Result read(byte[] data, StructureBudget budget) {
        Map<Integer, byte[]> sections = sections(data, budget);
        DocumentBuilder builder = secureBuilder();
        List<Block> blocks = new ArrayList<>();
        int si = 0;
        int tableNo = 0;
        for (byte[] xml : sections.values()) {
            Element root;
            try {
                root = builder.parse(new ByteArrayInputStream(xml)).getDocumentElement();
            } catch (SAXException | IOException broken) {
                throw StructureBudget.parseFailed("xml");
            }
            Parser parser = new Parser(si, tableNo, budget);
            int i = 0;
            for (Element p : kids(root, "p")) {
                blocks.add(parser.paragraph(p, "p" + i, null, null, 0));
                i++;
            }
            tableNo = parser.tableNo;
            si++;
        }
        return new Result(blocks, sections.size(), List.of());
    }

    /** ZIP 안 section XML만 번호 순서로. 한도·이름 검사는 등록 검사(DocumentFormatInspector)와 같은 기준이다. */
    private static Map<Integer, byte[]> sections(byte[] data, StructureBudget budget) {
        Map<Integer, byte[]> out = new TreeMap<>();
        int entries = 0;
        long total = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(data))) {
            ZipEntry entry;
            byte[] buffer = new byte[64 * 1024];
            while ((entry = zip.getNextEntry()) != null) {
                if (++entries > DocumentFormatInspector.MAX_HWPX_ENTRIES) {
                    throw new StructureBudget.Failure("limit_exceeded", "too many entries");
                }
                String name = entry.getName();
                if (name.contains("..") || name.startsWith("/") || name.contains("\\")) {
                    throw StructureBudget.parseFailed("entry name");
                }
                Matcher m = SECTION.matcher(name);
                boolean keep = m.matches() && m.group(1).length() <= 6;
                ByteArrayOutputStream body = keep ? new ByteArrayOutputStream() : null;
                int n;
                while ((n = zip.read(buffer)) > 0) {
                    total += n;
                    if (total > DocumentFormatInspector.MAX_HWPX_UNCOMPRESSED_BYTES) {
                        throw new StructureBudget.Failure("limit_exceeded", "decompressed size too large");
                    }
                    if (keep) {
                        body.write(buffer, 0, n);
                    }
                    budget.tick();
                }
                if (keep) {
                    out.put(Integer.parseInt(m.group(1)), body.toByteArray());
                }
            }
        } catch (IOException | IllegalArgumentException broken) {
            throw StructureBudget.parseFailed("zip");
        }
        if (out.isEmpty()) {
            throw StructureBudget.parseFailed("no section");
        }
        return out;
    }

    private static DocumentBuilder secureBuilder() {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            // 오류 문장을 표준 오류로 찍지 않고 그대로 실패시킨다(문서 내용이 로그에 섞이지 않게)
            builder.setErrorHandler(new org.xml.sax.helpers.DefaultHandler() {
                @Override
                public void fatalError(org.xml.sax.SAXParseException e) throws SAXException {
                    throw e;
                }

                @Override
                public void error(org.xml.sax.SAXParseException e) throws SAXException {
                    throw e;
                }
            });
            return builder;
        } catch (ParserConfigurationException unavailable) {
            throw new IllegalStateException("secure XML parser unavailable", unavailable);
        }
    }

    private static String local(Node node) {
        String name = node.getLocalName() != null ? node.getLocalName() : node.getNodeName();
        int colon = name.indexOf(':');
        return colon >= 0 ? name.substring(colon + 1) : name;
    }

    /** 직계 자식 중 그 이름의 요소. */
    static List<Element> kids(Element e, String name) {
        List<Element> out = new ArrayList<>();
        for (Node c = e.getFirstChild(); c != null; c = c.getNextSibling()) {
            if (c instanceof Element el && local(el).equals(name)) {
                out.add(el);
            }
        }
        return out;
    }

    /** 자기 자신부터 문서 순서(전위)로 처음 나오는 그 이름의 요소 (분석기의 위치 규칙). */
    static Element firstInTree(Element e, String name) {
        if (local(e).equals(name)) {
            return e;
        }
        NodeList all = e.getElementsByTagNameNS("*", name);
        return all.getLength() == 0 ? null : (Element) all.item(0);
    }

    /** 자기 자신과 모든 후손 중 그 이름의 요소(문서 순서). */
    static List<Element> allInTree(Element e, String name) {
        List<Element> out = new ArrayList<>();
        if (local(e).equals(name)) {
            out.add(e);
        }
        NodeList all = e.getElementsByTagNameNS("*", name);
        for (int i = 0; i < all.getLength(); i++) {
            out.add((Element) all.item(i));
        }
        return out;
    }

    private static int intAttr(Element e, String name, int fallback) {
        String value = e.getAttribute(name);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return Integer.parseInt(value.strip());
        } catch (NumberFormatException broken) {
            throw StructureBudget.parseFailed("attribute " + name);
        }
    }

    private static final class Parser {
        private final int sec;
        private final StructureBudget budget;
        int tableNo;

        Parser(int section, int tableNo, StructureBudget budget) {
            this.sec = section;
            this.tableNo = tableNo;
            this.budget = budget;
        }

        record Ctx(int table) {
        }

        /** hp:t의 글자: 직계 글자 노드 + tab → \t, lineBreak → \n (그 밖 자식 요소의 안쪽 글자는 넣지 않는다). */
        String textOfRun(Element run) {
            StringBuilder out = new StringBuilder();
            for (Node t = run.getFirstChild(); t != null; t = t.getNextSibling()) {
                if (!(t instanceof Element te) || !local(te).equals("t")) {
                    continue;
                }
                for (Node c = te.getFirstChild(); c != null; c = c.getNextSibling()) {
                    if (c.getNodeType() == Node.TEXT_NODE || c.getNodeType() == Node.CDATA_SECTION_NODE) {
                        out.append(c.getNodeValue());
                    } else if (c instanceof Element ce) {
                        if (local(ce).equals("tab")) {
                            out.append('\t');
                        } else if (local(ce).equals("lineBreak")) {
                            out.append('\n');
                        }
                    }
                }
            }
            return out.toString();
        }

        Block paragraph(Element pe, String path, Ctx cell, String control, int depth) {
            budget.depth(depth);
            budget.node();
            budget.paragraphs++;
            StringBuilder text = new StringBuilder();
            List<Block> blocks = new ArrayList<>();
            int ci = 0;
            for (Element run : kids(pe, "run")) {
                text.append(textOfRun(run));
                for (Node o = run.getFirstChild(); o != null; o = o.getNextSibling()) {
                    if (!(o instanceof Element obj)) {
                        continue;
                    }
                    String n = local(obj);
                    if (n.equals("tbl")) {
                        blocks.add(table(obj, path + ".c" + ci, depth + 1));
                        ci++;
                    } else if (!NON_CONTAINER.contains(n)) {
                        List<Element> subs = allInTree(obj, "subList");
                        int k = 0;
                        for (Element s : subs) {
                            for (Element sp : kids(s, "p")) {
                                blocks.add(paragraph(sp, path + ".c" + ci + ".x" + k, null, n, depth + 1));
                                k++;
                            }
                        }
                        if (!subs.isEmpty()) {
                            ci++;
                        }
                    }
                }
            }
            String kind = control != null ? "CONTROL_TEXT" : cell != null ? "HWPX_TABLE_CELL" : "HWPX_PARAGRAPH";
            String value = HwpStructureReader.strip(text);
            budget.text(value.length());
            return Block.paragraph(sec, path, kind, value, control, blocks);
        }

        Block table(Element te, String path, int depth) {
            budget.depth(depth);
            budget.node();
            budget.tables++;
            int tno = tableNo++;
            int rows = intAttr(te, "rowCnt", 0);
            int cols = intAttr(te, "colCnt", 0);
            List<Cell> cells = new ArrayList<>();
            for (Element tr : kids(te, "tr")) {
                for (Element tc : kids(tr, "tc")) {
                    Element pathAddr = firstInTree(tc, "cellAddr");
                    if (pathAddr == null) {
                        continue;
                    }
                    List<Element> ownAddr = kids(tc, "cellAddr");
                    Element layoutAddr = ownAddr.isEmpty() ? pathAddr : ownAddr.get(0);
                    List<Element> ownSpan = kids(tc, "cellSpan");
                    Element span = ownSpan.isEmpty() ? firstInTree(tc, "cellSpan") : ownSpan.get(0);
                    String cpath = path + ".r" + intAttr(pathAddr, "rowAddr", -1) + "c" + intAttr(pathAddr, "colAddr", -1);
                    int row = intAttr(layoutAddr, "rowAddr", -1);
                    int col = intAttr(layoutAddr, "colAddr", -1);
                    if (row < 0 || col < 0) {
                        throw StructureBudget.parseFailed("cell address");
                    }
                    int rowSpan = span == null ? 1 : Math.max(1, intAttr(span, "rowSpan", 1));
                    int colSpan = span == null ? 1 : Math.max(1, intAttr(span, "colSpan", 1));
                    List<Element> subList = kids(tc, "subList");
                    List<Block> paras = new ArrayList<>();
                    if (!subList.isEmpty()) {
                        int i = 0;
                        for (Element p : kids(subList.get(0), "p")) {
                            paras.add(paragraph(p, cpath + ".p" + i, new Ctx(tno), null, depth + 1));
                            i++;
                        }
                    }
                    budget.cells++;
                    budget.node();
                    cells.add(new Cell(row, col, rowSpan, colSpan, cpath, paras));
                }
            }
            return Block.table(sec, path, tno, rows, cols, cells, List.of());
        }
    }
}
