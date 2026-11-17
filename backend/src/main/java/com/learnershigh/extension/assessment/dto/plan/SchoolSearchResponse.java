package com.learnershigh.extension.assessment.dto.plan;

import java.util.List;

/**
 * GET /api/admin/assessment/schools (A5 DRAFT 계약 §38-3). 전체 학교 목록이 아니다.
 * coverage=REGISTERED_PLANS_ONLY: 평가계획서가 등록된 학교만 돌려준다. masterConnected=false: 학교 Master(1팀 통합)가 아직 연결되지 않았다.
 * name은 학업 Context에서 확인될 때만 채우고 nameSource로 출처를 밝힌다(지어낸 이름 없음). 목록에 없는 학교도 schoolId로 운영할 수 있다(OD-A08).
 */
public record SchoolSearchResponse(String coverage, boolean masterConnected, List<Item> items, boolean truncated) {

    public record Item(String schoolId, String name, String nameSource, long planCount, Integer latestAcademicYear) {
    }
}
