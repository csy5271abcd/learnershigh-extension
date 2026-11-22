package com.learnershigh.extension.assessment.dto.plan;

import java.util.List;

/**
 * §38-15 (A27-UX 부록 O) 학교알리미 공식 학교 검색. 평가계획서가 0건인 학교도 나온다. 학적·학생을 만들지 않는다.
 * complete=false 이면 검색 결과를 다 읽지 못했다(incompleteReason) — 화면은 자동 선택하지 않고, 그 검색의 후보는 고를 수 없다.
 * candidateId 는 서버가 이 검색에서 발급한 값(10분 유효). schoolId 는 이미 이 학교알리미 학교를 쓰는 학교 키(없으면 null).
 */
public record SchoolDirectorySearchResponse(String query, boolean complete, String incompleteReason, List<Item> items) {

    public record Item(String candidateId, String officialName, String sido, String sigungu, String address,
            String schoolinfoSchoolId, String schoolId, boolean selectable, String unselectableReason) {
    }
}
