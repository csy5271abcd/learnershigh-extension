package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.FeedbackReply;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackReplyRepository extends JpaRepository<FeedbackReply, String> {
}
