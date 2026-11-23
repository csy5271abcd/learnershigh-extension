package com.learnershigh.extension.assessment.service;

import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.assessment.integration.roster.AssessmentStudentDirectory;
import org.springframework.stereotype.Component;

/**
 * 관리자 학생 접근 범위 검사 (domain.md §17, api-contract.md §34·§55).
 * 학생의 지점은 기존 LearnersHigh 학생 정보(AssessmentStudentDirectory → ExistingStudentClient, 개발용 시연 명단은 플래그 ON일 때만)로 확인한다. Query의 branchId로 범위를 넓히지 않는다.
 * 범위 밖 학생과 없는 학생은 구분하지 않고 같은 404로 응답한다(다른 지점 학생 존재 여부를 드러내지 않는다).
 */
@Component
public class AdminStudentScope {

    private final AssessmentStudentDirectory students;

    public AdminStudentScope(AssessmentStudentDirectory students) {
        this.students = students;
    }

    public void requireReadable(AdminActor admin, String studentId) {
        boolean inScope = admin.branchIds().stream()
                .anyMatch(branchId -> students.findStudent(branchId, studentId).isPresent());
        if (!inScope) {
            throw new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND, "학생 기록을 찾을 수 없습니다.");
        }
    }
}
