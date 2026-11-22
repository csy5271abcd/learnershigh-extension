package com.learnershigh.extension.assessment.integration.schoolinfo;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * A27-UX 부록 E 시험 전용 <b>가상 학교알리미</b> (127.0.0.1). 실제 학교알리미의 페이지 모양 중 {@link SchoolInfoClient}가 읽는 부분만 흉내 낸다:
 * 학교 검색 → 학교 상세(HG_NM·기본 JG_YEAR·학년도 option·loadGongSi) → 학년도 지정 평가계획 항목(첨부 목록·eiFileDownForm) → 내려받기.
 * 학년도마다 다른 문서를 돌려주고, 되돌려 주는 공시연도(echo)·HTTP 상태를 시나리오별로 바꿀 수 있다. 실제 학교 자료는 없다.
 */
public final class FakeSchoolInfoServer implements AutoCloseable {

    public record Doc(String name, byte[] bytes) {
    }

    /** 학년도 하나의 응답. echoYear = 내려받기 Form 의 JG_YEAR(학교알리미가 되돌려 준 공시연도). */
    public static final class YearData {
        public Integer echoYear;
        public final List<Doc> files = new ArrayList<>();
        public int itemStatus = 200;
        public int downloadStatus = 200;
        /** 부록 G: 이 자료가 실린 공시 차수의 공시월(4·9). chasu 맵에서만 쓴다 */
        public Integer month;

        public YearData(Integer echoYear, Doc... docs) {
            this.echoYear = echoYear;
            files.addAll(List.of(docs));
        }
    }

    public static final String SCHOOL_UUID = "0b9c5a4e-1111-4222-8333-944455556666";
    public static final String OTHER_UUID = "0b9c5a4e-1111-4222-8333-944455557777";

    private final HttpServer server;
    public volatile String schoolName = "가상고등학교";
    public volatile List<String> searchIds = List.of(SCHOOL_UUID);
    /** 부록 H 실측 모양: 첫 화면은 2곳 + '고등학교(N) 더보기', SEARCH_MODE=3 이면 전체(highListLimit 까지) */
    public volatile boolean realSearchMarkup;
    public volatile int highListLimit = Integer.MAX_VALUE;
    public volatile int defaultYear = 2026;
    public volatile List<Integer> offeredYears = List.of();
    public volatile int searchStatus = 200;
    /** 첫 화면을 다른 호스트로 Redirect (SSRF 방어 시험) */
    public volatile String mainRedirect;
    public final Map<Integer, YearData> years = new ConcurrentHashMap<>();
    /** 부록 F: 학교 ID 마다 이름·주소(가상). 없으면 schoolName·주소 없음 */
    public final Map<String, String[]> schools = new ConcurrentHashMap<>();
    /** 부록 F: 학교 ID 마다 다른 학년도 자료(없으면 years) */
    public final Map<String, Map<Integer, YearData>> yearsBySchool = new ConcurrentHashMap<>();
    /** 부록 G 실측 구조: "학년도:차수"(예 "2026:1" = 4월, "2026:3" = 9월). 있으면 항목 화면에 '자료기준일' 선택지와 JG_CHASU 를 넣는다 */
    public final Map<String, YearData> chasu = new ConcurrentHashMap<>();
    /** 서버가 JG_CHASU 를 무시하고 늘 최신 차수를 주는 경우 */
    public volatile boolean ignoreChasu;
    /** 부록 I: 이 FILE_SEQ 첨부는 404 오류 페이지로 응답(만료·삭제된 첨부) */
    public final java.util.Set<Integer> missingSeqs = java.util.concurrent.ConcurrentHashMap.newKeySet();
    /** 실측 구조의 주소 표기(<span class="mt">주소 :</span>값</span>)로 낼지 */
    public volatile boolean realAddressMarkup;
    /** 받은 요청 기록: "경로 JG_YEAR=…" */
    public final List<String> log = new CopyOnWriteArrayList<>();

    public FakeSchoolInfoServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();
    }

    public String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    public void reset() {
        schoolName = "가상고등학교";
        searchIds = List.of(SCHOOL_UUID);
        realSearchMarkup = false;
        highListLimit = Integer.MAX_VALUE;
        defaultYear = 2026;
        offeredYears = List.of();
        searchStatus = 200;
        mainRedirect = null;
        years.clear();
        schools.clear();
        yearsBySchool.clear();
        chasu.clear();
        ignoreChasu = false;
        missingSeqs.clear();
        realAddressMarkup = false;
        log.clear();
    }

    public long count(String pathPart) {
        return log.stream().filter(l -> l.contains(pathPart)).count();
    }

    private void handle(HttpExchange ex) throws IOException {
        String path = ex.getRequestURI().getPath();
        Map<String, String> q = query(ex.getRequestURI().getRawQuery());
        byte[] body = ex.getRequestBody().readAllBytes();
        if ("POST".equals(ex.getRequestMethod())) {
            q.putAll(query(new String(body, StandardCharsets.ISO_8859_1)));
        }
        log.add(path + (q.containsKey("JG_YEAR") ? " JG_YEAR=" + q.get("JG_YEAR") : "") + (q.containsKey("PAGE_YEAR") ? " PAGE_YEAR=" + q.get("PAGE_YEAR") : ""));
        switch (path) {
            case "/Main.do" -> {
                if (mainRedirect != null) {
                    ex.getResponseHeaders().add("Location", mainRedirect);
                    send(ex, 302, "", null);
                } else {
                    send(ex, 200, "<html>main</html>", null);
                }
            }
            case "/ei/ss/Pneiss_f01_l0.do" -> {
                if (searchStatus != 200) {
                    send(ex, searchStatus, "busy", null);
                    return;
                }
                StringBuilder html = new StringBuilder("<html>");
                List<String> shown = searchIds;
                if (realSearchMarkup) {
                    boolean more = "3".equals(q.get("SEARCH_MODE"));
                    html.append("전체(").append(searchIds.size()).append(") <a href=\"javascript:goDetailSearch('3')\">고등학교(").append(searchIds.size()).append(")</a>");
                    shown = searchIds.subList(0, Math.min(searchIds.size(), more ? highListLimit : 2));
                    log.add("search SEARCH_MODE=" + q.getOrDefault("SEARCH_MODE", ""));
                }
                for (String id : shown) {
                    html.append("<a onclick=\"searchSchul('").append(id).append("')\">학교</a>");
                }
                send(ex, 200, html.append("</html>").toString(), null);
            }
            case "/ei/ss/Pneiss_b01_s0.do" -> {
                String shl = q.getOrDefault("SHL_IDF_CD", "");
                String[] school = schools.get(shl);
                StringBuilder html = new StringBuilder("<script>var info = { HG_NM : \"").append(school != null ? school[0] : schoolName)
                        .append("\", JG_YEAR : \"").append(defaultYear).append("\" };</script><select>");
                for (int y : offeredYears) {
                    html.append("<option value=\"").append(y).append("\">").append(y).append("</option>");
                }
                if (school != null && school[1] != null) {
                    if (realAddressMarkup) {
                        html.append("</select><span class=\"md\"><span class=\"mt\">주소 :</span>").append(school[1]).append("</span><br><select>");
                    } else {
                        html.append("</select><table><tr><th scope=\"row\">주소</th><td>").append(school[1]).append("</td></tr></table><select>");
                    }
                }
                html.append("</select><a onclick=\"loadGongSi('/ei/pp/Pneipp_b06_s0p.do', '06', '1', '교과별(학년별) 평가계획에 관한 사항', 'A', 'B', 'C', 'D')\">평가계획</a>");
                send(ex, 200, html.toString(), null);
            }
            case "/ei/pp/Pneipp_b06_s0p.do" -> {
                int year = Integer.parseInt(q.getOrDefault("JG_YEAR", String.valueOf(defaultYear)));
                YearData d = dataOf(q.getOrDefault("SHL_IDF_CD", ""), year);
                String options = "";
                Integer pageChasu = null;
                if (!chasu.isEmpty()) {
                    int latest = chasu.keySet().stream().filter(k -> k.startsWith(year + ":")).mapToInt(k -> Integer.parseInt(k.substring(5))).max().orElse(0);
                    pageChasu = ignoreChasu || !q.containsKey("JG_CHASU") ? latest : Integer.parseInt(q.get("JG_CHASU"));
                    d = chasu.get(year + ":" + pageChasu);
                    StringBuilder o = new StringBuilder("<select name=\"select_trans_dt\" id=\"select_trans_dt\">");
                    for (String k : chasu.keySet().stream().sorted(java.util.Comparator.reverseOrder()).toList()) {
                        String[] yc = k.split(":");
                        boolean sel = yc[0].equals(String.valueOf(year)) && Integer.parseInt(yc[1]) == pageChasu;
                        o.append("<option value=\"").append(yc[0]).append(yc[1]).append("\"").append(sel ? " selected" : "").append(" >(")
                                .append(yc[1]).append("차) ").append(yc[0]).append("년 ").append(String.format("%02d", chasu.get(k).month)).append("월</option>");
                    }
                    options = o.append("</select>").toString();
                }
                if (d != null && d.itemStatus != 200) {
                    send(ex, d.itemStatus, "error", null);
                    return;
                }
                StringBuilder html = new StringBuilder("<html>" + options + "<script>function getEiFile06(seq){}</script><ul>");
                if (d != null) {
                    for (int i = 0; i < d.files.size(); i++) {
                        html.append("<li><a href=\"#\" onclick=\"getEiFile06('").append(i + 1).append("');\">")
                                .append(d.files.get(i).name()).append("</a></li>");
                    }
                }
                html.append("</ul><form id=\"eiFileDownForm\" method=\"post\">");
                if (d != null && !d.files.isEmpty()) {
                    if (d.echoYear != null) {
                        html.append("<input type=\"hidden\" name=\"JG_YEAR\" value=\"").append(d.echoYear).append("\"/>");
                    }
                    html.append("<input type=\"hidden\" name=\"PAGE_YEAR\" value=\"").append(year).append("\"/>");
                    if (pageChasu != null) {
                        html.append("<input type=\"hidden\" name=\"JG_CHASU\" value=\"").append(pageChasu).append("\"/>");
                    }
                    html.append("<input type=\"hidden\" name=\"SHL_IDF_CD\" value=\"").append(q.getOrDefault("SHL_IDF_CD", "")).append("\"/>");
                }
                send(ex, 200, html.append("</form></html>").toString(), null);
            }
            case "/servlets/EiFileDownLoad.do" -> {
                YearData d = q.containsKey("JG_CHASU") && !chasu.isEmpty() ? chasu.get(q.get("PAGE_YEAR") + ":" + q.get("JG_CHASU"))
                        : dataOf(q.getOrDefault("SHL_IDF_CD", ""), Integer.parseInt(q.getOrDefault("PAGE_YEAR", "0")));
                int seq = Integer.parseInt(q.getOrDefault("FILE_SEQ", "0"));
                if (d == null || seq < 1 || seq > d.files.size()) {
                    send(ex, 404, "none", null);
                    return;
                }
                if (missingSeqs.contains(seq)) {
                    send(ex, 404, "<html>파일을 찾을 수 없습니다</html>", null);
                    return;
                }
                if (d.downloadStatus != 200) {
                    send(ex, d.downloadStatus, "error", null);
                    return;
                }
                Doc doc = d.files.get(seq - 1);
                ex.getResponseHeaders().add("Content-Disposition",
                        "attachment; filename*=UTF-8''" + URLEncoder.encode(doc.name(), StandardCharsets.UTF_8).replace("+", "%20"));
                sendBytes(ex, 200, doc.bytes());
            }
            default -> send(ex, 404, "not found", null);
        }
    }

    private YearData dataOf(String shl, int year) {
        Map<Integer, YearData> mine = yearsBySchool.get(shl);
        return mine != null ? mine.get(year) : years.get(year);
    }

    private static Map<String, String> query(String raw) {
        Map<String, String> out = new LinkedHashMap<>();
        if (raw == null || raw.isEmpty()) {
            return out;
        }
        for (String part : raw.split("&")) {
            int eq = part.indexOf('=');
            if (eq > 0) {
                out.put(URLDecoder.decode(part.substring(0, eq), StandardCharsets.UTF_8),
                        URLDecoder.decode(part.substring(eq + 1), StandardCharsets.UTF_8));
            }
        }
        return out;
    }

    private static void send(HttpExchange ex, int status, String text, String type) throws IOException {
        ex.getResponseHeaders().add("Content-Type", type == null ? "text/html; charset=UTF-8" : type);
        sendBytes(ex, status, text.getBytes(StandardCharsets.UTF_8));
    }

    private static void sendBytes(HttpExchange ex, int status, byte[] b) throws IOException {
        ex.sendResponseHeaders(status, b.length == 0 ? -1 : b.length);
        if (b.length > 0) {
            try (OutputStream o = ex.getResponseBody()) {
                o.write(b);
            }
        } else {
            ex.close();
        }
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
