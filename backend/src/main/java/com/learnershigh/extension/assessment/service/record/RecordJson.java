package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;

/** 학생 기록의 JSON Column(blocks·comments·tags 등) 직렬화. 저장 형식은 항상 JSON 배열이다(DB CHECK와 같음). */
@Component
public class RecordJson {

    private final JsonMapper mapper;

    public RecordJson(JsonMapper mapper) {
        this.mapper = mapper;
    }

    public String write(Object value) {
        return mapper.writeValueAsString(value);
    }

    public ArrayNode array(String json) {
        JsonNode node = mapper.readTree(json == null ? "[]" : json);
        if (!(node instanceof ArrayNode array)) {
            throw new IllegalStateException("stored JSON is not an array");
        }
        return array;
    }

    public List<String> strings(String json) {
        List<String> values = new ArrayList<>();
        for (JsonNode node : array(json)) {
            values.add(node.asString());
        }
        return values;
    }

    public ArrayNode newArray() {
        return mapper.createArrayNode();
    }

    public static BusinessException invalid(String field, String reason) {
        return BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation(field, reason));
    }
}
