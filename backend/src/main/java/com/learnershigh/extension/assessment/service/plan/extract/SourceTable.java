package com.learnershigh.extension.assessment.service.plan.extract;

import java.util.List;

/**
 * 원문 표 하나 (형식 공통). cells[r][c]: 병합 칸은 같은 글자를 펼친 값.
 *
 * @param page     PDF 쪽(1부터). HWP·HWPX 는 null
 * @param section  HWP·HWPX 구역(0부터). PDF 는 null
 * @param path     HWP·HWPX 표 위치 경로(원문 구조). PDF 는 null
 * @param cellPaths HWP·HWPX 칸 위치 경로 [r][c] (원문 근거 documentLocator 용). PDF 는 null
 * @param ctx      표 바로 앞 본문 글자(최대 400자) — 과목명·제목을 찾는 데 쓴다
 */
public record SourceTable(Integer page, Integer section, String path, List<List<String>> cells,
        List<List<String>> cellPaths, String ctx) {

    public String text() {
        StringBuilder sb = new StringBuilder();
        for (List<String> row : cells) {
            sb.append(String.join(" ", row)).append(' ');
        }
        return sb.toString();
    }
}
