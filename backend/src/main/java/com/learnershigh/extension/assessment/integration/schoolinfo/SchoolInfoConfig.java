package com.learnershigh.extension.assessment.integration.schoolinfo;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** 학교알리미 평가계획 파일 받기 Client. */
@Configuration
public class SchoolInfoConfig {

    @Bean
    SchoolInfoClient schoolInfoClient() {
        return new SchoolInfoClient();
    }
}
