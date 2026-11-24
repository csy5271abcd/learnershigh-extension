package com.learnershigh.extension.assessment.integration.analysis;

import com.learnershigh.extension.assessment.service.plan.LocalPlanAnalyzer;
import com.learnershigh.extension.assessment.service.plan.extract.ScanOcr;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

/**
 * 평가계획서 분석기 선택.
 * <ul>
 *   <li>{@code local}(기본): 서버 안에서 표를 읽어 분석한다. 원문이 밖으로 나가지 않고 토큰도 필요 없다.</li>
 *   <li>{@code none}: 분석기 미설정(503). 시험 기본값.</li>
 * </ul>
 * 예전 외부 분석기(HTTP {@code /analyze-preview}) 연결은 2026-11-19 에 걷어 냈다 — 같은 공개 PDF 에서 서버 안 분석이
 * 더 많이 읽고(비율을 읽은 과목 4 → 113), 원문을 외부로 보내지 않기 때문이다.
 */
@Configuration
public class PlanAnalyzerConfig {

    private static final Logger log = LoggerFactory.getLogger(PlanAnalyzerConfig.class);

    @Bean
    PlanAnalyzerClient planAnalyzerClient(
            @Value("${assessment.analyzer.mode:local}") String mode,
            @Value("${assessment.analyzer.timeout-millis:130000}") long timeoutMillis,
            @Value("${assessment.analyzer.ocr:auto}") String ocrMode,
            @Value("${assessment.analyzer.extractor:rules}") String extractor,
            @Value("${assessment.analyzer.llm-fallback:none}") String llmFallback,
            @Value("${assessment.analyzer.gemini-model:}") String geminiModel,
            JsonMapper mapper) {
        if ("none".equalsIgnoreCase(mode)) {
            return new UnconfiguredPlanAnalyzerClient();
        }
        if (!"local".equalsIgnoreCase(mode)) {
            throw new IllegalStateException("assessment.analyzer.mode 는 local 또는 none 이어야 합니다: " + mode);
        }
        // 스캔본 PDF: auto = Tesseract 가 있으면 Tesseract, Windows 면 내장 OCR, 둘 다 없으면 읽지 않음
        var ocr = ScanOcr.engine(ocrMode);
        // 추출 규칙: rules(기본, extract/) 또는 simple(큰 틀 하나, simple/ — 시험 중)
        boolean simple = "simple".equalsIgnoreCase(extractor);
        log.info("plan analyzer: local (ocr={}, extractor={})", ocr == null ? "none" : ocr.name(), simple ? "simple" : "rules");
        // 규칙으로 확정 못 한 과목만 Gemini로 다시 읽기 (기본 꺼짐). 키는 환경 변수 GEMINI_API_KEY 로만 받는다
        com.learnershigh.extension.assessment.service.plan.PlanTaskRefiner refiner = null;
        String key = System.getenv("GEMINI_API_KEY");
        if ("gemini".equalsIgnoreCase(llmFallback)) {
            if (key == null || key.isBlank() || geminiModel.isBlank()) {
                log.warn("plan analyzer: llm-fallback=gemini 이지만 GEMINI_API_KEY 또는 gemini-model 이 없어 끔");
            } else {
                refiner = new GeminiPlanTaskRefiner(java.net.http.HttpClient.newHttpClient(), mapper, key, geminiModel, java.time.Duration.ofSeconds(60));
                log.info("plan analyzer: llm-fallback=gemini model={}", geminiModel);
            }
        }
        return new LocalPlanAnalyzer(mapper, timeoutMillis, ocr, simple, refiner);
    }
}
