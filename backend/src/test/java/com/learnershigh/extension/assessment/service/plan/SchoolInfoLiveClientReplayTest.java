package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.learnershigh.extension.assessment.integration.schoolinfo.SchoolInfoClient;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * 부록 I REPLAY — 네트워크 없음. 실측 폴더(-Dlive.sep = 9월, -Dlive.apr = 4월)가 있을 때만 돈다(기본 건너뜀, 저장소에 실측 원본 없음).
 * 실제 학교알리미 상세·항목 HTML 과 실제로 내려받은 원본을 루프백 서버로 그대로 돌려주고, 제품 {@link SchoolInfoClient#fetchYear} 를 실행한다:
 * 기본 항목 화면 = 9월(3차) HTML, Client 가 스스로 요청하는 JG_CHASU=1 = 같은 학교·학년도 4월 HTML.
 * 실측 표본에 없는 첨부(학년도당 3개만 받음)와 SHA 가 기록과 다른 사본은 404 로 응답한다.
 */
class SchoolInfoLiveClientReplayTest {

    record School(String key, String id, String name, String detailFile, String aprilKey) {
    }

    static final List<School> SCHOOLS = List.of(
            new School("가좌고고양", "159bfc38-e79f-4b65-8b71-4d86557aa6f6", "가좌고등학교", "가좌고고양-detail-0.html", "가좌고"),
            new School("한빛고파주", "4674a469-46ff-47af-b1ef-fdf2aa3e7f1f", "한빛고등학교", "한빛고파주-detail-0.html", "한빛고파주"));

    static String sha(byte[] b) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b));
    }

    static Map<String, String> query(String raw) {
        Map<String, String> q = new HashMap<>();
        if (raw == null) {
            return q;
        }
        for (String part : raw.split("&")) {
            int eq = part.indexOf('=');
            if (eq > 0) {
                q.put(URLDecoder.decode(part.substring(0, eq), StandardCharsets.UTF_8), URLDecoder.decode(part.substring(eq + 1), StandardCharsets.UTF_8));
            }
        }
        return q;
    }

    /** (학교 ID, 학년도, 차수, FILE_SEQ) → [경로, 기록 SHA, Content-Disposition] */
    static void index(Map<String, String[]> out, Path dir, JsonNode summary, String key, String schoolId, String chasu) {
        for (JsonNode s : summary.path("schools")) {
            if (!key.equals(s.path("query").asString())) {
                continue;
            }
            for (var y : s.path("years").properties()) {
                for (JsonNode d : y.getValue().path("downloaded")) {
                    if (d.path("savedAs").isString()) {
                        out.put(schoolId + "|" + y.getKey() + "|" + chasu + "|" + d.path("seq").asString(),
                                new String[] {dir.resolve(d.path("savedAs").asString()).toString(), d.path("sha256").asString(), d.path("disposition").asString(null)});
                    }
                }
            }
        }
    }

    @Test
    void 실측_9월_4월_화면을_제품_Client_로_다시_읽어도_학교_학년도_차수_학기가_어긋나지_않는다() throws Exception {
        String sep = System.getProperty("live.sep");
        String apr = System.getProperty("live.apr");
        assumeTrue(sep != null && apr != null && Files.isDirectory(Path.of(sep)) && Files.isDirectory(Path.of(apr)), "실측 폴더(-Dlive.sep, -Dlive.apr) 없음 — 건너뜀");
        JsonMapper mapper = JsonMapper.builder().build();
        Path sepDir = Path.of(sep);
        Path aprDir = Path.of(apr);
        Map<String, String[]> files = new HashMap<>();
        for (School s : SCHOOLS) {
            index(files, sepDir, mapper.readTree(Files.readString(sepDir.resolve("summary-probe.json"))), s.key(), s.id(), "3");
            index(files, aprDir, mapper.readTree(Files.readString(aprDir.resolve("summary.json"))), s.aprilKey(), s.id(), "1");
        }
        List<String> served = new ArrayList<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", ex -> {
            try {
                handle(ex, sepDir, aprDir, files, served);
            } catch (Exception e) {
                ex.sendResponseHeaders(500, -1);
            } finally {
                ex.close();
            }
        });
        server.start();
        Map<String, Object> report = new LinkedHashMap<>();
        try {
            SchoolInfoClient client = new SchoolInfoClient("http://127.0.0.1:" + server.getAddress().getPort(), true, 0, 1);
            for (School s : SCHOOLS) {
                for (int year : List.of(2026, 2025, 2024)) {
                    SchoolInfoClient.YearFetch f = client.fetchYear(s.id(), year, s.name());
                    List<Map<String, Object>> rows = new ArrayList<>();
                    assertThat(f.error()).as(s.key() + " " + year).isNull();
                    assertThat(f.resolvedYear()).as(s.key() + " " + year + " Form 학년도").isEqualTo(year);
                    assertThat(f.problems()).extracting(SchoolInfoClient.Problem::reason).as("차수 지정이 먹었다").doesNotContain("CHASU_IGNORED");
                    for (SchoolInfoClient.PlanFile p : f.files()) {
                        String chasu = p.attachmentSeq().substring(1, p.attachmentSeq().indexOf(':'));
                        String seq = p.attachmentSeq().substring(p.attachmentSeq().indexOf(':') + 1);
                        String[] known = files.get(s.id() + "|" + year + "|" + chasu + "|" + seq);
                        assertThat(known).as(s.key() + " " + year + " " + p.attachmentSeq() + " 는 실측 표본에 있는 원본만").isNotNull();
                        assertThat(sha(p.bytes())).as("받은 바이트 = 그 학교·학년도·차수 실측 원본").isEqualTo(known[1]);
                        assertThat(p.disclosureMonth()).isEqualTo("1".equals(chasu) ? 4 : 9);
                        var c = SchoolInfoSourceClassifier.classify(year, f.resolvedYear(), true, p.fileName(), p.bytes(), p.disclosureMonth());
                        if (!c.semesters().isEmpty()) {
                            assertThat(c.semesters()).as(p.fileName() + " 학기 = 공시월").containsOnly("1".equals(chasu) ? 1 : 2);
                        }
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("seq", p.attachmentSeq());
                        row.put("file", p.fileName());
                        row.put("month", p.disclosureMonth());
                        row.put("verification", c.verification().name());
                        row.put("reason", c.reason());
                        row.put("grades", c.grades());
                        row.put("semesters", c.semesters());
                        row.put("sha", known[1].substring(0, 12));
                        rows.add(row);
                    }
                    Map<String, Object> y = new LinkedHashMap<>();
                    y.put("resolvedYear", f.resolvedYear());
                    y.put("files", rows);
                    y.put("problems", f.problems().stream().map(p -> p.fileName() + ":" + p.reason()).toList());
                    report.put(s.key() + "-" + year, y);
                }
            }
        } finally {
            server.stop(0);
            Files.writeString(sepDir.resolve("client-replay.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of("report", report, "served", served)),
                    StandardCharsets.UTF_8);
        }
    }

    static void handle(HttpExchange ex, Path sepDir, Path aprDir, Map<String, String[]> files, List<String> served) throws Exception {
        String path = ex.getRequestURI().getPath();
        Map<String, String> q = query(ex.getRequestURI().getRawQuery());
        if ("POST".equals(ex.getRequestMethod())) {
            q.putAll(query(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1)));
        }
        String shl = q.getOrDefault("SHL_IDF_CD", "");
        School school = SCHOOLS.stream().filter(s -> s.id().equals(shl)).findFirst().orElse(null);
        served.add(path + " " + q.getOrDefault("JG_YEAR", "") + " " + q.getOrDefault("JG_CHASU", "") + " " + q.getOrDefault("FILE_SEQ", ""));
        if (path.equals("/ei/ss/Pneiss_b01_s0.do") && school != null) {
            send(ex, 200, Files.readAllBytes(sepDir.resolve(school.detailFile())), "text/html; charset=UTF-8", null);
        } else if (path.startsWith("/ei/pp/") && school != null) {
            String chasu = q.getOrDefault("JG_CHASU", "3");
            Path p = "1".equals(chasu) ? aprDir.resolve(school.aprilKey() + "-item-" + q.get("JG_YEAR") + ".html")
                    : sepDir.resolve(school.key() + "-item-" + q.get("JG_YEAR") + ".html");
            if ("1".equals(chasu) || "3".equals(chasu)) {
                send(ex, 200, Files.readAllBytes(p), "text/html; charset=UTF-8", null);
            } else {
                send(ex, 404, "no such chasu".getBytes(StandardCharsets.UTF_8), "text/plain", null);
            }
        } else if (path.equals("/servlets/EiFileDownLoad.do")) {
            String[] f = files.get(q.getOrDefault("SHL_IDF_CD", shl) + "|" + q.get("JG_YEAR") + "|" + q.get("JG_CHASU") + "|" + q.get("FILE_SEQ"));
            byte[] b = f == null ? null : Files.readAllBytes(Path.of(f[0]));
            if (b == null || !sha(b).equals(f[1])) {
                // 표본 밖 첨부 또는 SHA 가 기록과 다른 사본(부록 H 저장 이름 충돌) → 내주지 않는다
                send(ex, 404, "<html>파일을 찾을 수 없습니다</html>".getBytes(StandardCharsets.UTF_8), "text/html; charset=UTF-8", null);
            } else {
                send(ex, 200, b, "application/octet-stream", f[2]);
            }
        } else {
            send(ex, 200, "<html>main</html>".getBytes(StandardCharsets.UTF_8), "text/html", null);
        }
    }

    static void send(HttpExchange ex, int status, byte[] body, String type, String disposition) throws IOException {
        ex.getResponseHeaders().add("Content-Type", type);
        if (disposition != null) {
            ex.getResponseHeaders().add("Content-Disposition", disposition);
        }
        ex.sendResponseHeaders(status, body.length);
        ex.getResponseBody().write(body);
    }
}
