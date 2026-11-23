package com.learnershigh.extension.assessment.service.school;

import com.learnershigh.extension.assessment.dto.school.EvaluationItemRefDto;
import com.learnershigh.extension.assessment.dto.school.SchoolAssessmentResponse;
import com.learnershigh.extension.assessment.entity.EvaluationItemRef;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import org.springframework.stereotype.Component;

/** SchoolAssessment → §12 응답. Student / Admin이 같은 Mapper를 쓴다 (같은 Identity·상태). */
@Component
public class SchoolAssessmentMapper {

    private final AssessmentTimes times;

    public SchoolAssessmentMapper(AssessmentTimes times) {
        this.times = times;
    }

    public SchoolAssessmentResponse toResponse(SchoolAssessment assessment) {
        EvaluationItemRef ref = assessment.evaluationItemRef();
        return new SchoolAssessmentResponse(assessment.id(), assessment.title(), assessment.subjectId(),
                assessment.status().name(), assessment.deadlineDate(), times.toOffset(assessment.createdAt()),
                ref == null ? null : new EvaluationItemRefDto(ref.documentRevisionId(), ref.subjectId(), ref.itemKey()),
                assessment.description(), assessment.assessmentType() == null ? null : assessment.assessmentType().name(),
                assessment.evaluationDate(), assessment.weightPercent(), assessment.submissions(),
                assessment.personalMemo(), times.toOffset(assessment.updatedAt()), assessment.assessmentTypeLabel(),
                assessment.isOfficial() ? new SchoolAssessmentResponse.Official(assessment.officialPlanId(), assessment.officialStatus(),
                        assessment.officialTiming(), assessment.officialWeightPercent(), assessment.officialMaxScore()) : null);
    }
}
