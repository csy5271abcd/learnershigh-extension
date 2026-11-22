package com.learnershigh.extension.assessment.integration.analysis;

import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerException.Kind;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * <b>2026-11-19 퇴역(PR #18 통합)</b>: 원격 분석기(Railway) 연결에는 더 이상 쓰지 않는다. {@link PlanAnalyzerConfig}의 E2E 전용
 * {@code loopback-stub} 모드(같은 컴퓨터의 합성 Stub, 주소 검사)에서만 만들어진다. 실제 분석은 서버 안 {@code local}이다.
 *
 * 계정 B 분석기 `POST /analyze-preview` HTTP Client (A3, 2026-11-13). 분석기 코드는 수정하지 않고 현재 계약을 그대로 쓴다.
 * <ul>
 *   <li>analysis-import-0.3 (A8, 2026-11-15): Request.contract가 "0.3"이면 multipart에 contract=0.3을 더한다(계정 B B6 개발 계약).
 *       0.3에서는 분석기가 실패 결과(PARSE_FAILED·UNSUPPORTED_FORMAT)를 HTTP 422 본문의 Envelope로 보내므로, 0.3 요청의 4xx 본문에
 *       Envelope(status·source.sha256·backendImport.payload)가 있으면 오류가 아니라 결과로 돌려준다(HTTP 코드와 분석 상태를 따로 다룬다).
 *       0.2 요청의 4xx 처리는 그대로다.</li>
 *   <li>multipart: file + analyzerVersion + includeAnalysis=false + fileId. 본문을 바이트 배열로 만들어 Content-Length를 보낸다
 *       (분석기는 chunked를 받지 않는다). HTTP/1.1 고정(분석기는 HTTP/2 업그레이드를 모른다).</li>
 *   <li>인증: {@code X-Analysis-Token}. 값은 로그·예외·응답에 넣지 않는다.</li>
 *   <li>재시도: 연결 실패·503 BUSY만 최대 {@code maxRetries}회(짧은 대기). 분석기는 상태를 저장하지 않으므로 같은 요청 재전송은 멱등이다.
 *       Timeout은 재시도하지 않는다(분석기가 아직 처리 중일 수 있어 부하만 늘린다). 4xx·5xx 오류도 재시도하지 않는다.</li>
 * </ul>
 */
public class HttpPlanAnalyzerClient implements PlanAnalyzerClient {

    private static final Logger log = LoggerFactory.getLogger(HttpPlanAnalyzerClient.class);
    static final String TOKEN_HEADER = "X-Analysis-Token";

    private final HttpClient http;
    private final URI endpoint;
    private final String token;
    private final Duration requestTimeout;
    private final int maxRetries;
    private final long retryDelayMillis;
    private final JsonMapper mapper;

    public HttpPlanAnalyzerClient(String baseUrl, String token, Duration connectTimeout, Duration requestTimeout,
            int maxRetries, long retryDelayMillis, JsonMapper mapper) {
        this.endpoint = URI.create(stripTrailingSlash(baseUrl) + "/analyze-preview");
        this.token = token;
        this.requestTimeout = requestTimeout;
        this.maxRetries = Math.max(0, maxRetries);
        this.retryDelayMillis = Math.max(0, retryDelayMillis);
        this.mapper = mapper;
        this.http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(connectTimeout).build();
    }

    @Override
    public boolean configured() {
        return true;
    }

    @Override
    public Result analyze(Request request) {
        String boundary = "lh-analysis-" + UUID.randomUUID();
        byte[] body = multipart(boundary, request);
        HttpRequest httpRequest = HttpRequest.newBuilder(endpoint)
                .timeout(requestTimeout)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .header("Accept", "application/json")
                .header(TOKEN_HEADER, token)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();
        int attempt = 0;
        boolean contract03 = "0.3".equals(request.contract());
        while (true) {
            attempt++;
            try {
                return send(httpRequest, contract03);
            } catch (PlanAnalyzerException failure) {
                boolean retryable = failure.kind() == Kind.CONNECTION_FAILED || failure.kind() == Kind.BUSY;
                if (!retryable || attempt > maxRetries) {
                    log.warn("plan analyzer call failed kind={} code={} attempt={} fileId={}", failure.kind(),
                            failure.analyzerCode(), attempt, request.fileId());
                    throw failure;
                }
                log.info("plan analyzer retry kind={} attempt={} fileId={}", failure.kind(), attempt, request.fileId());
                sleep(retryDelayMillis * attempt);
            }
        }
    }

    private Result send(HttpRequest httpRequest, boolean contract03) {
        HttpResponse<String> response;
        try {
            response = http.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (HttpConnectTimeoutException | ConnectException timeoutOrRefused) {
            throw new PlanAnalyzerException(Kind.CONNECTION_FAILED, null, "analyzer connection failed");
        } catch (HttpTimeoutException timeout) {
            throw new PlanAnalyzerException(Kind.TIMEOUT, null, "analyzer timeout");
        } catch (IOException io) {
            // 연결이 끊기거나 열리지 않음 (ConnectException이 감싸져 오는 경우 포함)
            throw new PlanAnalyzerException(Kind.CONNECTION_FAILED, null, "analyzer connection failed");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new PlanAnalyzerException(Kind.CONNECTION_FAILED, null, "analyzer call interrupted");
        }
        JsonNode root = parse(response.body());
        String code = root == null ? null : firstErrorCode(root);
        int status = response.statusCode();
        if (status == 401) {
            throw new PlanAnalyzerException(Kind.AUTH_FAILED, code, "analyzer rejected token");
        }
        if (status == 503) {
            throw new PlanAnalyzerException(Kind.BUSY, code, "analyzer busy");
        }
        boolean envelope03 = contract03 && root != null && root.isObject() && text(root.path("status")) != null
                && root.path("backendImport").path("payload").isObject();
        if (status >= 400 && status < 500 && !(status == 422 && envelope03)) {
            throw new PlanAnalyzerException(Kind.REJECTED, code, "analyzer rejected request (" + status + ")");
        }
        if (status >= 500) {
            throw new PlanAnalyzerException(Kind.SERVER_ERROR, code, "analyzer error (" + status + ")");
        }
        if (root == null || !root.isObject()) {
            throw new PlanAnalyzerException(Kind.BAD_RESPONSE, null, "analyzer response is not JSON");
        }
        String envelopeStatus = text(root.path("status"));
        String sha = text(root.path("source").path("sha256"));
        if (envelopeStatus == null || sha == null) {
            throw new PlanAnalyzerException(Kind.BAD_RESPONSE, null, "analyzer response missing status/source.sha256");
        }
        JsonNode backendImport = root.path("backendImport");
        JsonNode payload = backendImport.path("payload");
        List<String> blockers = new ArrayList<>();
        backendImport.path("blockers").forEach(blocker -> {
            String blockerCode = text(blocker.path("code"));
            if (blockerCode != null) {
                blockers.add(blockerCode);
            }
        });
        List<String> warnings = new ArrayList<>();
        root.path("warnings").forEach(warning -> {
            String message = text(warning);
            if (message != null) {
                warnings.add(message);
            }
        });
        List<String> errors = new ArrayList<>();
        root.path("errors").forEach(error -> {
            String errorCode = text(error.path("code"));
            if (errorCode != null) {
                errors.add(errorCode);
            }
        });
        Integer elapsed = root.path("elapsedMs").isNumber() ? root.path("elapsedMs").asInt() : null;
        Result result = new Result(text(root.path("requestId")), envelopeStatus, text(root.path("analyzerVersion")),
                text(root.path("analyzerChannel")), sha, elapsed, text(backendImport.path("variant")),
                backendImport.path("importable").asBoolean(false), List.copyOf(blockers),
                payload.isObject() ? mapper.writeValueAsString(payload) : null, List.copyOf(warnings), List.copyOf(errors),
                status, text(root.path("contractVersion")), text(root.path("analyzerStatus")));
        log.info("plan analyzer done requestId={} http={} contract={} status={} variant={} importable={} elapsedMs={} sha={}",
                result.requestId(), status, result.contractVersion(), envelopeStatus, result.variant(), result.importable(), elapsed,
                sha.length() >= 12 ? sha.substring(0, 12) : sha);
        return result;
    }

    private JsonNode parse(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            return mapper.readTree(body);
        } catch (JacksonException notJson) {
            return null;
        }
    }

    private static String firstErrorCode(JsonNode root) {
        JsonNode errors = root.path("errors");
        return errors.isArray() && !errors.isEmpty() ? text(errors.get(0).path("code")) : null;
    }

    private static String text(JsonNode node) {
        return node != null && node.isString() ? node.asString() : null;
    }

    static byte[] multipart(String boundary, Request request) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(request.bytes().length + 1024);
        field(out, boundary, "analyzerVersion", request.analyzerVersion());
        if (request.contract() != null) {
            field(out, boundary, "contract", request.contract());
        }
        field(out, boundary, "includeAnalysis", "false");
        if (request.fileId() != null) {
            field(out, boundary, "fileId", request.fileId());
        }
        write(out, "--" + boundary + "\r\n");
        write(out, "Content-Disposition: form-data; name=\"file\"; filename=\"" + safeFileName(request.fileName()) + "\"\r\n");
        write(out, "Content-Type: application/octet-stream\r\n\r\n");
        out.writeBytes(request.bytes());
        write(out, "\r\n--" + boundary + "--\r\n");
        return out.toByteArray();
    }

    private static void field(ByteArrayOutputStream out, String boundary, String name, String value) {
        write(out, "--" + boundary + "\r\n");
        write(out, "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n");
        write(out, value + "\r\n");
    }

    /** multipart Header에 넣을 파일 이름: 따옴표·줄바꿈·경로 문자를 뺀다(확장자는 분석기 형식 대조에 쓰인다). */
    static String safeFileName(String fileName) {
        String name = fileName == null || fileName.isBlank() ? "plan" : fileName;
        return name.replaceAll("[\\p{Cntrl}\"\\\\/]", "_");
    }

    private static void write(ByteArrayOutputStream out, String text) {
        out.writeBytes(text.getBytes(StandardCharsets.UTF_8));
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }
}
