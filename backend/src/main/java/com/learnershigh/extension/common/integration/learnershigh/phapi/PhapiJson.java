package com.learnershigh.extension.common.integration.learnershigh.phapi;

import com.learnershigh.extension.common.integration.learnershigh.ExistingIntegrationException;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * phapi 응답 본문 → phapi Record. JSON 형식 오류 / 타입 불일치(예: 숫자 자리에 문자)는 Jackson 예외 대신
 * {@link ExistingIntegrationException}(→ 503)으로 바꾼다. 실제 Adapter는 응답 본문을 이 클래스로만 읽는다.
 */
public final class PhapiJson {

    private PhapiJson() {
    }

    public static <T> T read(ObjectMapper mapper, String body, TypeReference<T> type) {
        if (body == null || body.isBlank()) {
            throw new ExistingIntegrationException("phapi response: empty body");
        }
        try {
            T value = mapper.readValue(body, type);
            if (value == null) {
                throw new ExistingIntegrationException("phapi response: null body");
            }
            return value;
        } catch (JacksonException e) {
            // 원문 본문은 로그 / 예외 메시지에 남기지 않는다(학생 정보가 들어 있다).
            throw new ExistingIntegrationException("phapi response: unreadable JSON (" + e.getClass().getSimpleName() + ")");
        }
    }
}
