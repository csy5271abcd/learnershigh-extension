package com.learnershigh.extension.assessment.service.ai;

import com.learnershigh.extension.assessment.dto.ai.AiAnalysisResponse;
import com.learnershigh.extension.assessment.dto.ai.AiAnalysisResponse.AiSource;
import com.learnershigh.extension.assessment.dto.ai.AiProviderStatusResponse;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.EvaluationPlanResult;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.MockExamResult;
import com.learnershigh.extension.assessment.dto.ai.AiSchemas.UniversityExamResult;
import com.learnershigh.extension.assessment.dto.ai.MockExamAnalysisRequest;
import com.learnershigh.extension.assessment.exception.AssessmentAiErrorCode;
import com.learnershigh.extension.assessment.integration.ai.AssessmentAiClient;
import com.learnershigh.extension.common.error.BusinessException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Assessment AI 분석 3종 (api-contract.md §47-A PROPOSED, P-31).
 * 흐름: 입력 검증 → (PDF) 쪽별 텍스트 추출 → Provider 구조화 분석 → 원본 대조(AiEvidenceVerifier) → REVIEW_REQUIRED 응답.
 * 결과를 저장·공개하지 않는다. 관리자 검토·확정·반영은 화면(Stage 1 Mock Store)에서 따로 한다 — 학생 기록은 건드리지 않는다.
 * 같은 Idempotency-Key·같은 원본의 재요청은 진행 중이거나 끝난 같은 결과를 돌려준다 (메모리 보관, 서버 재시작 시 사라짐).
 */
@Service
public class AssessmentAiService {

    static final String EVALUATION_PLAN_INSTRUCTIONS = """
            너는 한국 고등학교 '학교 평가계획서' PDF에서 평가 구조를 추출하는 보조 도구다. 결과는 관리자가 원본과 대조해 검토하는 후보다.
            규칙:
            - 입력의 [PDF p.N] 표시가 PDF 물리 쪽 번호다. pdfPage에는 이 N을 쓴다. 문서에 인쇄된 쪽 번호가 보이면 printedPage에 그대로 적고, 없으면 빈 문자열.
            - 원문에 실제로 적힌 값만 쓴다. 비율·배점·만점·시기를 추정하거나 계산해 만들지 않는다. 없으면 found=false, value="", pdfPage=0, evidenceQuote="".
            - evidenceQuote에는 그 값이 나온 원문 구절을 글자 그대로(최대 80자) 옮긴다. 바꿔 쓰지 않는다.
            - 합계가 맞지 않아도 고치지 않는다. 표가 깨져 읽기 어려운 부분은 unreadableNotes에 쪽 번호와 함께 적는다.
            - 과목마다 subjects 항목을 하나씩 만든다. 지필평가와 수행평가를 구분한다.
            """;

    static final String UNIVERSITY_EXAM_INSTRUCTIONS = """
            너는 대학 입학처가 공개한 논술·면접 기출/예시 문항 PDF를 문항 단위로 나누고, 고등학생 심화 탐구 아이디어를 제안하는 보조 도구다.
            결과는 관리자가 검토하는 후보다.
            규칙:
            - [PDF p.N] 표시가 PDF 물리 쪽 번호다. startPage·endPage·intentPages·basisPages에는 이 N을 쓴다. 한 문항이 여러 쪽에 걸칠 수 있다.
            - 문항의 시작·끝을 확실히 판단하지 못하면 boundaryConfident=false로 둔다.
            - evidenceQuote에는 문항 시작 부분 원문을 글자 그대로(최대 60자) 옮긴다.
            - 출제 의도·출제 근거가 문서에 따로 있을 때만 intentPages·basisPages에 쪽을 적고, 없으면 빈 배열.
            - 문서에 없는 사실(정답, 채점 결과, 합격 기준)을 만들지 않는다. 그림·도표가 핵심인데 텍스트로 알 수 없으면 limitations에 적는다.
            - inquiryTopics·referenceCandidates는 제안이며, 실존 여부를 확인하지 못한 특정 논문·기사 제목을 만들지 말고 자료 유형(예: 통계청 인구 통계)으로 적는다.
            """;

    static final String MOCK_EXAM_INSTRUCTIONS = """
            너는 고등학교 모의고사 국어·영어 지문을 읽고 학생 심화 탐구 소재와 주제를 제안하는 보조 도구다. 결과는 관리자가 골라 고치는 후보다.
            규칙:
            - 지문에 근거한 개념·주장만 쓴다. 지문에서 도출하기 어려우면 sufficient=false와 이유를 쓰고 억지로 채우지 않는다 (목록은 빈 배열 가능).
            - topics는 최대 3개. 실존 여부를 확인하지 못한 특정 논문·책 제목을 만들지 않는다.
            - 학생 개인정보를 요구하거나 만들지 않는다.
            """;

    private static final int CACHE_LIMIT = 200;

    private final AssessmentAiClient client;
    private final PdfTextExtractor extractor;
    private final Clock clock;
    private final ZoneId zone;
    private final Map<String, Entry> idempotency = new LinkedHashMap<>();

    private record Entry(String fingerprint, CompletableFuture<AiAnalysisResponse<?>> future) {
    }

    public AssessmentAiService(AssessmentAiClient client, PdfTextExtractor extractor, Clock clock, @Value("${app.zone:Asia/Seoul}") String zone) {
        this.client = client;
        this.extractor = extractor;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
    }

    public AiProviderStatusResponse status() {
        return new AiProviderStatusResponse(client.configured(), client.provider(), client.model(), false, PdfTextExtractor.MAX_BYTES, PdfTextExtractor.MAX_PAGES);
    }

    public AiAnalysisResponse<?> analyzeEvaluationPlan(String idempotencyKey, String fileName, byte[] pdf, String hint) {
        requireConfigured();
        return once(idempotencyKey, "EVALUATION_PLAN:" + PdfTextExtractor.sha256(pdf), () -> {
            PdfTextExtractor.PdfText text = extractor.extract(pdf);
            String input = hintLine(hint) + text.withPageMarkers();
            EvaluationPlanResult result = client.generate(EVALUATION_PLAN_INSTRUCTIONS, input, EvaluationPlanResult.class);
            AiEvidenceVerifier verifier = new AiEvidenceVerifier(text.pages());
            verifier.evaluationPlan(result);
            List<String> warnings = new ArrayList<>(verifier.warnings());
            addSparseWarning(warnings, text);
            return response("EVALUATION_PLAN", source(fileName, text), result, verifier, warnings);
        });
    }

    public AiAnalysisResponse<?> analyzeUniversityExam(String idempotencyKey, String fileName, byte[] pdf, String hint) {
        requireConfigured();
        return once(idempotencyKey, "UNIVERSITY_EXAM:" + PdfTextExtractor.sha256(pdf), () -> {
            PdfTextExtractor.PdfText text = extractor.extract(pdf);
            String input = hintLine(hint) + text.withPageMarkers();
            UniversityExamResult result = client.generate(UNIVERSITY_EXAM_INSTRUCTIONS, input, UniversityExamResult.class);
            AiEvidenceVerifier verifier = new AiEvidenceVerifier(text.pages());
            verifier.universityExam(result);
            List<String> warnings = new ArrayList<>(verifier.warnings());
            addSparseWarning(warnings, text);
            return response("UNIVERSITY_EXAM", source(fileName, text), result, verifier, warnings);
        });
    }

    public AiAnalysisResponse<?> analyzeMockExam(String idempotencyKey, MockExamAnalysisRequest request) {
        // 원문 이용 조건 확인 전에는 외부 Provider로 보내지 않는다 (API-OD-A11)
        if (!Boolean.TRUE.equals(request.aiTransferConfirmed())) throw new BusinessException(AssessmentAiErrorCode.AI_TRANSFER_NOT_ALLOWED);
        requireConfigured();
        String passage = request.passageText().replace("\r\n", "\n").strip();
        String sha = PdfTextExtractor.sha256(passage.getBytes(StandardCharsets.UTF_8));
        return once(idempotencyKey, "MOCK_EXAM:" + sha, () -> {
            String input = "과목: " + request.subjectName()
                    + "\n시험: " + nullToDash(request.academicYear()) + "학년도 " + nullToDash(request.examMonth()) + "월 고" + nullToDash(request.grade())
                    + " " + (request.questionNumber() == null ? "" : request.questionNumber())
                    + (request.fieldHint() == null || request.fieldHint().isBlank() ? "" : "\n관심 분야: " + request.fieldHint())
                    + "\n\n[지문]\n" + passage;
            MockExamResult result = client.generate(MOCK_EXAM_INSTRUCTIONS, input, MockExamResult.class);
            List<String> warnings = new ArrayList<>();
            if (!result.sufficient()) warnings.add("AI가 지문만으로는 탐구 주제를 충분히 도출하기 어렵다고 판단했어요: " + result.insufficientReason());
            return new AiAnalysisResponse<>(newId(), "MOCK_EXAM", "REVIEW_REQUIRED", client.provider(), client.model(),
                    new AiSource(null, sha, 0, 0, passage.length()), result, List.of(), List.copyOf(warnings), now());
        });
    }

    private void requireConfigured() {
        if (!client.configured()) throw new BusinessException(AssessmentAiErrorCode.AI_PROVIDER_NOT_CONFIGURED);
    }

    /** 같은 Key 재요청은 같은 결과(진행 중이면 그 결과를 기다림). 같은 Key에 다른 원본이면 409. 실패한 요청은 다시 시도할 수 있게 지운다 */
    private AiAnalysisResponse<?> once(String key, String fingerprint, Supplier<AiAnalysisResponse<?>> work) {
        if (key == null || key.isBlank()) return work.get();
        CompletableFuture<AiAnalysisResponse<?>> mine = new CompletableFuture<>();
        CompletableFuture<AiAnalysisResponse<?>> existing;
        synchronized (idempotency) {
            Entry entry = idempotency.get(key);
            if (entry != null && !entry.fingerprint().equals(fingerprint)) throw new BusinessException(AssessmentAiErrorCode.IDEMPOTENCY_KEY_REUSED);
            existing = entry == null ? null : entry.future();
            if (existing == null) {
                if (idempotency.size() >= CACHE_LIMIT) idempotency.remove(idempotency.keySet().iterator().next());
                idempotency.put(key, new Entry(fingerprint, mine));
            }
        }
        if (existing != null) {
            try {
                return existing.join();
            } catch (CompletionException exception) {
                throw exception.getCause() instanceof RuntimeException runtime ? runtime : exception;
            }
        }
        try {
            AiAnalysisResponse<?> response = work.get();
            mine.complete(response);
            return response;
        } catch (RuntimeException exception) {
            synchronized (idempotency) {
                idempotency.remove(key);
            }
            mine.completeExceptionally(exception);
            throw exception;
        }
    }

    private AiAnalysisResponse<?> response(String kind, AiSource source, Object result, AiEvidenceVerifier verifier, List<String> warnings) {
        long unverified = verifier.checks().stream().filter(check -> !check.verified()).count();
        if (unverified > 0) warnings.add(0, "근거를 원문에서 확인하지 못한 값이 " + unverified + "개 있어요. 해당 값은 '근거 확인 필요'로 표시돼요.");
        return new AiAnalysisResponse<>(newId(), kind, "REVIEW_REQUIRED", client.provider(), client.model(), source, result, verifier.checks(), List.copyOf(warnings), now());
    }

    private static void addSparseWarning(List<String> warnings, PdfTextExtractor.PdfText text) {
        List<Integer> sparse = text.sparsePages();
        if (!sparse.isEmpty()) {
            warnings.add("글자가 거의 없는 쪽(이미지·도표 위주)이 있어 텍스트만으로는 충분히 분석하지 못했을 수 있어요: PDF p." + sparse);
        }
    }

    private static AiSource source(String fileName, PdfTextExtractor.PdfText text) {
        return new AiSource(fileName, text.sha256(), text.pages().size(), text.textPageCount(), text.characterCount());
    }

    private static String hintLine(String hint) {
        return hint == null || hint.isBlank() ? "" : "[관리자 메모: " + hint.strip() + "]\n";
    }

    private static String nullToDash(Integer value) {
        return value == null ? "—" : String.valueOf(value);
    }

    private String newId() {
        return "ai_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    private String now() {
        return OffsetDateTime.now(clock.withZone(zone)).withNano(0).toString();
    }
}
