package com.learnershigh.extension.assessment.dto.plan;

/** §38-15 학교 선택 결과: 그 학교의 학교 키와 최근 3개 학년도 자동 확인 작업(§38-12 응답 그대로). */
public record SchoolDirectorySelectionResponse(String schoolId, String schoolName, String sido, String sigungu, String address,
        String schoolinfoSchoolId, SchoolInfoSyncResponse sync) {
}
