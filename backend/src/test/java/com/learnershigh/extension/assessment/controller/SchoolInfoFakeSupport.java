package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.integration.schoolinfo.FakeSchoolInfoServer;
import com.learnershigh.extension.support.MySqlContainerConfig;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * 학교알리미 IT 공통 (A27-UX 부록 E). 실제 {@code SchoolInfoClient}를 <b>가상 학교알리미(127.0.0.1)</b>에 붙인다 — 실제 학교알리미 접속 없음.
 * 두 시험 클래스가 같은 설정을 써서 Spring Context·MySQL 컨테이너를 하나만 띄운다.
 * 분석은 서버 안 local(OCR 끔) — 합성 문서라 분석 결과는 수집 결과와 따로 본다.
 * 연도 지정 조회는 이 가상 서버에서만 신뢰(year-query-verified=true). 기본 설정(false)은 별도 단언으로 본다.
 */
@Tag("integration")
@SpringBootTest(properties = {
        "assessment.analyzer.mode=local",
        "assessment.analyzer.ocr=none",
        "assessment.schoolinfo.allow-loopback=true",
        "assessment.schoolinfo.year-query-verified=true",
        "assessment.schoolinfo.polite-delay-millis=0",
        "assessment.schoolinfo.retry-base-millis=1"})
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Import(MySqlContainerConfig.class)
abstract class SchoolInfoFakeSupport {

    static final FakeSchoolInfoServer FAKE;

    static {
        try {
            FAKE = new FakeSchoolInfoServer();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void schoolInfo(DynamicPropertyRegistry registry) {
        registry.add("assessment.schoolinfo.base-url", FAKE::baseUrl);
    }
}
