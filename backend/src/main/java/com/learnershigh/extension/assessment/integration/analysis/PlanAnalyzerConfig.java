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
        return new LocalPlanAnalyzer(mapper, timeoutMillis, ocr, simple);
    }
}
