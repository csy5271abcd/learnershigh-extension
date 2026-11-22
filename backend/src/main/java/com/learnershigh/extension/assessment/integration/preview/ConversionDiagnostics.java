package com.learnershigh.extension.assessment.integration.preview;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

/**
 * 변환 실패 진단 요약 (A27). LibreOffice 콘솔 마지막 줄과 H2Orestart 가져오기 로그({@code import_*.log})에서
 * 예외 종류·첫 위치만 뽑는다. 예: {@code exit=0; office=Error: source file could not be loaded;
 * filter=NullPointerException at soffice.ConvEquation.addFormula}.
 * 문서 내용이 섞이지 않도록 영문·숫자·일부 기호만 남기고 200자로 자른다(한글 본문·파일명은 남지 않는다).
 */
final class ConversionDiagnostics {

    private static final int MAX = 200;

    private ConversionDiagnostics() {
    }

    static String summarize(int exitCode, Path work) {
        List<String> parts = new ArrayList<>();
        parts.add("exit=" + exitCode);
        String office = lastNonBlank(read(work.resolve("console.txt")));
        if (office != null) {
            parts.add("office=" + office);
        }
        String filter = filterFailure(work);
        if (filter != null) {
            parts.add("filter=" + filter);
        }
        return safe(String.join("; ", parts));
    }

    /** H2Orestart 로그의 "Failed to convert document. <예외>: …" 줄과 그 뒤 첫 "at …" 줄 → "<예외 단순 이름> at <위치>" */
    static String filterFailure(Path work) {
        List<Path> logs = new ArrayList<>();
        for (Path dir : List.of(work.resolve("log").resolve("H2Orestart"), work.resolve("home").resolve(".cache").resolve("H2Orestart"))) {
            if (Files.isDirectory(dir)) {
                try (Stream<Path> files = Files.list(dir)) {
                    files.filter(path -> path.getFileName().toString().endsWith(".log")).forEach(logs::add);
                } catch (IOException ignored) {
                    // 진단만 못 할 뿐 변환 결과에는 영향이 없다
                }
            }
        }
        String lastSevere = null;
        for (Path log : logs) {
            List<String> lines = read(log);
            for (String line : lines) {
                int severe = line.indexOf(") SEVERE: ");
                if (severe > 0 && line.indexOf('(') >= 0) {
                    lastSevere = line.substring(line.indexOf('(') + 1, severe) + " " + line.substring(severe + ") SEVERE: ".length());
                }
            }
            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i);
                int at = line.indexOf("Failed to convert document.");
                if (at < 0) {
                    continue;
                }
                String exception = line.substring(at + "Failed to convert document.".length()).strip();
                int colon = exception.indexOf(':');
                String type = colon > 0 ? exception.substring(0, colon) : exception;
                type = type.substring(type.lastIndexOf('.') + 1);
                String frame = null;
                for (int j = i + 1; j < lines.size() && frame == null; j++) {
                    String candidate = lines.get(j).strip();
                    if (candidate.startsWith("at ")) {
                        frame = candidate.substring(3).replaceAll("\\(.*$", "");
                    }
                }
                return frame == null ? type : type + " at " + frame;
            }
        }
        // 예외 기록 없이 끝난 경우: 마지막 SEVERE 기록(구성 요소 + 메시지 앞부분)을 단서로 남긴다
        return lastSevere == null ? null : "lastSevere " + (lastSevere.length() > 120 ? lastSevere.substring(0, 120) : lastSevere);
    }

    static String safe(String text) {
        String cleaned = text.replaceAll("[^A-Za-z0-9 ._:;=()/<>-]", "").replaceAll("\\s+", " ").strip();
        return cleaned.length() > MAX ? cleaned.substring(0, MAX) : cleaned;
    }

    private static String lastNonBlank(List<String> lines) {
        for (int i = lines.size() - 1; i >= 0; i--) {
            if (!lines.get(i).isBlank()) {
                return lines.get(i).strip();
            }
        }
        return null;
    }

    private static List<String> read(Path file) {
        try {
            if (!Files.isRegularFile(file) || Files.size(file) > 2_000_000) {
                return List.of();
            }
            return Files.readAllLines(file, StandardCharsets.UTF_8);
        } catch (IOException | java.io.UncheckedIOException exception) {
            return List.of();
        }
    }
}
