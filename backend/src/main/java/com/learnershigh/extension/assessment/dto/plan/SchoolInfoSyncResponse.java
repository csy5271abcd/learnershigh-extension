package com.learnershigh.extension.assessment.dto.plan;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * §38-12 응답 (A27-UX 부록 E). 작업(state) · 학년도(yearStatuses) · 18개 슬롯(slotStatuses) 상태를 따로 준다.
 * 슬롯 status 는 수집, analysisStatus 는 분석 — 섞지 않는다. 검토·확정은 기존 §38·§39 응답이 알려 준다.
 */
public record SchoolInfoSyncResponse(String jobId, String schoolId, List<Integer> requestedAcademicYears, String state,
        List<YearStatus> yearStatuses, List<SlotStatus> slotStatuses, Counts counts, List<UnresolvedFile> unresolvedFiles,
        SchoolSelection schoolSelection) {

    /** 부록 F §38-13: 학교 식별 상태. null 이면 선택이 필요 없다. */
    public record SchoolSelection(boolean required, String reason, List<Candidate> candidates, Selected selected, long mappingVersion) {
    }

    /** candidateId 는 이 작업 안에서만 쓰는 서버 값(학교알리미 학교 ID 를 주지 않는다). */
    public record Candidate(String candidateId, String schoolName, String sido, String sigungu, String address, boolean selectable,
            String unselectableReason) {
    }

    public record Selected(String schoolName, String sido, String sigungu, String address, OffsetDateTime selectedAt, long version) {
    }

    public record YearStatus(int academicYear, String status, Integer resolvedSourceYear, OffsetDateTime checkedAt,
            String message, Long elapsedMillis) {
    }

    public record SlotStatus(int academicYear, int grade, int semester, String status, int sourceFileCount,
            int registeredPlanCount, String analysisStatus) {
    }

    /**
     * @param downloads  이번 작업에서 학교알리미에서 받은 파일 수(ZIP 안 파일 포함)
     * @param reused     그중 이미 기록된 원본(같은 SHA)이라 새로 등록하지 않은 수
     */
    public record Counts(int expectedSlots, int verifiedSlots, int uniqueSourceFiles, int registeredPlans, int slotLinks,
            int downloads, int reused, int analysisCompleted) {
    }

    /** group: SOURCE_VERIFICATION(출처·학년도 확인 필요 — 수동 분류 불가) · CLASSIFICATION(§38-14 로 분류 가능) · OTHER */
    public record UnresolvedFile(int academicYear, String fileName, String sha256, String status, String reason, String sourceFileId,
            String group) {
    }
}
