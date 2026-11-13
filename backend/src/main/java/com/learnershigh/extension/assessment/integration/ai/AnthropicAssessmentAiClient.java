package com.learnershigh.extension.assessment.integration.ai;

import com.anthropic.client.AnthropicClient;
import com.anthropic.errors.AnthropicInvalidDataException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.BadRequestException;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.StructuredMessage;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.learnershigh.extension.assessment.exception.AssessmentAiErrorCode;
import com.learnershigh.extension.common.error.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Claude API(Anthropic 공식 Java SDK) 구현 (P-31 PROPOSED). Structured Output으로 Schema를 강제한다.
 * 원문·응답 본문은 로그에 남기지 않는다 (backend.md §20). 오류는 종류와 HTTP 상태만 기록한다.
 */
public class AnthropicAssessmentAiClient implements AssessmentAiClient {

    private static final Logger log = LoggerFactory.getLogger(AnthropicAssessmentAiClient.class);

    private final AnthropicClient client;
    private final String model;
    private final long maxTokens;

    public AnthropicAssessmentAiClient(AnthropicClient client, String model, long maxTokens) {
        this.client = client;
        this.model = model;
        this.maxTokens = maxTokens;
    }

    @Override
    public boolean configured() {
        return true;
    }

    @Override
    public String provider() {
        return "anthropic";
    }

    @Override
    public String model() {
        return model;
    }

    @Override
    public <T> T generate(String instructions, String input, Class<T> schema) {
        StructuredMessageCreateParams<T> params = MessageCreateParams.builder()
                .model(model)
                .maxTokens(maxTokens)
                .system(instructions)
                .outputConfig(schema)
                .addUserMessage(input)
                .build();
        StructuredMessage<T> message;
        try {
            message = client.messages().create(params);
        } catch (BadRequestException exception) {
            log.warn("Assessment AI request rejected: status={}", exception.statusCode());
            throw new BusinessException(AssessmentAiErrorCode.AI_OUTPUT_INVALID, "AI 분석 요청이 거절됐어요. 입력 크기나 형식을 확인해 주세요.");
        } catch (AnthropicServiceException exception) {
            log.warn("Assessment AI provider error: status={}", exception.statusCode());
            throw new BusinessException(AssessmentAiErrorCode.ASSESSMENT_AI_UNAVAILABLE);
        } catch (AnthropicInvalidDataException exception) {
            log.warn("Assessment AI output did not match schema: {}", schema.getSimpleName());
            throw new BusinessException(AssessmentAiErrorCode.AI_OUTPUT_INVALID);
        } catch (RuntimeException exception) {
            log.warn("Assessment AI call failed: {}", exception.getClass().getSimpleName());
            throw new BusinessException(AssessmentAiErrorCode.ASSESSMENT_AI_UNAVAILABLE);
        }
        if (message.stopReason().isPresent() && StopReason.REFUSAL.equals(message.stopReason().get())) {
            throw new BusinessException(AssessmentAiErrorCode.AI_REFUSED);
        }
        if (message.stopReason().isPresent() && StopReason.MAX_TOKENS.equals(message.stopReason().get())) {
            // 잘린 JSON을 결과로 쓰지 않는다
            throw new BusinessException(AssessmentAiErrorCode.AI_OUTPUT_INVALID, "AI 응답이 너무 길어 중간에 끊겼어요. 문서를 나눠 다시 분석해 주세요.");
        }
        try {
            return message.content().stream()
                    .flatMap(block -> block.text().stream())
                    .map(text -> text.text())
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(AssessmentAiErrorCode.AI_OUTPUT_INVALID));
        } catch (AnthropicInvalidDataException exception) {
            throw new BusinessException(AssessmentAiErrorCode.AI_OUTPUT_INVALID);
        }
    }
}
