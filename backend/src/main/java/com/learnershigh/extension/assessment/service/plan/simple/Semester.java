package com.learnershigh.extension.assessment.service.plan.simple;

import com.learnershigh.extension.assessment.service.plan.extract.SourceTable;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 학기 구분: 파일 이름이 한 학기만 말하면, 다른 학기라고 적힌 표는 그 계획서의 대상이 아니다. */
final class Semester {

    private Semester() {
    }

    private static final Pattern FILE = Pattern.compile("([12])\\s*학기");
    /** 표 바로 앞 제목 줄: '가. 1학기', '1) 2학기', '2학기' */
    private static final Pattern TITLE = Pattern.compile("^\\s*(?:[가-하]\\.|\\d+\\)|\\(\\d\\))?\\s*([12])\\s*학\\s*기\\s*$");
    private static final Pattern CELL = Pattern.compile("^([12])학기$");

    /** 파일 이름이 '2학기'만 말하면 "1학기", '1학기'만 말하면 "2학기". 둘 다거나 없으면 null. */
    static String otherOf(String fileName) {
        Matcher m = FILE.matcher(fileName == null ? "" : fileName);
        String found = null;
        while (m.find()) {
            if (found != null && !found.equals(m.group(1))) {
                return null;
            }
            found = m.group(1);
        }
        return found == null ? null : ("1".equals(found) ? "2" : "1") + "학기";
    }

    /** 제목 줄(ctx 마지막 줄)이 학기만 말하면 그 학기. */
    static String ofTitle(String ctx) {
        if (ctx == null || ctx.isBlank()) {
            return null;
        }
        String[] lines = ctx.strip().split("\\R");
        Matcher m = TITLE.matcher(lines[lines.length - 1]);
        return m.find() ? m.group(1) + "학기" : null;
    }

    /** 표의 학기: 제목 줄, 또는 첫 열 칸이 '1 학 기'처럼 학기만 적힌 경우. */
    static String of(SourceTable t) {
        String s = ofTitle(t.ctx());
        if (s != null) {
            return s;
        }
        for (var row : t.cells()) {
            if (!row.isEmpty()) {
                Matcher m = CELL.matcher(Words.norm(row.get(0)));
                if (m.find()) {
                    return m.group(1) + "학기";
                }
            }
        }
        return null;
    }
}
