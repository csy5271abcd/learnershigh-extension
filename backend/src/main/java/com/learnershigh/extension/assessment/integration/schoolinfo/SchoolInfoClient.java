package com.learnershigh.extension.assessment.integration.schoolinfo;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.CookieManager;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * 학교알리미(schoolinfo.go.kr) 공시 '교과별 교수·학습 및 평가 계획' 첨부 파일 받기 (외부 경계).
 * 흐름: 학교 검색(EUC-KR POST) → 학교 상세(공시 항목 목록) → 평가계획 항목 → 첨부 파일 목록 → 내려받기(zip 이면 풀기).
 * 일시 오류(연결·SSL·429·5xx)는 최대 3번 다시 시도한다. 학교 하나를 받는 동안 같은 세션(쿠키)을 쓴다.
 */
public class SchoolInfoClient {

    static final String BASE = "https://www.schoolinfo.go.kr";
    public static final String BASE_URL = BASE;
    static final String UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
    static final Charset EUC_KR = Charset.forName("EUC-KR");
    private static final int RETRIES = 3;

    public record PlanFile(String fileName, byte[] bytes) {
    }

    public record Fetched(String schoolName, int searchHits, List<PlanFile> files, String error) {
    }

    private final HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager())
            .followRedirects(HttpClient.Redirect.NORMAL).connectTimeout(Duration.ofSeconds(10)).build();

    /** 학교 이름으로 공시된 평가계획 파일을 모두 받는다. 오류는 예외 대신 Fetched.error 로 돌려준다. */
    public Fetched fetch(String schoolName) {
        try {
            get("/Main.do", null, null, StandardCharsets.UTF_8);
            Map<String, String> q = new LinkedHashMap<>();
            q.put("SEARCH_KEYWORD", schoolName);
            q.put("SEARCH_SCHUL_NM", schoolName);
            q.put("SEARCH_TYPE", "1");
            q.put("pageNumber", "1");
            q.put("SEARCH_MODE", "");
            String html = text(post("/ei/ss/Pneiss_f01_l0.do", q, EUC_KR).body());
            LinkedHashSet<String> ids = new LinkedHashSet<>();
            for (Pattern p : List.of(Pattern.compile("SHL_IDF_CD\"\\)\\.val\\('([0-9a-f-]{36})'\\)"),
                    Pattern.compile("searchSchul\\('([0-9a-f-]{36})'\\)"))) {
                Matcher m = p.matcher(html);
                while (m.find()) {
                    ids.add(m.group(1));
                }
            }
            if (ids.isEmpty()) {
                return new Fetched(null, 0, List.of(), "SCHOOL_NOT_FOUND");
            }
            return byId(ids.iterator().next(), schoolName, ids.size());
        } catch (IOException e) {
            return new Fetched(null, 0, List.of(), "DOWNLOAD_FAILED");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new Fetched(null, 0, List.of(), "DOWNLOAD_FAILED");
        }
    }

    private Fetched byId(String shl, String query, int hits) throws IOException, InterruptedException {
        String html = text(post("/ei/ss/Pneiss_b01_s0.do", Map.of("SHL_IDF_CD", shl), StandardCharsets.UTF_8).body());
        Matcher nm = Pattern.compile("HG_NM\\s*:\\s*\"([^\"]+)\"").matcher(html);
        Matcher yr = Pattern.compile("JG_YEAR\\s*:\\s*\"(\\d{4})\"").matcher(html);
        String name = nm.find() ? nm.group(1) : query;
        String year = yr.find() ? yr.group(1) : null;
        Matcher call = Pattern.compile("loadGongSi\\('([^']+)',\\s*'([^']*)',\\s*'([^']*)',\\s*'([^']*)',\\s*'([^']*)',\\s*'([^']*)',\\s*'([^']*)',\\s*'([^']*)'\\)").matcher(html);
        String[] plan = null;
        while (call.find()) {
            if (call.group(4).contains("평가계획")) {
                plan = new String[] {call.group(1), call.group(2), call.group(3), call.group(4), call.group(5), call.group(6), call.group(7), call.group(8)};
                break;
            }
        }
        if (plan == null || year == null) {
            return new Fetched(name, hits, List.of(), "PLAN_NOT_PUBLISHED");
        }
        Map<String, String> p = new LinkedHashMap<>();
        p.put("GS_HANGMOK_CD", plan[1]);
        p.put("GS_HANGMOK_NO", plan[2]);
        p.put("GS_HANGMOK_NM", plan[3]);
        p.put("GS_BURYU_CD", plan[4]);
        p.put("JG_BURYU_CD", plan[5]);
        p.put("JG_HANGMOK_CD", plan[6]);
        p.put("JG_GUBUN", plan[7]);
        p.put("JG_YEAR2", year);
        p.put("HG_NM", name);
        p.put("SHL_IDF_CD", shl);
        p.put("GS_TYPE", "Y");
        p.put("JG_YEAR", year);
        p.put("SORT", "BR");
        p.put("CHOSEN_JG_YEAR", year);
        p.put("PRE_JG_YEAR", year);
        p.put("LOAD_TYPE", "single");
        String item = text(get(plan[0], p, BASE + "/ei/ss/Pneiss_b01_s0.do", StandardCharsets.UTF_8).body());
        if (item.contains("서비스 일시 중단")) {
            return new Fetched(name, hits, List.of(), "DOWNLOAD_FAILED");
        }
        Matcher fn = Pattern.compile("function (getEiFile\\d+)\\(").matcher(item);
        String fnName = fn.find() ? fn.group(1) : "getEiFile" + plan[1];
        Matcher files = Pattern.compile(Pattern.quote(fnName) + "\\('(\\d+)'\\);?\"?[^>]*>\\s*([^<]+?)\\s*<").matcher(item);
        List<String> seqs = new ArrayList<>();
        while (files.find()) {
            seqs.add(files.group(1));
        }
        Map<String, String> form = new LinkedHashMap<>();
        int at = item.indexOf("id=\"eiFileDownForm\"");
        if (at >= 0) {
            Matcher f = Pattern.compile("name=\"([A-Z_]+)\"[^>]*value=\"([^\"]*)\"").matcher(item.substring(at, Math.min(item.length(), at + 3000)));
            while (f.find()) {
                form.put(f.group(1), f.group(2));
            }
        }
        if (seqs.isEmpty() || form.isEmpty()) {
            return new Fetched(name, hits, List.of(), "PLAN_NOT_PUBLISHED");
        }
        List<PlanFile> out = new ArrayList<>();
        for (String seq : seqs) {
            Map<String, String> q = new LinkedHashMap<>(form);
            q.put("FILE_SEQ", seq);
            HttpResponse<byte[]> r = get("/servlets/EiFileDownLoad.do", q, BASE + "/ei/ss/Pneiss_b01_s0.do", StandardCharsets.UTF_8);
            String fileName = fileName(r.headers().firstValue("Content-Disposition").orElse(null), "file_" + seq);
            byte[] b = r.body();
            if (b.length >= 4 && b[0] == 'P' && b[1] == 'K' && fileName.toLowerCase().endsWith(".zip")) {
                out.addAll(unzip(b));
            } else {
                out.add(new PlanFile(fileName, b));
            }
            Thread.sleep(500);
        }
        return new Fetched(name, hits, out, null);
    }

    static List<PlanFile> unzip(byte[] zip) throws IOException {
        List<PlanFile> out = new ArrayList<>();
        for (Charset cs : List.of(StandardCharsets.UTF_8, Charset.forName("CP949"))) {
            out.clear();
            try (ZipInputStream z = new ZipInputStream(new ByteArrayInputStream(zip), cs)) {
                ZipEntry e;
                while ((e = z.getNextEntry()) != null) {
                    if (e.isDirectory()) {
                        continue;
                    }
                    String n = e.getName().replace('\\', '/');
                    n = n.substring(n.lastIndexOf('/') + 1);
                    byte[] b = z.readNBytes(30 * 1024 * 1024);
                    out.add(new PlanFile(n, b));
                }
                return out;
            } catch (IllegalArgumentException malformedName) {
                // 이름 인코딩이 다르면 CP949 로 다시
            }
        }
        return out;
    }

    static String fileName(String disp, String fallback) {
        if (disp == null) {
            return fallback;
        }
        Matcher m = Pattern.compile("filename\\*=UTF-8''([^;]+)", Pattern.CASE_INSENSITIVE).matcher(disp);
        if (m.find()) {
            return URLDecoder.decode(m.group(1), StandardCharsets.UTF_8);
        }
        m = Pattern.compile("filename=\"?([^\";]+)\"?", Pattern.CASE_INSENSITIVE).matcher(disp);
        if (!m.find()) {
            return fallback;
        }
        String name = m.group(1);
        if (name.contains("%")) {
            String u = URLDecoder.decode(name, StandardCharsets.UTF_8);
            return u.contains("\uFFFD") ? URLDecoder.decode(name, Charset.forName("CP949")) : u;
        }
        byte[] raw = name.getBytes(StandardCharsets.ISO_8859_1);
        String u = new String(raw, StandardCharsets.UTF_8);
        return u.contains("\uFFFD") ? new String(raw, Charset.forName("CP949")) : u;
    }

    static String text(byte[] b) {
        String u = new String(b, StandardCharsets.UTF_8);
        return u.contains("\uFFFD") ? new String(b, Charset.forName("CP949")) : u;
    }

    private HttpResponse<byte[]> get(String path, Map<String, String> params, String referer, Charset cs) throws IOException, InterruptedException {
        String url = (path.startsWith("http") ? path : BASE + path) + (params == null ? "" : "?" + form(params, cs));
        return send(HttpRequest.newBuilder(URI.create(url)).GET(), referer);
    }

    private HttpResponse<byte[]> post(String path, Map<String, String> data, Charset cs) throws IOException, InterruptedException {
        return send(HttpRequest.newBuilder(URI.create(BASE + path)).header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form(data, cs))), null);
    }

    private HttpResponse<byte[]> send(HttpRequest.Builder b, String referer) throws IOException, InterruptedException {
        HttpRequest req = b.header("User-Agent", UA).header("Referer", referer != null ? referer : BASE + "/Main.do")
                .timeout(Duration.ofSeconds(60)).build();
        IOException last = null;
        for (int attempt = 0; attempt <= RETRIES; attempt++) {
            try {
                HttpResponse<byte[]> r = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
                if (r.statusCode() == 429 || r.statusCode() >= 500) {
                    last = new IOException("http " + r.statusCode());
                } else {
                    return r;
                }
            } catch (IOException e) {
                last = e;
            }
            Thread.sleep((1L << attempt) * 1000 + (long) (Math.random() * 1000));
        }
        throw last;
    }

    private static String form(Map<String, String> m, Charset cs) {
        List<String> parts = new ArrayList<>();
        m.forEach((k, v) -> parts.add(URLEncoder.encode(k, cs) + "=" + URLEncoder.encode(v == null ? "" : v, cs)));
        return String.join("&", parts);
    }
}
