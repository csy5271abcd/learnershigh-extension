package com.learnershigh.extension.assessment.integration.analysis;

import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerException.Kind;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Test-only analyzer that answers with an analyzer envelope (status + JSON body) in process.
 * It replaces the removed HTTP analyzer stub server: the service-level rules (PARTIAL, SHA check, contract 0.3,
 * FAILED runs, 4xx/5xx mapping) are still exercised through the same envelope shape.
 */
public class StubPlanAnalyzer implements PlanAnalyzerClient {

    public record Reply(int status, String body) {

        public static Reply ok(String body) {
            return new Reply(200, body);
        }
    }

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private final Function<Request, Reply> handler;
    public final AtomicInteger calls = new AtomicInteger();
    public final AtomicReference<Request> lastRequest = new AtomicReference<>();

    public StubPlanAnalyzer(Function<Request, Reply> handler) {
        this.handler = handler;
    }

    @Override
    public boolean configured() {
        return true;
    }

    @Override
    public Result analyze(Request request) {
        calls.incrementAndGet();
        lastRequest.set(request);
        Reply reply = handler.apply(request);
        JsonNode root = parse(reply.body());
        String code = root == null ? null : firstErrorCode(root);
        int status = reply.status();
        if (status == 503) {
            throw new PlanAnalyzerException(Kind.BUSY, code, "analyzer busy");
        }
        boolean envelope03 = "0.3".equals(request.contract()) && root != null && text(root.path("status")) != null
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
        Integer elapsed = root.path("elapsedMs").isNumber() ? root.path("elapsedMs").asInt() : null;
        return new Result(text(root.path("requestId")), envelopeStatus, text(root.path("analyzerVersion")),
                text(root.path("analyzerChannel")), sha, elapsed, text(backendImport.path("variant")),
                backendImport.path("importable").asBoolean(false), codes(backendImport.path("blockers")),
                payload.isObject() ? MAPPER.writeValueAsString(payload) : null, texts(root.path("warnings")),
                codes(root.path("errors")), status, text(root.path("contractVersion")), text(root.path("analyzerStatus")));
    }

    private static JsonNode parse(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            return MAPPER.readTree(body);
        } catch (JacksonException notJson) {
            return null;
        }
    }

    private static String firstErrorCode(JsonNode root) {
        JsonNode errors = root.path("errors");
        return errors.isArray() && !errors.isEmpty() ? text(errors.get(0).path("code")) : null;
    }

    private static List<String> codes(JsonNode array) {
        List<String> out = new ArrayList<>();
        array.forEach(node -> {
            String code = text(node.path("code"));
            if (code != null) {
                out.add(code);
            }
        });
        return List.copyOf(out);
    }

    private static List<String> texts(JsonNode array) {
        List<String> out = new ArrayList<>();
        array.forEach(node -> {
            String value = text(node);
            if (value != null) {
                out.add(value);
            }
        });
        return List.copyOf(out);
    }

    private static String text(JsonNode node) {
        return node != null && node.isString() ? node.asString() : null;
    }
}
