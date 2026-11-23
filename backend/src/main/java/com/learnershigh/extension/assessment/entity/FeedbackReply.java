package com.learnershigh.extension.assessment.entity;

import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.common.error.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;

/**
 * 관리자 답변 (api-contract.md §45). DRAFT는 관리자 내부 초안이라 학생에게 보이지 않는다.
 * DELIVERED가 되면 더 바꿀 수 없다(재답변·수정 정책 미정 → 덮어쓰기 금지, 409 FEEDBACK_ALREADY_DELIVERED).
 */
@Entity
@Table(name = "assessment_feedback_reply")
public class FeedbackReply {

    public static final String DRAFT = "DRAFT";
    public static final String DELIVERED = "DELIVERED";

    @Id
    @Column(name = "request_id", length = 64)
    private String requestId;

    @Column(name = "admin_id", nullable = false, length = 64)
    private String adminId;

    @Column(name = "state", nullable = false, length = 20)
    private String state;

    @Column(name = "overall_comment", nullable = false, columnDefinition = "TEXT")
    private String overallComment;

    @Column(name = "comments_json", nullable = false, columnDefinition = "JSON")
    private String commentsJson;

    @Column(name = "recommendations_json", nullable = false, columnDefinition = "JSON")
    private String recommendationsJson;

    @Column(name = "draft_saved_at", nullable = false)
    private Instant draftSavedAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected FeedbackReply() {
    }

    public static FeedbackReply draft(String requestId, String adminId, String overallComment, String commentsJson,
            String recommendationsJson, Instant now) {
        FeedbackReply reply = new FeedbackReply();
        reply.requestId = requestId;
        reply.state = DRAFT;
        reply.write(adminId, overallComment, commentsJson, recommendationsJson, now);
        return reply;
    }

    public void saveDraft(String adminId, String overallComment, String commentsJson, String recommendationsJson,
            Instant now) {
        requireDraft();
        write(adminId, overallComment, commentsJson, recommendationsJson, now);
    }

    /** 전달 직전 본문으로 덮어쓰고 DELIVERED로 바꾼다. 요청 상태 전이는 같은 Transaction의 Service가 함께 한다. */
    public void deliver(String adminId, String overallComment, String commentsJson, String recommendationsJson,
            Instant now) {
        requireDraft();
        write(adminId, overallComment, commentsJson, recommendationsJson, now);
        state = DELIVERED;
        deliveredAt = now;
    }

    private void requireDraft() {
        if (!DRAFT.equals(state)) {
            throw new BusinessException(AssessmentErrorCode.FEEDBACK_ALREADY_DELIVERED);
        }
    }

    private void write(String adminId, String overallComment, String commentsJson, String recommendationsJson,
            Instant now) {
        this.adminId = adminId;
        this.overallComment = overallComment;
        this.commentsJson = commentsJson;
        this.recommendationsJson = recommendationsJson;
        this.draftSavedAt = now;
    }

    public boolean isDelivered() {
        return DELIVERED.equals(state);
    }

    public String requestId() {
        return requestId;
    }

    public String overallComment() {
        return overallComment;
    }

    public String commentsJson() {
        return commentsJson;
    }

    public String recommendationsJson() {
        return recommendationsJson;
    }

    public Instant draftSavedAt() {
        return draftSavedAt;
    }

    public Instant deliveredAt() {
        return deliveredAt;
    }
}
