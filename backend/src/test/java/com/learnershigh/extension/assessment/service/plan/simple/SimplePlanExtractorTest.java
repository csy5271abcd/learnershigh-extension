package com.learnershigh.extension.assessment.service.plan.simple;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.learnershigh.extension.assessment.service.plan.extract.PlanExtractor;
import com.learnershigh.extension.assessment.service.plan.extract.SourceTable;
import java.util.List;
import org.junit.jupiter.api.Test;

class SimplePlanExtractorTest {

    /** 첫 행이 '정기 시험 (60%) | 수행 평가 (40%)' 머리인 표: 머리 행을 비율 행으로 읽으면 과목이 통째로 빠진다. */
    @Test
    void headerRowWithPercentIsNotRatioRow() {
        String p = "수행 평가 (40%)";
        String e = "정기 시험 (60%)";
        List<List<String>> cells = List.of(
                List.of("평가 종류", e, e, e, e, p, p, p, p, p, "총점"),
                List.of("횟수/영역", "1차(30%)", "1차(30%)", "2차(30%)", "2차(30%)", "설득 글쓰기와 발표", "설득 글쓰기와 발표",
                        "공공 언어 탐구 보고서", "공공 언어 탐구 보고서", "언어 생활 포트폴리오", ""),
                List.of("횟수/영역", "선택형", "논술형", "선택형", "논술형", "논술형", "발표", "프로젝트", "논술형", "언어 생활 포트폴리오", ""),
                List.of("영역 만점(점)", "100", "0", "100", "0", "10", "5", "5", "10", "10", "100"),
                List.of("반영 비율", "30%", "・", "30%", "・", "10%", "5%", "5%", "10%", "10%", "100%"));
        SourceTable t = new SourceTable(14, 0, null, cells, null, "1. 화법과 언어 교수학습 및 평가 계획");
        List<PlanExtractor.Subject> out = SimplePlanExtractor.extract(List.of(t), "06_수일고등학교__1_2학년 운영계획-수일고.pdf", "");
        assertEquals(1, out.size());
        PlanExtractor.Subject s = out.get(0);
        assertEquals("화법과 언어", s.name);
        assertEquals(60.0, s.examPercent);
        assertEquals(40.0, s.performancePercent);
        assertEquals(List.of("설득 글쓰기와 발표", "공공 언어 탐구 보고서", "언어 생활 포트폴리오"),
                s.items.stream().map(PlanExtractor.Item::name).toList());
        assertEquals(List.of(15.0, 15.0, 10.0), s.items.stream().map(PlanExtractor.Item::weightPercent).toList());
        assertTrue(s.check.isEmpty(), s.check.toString());
    }

    @Test
    void schoolShortNameInFileNameIsNotSubject() {
        assertTrue(SimplePlanExtractor.isSchoolShortName("수일고", "06_수일고등학교__0_1학년 운영계획-수일고.pdf"));
        assertFalse(SimplePlanExtractor.isSchoolShortName("논리와 사고", "06_수일고등학교__0_1학년 운영계획-수일고.pdf"));
    }
}
