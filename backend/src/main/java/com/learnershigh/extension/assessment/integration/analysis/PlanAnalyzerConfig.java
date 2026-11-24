package com.learnershigh.extension.assessment.integration.analysis;

import com.learnershigh.extension.assessment.service.plan.LocalPlanAnalyzer;
import com.learnershigh.extension.assessment.service.plan.extract.ScanOcr;
import java.net.URI;
import java.time.Duration;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

/**
 * 평가계획서 분석기 선택 (PR #18 내부 분석기 통합, 2026-11-19 A27-UX).
 * <ul>
 *   <li>{@code local}(기본): 서버 안에서 표를 읽어 분석한다({@link LocalPlanAnalyzer}). 원문이 서버 밖으로 나가지 않고 토큰도 필요 없다.</li>
 *   <li>{@code none}: 분석기 미설정(503). Backend 시험 기본값.</li>
 *   <li>{@code loopback-stub}: <b>E2E 전용</b> — 같은 컴퓨터(127.0.0.1·localhost·::1)에 뜬 합성 Stub 분석기에만 연결한다.
 *       다른 주소면 시작을 거부한다(원격 분석기·Railway로 원문을 보낼 수 없다). 토큰은 시험용 값을 설정으로 받는다.</li>
 * </ul>
 * 예전 외부 분석기(Railway HTTP {@code /analyze-preview}) 연결은 퇴역했다 — {@code http} 모드는 없다. Railway 원격 서비스 자체는 이 저장소가 지우지 않는다.
 */
@Configuration
public class PlanAnalyzerConfig {

    private static final Logger log = LoggerFactory.getLogger(PlanAnalyzerConfig.class);
    private static final Set<String> LOOPBACK = Set.of("127.0.0.1", "localhost", "[::1]", "::1");

    @Bean
    PlanAnalyzerClient planAnalyzerClient(
            @Value("${assessment.analyzer.mode:local}") String mode,
            @Value("${assessment.analyzer.timeout-millis:130000}") long timeoutMillis,
            @Value("${assessment.analyzer.ocr:auto}") String ocrMode,
            @Value("${assessment.analyzer.extractor:rules}") String extractor,
            @Value("${assessment.analyzer.stub.base-url:}") String stubBaseUrl,
            @Value("${assessment.analyzer.stub.token:}") String stubToken,
            JsonMapper mapper) {
        if ("none".equalsIgnoreCase(mode)) {
            log.info("plan analyzer: none (503)");
            return new UnconfiguredPlanAnalyzerClient();
        }
        if ("loopback-stub".equalsIgnoreCase(mode)) {
            String host = stubBaseUrl.isBlank() ? "" : String.valueOf(URI.create(stubBaseUrl.strip()).getHost());
            if (!LOOPBACK.contains(host) || stubToken.isBlank()) {
                throw new IllegalStateException(
                        "assessment.analyzer.mode=loopback-stub 은 127.0.0.1·localhost 의 시험용 Stub 주소와 시험 토큰이 있어야 합니다");
            }
            log.info("plan analyzer: loopback-stub (E2E only)");
            return new HttpPlanAnalyzerClient(stubBaseUrl.strip(), stubToken, Duration.ofSeconds(5),
                    Duration.ofMillis(timeoutMillis), 0, 0, mapper);
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
