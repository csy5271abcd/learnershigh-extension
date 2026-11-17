package com.learnershigh.extension.assessment.dto.plan;

import java.util.List;

/**
 * 학교알리미 불러오기 결과. 파일마다 등록·분석 결과 또는 건너뛴 이유.
 *
 * @param schoolName 학교알리미의 학교 이름
 * @param files      받은 파일 (평가계획이 아니거나 다른 학기 파일은 skipped)
 */
public record SchoolInfoImportResponse(String schoolName, List<File> files) {

    public record File(String fileName, Integer grade, String planId, String documentRevisionId, String analysisStatus,
            Integer subjects, boolean skipped, String message) {
    }
}
