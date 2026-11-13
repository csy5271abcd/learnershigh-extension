package com.learnershigh.extension.assessment.integration.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerException.Kind;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** 분석기 HTTP Client 단위 시험 (A3). 실제 분석기 대신 같은 계약 모양을 돌려주는 Stub HTTP 서버를 쓴다(합성 응답). */
class HttpPlanAnalyzerClientTest {

    static final String TOKEN = "test-token-not-a-secret-0123456789abcdef";
    static final String SHA = "a".repeat(64);

    HttpServer server;
    final AtomicInteger calls = new AtomicInteger();
    final AtomicReference<String> lastToken = new AtomicReference<>();
    final AtomicReference<String> lastContentLength = new AtomicReference<>();
    final AtomicReference<String> lastTransferEncoding = new AtomicReference<>();
    final AtomicReference<String> lastBody = new AtomicReference<>();
    volatile Handler handler;

    interface Handler {
        void handle(HttpExchange exchange) throws IOException, InterruptedException;
    }

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(Executors.newCachedThreadPool());
        server.createContext("/analyze-preview", exchange -> {
            calls.incrementAndGet();
            lastToken.set(exchange.getRequestHeaders().getFirst("X-Analysis-Token"));
            lastContentLength.set(exchange.getRequestHeaders().getFirst("Content-Length"));
            lastTransferEncoding.set(exchange.getRequestHeaders().getFirst("Transfer-Encoding"));
            lastBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1));
            try {
                handler.handle(exchange);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    HttpPlanAnalyzerClient client(Duration timeout) {
        return new HttpPlanAnalyzerClient("http://127.0.0.1:" + server.getAddress().getPort() + "/", TOKEN,
                Duration.ofSeconds(2), timeout, 2, 10, JsonMapper.builder().build());
    }

    static PlanAnalyzerClient.Request request() {
        return new PlanAnalyzerClient.Request("%PDF-1.4 synthetic".getBytes(StandardCharsets.US_ASCII), "plan\"x.pdf",
                "rev0123", "v21.1");
    }

    static void reply(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
    }

    static String ok(String status) {
        return """
                {"service":{"name":"stub"},"requestId":"req123","ok":true,"status":"%s","analyzerVersion":"v21.1",
                 "analyzerChannel":"DEFAULT","source":{"sha256":"%s","sizeBytes":18},
                 "backendImport":{"variant":"OFFICIAL_PDF","importable":true,"blockers":[],
                   "payload":{"analyzer":{"name":"x","version":"v21.1"},"status":"REVIEW_REQUIRED","subjects":[]}},
                 "warnings":["2개 구간 미추출"],"errors":[],"elapsedMs":42}""".formatted(status, SHA);
    }

    @Test
    void 성공_응답을_읽고_토큰과_Content_Length로_multipart를_보낸다() {
        handler = exchange -> reply(exchange, 200, ok("PARTIAL"));
        PlanAnalyzerClient.Result result = client(Duration.ofSeconds(5)).analyze(request());

        assertThat(result.envelopeStatus()).isEqualTo("PARTIAL");
        assertThat(result.sourceSha256()).isEqualTo(SHA);
        assertThat(result.requestId()).isEqualTo("req123");
        assertThat(result.analyzerProfile()).isEqualTo("v21.1");
        assertThat(result.variant()).isEqualTo("OFFICIAL_PDF");
        assertThat(result.importable()).isTrue();
        assertThat(result.payloadJson()).contains("\"status\":\"REVIEW_REQUIRED\"");
        assertThat(result.warnings()).containsExactly("2개 구간 미추출");
        assertThat(result.elapsedMs()).isEqualTo(42);
        assertThat(lastToken.get()).isEqualTo(TOKEN);
        assertThat(lastContentLength.get()).isNotNull();
        assertThat(lastTransferEncoding.get()).isNull();
        assertThat(lastBody.get())
                .contains("name=\"analyzerVersion\"\r\n\r\nv21.1")
                .contains("name=\"includeAnalysis\"\r\n\r\nfalse")
                .contains("name=\"fileId\"\r\n\r\nrev0123")
                .contains("name=\"file\"; filename=\"plan_x.pdf\"")
                .contains("%PDF-1.4 synthetic");
    }

    @Test
    void BUSY는_재시도하고_끝내_BUSY면_실패한다() {
        handler = exchange -> reply(exchange, 503, "{\"ok\":false,\"status\":\"ERROR\",\"errors\":[{\"code\":\"BUSY\"}]}");
        assertThatThrownBy(() -> client(Duration.ofSeconds(5)).analyze(request()))
                .isInstanceOfSatisfying(PlanAnalyzerException.class, e -> assertThat(e.kind()).isEqualTo(Kind.BUSY));
        assertThat(calls.get()).isEqualTo(3);
    }

    @Test
    void BUSY_뒤_성공하면_결과를_돌려준다() {
        handler = exchange -> {
            if (calls.get() == 1) {
                reply(exchange, 503, "{\"errors\":[{\"code\":\"BUSY\"}]}");
            } else {
                reply(exchange, 200, ok("OK_REVIEW_REQUIRED"));
            }
        };
        assertThat(client(Duration.ofSeconds(5)).analyze(request()).envelopeStatus()).isEqualTo("OK_REVIEW_REQUIRED");
        assertThat(calls.get()).isEqualTo(2);
    }

    @Test
    void Timeout은_재시도하지_않는다() {
        handler = exchange -> {
            Thread.sleep(1500);
            reply(exchange, 200, ok("OK_REVIEW_REQUIRED"));
        };
        assertThatThrownBy(() -> client(Duration.ofMillis(300)).analyze(request()))
                .isInstanceOfSatisfying(PlanAnalyzerException.class, e -> assertThat(e.kind()).isEqualTo(Kind.TIMEOUT));
        assertThat(calls.get()).isEqualTo(1);
    }

    @Test
    void 연결_실패는_재시도_후_CONNECTION_FAILED() throws IOException {
        int closedPort;
        try (ServerSocket socket = new ServerSocket(0)) {
            closedPort = socket.getLocalPort();
        }
        HttpPlanAnalyzerClient unreachable = new HttpPlanAnalyzerClient("http://127.0.0.1:" + closedPort, TOKEN,
                Duration.ofSeconds(1), Duration.ofSeconds(2), 2, 10, JsonMapper.builder().build());
        assertThatThrownBy(() -> unreachable.analyze(request()))
                .isInstanceOfSatisfying(PlanAnalyzerException.class, e -> {
                    assertThat(e.kind()).isEqualTo(Kind.CONNECTION_FAILED);
                    assertThat(e.getMessage()).doesNotContain(TOKEN);
                });
    }

    @Test
    void 인증_거절_요청_거절_내부_오류_JSON_아님을_구분한다() {
        handler = exchange -> reply(exchange, 401, "{\"errors\":[{\"code\":\"UNAUTHORIZED\"}]}");
        assertKind(Kind.AUTH_FAILED, "UNAUTHORIZED");
        handler = exchange -> reply(exchange, 413, "{\"errors\":[{\"code\":\"FILE_TOO_LARGE\"}]}");
        assertKind(Kind.REJECTED, "FILE_TOO_LARGE");
        handler = exchange -> reply(exchange, 500, "{\"errors\":[{\"code\":\"SHA_MISMATCH\"}]}");
        assertKind(Kind.SERVER_ERROR, "SHA_MISMATCH");
        handler = exchange -> reply(exchange, 200, "<html>not json</html>");
        assertKind(Kind.BAD_RESPONSE, null);
        handler = exchange -> reply(exchange, 200, "{\"status\":\"OK_REVIEW_REQUIRED\"}");
        assertKind(Kind.BAD_RESPONSE, null);
        // 4xx·5xx·응답 오류는 재시도하지 않는다 (5개 시도 = 5회 호출)
        assertThat(calls.get()).isEqualTo(5);
    }

    void assertKind(Kind kind, String code) {
        assertThatThrownBy(() -> client(Duration.ofSeconds(5)).analyze(request()))
                .isInstanceOfSatisfying(PlanAnalyzerException.class, e -> {
                    assertThat(e.kind()).isEqualTo(kind);
                    assertThat(e.analyzerCode()).isEqualTo(code);
                    assertThat(e.getMessage()).doesNotContain(TOKEN);
                });
    }

    @Test
    void 미설정_Client는_항상_NOT_CONFIGURED() {
        UnconfiguredPlanAnalyzerClient unconfigured = new UnconfiguredPlanAnalyzerClient();
        assertThat(unconfigured.configured()).isFalse();
        assertThatThrownBy(() -> unconfigured.analyze(request()))
                .isInstanceOfSatisfying(PlanAnalyzerException.class, e -> assertThat(e.kind()).isEqualTo(Kind.NOT_CONFIGURED));
    }
}
