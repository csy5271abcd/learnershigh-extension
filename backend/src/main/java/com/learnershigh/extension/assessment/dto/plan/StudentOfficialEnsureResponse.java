package com.learnershigh.extension.assessment.dto.plan;

import java.util.List;

/**
 * §10-1-3 부록 K 학생 진입 자동 확보 결과. 학교알리미 후보·주소·학교 ID 는 담지 않는다(학교 선택은 관리자만).
 *
 * @param state RUNNING · READY · SCHOOL_CONFIRMATION_REQUIRED · SCHOOL_IDENTITY_REQUIRED · NO_CONTEXT · FAILED
 */
public record StudentOfficialEnsureResponse(String state, boolean schoolSelectionRequired, List<Year> years, String message,
        boolean viewSelected) {

    /** 부록 O 이전 모양. viewSelected=true: 학생이 고른 동명 학교(선생님 확인 전)의 원본을 확인한 결과 */
    public StudentOfficialEnsureResponse(String state, boolean schoolSelectionRequired, List<Year> years, String message) {
        this(state, schoolSelectionRequired, years, message, false);
    }

    public record Year(int academicYear, String status) {
    }
}
