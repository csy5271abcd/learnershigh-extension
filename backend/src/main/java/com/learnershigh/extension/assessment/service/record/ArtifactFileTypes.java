package com.learnershigh.extension.assessment.service.record;

import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * 결과물 허용 형식 (Frontend 선택 목록 `.pdf,.hwp,.hwpx,.doc,.docx,.ppt,.pptx,.xlsx,image/*`와 같다).
 * 확장자와 파일 앞부분 서명이 **둘 다** 맞아야 한다. Content-Type은 클라이언트 값이 아니라 서버가 정한다.
 * 서명 검사는 형식 확인일 뿐 악성코드 검사가 아니다(운영 Storage 결정 대상).
 */
public final class ArtifactFileTypes {

    private static final byte[] PDF = {'%', 'P', 'D', 'F', '-'};
    private static final byte[] OLE = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
    private static final byte[] ZIP = {'P', 'K', 3, 4};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] GIF = {'G', 'I', 'F', '8'};

    private record Rule(byte[] signature, String contentType) {
    }

    private static final Map<String, Rule> RULES = Map.ofEntries(
            Map.entry("pdf", new Rule(PDF, "application/pdf")),
            Map.entry("hwp", new Rule(OLE, "application/x-hwp")),
            Map.entry("hwpx", new Rule(ZIP, "application/hwp+zip")),
            Map.entry("doc", new Rule(OLE, "application/msword")),
            Map.entry("docx", new Rule(ZIP, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
            Map.entry("ppt", new Rule(OLE, "application/vnd.ms-powerpoint")),
            Map.entry("pptx", new Rule(ZIP, "application/vnd.openxmlformats-officedocument.presentationml.presentation")),
            Map.entry("xlsx", new Rule(ZIP, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
            Map.entry("png", new Rule(PNG, "image/png")),
            Map.entry("jpg", new Rule(JPEG, "image/jpeg")),
            Map.entry("jpeg", new Rule(JPEG, "image/jpeg")),
            Map.entry("gif", new Rule(GIF, "image/gif")));

    private ArtifactFileTypes() {
    }

    /** 허용 형식이면 서버가 정한 Content-Type, 아니면 empty */
    public static Optional<String> contentTypeOf(String fileName, byte[] bytes) {
        int dot = fileName == null ? -1 : fileName.lastIndexOf('.');
        if (dot < 0) {
            return Optional.empty();
        }
        Rule rule = RULES.get(fileName.substring(dot + 1).toLowerCase(Locale.ROOT));
        if (rule == null || bytes.length < rule.signature().length
                || !Arrays.equals(Arrays.copyOf(bytes, rule.signature().length), rule.signature())) {
            return Optional.empty();
        }
        return Optional.of(rule.contentType());
    }

    /** 원본 파일명 정리: 경로 구분자·제어문자 제거, 길이 제한. 저장 경로에는 쓰지 않는다(표시·다운로드 이름 전용). */
    public static String safeFileName(String original) {
        String name = original == null ? "" : original;
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
        name = name.replaceAll("[\\p{Cntrl}]", "").strip();
        if (name.length() > 255) {
            int dot = name.lastIndexOf('.');
            String ext = dot > 0 && name.length() - dot <= 10 ? name.substring(dot) : "";
            name = name.substring(0, 255 - ext.length()) + ext;
        }
        return name;
    }
}
