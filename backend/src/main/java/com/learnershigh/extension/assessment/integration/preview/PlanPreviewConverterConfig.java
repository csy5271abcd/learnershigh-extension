package com.learnershigh.extension.assessment.integration.preview;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * HWP·HWPX 미리보기 변환기 선택 (A25). {@code assessment.preview.converter.mode}:
 * <ul>
 *   <li>{@code none}(기본): 변환하지 않는다 → 미리보기 415, 원본 다운로드만.</li>
 *   <li>{@code docker}: 로컬 Docker로 변환기 이미지(resources/assessment/preview-converter/Dockerfile, 없으면 자동 준비)를 네트워크 없이 실행(개발 PC 권장, A26 기본).</li>
 *   <li>{@code soffice}: LibreOffice+H2Orestart가 설치된 서버에서 soffice를 직접 실행.</li>
 * </ul>
 */
@Configuration
public class PlanPreviewConverterConfig {

    @Bean
    ConverterImageProvisioner converterImageProvisioner(
            @Value("${assessment.preview.converter.docker-executable:docker}") String dockerExecutable,
            @Value("${assessment.preview.converter.docker-image:}") String dockerImage,
            @Value("${assessment.preview.converter.auto-provision:true}") boolean autoProvision) {
        return new ConverterImageProvisioner(dockerExecutable, dockerImage, autoProvision,
                new ConverterImageProvisioner.ProcessCommandRunner(), java.time.Clock.systemUTC());
    }

    /** A26: Backend 기동 직후 변환기 이미지를 백그라운드로 준비한다(기동을 막지 않는다). docker 방식 + auto-provision일 때만 */
    @Bean
    org.springframework.context.ApplicationListener<org.springframework.boot.context.event.ApplicationReadyEvent> converterImageWarmup(
            @Value("${assessment.preview.converter.mode:none}") String mode,
            @Value("${assessment.preview.converter.auto-provision:true}") boolean autoProvision,
            ConverterImageProvisioner images) {
        return event -> {
            if (autoProvision && "docker".equalsIgnoreCase(mode == null ? "" : mode.strip())) {
                images.prepareAsync();
            }
        };
    }

    @Bean
    PlanPreviewConverter planPreviewConverter(
            @Value("${assessment.preview.converter.mode:none}") String mode,
            @Value("${assessment.preview.converter.docker-executable:docker}") String dockerExecutable,
            ConverterImageProvisioner images,
            @Value("${assessment.preview.converter.soffice-path:soffice}") String sofficePath,
            @Value("${assessment.preview.converter.timeout-seconds:90}") long timeoutSeconds,
            @Value("${assessment.preview.converter.max-source-bytes:20971520}") long maxSourceBytes,
            @Value("${assessment.preview.converter.max-concurrent:2}") int maxConcurrent) {
        Duration timeout = Duration.ofSeconds(Math.max(5, timeoutSeconds));
        return switch (mode == null ? "none" : mode.strip().toLowerCase(java.util.Locale.ROOT)) {
            case "docker" -> new ProcessPlanPreviewConverter(ProcessPlanPreviewConverter.Mode.DOCKER, dockerExecutable,
                    images, timeout, maxSourceBytes, maxConcurrent);
            case "soffice" -> new ProcessPlanPreviewConverter(ProcessPlanPreviewConverter.Mode.SOFFICE, sofficePath,
                    null, timeout, maxSourceBytes, maxConcurrent);
            case "none", "" -> new DisabledPlanPreviewConverter();
            default -> throw new IllegalStateException("assessment.preview.converter.mode must be none, docker or soffice");
        };
    }
}
