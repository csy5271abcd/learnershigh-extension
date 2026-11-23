package com.learnershigh.extension.assessment.integration.schoolinfo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 학교알리미 평가계획 파일 받기 Client.
 * 부록 E: 주소는 공식 주소가 기본이고, 루프백(가상 학교알리미)은 {@code assessment.schoolinfo.allow-loopback=true}(시험 전용)일 때만 허용한다.
 */
@Configuration
public class SchoolInfoConfig {

    @Bean
    SchoolInfoClient schoolInfoClient(
            @Value("${assessment.schoolinfo.base-url:" + SchoolInfoClient.OFFICIAL_BASE + "}") String baseUrl,
            @Value("${assessment.schoolinfo.allow-loopback:false}") boolean allowLoopback,
            @Value("${assessment.schoolinfo.polite-delay-millis:500}") long politeDelayMillis,
            @Value("${assessment.schoolinfo.retry-base-millis:1000}") long retryBaseMillis) {
        return new SchoolInfoClient(baseUrl, allowLoopback, politeDelayMillis, retryBaseMillis);
    }
}
