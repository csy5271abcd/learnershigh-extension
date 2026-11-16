package com.learnershigh.extension.assessment.integration.context;

import java.util.Optional;

/**
 * 학생 학교·학년·학기·과목 Context 경계. 실제 원천(기존 LearnersHigh 또는 Extension)은 OD-A04 미결이다.
 * 확정되면 구현체만 바꾼다.
 */
public interface AcademicContextProvider {

    Optional<AcademicContextRecord> find(String studentId, int academicYear, int semester);

    /**
     * 학교·학년도·학년·학기 슬롯의 과목 Context. 평가계획서 검토 확정 시 관리자가 고른 과목 ID가 그 문서 슬롯의 과목인지 검증하는 데만 쓴다
     * (api-contract §39 "확인 결과의 공개 범위는 학교·학년도·학년·학기로 제한"). 없으면 empty.
     */
    Optional<AcademicContextRecord> findSlot(String schoolId, int academicYear, int grade, int semester);
}
