package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.entity.AssessmentNote;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.assessment.service.AdminStudentScope;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import org.springframework.stereotype.Component;

/**
 * 학생 기록의 대상(학교 수행평가) 소유·접근 확인. 학생은 본인 수행평가만, 관리자는 담당 지점 학생만(AdminStudentScope).
 * 다른 학생 ID·없는 ID는 같은 404로 응답한다(존재 여부를 드러내지 않는다).
 */
@Component
public class StudentRecordAccess {

    private final SchoolAssessmentRepository assessments;
    private final AdminStudentScope adminScope;

    public StudentRecordAccess(SchoolAssessmentRepository assessments, AdminStudentScope adminScope) {
        this.assessments = assessments;
        this.adminScope = adminScope;
    }

    /** 이번 범위의 대상 유형은 SCHOOL_ASSESSMENT 하나다(심화 Task 폐기, 2026-11-03). */
    public static void requireSourceType(String sourceType) {
        if (!AssessmentNote.SOURCE_SCHOOL_ASSESSMENT.equals(sourceType)) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR,
                    new FieldViolation("sourceType", "unsupported"));
        }
    }

    public SchoolAssessment ownedAssessment(String studentId, String sourceType, String sourceId) {
        requireSourceType(sourceType);
        return assessments.findOwned(sourceId, studentId)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND));
    }

    public void requireReadable(AdminActor admin, String studentId) {
        adminScope.requireReadable(admin, studentId);
    }

    public SchoolAssessment assessment(String assessmentId) {
        return assessments.findById(assessmentId)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND));
    }
}
