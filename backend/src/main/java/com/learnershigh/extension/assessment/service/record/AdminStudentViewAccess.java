package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.common.error.BusinessException;
import org.springframework.stereotype.Component;

/**
 * 관리자 "학생 화면 보기"(읽기 전용, 2026-11-11). 학생으로 로그인·가장하지 않는다.
 * 관리자 담당 범위(지점) 안의 학생일 때만, 그 학생 기준 <b>조회 전용</b> 문맥을 만든다.
 * 이 문맥은 AdminStudentViewController의 GET 조회에만 쓰며 쓰기 Service에 넘기지 않는다.
 * 범위 밖·없는 학생은 구분하지 않고 같은 404.
 */
@Component
public class AdminStudentViewAccess {

    private final AdminStudents students;

    public AdminStudentViewAccess(AdminStudents students) {
        this.students = students;
    }

    public StudentActor readOnlyContext(AdminActor admin, String studentId) {
        return students.find(admin, studentId)
                .map(student -> new StudentActor(student.studentId(), student.branchId()))
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND, "학생 기록을 찾을 수 없습니다."));
    }
}
