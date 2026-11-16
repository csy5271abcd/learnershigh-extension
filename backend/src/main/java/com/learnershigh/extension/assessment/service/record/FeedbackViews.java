package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.FeedbackRequestResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.Snapshot;
import com.learnershigh.extension.assessment.entity.FeedbackRequest;
import com.learnershigh.extension.assessment.entity.FeedbackSnapshotItem;
import com.learnershigh.extension.assessment.repository.FeedbackSnapshotItemRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import org.springframework.stereotype.Component;

/** 피드백 요청 → 계약 DTO (학생 §31) */
@Component
public class FeedbackViews {

    private final FeedbackSnapshotItemRepository snapshotItems;
    private final AssessmentTimes times;

    public FeedbackViews(FeedbackSnapshotItemRepository snapshotItems, AssessmentTimes times) {
        this.snapshotItems = snapshotItems;
        this.times = times;
    }

    public Snapshot snapshot(FeedbackRequest request) {
        return new Snapshot(request.noteRevisionId(), snapshotItems.findByRequestId(request.id()).stream()
                .map(FeedbackSnapshotItem::artifactVersionId).toList(), true);
    }

    public FeedbackRequestResponse forStudent(FeedbackRequest request) {
        return new FeedbackRequestResponse(request.id(), request.status(), times.toOffset(request.requestedAt()),
                snapshot(request));
    }
}
