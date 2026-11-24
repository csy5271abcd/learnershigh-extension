package com.learnershigh.extension.assessment.integration.analysis;

import com.learnershigh.extension.assessment.service.plan.PlanTaskRefiner;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Gemini generateContent(글만 보내고 JSON으로 받음). 이미지·파일은 보내지 않는다.
 * 토큰을 줄이려고: 확인 필요 과목만, 그 과목 표 글만(SectionText), 짧은 지시문, 응답 스키마로 출력 고정.
 */
public class GeminiPlanTaskRefiner implements PlanTaskRefiner {

    private static final Logger log = LoggerFactory.getLogger(GeminiPlanTaskRefiner.class);

    static final String PROMPT = """
            아래는 고등학교 평가계획서에서 한 과목의 평가 표를 읽은 글이다(칸은 | 로 구분, 긴 칸은 …로 줄임).
            이 과목의 평가를 JSON으로만 답하라. subject=과목명, examPercent=지필(정기시험) 반영비율 합, performancePercent=수행평가 반영비율 합,
            tasks=수행평가 과제마다 {name: 원문 과제명, percent: 반영비율}. 영역·단원·평가 유형(서술형 등)·채점 요소는 과제명이 아니다.
            없으면 빈 배열. 문서에 없는 값은 만들지 말라.
            ---
            """;

    static final Map<String, Object> SCHEMA = Map.of(
            "type", "OBJECT",
            "properties", Map.of(
                    "subject", Map.of("type", "STRING"),
                    "examPercent", Map.of("type", "NUMBER"),
                    "performancePercent", Map.of("type", "NUMBER"),
                    "tasks", Map.of("type", "ARRAY", "items", Map.of("type", "OBJECT",
                            "properties", Map.of("name", Map.of("type", "STRING"), "percent", Map.of("type", "NUMBER")),
                            "required", List.of("name", "percent")))),
            "required", List.of("subject", "examPercent", "performancePercent", "tasks"));

    private final HttpClient http;
    private final JsonMapper mapper;
    private final String apiKey;
    private final String model;
    private final Duration timeout;

    public GeminiPlanTaskRefiner(HttpClient http, JsonMapper mapper, String apiKey, String model, Duration timeout) {
        this.http = http;
        this.mapper = mapper;
        this.apiKey = apiKey;
        this.model = model;
        this.timeout = timeout;
    }

    String body(String section) {
        return mapper.writeValueAsString(Map.of(
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", PROMPT + section)))),
                "generationConfig", Map.of("responseMimeType", "application/json", "responseSchema", SCHEMA, "temperature", 0)));
    }

    @Override
    public Optional<Refined> refine(String section) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body(section), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (res.statusCode() != 200) {
                log.warn("gemini refine failed status={}", res.statusCode());
                return Optional.empty();
            }
            return parse(res.body());
        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.warn("gemini refine failed cause={}", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    Optional<Refined> parse(String responseBody) {
        JsonNode root = mapper.readTree(responseBody);
        JsonNode text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        if (!text.isString()) {
            return Optional.empty();
        }
        JsonNode j = mapper.readTree(text.asString());
        List<Task> tasks = new ArrayList<>();
        for (JsonNode t : j.path("tasks")) {
            tasks.add(new Task(t.path("name").asString(""), t.path("percent").asDouble(0)));
        }
        JsonNode usage = root.path("usageMetadata");
        log.info("gemini refine tokens in={} out={}", usage.path("promptTokenCount").asInt(0), usage.path("candidatesTokenCount").asInt(0));
        return Optional.of(new Refined(j.path("subject").asString(""), j.path("examPercent").asDouble(0), j.path("performancePercent").asDouble(0),
                tasks, usage.path("promptTokenCount").asInt(0), usage.path("candidatesTokenCount").asInt(0)));
    }
}
