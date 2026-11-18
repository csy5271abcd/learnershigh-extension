package com.learnershigh.extension.assessment.dto.plan;

import java.util.List;

/**
 * 학교알리미 불러오기 결과. 파일마다 등록·분석 결과 또는 건너뛴 이유.
 *
 * @param jobId      불러오기 작업 번호 (GET …/import-from-schoolinfo/{jobId} 로 진행 상황을 다시 읽는다)
 * @param state      RUNNING(분석 중) · DONE
 * @param schoolName 학교알리미의 학교 이름
 * @param done       분석이 끝난 문서 수 (진행바)
 * @param total      등록된 문서 수
 * @param files      받은 파일 (평가계획이 아니거나 다른 학기 파일은 skipped). analysisStatus: QUEUED · ANALYZING · 분석 결과 상태 · FAILED
 */
public record SchoolInfoImportResponse(String jobId, String state, String schoolName, int done, int total, List<File> files) {

    public record File(String fileName, Integer grade, String planId, String documentRevisionId, String analysisStatus,
            Integer subjects, boolean skipped, String message) {
    }
}
