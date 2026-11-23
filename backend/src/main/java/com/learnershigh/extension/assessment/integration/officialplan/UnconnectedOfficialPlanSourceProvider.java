package com.learnershigh.extension.assessment.integration.officialplan;

import org.springframework.stereotype.Component;

/**
 * 공식 공개 원본 수집기가 아직 없을 때의 구현 (A27-UX). 어떤 슬롯이든 '연결 안 됨 · 문서 없음'.
 * 부록 K 부터는 {@code SchoolInfoOfficialPlanSource}(@Primary)가 쓰인다 — 이 Bean 은 대체 구현으로 남는다.
 */
@Component
public class UnconnectedOfficialPlanSourceProvider implements OfficialPlanSourceProvider {

    @Override
    public OfficialPlanLookup find(String schoolId, int academicYear, int grade, int semester) {
        return OfficialPlanLookup.unconnected();
    }

    @Override
    public boolean connected() {
        return false;
    }
}
