package com.learnershigh.extension.assessment.entity;

/** §12 evaluationItemRef: 확인된 평가계획서 Revision + 과목 + 항목 Key. 자동 매핑 규칙은 미합의(§12)라 Key의 의미를 해석하지 않는다. */
public record EvaluationItemRef(String documentRevisionId, String subjectId, String itemKey) {
}
