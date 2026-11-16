package com.learnershigh.extension.assessment.service.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.assessment.dto.ai.AiAnalysisResponse;
import com.learnershigh.extension.assessment.dto.ai.AiAnalysisResponse.EvidenceCheck;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.AchievementStandard;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.AiField;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.EvaluationPlanResult;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.ExamQuestion;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.MockExamResult;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.PerformanceArea;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.SubjectPlan;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.UniversityExamResult;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.WrittenExam;
import com.learnershigh.extension.assessment.dto.ai.MockExamAnalysisRequest;
import com.learnershigh.extension.assessment.integration.ai.AssessmentAiClient;
import com.learnershigh.extension.assessment.integration.ai.UnconfiguredAssessmentAiClient;
import com.learnershigh.extension.common.error.BusinessException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

/**
 * AI 분석 Service: 실제 PDF(PDFBox로 생성) → 쪽별 추출 → 고정 Provider 응답 → 원본 대조.
 * Provider는 Test용 고정 응답이다 (실제 AI 호출 아님). 검증 대상은 서버의 추출·대조·차단·중복 방지 규칙이다.
 */
class AssessmentAiServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-16T00:00:00Z"), ZoneId.of("Asia/Seoul"));

    /** 호출 횟수를 세는 고정 응답 Provider */
    static final class FixedClient implements AssessmentAiClient {
        final AtomicInteger calls = new AtomicInteger();
        final Object result;

        FixedClient(Object result) {
            this.result = result;
        }

        @Override
        public boolean configured() {
            return true;
        }

        @Override
        public String provider() {
            return "test-fixed";
        }

        @Override
        public String model() {
            return "fixed";
        }

        @Override
        public <T> T generate(String instructions, String input, Class<T> schema) {
            calls.incrementAndGet();
            assertThat(input).contains("[PDF p.1]");
            return schema.cast(result);
        }
    }

    static byte[] pdf(String... pageTexts) throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (String text : pageTexts) {
                PDPage page = new PDPage();
                document.addPage(page);
                if (text == null) continue;
                try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                    stream.beginText();
                    stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                    stream.newLineAtOffset(50, 700);
                    for (String line : text.split("\n")) {
                        stream.showText(line);
                        stream.newLineAtOffset(0, -14);
                    }
                    stream.endText();
                }
            }
            document.save(out);
            return out.toByteArray();
        }
    }

    static AiField found(String value, int page, String quote) {
        return new AiField(true, value, page, "", quote);
    }

    static AiField none() {
        return new AiField(false, "", 0, "", "");
    }

    static final String PAGE_1 = "Garam High School 2026 Grade 1 Semester 2 Evaluation Plan\nKorean: written exam 60% performance 40%";
    static final String PAGE_2 = "Performance assessment: essay writing 20% (max 20 points)\nPresentation 15% in November";

    EvaluationPlanResult planResult() {
        SubjectPlan korean = new SubjectPlan(
                found("Korean", 1, "Korean: written exam"),
                found("60", 1, "written exam 60%"),
                found("40", 1, "performance 40%"),
                List.of(new WrittenExam(found("Midterm", 3, "Midterm"), none(), found("30", 3, "30%"), none())),
                List.of(
                        new PerformanceArea(found("essay writing", 2, "essay writing 20%"), none(), none(), found("20", 2, "essay writing 20%"), found("20", 2, "max 20 points"), List.of()),
                        new PerformanceArea(found("Presentation", 2, "Presentation 15%"), none(), found("November", 2, "in November"), found("15", 2, "Presentation 15%"), none(), List.of())),
                List.<AchievementStandard>of(),
                List.of(),
                List.of(),
                List.of());
        return new EvaluationPlanResult(found("Garam High School", 1, "Garam High School"), found("2026", 1, "2026"), found("1", 1, "Grade 1"),
                found("2", 1, "Semester 2"), List.of(korean), List.of());
    }

    @Test
    void evaluationPlanVerifiesEvidenceAgainstExtractedPagesAndNeverAutoCorrectsSums() throws IOException {
        FixedClient client = new FixedClient(planResult());
        AssessmentAiService service = new AssessmentAiService(client, new PdfTextExtractor(), CLOCK, "Asia/Seoul");

        AiAnalysisResponse<?> response = service.analyzeEvaluationPlan(null, "plan.pdf", pdf(PAGE_1, PAGE_2), null);

        assertThat(response.status()).isEqualTo("REVIEW_REQUIRED");
        assertThat(response.source().pageCount()).isEqualTo(2);
        assertThat(response.source().sha256()).hasSize(64);
        // 원문에 있는 근거는 확인됨
        assertThat(check(response, "subjects[0].writtenExamTotalRatio").verified()).isTrue();
        assertThat(check(response, "subjects[0].performanceAreas[0].maxScore").verified()).isTrue();
        // 문서에 없는 3쪽을 근거로 댄 값은 확인 실패
        EvidenceCheck outOfRange = check(response, "subjects[0].writtenExams[0].ratio");
        assertThat(outOfRange.verified()).isFalse();
        assertThat(outOfRange.reason()).contains("범위 밖");
        // 수행 영역 합(35) ≠ 수행 전체(40): 경고만, 값은 그대로
        assertThat(response.warnings()).anySatisfy(warning -> assertThat(warning).contains("35").contains("40"));
        assertThat(response.warnings()).anySatisfy(warning -> assertThat(warning).contains("근거를 원문에서 확인하지 못한 값"));
        EvaluationPlanResult result = (EvaluationPlanResult) response.result();
        assertThat(result.subjects().get(0).performanceTotalRatio().value()).isEqualTo("40");
    }

    @Test
    void fabricatedQuoteIsMarkedUnverified() throws IOException {
        EvaluationPlanResult base = planResult();
        EvaluationPlanResult fabricated = new EvaluationPlanResult(found("Hanbit High School", 1, "Hanbit High School"), base.academicYear(), base.grade(), base.semester(), base.subjects(), List.of());
        AssessmentAiService service = new AssessmentAiService(new FixedClient(fabricated), new PdfTextExtractor(), CLOCK, "Asia/Seoul");

        AiAnalysisResponse<?> response = service.analyzeEvaluationPlan(null, "plan.pdf", pdf(PAGE_1, PAGE_2), null);

        assertThat(check(response, "schoolName").verified()).isFalse();
    }

    @Test
    void numericValueMissingFromEvidencePageIsUnverified() throws IOException {
        EvaluationPlanResult base = planResult();
        SubjectPlan subject = base.subjects().get(0);
        SubjectPlan wrongNumber = new SubjectPlan(subject.subjectName(), found("70", 1, "written exam 60%"), subject.performanceTotalRatio(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
        EvaluationPlanResult result = new EvaluationPlanResult(base.schoolName(), base.academicYear(), base.grade(), base.semester(), List.of(wrongNumber), List.of());
        AssessmentAiService service = new AssessmentAiService(new FixedClient(result), new PdfTextExtractor(), CLOCK, "Asia/Seoul");

        AiAnalysisResponse<?> response = service.analyzeEvaluationPlan(null, "plan.pdf", pdf(PAGE_1, PAGE_2), null);

        assertThat(check(response, "subjects[0].writtenExamTotalRatio").verified()).isFalse();
        assertThat(response.warnings()).anySatisfy(warning -> assertThat(warning).contains("70").contains("40"));
    }

    @Test
    void universityExamChecksQuestionPageRangesAndBoundaryConfidence() throws IOException {
        UniversityExamResult result = new UniversityExamResult(List.of(
                new ExamQuestion("1", "Population", 1, 2, true, List.of(), List.of(2), "Question 1. Read the passage", List.of("statistics"), List.of(), "analysis", List.of(), List.of()),
                new ExamQuestion("2", "Energy", 2, 5, false, List.of(9), List.of(), "Question 2", List.of(), List.of(), "", List.of(), List.of())),
                List.of());
        AssessmentAiService service = new AssessmentAiService(new FixedClient(result), new PdfTextExtractor(), CLOCK, "Asia/Seoul");

        AiAnalysisResponse<?> response = service.analyzeUniversityExam(null, "snu.pdf", pdf("Question 1. Read the passage about population", "Question 2 energy"), null);

        assertThat(response.evidenceChecks().get(0).verified()).isTrue();
        assertThat(response.evidenceChecks().get(1).verified()).isFalse();
        assertThat(response.evidenceChecks().get(1).reason()).contains("쪽 범위");
        assertThat(response.warnings()).anySatisfy(warning -> assertThat(warning).contains("문항 2").contains("확신하지 못했어요"));
    }

    @Test
    void imageOnlyPdfIsRejectedInsteadOfFakeResult() throws IOException {
        FixedClient client = new FixedClient(planResult());
        AssessmentAiService service = new AssessmentAiService(client, new PdfTextExtractor(), CLOCK, "Asia/Seoul");

        assertThatThrownBy(() -> service.analyzeEvaluationPlan(null, "scan.pdf", pdf((String) null), null))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).errorCode().code())
                .isEqualTo("PDF_TEXT_NOT_FOUND");
        assertThat(client.calls).hasValue(0);
    }

    @Test
    void nonPdfIsRejected() {
        AssessmentAiService service = new AssessmentAiService(new FixedClient(planResult()), new PdfTextExtractor(), CLOCK, "Asia/Seoul");

        assertThatThrownBy(() -> service.analyzeEvaluationPlan(null, "a.pdf", "not a pdf".getBytes(), null))
                .extracting(error -> ((BusinessException) error).errorCode().code())
                .isEqualTo("UNSUPPORTED_FILE_TYPE");
    }

    @Test
    void unconfiguredProviderFailsWithoutFakeResult() throws IOException {
        AssessmentAiService service = new AssessmentAiService(new UnconfiguredAssessmentAiClient(), new PdfTextExtractor(), CLOCK, "Asia/Seoul");

        assertThat(service.status().configured()).isFalse();
        assertThatThrownBy(() -> service.analyzeEvaluationPlan(null, "plan.pdf", pdf(PAGE_1), null))
                .extracting(error -> ((BusinessException) error).errorCode().code())
                .isEqualTo("AI_PROVIDER_NOT_CONFIGURED");
    }

    @Test
    void sameIdempotencyKeyReturnsSameAnalysisAndCallsProviderOnce() throws IOException {
        FixedClient client = new FixedClient(planResult());
        AssessmentAiService service = new AssessmentAiService(client, new PdfTextExtractor(), CLOCK, "Asia/Seoul");
        byte[] file = pdf(PAGE_1, PAGE_2);

        AiAnalysisResponse<?> first = service.analyzeEvaluationPlan("key-1", "plan.pdf", file, null);
        AiAnalysisResponse<?> second = service.analyzeEvaluationPlan("key-1", "plan.pdf", file, null);

        assertThat(second.analysisId()).isEqualTo(first.analysisId());
        assertThat(client.calls).hasValue(1);
        assertThatThrownBy(() -> service.analyzeEvaluationPlan("key-1", "other.pdf", pdf("Different document text here"), null))
                .extracting(error -> ((BusinessException) error).errorCode().code())
                .isEqualTo("IDEMPOTENCY_KEY_REUSED");
    }

    @Test
    void mockExamPassageIsNotSentWithoutTransferConfirmation() {
        FixedClient client = new FixedClient(null);
        AssessmentAiService service = new AssessmentAiService(client, new PdfTextExtractor(), CLOCK, "Asia/Seoul");
        MockExamAnalysisRequest request = new MockExamAnalysisRequest("영어", 2026, 3, 1, "22번", null, "x".repeat(60), false);

        assertThatThrownBy(() -> service.analyzeMockExam(null, request))
                .extracting(error -> ((BusinessException) error).errorCode().code())
                .isEqualTo("AI_TRANSFER_NOT_ALLOWED");
        assertThat(client.calls).hasValue(0);
    }

    @Test
    void mockExamInsufficientResultIsReportedAsWarning() {
        MockExamResult insufficient = new MockExamResult(false, "지문이 너무 짧아요", "", List.of(), List.of(), List.of(), List.of(), List.of());
        AssessmentAiClient client = new AssessmentAiClient() {
            @Override
            public boolean configured() {
                return true;
            }

            @Override
            public String provider() {
                return "test-fixed";
            }

            @Override
            public String model() {
                return "fixed";
            }

            @Override
            public <T> T generate(String instructions, String input, Class<T> schema) {
                assertThat(input).contains("[지문]");
                return schema.cast(insufficient);
            }
        };
        AssessmentAiService service = new AssessmentAiService(client, new PdfTextExtractor(), CLOCK, "Asia/Seoul");

        AiAnalysisResponse<?> response = service.analyzeMockExam(null, new MockExamAnalysisRequest("국어", 2026, 6, 2, "18번", null, "가".repeat(80), true));

        assertThat(response.status()).isEqualTo("REVIEW_REQUIRED");
        assertThat(response.source().characterCount()).isEqualTo(80);
        assertThat(response.warnings()).singleElement().asString().contains("지문이 너무 짧아요");
    }

    private static EvidenceCheck check(AiAnalysisResponse<?> response, String path) {
        return response.evidenceChecks().stream().filter(item -> item.path().equals(path)).findFirst().orElseThrow();
    }
}
